"""Unit tests for the SkillSelectorAdapter."""

import pytest

from resolveagent.selector.protocol import SelectorProtocol
from resolveagent.selector.selector import RouteDecision
from resolveagent.selector.skill_selector import SkillSelectorAdapter


class TestSkillSelectorAdapter:
    """Tests for the skill-based selector adapter."""

    @pytest.fixture
    def adapter(self):
        return SkillSelectorAdapter()

    @pytest.mark.asyncio
    async def test_basic_route(self, adapter):
        """Test that the adapter produces a valid RouteDecision."""
        decision = await adapter.route("search the web for Python tutorials")
        assert isinstance(decision, RouteDecision)
        assert decision.route_type in ("skill", "rag", "direct", "fta", "code_analysis", "workflow")
        assert 0.0 <= decision.confidence <= 1.0

    @pytest.mark.asyncio
    async def test_lazy_callable_loading(self, adapter):
        """Test that the callable is loaded on first use."""
        assert adapter._callable is None
        fn = adapter._get_callable()
        assert fn is not None
        assert adapter._callable is fn
        # Second call should return the same cached callable.
        assert adapter._get_callable() is fn

    @pytest.mark.asyncio
    async def test_strategy_info(self, adapter):
        """Test strategy info for skill adapter."""
        info = adapter.get_strategy_info()
        assert info["strategy"] == "skills"
        assert "description" in info

    @pytest.mark.asyncio
    async def test_protocol_conformance(self, adapter):
        """Test that SkillSelectorAdapter conforms to SelectorProtocol."""
        assert isinstance(adapter, SelectorProtocol)

    @pytest.mark.asyncio
    async def test_code_analysis_routing(self, adapter):
        """Test code analysis routing through skill adapter."""
        decision = await adapter.route("```python\ndef unsafe(): exec(input())```\nfind security issues")
        assert decision.route_type == "code_analysis"

    @pytest.mark.asyncio
    async def test_route_with_context(self, adapter):
        """Test routing with additional context."""
        decision = await adapter.route(
            "diagnose the error",
            agent_id="test-agent",
            context={"conversation_history": ["prior message"]},
            enrich_context=False,
        )
        assert isinstance(decision, RouteDecision)

    @pytest.mark.asyncio
    async def test_fallback_on_error(self):
        """Test that the adapter falls back on errors."""
        adapter = SkillSelectorAdapter()

        # Monkey-patch the callable to raise
        async def broken_run(**kwargs):
            raise RuntimeError("boom")

        adapter._callable = broken_run

        decision = await adapter.route("anything")
        assert decision.route_type == "direct"
        assert decision.confidence == 0.3
        assert "boom" in decision.reasoning
