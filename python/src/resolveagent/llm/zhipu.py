"""Zhipu GLM (ChatGLM) LLM provider."""

from __future__ import annotations

import logging
from typing import Any, AsyncIterator

from resolveagent.llm.provider import ChatMessage, ChatResponse, LLMProvider

logger = logging.getLogger(__name__)


class ZhipuProvider(LLMProvider):
    """LLM provider for Zhipu AI GLM models.

    Supports: glm-4, glm-4-flash, glm-3-turbo
    """

    DEFAULT_MODEL = "glm-4"

    def __init__(self, api_key: str = "") -> None:
        self.api_key = api_key

    async def chat(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> ChatResponse:
        """Generate completion via Zhipu API."""
        model = model or self.DEFAULT_MODEL
        logger.debug("Zhipu chat", extra={"model": model})
        # TODO: Implement via Zhipu AI API
        return ChatResponse(
            content="[Zhipu GLM response placeholder]",
            model=model,
        )

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Stream completion via Zhipu API."""
        yield "[Zhipu GLM streaming placeholder]"
