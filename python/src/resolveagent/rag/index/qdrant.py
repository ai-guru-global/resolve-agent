"""Qdrant vector store implementation for RAG."""

from __future__ import annotations

import logging
from typing import Any

from resolveagent.rag.index.base import VectorStore

logger = logging.getLogger(__name__)


class QdrantStore(VectorStore):
    """Qdrant vector store for document embeddings.

    This implementation uses qdrant-client to interact with Qdrant vector database.
    Supports collection management, vector insertion, and similarity search.

    Features:
    - Collection creation with custom schemas
    - Vector insertion with metadata
    - Approximate nearest neighbor (ANN) search
    - Payload filtering
    """

    def __init__(
        self,
        host: str = "localhost",
        port: int = 6333,
        grpc_port: int = 6334,
        api_key: str | None = None,
        https: bool = False,
    ) -> None:
        """Initialize Qdrant store.

        Args:
            host: Qdrant server host.
            port: Qdrant HTTP port.
            grpc_port: Qdrant gRPC port.
            api_key: API key for authentication.
            https: Use HTTPS connection.
        """
        self.host = host
        self.port = port
        self.grpc_port = grpc_port
        self.api_key = api_key
        self.https = https
        self._client = None
        self._connected = False

    async def connect(self) -> None:
        """Connect to Qdrant server."""
        try:
            from qdrant_client import QdrantClient

            self._client = QdrantClient(
                host=self.host,
                port=self.port,
                grpc_port=self.grpc_port,
                api_key=self.api_key,
                https=self.https,
                prefer_grpc=True,
            )

            # Test connection
            self._client.get_collections()

            self._connected = True
            logger.info(
                "Connected to Qdrant",
                extra={"host": self.host, "port": self.port},
            )
        except ImportError:
            logger.error("qdrant-client not installed. Install with: pip install qdrant-client")
            raise
        except Exception as e:
            logger.error("Failed to connect to Qdrant", extra={"error": str(e)})
            raise

    async def disconnect(self) -> None:
        """Disconnect from Qdrant server."""
        if self._client:
            self._client.close()
            self._connected = False
            logger.info("Disconnected from Qdrant")

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
            metric_type: Distance metric (COSINE, EUCLID, DOT).
            **kwargs: Additional parameters.

        Returns:
            True if created successfully.
        """
        if not self._connected:
            raise RuntimeError("Not connected to Qdrant")

        try:
            from qdrant_client.models import Distance, VectorParams

            # Map metric type
            distance_map = {
                "COSINE": Distance.COSINE,
                "L2": Distance.EUCLID,
                "EUCLID": Distance.EUCLID,
                "IP": Distance.DOT,
                "DOT": Distance.DOT,
            }
            distance = distance_map.get(metric_type.upper(), Distance.COSINE)

            # Check if collection exists
            collections = self._client.get_collections().collections
            exists = any(c.name == collection_name for c in collections)

            if exists:
                logger.info(f"Collection {collection_name} already exists")
                return True

            # Create collection
            self._client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=dimension, distance=distance),
            )

            logger.info(
                f"Created collection {collection_name}",
                extra={"dimension": dimension, "metric": metric_type},
            )
            return True

        except Exception as e:
            logger.error(f"Failed to create collection {collection_name}", extra={"error": str(e)})
            raise

    async def delete_collection(self, collection_name: str) -> bool:
        """Delete a collection.

        Args:
            collection_name: Name of the collection.

        Returns:
            True if deleted successfully.
        """
        if not self._connected:
            raise RuntimeError("Not connected to Qdrant")

        try:
            self._client.delete_collection(collection_name)
            logger.info(f"Deleted collection {collection_name}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete collection {collection_name}", extra={"error": str(e)})
            raise

    async def list_collections(self) -> list[str]:
        """List all collections.

        Returns:
            List of collection names.
        """
        if not self._connected:
            raise RuntimeError("Not connected to Qdrant")

        try:
            collections = self._client.get_collections().collections
            return [c.name for c in collections]
        except Exception as e:
            logger.error("Failed to list collections", extra={"error": str(e)})
            raise

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
        if not self._connected:
            raise RuntimeError("Not connected to Qdrant")

        if len(vectors) != len(texts):
            raise ValueError("vectors and texts must have same length")

        try:
            from qdrant_client.models import PointStruct

            # Generate IDs if not provided
            if ids is None:
                import uuid

                ids = [str(uuid.uuid4()) for _ in range(len(vectors))]

            if metadata is None:
                metadata = [{} for _ in range(len(vectors))]

            # Prepare points
            points = [
                PointStruct(
                    id=id_,
                    vector=vector,
                    payload={
                        "text": text,
                        **meta,
                    },
                )
                for id_, vector, text, meta in zip(ids, vectors, texts, metadata, strict=False)
            ]

            # Insert in batches
            batch_size = 100
            for i in range(0, len(points), batch_size):
                batch = points[i : i + batch_size]
                self._client.upsert(
                    collection_name=collection_name,
                    points=batch,
                )

            logger.info(
                f"Inserted {len(points)} vectors into {collection_name}",
                extra={"collection": collection_name, "count": len(points)},
            )

            return ids

        except Exception as e:
            logger.error(f"Failed to insert into {collection_name}", extra={"error": str(e)})
            raise

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
            List of search results with scores and metadata.
        """
        if not self._connected:
            raise RuntimeError("Not connected to Qdrant")

        try:
            from qdrant_client.models import FieldCondition, Filter, MatchValue

            # Build filter if provided
            query_filter = None
            if filters:
                conditions = []
                for key, value in filters.items():
                    conditions.append(
                        FieldCondition(
                            key=key,
                            match=MatchValue(value=value),
                        )
                    )
                if conditions:
                    query_filter = Filter(must=conditions)

            # Search
            results = self._client.search(
                collection_name=collection_name,
                query_vector=query_vector,
                limit=top_k,
                query_filter=query_filter,
                with_payload=True,
            )

            # Format results
            formatted_results = []
            for result in results:
                formatted_results.append(
                    {
                        "id": result.id,
                        "text": result.payload.get("text", "") if result.payload else "",
                        "metadata": {k: v for k, v in (result.payload or {}).items() if k != "text"},
                        "score": result.score,
                    }
                )

            logger.debug(
                f"Search completed in {collection_name}",
                extra={"collection": collection_name, "results": len(formatted_results)},
            )

            return formatted_results

        except Exception as e:
            logger.error(f"Failed to search {collection_name}", extra={"error": str(e)})
            raise

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
        if not self._connected:
            raise RuntimeError("Not connected to Qdrant")

        try:
            if ids:
                from qdrant_client.models import PointIdsList

                self._client.delete(
                    collection_name=collection_name,
                    points_selector=PointIdsList(points=ids),
                )
                logger.info(f"Deleted {len(ids)} entries from {collection_name}")
                return len(ids)

            elif filters:
                from qdrant_client.models import FieldCondition, Filter, MatchValue

                conditions = [FieldCondition(key=k, match=MatchValue(value=v)) for k, v in filters.items()]
                query_filter = Filter(must=conditions)

                self._client.delete(
                    collection_name=collection_name,
                    points_selector=query_filter,
                )
                logger.info(f"Deleted entries by filter from {collection_name}")
                return 0  # Qdrant doesn't return count

            return 0

        except Exception as e:
            logger.error(f"Failed to delete from {collection_name}", extra={"error": str(e)})
            raise

    async def get_stats(self, collection_name: str) -> dict[str, Any]:
        """Get collection statistics.

        Args:
            collection_name: Collection name.

        Returns:
            Statistics including row count.
        """
        if not self._connected:
            raise RuntimeError("Not connected to Qdrant")

        try:
            info = self._client.get_collection(collection_name)
            return {
                "collection_name": collection_name,
                "row_count": info.points_count,
                "vectors_count": info.vectors_count,
            }
        except Exception as e:
            logger.error(f"Failed to get stats for {collection_name}", extra={"error": str(e)})
            raise
