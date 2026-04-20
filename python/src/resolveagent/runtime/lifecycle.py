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


class AgentLifecycleManager:
    """Manages agent lifecycle: creation, warm-up, health checks, and teardown."""

    def __init__(self, pool_max_size: int = 100) -> None:
        self.pool = AgentPool(max_size=pool_max_size)

    async def initialize(self) -> None:
        """Initialize the lifecycle manager."""
        logger.info("AgentLifecycleManager initialized")

    async def shutdown(self) -> None:
        """Shutdown the lifecycle manager and cleanup all agents."""
        logger.info("AgentLifecycleManager shutting down")

    async def get_or_create_agent(self, agent_id: str, agent_config: dict[str, Any] | None = None) -> Any:
        """Get an existing agent or create a new one."""
        agent = self.pool.get(agent_id)
        if agent is not None:
            return agent
        # TODO: Create agent from config via AgentScope
        logger.info("Creating new agent", extra={"agent_id": agent_id})
        agent = {"id": agent_id, "config": agent_config or {}}
        self.pool.put(agent_id, agent)
        return agent

    async def remove_agent(self, agent_id: str) -> None:
        """Remove and cleanup an agent."""
        self.pool.remove(agent_id)
        logger.info("Removed agent", extra={"agent_id": agent_id})

    @property
    def active_count(self) -> int:
        """Number of active agents."""
        return self.pool.size
