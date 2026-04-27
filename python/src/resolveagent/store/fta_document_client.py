"""FTA document store client for Go platform REST API."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from resolveagent.store.base_client import BaseStoreClient

logger = logging.getLogger(__name__)


@dataclass
class FTADocumentInfo:
    """FTA document from Go platform."""

    id: str
    name: str
    workflow_id: str = ""
    description: str = ""
    fault_tree: dict[str, Any] = field(default_factory=dict)
    version: int = 1
    status: str = "draft"
    metadata: dict[str, Any] = field(default_factory=dict)
    labels: dict[str, str] = field(default_factory=dict)
    created_by: str = ""


@dataclass
class FTAAnalysisResultInfo:
    """FTA analysis result from Go platform."""

    id: str
    document_id: str
    execution_id: str = ""
    top_event_result: bool = False
    status: str = "completed"
    duration_ms: int = 0
    minimal_cut_sets: list[Any] = field(default_factory=list)
    importance_measures: dict[str, Any] = field(default_factory=dict)


class FTADocumentClient(BaseStoreClient):
    """Client for FTA document store operations."""

    async def create_document(self, doc: dict[str, Any]) -> dict[str, Any] | None:
        return await self._post("/api/v1/fta/documents", doc)

    async def get_document(self, doc_id: str) -> FTADocumentInfo | None:
        data = await self._get(f"/api/v1/fta/documents/{doc_id}")
        if not data:
            return None
        return FTADocumentInfo(
            id=data.get("id", doc_id),
            name=data.get("name", ""),
            workflow_id=data.get("workflow_id", ""),
            description=data.get("description", ""),
            fault_tree=data.get("fault_tree", {}),
            version=data.get("version", 1),
            status=data.get("status", "draft"),
            metadata=data.get("metadata", {}),
            labels=data.get("labels", {}),
            created_by=data.get("created_by", ""),
        )

    async def list_documents(self) -> list[FTADocumentInfo]:
        data = await self._get("/api/v1/fta/documents")
        if not data:
            return []
        return [
            FTADocumentInfo(
                id=d.get("id", ""),
                name=d.get("name", ""),
                workflow_id=d.get("workflow_id", ""),
                description=d.get("description", ""),
                fault_tree=d.get("fault_tree", {}),
                version=d.get("version", 1),
                status=d.get("status", "draft"),
                metadata=d.get("metadata", {}),
                labels=d.get("labels", {}),
                created_by=d.get("created_by", ""),
            )
            for d in data.get("documents", [])
        ]

    async def update_document(self, doc_id: str, doc: dict[str, Any]) -> dict[str, Any] | None:
        return await self._put(f"/api/v1/fta/documents/{doc_id}", doc)

    async def delete_document(self, doc_id: str) -> dict[str, Any] | None:
        return await self._delete(f"/api/v1/fta/documents/{doc_id}")

    async def create_result(self, doc_id: str, result: dict[str, Any]) -> dict[str, Any] | None:
        return await self._post(f"/api/v1/fta/documents/{doc_id}/results", result)

    async def list_results(self, doc_id: str) -> list[FTAAnalysisResultInfo]:
        data = await self._get(f"/api/v1/fta/documents/{doc_id}/results")
        if not data:
            return []
        return [
            FTAAnalysisResultInfo(
                id=r.get("id", ""),
                document_id=r.get("document_id", doc_id),
                execution_id=r.get("execution_id", ""),
                top_event_result=r.get("top_event_result", False),
                status=r.get("status", "completed"),
                duration_ms=r.get("duration_ms", 0),
                minimal_cut_sets=r.get("minimal_cut_sets", []),
                importance_measures=r.get("importance_measures", {}),
            )
            for r in data.get("results", [])
        ]
