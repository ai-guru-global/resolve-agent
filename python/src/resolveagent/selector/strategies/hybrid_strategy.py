"""Hybrid routing strategy (rules + LLM fallback).

This module implements the recommended hybrid routing strategy that combines
fast rule-based matching with intelligent LLM fallback for optimal accuracy
and performance.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from resolveagent.selector.selector import RouteDecision
from resolveagent.selector.strategies.llm_strategy import LLMStrategy
from resolveagent.selector.strategies.rule_strategy import RuleStrategy

logger = logging.getLogger(__name__)


@dataclass
class HybridConfig:
    """Configuration for hybrid routing strategy."""

    # Confidence threshold for rule-based routing
    rule_confidence_threshold: float = 0.7
    # Confidence threshold for LLM routing
    llm_confidence_threshold: float = 0.6
    # Whether to use weighted ensemble when both strategies agree
    use_ensemble: bool = True
    # Weight for rule-based confidence in ensemble
    rule_weight: float = 0.6
    # Weight for LLM confidence in ensemble
    llm_weight: float = 0.4
    # Boost for code_analysis when code blocks are detected
    code_boost: float = 0.1
    # Per-route-type extra confidence boosts (e.g. {"workflow": 0.05})
    per_route_boosts: dict[str, float] = field(default_factory=dict)


class HybridStrategy:
    """Combines rule-based and LLM-based routing for optimal accuracy.

    The hybrid strategy uses a sophisticated multi-phase approach:

    Phase 1 (Fast Path): Rule-based matching
    - Tries pattern matching rules first for predictable cases
    - Returns immediately if confidence >= threshold

    Phase 2 (Slow Path): LLM classification
    - Falls back to LLM for ambiguous or complex requests
    - Uses enriched context for better decision making

    Phase 3 (Ensemble): Weighted combination
    - When both strategies agree, combines confidence scores
    - Provides higher accuracy than either strategy alone

    Special handling:
    - Code blocks automatically boost code_analysis confidence
    - Multi-intent detection for complex requests
    - Graceful degradation on failures

    Attributes:
        config: Configuration for the hybrid strategy.
        rule_strategy: The rule-based strategy instance.
        llm_strategy: The LLM-based strategy instance.
    """

    def __init__(self, config: HybridConfig | None = None) -> None:
        """Initialize the hybrid strategy.

        Args:
            config: Optional configuration. Uses defaults if not provided.
        """
        self.config = config or HybridConfig()
        self.rule_strategy = RuleStrategy()
        self.llm_strategy = LLMStrategy()

    async def decide(self, input_text: str, agent_id: str, context: dict[str, Any]) -> RouteDecision:
        """Make routing decision using hybrid rule+LLM approach.

        The decision flow:
        1. Try rule-based matching (fast, deterministic)
        2. If high confidence rule match, return it
        3. Otherwise, use LLM for classification
        4. If both agree, use ensemble scoring
        5. Apply special boosts (e.g., code detection)

        Args:
            input_text: User input to route.
            agent_id: Agent processing the request.
            context: Enriched context for decision making.

        Returns:
            RouteDecision with optimal routing choice.
        """
        # Phase 1: Fast path with rules
        rule_decision = await self.rule_strategy.decide(input_text, agent_id, context)

        logger.debug(f"Rule decision: {rule_decision.route_type} (confidence: {rule_decision.confidence:.2f})")

        # High confidence rule match - return immediately
        if rule_decision.confidence >= self.config.rule_confidence_threshold:
            rule_decision.reasoning = f"Hybrid (rule): {rule_decision.reasoning}"
            rule_decision = self._apply_boosts(rule_decision, input_text, context)
            return rule_decision

        # Phase 2: Slow path with LLM
        llm_decision = await self.llm_strategy.decide(input_text, agent_id, context)

        logger.debug(f"LLM decision: {llm_decision.route_type} (confidence: {llm_decision.confidence:.2f})")

        # Phase 3: Ensemble when both strategies provide input
        if self.config.use_ensemble and rule_decision.confidence > 0.3:
            decision = self._ensemble_decision(rule_decision, llm_decision)
        else:
            decision = llm_decision
            decision.reasoning = f"Hybrid (LLM fallback): {llm_decision.reasoning}"

        # Apply boosts
        decision = self._apply_boosts(decision, input_text, context)

        return decision

    def _ensemble_decision(
        self,
        rule_decision: RouteDecision,
        llm_decision: RouteDecision,
    ) -> RouteDecision:
        """Combine rule and LLM decisions using weighted ensemble.

        When both strategies agree, combines their confidence scores.
        When they disagree, chooses the higher confidence decision.
        """
        if rule_decision.route_type == llm_decision.route_type:
            # Agreement - combine confidence scores
            combined_confidence = rule_decision.confidence * self.config.rule_weight + llm_decision.confidence * self.config.llm_weight

            # Use the target from the higher confidence decision
            if rule_decision.confidence >= llm_decision.confidence:
                target = rule_decision.route_target
                params = rule_decision.parameters
            else:
                target = llm_decision.route_target
                params = llm_decision.parameters

            return RouteDecision(
                route_type=rule_decision.route_type,
                route_target=target,
                confidence=min(combined_confidence * 1.1, 1.0),  # Boost for agreement
                reasoning=(
                    f"Hybrid (ensemble): Both strategies agree on {rule_decision.route_type} "
                    f"(rule: {rule_decision.confidence:.2f}, LLM: {llm_decision.confidence:.2f})"
                ),
                parameters={
                    **params,
                    "ensemble": True,
                    "rule_confidence": rule_decision.confidence,
                    "llm_confidence": llm_decision.confidence,
                },
            )
        else:
            # Disagreement - choose higher confidence
            if rule_decision.confidence > llm_decision.confidence:
                rule_decision.reasoning = (
                    f"Hybrid (rule preferred): {rule_decision.reasoning} (rule: {rule_decision.confidence:.2f} > LLM: {llm_decision.confidence:.2f})"
                )
                rule_decision.parameters["llm_suggestion"] = llm_decision.route_type
                return rule_decision
            else:
                llm_decision.reasoning = (
                    f"Hybrid (LLM preferred): {llm_decision.reasoning} (LLM: {llm_decision.confidence:.2f} > rule: {rule_decision.confidence:.2f})"
                )
                llm_decision.parameters["rule_suggestion"] = rule_decision.route_type
                return llm_decision

    def _apply_boosts(
        self,
        decision: RouteDecision,
        input_text: str,
        context: dict[str, Any],
    ) -> RouteDecision:
        """Apply confidence boosts based on input characteristics."""
        # Boost code_analysis when code blocks are detected
        if decision.route_type == "code_analysis":
            code_context = context.get("code_context")
            if code_context and code_context.get("has_code_blocks"):
                decision.confidence = min(decision.confidence + self.config.code_boost, 1.0)
                decision.parameters["code_boost_applied"] = True
            # Extra boost for high-complexity code
            if code_context and code_context.get("complexity_hint") == "high":
                decision.confidence = min(decision.confidence + 0.05, 1.0)

        # Boost workflow for diagnostic keywords
        if decision.route_type == "workflow":
            text_lower = input_text.lower()
            if any(kw in text_lower for kw in ["diagnose", "root cause", "troubleshoot"]):
                decision.confidence = min(decision.confidence + 0.05, 1.0)

        # Boost RAG when conversation history is available
        if decision.route_type == "rag":
            history = context.get("conversation_history", [])
            if len(history) > 3:
                decision.confidence = min(decision.confidence + 0.03, 1.0)

        # Apply per-route-type configurable boosts
        extra = self.config.per_route_boosts.get(decision.route_type, 0.0)
        if extra:
            decision.confidence = min(decision.confidence + extra, 1.0)

        return decision

    def get_config(self) -> dict[str, Any]:
        """Get current configuration as dictionary."""
        return {
            "rule_confidence_threshold": self.config.rule_confidence_threshold,
            "llm_confidence_threshold": self.config.llm_confidence_threshold,
            "use_ensemble": self.config.use_ensemble,
            "rule_weight": self.config.rule_weight,
            "llm_weight": self.config.llm_weight,
            "code_boost": self.config.code_boost,
            "per_route_boosts": self.config.per_route_boosts,
        }
