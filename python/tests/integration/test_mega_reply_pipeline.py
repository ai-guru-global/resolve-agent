"""Integration tests for MegaAgent reply pipeline and route dispatch."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from resolveagent.agent.mega import MegaAgent
from resolveagent.selector.selector import RouteDecision


def _make_decision(route_type: str = "direct", target: str = "", **params) -> RouteDecision:
    return RouteDecision(
        route_type=route_type,
        confidence=0.85,
        reasoning="test",
        route_target=target,
        parameters=params,
    )


def _make_mock_selector(decision: RouteDecision) -> MagicMock:
    mock = MagicMock()
    mock.route = AsyncMock(return_value=decision)
    return mock


class TestMegaAgentReplyPipeline:
    """Tests for MegaAgent.reply() → _execute_by_route() dispatch."""

    @pytest.fixture
    def agent(self) -> MegaAgent:
        return MegaAgent(name="test-agent", system_prompt="You are a test agent.")

    @pytest.mark.asyncio
    async def test_reply_direct_route(self, agent: MegaAgent) -> None:
        decision = _make_decision("direct")
        agent._selector_instance = _make_mock_selector(decision)

        mock_response = MagicMock(content="Hello!", model="qwen-plus", usage={"total_tokens": 10})
        with patch.object(agent, "_execute_direct", new_callable=AsyncMock, return_value={
            "role": "assistant",
            "content": "Hello!",
            "metadata": {"route_type": "direct"},
        }):
            result = await agent.reply({"content": "你好"})
            assert result["role"] == "assistant"
            assert result["content"] == "Hello!"
            assert result["metadata"]["route_type"] == "direct"

    @pytest.mark.asyncio
    async def test_reply_rag_route(self, agent: MegaAgent) -> None:
        decision = _make_decision("rag", "product-docs", collection="product-docs")
        agent._selector_instance = _make_mock_selector(decision)

        with patch.object(agent, "_execute_rag", new_callable=AsyncMock, return_value={
            "role": "assistant",
            "content": "RAG answer",
            "metadata": {"route_type": "rag", "retrieved_docs": 3},
        }):
            result = await agent.reply({"content": "502 怎么处理？"})
            assert result["metadata"]["route_type"] == "rag"
            assert result["metadata"]["retrieved_docs"] == 3

    @pytest.mark.asyncio
    async def test_reply_skill_route(self, agent: MegaAgent) -> None:
        decision = _make_decision("skill", "web-search")
        agent._selector_instance = _make_mock_selector(decision)

        with patch.object(agent, "_execute_skill", new_callable=AsyncMock, return_value={
            "role": "assistant",
            "content": "技能执行结果:\nsearch result",
            "metadata": {"route_type": "skill", "success": True},
        }):
            result = await agent.reply({"content": "搜索 Kubernetes"})
            assert result["metadata"]["route_type"] == "skill"

    @pytest.mark.asyncio
    async def test_reply_workflow_route(self, agent: MegaAgent) -> None:
        decision = _make_decision("workflow", "incident-diagnosis")
        agent._selector_instance = _make_mock_selector(decision)

        with patch.object(agent, "_execute_workflow", new_callable=AsyncMock, return_value={
            "role": "assistant",
            "content": "工作流已启动",
            "metadata": {"route_type": "workflow"},
        }):
            result = await agent.reply({"content": "诊断线上故障"})
            assert result["metadata"]["route_type"] == "workflow"

    @pytest.mark.asyncio
    async def test_reply_code_analysis_route(self, agent: MegaAgent) -> None:
        decision = _make_decision("code_analysis", "static-analysis")
        agent._selector_instance = _make_mock_selector(decision)

        with patch.object(agent, "_execute_code_analysis", new_callable=AsyncMock, return_value={
            "role": "assistant",
            "content": "## 静态分析结果",
            "metadata": {"route_type": "code_analysis", "analyzer": "static-analysis"},
        }):
            result = await agent.reply({"content": "分析这段代码"})
            assert result["metadata"]["route_type"] == "code_analysis"

    @pytest.mark.asyncio
    async def test_reply_unknown_route_falls_back_to_direct(self, agent: MegaAgent) -> None:
        decision = _make_decision("unknown_route_type")
        agent._selector_instance = _make_mock_selector(decision)

        with patch.object(agent, "_execute_direct", new_callable=AsyncMock, return_value={
            "role": "assistant",
            "content": "fallback response",
            "metadata": {"route_type": "unknown_route_type"},
        }):
            result = await agent.reply({"content": "some input"})
            assert result["content"] == "fallback response"

    @pytest.mark.asyncio
    async def test_reply_execution_error_returns_error_response(self, agent: MegaAgent) -> None:
        decision = _make_decision("direct")
        agent._selector_instance = _make_mock_selector(decision)

        with patch.object(agent, "_execute_direct", new_callable=AsyncMock, side_effect=RuntimeError("LLM unavailable")):
            result = await agent.reply({"content": "hello"})
            assert "执行失败" in result["content"]
            assert result["metadata"]["error"] == "LLM unavailable"
            assert result["metadata"]["route_type"] == "direct"


class TestFormatRAGResults:
    """Tests for MegaAgent._format_rag_results()."""

    def test_format_rag_results_empty(self) -> None:
        agent = MegaAgent(name="test")
        result = agent._format_rag_results([])
        assert result == "未找到相关信息。"

    def test_format_rag_results_with_scores(self) -> None:
        agent = MegaAgent(name="test")
        results = [
            {"text": "Kubernetes pod 重启策略...", "score": 0.92, "source": "ops-kb"},
            {"text": "容器 OOM 排查指南...", "score": 0.78, "source": "ops-kb"},
        ]
        formatted = agent._format_rag_results(results)
        assert "[1]" in formatted
        assert "0.92" in formatted
        assert "Kubernetes pod" in formatted
        assert "[2]" in formatted
