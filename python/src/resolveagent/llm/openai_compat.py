"""OpenAI-compatible LLM provider.

Supports any OpenAI-compatible API including:
- OpenAI GPT models
- vLLM (self-hosted)
- Ollama
- LM Studio
- LocalAI
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
    """LLM provider for OpenAI-compatible APIs.

    Supports any API that follows the OpenAI chat completions format.
    """

    DEFAULT_MODEL = "gpt-3.5-turbo"

    def __init__(
        self,
        api_key: str = "",
        base_url: str = "",
        default_model: str = "",
    ) -> None:
        """Initialize OpenAI-compatible provider.

        Args:
            api_key: API key for authentication.
            base_url: Base URL for the API (e.g., http://localhost:8000/v1).
            default_model: Default model to use.
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY", "")
        self.base_url = base_url or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        self.default_model = default_model or self.DEFAULT_MODEL

        # Remove trailing slash from base_url
        self.base_url = self.base_url.rstrip("/")

        if not self.api_key and "localhost" not in self.base_url:
            logger.warning("OpenAI API key not configured")

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
        logger.debug("OpenAI chat", extra={"model": model, "messages": len(messages)})

        headers = {
            "Content-Type": "application/json",
        }

        # Add authorization if API key is provided
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        # Convert messages to OpenAI format
        openai_messages = []
        for msg in messages:
            openai_messages.append({
                "role": msg.role,
                "content": msg.content,
            })

        payload = {
            "model": model,
            "messages": openai_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
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

                # Parse response
                if "error" in data:
                    raise RuntimeError(f"API error: {data['error']}")

                choice = data.get("choices", [{}])[0]
                message = choice.get("message", {})
                content = message.get("content", "")
                finish_reason = choice.get("finish_reason", "stop")

                usage = data.get("usage", {})

                logger.debug(
                    "OpenAI chat response",
                    extra={"model": data.get("model", model), "usage": usage},
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
                "OpenAI API HTTP error",
                extra={"status": e.response.status_code, "response": e.response.text},
            )
            raise RuntimeError(f"OpenAI API error: {e.response.status_code}")
        except Exception as e:
            logger.error("OpenAI API error", extra={"error": str(e)})
            raise RuntimeError(f"OpenAI API call failed: {e}")

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Stream completion via OpenAI-compatible API."""
        model = model or self.default_model
        logger.debug("OpenAI streaming chat", extra={"model": model})

        headers = {
            "Content-Type": "application/json",
        }

        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

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
                        if not line:
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
                                continue

        except httpx.HTTPStatusError as e:
            logger.error(
                "OpenAI streaming API HTTP error",
                extra={"status": e.response.status_code},
            )
            raise RuntimeError(f"OpenAI streaming API error: {e.response.status_code}")
        except Exception as e:
            logger.error("OpenAI streaming API error", extra={"error": str(e)})
            raise RuntimeError(f"OpenAI streaming API call failed: {e}")


class OllamaProvider(OpenAICompatProvider):
    """Provider for Ollama (local LLM).

    Ollama provides an OpenAI-compatible API at /v1/chat/completions.
    """

    def __init__(self, base_url: str = "", default_model: str = "llama2") -> None:
        """Initialize Ollama provider.

        Args:
            base_url: Ollama API URL (default: http://localhost:11434).
            default_model: Default model to use.
        """
        base_url = base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        # Ollama's OpenAI-compatible endpoint is at /v1
        if not base_url.endswith("/v1"):
            base_url = f"{base_url}/v1"

        super().__init__(
            api_key="ollama",  # Ollama doesn't require auth but needs a placeholder
            base_url=base_url,
            default_model=default_model,
        )


class vLLMProvider(OpenAICompatProvider):
    """Provider for vLLM (self-hosted).

    vLLM provides an OpenAI-compatible API server.
    """

    def __init__(self, base_url: str = "", api_key: str = "", default_model: str = "") -> None:
        """Initialize vLLM provider.

        Args:
            base_url: vLLM API URL.
            api_key: Optional API key.
            default_model: Default model name.
        """
        base_url = base_url or os.getenv("VLLM_BASE_URL", "http://localhost:8000/v1")
        super().__init__(
            api_key=api_key or os.getenv("VLLM_API_KEY", ""),
            base_url=base_url,
            default_model=default_model,
        )


class OpenAICompatProviderError(Exception):
    """Exception raised for OpenAI-compatible provider errors."""

    pass
