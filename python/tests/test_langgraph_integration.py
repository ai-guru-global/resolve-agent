"""Tests for LangGraph integration."""

from __future__ import annotations

from typing import Any

import pytest

from resolveagent.integrations.langgraph.builder import DiagnosisGraph, DiagnosisWorkflowBuilder
from resolveagent.integrations.langgraph.node import ResolveAgentNode, SkillExecutorNode


class MockAgent:
    """Mock agent for testing."""

    def __init__(self, name: str = "test") -> None:
        self.name = name
        self.calls: list[dict[str, Any]] = []

    async def reply(self, message: dict[str, Any]) -> dict[str, Any]:
        self.calls.append(message)
        return {"role": "assistant", "content": f"[{self.name}] {message.get('content', '')}"}


class MockSkillExecutor:
    """Mock skill executor for testing."""

    def __init__(self) -> None:
        self.executions: list[tuple[str, dict[str, Any]]] = []

    async def execute(self, skill: Any, inputs: dict[str, Any]) -> Any:
        self.executions.append((skill, inputs))

        class MockResult:
            success = True
            outputs = {"result": "mock_output"}
            error = None
            duration_ms = 100

        return MockResult()


class TestResolveAgentNode:
    """Tests for ResolveAgentNode."""

    @pytest.mark.asyncio
    async def test_node_processes_message(self):
        """Test node processes a message and appends response."""
        agent = MockAgent("test_agent")
        node = ResolveAgentNode(agent, node_name="test")

        state = {"messages": [{"role": "user", "content": "hello"}]}
        result = await node(state)

        assert len(result["messages"]) == 2
        assert result["messages"][1]["role"] == "assistant"
        assert "test_agent" in result["messages"][1]["content"]

    @pytest.mark.asyncio
    async def test_node_empty_messages(self):
        """Test node handles empty messages gracefully."""
        agent = MockAgent()
        node = ResolveAgentNode(agent, node_name="test")

        state = {"messages": []}
        result = await node(state)

        assert result["messages"] == []

    @pytest.mark.asyncio
    async def test_node_custom_output_key(self):
        """Test node writes to custom output key."""
        agent = MockAgent()
        node = ResolveAgentNode(agent, node_name="test", output_key="response")

        state = {"messages": [{"role": "user", "content": "hi"}]}
        result = await node(state)

        assert "response" in result
        assert result["response"]["role"] == "assistant"

    @pytest.mark.asyncio
    async def test_node_preserves_existing_state(self):
        """Test node preserves other state keys."""
        agent = MockAgent()
        node = ResolveAgentNode(agent, node_name="test")

        state = {
            "messages": [{"role": "user", "content": "hello"}],
            "incident_id": "INC-123",
            "metadata": {"priority": "high"},
        }
        result = await node(state)

        assert result["incident_id"] == "INC-123"
        assert result["metadata"]["priority"] == "high"


class TestSkillExecutorNode:
    """Tests for SkillExecutorNode."""

    @pytest.mark.asyncio
    async def test_skill_execution(self, monkeypatch):
        """Test skill executor node runs skill and updates state."""
        executor = MockSkillExecutor()
        node = SkillExecutorNode(
            executor,
            skill_name="test_skill",
            input_mapping={"query": "query"},
            output_key="result",
        )

        # Mock SkillLoader to return a fake skill
        class FakeSkill:
            manifest = type("Manifest", (), {"name": "test_skill", "version": "1.0"})()

        class FakeLoader:
            def get(self, name):
                return FakeSkill() if name == "test_skill" else None

        monkeypatch.setattr(
            "resolveagent.skills.loader.SkillLoader",
            FakeLoader,
        )

        state = {"query": "test query"}
        result = await node(state)

        assert result["result"]["success"] is True
        assert result["result"]["outputs"]["result"] == "mock_output"

    @pytest.mark.asyncio
    async def test_skill_execution_fallback(self):
        """Test skill node falls back when skill not found."""
        executor = MockSkillExecutor()
        node = SkillExecutorNode(
            executor,
            skill_name="nonexistent",
            output_key="result",
        )

        state = {}
        result = await node(state)

        assert "result" in result


class TestDiagnosisWorkflowBuilder:
    """Tests for DiagnosisWorkflowBuilder."""

    def test_builder_initialization(self):
        """Test builder initializes correctly."""
        builder = DiagnosisWorkflowBuilder()
        assert builder is not None

    def test_build_incident_diagnosis_graph(self):
        """Test building a 3-stage diagnosis graph."""
        builder = DiagnosisWorkflowBuilder()
        triage = MockAgent("triage")
        diagnose = MockAgent("diagnose")
        resolve = MockAgent("resolve")

        graph = builder.build_incident_diagnosis_graph(
            triage_agent=triage,
            diagnose_agent=diagnose,
            resolve_agent=resolve,
        )

        assert isinstance(graph, DiagnosisGraph)
        assert "triage" in graph.nodes
        assert "diagnose" in graph.nodes
        assert "resolve" in graph.nodes
        assert graph.entry_point == "triage"

    def test_build_fta_diagnosis_graph(self):
        """Test building FTA-focused diagnosis graph."""
        builder = DiagnosisWorkflowBuilder()
        executor = MockSkillExecutor()

        graph = builder.build_fta_diagnosis_graph(skill_executor=executor)

        assert isinstance(graph, DiagnosisGraph)
        assert "fta_analysis" in graph.nodes
        assert graph.entry_point == "fta_analysis"

    def test_build_fta_graph_with_llm(self):
        """Test FTA graph includes LLM interpretation node."""
        builder = DiagnosisWorkflowBuilder()
        executor = MockSkillExecutor()
        llm = MockAgent("interpreter")

        graph = builder.build_fta_diagnosis_graph(
            skill_executor=executor,
            llm_agent=llm,
        )

        assert "fta_analysis" in graph.nodes
        assert "interpret" in graph.nodes
        assert ("fta_analysis", "interpret") in graph.edges


class TestDiagnosisGraph:
    """Tests for DiagnosisGraph execution."""

    @pytest.mark.asyncio
    async def test_sequential_execution(self):
        """Test sequential execution without LangGraph."""
        agent1 = MockAgent("agent1")
        agent2 = MockAgent("agent2")

        nodes = {
            "node1": ResolveAgentNode(agent1, node_name="node1"),
            "node2": ResolveAgentNode(agent2, node_name="node2"),
        }
        edges = [("node1", "node2")]

        graph = DiagnosisGraph(nodes=nodes, edges=edges, entry_point="node1")

        initial_state = {"messages": [{"role": "user", "content": "test"}]}
        result = await graph.ainvoke(initial_state)

        assert len(agent1.calls) == 1
        assert len(agent2.calls) == 1
        assert len(result["messages"]) == 3  # user + agent1 + agent2

    @pytest.mark.asyncio
    async def test_execution_preserves_state(self):
        """Test execution preserves non-message state."""
        agent = MockAgent()
        nodes = {
            "node1": ResolveAgentNode(agent, node_name="node1", output_key="response"),
        }
        edges = []

        graph = DiagnosisGraph(nodes=nodes, edges=edges, entry_point="node1")

        initial_state = {
            "messages": [{"role": "user", "content": "test"}],
            "incident_id": "INC-456",
        }
        result = await graph.ainvoke(initial_state)

        assert result["incident_id"] == "INC-456"
        assert "response" in result

    def test_invoke_sync(self):
        """Test synchronous invocation."""
        agent = MockAgent()
        nodes = {
            "node1": ResolveAgentNode(agent, node_name="node1"),
        }
        edges = []

        graph = DiagnosisGraph(nodes=nodes, edges=edges, entry_point="node1")

        initial_state = {"messages": [{"role": "user", "content": "sync test"}]}
        result = graph.invoke(initial_state)

        assert len(agent.calls) == 1
        assert len(result["messages"]) == 2
