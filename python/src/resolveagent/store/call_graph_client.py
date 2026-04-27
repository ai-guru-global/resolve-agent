"""Call graph store client for Go platform REST API."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, List

from resolveagent.store.base_client import BaseStoreClient

logger = logging.getLogger(__name__)


@dataclass
class CallGraphInfo:
    """Call graph metadata from Go platform."""

    id: str
    analysis_id: str = ""
    repository_url: str = ""
    branch: str = "main"
    language: str = ""
    entry_point: str = ""
    node_count: int = 0
    edge_count: int = 0
    max_depth: int = 0
    status: str = "pending"
    graph_data: dict[str, Any] = field(default_factory=dict)


@dataclass
class CallGraphNodeInfo:
    """Call graph node from Go platform."""

    id: str
    call_graph_id: str
    function_name: str = ""
    file_path: str = ""
    line_start: int = 0
    line_end: int = 0
    package: str = ""
    node_type: str = "internal"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class CallGraphEdgeInfo:
    """Call graph edge from Go platform."""

    id: str
    call_graph_id: str
    caller_node_id: str = ""
    callee_node_id: str = ""
    call_type: str = "direct"
    weight: int = 1
    metadata: dict[str, Any] = field(default_factory=dict)


class CallGraphClient(BaseStoreClient):
    """Client for call graph store operations."""

    async def create(self, graph: dict[str, Any]) -> dict[str, Any] | None:
        return await self._post("/api/v1/call-graphs", graph)

    async def get(self, graph_id: str) -> CallGraphInfo | None:
        data = await self._get(f"/api/v1/call-graphs/{graph_id}")
        if not data:
            return None
        return CallGraphInfo(
            id=data.get("id", graph_id),
            analysis_id=data.get("analysis_id", ""),
            repository_url=data.get("repository_url", ""),
            branch=data.get("branch", "main"),
            language=data.get("language", ""),
            entry_point=data.get("entry_point", ""),
            node_count=data.get("node_count", 0),
            edge_count=data.get("edge_count", 0),
            max_depth=data.get("max_depth", 0),
            status=data.get("status", "pending"),
            graph_data=data.get("graph_data", {}),
        )

    async def list(self, analysis_id: str | None = None) -> List[CallGraphInfo]:
        params = {}
        if analysis_id:
            params["analysis_id"] = analysis_id
        data = await self._get("/api/v1/call-graphs", params=params)
        if not data:
            return []
        return [
            CallGraphInfo(
                id=g.get("id", ""),
                analysis_id=g.get("analysis_id", ""),
                repository_url=g.get("repository_url", ""),
                branch=g.get("branch", "main"),
                language=g.get("language", ""),
                entry_point=g.get("entry_point", ""),
                node_count=g.get("node_count", 0),
                edge_count=g.get("edge_count", 0),
                max_depth=g.get("max_depth", 0),
                status=g.get("status", "pending"),
            )
            for g in data.get("call_graphs", [])
        ]

    async def delete(self, graph_id: str) -> dict[str, Any] | None:
        return await self._delete(f"/api/v1/call-graphs/{graph_id}")

    async def add_nodes(self, graph_id: str, nodes: List[dict[str, Any]]) -> dict[str, Any] | None:
        return await self._post(f"/api/v1/call-graphs/{graph_id}/nodes", {"nodes": nodes})

    async def add_edges(self, graph_id: str, edges: List[dict[str, Any]]) -> dict[str, Any] | None:
        return await self._post(f"/api/v1/call-graphs/{graph_id}/edges", {"edges": edges})

    async def list_nodes(self, graph_id: str) -> List[CallGraphNodeInfo]:
        data = await self._get(f"/api/v1/call-graphs/{graph_id}/nodes")
        if not data:
            return []
        return [
            CallGraphNodeInfo(
                id=n.get("id", ""),
                call_graph_id=n.get("call_graph_id", graph_id),
                function_name=n.get("function_name", ""),
                file_path=n.get("file_path", ""),
                line_start=n.get("line_start", 0),
                line_end=n.get("line_end", 0),
                package=n.get("package", ""),
                node_type=n.get("node_type", "internal"),
                metadata=n.get("metadata", {}),
            )
            for n in data.get("nodes", [])
        ]

    async def list_edges(self, graph_id: str) -> List[CallGraphEdgeInfo]:
        data = await self._get(f"/api/v1/call-graphs/{graph_id}/edges")
        if not data:
            return []
        return [
            CallGraphEdgeInfo(
                id=e.get("id", ""),
                call_graph_id=e.get("call_graph_id", graph_id),
                caller_node_id=e.get("caller_node_id", ""),
                callee_node_id=e.get("callee_node_id", ""),
                call_type=e.get("call_type", "direct"),
                weight=e.get("weight", 1),
                metadata=e.get("metadata", {}),
            )
            for e in data.get("edges", [])
        ]

    async def get_subgraph(self, graph_id: str, entry_node_id: str, depth: int = 5) -> dict[str, Any]:
        data = await self._get(
            f"/api/v1/call-graphs/{graph_id}/subgraph",
            params={"entry": entry_node_id, "depth": str(depth)},
        )
        return data or {"nodes": [], "edges": []}
