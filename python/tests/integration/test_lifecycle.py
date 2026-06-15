"""Integration tests for AgentPool and AgentLifecycleManager."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from resolveagent.runtime.lifecycle import AgentLifecycleManager, AgentPool


class TestAgentPool:
    """Tests for AgentPool LRU eviction behavior."""

    @pytest.fixture
    def pool(self) -> AgentPool:
        return AgentPool(max_size=3)

    def test_put_and_get_basic(self, pool: AgentPool) -> None:
        agent = {"id": "a1"}
        pool.put("a1", agent)
        assert pool.get("a1") is agent
        assert pool.size == 1

    def test_get_returns_none_for_missing(self, pool: AgentPool) -> None:
        assert pool.get("nonexistent") is None

    def test_get_updates_lru_order(self, pool: AgentPool) -> None:
        pool.put("a1", "agent-1")
        pool.put("a2", "agent-2")
        pool.put("a3", "agent-3")

        pool.get("a1")

        pool.put("a4", "agent-4")
        assert pool.get("a1") is not None, "a1 was recently accessed, should not be evicted"
        assert pool.get("a2") is None, "a2 is LRU, should be evicted"

    def test_put_evicts_lru_at_capacity(self, pool: AgentPool) -> None:
        pool.put("a1", "agent-1")
        pool.put("a2", "agent-2")
        pool.put("a3", "agent-3")

        pool.put("a4", "agent-4")
        assert pool.get("a1") is None, "a1 is LRU, should be evicted"
        assert pool.size == 3

    def test_evicted_agent_cleanup_called(self, pool: AgentPool) -> None:
        agent = MagicMock()
        agent.cleanup = MagicMock()
        pool.put("a1", agent)
        pool.put("a2", "agent-2")
        pool.put("a3", "agent-3")

        pool.put("a4", "agent-4")
        agent.cleanup.assert_called_once()

    def test_evicted_agent_cleanup_failure_logged(self, pool: AgentPool) -> None:
        agent = MagicMock()
        agent.cleanup = MagicMock(side_effect=RuntimeError("cleanup failed"))
        pool.put("a1", agent)
        pool.put("a2", "agent-2")
        pool.put("a3", "agent-3")

        pool.put("a4", "agent-4")
        assert pool.get("a4") is not None, "eviction should succeed despite cleanup failure"

    def test_remove_existing_agent(self, pool: AgentPool) -> None:
        pool.put("a1", "agent-1")
        pool.remove("a1")
        assert pool.get("a1") is None
        assert pool.size == 0

    def test_remove_nonexistent_agent_no_error(self, pool: AgentPool) -> None:
        pool.remove("nonexistent")

    def test_size_property(self, pool: AgentPool) -> None:
        assert pool.size == 0
        pool.put("a1", "agent-1")
        assert pool.size == 1
        pool.put("a2", "agent-2")
        assert pool.size == 2

    def test_put_existing_key_updates_in_place(self, pool: AgentPool) -> None:
        pool.put("a1", "agent-1")
        pool.put("a1", "agent-1-updated")
        assert pool.get("a1") == "agent-1-updated"
        assert pool.size == 1


class TestAgentLifecycleManager:
    """Tests for AgentLifecycleManager async operations."""

    @pytest.fixture
    def manager(self) -> AgentLifecycleManager:
        return AgentLifecycleManager(pool_max_size=10)

    @pytest.mark.asyncio
    async def test_initialize_and_shutdown(self, manager: AgentLifecycleManager) -> None:
        await manager.initialize()
        await manager.shutdown()

    @pytest.mark.asyncio
    async def test_get_or_create_agent_creates_new(self, manager: AgentLifecycleManager) -> None:
        agent = await manager.get_or_create_agent("test-agent")
        assert agent is not None
        assert agent["id"] == "test-agent"

    @pytest.mark.asyncio
    async def test_get_or_create_agent_returns_cached(self, manager: AgentLifecycleManager) -> None:
        agent1 = await manager.get_or_create_agent("test-agent")
        agent2 = await manager.get_or_create_agent("test-agent")
        assert agent1 is agent2

    @pytest.mark.asyncio
    async def test_remove_agent(self, manager: AgentLifecycleManager) -> None:
        await manager.get_or_create_agent("test-agent")
        await manager.remove_agent("test-agent")
        assert manager.active_count == 0

    @pytest.mark.asyncio
    async def test_active_count_property(self, manager: AgentLifecycleManager) -> None:
        assert manager.active_count == 0
        await manager.get_or_create_agent("a1")
        await manager.get_or_create_agent("a2")
        assert manager.active_count == 2
