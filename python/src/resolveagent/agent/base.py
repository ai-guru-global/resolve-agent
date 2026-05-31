"""Base agent class extending AgentScope."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class BaseAgent:
    """Base agent for the ResolveAgent platform.

    Extends AgentScope's AgentBase with ResolveAgent-specific capabilities
    including skill integration, memory management, and telemetry.

    In production, this would extend agentscope.agents.AgentBase.
    """

    def __init__(
        self,
        name: str,
        model_id: str | None = None,
        system_prompt: str = "",
        **kwargs: Any,
    ) -> None:
        self.name = name
        self.model_id = model_id
        self.system_prompt = system_prompt
        self._config = kwargs
        self._memory: list[dict[str, Any]] = []

        logger.info("Agent initialized", extra={"agent_name": name, "model": model_id})

    async def reply(self, message: dict[str, Any]) -> dict[str, Any]:
        """Process a message and generate a reply.

        Args:
            message: Input message with 'role' and 'content' fields.

        Returns:
            Response message dict.
        """
        # NOTE: Full LLM integration requires AgentScope>=1.0 and a configured provider.
        #       This is a placeholder echo response for development/testing.
        return {
            "role": "assistant",
            "content": f"[{self.name}] Received: {message.get('content', '')}",
        }

    def add_memory(self, message: dict[str, Any]) -> None:
        """Add a message to agent memory."""
        self._memory.append(message)

    def get_memory(self, limit: int = 50) -> list[dict[str, Any]]:
        """Get recent memory entries."""
        return self._memory[-limit:]

    def reset(self) -> None:
        """Reset agent state."""
        self._memory.clear()
