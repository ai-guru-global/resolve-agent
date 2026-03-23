"""Pluggable routing strategies for the Intelligent Selector.

This module provides three routing strategies:

- **RuleStrategy**: Fast, deterministic pattern matching
- **LLMStrategy**: Intelligent LLM-based classification
- **HybridStrategy**: Combines both for optimal accuracy (recommended)

Example:
    ```python
    from resolveagent.selector.strategies import HybridStrategy

    strategy = HybridStrategy()
    decision = await strategy.decide(
        input_text="Analyze this code for bugs",
        agent_id="agent-001",
        context={},
    )
    print(f"Route: {decision.route_type} ({decision.confidence:.2f})")
    ```
"""

from resolveagent.selector.strategies.hybrid_strategy import (
    HybridConfig,
    HybridStrategy,
)
from resolveagent.selector.strategies.llm_strategy import LLMStrategy
from resolveagent.selector.strategies.rule_strategy import RuleStrategy, RoutingRule

__all__ = [
    "HybridConfig",
    "HybridStrategy",
    "LLMStrategy",
    "RuleStrategy",
    "RoutingRule",
]
