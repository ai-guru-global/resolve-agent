"""Base class for vector store implementations."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class VectorStore(ABC):
    """Abstract base class for vector store implementations.

    This defines the interface for all vector store backends
    (Milvus, Qdrant, etc.).
    """

    @abstractmethod
    async def connect(self) -> None:
        """Connect to the vector store."""
        ...

    @abstractmethod
    async def disconnect(self) -> None:
        """Disconnect from the vector store."""
        ...

    @abstractmethod
    async def create_collection(
        self,
        collection_name: str,
        dimension: int = 1024,
        metric_type: str = "COSINE",
        **kwargs: Any,
    ) -> bool:
        """Create a new collection.

        Args:
            collection_name: Name of the collection.
            dimension: Dimension of the embedding vectors.
            metric_type: Distance metric.
            **kwargs: Additional parameters.

        Returns:
            True if created successfully.
        """
        ...

    @abstractmethod
    async def delete_collection(self, collection_name: str) -> bool:
        """Delete a collection.

        Args:
            collection_name: Name of the collection.

        Returns:
            True if deleted successfully.
        """
        ...

    @abstractmethod
    async def list_collections(self) -> list[str]:
        """List all collections.

        Returns:
            List of collection names.
        """
        ...

    @abstractmethod
    async def insert(
        self,
        collection_name: str,
        vectors: list[list[float]],
        texts: list[str],
        metadata: list[dict[str, Any]] | None = None,
        ids: list[str] | None = None,
    ) -> list[str]:
        """Insert vectors into collection.

        Args:
            collection_name: Target collection.
            vectors: List of embedding vectors.
            texts: List of text chunks.
            metadata: Optional metadata for each chunk.
            ids: Optional custom IDs.

        Returns:
            List of inserted IDs.
        """
        ...

    @abstractmethod
    async def search(
        self,
        collection_name: str,
        query_vector: list[float],
        top_k: int = 10,
        filters: dict[str, Any] | None = None,
        metric_type: str = "COSINE",
    ) -> list[dict[str, Any]]:
        """Search for similar vectors.

        Args:
            collection_name: Collection to search.
            query_vector: Query embedding vector.
            top_k: Number of results to return.
            filters: Optional metadata filters.
            metric_type: Distance metric.

        Returns:
            List of search results.
        """
        ...

    @abstractmethod
    async def delete(
        self,
        collection_name: str,
        ids: list[str] | None = None,
        filters: dict[str, Any] | None = None,
    ) -> int:
        """Delete vectors from collection.

        Args:
            collection_name: Target collection.
            ids: List of IDs to delete.
            filters: Metadata filters for deletion.

        Returns:
            Number of deleted entries.
        """
        ...

    @abstractmethod
    async def get_stats(self, collection_name: str) -> dict[str, Any]:
        """Get collection statistics.

        Args:
            collection_name: Collection name.

        Returns:
            Statistics including row count.
        """
        ...
