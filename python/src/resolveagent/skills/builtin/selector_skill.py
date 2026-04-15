"""Selector skill entry point.

Wraps ``IntelligentSelector`` as a skill so it can be invoked through
the standard ``SkillExecutor`` / ``SkillLoader`` pipeline.
"""

from __future__ import annotations

from typing import Any


async def run(
    input_text: str,
    agent_id: str = "",
    context: dict[str, Any] | None = None,
    strategy: str = "hybrid",
    enrich_context: bool = True,
) -> dict[str, Any]:
    """Selector skill entry point.

    Returns the ``RouteDecision`` as a plain dictionary so it passes
    through the skill output validation layer.
    """
    from resolveagent.selector.selector import IntelligentSelector

    selector = IntelligentSelector(strategy=strategy)
    decision = await selector.route(
        input_text,
        agent_id=agent_id,
        context=context,
        enrich_context=enrich_context,
    )
    return decision.model_dump()
