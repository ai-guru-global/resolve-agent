"""Code analysis store client for Go platform REST API."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, List

from resolveagent.store.base_client import BaseStoreClient

logger = logging.getLogger(__name__)


@dataclass
class CodeAnalysisInfo:
    """Code analysis run from Go platform."""

    id: str
    name: str
    repository_url: str = ""
    branch: str = ""
    commit_sha: str = ""
    language: str = ""
    analyzer_type: str = ""
    status: str = "pending"
    summary: dict[str, Any] = field(default_factory=dict)
    duration_ms: int = 0
    labels: dict[str, str] = field(default_factory=dict)
    triggered_by: str = ""


@dataclass
class CodeAnalysisFindingInfo:
    """Code analysis finding from Go platform."""

    id: str
    analysis_id: str
    rule_id: str = ""
    severity: str = "info"
    category: str = ""
    message: str = ""
    file_path: str = ""
    line_start: int = 0
    line_end: int = 0
    snippet: str = ""
    suggestion: str = ""


class CodeAnalysisClient(BaseStoreClient):
    """Client for code analysis store operations."""

    async def create(self, analysis: dict[str, Any]) -> dict[str, Any] | None:
        return await self._post("/api/v1/analyses", analysis)

    async def get(self, analysis_id: str) -> CodeAnalysisInfo | None:
        data = await self._get(f"/api/v1/analyses/{analysis_id}")
        if not data:
            return None
        return CodeAnalysisInfo(
            id=data.get("id", analysis_id),
            name=data.get("name", ""),
            repository_url=data.get("repository_url", ""),
            branch=data.get("branch", ""),
            commit_sha=data.get("commit_sha", ""),
            language=data.get("language", ""),
            analyzer_type=data.get("analyzer_type", ""),
            status=data.get("status", "pending"),
            summary=data.get("summary", {}),
            duration_ms=data.get("duration_ms", 0),
            labels=data.get("labels", {}),
            triggered_by=data.get("triggered_by", ""),
        )

    async def list(self) -> List[CodeAnalysisInfo]:
        data = await self._get("/api/v1/analyses")
        if not data:
            return []
        return [
            CodeAnalysisInfo(
                id=a.get("id", ""),
                name=a.get("name", ""),
                repository_url=a.get("repository_url", ""),
                branch=a.get("branch", ""),
                commit_sha=a.get("commit_sha", ""),
                language=a.get("language", ""),
                analyzer_type=a.get("analyzer_type", ""),
                status=a.get("status", "pending"),
                summary=a.get("summary", {}),
                duration_ms=a.get("duration_ms", 0),
                labels=a.get("labels", {}),
                triggered_by=a.get("triggered_by", ""),
            )
            for a in data.get("analyses", [])
        ]

    async def update(self, analysis_id: str, analysis: dict[str, Any]) -> dict[str, Any] | None:
        return await self._put(f"/api/v1/analyses/{analysis_id}", analysis)

    async def delete(self, analysis_id: str) -> dict[str, Any] | None:
        return await self._delete(f"/api/v1/analyses/{analysis_id}")

    async def add_findings(self, analysis_id: str, findings: List[dict[str, Any]]) -> dict[str, Any] | None:
        return await self._post(
            f"/api/v1/analyses/{analysis_id}/findings",
            {"findings": findings},
        )

    async def list_findings(self, analysis_id: str, severity: str | None = None) -> List[CodeAnalysisFindingInfo]:
        params = {}
        if severity:
            params["severity"] = severity
        data = await self._get(f"/api/v1/analyses/{analysis_id}/findings", params=params)
        if not data:
            return []
        return [
            CodeAnalysisFindingInfo(
                id=f.get("id", ""),
                analysis_id=f.get("analysis_id", analysis_id),
                rule_id=f.get("rule_id", ""),
                severity=f.get("severity", "info"),
                category=f.get("category", ""),
                message=f.get("message", ""),
                file_path=f.get("file_path", ""),
                line_start=f.get("line_start", 0),
                line_end=f.get("line_end", 0),
                snippet=f.get("snippet", ""),
                suggestion=f.get("suggestion", ""),
            )
            for f in data.get("findings", [])
        ]
