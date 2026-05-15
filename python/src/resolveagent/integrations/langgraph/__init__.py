"""LangGraph integration for ResolveAgent.

Provides ResolveAgentNode for embedding ResolveAgent capabilities
into LangGraph workflows. Requires `langgraph` to be installed.

Example::
    from resolveagent.integrations.langgraph import ResolveAgentNode, DiagnosisWorkflowBuilder

    builder = DiagnosisWorkflowBuilder()
    graph = builder.build_incident_diagnosis_graph()
    result = await graph.ainvoke({"incident_id": "INC-123"})
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from resolveagent.integrations.langgraph.builder import DiagnosisWorkflowBuilder
    from resolveagent.integrations.langgraph.node import ResolveAgentNode

__all__ = ["ResolveAgentNode", "DiagnosisWorkflowBuilder"]


def __getattr__(name: str):
    """Lazy import to avoid loading langgraph unless needed."""
    if name == "ResolveAgentNode":
        from resolveagent.integrations.langgraph.node import ResolveAgentNode

        return ResolveAgentNode
    if name == "DiagnosisWorkflowBuilder":
        from resolveagent.integrations.langgraph.builder import DiagnosisWorkflowBuilder

        return DiagnosisWorkflowBuilder
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
