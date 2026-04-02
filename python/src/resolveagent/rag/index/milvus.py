"""Milvus vector store implementation for RAG."""

from __future__ import annotations

import logging
from typing import Any

from resolveagent.rag.index.base import VectorStore

logger = logging.getLogger(__name__)


class MilvusStore(VectorStore):
    """Milvus vector store for document embeddings.

    This implementation uses pymilvus to interact with Milvus vector database.
    Supports collection management, vector insertion, and similarity search.

    Features:
    - Collection creation with custom schemas
    - Vector insertion with metadata
    - Approximate nearest neighbor (ANN) search
    - Index management for performance optimization
    """

    def __init__(
        self,
        host: str = "localhost",
        port: int = 19530,
        user: str = "",
        password: str = "",
        database: str = "default",
    ) -> None:
        """Initialize Milvus store.

        Args:
            host: Milvus server host.
            port: Milvus server port.
            user: Username for authentication.
            password: Password for authentication.
            database: Database name.
        """
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.database = database
        self._client = None
        self._connected = False

    async def connect(self) -> None:
        """Connect to Milvus server."""
        try:
            from pymilvus import MilvusClient

            self._client = MilvusClient(
                uri=f"http://{self.host}:{self.port}",
                user=self.user if self.user else None,
                password=self.password if self.password else None,
                db_name=self.database,
            )
            self._connected = True
            logger.info(
                "Connected to Milvus",
                extra={"host": self.host, "port": self.port, "database": self.database},
            )
        except ImportError:
            logger.error("pymilvus not installed. Install with: pip install pymilvus")
            raise
        except Exception as e:
            logger.error("Failed to connect to Milvus", extra={"error": str(e)})
            raise

    async def disconnect(self) -> None:
        """Disconnect from Milvus server."""
        if self._client:
            self._client.close()
            self._connected = False
            logger.info("Disconnected from Milvus")

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
            metric_type: Distance metric (COSINE, L2, IP).
            **kwargs: Additional parameters.

        Returns:
            True if created successfully.
        """
        if not self._connected:
            raise RuntimeError("Not connected to Milvus")

        try:
            from pymilvus import DataType

            # Check if collection already exists
            if self._client.has_collection(collection_name):
                logger.info(f"Collection {collection_name} already exists")
                return True

            # Create schema
            schema = self._client.create_schema(
                auto_id=False,
                enable_dynamic_field=True,
            )

            # Add fields
            schema.add_field(field_name="id", datatype=DataType.VARCHAR, max_length=64, is_primary=True)
            schema.add_field(field_name="vector", datatype=DataType.FLOAT_VECTOR, dim=dimension)
            schema.add_field(field_name="text", datatype=DataType.VARCHAR, max_length=65535)
            schema.add_field(field_name="metadata", datatype=DataType.JSON)

            # Create collection
            self._client.create_collection(
                collection_name=collection_name,
                schema=schema,
            )

            # Create index for vector field
            index_params = self._client.prepare_index_params()
            index_params.add_index(
                field_name="vector",
                metric_type=metric_type,
                index_type="IVF_FLAT",
                params={"nlist": 128},
            )

            self._client.create_index(
                collection_name=collection_name,
                index_params=index_params,
            )

            logger.info(
                f"Created collection {collection_name}",
                extra={"dimension": dimension, "metric_type": metric_type},
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
            raise RuntimeError("Not connected to Milvus")

        try:
            self._client.drop_collection(collection_name)
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
            raise RuntimeError("Not connected to Milvus")

        try:
            collections = self._client.list_collections()
            return collections
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
            raise RuntimeError("Not connected to Milvus")

        if len(vectors) != len(texts):
            raise ValueError("vectors and texts must have same length")

        try:
            # Generate IDs if not provided
            if ids is None:
                import uuid
                ids = [str(uuid.uuid4()) for _ in range(len(vectors))]

            if metadata is None:
                metadata = [{} for _ in range(len(vectors))]

            # Prepare data
            data = [
                {
                    "id": id_,
                    "vector": vector,
                    "text": text,
                    "metadata": meta,
                }
                for id_, vector, text, meta in zip(ids, vectors, texts, metadata)
            ]

            # Insert data
            self._client.insert(collection_name=collection_name, data=data)

            logger.info(
                f"Inserted {len(data)} vectors into {collection_name}",
                extra={"collection": collection_name, "count": len(data)},
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
            raise RuntimeError("Not connected to Milvus")

        try:
            # Build filter expression if provided
            filter_expr = None
            if filters:
                conditions = []
                for key, value in filters.items():
                    if isinstance(value, str):
                        conditions.append(f'metadata["{key}"] == "{value}"')
                    else:
                        conditions.append(f'metadata["{key}"] == {value}')
                filter_expr = " and ".join(conditions)

            # Load collection if not loaded
            self._client.load_collection(collection_name)

            # Search
            results = self._client.search(
                collection_name=collection_name,
                data=[query_vector],
                limit=top_k,
                output_fields=["id", "text", "metadata"],
                filter=filter_expr,
            )

            # Format results
            formatted_results = []
            for hits in results:
                for hit in hits:
                    formatted_results.append({
                        "id": hit.get("id"),
                        "text": hit.get("entity", {}).get("text"),
                        "metadata": hit.get("entity", {}).get("metadata"),
                        "score": hit.get("distance", 0.0),
                    })

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
            raise RuntimeError("Not connected to Milvus")

        try:
            if ids:
                # Delete by IDs
                self._client.delete(
                    collection_name=collection_name,
                    ids=ids,
                )
                logger.info(f"Deleted {len(ids)} entries from {collection_name}")
                return len(ids)

            elif filters:
                # Delete by filter (not directly supported in MilvusClient, use expr)
                # This is a placeholder - actual implementation would use delete with expr
                logger.warning(f"Delete by filter not yet implemented for {collection_name}")
                return 0

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
            raise RuntimeError("Not connected to Milvus")

        try:
            stats = self._client.get_collection_stats(collection_name)
            return {
                "collection_name": collection_name,
                "row_count": stats.get("row_count", 0),
            }
        except Exception as e:
            logger.error(f"Failed to get stats for {collection_name}", extra={"error": str(e)})
            raise


# Compatibility alias for old code
MilvusClient = MilvusStore
