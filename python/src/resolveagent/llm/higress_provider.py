"""Higress Gateway LLM Provider.

This provider routes all LLM calls through the Higress gateway,
enabling centralized traffic management, rate limiting, and failover.
"""

from __future__ import annotations

import logging
import os
from typing import Any, AsyncIterator

import httpx

from resolveagent.llm.provider import ChatMessage, ChatResponse, LLMProvider
from resolveagent.runtime.registry_client import get_registry_client

logger = logging.getLogger(__name__)


class HigressLLMProvider(LLMProvider):
    """LLM Provider that routes requests through Higress gateway.

    This provider implements the unified LLM access pattern where all
    model calls go through Higress, enabling:

    - Centralized rate limiting and quota management
    - Automatic failover to backup models
    - Traffic monitoring and observability
    - Unified authentication
    - Load balancing across model instances

    Architecture:
    ```
    ┌─────────────────────────────────────────────────────────────────┐
    │                   Python Agent Runtime                          │
    │                                                                 │
    │  ┌─────────────────────────────────────────────────────────┐   │
    │  │              HigressLLMProvider                          │   │
    │  │  - Uses gateway_endpoint from RegistryClient             │   │
    │  │  - Adds authentication headers                           │   │
    │  │  - Handles streaming responses                           │   │
    │  └─────────────────────────────────────────────────────────┘   │
    │                          │                                      │
    └──────────────────────────┼──────────────────────────────────────┘
                               │ HTTP/HTTPS
                               ▼
    ┌─────────────────────────────────────────────────────────────────┐
    │                     HIGRESS AI GATEWAY                          │
    │                                                                 │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
    │  │ Rate Limit  │  │  Failover   │  │    Model Routing        │ │
    │  │  (Token/    │  │  (Backup    │  │  (qwen/wenxin/zhipu)    │ │
    │  │   Request)  │  │   Models)   │  │                         │ │
    │  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
    │                          │                                      │
    └──────────────────────────┼──────────────────────────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │   Qwen      │    │   Wenxin    │    │   Zhipu     │
    │  (Alibaba)  │    │   (Baidu)   │    │  (Zhipu)    │
    └─────────────┘    └─────────────┘    └─────────────┘
    ```

    Usage:
        ```python
        provider = HigressLLMProvider(
            gateway_url="http://localhost:8888",
            default_model="qwen-plus",
        )

        response = await provider.chat(
            messages=[ChatMessage(role="user", content="Hello!")],
            model="qwen-plus",
        )
        print(response.content)
        ```
    """

    def __init__(
        self,
        gateway_url: str | None = None,
        default_model: str = "qwen-plus",
        api_key: str | None = None,
        timeout: float = 60.0,
    ) -> None:
        """Initialize the Higress LLM Provider.

        Args:
            gateway_url: Higress gateway URL. Defaults to HIGRESS_GATEWAY_URL env var.
            default_model: Default model to use.
            api_key: API key for authentication. Defaults to RESOLVEAGENT_API_KEY env var.
            timeout: Request timeout in seconds.
        """
        self._gateway_url = gateway_url or os.getenv("HIGRESS_GATEWAY_URL", "http://localhost:8888")
        self._default_model = default_model
        self._api_key = api_key or os.getenv("RESOLVEAGENT_API_KEY", "")
        self._timeout = timeout
        
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(timeout),
            headers=self._build_headers(),
        )
        
        logger.info(
            "HigressLLMProvider initialized",
            extra={"gateway": self._gateway_url, "default_model": default_model},
        )

    def _build_headers(self) -> dict[str, str]:
        """Build common headers for requests."""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        return headers

    async def _get_model_endpoint(self, model: str) -> str:
        """Get the gateway endpoint for a model.

        This queries the Go Registry to get the correct endpoint,
        ensuring we use the centralized routing configuration.

        Args:
            model: Model ID.

        Returns:
            Full URL for the model endpoint.
        """
        try:
            registry = get_registry_client()
            model_info = await registry.get_model_route(model)
            if model_info:
                return f"{self._gateway_url}{model_info.gateway_endpoint}"
        except Exception as e:
            logger.warning(
                "Failed to get model route from registry, using default",
                extra={"model": model, "error": str(e)},
            )
        
        # Fallback to default path structure
        return f"{self._gateway_url}/llm/models/{model}/chat/completions"

    async def chat(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> ChatResponse:
        """Generate a chat completion through Higress gateway.

        Args:
            messages: Conversation messages.
            model: Model identifier (uses default if None).
            temperature: Sampling temperature.
            max_tokens: Maximum tokens to generate.
            **kwargs: Additional parameters.

        Returns:
            ChatResponse with generated content.
        """
        model = model or self._default_model
        endpoint = await self._get_model_endpoint(model)
        
        payload = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
            **kwargs,
        }
        
        logger.debug(
            "Sending chat request to Higress",
            extra={"endpoint": endpoint, "model": model, "messages": len(messages)},
        )
        
        try:
            response = await self._client.post(endpoint, json=payload)
            response.raise_for_status()
            data = response.json()
            
            # Parse OpenAI-compatible response
            content = ""
            if "choices" in data and data["choices"]:
                content = data["choices"][0].get("message", {}).get("content", "")
            
            usage = data.get("usage", {})
            
            return ChatResponse(
                content=content,
                model=data.get("model", model),
                usage={
                    "prompt_tokens": usage.get("prompt_tokens", 0),
                    "completion_tokens": usage.get("completion_tokens", 0),
                    "total_tokens": usage.get("total_tokens", 0),
                },
                finish_reason=data.get("choices", [{}])[0].get("finish_reason", "stop"),
            )
            
        except httpx.HTTPStatusError as e:
            logger.error(
                "LLM request failed",
                extra={"status": e.response.status_code, "error": str(e)},
            )
            raise
        except Exception as e:
            logger.error("LLM request error", extra={"error": str(e)})
            raise

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Generate a streaming chat completion through Higress gateway.

        Args:
            messages: Conversation messages.
            model: Model identifier.
            temperature: Sampling temperature.
            max_tokens: Maximum tokens to generate.
            **kwargs: Additional parameters.

        Yields:
            Content chunks as they are generated.
        """
        model = model or self._default_model
        endpoint = await self._get_model_endpoint(model)
        
        payload = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
            **kwargs,
        }
        
        logger.debug(
            "Starting streaming chat request to Higress",
            extra={"endpoint": endpoint, "model": model},
        )
        
        try:
            async with self._client.stream("POST", endpoint, json=payload) as response:
                response.raise_for_status()
                
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    
                    data_str = line[6:]  # Remove "data: " prefix
                    if data_str == "[DONE]":
                        break
                    
                    try:
                        import json
                        data = json.loads(data_str)
                        
                        if "choices" in data and data["choices"]:
                            delta = data["choices"][0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                                
                    except json.JSONDecodeError:
                        continue
                        
        except httpx.HTTPStatusError as e:
            logger.error(
                "Streaming LLM request failed",
                extra={"status": e.response.status_code, "error": str(e)},
            )
            raise
        except Exception as e:
            logger.error("Streaming LLM request error", extra={"error": str(e)})
            raise

    async def close(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()


class HigressEmbeddingProvider:
    """Embedding provider that routes through Higress gateway.

    Similar to HigressLLMProvider but for embedding models,
    enabling centralized management of embedding API calls.
    """

    def __init__(
        self,
        gateway_url: str | None = None,
        default_model: str = "bge-large-zh",
        api_key: str | None = None,
        timeout: float = 60.0,
    ) -> None:
        """Initialize the Higress Embedding Provider.

        Args:
            gateway_url: Higress gateway URL.
            default_model: Default embedding model.
            api_key: API key for authentication.
            timeout: Request timeout.
        """
        self._gateway_url = gateway_url or os.getenv("HIGRESS_GATEWAY_URL", "http://localhost:8888")
        self._default_model = default_model
        self._api_key = api_key or os.getenv("RESOLVEAGENT_API_KEY", "")
        self._timeout = timeout
        
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(timeout),
            headers=self._build_headers(),
        )

    def _build_headers(self) -> dict[str, str]:
        """Build common headers."""
        headers = {
            "Content-Type": "application/json",
        }
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        return headers

    async def embed(
        self,
        texts: list[str],
        model: str | None = None,
    ) -> list[list[float]]:
        """Generate embeddings for texts through Higress gateway.

        Args:
            texts: Texts to embed.
            model: Embedding model ID.

        Returns:
            List of embedding vectors.
        """
        model = model or self._default_model
        endpoint = f"{self._gateway_url}/llm/embeddings/{model}"
        
        payload = {
            "model": model,
            "input": texts,
        }
        
        logger.debug(
            "Generating embeddings through Higress",
            extra={"model": model, "count": len(texts)},
        )
        
        try:
            response = await self._client.post(endpoint, json=payload)
            response.raise_for_status()
            data = response.json()
            
            # Parse OpenAI-compatible embedding response
            embeddings = []
            for item in data.get("data", []):
                embeddings.append(item.get("embedding", []))
            
            return embeddings
            
        except Exception as e:
            logger.error("Embedding request failed", extra={"error": str(e)})
            raise

    async def embed_query(self, query: str, model: str | None = None) -> list[float]:
        """Generate embedding for a single query.

        Args:
            query: Query text.
            model: Embedding model ID.

        Returns:
            Embedding vector.
        """
        results = await self.embed([query], model)
        return results[0] if results else []

    async def close(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()


# Convenience functions for creating providers

def create_llm_provider(
    gateway_url: str | None = None,
    model: str = "qwen-plus",
) -> HigressLLMProvider:
    """Create a Higress LLM provider.

    Args:
        gateway_url: Optional gateway URL override.
        model: Default model.

    Returns:
        HigressLLMProvider instance.
    """
    return HigressLLMProvider(gateway_url=gateway_url, default_model=model)


def create_embedding_provider(
    gateway_url: str | None = None,
    model: str = "bge-large-zh",
) -> HigressEmbeddingProvider:
    """Create a Higress embedding provider.

    Args:
        gateway_url: Optional gateway URL override.
        model: Default model.

    Returns:
        HigressEmbeddingProvider instance.
    """
    return HigressEmbeddingProvider(gateway_url=gateway_url, default_model=model)
