"""Integration tests for DecisionAuditLogger."""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from resolveagent.selector.audit import AuditRecord, DecisionAuditLogger


def _make_decision(**overrides) -> dict:
    base = {
        "route_type": "skill",
        "confidence": 0.85,
        "reasoning": "test reasoning",
        "route_target": "web-search",
        "parameters": {"skill": "web-search"},
    }
    base.update(overrides)
    return base


def _make_context(**overrides) -> dict:
    base = {
        "agent_id": "test-agent",
        "available_skills": [{"name": "web-search"}, {"name": "log-analyzer"}],
        "active_workflows": [{"id": "w1"}],
        "rag_collections": [{"id": "c1"}],
        "conversation_history": [{"role": "user", "content": "hi"}],
        "session_metadata": {"input_hash": "abc123", "input_length": 42},
        "enrichment_confidence": 0.9,
    }
    base.update(overrides)
    return base


class TestDecisionAuditLogger:
    """Tests for DecisionAuditLogger async queue-based logging."""

    @pytest.mark.asyncio
    async def test_log_creates_audit_record(self) -> None:
        store = AsyncMock()
        logger = DecisionAuditLogger(store_client=store)
        try:
            await logger.log(_make_decision(), _make_context(), latency_ms=15.0, strategy="hybrid")
            await asyncio.sleep(0.2)

            store.create_audit_record.assert_called_once()
            record = store.create_audit_record.call_args[0][0]
            assert record["decision_type"] == "skill"
            assert record["confidence"] == 0.85
            assert record["route_target"] == "web-search"
            assert record["latency_ms"] == 15.0
            assert record["strategy"] == "hybrid"
            assert record["error"] is None
        finally:
            await logger.close()

    @pytest.mark.asyncio
    async def test_log_with_store_client_persists(self) -> None:
        store = AsyncMock()
        logger = DecisionAuditLogger(store_client=store)
        try:
            await logger.log(_make_decision(), _make_context())
            await asyncio.sleep(0.2)
            assert store.create_audit_record.called
        finally:
            await logger.close()

    @pytest.mark.asyncio
    async def test_log_without_store_falls_back_to_logging(self) -> None:
        logger = DecisionAuditLogger(store_client=None)
        try:
            await logger.log(_make_decision(), _make_context())
            await asyncio.sleep(0.2)
        finally:
            await logger.close()

    @pytest.mark.asyncio
    async def test_log_disabled_does_nothing(self) -> None:
        store = AsyncMock()
        logger = DecisionAuditLogger(store_client=store)
        logger._enabled = False
        await logger.log(_make_decision(), _make_context())
        await asyncio.sleep(0.1)
        store.create_audit_record.assert_not_called()

    def test_hash_input_deterministic(self) -> None:
        h1 = DecisionAuditLogger.hash_input("hello world")
        h2 = DecisionAuditLogger.hash_input("hello world")
        h3 = DecisionAuditLogger.hash_input("different")
        assert h1 == h2
        assert h1 != h3
        assert len(h1) == 8

    @pytest.mark.asyncio
    async def test_context_snapshot_includes_skills_count(self) -> None:
        store = AsyncMock()
        logger = DecisionAuditLogger(store_client=store)
        try:
            await logger.log(_make_decision(), _make_context())
            await asyncio.sleep(0.2)
            record = store.create_audit_record.call_args[0][0]
            snapshot = record["context_snapshot"]
            assert snapshot["skills_count"] == 2
            assert snapshot["workflows_count"] == 1
            assert snapshot["collections_count"] == 1
            assert snapshot["conversation_length"] == 1
        finally:
            await logger.close()

    @pytest.mark.asyncio
    async def test_context_snapshot_includes_code_context(self) -> None:
        store = AsyncMock()
        logger = DecisionAuditLogger(store_client=store)
        try:
            context = _make_context(
                code_context={
                    "potential_issues": ["null pointer"],
                    "language": "java",
                    "has_code_blocks": True,
                }
            )
            await logger.log(_make_decision(), context)
            await asyncio.sleep(0.2)
            record = store.create_audit_record.call_args[0][0]
            snapshot = record["context_snapshot"]
            assert snapshot["code_issues"] == ["null pointer"]
            assert snapshot["code_language"] == "java"
            assert snapshot["has_code_blocks"] is True
        finally:
            await logger.close()

    @pytest.mark.asyncio
    async def test_flush_waits_for_queue(self) -> None:
        store = AsyncMock()
        logger = DecisionAuditLogger(store_client=store)
        try:
            for i in range(5):
                await logger.log(_make_decision(confidence=0.5 + i * 0.1), _make_context())
            await asyncio.sleep(1.5)
            assert store.create_audit_record.call_count == 5
        finally:
            await logger.close()

    @pytest.mark.asyncio
    async def test_close_stops_worker(self) -> None:
        store = AsyncMock()
        logger = DecisionAuditLogger(store_client=store)
        await logger.log(_make_decision(), _make_context())
        await asyncio.sleep(0.2)
        await logger.close()
        assert logger._enabled is False
