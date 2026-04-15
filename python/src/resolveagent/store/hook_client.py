"""Hook store client for Go platform REST API."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from resolveagent.store.base_client import BaseStoreClient

logger = logging.getLogger(__name__)


@dataclass
class HookInfo:
    """Hook definition from Go platform."""

    id: str
    name: str
    hook_type: str  # "pre" or "post"
    trigger_point: str  # "agent.execute", "skill.invoke", "workflow.run"
    target_id: str = ""
    execution_order: int = 0
    handler_type: str = "script"
    config: dict[str, Any] = field(default_factory=dict)
    enabled: bool = True
    labels: dict[str, str] = field(default_factory=dict)


@dataclass
class HookExecutionInfo:
    """Hook execution record from Go platform."""

    id: str
    hook_id: str
    trigger_event: str
    status: str
    duration_ms: int = 0
    error: str = ""


class HookClient(BaseStoreClient):
    """Client for hook store operations."""

    async def create(self, hook: dict[str, Any]) -> dict[str, Any] | None:
        return await self._post("/api/v1/hooks", hook)

    async def get(self, hook_id: str) -> HookInfo | None:
        data = await self._get(f"/api/v1/hooks/{hook_id}")
        if not data:
            return None
        return HookInfo(
            id=data.get("id", hook_id),
            name=data.get("name", ""),
            hook_type=data.get("hook_type", ""),
            trigger_point=data.get("trigger_point", ""),
            target_id=data.get("target_id", ""),
            execution_order=data.get("execution_order", 0),
            handler_type=data.get("handler_type", "script"),
            config=data.get("config", {}),
            enabled=data.get("enabled", True),
            labels=data.get("labels", {}),
        )

    async def list(self) -> list[HookInfo]:
        data = await self._get("/api/v1/hooks")
        if not data:
            return []
        return [
            HookInfo(
                id=h.get("id", ""),
                name=h.get("name", ""),
                hook_type=h.get("hook_type", ""),
                trigger_point=h.get("trigger_point", ""),
                target_id=h.get("target_id", ""),
                execution_order=h.get("execution_order", 0),
                handler_type=h.get("handler_type", "script"),
                config=h.get("config", {}),
                enabled=h.get("enabled", True),
                labels=h.get("labels", {}),
            )
            for h in data.get("hooks", [])
        ]

    async def update(self, hook_id: str, hook: dict[str, Any]) -> dict[str, Any] | None:
        return await self._put(f"/api/v1/hooks/{hook_id}", hook)

    async def delete(self, hook_id: str) -> dict[str, Any] | None:
        return await self._delete(f"/api/v1/hooks/{hook_id}")

    async def list_executions(self, hook_id: str) -> list[HookExecutionInfo]:
        data = await self._get(f"/api/v1/hooks/{hook_id}/executions")
        if not data:
            return []
        return [
            HookExecutionInfo(
                id=e.get("id", ""),
                hook_id=e.get("hook_id", hook_id),
                trigger_event=e.get("trigger_event", ""),
                status=e.get("status", ""),
                duration_ms=e.get("duration_ms", 0),
                error=e.get("error", ""),
            )
            for e in data.get("executions", [])
        ]
