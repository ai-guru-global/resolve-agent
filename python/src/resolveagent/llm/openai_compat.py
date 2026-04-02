"""Generic OpenAI-compatible LLM provider.

Works with: vLLM, Ollama, LM Studio, LocalAI, and any service
that implements the OpenAI chat completions API.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, AsyncIterator

import httpx

from resolveagent.llm.provider import ChatMessage, ChatResponse, LLMProvider

logger = logging.getLogger(__name__)


class OpenAICompatProvider(LLMProvider):
    """LLM provider for any OpenAI-compatible API.

    Works with: vLLM, Ollama, LM Studio, LocalAI, and any service
    that implements the OpenAI chat completions API.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = "http://localhost:11434/v1",
        default_model: str = "default",
    ) -> None:
        """Initialize OpenAI-compatible provider.

        Args:
            api_key: API key (optional for local services).
            base_url: Base URL for the API.
            default_model: Default model name.
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY", "")
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model

    async def chat(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> ChatResponse:
        """Generate completion via OpenAI-compatible API.

        Args:
            messages: List of chat messages.
            model: Model identifier.
            temperature: Sampling temperature.
            max_tokens: Maximum tokens to generate.
            **kwargs: Additional parameters.

        Returns:
            ChatResponse with generated content.
        """
        model = model or self.default_model
        logger.debug(
            "OpenAI-compat chat",
            extra={"model": model, "base_url": self.base_url, "messages": len(messages)},
        )

        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        # Convert messages to OpenAI format
        openai_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]

        payload = {
            "model": model,
            "messages": openai_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
        }
        payload.update(kwargs)

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()

                # Parse OpenAI-compatible response
                choice = data.get("choices", [{}])[0]
                message = choice.get("message", {})
                content = message.get("content", "")
                finish_reason = choice.get("finish_reason", "stop")

                usage = data.get("usage", {})

                logger.debug(
                    "OpenAI-compat chat response",
                    extra={
                        "model": data.get("model", model),
                        "usage": usage,
                        "finish_reason": finish_reason,
                    },
                )

                return ChatResponse(
                    content=content,
                    model=data.get("model", model),
                    usage={
                        "prompt_tokens": usage.get("prompt_tokens", 0),
                        "completion_tokens": usage.get("completion_tokens", 0),
                        "total_tokens": usage.get("total_tokens", 0),
                    },
                    finish_reason=finish_reason,
                )

        except httpx.HTTPStatusError as e:
            logger.error(
                "OpenAI-compat API HTTP error",
                extra={"status": e.response.status_code, "response": e.response.text},
            )
            raise RuntimeError(
                f"OpenAI-compat API error: {e.response.status_code} - {e.response.text}"
            )
        except Exception as e:
            logger.error("OpenAI-compat API error", extra={"error": str(e)})
            raise RuntimeError(f"OpenAI-compat API call failed: {e}")

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Stream completion via OpenAI-compatible API.

        Args:
            messages: List of chat messages.
            model: Model identifier.
            temperature: Sampling temperature.
            max_tokens: Maximum tokens to generate.
            **kwargs: Additional parameters.

        Yields:
            Content chunks as they are generated.
        """
        model = model or self.default_model
        logger.debug("OpenAI-compat streaming chat", extra={"model": model, "base_url": self.base_url})

        headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        # Convert messages
        openai_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]

        payload = {
            "model": model,
            "messages": openai_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }
        payload.update(kwargs)

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                ) as response:
                    response.raise_for_status()

                    async for line in response.aiter_lines():
                        line = line.strip()
                        if not line or line.startswith(":"):
                            continue

                        if line.startswith("data: "):
                            data_str = line[6:]

                            if data_str == "[DONE]":
                                break

                            try:
                                data = json.loads(data_str)
                                choice = data.get("choices", [{}])[0]
                                delta = choice.get("delta", {})
                                content = delta.get("content", "")

                                if content:
                                    yield content

                            except json.JSONDecodeError:
                                logger.warning(f"Failed to parse SSE data: {data_str}")
                                continue

        except httpx.HTTPStatusError as e:
            logger.error(
                "OpenAI-compat streaming API HTTP error",
                extra={"status": e.response.status_code},
            )
            raise RuntimeError(f"OpenAI-compat streaming API error: {e.response.status_code}")
        except Exception as e:
            logger.error("OpenAI-compat streaming API error", extra={"error": str(e)})
            raise RuntimeError(f"OpenAI-compat streaming API call failed: {e}")


class OpenAICompatProviderError(Exception):
    """Exception raised for OpenAI-compat provider errors."""

    pass


# Factory functions for common providers

def create_ollama_provider(
    base_url: str = "http://localhost:11434/v1",
    model: str = "llama2",
) -> OpenAICompatProvider:
    """Create a provider for Ollama.

    Args:
        base_url: Ollama API URL.
        model: Default model name.

    Returns:
        Configured OpenAICompatProvider.
    """
    return OpenAICompatProvider(
        api_key="",  # Ollama doesn't require API key
        base_url=base_url,
        default_model=model,
    )


def create_vllm_provider(
    base_url: str = "http://localhost:8000/v1",
    api_key: str = "",
    model: str = "default",
) -> OpenAICompatProvider:
    """Create a provider for vLLM.

    Args:
        base_url: vLLM API URL.
        api_key: API key (if required).
        model: Default model name.

    Returns:
        Configured OpenAICompatProvider.
    """
    return OpenAICompatProvider(
        api_key=api_key,
        base_url=base_url,
        default_model=model,
    )
