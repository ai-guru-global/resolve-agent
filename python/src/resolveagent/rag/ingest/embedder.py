"""Embedding generation for RAG."""

from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger(__name__)


class Embedder:
    """Generates embeddings for text chunks.

    Supports multiple embedding models:
    - BGE (BAAI General Embedding) - optimized for Chinese
    - text2vec - Chinese text embedding
    - OpenAI-compatible embedding APIs

    Uses Higress gateway for centralized API management.
    """

    # Model dimensions
    MODEL_DIMENSIONS = {
        "bge-large-zh": 1024,
        "bge-base-zh": 768,
        "text-embedding-v1": 1536,
        "text-embedding-v2": 1536,
    }

    def __init__(
        self,
        model: str = "bge-large-zh",
        api_key: str | None = None,
        base_url: str | None = None,
    ) -> None:
        """Initialize embedder.

        Args:
            model: Embedding model name.
            api_key: API key for embedding service.
            base_url: Base URL for embedding API.
        """
        self.model = model
        self.api_key = api_key or os.getenv("DASHSCOPE_API_KEY", "")
        self.base_url = base_url or "https://dashscope.aliyuncs.com/compatible-mode/v1"
        self.dimension = self.MODEL_DIMENSIONS.get(model, 1024)

    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a list of texts.

        Args:
            texts: Texts to embed.

        Returns:
            List of embedding vectors.

        Raises:
            RuntimeError: If API call fails.
        """
        if not texts:
            return []

        if not self.api_key:
            logger.warning("No API key configured, returning zero vectors")
            return [[0.0] * self.dimension for _ in texts]

        logger.debug("Generating embeddings", extra={"model": self.model, "count": len(texts)})

        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }

            payload = {
                "model": self.model,
                "input": texts,
            }

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.base_url}/embeddings",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()

                # Parse response
                embeddings = []
                for item in data.get("data", []):
                    embedding = item.get("embedding", [])
                    if embedding:
                        embeddings.append(embedding)
                    else:
                        # Fallback to zero vector if embedding is empty
                        embeddings.append([0.0] * self.dimension)

                logger.debug(
                    "Embeddings generated",
                    extra={
                        "count": len(embeddings),
                        "dimension": len(embeddings[0]) if embeddings else 0,
                    },
                )

                return embeddings

        except httpx.HTTPStatusError as e:
            logger.error(
                "Embedding API HTTP error",
                extra={"status": e.response.status_code, "response": e.response.text},
            )
            raise RuntimeError(f"Embedding API error: {e.response.status_code}") from e
        except Exception as e:
            logger.error("Embedding generation failed", extra={"error": str(e)})
            raise RuntimeError(f"Failed to generate embeddings: {e}") from e

    async def embed_query(self, query: str) -> list[float]:
        """Generate embedding for a single query.

        Args:
            query: Query text.

        Returns:
            Embedding vector.
        """
        results = await self.embed([query])
        return results[0] if results else [0.0] * self.dimension

    async def embed_batch(
        self,
        texts: list[str],
        batch_size: int = 32,
    ) -> list[list[float]]:
        """Generate embeddings in batches.

        Args:
            texts: Texts to embed.
            batch_size: Batch size for API calls.

        Returns:
            List of embedding vectors.
        """
        all_embeddings = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            embeddings = await self.embed(batch)
            all_embeddings.extend(embeddings)

        return all_embeddings


def create_embedder(
    model: str = "bge-large-zh",
    api_key: str | None = None,
) -> Embedder:
    """Factory function to create an embedder.

    Args:
        model: Model name.
        api_key: API key.

    Returns:
        Configured Embedder instance.
    """
    return Embedder(model=model, api_key=api_key)
