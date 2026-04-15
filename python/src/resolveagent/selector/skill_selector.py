"""Skill-based selector adapter.

``SkillSelectorAdapter`` wraps the routing logic as a skill invocation,
allowing the selector to be treated as a standard skill within the
``SkillLoader`` / ``SkillExecutor`` pipeline.
"""

from __future__ import annotations

import logging
from typing import Any

from resolveagent.selector.selector import RouteDecision

logger = logging.getLogger(__name__)


class SkillSelectorAdapter:
    """Selector that delegates routing to the ``intelligent-selector`` skill.

    The adapter loads the skill manifest from *skill_path* on first use,
    then invokes the skill's ``run()`` function directly (no sandbox)
    and converts the output back into a ``RouteDecision``.
    """

    def __init__(self, skill_path: str | None = None) -> None:
        self._skill_path = skill_path
        self._callable: Any | None = None

    def _get_callable(self) -> Any:
        """Lazy-load the selector skill's entry function."""
        if self._callable is None:
            from resolveagent.skills.builtin.selector_skill import run
            self._callable = run
        return self._callable

    async def route(
        self,
        input_text: str,
        agent_id: str = "",
        context: dict[str, Any] | None = None,
        enrich_context: bool = True,
    ) -> RouteDecision:
        """Route by invoking the selector skill."""
        run_fn = self._get_callable()
        try:
            result = await run_fn(
                input_text=input_text,
                agent_id=agent_id,
                context=context,
                strategy="hybrid",
                enrich_context=enrich_context,
            )
            return RouteDecision(**result)
        except Exception as e:
            logger.error("Skill selector failed, falling back to direct", extra={"error": str(e)})
            return RouteDecision(
                route_type="direct",
                confidence=0.3,
                reasoning=f"Skill selector fallback: {e}",
            )

    def get_strategy_info(self) -> dict[str, Any]:
        return {
            "strategy": "skills",
            "description": "Skill-based selector adapter (routes via intelligent-selector skill)",
        }
