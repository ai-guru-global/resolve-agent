"""Solution store client for Go platform REST API."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from resolveagent.store.base_client import BaseStoreClient

logger = logging.getLogger(__name__)


@dataclass
class SolutionInfo:
    """Troubleshooting solution from Go platform."""

    id: str
    title: str
    problem_symptoms: str
    key_information: str = ""
    troubleshooting_steps: str = ""
    resolution_steps: str = ""
    domain: str = ""
    component: str = ""
    severity: str = "medium"
    tags: list[str] = field(default_factory=list)
    search_keywords: str = ""
    version: int = 1
    status: str = "active"
    source_uri: str = ""
    rag_collection_id: str = ""
    rag_document_id: str = ""
    related_skill_names: list[str] = field(default_factory=list)
    related_workflow_ids: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    created_by: str = ""


@dataclass
class SolutionExecutionInfo:
    """Solution execution record from Go platform."""

    id: str
    solution_id: str
    executor: str = ""
    status: str = ""
    outcome_notes: str = ""
    effectiveness_score: float = 0.0
    duration_ms: int = 0


def _parse_solution(data: dict[str, Any]) -> SolutionInfo:
    """Parse raw dict into SolutionInfo."""
    return SolutionInfo(
        id=data.get("id", ""),
        title=data.get("title", ""),
        problem_symptoms=data.get("problem_symptoms", ""),
        key_information=data.get("key_information", ""),
        troubleshooting_steps=data.get("troubleshooting_steps", ""),
        resolution_steps=data.get("resolution_steps", ""),
        domain=data.get("domain", ""),
        component=data.get("component", ""),
        severity=data.get("severity", "medium"),
        tags=data.get("tags", []),
        search_keywords=data.get("search_keywords", ""),
        version=data.get("version", 1),
        status=data.get("status", "active"),
        source_uri=data.get("source_uri", ""),
        rag_collection_id=data.get("rag_collection_id", ""),
        rag_document_id=data.get("rag_document_id", ""),
        related_skill_names=data.get("related_skill_names", []),
        related_workflow_ids=data.get("related_workflow_ids", []),
        metadata=data.get("metadata", {}),
        created_by=data.get("created_by", ""),
    )


class SolutionClient(BaseStoreClient):
    """Client for troubleshooting solution store operations."""

    async def create(self, solution: dict[str, Any]) -> dict[str, Any] | None:
        """Create a new solution."""
        return await self._post("/api/v1/solutions", solution)

    async def get(self, solution_id: str) -> SolutionInfo | None:
        """Get a solution by ID."""
        data = await self._get(f"/api/v1/solutions/{solution_id}")
        if not data:
            return None
        return _parse_solution(data)

    async def list(
        self,
        domain: str = "",
        severity: str = "",
        status: str = "",
        limit: int = 100,
        offset: int = 0,
    ) -> list[SolutionInfo]:
        """List solutions with optional filters."""
        params: dict[str, Any] = {"limit": limit, "offset": offset}
        if domain:
            params["domain"] = domain
        if severity:
            params["severity"] = severity
        if status:
            params["status"] = status

        data = await self._get("/api/v1/solutions", params=params)
        if not data:
            return []
        return [_parse_solution(s) for s in data.get("solutions", [])]

    async def update(
        self, solution_id: str, solution: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Update a solution."""
        return await self._put(f"/api/v1/solutions/{solution_id}", solution)

    async def delete(self, solution_id: str) -> dict[str, Any] | None:
        """Delete a solution."""
        return await self._delete(f"/api/v1/solutions/{solution_id}")

    async def search(
        self,
        keyword: str = "",
        domain: str = "",
        component: str = "",
        severity: str = "",
        tags: list[str] | None = None,
        status: str = "",
        limit: int = 20,
        offset: int = 0,
    ) -> list[SolutionInfo]:
        """Search solutions with domain-specific filters."""
        payload: dict[str, Any] = {"limit": limit, "offset": offset}
        if keyword:
            payload["keyword"] = keyword
        if domain:
            payload["domain"] = domain
        if component:
            payload["component"] = component
        if severity:
            payload["severity"] = severity
        if tags:
            payload["tags"] = tags
        if status:
            payload["status"] = status

        data = await self._post("/api/v1/solutions/search", payload)
        if not data:
            return []
        return [_parse_solution(s) for s in data.get("solutions", [])]

    async def bulk_create(
        self, solutions: list[dict[str, Any]]
    ) -> int:
        """Bulk create solutions. Returns count of created items."""
        data = await self._post("/api/v1/solutions/bulk", {"solutions": solutions})
        if not data:
            return 0
        return data.get("created", 0)

    async def record_execution(
        self, solution_id: str, execution: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Record a solution execution."""
        return await self._post(
            f"/api/v1/solutions/{solution_id}/executions", execution
        )

    async def list_executions(
        self, solution_id: str
    ) -> list[SolutionExecutionInfo]:
        """List executions for a solution."""
        data = await self._get(f"/api/v1/solutions/{solution_id}/executions")
        if not data:
            return []
        return [
            SolutionExecutionInfo(
                id=e.get("id", ""),
                solution_id=e.get("solution_id", solution_id),
                executor=e.get("executor", ""),
                status=e.get("status", ""),
                outcome_notes=e.get("outcome_notes", ""),
                effectiveness_score=e.get("effectiveness_score", 0.0),
                duration_ms=e.get("duration_ms", 0),
            )
            for e in data.get("executions", [])
        ]
