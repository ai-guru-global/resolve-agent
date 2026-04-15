"""Memory store client for Go platform REST API."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from resolveagent.store.base_client import BaseStoreClient

logger = logging.getLogger(__name__)


@dataclass
class ShortTermMemoryInfo:
    """Short-term memory entry (conversation message)."""

    id: str
    agent_id: str
    conversation_id: str
    role: str
    content: str
    token_count: int = 0
    sequence_num: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class LongTermMemoryInfo:
    """Long-term memory entry (cross-session knowledge)."""

    id: str
    agent_id: str
    user_id: str = ""
    memory_type: str = "fact"
    content: str = ""
    importance: float = 0.5
    access_count: int = 0
    source_conversations: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class MemoryClient(BaseStoreClient):
    """Client for memory store operations.

    Supports both short-term (conversation history) and
    long-term (cross-session knowledge) memory.
    """

    # Short-term memory operations

    async def add_message(
        self, conversation_id: str, msg: dict[str, Any]
    ) -> dict[str, Any] | None:
        return await self._post(
            f"/api/v1/memory/conversations/{conversation_id}/messages", msg
        )

    async def get_conversation(
        self, conversation_id: str, limit: int = 100
    ) -> list[ShortTermMemoryInfo]:
        data = await self._get(
            f"/api/v1/memory/conversations/{conversation_id}",
            params={"limit": str(limit)},
        )
        if not data:
            return []
        return [
            ShortTermMemoryInfo(
                id=m.get("id", ""),
                agent_id=m.get("agent_id", ""),
                conversation_id=m.get("conversation_id", conversation_id),
                role=m.get("role", ""),
                content=m.get("content", ""),
                token_count=m.get("token_count", 0),
                sequence_num=m.get("sequence_num", 0),
                metadata=m.get("metadata", {}),
            )
            for m in data.get("messages", [])
        ]

    async def delete_conversation(self, conversation_id: str) -> dict[str, Any] | None:
        return await self._delete(f"/api/v1/memory/conversations/{conversation_id}")

    async def list_conversations(self, agent_id: str) -> list[str]:
        data = await self._get(f"/api/v1/memory/{agent_id}/conversations")
        if not data:
            return []
        return data.get("conversations", [])

    # Long-term memory operations

    async def store_long_term(
        self, memory: dict[str, Any]
    ) -> dict[str, Any] | None:
        return await self._post("/api/v1/memory/long-term", memory)

    async def get_long_term(self, memory_id: str) -> LongTermMemoryInfo | None:
        data = await self._get(f"/api/v1/memory/long-term/{memory_id}")
        if not data:
            return None
        return LongTermMemoryInfo(
            id=data.get("id", memory_id),
            agent_id=data.get("agent_id", ""),
            user_id=data.get("user_id", ""),
            memory_type=data.get("memory_type", "fact"),
            content=data.get("content", ""),
            importance=data.get("importance", 0.5),
            access_count=data.get("access_count", 0),
            source_conversations=data.get("source_conversations", []),
            metadata=data.get("metadata", {}),
        )

    async def search_long_term(
        self,
        agent_id: str,
        user_id: str = "",
        memory_type: str = "",
    ) -> list[LongTermMemoryInfo]:
        params: dict[str, str] = {}
        if user_id:
            params["user_id"] = user_id
        if memory_type:
            params["type"] = memory_type
        data = await self._get(f"/api/v1/memory/{agent_id}/long-term", params=params)
        if not data:
            return []
        return [
            LongTermMemoryInfo(
                id=m.get("id", ""),
                agent_id=m.get("agent_id", agent_id),
                user_id=m.get("user_id", ""),
                memory_type=m.get("memory_type", "fact"),
                content=m.get("content", ""),
                importance=m.get("importance", 0.5),
                access_count=m.get("access_count", 0),
                source_conversations=m.get("source_conversations", []),
                metadata=m.get("metadata", {}),
            )
            for m in data.get("memories", [])
        ]

    async def update_long_term(
        self, memory_id: str, memory: dict[str, Any]
    ) -> dict[str, Any] | None:
        return await self._put(f"/api/v1/memory/long-term/{memory_id}", memory)

    async def delete_long_term(self, memory_id: str) -> dict[str, Any] | None:
        return await self._delete(f"/api/v1/memory/long-term/{memory_id}")

    async def prune_expired(self) -> int:
        data = await self._post("/api/v1/memory/prune", {})
        if data:
            return data.get("pruned", 0)
        return 0
