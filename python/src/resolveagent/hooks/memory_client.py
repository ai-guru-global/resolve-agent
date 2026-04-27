"""In-memory HookClient for development and testing.

Drop-in replacement for the real HookClient that stores hook
definitions in memory instead of querying the Go platform.
"""

from __future__ import annotations

import uuid
from typing import Any, List

from resolveagent.store.hook_client import HookExecutionInfo, HookInfo


class InMemoryHookClient:
    """In-memory hook store that does not depend on the Go platform."""

    def __init__(self) -> None:
        self._hooks: dict[str, HookInfo] = {}
        self._executions: dict[str, list[HookExecutionInfo]] = {}

    # --- CRUD matching HookClient signatures ---

    async def create(self, hook: dict[str, Any]) -> dict[str, Any] | None:
        """Create a new hook definition."""
        hook_id = hook.get("id") or str(uuid.uuid4())
        info = HookInfo(
            id=hook_id,
            name=hook.get("name", ""),
            hook_type=hook.get("hook_type", "pre"),
            trigger_point=hook.get("trigger_point", ""),
            target_id=hook.get("target_id", ""),
            execution_order=hook.get("execution_order", 0),
            handler_type=hook.get("handler_type", "script"),
            config=hook.get("config", {}),
            enabled=hook.get("enabled", True),
            labels=hook.get("labels", {}),
        )
        self._hooks[hook_id] = info
        return {"id": hook_id}

    async def get(self, hook_id: str) -> HookInfo | None:
        return self._hooks.get(hook_id)

    async def list(self) -> List[HookInfo]:
        return list(self._hooks.values())

    async def update(self, hook_id: str, hook: dict[str, Any]) -> dict[str, Any] | None:
        existing = self._hooks.get(hook_id)
        if existing is None:
            return None
        for attr in (
            "name",
            "hook_type",
            "trigger_point",
            "target_id",
            "execution_order",
            "handler_type",
            "config",
            "enabled",
            "labels",
        ):
            if attr in hook:
                setattr(existing, attr, hook[attr])
        return {"id": hook_id}

    async def delete(self, hook_id: str) -> dict[str, Any] | None:
        if hook_id in self._hooks:
            del self._hooks[hook_id]
            return {"id": hook_id}
        return None

    async def list_executions(self, hook_id: str) -> List[HookExecutionInfo]:
        return self._executions.get(hook_id, [])
