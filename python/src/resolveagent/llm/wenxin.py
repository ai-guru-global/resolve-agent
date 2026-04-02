"""Baidu Wenxin (ERNIE) LLM provider."""

from __future__ import annotations

import json
import logging
import os
from typing import Any, AsyncIterator

import httpx

from resolveagent.llm.provider import ChatMessage, ChatResponse, LLMProvider

logger = logging.getLogger(__name__)


class WenxinProvider(LLMProvider):
    """LLM provider for Baidu Wenxin (ERNIE) models.

    Supports: ernie-4.0, ernie-3.5, ernie-speed, etc.
    API: Baidu Qianfan (千帆) Platform
    """

    DEFAULT_MODEL = "ernie-4.0"
    BASE_URL = "https://qianfan.baidubce.com/v2"

    def __init__(self, api_key: str = "", secret_key: str = "") -> None:
        """Initialize Wenxin provider.

        Args:
            api_key: API Key from Baidu Qianfan.
            secret_key: Secret Key from Baidu Qianfan.
        """
        self.api_key = api_key or os.getenv("WENXIN_API_KEY", "")
        self.secret_key = secret_key or os.getenv("WENXIN_SECRET_KEY", "")
        self._access_token: str | None = None

        if not self.api_key or not self.secret_key:
            logger.warning("Wenxin API credentials not configured")

    async def _get_access_token(self) -> str:
        """Get Baidu access token."""
        if self._access_token:
            return self._access_token

        url = "https://aip.baidubce.com/oauth/2.0/token"
        params = {
            "grant_type": "client_credentials",
            "client_id": self.api_key,
            "client_secret": self.secret_key,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, params=params)
            response.raise_for_status()
            data = response.json()

            if "access_token" not in data:
                raise RuntimeError(f"Failed to get access token: {data}")

            self._access_token = data["access_token"]
            return self._access_token

    def _get_model_endpoint(self, model: str) -> str:
        """Get the API endpoint for a model."""
        model_map = {
            "ernie-4.0": "completions_pro",
            "ernie-4.0-turbo": "completions_pro_preemptible",
            "ernie-3.5": "completions",
            "ernie-speed": "ernie-speed",
            "ernie-lite": "ernie-lite",
            "ernie-tiny": "ernie-tiny",
        }
        endpoint = model_map.get(model, "completions_pro")
        return f"https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/{endpoint}"

    async def chat(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> ChatResponse:
        """Generate completion via Baidu Wenxin API."""
        model = model or self.DEFAULT_MODEL
        logger.debug("Wenxin chat", extra={"model": model, "messages": len(messages)})

        if not self.api_key or not self.secret_key:
            raise RuntimeError("Wenxin API credentials not configured")

        access_token = await self._get_access_token()
        endpoint = self._get_model_endpoint(model)

        headers = {
            "Content-Type": "application/json",
        }

        # Convert messages to Wenxin format
        wenxin_messages = []
        for msg in messages:
            wenxin_messages.append({
                "role": msg.role,
                "content": msg.content,
            })

        payload = {
            "messages": wenxin_messages,
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        payload.update(kwargs)

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{endpoint}?access_token={access_token}",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()

                # Parse response
                if "error_code" in data:
                    raise RuntimeError(f"Wenxin API error: {data['error_msg']}")

                content = data.get("result", "")
                finish_reason = "stop" if data.get("is_end", True) else "length"
                usage = data.get("usage", {})

                logger.debug(
                    "Wenxin chat response",
                    extra={"model": model, "usage": usage},
                )

                return ChatResponse(
                    content=content,
                    model=model,
                    usage={
                        "prompt_tokens": usage.get("prompt_tokens", 0),
                        "completion_tokens": usage.get("completion_tokens", 0),
                        "total_tokens": usage.get("total_tokens", 0),
                    },
                    finish_reason=finish_reason,
                )

        except httpx.HTTPStatusError as e:
            logger.error(
                "Wenxin API HTTP error",
                extra={"status": e.response.status_code, "response": e.response.text},
            )
            raise RuntimeError(f"Wenxin API error: {e.response.status_code}")
        except Exception as e:
            logger.error("Wenxin API error", extra={"error": str(e)})
            raise RuntimeError(f"Wenxin API call failed: {e}")

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Stream completion via Baidu Wenxin API."""
        model = model or self.DEFAULT_MODEL
        logger.debug("Wenxin streaming chat", extra={"model": model})

        if not self.api_key or not self.secret_key:
            raise RuntimeError("Wenxin API credentials not configured")

        access_token = await self._get_access_token()
        endpoint = self._get_model_endpoint(model)

        headers = {
            "Content-Type": "application/json",
        }

        wenxin_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in messages
        ]

        payload = {
            "messages": wenxin_messages,
            "temperature": temperature,
            "max_output_tokens": max_tokens,
            "stream": True,
        }
        payload.update(kwargs)

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{endpoint}?access_token={access_token}",
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

                            try:
                                data = json.loads(data_str)
                                content = data.get("result", "")
                                is_end = data.get("is_end", False)

                                if content:
                                    yield content

                                if is_end:
                                    break

                            except json.JSONDecodeError:
                                continue

        except httpx.HTTPStatusError as e:
            logger.error(
                "Wenxin streaming API HTTP error",
                extra={"status": e.response.status_code},
            )
            raise RuntimeError(f"Wenxin streaming API error: {e.response.status_code}")
        except Exception as e:
            logger.error("Wenxin streaming API error", extra={"error": str(e)})
            raise RuntimeError(f"Wenxin streaming API call failed: {e}")


class WenxinProviderError(Exception):
    """Exception raised for Wenxin provider errors."""

    pass
