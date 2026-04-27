"""Vector search and retrieval logic."""

from __future__ import annotations

import logging
from typing import Any

from resolveagent.rag.index.milvus import MilvusStore
from resolveagent.rag.index.qdrant import QdrantStore

logger = logging.getLogger(__name__)


class Retriever:
    """Retrieves relevant chunks from vector store.

    Supports hybrid retrieval combining dense vector search
    with metadata filtering.
    """

    def __init__(
        self,
        vector_backend: str = "milvus",
        host: str = "localhost",
        port: int | None = None,
    ) -> None:
        """Initialize retriever.

        Args:
            vector_backend: Vector store backend (milvus or qdrant).
            host: Vector store host.
            port: Vector store port (default depends on backend).
        """
        self.vector_backend = vector_backend
        self.host = host
        self.port = port or (19530 if vector_backend == "milvus" else 6333)
        self._store: MilvusStore | QdrantStore | None = None

    async def _get_store(self) -> MilvusStore | QdrantStore:
        """Get or create vector store connection."""
        if self._store is None:
            if self.vector_backend == "milvus":
                self._store = MilvusStore(host=self.host, port=self.port)
            elif self.vector_backend == "qdrant":
                self._store = QdrantStore(host=self.host, port=self.port)
            else:
                raise ValueError(f"Unsupported vector backend: {self.vector_backend}")

            await self._store.connect()

        return self._store

    async def retrieve(
        self,
        collection: str,
        query_embedding: list[float],
        top_k: int = 5,
        filters: dict[str, Any] | None = None,
        metric_type: str = "COSINE",
    ) -> list[dict[str, Any]]:
        """Retrieve relevant chunks.

        Args:
            collection: Collection to search.
            query_embedding: Query embedding vector.
            top_k: Number of results.
            filters: Metadata filters.
            metric_type: Distance metric.

        Returns:
            List of retrieved chunks with scores.

        Raises:
            RuntimeError: If search fails.
        """
        logger.debug(
            "Retrieving chunks",
            extra={
                "collection": collection,
                "backend": self.vector_backend,
                "top_k": top_k,
            },
        )

        try:
            store = await self._get_store()

            results = await store.search(
                collection_name=collection,
                query_vector=query_embedding,
                top_k=top_k,
                filters=filters,
                metric_type=metric_type,
            )

            logger.info(
                "Retrieval completed",
                extra={
                    "collection": collection,
                    "results": len(results),
                    "top_k": top_k,
                },
            )

            return results

        except Exception as e:
            logger.error(
                "Retrieval failed",
                extra={"collection": collection, "error": str(e)},
            )
            raise RuntimeError(f"Failed to retrieve from {collection}: {e}") from e

    async def retrieve_by_text(
        self,
        collection: str,
        query: str,
        embedder: Any,
        top_k: int = 5,
        filters: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Retrieve by text query (convenience method).

        Args:
            collection: Collection to search.
            query: Query text.
            embedder: Embedder instance to generate query embedding.
            top_k: Number of results.
            filters: Metadata filters.

        Returns:
            List of retrieved chunks.
        """
        # Generate query embedding
        query_embedding = await embedder.embed_query(query)

        # Retrieve
        return await self.retrieve(
            collection=collection,
            query_embedding=query_embedding,
            top_k=top_k,
            filters=filters,
        )

    async def get_collection_stats(self, collection: str) -> dict[str, Any]:
        """Get collection statistics.

        Args:
            collection: Collection name.

        Returns:
            Statistics including row count.
        """
        store = await self._get_store()
        return await store.get_stats(collection)

    async def close(self) -> None:
        """Close vector store connection."""
        if self._store:
            await self._store.disconnect()
            self._store = None


def create_retriever(
    vector_backend: str = "milvus",
    host: str = "localhost",
    port: int | None = None,
) -> Retriever:
    """Factory function to create a retriever.

    Args:
        vector_backend: Vector store backend.
        host: Vector store host.
        port: Vector store port.

    Returns:
        Configured Retriever instance.
    """
    return Retriever(vector_backend=vector_backend, host=host, port=port)
