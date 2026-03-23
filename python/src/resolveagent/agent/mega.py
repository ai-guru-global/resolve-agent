"""Mega Agent - the top-level orchestrator."""

from __future__ import annotations

import logging
from typing import Any

from resolveagent.agent.base import BaseAgent

logger = logging.getLogger(__name__)


class MegaAgent(BaseAgent):
    """Mega Agent that owns the Intelligent Selector.

    The MegaAgent receives requests, runs them through the Intelligent Selector
    to determine routing (FTA, Skill, or RAG), and orchestrates the execution
    across subsystems.
    """

    def __init__(
        self,
        name: str,
        model_id: str | None = None,
        system_prompt: str = "",
        selector_strategy: str = "hybrid",
        **kwargs: Any,
    ) -> None:
        super().__init__(name=name, model_id=model_id, system_prompt=system_prompt, **kwargs)
        self.selector_strategy = selector_strategy

    async def reply(self, message: dict[str, Any]) -> dict[str, Any]:
        """Process a message through the Intelligent Selector and route accordingly.

        Args:
            message: Input message.

        Returns:
            Response from the selected subsystem.
        """
        from resolveagent.selector.selector import IntelligentSelector

        selector = IntelligentSelector(strategy=self.selector_strategy)
        decision = await selector.route(
            input_text=message.get("content", ""),
            agent_id=self.name,
        )

        logger.info(
            "Selector decision",
            extra={
                "agent": self.name,
                "route_type": decision.route_type,
                "target": decision.route_target,
                "confidence": decision.confidence,
            },
        )

        # TODO: Execute based on decision.route_type
        # ROUTE_TYPE_FTA -> FTA Engine
        # ROUTE_TYPE_SKILL -> Skill Executor
        # ROUTE_TYPE_RAG -> RAG Pipeline
        # ROUTE_TYPE_DIRECT -> Direct LLM call

        return {
            "role": "assistant",
            "content": f"[{self.name}] Routed via {decision.route_type}: {message.get('content', '')}",
            "metadata": {
                "route_type": decision.route_type,
                "route_target": decision.route_target,
                "confidence": decision.confidence,
            },
        }
