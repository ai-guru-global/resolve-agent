"""Build service dependency graphs from traffic records.

Aggregates raw traffic records into a graph structure suitable for
visualisation with XYFlow and analysis by LLM.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from resolveagent.traffic.collector import RawRecord

logger = logging.getLogger(__name__)


@dataclass
class ServiceNode:
    """A service node in the traffic graph."""

    id: str
    label: str
    request_count: int = 0
    error_count: int = 0
    avg_latency_ms: float = 0.0
    protocols: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ServiceEdge:
    """An edge representing traffic between two services."""

    id: str
    source: str  # source node id
    target: str  # target node id
    request_count: int = 0
    error_count: int = 0
    avg_latency_ms: float = 0.0
    protocols: list[str] = field(default_factory=list)
    methods: list[str] = field(default_factory=list)
    paths: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class TrafficGraphData:
    """Complete traffic graph with aggregated metrics."""

    nodes: list[ServiceNode] = field(default_factory=list)
    edges: list[ServiceEdge] = field(default_factory=list)
    stats: dict[str, Any] = field(default_factory=dict)


class TrafficGraphBuilder:
    """Build service dependency graphs from traffic records.

    Usage::

        builder = TrafficGraphBuilder()
        graph = builder.build(records)
        xy_data = builder.to_xyflow(graph)
    """

    def build(self, records: list[RawRecord]) -> TrafficGraphData:
        """Aggregate traffic records into a service dependency graph.

        Args:
            records: List of normalised traffic records.

        Returns:
            ``TrafficGraphData`` with nodes and edges.
        """
        if not records:
            return TrafficGraphData()

        # Aggregate per-service metrics
        node_stats: dict[str, _NodeAgg] = defaultdict(_NodeAgg)
        edge_stats: dict[tuple[str, str], _EdgeAgg] = defaultdict(_EdgeAgg)

        for r in records:
            src = r.source_service or "unknown"
            dst = r.dest_service or "unknown"

            # Source node
            ns = node_stats[src]
            ns.request_count += 1
            if r.status_code >= 400:
                ns.error_count += 1
            ns.latencies.append(r.latency_ms)
            if r.protocol and r.protocol not in ns.protocols:
                ns.protocols.append(r.protocol)

            # Dest node
            nd = node_stats[dst]
            nd.request_count += 1

            # Edge
            edge_key = (src, dst)
            es = edge_stats[edge_key]
            es.request_count += 1
            if r.status_code >= 400:
                es.error_count += 1
            es.latencies.append(r.latency_ms)
            if r.protocol and r.protocol not in es.protocols:
                es.protocols.append(r.protocol)
            if r.method and r.method not in es.methods:
                es.methods.append(r.method)
            if r.path and r.path not in es.paths and len(es.paths) < 20:
                es.paths.append(r.path)

        # Build nodes
        nodes = [
            ServiceNode(
                id=name,
                label=name,
                request_count=agg.request_count,
                error_count=agg.error_count,
                avg_latency_ms=sum(agg.latencies) / len(agg.latencies) if agg.latencies else 0,
                protocols=agg.protocols,
            )
            for name, agg in node_stats.items()
        ]

        # Build edges
        edges = [
            ServiceEdge(
                id=f"{src}->{dst}",
                source=src,
                target=dst,
                request_count=agg.request_count,
                error_count=agg.error_count,
                avg_latency_ms=sum(agg.latencies) / len(agg.latencies) if agg.latencies else 0,
                protocols=agg.protocols,
                methods=agg.methods,
                paths=agg.paths,
            )
            for (src, dst), agg in edge_stats.items()
        ]

        total_reqs = sum(n.request_count for n in nodes) // 2  # counted on both sides
        total_errors = sum(e.error_count for e in edges)

        graph = TrafficGraphData(
            nodes=nodes,
            edges=edges,
            stats={
                "total_records": len(records),
                "unique_services": len(nodes),
                "unique_edges": len(edges),
                "total_requests": total_reqs,
                "total_errors": total_errors,
                "error_rate": total_errors / total_reqs if total_reqs else 0,
            },
        )

        logger.info(
            "Built traffic graph: %d nodes, %d edges",
            len(nodes),
            len(edges),
        )
        return graph

    @staticmethod
    def to_xyflow(graph: TrafficGraphData) -> dict[str, Any]:
        """Convert the graph data to XYFlow-compatible JSON.

        The output can be directly consumed by ``@xyflow/react`` in the WebUI.

        Returns:
            Dict with ``nodes`` and ``edges`` arrays in XYFlow format.
        """
        xy_nodes = []
        xy_edges = []

        # Simple grid layout: arrange nodes in rows
        cols = max(int(len(graph.nodes) ** 0.5), 1)
        spacing_x, spacing_y = 280, 160

        for i, node in enumerate(graph.nodes):
            row = i // cols
            col = i % cols
            xy_nodes.append(
                {
                    "id": node.id,
                    "type": "serviceNode",
                    "position": {"x": col * spacing_x, "y": row * spacing_y},
                    "data": {
                        "label": node.label,
                        "requestCount": node.request_count,
                        "errorCount": node.error_count,
                        "avgLatencyMs": round(node.avg_latency_ms, 1),
                        "protocols": node.protocols,
                    },
                }
            )

        for edge in graph.edges:
            xy_edges.append(
                {
                    "id": edge.id,
                    "source": edge.source,
                    "target": edge.target,
                    "type": "trafficEdge",
                    "animated": edge.error_count > 0,
                    "data": {
                        "requestCount": edge.request_count,
                        "errorCount": edge.error_count,
                        "avgLatencyMs": round(edge.avg_latency_ms, 1),
                        "protocols": edge.protocols,
                        "methods": edge.methods,
                    },
                }
            )

        return {"nodes": xy_nodes, "edges": xy_edges}

    @staticmethod
    def to_store_format(graph: TrafficGraphData) -> dict[str, Any]:
        """Convert graph data to the format expected by TrafficGraphClient."""
        return {
            "graph_data": graph.stats,
            "nodes": [
                {
                    "id": n.id,
                    "label": n.label,
                    "request_count": n.request_count,
                    "error_count": n.error_count,
                    "avg_latency_ms": n.avg_latency_ms,
                    "protocols": n.protocols,
                }
                for n in graph.nodes
            ],
            "edges": [
                {
                    "id": e.id,
                    "source": e.source,
                    "target": e.target,
                    "request_count": e.request_count,
                    "error_count": e.error_count,
                    "avg_latency_ms": e.avg_latency_ms,
                    "protocols": e.protocols,
                    "methods": e.methods,
                    "paths": e.paths,
                }
                for e in graph.edges
            ],
        }


class _NodeAgg:
    """Aggregation helper for service node metrics."""

    __slots__ = ("request_count", "error_count", "latencies", "protocols")

    def __init__(self) -> None:
        self.request_count = 0
        self.error_count = 0
        self.latencies: list[int] = []
        self.protocols: list[str] = []


class _EdgeAgg:
    """Aggregation helper for edge metrics."""

    __slots__ = ("request_count", "error_count", "latencies", "protocols", "methods", "paths")

    def __init__(self) -> None:
        self.request_count = 0
        self.error_count = 0
        self.latencies: list[int] = []
        self.protocols: list[str] = []
        self.methods: list[str] = []
        self.paths: list[str] = []
