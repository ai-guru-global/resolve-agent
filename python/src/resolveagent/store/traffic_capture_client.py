"""Traffic capture store client for Go platform REST API."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, List

from resolveagent.store.base_client import BaseStoreClient

logger = logging.getLogger(__name__)


@dataclass
class TrafficCaptureInfo:
    """Traffic capture session from Go platform."""

    id: str
    name: str
    source_type: str = ""
    target_service: str = ""
    status: str = "pending"
    config: dict[str, Any] = field(default_factory=dict)
    summary: dict[str, Any] = field(default_factory=dict)
    labels: dict[str, str] = field(default_factory=dict)


@dataclass
class TrafficRecordInfo:
    """Traffic record from Go platform."""

    id: str
    capture_id: str
    source_service: str = ""
    dest_service: str = ""
    protocol: str = ""
    method: str = ""
    path: str = ""
    status_code: int = 0
    latency_ms: int = 0
    request_size: int = 0
    response_size: int = 0
    trace_id: str = ""
    span_id: str = ""
    timestamp: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


class TrafficCaptureClient(BaseStoreClient):
    """Client for traffic capture store operations."""

    async def create(self, capture: dict[str, Any]) -> dict[str, Any] | None:
        return await self._post("/api/v1/traffic/captures", capture)

    async def get(self, capture_id: str) -> TrafficCaptureInfo | None:
        data = await self._get(f"/api/v1/traffic/captures/{capture_id}")
        if not data:
            return None
        return TrafficCaptureInfo(
            id=data.get("id", capture_id),
            name=data.get("name", ""),
            source_type=data.get("source_type", ""),
            target_service=data.get("target_service", ""),
            status=data.get("status", "pending"),
            config=data.get("config", {}),
            summary=data.get("summary", {}),
            labels=data.get("labels", {}),
        )

    async def list(self) -> List[TrafficCaptureInfo]:
        data = await self._get("/api/v1/traffic/captures")
        if not data:
            return []
        return [
            TrafficCaptureInfo(
                id=c.get("id", ""),
                name=c.get("name", ""),
                source_type=c.get("source_type", ""),
                target_service=c.get("target_service", ""),
                status=c.get("status", "pending"),
                config=c.get("config", {}),
                summary=c.get("summary", {}),
                labels=c.get("labels", {}),
            )
            for c in data.get("captures", [])
        ]

    async def update(self, capture_id: str, capture: dict[str, Any]) -> dict[str, Any] | None:
        return await self._put(f"/api/v1/traffic/captures/{capture_id}", capture)

    async def delete(self, capture_id: str) -> dict[str, Any] | None:
        return await self._delete(f"/api/v1/traffic/captures/{capture_id}")

    async def add_records(self, capture_id: str, records: List[dict[str, Any]]) -> dict[str, Any] | None:
        return await self._post(
            f"/api/v1/traffic/captures/{capture_id}/records",
            {"records": records},
        )

    async def list_records(self, capture_id: str) -> List[TrafficRecordInfo]:
        data = await self._get(f"/api/v1/traffic/captures/{capture_id}/records")
        if not data:
            return []
        return [
            TrafficRecordInfo(
                id=r.get("id", ""),
                capture_id=r.get("capture_id", capture_id),
                source_service=r.get("source_service", ""),
                dest_service=r.get("dest_service", ""),
                protocol=r.get("protocol", ""),
                method=r.get("method", ""),
                path=r.get("path", ""),
                status_code=r.get("status_code", 0),
                latency_ms=r.get("latency_ms", 0),
                request_size=r.get("request_size", 0),
                response_size=r.get("response_size", 0),
                trace_id=r.get("trace_id", ""),
                span_id=r.get("span_id", ""),
                timestamp=r.get("timestamp", ""),
                metadata=r.get("metadata", {}),
            )
            for r in data.get("records", [])
        ]
