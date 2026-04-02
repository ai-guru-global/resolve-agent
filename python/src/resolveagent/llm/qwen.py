"""Alibaba Qwen (Tongyi Qianwen) LLM provider."""

from __future__ import annotations

import json
import logging
import os
from typing import Any, AsyncIterator

import httpx

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
        """Initialize Qwen provider.

        Args:
            api_key: DashScope API key. Falls back to DASHSCOPE_API_KEY env var.
            base_url: Custom API base URL.
        """
        self.api_key = api_key or os.getenv("DASHSCOPE_API_KEY", "")
        self.base_url = base_url or self.BASE_URL

        if not self.api_key:
            logger.warning("No API key provided for Qwen provider")

    async def chat(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> ChatResponse:
        """Generate completion via Qwen API.

        Args:
            messages: List of chat messages.
            model: Model name (qwen-turbo, qwen-plus, qwen-max).
            temperature: Sampling temperature (0-2).
            max_tokens: Maximum tokens to generate.
            **kwargs: Additional parameters.

        Returns:
            ChatResponse with generated content.

        Raises:
            RuntimeError: If API call fails.
        """
        model = model or self.DEFAULT_MODEL
        logger.debug(
            "Qwen chat request",
            extra={"model": model, "messages": len(messages), "temperature": temperature},
        )

        if not self.api_key:
            raise RuntimeError("Qwen API key not configured")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
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
                    "Qwen chat response",
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
                "Qwen API HTTP error",
                extra={"status": e.response.status_code, "response": e.response.text},
            )
            raise RuntimeError(f"Qwen API error: {e.response.status_code} - {e.response.text}")
        except httpx.TimeoutException as e:
            logger.error("Qwen API timeout")
            raise RuntimeError("Qwen API request timed out")
        except Exception as e:
            logger.error("Qwen API error", extra={"error": str(e)})
            raise RuntimeError(f"Qwen API call failed: {e}")

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Stream completion via Qwen API.

        Args:
            messages: List of chat messages.
            model: Model name.
            temperature: Sampling temperature.
            max_tokens: Maximum tokens to generate.
            **kwargs: Additional parameters.

        Yields:
            Content chunks as they are generated.

        Raises:
            RuntimeError: If API call fails.
        """
        model = model or self.DEFAULT_MODEL
        logger.debug("Qwen streaming chat", extra={"model": model})

        if not self.api_key:
            raise RuntimeError("Qwen API key not configured")

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
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
                "Qwen streaming API HTTP error",
                extra={"status": e.response.status_code},
            )
            raise RuntimeError(f"Qwen streaming API error: {e.response.status_code}")
        except Exception as e:
            logger.error("Qwen streaming API error", extra={"error": str(e)})
            raise RuntimeError(f"Qwen streaming API call failed: {e}")


class QwenProviderError(Exception):
    """Exception raised for Qwen provider errors."""

    pass
