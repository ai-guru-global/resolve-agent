"""Generic OpenAI-compatible LLM provider."""

from __future__ import annotations

import logging
from typing import Any, AsyncIterator

from resolveagent.llm.provider import ChatMessage, ChatResponse, LLMProvider

logger = logging.getLogger(__name__)


class OpenAICompatProvider(LLMProvider):
    """LLM provider for any OpenAI-compatible API.

    Works with: vLLM, Ollama, LM Studio, LocalAI, and any service
    that implements the OpenAI chat completions API.
    """

    def __init__(
        self,
        api_key: str = "",
        base_url: str = "http://localhost:11434/v1",
        default_model: str = "default",
    ) -> None:
        self.api_key = api_key
        self.base_url = base_url
        self.default_model = default_model

    async def chat(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> ChatResponse:
        """Generate completion via OpenAI-compatible API."""
        model = model or self.default_model
        logger.debug("OpenAI-compat chat", extra={"model": model, "base_url": self.base_url})
        # TODO: Implement via httpx
        return ChatResponse(
            content="[OpenAI-compatible response placeholder]",
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
        """Stream completion via OpenAI-compatible API."""
        yield "[OpenAI-compatible streaming placeholder]"
