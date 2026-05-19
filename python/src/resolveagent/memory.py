"""Hierarchical Memory - 三层记忆架构实现.

Working Memory (in-process) - Rolling window, 最近 N 条
Episodic Memory (Redis) - 按 session 压缩存储, semantic summary
Long-term Memory (RAG Vector DB) - 跨 session 知识沉淀
"""

from __future__ import annotations

import asyncio
import logging
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class MemoryEntry:
    """单个记忆条目."""

    role: str
    content: str
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    importance: float = 0.5  # 0.0 - 1.0, 只有 > 0.7 才写入 long-term
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkingMemory:
    """Working Memory - Rolling window, 最近 N 条, 实时访问.

    特性:
    - 内存中, 快速访问
    - Rolling window 策略
    - 支持异步操作
    """

    max_size: int = 20

    _entries: deque[MemoryEntry] = field(default_factory=lambda: deque(maxlen=20))
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    def add(self, role: str, content: str, **metadata: Any) -> None:
        """添加记忆条目.

        Args:
            role: 角色 (user/assistant/system)
            content: 内容
            **metadata: 额外元数据
        """
        entry = MemoryEntry(
            role=role,
            content=content,
            timestamp=datetime.now().isoformat(),
            metadata=metadata,
        )
        self._entries.append(entry)

    async def add_async(self, role: str, content: str, **metadata: Any) -> None:
        """异步添加记忆条目."""
        async with self._lock:
            self.add(role, content, **metadata)

    def get_recent(self, limit: int | None = None) -> list[MemoryEntry]:
        """获取最近的记忆.

        Args:
            limit: 限制数量, None 表示全部

        Returns:
            记忆条目列表
        """
        entries = list(self._entries)
        if limit:
            return entries[-limit:]
        return entries

    def get_context(self, limit: int | None = None) -> list[dict[str, Any]]:
        """获取上下文字典列表.

        Args:
            limit: 限制数量

        Returns:
            [{role, content}, ...]
        """
        entries = self.get_recent(limit)
        return [
            {"role": e.role, "content": e.content, "timestamp": e.timestamp}
            for e in entries
        ]

    def clear(self) -> None:
        """清空所有记忆."""
        self._entries.clear()

    @property
    def size(self) -> int:
        """当前记忆数量."""
        return len(self._entries)

    def get_high_importance(self, threshold: float = 0.7) -> list[MemoryEntry]:
        """获取高重要性记忆 (用于 long-term 沉淀).

        Args:
            threshold: 重要性阈值

        Returns:
            高重要性条目列表
        """
        return [e for e in self._entries if e.importance >= threshold]


@dataclass
class EpisodicMemoryClient:
    """Episodic Memory Client - Redis-backed session memory.

    特性:
    - Redis 存储, 支持跨进程
    - Semantic summary 压缩
    - 按 session 组织
    """

    def __init__(
        self,
        redis_url: str = "redis://localhost:6379",
        session_prefix: str = "session:",
        max_session_entries: int = 100,
    ) -> None:
        self._redis_url = redis_url
        self._session_prefix = session_prefix
        self._max_session_entries = max_session_entries
        self._client: Any | None = None
        self._connected = False

    async def connect(self) -> None:
        """连接 Redis."""
        try:
            import redis.asyncio as redis

            self._client = redis.from_url(self._redis_url)
            await self._client.ping()
            self._connected = True
            logger.info("Episodic memory connected to Redis", extra={"url": self._redis_url})
        except Exception as e:
            logger.warning("Failed to connect to Redis for episodic memory: %s", e)
            self._connected = False

    async def close(self) -> None:
        """关闭连接."""
        if self._client:
            await self._client.close()
            self._connected = False

    def _session_key(self, session_id: str) -> str:
        """生成 session key."""
        return f"{self._session_prefix}{session_id}"

    async def store(
        self,
        session_id: str,
        entries: list[MemoryEntry],
        compress: bool = True,
    ) -> None:
        """存储 session 记忆.

        Args:
            session_id: Session ID
            entries: 记忆条目列表
            compress: 是否进行语义压缩
        """
        if not self._connected or not self._client:
            logger.warning("Redis not connected, skipping episodic store")
            return

        key = self._session_key(session_id)

        # Semantic summary if requested
        if compress and len(entries) > 10:
            summarized = self._semantic_summary(entries)
            await self._client.hset(
                key,
                mapping={
                    "summary": summarized,
                    "entry_count": len(entries),
                    "last_updated": datetime.now().isoformat(),
                },
            )
        else:
            # Store raw entries
            entry_data = [
                {
                    "role": e.role,
                    "content": e.content,
                    "timestamp": e.timestamp,
                    "importance": e.importance,
                }
                for e in entries[-self._max_session_entries:]
            ]
            await self._client.hset(
                key,
                mapping={
                    "entries": str(entry_data),
                    "entry_count": len(entry_data),
                    "last_updated": datetime.now().isoformat(),
                },
            )

    def _semantic_summary(self, entries: list[MemoryEntry]) -> str:
        """简单语义压缩 - 提取关键信息.

        Args:
            entries: 记忆条目列表

        Returns:
            压缩后的摘要
        """
        # 简单实现: 提取最近 5 条和所有高重要性条目
        recent = entries[-5:]
        high_imp = [e for e in entries if e.importance >= 0.7]

        all_repr = []
        for e in high_imp + recent:
            all_repr.append(f"[{e.role}]: {e.content[:100]}...")

        return "|".join(all_repr)[:500]  # 限制长度

    async def load(self, session_id: str) -> list[dict[str, Any]] | None:
        """加载 session 记忆.

        Args:
            session_id: Session ID

        Returns:
            记忆条目列表或 None
        """
        if not self._connected or not self._client:
            return None

        key = self._session_key(session_id)
        data = await self._client.hgetall(key)

        if not data:
            return None

        # Try to load entries
        entries_str = data.get("entries", "[]")
        try:
            import ast

            return ast.literal_eval(entries_str)
        except Exception:
            # Fallback to summary
            return [{"role": "system", "content": data.get("summary", ""), "type": "summary"}]

    async def clear_session(self, session_id: str) -> None:
        """清除 session 记忆."""
        if self._connected and self._client:
            key = self._session_key(session_id)
            await self._client.delete(key)


@dataclass
class LongTermMemoryClient:
    """Long-term Memory Client - RAG Vector DB 存储.

    特性:
    - 跨 session 知识沉淀
    - 只有 importance > threshold 才写入
    - Semantic search
    """

    def __init__(
        self,
        vector_store_url: str = "http://localhost:19530",
        collection_name: str = "long_term_memory",
        importance_threshold: float = 0.7,
    ) -> None:
        self._vector_store_url = vector_store_url
        self._collection_name = collection_name
        self._importance_threshold = importance_threshold
        self._client: Any | None = None
        self._connected = False

    async def connect(self) -> None:
        """连接向量存储."""
        try:
            from pymilvus import MilvusClient

            self._client = MilvusClient(uri=self._vector_store_url)
            # Ensure collection exists
            if not self._client.has_collection(self._collection_name):
                self._client.create_collection(
                    collection_name=self._collection_name,
                    dimension=1024,  # Embedding dimension
                    metric_type="COSINE",
                )
            self._connected = True
            logger.info(
                "Long-term memory connected",
                extra={"url": self._vector_store_url, "collection": self._collection_name},
            )
        except Exception as e:
            logger.warning("Failed to connect to Milvus for long-term memory: %s", e)
            self._connected = False

    async def close(self) -> None:
        """关闭连接."""
        self._connected = False

    async def store(self, entry: MemoryEntry, embedding: list[float]) -> str | None:
        """存储长期记忆.

        Args:
            entry: 记忆条目
            embedding: 嵌入向量

        Returns:
            记忆 ID 或 None
        """
        if not self._connected or not self._client:
            return None

        if entry.importance < self._importance_threshold:
            return None

        try:
            import uuid

            memory_id = str(uuid.uuid4())
            self._client.insert(
                collection_name=self._collection_name,
                data=[
                    {
                        "id": memory_id,
                        "text": f"[{entry.role}] {entry.content}",
                        "importance": entry.importance,
                        "timestamp": entry.timestamp,
                        "metadata": str(entry.metadata),
                        "vector": embedding,
                    }
                ],
            )
            return memory_id
        except Exception as e:
            logger.error("Failed to store long-term memory: %s", e)
            return None

    async def search(
        self,
        query_embedding: list[float],
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        """搜索长期记忆.

        Args:
            query_embedding: 查询嵌入
            top_k: 返回数量

        Returns:
            记忆列表
        """
        if not self._connected or not self._client:
            return []

        try:
            results = self._client.search(
                collection_name=self._collection_name,
                data=[query_embedding],
                limit=top_k,
                output_fields=["id", "text", "importance", "timestamp"],
            )

            return [
                {
                    "id": r["id"],
                    "text": r["entity"].get("text", ""),
                    "importance": r["entity"].get("importance", 0.5),
                    "timestamp": r["entity"].get("timestamp", ""),
                    "score": r["score"],
                }
                for r in results[0]
            ]
        except Exception as e:
            logger.error("Failed to search long-term memory: %s", e)
            return []


class HierarchicalMemory:
    """分层记忆管理器.

    协调三层记忆:
    1. Working Memory - 最近 20 条, 实时访问
    2. Episodic Memory - Session 级别, Redis 存储
    3. Long-term Memory - 跨 Session, RAG 向量存储

    Example:
        >>> memory = HierarchicalMemory()
        >>> memory.add("user", "我想要部署到 k8s")
        >>> memory.add("assistant", "好的, 请提供配置文件...")
        >>> recent = memory.get_recent(10)  # 来自 Working Memory
        >>> historical = await memory.search("部署")  # 搜索 Long-term Memory
    """

    def __init__(
        self,
        session_id: str,
        working_size: int = 20,
        episodic_client: EpisodicMemoryClient | None = None,
        long_term_client: LongTermMemoryClient | None = None,
    ) -> None:
        self._session_id = session_id
        self._working = WorkingMemory(max_size=working_size)
        self._episodic = episodic_client or EpisodicMemoryClient()
        self._long_term = long_term_client or LongTermMemoryClient()
        self._connected = False

    async def connect(self) -> None:
        """连接所有记忆存储."""
        await self._episodic.connect()
        await self._long_term.connect()
        self._connected = True

    async def close(self) -> None:
        """关闭所有连接."""
        await self._episodic.close()
        await self._long_term.close()
        self._connected = False

    def add(
        self,
        role: str,
        content: str,
        importance: float = 0.5,
        **metadata: Any,
    ) -> None:
        """添加记忆到 Working Memory.

        Args:
            role: 角色
            content: 内容
            importance: 重要性 (用于判断是否沉淀到 long-term)
            **metadata: 额外元数据
        """
        self._working.add(role, content, importance=importance, **metadata)

        # 如果重要性足够, 可以选择立即沉淀到 episodic
        if importance >= 0.7 and self._connected:
            asyncio.create_task(self._persist_to_episodic())

    async def _persist_to_episodic(self) -> None:
        """异步持久化到 Episodic Memory."""
        try:
            entries = self._working.get_recent()
            await self._episodic.store(self._session_id, entries, compress=True)
        except Exception as e:
            logger.error("Failed to persist to episodic memory: %s", e)

    def get_recent(self, limit: int | None = None) -> list[dict[str, Any]]:
        """获取最近记忆 (来自 Working Memory).

        Args:
            limit: 限制数量

        Returns:
            记忆列表
        """
        return self._working.get_context(limit=limit)

    async def load_episodic(self) -> list[dict[str, Any]]:
        """加载 Episodic Memory 中的记忆.

        Returns:
            历史记忆列表
        """
        if not self._connected:
            return []
        return await self._episodic.load(self._session_id) or []

    async def search_long_term(self, query: str, top_k: int = 5) -> list[dict[str, Any]]:
        """搜索长期记忆.

        Args:
            query: 查询文本
            top_k: 返回数量

        Returns:
            相关记忆列表
        """
        if not self._connected:
            return []

        # 生成查询嵌入 (简化版本, 实际应该用 embedding model)
        embedding = self._simple_embed(query)

        return await self._long_term.search(embedding, top_k=top_k)

    def _simple_embed(self, text: str) -> list[float]:
        """简单的文本嵌入 (用于演示).

        实际应该使用专业的 embedding model (e.g., bge-large-zh).

        Args:
            text: 输入文本

        Returns:
            嵌入向量
        """
        # 简化实现: 基于文本长度的伪嵌入
        import hashlib

        h = hashlib.sha256(text.encode()).digest()
        return [float(b) / 255.0 for b in h[:32]][:1024]

    async def promote_high_importance(self, embedding_model: str = "bge-large-zh") -> int:
        """将高重要性记忆提升到 Long-term Memory.

        Args:
            embedding_model: 嵌入模型名称

        Returns:
            提升的记忆数量
        """
        high_imp = self._working.get_high_importance(threshold=0.7)
        promoted = 0

        for entry in high_imp:
            embedding = self._simple_embed(entry.content)
            memory_id = await self._long_term.store(entry, embedding)
            if memory_id:
                promoted += 1

        return promoted

    @property
    def session_id(self) -> str:
        """获取 session ID."""
        return self._session_id

    @property
    def working_size(self) -> int:
        """获取 Working Memory 大小."""
        return self._working.size
