"""Traffic graph store client for Go platform REST API."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from resolveagent.store.base_client import BaseStoreClient

logger = logging.getLogger(__name__)


@dataclass
class TrafficGraphInfo:
    """Traffic graph from Go platform."""

    id: str
    capture_id: str = ""
    name: str = ""
    graph_data: dict[str, Any] = field(default_factory=dict)
    nodes: list[Any] = field(default_factory=list)
    edges: list[Any] = field(default_factory=list)
    analysis_report: str = ""
    suggestions: list[Any] = field(default_factory=list)
    status: str = "pending"


class TrafficGraphClient(BaseStoreClient):
    """Client for traffic graph store operations."""

    async def create(self, graph: dict[str, Any]) -> dict[str, Any] | None:
        return await self._post("/api/v1/traffic/graphs", graph)

    async def get(self, graph_id: str) -> TrafficGraphInfo | None:
        data = await self._get(f"/api/v1/traffic/graphs/{graph_id}")
        if not data:
            return None
        return TrafficGraphInfo(
            id=data.get("id", graph_id),
            capture_id=data.get("capture_id", ""),
            name=data.get("name", ""),
            graph_data=data.get("graph_data", {}),
            nodes=data.get("nodes", []),
            edges=data.get("edges", []),
            analysis_report=data.get("analysis_report", ""),
            suggestions=data.get("suggestions", []),
            status=data.get("status", "pending"),
        )

    async def list(self) -> list[TrafficGraphInfo]:
        data = await self._get("/api/v1/traffic/graphs")
        if not data:
            return []
        return [
            TrafficGraphInfo(
                id=g.get("id", ""),
                capture_id=g.get("capture_id", ""),
                name=g.get("name", ""),
                status=g.get("status", "pending"),
            )
            for g in data.get("graphs", [])
        ]

    async def update(self, graph_id: str, data: dict[str, Any]) -> dict[str, Any] | None:
        return await self._put(f"/api/v1/traffic/graphs/{graph_id}", data)

    async def delete(self, graph_id: str) -> dict[str, Any] | None:
        return await self._delete(f"/api/v1/traffic/graphs/{graph_id}")

    async def analyze(self, graph_id: str) -> dict[str, Any] | None:
        """Trigger LLM analysis on a traffic graph."""
        return await self._post(f"/api/v1/traffic/graphs/{graph_id}/analyze", {})
