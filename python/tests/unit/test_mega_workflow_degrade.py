"""Unit tests for MegaAgent workflow degradation, external decision reuse,
and the reply() recursion depth guard.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from resolveagent.agent.mega import MAX_REPLY_DEPTH, MegaAgent
from resolveagent.selector.selector import RouteDecision


def _workflow_decision(route_type: str = "workflow") -> RouteDecision:
    return RouteDecision(
        route_type=route_type,
        route_target="incident-diagnosis",
        confidence=0.9,
        reasoning="test",
    )


def _no_registry(monkeypatch):
    """Make registry lookup fail so no workflow definition can be loaded."""
    import resolveagent.runtime.registry_client as registry_client

    monkeypatch.setattr(
        registry_client,
        "get_registry_client",
        MagicMock(side_effect=RuntimeError("registry unavailable")),
    )


def _registry_with_definition(monkeypatch, definition: dict):
    """Make the registry return a workflow definition."""
    import resolveagent.runtime.registry_client as registry_client

    workflow_info = MagicMock()
    workflow_info.definition = definition
    registry = MagicMock()
    registry.get_workflow = AsyncMock(return_value=workflow_info)
    monkeypatch.setattr(registry_client, "get_registry_client", MagicMock(return_value=registry))


class TestWorkflowDegradation:
    """Fix 1: workflow/fta routes must not answer with a template placeholder."""

    @pytest.mark.parametrize("route_type", ["workflow", "fta"])
    async def test_missing_definition_degrades_to_direct(self, monkeypatch, route_type):
        """Without an executable workflow definition, reply degrades to a real
        direct answer and marks metadata degraded=True."""
        agent = MegaAgent(name="test-agent")
        _no_registry(monkeypatch)
        agent._execute_direct = AsyncMock(
            return_value={
                "role": "assistant",
                "content": "常见原因包括资源不足、污点未容忍和 PVC 未绑定。",
                "metadata": {"route_type": route_type},
            }
        )

        result = await agent.reply(
            {"content": "Pod 一直处于 Pending 状态的常见原因?"},
            decision=_workflow_decision(route_type),
        )

        agent._execute_direct.assert_awaited_once()
        assert "常见原因" in result["content"]
        assert "已启动分析" not in result["content"]
        assert result["metadata"]["degraded"] is True
        assert result["metadata"]["workflow"] == "incident-diagnosis"

    async def test_empty_workflow_result_degrades_to_direct(self, monkeypatch):
        """A defined workflow producing no content also degrades to direct."""
        agent = MegaAgent(name="test-agent")
        _registry_with_definition(monkeypatch, {"name": "incident-diagnosis", "nodes": [], "edges": []})
        agent._execute_defined_workflow = AsyncMock(
            return_value={"role": "assistant", "content": "", "metadata": {}}
        )
        agent._execute_direct = AsyncMock(
            return_value={"role": "assistant", "content": "real answer", "metadata": {}}
        )

        result = await agent.reply({"content": "q"}, decision=_workflow_decision())

        agent._execute_defined_workflow.assert_awaited_once()
        agent._execute_direct.assert_awaited_once()
        assert result["content"] == "real answer"
        assert result["metadata"]["degraded"] is True

    async def test_workflow_with_real_content_is_not_degraded(self, monkeypatch):
        """A workflow that yields content is returned as-is, without degraded."""
        agent = MegaAgent(name="test-agent")
        _registry_with_definition(monkeypatch, {"name": "incident-diagnosis", "nodes": [], "edges": []})
        agent._execute_defined_workflow = AsyncMock(
            return_value={
                "role": "assistant",
                "content": "workflow analysis",
                "metadata": {"route_type": "workflow"},
            }
        )
        agent._execute_direct = AsyncMock()

        result = await agent.reply({"content": "q"}, decision=_workflow_decision())

        assert result["content"] == "workflow analysis"
        assert "degraded" not in result["metadata"]
        agent._execute_direct.assert_not_awaited()


class TestExternalDecision:
    """Fix 2: reply() reuses a pre-computed decision instead of re-routing."""

    async def test_reply_skips_selector_when_decision_provided(self):
        agent = MegaAgent(name="test-agent")
        selector = MagicMock()
        selector.route = AsyncMock(side_effect=AssertionError("selector must not run"))
        agent._selector_instance = selector
        agent._execute_by_route = AsyncMock(
            return_value={"role": "assistant", "content": "ok", "metadata": {}}
        )

        decision = RouteDecision(route_type="direct", confidence=0.9)
        result = await agent.reply({"content": "hello"}, decision=decision)

        selector.route.assert_not_called()
        agent._execute_by_route.assert_awaited_once()
        assert agent._execute_by_route.call_args.args[0] is decision
        assert result["content"] == "ok"

    async def test_reply_routes_internally_without_decision(self):
        agent = MegaAgent(name="test-agent")
        selector = MagicMock()
        selector.route = AsyncMock(return_value=RouteDecision(route_type="direct"))
        agent._selector_instance = selector
        agent._execute_by_route = AsyncMock(
            return_value={"role": "assistant", "content": "ok", "metadata": {}}
        )

        result = await agent.reply({"content": "hello"})

        selector.route.assert_awaited_once()
        assert result["content"] == "ok"

    async def test_engine_passes_decision_to_agent_reply(self):
        """ExecutionEngine._execute_sync forwards its decision to agent.reply."""
        from resolveagent.runtime.context import ExecutionContext
        from resolveagent.runtime.engine import ExecutionEngine

        engine = ExecutionEngine()
        decision = RouteDecision(route_type="skill", route_target="web-search", confidence=0.9)
        agent = MagicMock()
        agent.reply = AsyncMock(return_value={"role": "assistant", "content": "ok", "metadata": {}})
        ctx = ExecutionContext(
            execution_id="e1",
            agent_id="a1",
            conversation_id="c1",
            input_text="hi",
        )

        result = await engine._execute_sync(agent, "hi", decision, ctx)

        agent.reply.assert_awaited_once()
        assert agent.reply.call_args.kwargs["decision"] is decision
        assert result["content"] == "ok"


class TestReplyDepthGuard:
    """Fix 3: workflow agent nodes re-entering reply() are depth-limited."""

    async def test_reply_at_max_depth_degrades_to_direct(self):
        agent = MegaAgent(name="test-agent")
        selector = MagicMock()
        selector.route = AsyncMock(side_effect=AssertionError("selector must not run at max depth"))
        agent._selector_instance = selector
        agent._execute_direct = AsyncMock(
            return_value={"role": "assistant", "content": "direct answer", "metadata": {"route_type": "direct"}}
        )

        result = await agent.reply({"content": "q"}, _depth=MAX_REPLY_DEPTH)

        selector.route.assert_not_called()
        agent._execute_direct.assert_awaited_once()
        assert result["content"] == "direct answer"
        assert result["metadata"]["degraded"] is True

    async def test_workflow_agent_node_increments_depth(self):
        agent = MegaAgent(name="test-agent")
        depths = []

        async def fake_reply(message, decision=None, _depth=0):
            depths.append(_depth)
            return {"role": "assistant", "content": "node output", "metadata": {}}

        agent.reply = fake_reply

        result = await agent._execute_defined_workflow(
            "input",
            {"name": "wf", "nodes": [{"id": "n1", "type": "agent"}], "edges": []},
            _workflow_decision(),
            _depth=1,
        )

        assert depths == [2]
        assert result["content"] == "node output"

    async def test_recursive_workflow_terminates_at_max_depth(self, monkeypatch):
        """A workflow whose agent node re-routes to a workflow terminates
        instead of recursing forever; the leaf answer bubbles up."""
        agent = MegaAgent(name="test-agent")
        _registry_with_definition(
            monkeypatch,
            {"name": "loop", "nodes": [{"id": "n1", "type": "agent"}], "edges": []},
        )
        selector = MagicMock()
        selector.route = AsyncMock(return_value=_workflow_decision())
        agent._selector_instance = selector
        agent._execute_direct = AsyncMock(
            return_value={"role": "assistant", "content": "leaf answer", "metadata": {"route_type": "direct"}}
        )

        result = await agent.reply({"content": "x"})

        assert selector.route.await_count == MAX_REPLY_DEPTH
        agent._execute_direct.assert_awaited_once()
        assert result["content"] == "leaf answer"
