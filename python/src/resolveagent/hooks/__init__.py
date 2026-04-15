"""Lifecycle hooks package for agent execution middleware.

Provides pre/post hook execution around agent, skill, and workflow operations.
"""

from resolveagent.hooks.models import HookContext, HookResult
from resolveagent.hooks.runner import HookRunner

__all__ = [
    "HookContext",
    "HookResult",
    "HookRunner",
    "InMemoryHookClient",
    "intent_analysis_handler",
    "decision_audit_handler",
    "confidence_override_handler",
]


def __getattr__(name: str):  # noqa: ANN001
    """Lazy imports for memory client and selector handlers."""
    if name == "InMemoryHookClient":
        from resolveagent.hooks.memory_client import InMemoryHookClient

        return InMemoryHookClient
    if name in ("intent_analysis_handler", "decision_audit_handler", "confidence_override_handler"):
        import resolveagent.hooks.selector_handlers as _sh

        return getattr(_sh, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
