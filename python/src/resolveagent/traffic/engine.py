"""Dynamic traffic analysis engine orchestrator.

Coordinates traffic collection, graph building, report generation,
and persistence into a single analysis workflow with SSE streaming.
"""

from __future__ import annotations

import logging
import uuid
from typing import Any, AsyncIterator

from resolveagent.traffic.collector import TrafficCollector
from resolveagent.traffic.graph_builder import TrafficGraphBuilder, TrafficGraphData
from resolveagent.traffic.report_generator import AnalysisReport, ReportGenerator

logger = logging.getLogger(__name__)


class DynamicAnalysisEngine:
    """Top-level orchestrator for dynamic traffic analysis.

    Pipeline:
    1. Collect traffic data from multiple sources (eBPF, proxy, OTel)
    2. Build service dependency graph
    3. Generate analysis report (LLM + rules)
    4. Persist results to Go platform store

    Usage::

        engine = DynamicAnalysisEngine(
            capture_client=cap_client,
            graph_client=graph_client,
            llm_provider=llm,
        )

        async for event in engine.analyze(sources=[
            {"type": "otel", "data": otel_data},
        ]):
            send_sse(event)
    """

    def __init__(
        self,
        capture_client: Any | None = None,
        graph_client: Any | None = None,
        llm_provider: Any | None = None,
        rag_pipeline: Any | None = None,
        model: str | None = None,
    ) -> None:
        self._collector = TrafficCollector()
        self._graph_builder = TrafficGraphBuilder()
        self._report_gen = ReportGenerator(
            llm_provider=llm_provider,
            rag_pipeline=rag_pipeline,
            model=model,
        )
        self._capture_client = capture_client
        self._graph_client = graph_client

    async def analyze(
        self,
        sources: list[dict[str, Any]],
        name: str = "",
        target_service: str = "",
    ) -> AsyncIterator[dict[str, Any]]:
        """Run the full dynamic analysis pipeline.

        Yields SSE-compatible event dicts.

        Args:
            sources: List of ``{"type": "otel"|"proxy"|"ebpf", "data": ...}`` dicts.
            name: Human-readable name for this capture session.
            target_service: Primary service being analysed.

        Yields:
            Event dicts with ``type`` and ``data`` keys.
        """
        capture_id = str(uuid.uuid4())
        session_name = name or f"capture-{capture_id[:8]}"

        yield {
            "type": "capture_started",
            "data": {
                "capture_id": capture_id,
                "name": session_name,
                "sources": [s.get("type", "") for s in sources],
            },
        }

        # Phase 1: Collect traffic data
        yield {"type": "phase", "data": {"phase": "collection", "status": "started"}}

        records = self._collector.collect_multi(sources)

        yield {
            "type": "collection_complete",
            "data": {"record_count": len(records)},
        }

        # Persist capture session
        if self._capture_client is not None:
            try:
                source_types = list({s.get("type", "") for s in sources})
                await self._capture_client.create({
                    "name": session_name,
                    "source_type": ",".join(source_types),
                    "target_service": target_service,
                    "status": "collecting",
                    "config": {"sources": [s.get("type") for s in sources]},
                })

                # Persist records
                record_dicts = TrafficCollector.records_to_dicts(records)
                if record_dicts:
                    await self._capture_client.add_records(capture_id, record_dicts)

                await self._capture_client.update(capture_id, {
                    "status": "completed",
                    "summary": {"record_count": len(records)},
                })
            except Exception:
                logger.warning("Failed to persist capture session", exc_info=True)

        if not records:
            yield {
                "type": "analysis_complete",
                "data": {
                    "capture_id": capture_id,
                    "status": "empty",
                    "message": "No traffic records collected",
                },
            }
            return

        # Phase 2: Build traffic graph
        yield {"type": "phase", "data": {"phase": "graph_building", "status": "started"}}

        graph = self._graph_builder.build(records)

        yield {
            "type": "graph_complete",
            "data": {
                "nodes": len(graph.nodes),
                "edges": len(graph.edges),
                "stats": graph.stats,
            },
        }

        # Phase 3: Generate analysis report
        yield {"type": "phase", "data": {"phase": "report_generation", "status": "started"}}

        report = await self._report_gen.generate(graph)

        yield {
            "type": "report_complete",
            "data": {
                "summary": report.summary[:500],
                "hotspots_count": len(report.hotspots),
                "anomalies_count": len(report.anomalies),
                "suggestions_count": len(report.suggestions),
            },
        }

        # Persist traffic graph + report
        if self._graph_client is not None:
            try:
                store_data = TrafficGraphBuilder.to_store_format(graph)
                store_data.update({
                    "capture_id": capture_id,
                    "name": f"graph-{session_name}",
                    "analysis_report": report.to_markdown(),
                    "suggestions": report.suggestions,
                    "status": "completed",
                })
                await self._graph_client.create(store_data)
            except Exception:
                logger.warning("Failed to persist traffic graph", exc_info=True)

        # Final event
        yield {
            "type": "analysis_complete",
            "data": {
                "capture_id": capture_id,
                "name": session_name,
                "graph": TrafficGraphBuilder.to_xyflow(graph),
                "report": report.to_dict(),
                "stats": graph.stats,
            },
        }

    async def analyze_single(
        self,
        sources: list[dict[str, Any]],
        name: str = "",
        target_service: str = "",
    ) -> dict[str, Any]:
        """Non-streaming variant that returns the final result."""
        result: dict[str, Any] = {}
        async for event in self.analyze(sources, name, target_service):
            if event["type"] == "analysis_complete":
                result = event["data"]
        return result
