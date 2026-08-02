"""Unit tests for hierarchical memory (memory.py)."""

from __future__ import annotations

import pytest

from resolveagent.memory import (
    HierarchicalMemory,
    MemoryEntry,
    WorkingMemory,
)


class TestWorkingMemory:
    """WorkingMemory rolling window behavior."""

    def test_add_and_get_recent(self) -> None:
        mem = WorkingMemory()
        mem.add("user", "hello")
        mem.add("assistant", "hi there")

        entries = mem.get_recent()
        assert len(entries) == 2
        assert entries[0].role == "user"
        assert entries[1].content == "hi there"

    def test_max_size_is_respected(self) -> None:
        """Regression: maxlen was hardcoded to 20 regardless of max_size."""
        mem = WorkingMemory(max_size=3)
        for i in range(10):
            mem.add("user", f"msg-{i}")

        assert mem.size == 3
        contents = [e.content for e in mem.get_recent()]
        assert contents == ["msg-7", "msg-8", "msg-9"]

    def test_importance_is_stored_on_entry(self) -> None:
        """Regression: importance used to be swallowed into metadata."""
        mem = WorkingMemory()
        mem.add("user", "critical issue", importance=0.9)
        mem.add("user", "small talk", importance=0.1)

        entries = mem.get_recent()
        assert entries[0].importance == 0.9
        assert entries[1].importance == 0.1

    def test_get_high_importance(self) -> None:
        mem = WorkingMemory()
        mem.add("user", "critical", importance=0.9)
        mem.add("user", "normal", importance=0.5)
        mem.add("assistant", "root cause found", importance=0.8)

        high = mem.get_high_importance(threshold=0.7)
        assert len(high) == 2
        assert all(e.importance >= 0.7 for e in high)

    def test_get_context_shape(self) -> None:
        mem = WorkingMemory()
        mem.add("user", "hello", source="test")

        ctx = mem.get_context()
        assert ctx[0]["role"] == "user"
        assert ctx[0]["content"] == "hello"
        assert "timestamp" in ctx[0]

    def test_get_recent_with_limit(self) -> None:
        mem = WorkingMemory()
        for i in range(5):
            mem.add("user", f"msg-{i}")

        assert len(mem.get_recent(limit=2)) == 2
        assert mem.get_recent(limit=2)[-1].content == "msg-4"

    def test_clear(self) -> None:
        mem = WorkingMemory()
        mem.add("user", "hello")
        mem.clear()
        assert mem.size == 0

    @pytest.mark.asyncio
    async def test_add_async(self) -> None:
        mem = WorkingMemory()
        await mem.add_async("user", "async msg", importance=0.8)

        entries = mem.get_recent()
        assert entries[0].content == "async msg"
        assert entries[0].importance == 0.8


class TestHierarchicalMemory:
    """HierarchicalMemory coordination logic (without external backends)."""

    def test_add_without_event_loop_does_not_raise(self) -> None:
        """Regression: add() with high importance used to call
        asyncio.create_task and crash in sync context."""
        mem = HierarchicalMemory(session_id="s1")
        mem._connected = True  # simulate connected state
        mem.add("user", "important finding", importance=0.9)

        assert mem.working_size == 1

    def test_importance_propagates_to_working_memory(self) -> None:
        mem = HierarchicalMemory(session_id="s1")
        mem.add("user", "root cause: OOM", importance=0.95)

        high = mem._working.get_high_importance(threshold=0.7)
        assert len(high) == 1
        assert high[0].content == "root cause: OOM"

    def test_working_size_configurable(self) -> None:
        mem = HierarchicalMemory(session_id="s1", working_size=2)
        for i in range(5):
            mem.add("user", f"msg-{i}")

        assert mem.working_size == 2

    def test_simple_embed_dimension_matches_milvus(self) -> None:
        """Regression: pseudo-embedding was 32-dim while the Milvus
        collection is created with dimension=1024."""
        mem = HierarchicalMemory(session_id="s1")
        vec = mem._simple_embed("query text")

        assert len(vec) == 1024
        assert all(0.0 <= v <= 1.0 for v in vec)

    def test_simple_embed_is_deterministic(self) -> None:
        mem = HierarchicalMemory(session_id="s1")
        assert mem._simple_embed("abc") == mem._simple_embed("abc")
        assert mem._simple_embed("abc") != mem._simple_embed("xyz")

    @pytest.mark.asyncio
    async def test_search_long_term_disconnected_returns_empty(self) -> None:
        mem = HierarchicalMemory(session_id="s1")
        assert await mem.search_long_term("anything") == []

    @pytest.mark.asyncio
    async def test_load_episodic_disconnected_returns_empty(self) -> None:
        mem = HierarchicalMemory(session_id="s1")
        assert await mem.load_episodic() == []


class TestMemoryEntry:
    def test_defaults(self) -> None:
        entry = MemoryEntry(role="user", content="hello")
        assert entry.importance == 0.5
        assert entry.metadata == {}
        assert entry.timestamp
