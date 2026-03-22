"""Core Intelligent Selector orchestration."""

from __future__ import annotations

import logging
from typing import Any

from pydantic import BaseModel

logger = logging.getLogger(__name__)


class RouteDecision(BaseModel):
    """Decision output from the Intelligent Selector."""

    route_type: str  # "fta", "skill", "rag", "multi", "direct"
    route_target: str = ""
    confidence: float = 0.0
    parameters: dict[str, Any] = {}
    reasoning: str = ""
    chain: list[RouteDecision] = []


class IntelligentSelector:
    """LLM-powered meta-router that dynamically selects the execution path.

    The Selector analyzes incoming requests through three stages:
    1. Intent Analysis - classify what the user wants
    2. Context Enrichment - augment with memory, capabilities, history
    3. Route Decision - choose FTA, Skill, RAG, or Direct

    Supports pluggable strategies: "llm", "rule", "hybrid" (default).
    """

    def __init__(self, strategy: str = "hybrid") -> None:
        self.strategy = strategy
        self._strategies = {
            "llm": self._route_llm,
            "rule": self._route_rule,
            "hybrid": self._route_hybrid,
        }

    async def route(
        self,
        input_text: str,
        agent_id: str = "",
        context: dict[str, Any] | None = None,
    ) -> RouteDecision:
        """Route a request to the appropriate subsystem.

        Args:
            input_text: The user input to route.
            agent_id: The agent processing this request.
            context: Additional context for routing.

        Returns:
            A RouteDecision indicating where to route the request.
        """
        route_fn = self._strategies.get(self.strategy, self._route_hybrid)
        decision = await route_fn(input_text, agent_id, context or {})

        logger.info(
            "Route decision made",
            extra={
                "strategy": self.strategy,
                "route_type": decision.route_type,
                "target": decision.route_target,
                "confidence": decision.confidence,
            },
        )

        return decision

    async def _route_llm(
        self, input_text: str, agent_id: str, context: dict[str, Any]
    ) -> RouteDecision:
        """Use an LLM to classify and route the request."""
        from resolvenet.selector.strategies.llm_strategy import LLMStrategy

        strategy = LLMStrategy()
        return await strategy.decide(input_text, agent_id, context)

    async def _route_rule(
        self, input_text: str, agent_id: str, context: dict[str, Any]
    ) -> RouteDecision:
        """Use rule-based pattern matching to route the request."""
        from resolvenet.selector.strategies.rule_strategy import RuleStrategy

        strategy = RuleStrategy()
        return await strategy.decide(input_text, agent_id, context)

    async def _route_hybrid(
        self, input_text: str, agent_id: str, context: dict[str, Any]
    ) -> RouteDecision:
        """Try rules first, fall back to LLM for ambiguous cases."""
        from resolvenet.selector.strategies.hybrid_strategy import HybridStrategy

        strategy = HybridStrategy()
        return await strategy.decide(input_text, agent_id, context)
