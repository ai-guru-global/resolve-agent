"""Shared request-routing logic for the runtime surfaces.

Single source of truth used by both the HTTP endpoint
(``POST /v1/selector/route``) and the gRPC ``SelectorService`` shim so the
two surfaces cannot drift.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Literal

logger = logging.getLogger(__name__)

Strategy = Literal["rule", "llm", "hybrid"]


@dataclass
class RoutedDecision:
    """Result of routing a single input through the selector pipeline."""

    decision: dict[str, Any] = field(default_factory=dict)
    strategy: str = "rule"
    degraded: bool = False
    fallback_reason: str = ""


class RoutingService:
    """Routes input through rule / llm / hybrid strategies.

    ``llm`` and ``hybrid`` degrade to ``rule`` on failure so callers always
    receive a valid decision. The rule strategy and per-strategy selectors
    are lazily constructed and cached.
    """

    def __init__(self) -> None:
        self._rule_strategy: Any = None
        self._selectors: dict[str, Any] = {}

    async def route(
        self,
        input_text: str,
        agent_id: str = "",
        context: dict[str, Any] | None = None,
        strategy: Strategy = "hybrid",
        enrich_context: bool = False,
        bypass_cache: bool = False,
    ) -> RoutedDecision:
        context = context or {}
        if strategy == "rule":
            return RoutedDecision(
                await self._route_rule(input_text, agent_id, context),
                "rule",
            )
        try:
            from resolveagent.selector.selector import IntelligentSelector

            if strategy not in self._selectors:
                self._selectors[strategy] = IntelligentSelector(strategy=strategy)
            rd = await self._selectors[strategy].route(
                input_text,
                agent_id,
                context,
                enrich_context=enrich_context,
                bypass_cache=bypass_cache,
            )
            return RoutedDecision(dict(rd.__dict__), strategy)
        except Exception as exc:
            logger.warning("Selector %s failed, degrading to rule: %s", strategy, exc)
            return RoutedDecision(
                await self._route_rule(input_text, agent_id, context),
                "rule",
                degraded=True,
                fallback_reason=str(exc)[:200],
            )

    async def _route_rule(self, input_text: str, agent_id: str, context: dict[str, Any]) -> dict[str, Any]:
        from resolveagent.selector.strategies.rule_strategy import RuleStrategy

        if self._rule_strategy is None:
            self._rule_strategy = RuleStrategy()
        rd = await self._rule_strategy.decide(input_text, agent_id, context)
        return dict(rd.__dict__)
