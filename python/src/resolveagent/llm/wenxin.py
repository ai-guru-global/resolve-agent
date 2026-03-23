"""Baidu Wenxin (ERNIE Bot) LLM provider."""

from __future__ import annotations

import logging
from typing import Any, AsyncIterator

from resolveagent.llm.provider import ChatMessage, ChatResponse, LLMProvider

logger = logging.getLogger(__name__)


class WenxinProvider(LLMProvider):
    """LLM provider for Baidu Wenxin (ERNIE Bot) models.

    Supports: ernie-4.0, ernie-3.5-turbo, ernie-speed
    """

    DEFAULT_MODEL = "ernie-4.0"

    def __init__(self, api_key: str = "", secret_key: str = "") -> None:
        self.api_key = api_key
        self.secret_key = secret_key

    async def chat(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> ChatResponse:
        """Generate completion via Wenxin API."""
        model = model or self.DEFAULT_MODEL
        logger.debug("Wenxin chat", extra={"model": model})
        # TODO: Implement via Baidu Qianfan API
        return ChatResponse(
            content="[Wenxin response placeholder]",
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
        """Stream completion via Wenxin API."""
        yield "[Wenxin streaming placeholder]"
