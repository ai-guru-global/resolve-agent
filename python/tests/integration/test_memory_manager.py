"""Integration tests for MemoryManager."""

from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from resolveagent.agent.memory import MemoryManager


class TestMemoryManager:
    """Tests for synchronous MemoryManager operations."""

    @pytest.fixture
    def manager(self) -> MemoryManager:
        return MemoryManager(max_entries=5)

    def test_add_and_get_context(self, manager: MemoryManager) -> None:
        manager.add("user", "hello")
        manager.add("assistant", "hi there")
        ctx = manager.get_context()
        assert len(ctx) == 2
        assert ctx[0] == {"role": "user", "content": "hello"}
        assert ctx[1] == {"role": "assistant", "content": "hi there"}

    def test_add_evicts_oldest_over_max_entries(self, manager: MemoryManager) -> None:
        for i in range(10):
            manager.add("user", f"msg-{i}")
        assert manager.size == 5
        ctx = manager.get_context()
        assert ctx[0]["content"] == "msg-5", "oldest entries should be evicted"

    def test_get_context_with_limit(self, manager: MemoryManager) -> None:
        for i in range(5):
            manager.add("user", f"msg-{i}")
        ctx = manager.get_context(limit=2)
        assert len(ctx) == 2
        assert ctx[0]["content"] == "msg-3", "limit should return the most recent entries"

    def test_clear_empties_memory(self, manager: MemoryManager) -> None:
        manager.add("user", "hello")
        manager.clear()
        assert manager.size == 0
        assert manager.get_context() == []

    def test_size_property(self, manager: MemoryManager) -> None:
        assert manager.size == 0
        manager.add("user", "a")
        assert manager.size == 1

    def test_conversation_id_default_uuid(self) -> None:
        manager = MemoryManager()
        try:
            uuid.UUID(manager.conversation_id)
        except ValueError:
            pytest.fail("默认 conversation_id 应为有效 UUID")

    def test_conversation_id_explicit(self) -> None:
        manager = MemoryManager(conversation_id="my-session")
        assert manager.conversation_id == "my-session"


class TestMemoryManagerAsync:
    """Tests for async MemoryManager operations with persistence."""

    @pytest.fixture
    def mock_client(self) -> AsyncMock:
        return AsyncMock()

    @pytest.fixture
    def manager_with_client(self, mock_client: AsyncMock) -> MemoryManager:
        return MemoryManager(max_entries=10, memory_client=mock_client, agent_id="test-agent")

    @pytest.mark.asyncio
    async def test_add_async_persists_to_client(self, manager_with_client: MemoryManager, mock_client: AsyncMock) -> None:
        await manager_with_client.add_async("user", "hello")
        mock_client.add_message.assert_called_once()
        call_args = mock_client.add_message.call_args
        assert call_args[0][0] == manager_with_client.conversation_id
        msg = call_args[0][1]
        assert msg["role"] == "user"
        assert msg["content"] == "hello"
        assert msg["agent_id"] == "test-agent"

    @pytest.mark.asyncio
    async def test_add_async_client_failure_logs_warning(self) -> None:
        failing_client = AsyncMock()
        failing_client.add_message = AsyncMock(side_effect=ConnectionError("lost"))
        manager = MemoryManager(memory_client=failing_client)

        await manager.add_async("user", "hello")
        assert manager.size == 1, "entry should be added locally even if persistence fails"

    @pytest.mark.asyncio
    async def test_load_conversation_populates_entries(self, manager_with_client: MemoryManager, mock_client: AsyncMock) -> None:
        mock_messages = [
            MagicMock(role="user", content="msg-1", metadata={}, sequence_num=1),
            MagicMock(role="assistant", content="msg-2", metadata={}, sequence_num=2),
        ]
        mock_client.get_conversation = AsyncMock(return_value=mock_messages)

        await manager_with_client.load_conversation("session-123", limit=50)
        assert manager_with_client.size == 2
        assert manager_with_client.conversation_id == "session-123"
        ctx = manager_with_client.get_context()
        assert ctx[0]["content"] == "msg-1"

    @pytest.mark.asyncio
    async def test_load_conversation_without_client_noop(self) -> None:
        manager = MemoryManager()
        await manager.load_conversation("session-123")
        assert manager.size == 0
