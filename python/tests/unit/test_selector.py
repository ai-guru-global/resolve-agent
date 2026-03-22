"""Unit tests for the Intelligent Selector."""

import pytest

from resolvenet.selector.selector import IntelligentSelector


@pytest.mark.asyncio
async def test_selector_rule_strategy():
    """Test rule-based routing."""
    selector = IntelligentSelector(strategy="rule")
    decision = await selector.route("search the web for Python tutorials")
    assert decision.route_type in ("skill", "rag", "direct", "fta")
    assert 0.0 <= decision.confidence <= 1.0


@pytest.mark.asyncio
async def test_selector_hybrid_strategy():
    """Test hybrid routing strategy."""
    selector = IntelligentSelector(strategy="hybrid")
    decision = await selector.route("diagnose the root cause of the outage")
    assert decision.route_type in ("fta", "skill", "rag", "direct")


@pytest.mark.asyncio
async def test_selector_default_strategy():
    """Test that default strategy is hybrid."""
    selector = IntelligentSelector()
    assert selector.strategy == "hybrid"
