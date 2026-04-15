"""Selector protocol defining the universal routing interface.

All selector implementations (IntelligentSelector, HookSelectorAdapter,
SkillSelectorAdapter) conform to this protocol for type-safe dispatch.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, Protocol, runtime_checkable

if TYPE_CHECKING:
    from resolveagent.selector.selector import RouteDecision


@runtime_checkable
class SelectorProtocol(Protocol):
    """Protocol defining the universal selector interface.

    Any class with matching ``route`` and ``get_strategy_info`` methods
    satisfies this protocol via structural subtyping -- no inheritance
    required.
    """

    async def route(
        self,
        input_text: str,
        agent_id: str = "",
        context: dict[str, Any] | None = None,
        enrich_context: bool = True,
    ) -> RouteDecision:
        """Route a request to the appropriate subsystem."""
        ...

    def get_strategy_info(self) -> dict[str, Any]:
        """Return information about the current strategy."""
        ...
