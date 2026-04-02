"""Core Intelligent Selector orchestration.

The Intelligent Selector is the brain of ResolveAgent's routing system.
It analyzes incoming requests and determines the optimal processing path:
Workflow, Skills, RAG, or Code Analysis.
"""

from __future__ import annotations

import logging
from typing import Any

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class RouteDecision(BaseModel):
    """Decision output from the Intelligent Selector.

    This model captures all routing decision information including
    the chosen route, confidence level, and supporting metadata.

    Attributes:
        route_type: The selected routing target:
            - 'workflow': Complex multi-step processes (FTA, decision trees)
            - 'skill': Specific tool execution
            - 'rag': Knowledge retrieval from documents
            - 'code_analysis': Static code analysis and review
            - 'direct': Simple direct response
            - 'multi': Multiple routes needed
        route_target: Specific target within the route type.
        confidence: Confidence score (0.0 to 1.0).
        parameters: Additional parameters for routing.
        reasoning: Human-readable explanation of the decision.
        chain: For multi-route scenarios, ordered list of sub-decisions.
    """

    route_type: str = Field(
        default="direct",
        description="Route type: workflow, skill, rag, code_analysis, direct, multi",
    )
    route_target: str = Field(
        default="",
        description="Specific target within the route type",
    )
    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0 and 1",
    )
    parameters: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional routing parameters",
    )
    reasoning: str = Field(
        default="",
        description="Explanation of the routing decision",
    )
    chain: list["RouteDecision"] = Field(
        default_factory=list,
        description="Ordered sub-decisions for multi-route scenarios",
    )

    def is_code_related(self) -> bool:
        """Check if this decision is for code-related processing."""
        return self.route_type in ("code_analysis", "skill") and (
            self.route_target in ("static-analysis", "code-exec", "security-scan", "linter")
            or "code" in self.route_target.lower()
        )

    def is_high_confidence(self, threshold: float = 0.7) -> bool:
        """Check if decision has high confidence."""
        return self.confidence >= threshold


class IntelligentSelector:
    """LLM-powered meta-router that dynamically selects the execution path.

    The Intelligent Selector is the core routing component of ResolveAgent.
    It analyzes incoming requests through a sophisticated pipeline:

    ```
    ┌─────────────────────────────────────────────────────────────────┐
    │                    INTELLIGENT SELECTOR                          │
    │                                                                 │
    │   Input ──▶ Intent Analyzer ──▶ Context Enricher ──▶ Router    │
    │                                                                 │
    │   ┌───────────┬───────────┬───────────┬───────────────────────┐ │
    │   │ Workflow  │  Skills   │    RAG    │    Code Analysis      │ │
    │   │   (FTA)   │  (Tools)  │ (Search)  │   (Static/AST)        │ │
    │   └───────────┴───────────┴───────────┴───────────────────────┘ │
    └─────────────────────────────────────────────────────────────────┘
    ```

    Stages:
    1. **Intent Analysis** - Classify what the user wants
    2. **Context Enrichment** - Augment with memory, capabilities, history
    3. **Route Decision** - Choose optimal path with confidence scoring

    Strategies:
    - 'hybrid' (default): Rule-based fast path + LLM fallback
    - 'llm': Pure LLM-based classification
    - 'rule': Pure pattern-matching rules

    Attributes:
        strategy: The routing strategy to use.
    """

    VALID_STRATEGIES = ("llm", "rule", "hybrid")

    def __init__(self, strategy: str = "hybrid", registry_client: Any | None = None) -> None:
        """Initialize the Intelligent Selector.

        Args:
            strategy: Routing strategy - 'llm', 'rule', or 'hybrid'.
            registry_client: Optional registry client for querying resources.
        """
        if strategy not in self.VALID_STRATEGIES:
            logger.warning(
                f"Unknown strategy '{strategy}', using 'hybrid'"
            )
            strategy = "hybrid"

        self.strategy = strategy
        self._strategies = {
            "llm": self._route_llm,
            "rule": self._route_rule,
            "hybrid": self._route_hybrid,
        }
        self._intent_analyzer = None
        self._context_enricher: ContextEnricher | None = None
        self._registry_client = registry_client

    async def route(
        self,
        input_text: str,
        agent_id: str = "",
        context: dict[str, Any] | None = None,
        enrich_context: bool = True,
    ) -> RouteDecision:
        """Route a request to the appropriate subsystem.

        This is the main entry point for routing decisions. It orchestrates
        the full pipeline: intent analysis, context enrichment, and routing.

        Args:
            input_text: The user input to route.
            agent_id: The agent processing this request.
            context: Additional context for routing.
            enrich_context: Whether to enrich context before routing.

        Returns:
            A RouteDecision indicating where and how to route the request.

        Example:
            ```python
            selector = IntelligentSelector(strategy="hybrid")
            decision = await selector.route(
                "Analyze this code for security issues",
                agent_id="agent-001",
            )
            print(f"Route to: {decision.route_type}/{decision.route_target}")
            print(f"Confidence: {decision.confidence:.2f}")
            ```
        """
        ctx = context or {}

        # Optional: Enrich context with full pipeline
        if enrich_context:
            ctx = await self._enrich_context(input_text, agent_id, ctx)

        # Make routing decision
        route_fn = self._strategies.get(self.strategy, self._route_hybrid)
        decision = await route_fn(input_text, agent_id, ctx)

        # Log decision
        logger.info(
            "Route decision made",
            extra={
                "strategy": self.strategy,
                "route_type": decision.route_type,
                "target": decision.route_target,
                "confidence": decision.confidence,
                "agent_id": agent_id,
            },
        )

        return decision

    async def analyze_intent(
        self, input_text: str
    ) -> dict[str, Any]:
        """Analyze the intent of user input without full routing.

        Useful for understanding what the user wants without making
        a full routing decision.

        Args:
            input_text: User input to analyze.

        Returns:
            Dictionary with intent type, confidence, and metadata.
        """
        if self._intent_analyzer is None:
            from resolveagent.selector.intent import IntentAnalyzer
            self._intent_analyzer = IntentAnalyzer()

        classification = await self._intent_analyzer.classify(input_text)
        return {
            "intent_type": classification.intent_type,
            "confidence": classification.confidence,
            "entities": classification.entities,
            "metadata": classification.metadata,
            "sub_intents": classification.sub_intents,
            "suggested_target": classification.suggested_target,
        }

    async def _enrich_context(
        self,
        input_text: str,
        agent_id: str,
        context: dict[str, Any],
    ) -> dict[str, Any]:
        """Enrich context with additional information."""
        if self._context_enricher is None:
            from resolveagent.selector.context_enricher import ContextEnricher
            self._context_enricher = ContextEnricher(registry_client=self._registry_client)

        enriched = await self._context_enricher.enrich(
            input_text, agent_id, context
        )

        return enriched.to_dict()

    async def _route_llm(
        self, input_text: str, agent_id: str, context: dict[str, Any]
    ) -> RouteDecision:
        """Use an LLM to classify and route the request."""
        from resolveagent.selector.strategies.llm_strategy import LLMStrategy

        strategy = LLMStrategy()
        return await strategy.decide(input_text, agent_id, context)

    async def _route_rule(
        self, input_text: str, agent_id: str, context: dict[str, Any]
    ) -> RouteDecision:
        """Use rule-based pattern matching to route the request."""
        from resolveagent.selector.strategies.rule_strategy import RuleStrategy

        strategy = RuleStrategy()
        return await strategy.decide(input_text, agent_id, context)

    async def _route_hybrid(
        self, input_text: str, agent_id: str, context: dict[str, Any]
    ) -> RouteDecision:
        """Try rules first, fall back to LLM for ambiguous cases."""
        from resolveagent.selector.strategies.hybrid_strategy import HybridStrategy

        strategy = HybridStrategy()
        return await strategy.decide(input_text, agent_id, context)

    def get_strategy_info(self) -> dict[str, Any]:
        """Get information about the current strategy."""
        return {
            "strategy": self.strategy,
            "valid_strategies": list(self.VALID_STRATEGIES),
            "description": {
                "hybrid": "Rule-based fast path with LLM fallback (recommended)",
                "llm": "Pure LLM-based classification",
                "rule": "Pure pattern-matching rules",
            }.get(self.strategy, "Unknown"),
        }
