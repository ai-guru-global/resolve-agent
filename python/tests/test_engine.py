"""Tests for the ExecutionEngine."""

from __future__ import annotations

import pytest

from resolveagent.runtime.engine import ExecutionEngine


@pytest.fixture
def engine() -> ExecutionEngine:
    """Create a fresh ExecutionEngine instance."""
    return ExecutionEngine()


class TestExecutionEngine:
    """Test suite for ExecutionEngine."""

    @pytest.mark.asyncio
    async def test_execute_yields_start_event(self, engine: ExecutionEngine) -> None:
        """Test that execute yields a start event."""
        chunks = []
        async for chunk in engine.execute(
            agent_id="test-agent",
            input_text="Hello",
            stream=False,
        ):
            chunks.append(chunk)

        assert len(chunks) > 0
        start_events = [c for c in chunks if c.get("type") == "event" and c.get("event", {}).get("type") == "execution.started"]
        assert len(start_events) == 1
        assert start_events[0]["event"]["data"]["agent_id"] == "test-agent"

    @pytest.mark.asyncio
    async def test_execute_creates_conversation(self, engine: ExecutionEngine) -> None:
        """Test that execute creates a conversation ID."""
        chunks = []
        async for chunk in engine.execute(
            agent_id="test-agent",
            input_text="Hello",
        ):
            chunks.append(chunk)

        # Check that at least one event contains a conversation_id
        start_event = next(
            (c for c in chunks if c.get("type") == "event" and c.get("event", {}).get("type") == "execution.started"),
            None,
        )
        assert start_event is not None
        assert "conversation_id" in start_event["event"]["data"]
        assert start_event["event"]["data"]["conversation_id"]

    @pytest.mark.asyncio
    async def test_conversation_history_preserved(self, engine: ExecutionEngine) -> None:
        """Test that conversation history is preserved across executions."""
        conversation_id = "test-conv-123"

        # First message
        async for _ in engine.execute(
            agent_id="test-agent",
            input_text="First message",
            conversation_id=conversation_id,
        ):
            pass

        # Second message with same conversation_id
        async for _ in engine.execute(
            agent_id="test-agent",
            input_text="Second message",
            conversation_id=conversation_id,
        ):
            pass

        history = engine.get_conversation_history(conversation_id)
        assert len(history) >= 2
        # First user message should be in history
        assert any(msg.get("content") == "First message" for msg in history)
        # Second user message should be in history
        assert any(msg.get("content") == "Second message" for msg in history)

    def test_clear_conversation(self, engine: ExecutionEngine) -> None:
        """Test clearing a conversation."""
        conversation_id = "test-conv-to-clear"
        # Manually add to conversations for testing
        engine._conversations[conversation_id] = [
            {"role": "user", "content": "test"},
        ]

        assert engine.clear_conversation(conversation_id) is True
        assert engine.get_conversation_history(conversation_id) == []
        assert engine.clear_conversation(conversation_id) is False

    def test_get_stats(self, engine: ExecutionEngine) -> None:
        """Test engine statistics."""
        stats = engine.get_stats()
        assert "execution_count" in stats
        assert "active_agents" in stats
        assert "active_conversations" in stats
        assert stats["execution_count"] == 0
        assert stats["active_agents"] == 0
        assert stats["active_conversations"] == 0
