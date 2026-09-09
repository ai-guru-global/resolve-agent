"""Unit tests for hierarchical memory (memory.py)."""

from __future__ import annotations

import asyncio
import sys
import types

import pytest

from resolveagent.memory import (
    EpisodicMemoryClient,
    HierarchicalMemory,
    LongTermMemoryClient,
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


class _FakeRedis:
    """In-memory stand-in for redis.asyncio client (decode_responses=True)."""

    def __init__(self) -> None:
        self.hashes: dict[str, dict[str, str]] = {}
        self.deleted_fields: list[tuple] = []
        self.expirations: dict[str, int] = {}

    async def hset(self, key, mapping) -> None:
        self.hashes.setdefault(key, {}).update(mapping)

    async def hdel(self, key, *fields) -> None:
        for f in fields:
            self.hashes.get(key, {}).pop(f, None)
        self.deleted_fields.append((key, *fields))

    async def hgetall(self, key) -> dict[str, str]:
        return dict(self.hashes.get(key, {}))

    async def expire(self, key, ttl) -> None:
        self.expirations[key] = ttl

    async def delete(self, key) -> None:
        self.hashes.pop(key, None)


def _episodic_with_fake(fake: _FakeRedis, **kwargs) -> EpisodicMemoryClient:
    client = EpisodicMemoryClient(**kwargs)
    client._client = fake
    client._connected = True
    return client


class TestEpisodicMemory:
    """EpisodicMemoryClient store/load behavior (fake Redis)."""

    @pytest.mark.asyncio
    async def test_compress_store_removes_stale_entries_and_sets_ttl(self) -> None:
        """Regression: the compress branch left a stale "entries" field
        behind, and load() preferred it over the fresh summary."""
        fake = _FakeRedis()
        client = _episodic_with_fake(fake, ttl=3600)
        key = "session:s1"
        fake.hashes[key] = {"entries": '[{"role": "user", "content": "old"}]'}

        entries = [MemoryEntry(role="user", content=f"m{i}") for i in range(15)]
        await client.store("s1", entries, compress=True)

        assert (key, "entries") in fake.deleted_fields
        assert "entries" not in fake.hashes[key]
        assert "summary" in fake.hashes[key]
        assert fake.expirations[key] == 3600

    @pytest.mark.asyncio
    async def test_raw_store_sets_ttl(self) -> None:
        fake = _FakeRedis()
        client = _episodic_with_fake(fake, ttl=123)
        await client.store("s1", [MemoryEntry(role="user", content="hi")], compress=False)

        assert "entries" in fake.hashes["session:s1"]
        assert fake.expirations["session:s1"] == 123

    @pytest.mark.asyncio
    async def test_default_ttl_is_seven_days(self) -> None:
        fake = _FakeRedis()
        client = _episodic_with_fake(fake)
        await client.store("s1", [MemoryEntry(role="user", content="hi")], compress=False)
        assert fake.expirations["session:s1"] == 7 * 24 * 3600

    @pytest.mark.asyncio
    async def test_load_falls_back_to_summary_when_entries_absent(self) -> None:
        fake = _FakeRedis()
        client = _episodic_with_fake(fake)
        fake.hashes["session:s1"] = {"summary": "sum-text", "entry_count": "12"}

        loaded = await client.load("s1")
        assert loaded == [{"role": "system", "content": "sum-text", "type": "summary"}]

    @pytest.mark.asyncio
    async def test_load_prefers_entries_when_present(self) -> None:
        fake = _FakeRedis()
        client = _episodic_with_fake(fake)
        fake.hashes["session:s1"] = {
            "entries": '[{"role": "user", "content": "fresh"}]',
            "summary": "stale-summary",
        }

        loaded = await client.load("s1")
        assert loaded == [{"role": "user", "content": "fresh"}]


class TestLongTermMemory:
    """LongTermMemoryClient Milvus interactions (fake pymilvus)."""

    @pytest.mark.asyncio
    async def test_search_reads_distance_key(self) -> None:
        """Regression: pymilvus hits carry "distance", not "score";
        the KeyError was swallowed and search always returned []."""

        class _FakeMilvus:
            def search(self, **kwargs):
                return [[{"id": "m1", "distance": 0.42, "entity": {"text": "t", "importance": 0.9, "timestamp": "ts"}}]]

        client = LongTermMemoryClient()
        client._client = _FakeMilvus()
        client._connected = True

        results = await client.search([0.1] * 4, top_k=1)
        assert len(results) == 1
        assert results[0]["score"] == 0.42
        assert results[0]["text"] == "t"

    @pytest.mark.asyncio
    async def test_connect_creates_string_primary_key_collection(self, monkeypatch) -> None:
        """Regression: quick create_collection defaults to an INT64 primary
        key, so inserting string UUIDs always failed."""
        created: dict = {}

        class _FakeMilvusClient:
            def __init__(self, uri: str) -> None:
                pass

            def has_collection(self, name: str) -> bool:
                return False

            def create_collection(self, **kwargs) -> None:
                created.update(kwargs)

        fake_module = types.ModuleType("pymilvus")
        fake_module.MilvusClient = _FakeMilvusClient
        monkeypatch.setitem(sys.modules, "pymilvus", fake_module)

        client = LongTermMemoryClient()
        await client.connect()

        assert client._connected
        assert created["id_type"] == "string"
        assert created["max_length"] == 64
        assert created["dimension"] == 1024


class TestPendingTasks:
    @pytest.mark.asyncio
    async def test_add_tracks_and_cleans_pending_task(self) -> None:
        """Regression: create_task without a strong reference could be
        garbage-collected before completion."""
        mem = HierarchicalMemory(session_id="s1")
        mem._connected = True
        mem.add("user", "important finding", importance=0.9)

        tasks = set(mem._pending_tasks)
        assert len(tasks) == 1

        await asyncio.gather(*tasks)
        await asyncio.sleep(0)  # let done callbacks run
        assert not mem._pending_tasks
