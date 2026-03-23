"""Base LLM provider interface."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, AsyncIterator

from pydantic import BaseModel


class ChatMessage(BaseModel):
    """A chat message for LLM API calls."""

    role: str
    content: str


class ChatResponse(BaseModel):
    """Response from an LLM API call."""

    content: str
    model: str
    usage: dict[str, int] = {}
    finish_reason: str = "stop"


class LLMProvider(ABC):
    """Abstract base class for LLM providers.

    All LLM providers must implement this interface for
    both synchronous and streaming completions.
    """

    @abstractmethod
    async def chat(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> ChatResponse:
        """Generate a chat completion.

        Args:
            messages: Conversation messages.
            model: Model identifier (uses default if None).
            temperature: Sampling temperature.
            max_tokens: Maximum tokens to generate.

        Returns:
            ChatResponse with generated content.
        """
        ...

    @abstractmethod
    async def chat_stream(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Generate a streaming chat completion.

        Args:
            messages: Conversation messages.
            model: Model identifier.
            temperature: Sampling temperature.
            max_tokens: Maximum tokens to generate.

        Yields:
            Content chunks as they are generated.
        """
        ...
