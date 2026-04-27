"""Unit tests for MegaAgent selector mode integration."""

from unittest.mock import AsyncMock, patch

import pytest

from resolveagent.agent.mega import MegaAgent
from resolveagent.selector.selector import RouteDecision


class TestMegaSelectorModes:
    """Tests for MegaAgent selector_mode parameter."""

    def test_default_selector_mode(self):
        """Test that default selector mode is 'selector'."""
        agent = MegaAgent(name="test")
        assert agent.selector_mode == "selector"

    def test_hooks_mode_init(self):
        """Test initialization with hooks mode."""
        agent = MegaAgent(name="test", selector_mode="hooks")
        assert agent.selector_mode == "hooks"
        assert agent._selector_instance is None

    def test_skills_mode_init(self):
        """Test initialization with skills mode."""
        agent = MegaAgent(name="test", selector_mode="skills")
        assert agent.selector_mode == "skills"

    def test_get_selector_creates_intelligent_selector(self):
        """Test factory creates IntelligentSelector for default mode."""
        agent = MegaAgent(name="test", selector_mode="selector")
        selector = agent._get_selector()

        from resolveagent.selector.selector import IntelligentSelector

        assert isinstance(selector, IntelligentSelector)

    def test_get_selector_creates_hook_adapter(self):
        """Test factory creates HookSelectorAdapter for hooks mode."""
        agent = MegaAgent(name="test", selector_mode="hooks")
        selector = agent._get_selector()

        from resolveagent.selector.hook_selector import HookSelectorAdapter

        assert isinstance(selector, HookSelectorAdapter)

    def test_get_selector_creates_skill_adapter(self):
        """Test factory creates SkillSelectorAdapter for skills mode."""
        agent = MegaAgent(name="test", selector_mode="skills")
        selector = agent._get_selector()

        from resolveagent.selector.skill_selector import SkillSelectorAdapter

        assert isinstance(selector, SkillSelectorAdapter)

    def test_selector_instance_reuse(self):
        """Test that _get_selector returns the same instance on repeated calls."""
        agent = MegaAgent(name="test", selector_mode="selector")
        s1 = agent._get_selector()
        s2 = agent._get_selector()
        assert s1 is s2

    def test_hooks_mode_instance_reuse(self):
        """Test instance reuse for hooks mode."""
        agent = MegaAgent(name="test", selector_mode="hooks")
        s1 = agent._get_selector()
        s2 = agent._get_selector()
        assert s1 is s2

    @pytest.mark.asyncio
    async def test_reply_uses_factory(self):
        """Test that reply() uses _get_selector() instead of creating new instances."""
        agent = MegaAgent(name="test", selector_mode="selector")

        mock_decision = RouteDecision(
            route_type="direct",
            confidence=0.9,
            reasoning="test",
        )

        with patch.object(agent, "_get_selector") as mock_get:
            mock_selector = AsyncMock()
            mock_selector.route.return_value = mock_decision
            mock_get.return_value = mock_selector

            with patch.object(agent, "_execute_by_route", new_callable=AsyncMock) as mock_exec:
                mock_exec.return_value = {
                    "role": "assistant",
                    "content": "test response",
                    "metadata": {},
                }
                await agent.reply({"content": "hello"})

            mock_get.assert_called_once()
            mock_selector.route.assert_called_once_with(
                input_text="hello",
                agent_id="test",
            )

    @pytest.mark.asyncio
    async def test_reply_hooks_mode_integration(self):
        """Test full reply flow with hooks mode."""
        agent = MegaAgent(name="hooks-agent", selector_mode="hooks")

        mock_decision = RouteDecision(
            route_type="direct",
            confidence=0.8,
            reasoning="hooks test",
        )

        with patch.object(agent, "_execute_by_route", new_callable=AsyncMock) as mock_exec:
            mock_exec.return_value = {
                "role": "assistant",
                "content": "response",
                "metadata": {},
            }

            # The hook selector will actually run, but we mock the execution part
            with patch("resolveagent.selector.hook_selector.IntelligentSelector") as mock_selector:
                mock_sel_instance = AsyncMock()
                mock_sel_instance.route.return_value = mock_decision
                mock_selector.return_value = mock_sel_instance

                result = await agent.reply({"content": "test"})
                assert result["content"] == "response"

    def test_selector_strategy_passed_to_factory(self):
        """Test that selector_strategy is forwarded correctly."""
        agent = MegaAgent(name="test", selector_strategy="rule", selector_mode="selector")
        selector = agent._get_selector()

        from resolveagent.selector.selector import IntelligentSelector

        assert isinstance(selector, IntelligentSelector)
        assert selector.strategy == "rule"

    def test_hooks_mode_strategy_forwarding(self):
        """Test that hooks mode forwards strategy to underlying selector."""
        agent = MegaAgent(name="test", selector_strategy="llm", selector_mode="hooks")
        adapter = agent._get_selector()
        assert adapter._strategy == "llm"
