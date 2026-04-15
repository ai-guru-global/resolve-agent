"""RAG document store client for Go platform REST API."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from resolveagent.store.base_client import BaseStoreClient

logger = logging.getLogger(__name__)


@dataclass
class RAGDocumentInfo:
    """RAG document metadata from Go platform."""

    id: str
    collection_id: str
    title: str
    source_uri: str = ""
    content_hash: str = ""
    content_type: str = ""
    chunk_count: int = 0
    status: str = "pending"
    size_bytes: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class RAGIngestionInfo:
    """RAG ingestion record from Go platform."""

    id: str
    collection_id: str
    document_id: str
    action: str
    status: str
    chunks_processed: int = 0
    vectors_created: int = 0
    error: str = ""
    duration_ms: int = 0


class RAGDocumentClient(BaseStoreClient):
    """Client for RAG document store operations."""

    async def create_document(
        self, collection_id: str, doc: dict[str, Any]
    ) -> dict[str, Any] | None:
        return await self._post(f"/api/v1/rag/collections/{collection_id}/documents", doc)

    async def get_document(self, doc_id: str) -> RAGDocumentInfo | None:
        data = await self._get(f"/api/v1/rag/documents/{doc_id}")
        if not data:
            return None
        return RAGDocumentInfo(
            id=data.get("id", doc_id),
            collection_id=data.get("collection_id", ""),
            title=data.get("title", ""),
            source_uri=data.get("source_uri", ""),
            content_hash=data.get("content_hash", ""),
            content_type=data.get("content_type", ""),
            chunk_count=data.get("chunk_count", 0),
            status=data.get("status", "pending"),
            size_bytes=data.get("size_bytes", 0),
            metadata=data.get("metadata", {}),
        )

    async def list_documents(self, collection_id: str) -> list[RAGDocumentInfo]:
        data = await self._get(f"/api/v1/rag/collections/{collection_id}/documents")
        if not data:
            return []
        return [
            RAGDocumentInfo(
                id=d.get("id", ""),
                collection_id=d.get("collection_id", collection_id),
                title=d.get("title", ""),
                source_uri=d.get("source_uri", ""),
                content_hash=d.get("content_hash", ""),
                content_type=d.get("content_type", ""),
                chunk_count=d.get("chunk_count", 0),
                status=d.get("status", "pending"),
                size_bytes=d.get("size_bytes", 0),
                metadata=d.get("metadata", {}),
            )
            for d in data.get("documents", [])
        ]

    async def update_document(
        self, doc_id: str, doc: dict[str, Any]
    ) -> dict[str, Any] | None:
        return await self._put(f"/api/v1/rag/documents/{doc_id}", doc)

    async def delete_document(self, doc_id: str) -> dict[str, Any] | None:
        return await self._delete(f"/api/v1/rag/documents/{doc_id}")

    async def list_ingestions(self, collection_id: str) -> list[RAGIngestionInfo]:
        data = await self._get(f"/api/v1/rag/collections/{collection_id}/ingestions")
        if not data:
            return []
        return [
            RAGIngestionInfo(
                id=r.get("id", ""),
                collection_id=r.get("collection_id", collection_id),
                document_id=r.get("document_id", ""),
                action=r.get("action", ""),
                status=r.get("status", ""),
                chunks_processed=r.get("chunks_processed", 0),
                vectors_created=r.get("vectors_created", 0),
                error=r.get("error", ""),
                duration_ms=r.get("duration_ms", 0),
            )
            for r in data.get("ingestions", [])
        ]
