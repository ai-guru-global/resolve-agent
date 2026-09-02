"""LangGraph workflow builder for ResolveAgent diagnosis scenarios."""

from __future__ import annotations

import logging
from typing import Any

from resolveagent.integrations.langgraph.node import ResolveAgentNode, SkillExecutorNode

logger = logging.getLogger(__name__)


class DiagnosisWorkflowBuilder:
    """Builder for creating LangGraph diagnosis workflows.

    Provides pre-configured workflow patterns for incident diagnosis,
    including multi-agent collaboration and skill chaining.

    Example::
        builder = DiagnosisWorkflowBuilder()
        graph = builder.build_incident_diagnosis_graph(
            triage_agent=triage_agent,
            diagnose_agent=diagnose_agent,
            resolve_agent=resolve_agent,
        )
        result = await graph.ainvoke({"incident_id": "INC-123"})
    """

    def __init__(self) -> None:
        """Initialize the workflow builder."""
        self._nodes: dict[str, Any] = {}
        self._edges: list[tuple[str, str]] = []

    def build_incident_diagnosis_graph(
        self,
        triage_agent: Any,
        diagnose_agent: Any,
        resolve_agent: Any,
        skill_executor: Any | None = None,
    ) -> DiagnosisGraph:
        """Build a 3-stage incident diagnosis workflow.

        Workflow stages:
        1. Triage - Classify incident severity and domain
        2. Diagnose - Run FTA/code analysis to find root cause
        3. Resolve - Generate solution and action plan

        Args:
            triage_agent: Agent for incident triage.
            diagnose_agent: Agent for root cause diagnosis.
            resolve_agent: Agent for solution generation.
            skill_executor: Optional skill executor for diagnosis tools.

        Returns:
            A DiagnosisGraph instance wrapping the compiled workflow.
        """
        # Create nodes
        triage_node = ResolveAgentNode(triage_agent, node_name="triage")
        diagnose_node = ResolveAgentNode(diagnose_agent, node_name="diagnose")
        resolve_node = ResolveAgentNode(resolve_agent, node_name="resolve")

        nodes: dict[str, Any] = {
            "triage": triage_node,
            "diagnose": diagnose_node,
            "resolve": resolve_node,
        }

        # Optionally add skill execution nodes
        if skill_executor is not None:
            fta_node = SkillExecutorNode(
                skill_executor,
                skill_name="fta_analyzer",
                input_mapping={"incident_context": "query"},
                output_key="fta_result",
            )
            nodes["fta_analysis"] = fta_node

            # Wire: triage -> fta -> diagnose -> resolve
            edges = [
                ("triage", "fta_analysis"),
                ("fta_analysis", "diagnose"),
                ("diagnose", "resolve"),
            ]
        else:
            # Simple linear workflow
            edges = [
                ("triage", "diagnose"),
                ("diagnose", "resolve"),
            ]

        return DiagnosisGraph(nodes=nodes, edges=edges, entry_point="triage")

    def build_fta_diagnosis_graph(
        self,
        skill_executor: Any,
        llm_agent: Any | None = None,
    ) -> DiagnosisGraph:
        """Build an FTA-focused diagnosis workflow.

        Runs FTA analysis first, then optionally uses LLM to interpret results.

        Args:
            skill_executor: Skill executor for running FTA tools.
            llm_agent: Optional agent for interpreting FTA results.

        Returns:
            A DiagnosisGraph instance.
        """
        nodes: dict[str, Any] = {
            "fta_analysis": SkillExecutorNode(
                skill_executor,
                skill_name="fta_analyzer",
                input_mapping={"fault_tree": "tree_data", "context": "context"},
                output_key="fta_result",
            ),
        }

        edges: list[tuple[str, str]] = []

        if llm_agent is not None:
            nodes["interpret"] = ResolveAgentNode(llm_agent, node_name="interpret", output_key="interpretation")
            edges = [("fta_analysis", "interpret")]

        return DiagnosisGraph(nodes=nodes, edges=edges, entry_point="fta_analysis")


class DiagnosisGraph:
    """Wrapper for a compiled diagnosis workflow graph.

    Provides a uniform interface regardless of whether LangGraph
    is actually installed. Falls back to sequential execution.
    """

    def __init__(
        self,
        nodes: dict[str, Any],
        edges: list[tuple[str, str]],
        entry_point: str,
    ) -> None:
        """Initialize the diagnosis graph.

        Args:
            nodes: Mapping of node names to node callables.
            edges: List of (source, target) edge tuples.
            entry_point: Name of the entry node.
        """
        self.nodes = nodes
        self.edges = edges
        self.entry_point = entry_point
        self._langgraph_available = self._check_langgraph()

    def _check_langgraph(self) -> bool:
        """Check if LangGraph is installed."""
        try:
            import langgraph  # noqa: F401

            return True
        except ImportError:
            logger.debug("LangGraph not installed, using fallback execution")
            return False

    async def ainvoke(self, initial_state: dict[str, Any]) -> dict[str, Any]:
        """Invoke the workflow asynchronously.

        If LangGraph is installed, compiles and runs the graph.
        Otherwise, falls back to sequential execution.

        Args:
            initial_state: Initial state for the workflow.

        Returns:
            Final state after workflow completion.
        """
        if self._langgraph_available:
            return await self._invoke_langgraph(initial_state)
        return await self._invoke_sequential(initial_state)

    def invoke(self, initial_state: dict[str, Any]) -> dict[str, Any]:
        """Invoke the workflow synchronously.

        Args:
            initial_state: Initial state for the workflow.

        Returns:
            Final state after workflow completion.
        """
        import asyncio

        return asyncio.run(self.ainvoke(initial_state))

    async def _invoke_sequential(self, state: dict[str, Any]) -> dict[str, Any]:
        """Fallback sequential execution without LangGraph."""
        # Build adjacency list
        adjacency: dict[str, list[str]] = {name: [] for name in self.nodes}
        for src, tgt in self.edges:
            if src in adjacency:
                adjacency[src].append(tgt)

        # Execute nodes in BFS order
        visited: set[str] = set()
        queue: list[str] = [self.entry_point]

        while queue:
            current = queue.pop(0)
            if current in visited or current not in self.nodes:
                continue
            visited.add(current)

            node = self.nodes[current]
            state = await node(state)

            for next_node in adjacency.get(current, []):
                if next_node not in visited:
                    queue.append(next_node)

        return state

    async def _invoke_langgraph(self, state: dict[str, Any]) -> dict[str, Any]:
        """Execute using LangGraph if available."""
        try:
            from typing_extensions import TypedDict

            from langgraph.graph import StateGraph

            class DiagnosisState(TypedDict):
                messages: list[Any]
                incident_id: str
                fta_result: dict[str, Any]
                diagnosis_result: dict[str, Any]
                skill_result: dict[str, Any]

            graph = StateGraph(DiagnosisState)

            # Add nodes
            for name, node in self.nodes.items():
                graph.add_node(name, node)

            # Add edges
            for src, tgt in self.edges:
                graph.add_edge(src, tgt)

            graph.set_entry_point(self.entry_point)

            compiled = graph.compile()
            result: dict[str, Any] = await compiled.ainvoke(state)
            return result

        except Exception:
            logger.warning("LangGraph execution failed, falling back to sequential")
            return await self._invoke_sequential(state)
