"""Unit tests for traffic capture id propagation, collector timestamps, and RAG list handling."""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

from resolveagent.traffic.collector import RawRecord, TrafficCollector
from resolveagent.traffic.engine import DynamicAnalysisEngine
from resolveagent.traffic.graph_builder import TrafficGraphBuilder
from resolveagent.traffic.report_generator import ReportGenerator


class TestCollectorTimestamp:
    def test_default_timestamp_is_rfc3339_with_z(self):
        dicts = TrafficCollector.records_to_dicts([RawRecord(source_service="a", dest_service="b")])

        timestamp = dicts[0]["timestamp"]
        assert timestamp.endswith("Z")
        parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        assert parsed.tzinfo is not None

    def test_explicit_timestamp_preserved(self):
        dicts = TrafficCollector.records_to_dicts([RawRecord(timestamp="2026-01-01T00:00:00Z")])

        assert dicts[0]["timestamp"] == "2026-01-01T00:00:00Z"


class TestCaptureIdFromServer:
    async def test_engine_uses_server_returned_capture_id(self):
        capture_client = AsyncMock()
        capture_client.create = AsyncMock(return_value={"id": "server-id-1"})
        engine = DynamicAnalysisEngine(capture_client=capture_client)

        sources = [
            {
                "type": "proxy",
                "data": {"entries": [{"method": "GET", "path": "/x", "response_code": 200}]},
            }
        ]
        async for _event in engine.analyze(sources=sources):
            pass

        assert capture_client.add_records.call_args[0][0] == "server-id-1"
        assert capture_client.update.call_args[0][0] == "server-id-1"


class TestReportRagContext:
    async def test_rag_query_list_result_included_in_prompt(self):
        rag = AsyncMock()
        rag.query = AsyncMock(return_value=[{"text": "历史分析片段"}])
        llm = AsyncMock()
        llm.chat = AsyncMock(return_value=SimpleNamespace(content="分析报告"))
        generator = ReportGenerator(llm_provider=llm, rag_pipeline=rag)

        records = [RawRecord(source_service="a", dest_service="b", request_size=1)]
        graph = TrafficGraphBuilder().build(records)
        report = await generator.generate(graph)

        assert report.summary == "分析报告"
        prompt = llm.chat.call_args.kwargs["messages"][1].content
        assert "历史分析片段" in prompt
