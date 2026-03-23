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
