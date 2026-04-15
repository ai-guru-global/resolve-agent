"""Intelligent Selector - LLM-powered meta-router for ResolveAgent.

The Intelligent Selector is the core routing component that analyzes user
requests and determines the optimal processing path:

- **Workflow (FTA)**: Complex multi-step diagnostic processes
- **Skills**: Specific tool execution (search, code exec, file ops)
- **RAG**: Knowledge retrieval from document collections
- **Code Analysis**: Static analysis, code review, security scanning

Quick Start:
    ```python
    from resolveagent.selector import IntelligentSelector

    selector = IntelligentSelector(strategy="hybrid")
    decision = await selector.route("Analyze this code for bugs")
    print(f"Route: {decision.route_type}, Confidence: {decision.confidence:.2f}")
    ```
"""

from resolveagent.selector.context_enricher import (
    CodeContext,
    ContextEnricher,
    EnrichedContext,
)
from resolveagent.selector.intent import (
    IntentAnalyzer,
    IntentClassification,
    IntentPattern,
    IntentType,
)
from resolveagent.selector.selector import IntelligentSelector, RouteDecision

__all__ = [
    # Main components
    "IntelligentSelector",
    "RouteDecision",
    # Protocol & cache
    "SelectorProtocol",
    "RouteDecisionCache",
    "get_global_cache",
    # Adapters
    "HookSelectorAdapter",
    "SkillSelectorAdapter",
    # Intent analysis
    "IntentAnalyzer",
    "IntentClassification",
    "IntentPattern",
    "IntentType",
    # Context enrichment
    "ContextEnricher",
    "EnrichedContext",
    "CodeContext",
]


def __getattr__(name: str):  # noqa: ANN001
    """Lazy imports for adapters / cache to avoid circular dependencies."""
    if name == "SelectorProtocol":
        from resolveagent.selector.protocol import SelectorProtocol

        return SelectorProtocol
    if name == "RouteDecisionCache":
        from resolveagent.selector.cache import RouteDecisionCache

        return RouteDecisionCache
    if name == "get_global_cache":
        from resolveagent.selector.cache import get_global_cache

        return get_global_cache
    if name == "HookSelectorAdapter":
        from resolveagent.selector.hook_selector import HookSelectorAdapter

        return HookSelectorAdapter
    if name == "SkillSelectorAdapter":
        from resolveagent.selector.skill_selector import SkillSelectorAdapter

        return SkillSelectorAdapter
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
