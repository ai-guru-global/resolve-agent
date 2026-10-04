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
        llm_provider: Any | None = None,
        **kwargs: Any,
    ) -> None:
        self.name = name
        self.model_id = model_id
        self.system_prompt = system_prompt
        self._llm_provider = llm_provider
        self._config = kwargs
        self._memory: list[dict[str, Any]] = []

        logger.info("Agent initialized", extra={"agent_name": name, "model": model_id})

    async def reply(self, message: dict[str, Any]) -> dict[str, Any]:
        """Process a message and generate a reply.

        With an injected ``llm_provider`` the reply comes from a real chat
        completion; without one the response is an explicitly labelled echo
        so callers can tell the difference.
        """
        if self._llm_provider is None:
            return {
                "role": "assistant",
                "content": (f"[{self.name}] [echo: no LLM provider configured] {message.get('content', '')}"),
            }

        from resolveagent.llm.provider import ChatMessage

        response = await self._llm_provider.chat(
            messages=[
                ChatMessage(
                    role=message.get("role", "user"),
                    content=str(message.get("content", "")),
                )
            ],
            model=self.model_id,
        )
        return {"role": "assistant", "content": response.content}

    def add_memory(self, message: dict[str, Any]) -> None:
        """Add a message to agent memory."""
        self._memory.append(message)

    def get_memory(self, limit: int = 50) -> list[dict[str, Any]]:
        """Get recent memory entries."""
        return self._memory[-limit:]

    def reset(self) -> None:
        """Reset agent state."""
        self._memory.clear()
