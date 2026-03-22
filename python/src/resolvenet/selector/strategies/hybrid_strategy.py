"""Hybrid routing strategy (rules + LLM fallback)."""

from __future__ import annotations

from typing import Any

from resolvenet.selector.selector import RouteDecision
from resolvenet.selector.strategies.llm_strategy import LLMStrategy
from resolvenet.selector.strategies.rule_strategy import RuleStrategy


class HybridStrategy:
    """Combines rule-based and LLM-based routing.

    Tries rules first (fast path). If rules match with high confidence,
    uses that result. Otherwise, falls back to LLM for classification.

    This is the recommended default strategy.
    """

    CONFIDENCE_THRESHOLD = 0.7

    def __init__(self) -> None:
        self.rule_strategy = RuleStrategy()
        self.llm_strategy = LLMStrategy()

    async def decide(
        self, input_text: str, agent_id: str, context: dict[str, Any]
    ) -> RouteDecision:
        """Try rules first, fall back to LLM if low confidence."""
        # Fast path: try rules
        rule_decision = await self.rule_strategy.decide(input_text, agent_id, context)

        if rule_decision.confidence >= self.CONFIDENCE_THRESHOLD:
            rule_decision.reasoning = f"Hybrid (rule): {rule_decision.reasoning}"
            return rule_decision

        # Slow path: use LLM
        llm_decision = await self.llm_strategy.decide(input_text, agent_id, context)
        llm_decision.reasoning = f"Hybrid (LLM fallback): {llm_decision.reasoning}"
        return llm_decision
