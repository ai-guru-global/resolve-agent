"""Zhipu GLM (ChatGLM) LLM provider."""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Any, AsyncIterator

import httpx

from resolveagent.llm.provider import ChatMessage, ChatResponse, LLMProvider

logger = logging.getLogger(__name__)


class ZhipuProvider(LLMProvider):
    """LLM provider for Zhipu AI GLM models.

    Supports: glm-4, glm-4-flash, glm-3-turbo
    API: Zhipu AI Open Platform
    """

    DEFAULT_MODEL = "glm-4"
    BASE_URL = "https://open.bigmodel.cn/api/paas/v4"

    def __init__(self, api_key: str = "") -> None:
        """Initialize Zhipu provider.

        Args:
            api_key: API Key from Zhipu AI.
        """
        self.api_key = api_key or os.getenv("ZHIPU_API_KEY", "")

        if not self.api_key:
            logger.warning("Zhipu API key not configured")

    def _generate_token(self) -> str:
        """Generate JWT token for authentication.

        Zhipu uses JWT tokens for authentication.
        """
        import jwt

        # Token expiration: 1 hour
        expiration = int(time.time()) + 3600

        payload = {
            "api_key": self.api_key,
            "exp": expiration,
            "timestamp": int(time.time()),
        }

        # For Zhipu, we use the API key as the secret
        # The token is signed with HS256
        token = jwt.encode(payload, self.api_key, algorithm="HS256")
        return token

    async def chat(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> ChatResponse:
        """Generate completion via Zhipu API.

        Args:
            messages: List of chat messages.
            model: Model name (glm-4, glm-4-flash, glm-3-turbo).
            temperature: Sampling temperature.
            max_tokens: Maximum tokens to generate.
            **kwargs: Additional parameters.

        Returns:
            ChatResponse with generated content.
        """
        model = model or self.DEFAULT_MODEL
        logger.debug("Zhipu chat", extra={"model": model, "messages": len(messages)})

        if not self.api_key:
            raise RuntimeError("Zhipu API key not configured")

        # Generate JWT token
        token = self._generate_token()

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }

        # Convert messages to Zhipu format
        zhipu_messages = []
        for msg in messages:
            zhipu_messages.append({
                "role": msg.role,
                "content": msg.content,
            })

        payload = {
            "model": model,
            "messages": zhipu_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        payload.update(kwargs)

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()

                # Parse response
                if "error" in data:
                    raise RuntimeError(f"Zhipu API error: {data['error']}")

                choice = data.get("choices", [{}])[0]
                message = choice.get("message", {})
                content = message.get("content", "")
                finish_reason = choice.get("finish_reason", "stop")

                usage = data.get("usage", {})

                logger.debug(
                    "Zhipu chat response",
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
                "Zhipu API HTTP error",
                extra={"status": e.response.status_code, "response": e.response.text},
            )
            raise RuntimeError(f"Zhipu API error: {e.response.status_code}")
        except Exception as e:
            logger.error("Zhipu API error", extra={"error": str(e)})
            raise RuntimeError(f"Zhipu API call failed: {e}")

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Stream completion via Zhipu API.

        Args:
            messages: List of chat messages.
            model: Model name.
            temperature: Sampling temperature.
            max_tokens: Maximum tokens to generate.
            **kwargs: Additional parameters.

        Yields:
            Content chunks as they are generated.
        """
        model = model or self.DEFAULT_MODEL
        logger.debug("Zhipu streaming chat", extra={"model": model})

        if not self.api_key:
            raise RuntimeError("Zhipu API key not configured")

        # Generate JWT token
        token = self._generate_token()

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }

        # Convert messages
        zhipu_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]

        payload = {
            "model": model,
            "messages": zhipu_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }
        payload.update(kwargs)

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.BASE_URL}/chat/completions",
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
                "Zhipu streaming API HTTP error",
                extra={"status": e.response.status_code},
            )
            raise RuntimeError(f"Zhipu streaming API error: {e.response.status_code}")
        except Exception as e:
            logger.error("Zhipu streaming API error", extra={"error": str(e)})
            raise RuntimeError(f"Zhipu streaming API call failed: {e}")


class ZhipuProviderError(Exception):
    """Exception raised for Zhipu provider errors."""

    pass
