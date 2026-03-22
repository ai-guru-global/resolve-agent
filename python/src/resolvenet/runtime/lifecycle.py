"""Agent pool and lifecycle management."""

from __future__ import annotations

import logging
from collections import OrderedDict
from typing import Any

logger = logging.getLogger(__name__)


class AgentPool:
    """Manages agent instances with LRU eviction.

    Agents are lazily instantiated when first requested and cached.
    When the pool reaches capacity, the least recently used agent is evicted.
    """

    def __init__(self, max_size: int = 100) -> None:
        self.max_size = max_size
        self._pool: OrderedDict[str, Any] = OrderedDict()

    def get(self, agent_id: str) -> Any | None:
        """Get an agent from the pool, updating LRU order."""
        if agent_id in self._pool:
            self._pool.move_to_end(agent_id)
            return self._pool[agent_id]
        return None

    def put(self, agent_id: str, agent: Any) -> None:
        """Add an agent to the pool, evicting LRU if at capacity."""
        if agent_id in self._pool:
            self._pool.move_to_end(agent_id)
            self._pool[agent_id] = agent
            return

        if len(self._pool) >= self.max_size:
            evicted_id, evicted_agent = self._pool.popitem(last=False)
            logger.info("Evicted agent from pool", extra={"agent_id": evicted_id})
            # TODO: Call cleanup on evicted agent

        self._pool[agent_id] = agent

    def remove(self, agent_id: str) -> None:
        """Remove an agent from the pool."""
        self._pool.pop(agent_id, None)

    @property
    def size(self) -> int:
        """Current pool size."""
        return len(self._pool)
