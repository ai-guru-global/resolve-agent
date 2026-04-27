"""End-to-end RAG pipeline orchestration."""

from __future__ import annotations

import hashlib
import logging
import uuid
from typing import Any

from resolveagent.rag.ingest.chunker import TextChunker
from resolveagent.rag.ingest.embedder import Embedder
from resolveagent.rag.retrieve.reranker import Reranker
from resolveagent.rag.retrieve.retriever import Retriever

logger = logging.getLogger(__name__)


class RAGPipeline:
    """Orchestrates the RAG pipeline: ingest, index, retrieve, generate.

    The pipeline supports:
    - Document ingestion (parse, chunk, embed, index)
    - Semantic retrieval (embed query, search, rerank)
    - Augmented generation (inject context into LLM prompt)

    When a rag_document_client is provided, document metadata and
    ingestion history are persisted to the Go platform store.
    """

    def __init__(
        self,
        embedding_model: str = "bge-large-zh",
        vector_backend: str = "milvus",
        rag_document_client: Any | None = None,
    ) -> None:
        self.embedding_model = embedding_model
        self.vector_backend = vector_backend
        self._chunker = TextChunker(strategy="sentence", chunk_size=512, chunk_overlap=50)
        self._embedder = Embedder(model=embedding_model)
        self._retriever = Retriever(vector_backend=vector_backend)
        self._reranker = Reranker()
        self._rag_doc_client = rag_document_client

    async def ingest(
        self,
        collection_id: str,
        documents: list[dict[str, Any]],
        chunker: Any | None = None,
    ) -> dict[str, Any]:
        """Ingest documents into a collection.

        Flow: Parse -> Chunk -> Embed -> Index

        Args:
            collection_id: Target collection ID.
            documents: List of document dicts with 'content' and 'metadata'.
            chunker: Optional TextChunker override. When provided, uses this
                     instead of the pipeline's default chunker.

        Returns:
            Ingestion result with counts.
        """
        logger.info(
            "Ingesting documents",
            extra={"collection": collection_id, "count": len(documents)},
        )

        total_chunks = 0
        errors: list[str] = []

        for doc in documents:
            try:
                content = doc.get("content", "")
                metadata = doc.get("metadata", {})

                if not content:
                    continue

                # Register document metadata in platform store
                doc_id = doc.get("id", str(uuid.uuid4()))
                content_hash = hashlib.sha256(content.encode()).hexdigest()

                if self._rag_doc_client:
                    try:
                        await self._rag_doc_client.create_document(
                            collection_id,
                            {
                                "id": doc_id,
                                "title": metadata.get("title", f"doc-{doc_id[:8]}"),
                                "source_uri": metadata.get("source_uri", ""),
                                "content_hash": content_hash,
                                "content_type": metadata.get("content_type", "text/plain"),
                                "size_bytes": len(content.encode()),
                                "metadata": metadata,
                                "status": "processing",
                            },
                        )
                    except Exception as e:
                        logger.warning("Failed to register document metadata", extra={"error": str(e)})

                # Step 1: Chunk the document
                active_chunker = chunker if chunker is not None else self._chunker
                chunks = active_chunker.chunk(content)
                total_chunks += len(chunks)

                # Step 2: Generate embeddings for chunks
                embeddings = await self._embedder.embed(chunks)

                # Step 3: Index chunks in vector store
                await self._index_chunks(collection_id, chunks, embeddings, metadata)

                # Update document status to indexed
                if self._rag_doc_client:
                    try:
                        await self._rag_doc_client.update_document(
                            doc_id,
                            {"chunk_count": len(chunks), "status": "indexed"},
                        )
                    except Exception as e:
                        logger.warning("Failed to update document status", extra={"error": str(e)})

            except Exception as e:
                error_msg = f"Failed to ingest document: {e}"
                logger.error(error_msg)
                errors.append(error_msg)

        result = {
            "documents_processed": len(documents),
            "chunks_created": total_chunks,
            "errors": errors,
        }

        logger.info(
            "Ingestion completed",
            extra={"collection": collection_id, **result},
        )

        return result

    async def _index_chunks(
        self,
        collection_id: str,
        chunks: list[str],
        embeddings: list[list[float]],
        metadata: dict[str, Any],
    ) -> None:
        """Index chunks into the vector store.

        Args:
            collection_id: Target collection ID.
            chunks: Text chunks.
            embeddings: Embedding vectors.
            metadata: Document metadata.
        """
        from resolveagent.rag.index.milvus import MilvusStore

        # Initialize vector store connection
        store = MilvusStore()
        await store.connect()

        try:
            # Ensure collection exists
            embedding_dim = len(embeddings[0]) if embeddings else 1024
            await store.create_collection(
                collection_name=collection_id,
                dimension=embedding_dim,
                metric_type="COSINE",
            )

            # Prepare metadata for each chunk
            chunk_metadata = [{**metadata, "chunk_index": i, "total_chunks": len(chunks)} for i in range(len(chunks))]

            # Insert chunks into vector store
            await store.insert(
                collection_name=collection_id,
                vectors=embeddings,
                texts=chunks,
                metadata=chunk_metadata,
            )

            logger.debug(
                "Indexed chunks",
                extra={
                    "collection": collection_id,
                    "chunk_count": len(chunks),
                    "embedding_dim": embedding_dim,
                },
            )
        finally:
            await store.disconnect()

    async def query(
        self,
        collection_id: str,
        query: str,
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        """Query a collection for relevant documents.

        Flow: Embed query -> Vector search -> Rerank

        Args:
            collection_id: Collection to search.
            query: Query text.
            top_k: Number of results to return.

        Returns:
            List of retrieved chunks with scores.
        """
        logger.info(
            "Querying collection",
            extra={"collection": collection_id, "query": query[:50], "top_k": top_k},
        )

        try:
            # Step 1: Generate query embedding
            query_embedding = await self._embedder.embed_query(query)

            if not query_embedding:
                logger.warning("Empty query embedding generated")
                return []

            # Step 2: Retrieve candidate chunks from vector store
            candidates = await self._retriever.retrieve(
                collection=collection_id,
                query_embedding=query_embedding,
                top_k=top_k * 2,  # Retrieve more for reranking
            )

            if not candidates:
                logger.info("No candidates found for query")
                return []

            # Step 3: Rerank candidates
            reranked = await self._reranker.rerank(
                query=query,
                chunks=candidates,
                top_k=top_k,
            )

            logger.info(
                "Query completed",
                extra={
                    "collection": collection_id,
                    "candidates": len(candidates),
                    "results": len(reranked),
                },
            )

            return reranked

        except Exception as e:
            logger.error("Query failed", extra={"error": str(e)})
            return []
