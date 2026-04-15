"""Agent memory management."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class MemoryEntry:
    """A single memory entry."""

    role: str
    content: str
    metadata: dict[str, Any] = field(default_factory=dict)
    timestamp: float = 0.0


class MemoryManager:
    """Manages agent conversation memory with windowing and summarization.

    Supports both short-term (conversation) and long-term (persistent) memory.
    When a MemoryClient is provided, messages are persisted to the Go platform.
    """

    def __init__(
        self,
        max_entries: int = 100,
        max_tokens: int = 4096,
        memory_client: Any | None = None,
        agent_id: str = "",
        conversation_id: str = "",
    ) -> None:
        self.max_entries = max_entries
        self.max_tokens = max_tokens
        self._entries: list[MemoryEntry] = []
        self._memory_client = memory_client
        self._agent_id = agent_id
        self._conversation_id = conversation_id or str(uuid.uuid4())
        self._sequence_num = 0

    def add(self, role: str, content: str, **metadata: Any) -> None:
        """Add a memory entry."""
        entry = MemoryEntry(role=role, content=content, metadata=metadata)
        self._entries.append(entry)
        self._sequence_num += 1

        # Evict oldest entries if over capacity
        if len(self._entries) > self.max_entries:
            self._entries = self._entries[-self.max_entries :]

    async def add_async(self, role: str, content: str, **metadata: Any) -> None:
        """Add a memory entry with optional persistence to Go platform.

        If a memory_client is configured, the message is also stored
        in the platform's memory store for cross-session persistence.
        """
        self.add(role, content, **metadata)

        if self._memory_client:
            try:
                await self._memory_client.add_message(
                    self._conversation_id,
                    {
                        "agent_id": self._agent_id,
                        "role": role,
                        "content": content,
                        "sequence_num": self._sequence_num,
                        "metadata": metadata,
                    },
                )
            except Exception as e:
                logger.warning("Failed to persist memory entry", extra={"error": str(e)})

    def get_context(self, limit: int | None = None) -> list[dict[str, str]]:
        """Get memory as a list of message dicts for LLM context."""
        entries = self._entries[-(limit or self.max_entries) :]
        return [{"role": e.role, "content": e.content} for e in entries]

    async def load_conversation(self, conversation_id: str, limit: int = 50) -> None:
        """Load conversation history from persistent storage.

        Args:
            conversation_id: The conversation to load.
            limit: Max messages to load.
        """
        if not self._memory_client:
            return

        self._conversation_id = conversation_id
        try:
            messages = await self._memory_client.get_conversation(conversation_id, limit)
            self._entries = [
                MemoryEntry(role=m.role, content=m.content, metadata=m.metadata)
                for m in messages
            ]
            self._sequence_num = max((m.sequence_num for m in messages), default=0)
            logger.debug(
                "Loaded conversation",
                extra={"conversation_id": conversation_id, "count": len(self._entries)},
            )
        except Exception as e:
            logger.warning("Failed to load conversation", extra={"error": str(e)})

    def clear(self) -> None:
        """Clear all memory."""
        self._entries.clear()

    @property
    def size(self) -> int:
        """Number of memory entries."""
        return len(self._entries)

    @property
    def conversation_id(self) -> str:
        """Current conversation ID."""
        return self._conversation_id
