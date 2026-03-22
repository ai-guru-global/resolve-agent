"""Agent memory management."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


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
    """

    def __init__(self, max_entries: int = 100, max_tokens: int = 4096) -> None:
        self.max_entries = max_entries
        self.max_tokens = max_tokens
        self._entries: list[MemoryEntry] = []

    def add(self, role: str, content: str, **metadata: Any) -> None:
        """Add a memory entry."""
        entry = MemoryEntry(role=role, content=content, metadata=metadata)
        self._entries.append(entry)

        # Evict oldest entries if over capacity
        if len(self._entries) > self.max_entries:
            self._entries = self._entries[-self.max_entries :]

    def get_context(self, limit: int | None = None) -> list[dict[str, str]]:
        """Get memory as a list of message dicts for LLM context."""
        entries = self._entries[-(limit or self.max_entries) :]
        return [{"role": e.role, "content": e.content} for e in entries]

    def clear(self) -> None:
        """Clear all memory."""
        self._entries.clear()

    @property
    def size(self) -> int:
        """Number of memory entries."""
        return len(self._entries)
