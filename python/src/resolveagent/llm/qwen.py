"""Alibaba Qwen (Tongyi Qianwen) LLM provider."""

from __future__ import annotations

import logging
from typing import Any, AsyncIterator

from resolveagent.llm.provider import ChatMessage, ChatResponse, LLMProvider

logger = logging.getLogger(__name__)


class QwenProvider(LLMProvider):
    """LLM provider for Alibaba Qwen models.

    Supports: qwen-turbo, qwen-plus, qwen-max, qwen-long
    API: DashScope (compatible with OpenAI format)
    """

    DEFAULT_MODEL = "qwen-plus"
    BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"

    def __init__(self, api_key: str = "", base_url: str = "") -> None:
        self.api_key = api_key
        self.base_url = base_url or self.BASE_URL

    async def chat(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> ChatResponse:
        """Generate completion via Qwen API."""
        model = model or self.DEFAULT_MODEL
        logger.debug("Qwen chat", extra={"model": model, "messages": len(messages)})
        # TODO: Implement via httpx call to DashScope API
        return ChatResponse(
            content="[Qwen response placeholder]",
            model=model,
            usage={"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0},
        )

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Stream completion via Qwen API."""
        model = model or self.DEFAULT_MODEL
        # TODO: Implement streaming via httpx
        yield "[Qwen streaming placeholder]"
