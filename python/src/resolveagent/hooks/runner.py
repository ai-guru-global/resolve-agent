"""Hook execution runner for lifecycle hooks."""

from __future__ import annotations

import logging
import time
import uuid
from typing import Any

from resolveagent.hooks.models import HookContext, HookResult
from resolveagent.store.hook_client import HookClient, HookInfo

logger = logging.getLogger(__name__)


class HookRunner:
    """Executes lifecycle hooks around agent operations.

    Loads hook definitions from the Go platform via HookClient,
    executes them in order, and records execution results.

    Example:
        ```python
        runner = HookRunner(hook_client)
        ctx = HookContext(
            trigger_point="agent.execute",
            hook_type="pre",
            target_id="agent-123",
            input_data={"message": "hello"},
        )
        results = await runner.run(ctx)
        ```
    """

    def __init__(self, hook_client: HookClient) -> None:
        self._client = hook_client
        self._handlers: dict[str, Any] = {}

    def register_handler(self, handler_type: str, handler: Any) -> None:
        """Register a local hook handler by type.

        Args:
            handler_type: The handler type name (e.g., "log", "transform").
            handler: Async callable that takes HookContext and returns HookResult.
        """
        self._handlers[handler_type] = handler

    async def run(self, ctx: HookContext) -> list[HookResult]:
        """Execute all matching hooks for the given context.

        Hooks are executed in execution_order. Pre-hooks can modify
        input data; post-hooks receive output data.

        Args:
            ctx: The hook execution context.

        Returns:
            List of HookResult for each executed hook.
        """
        hooks = await self._client.list()

        # Filter matching hooks
        matching = [
            h
            for h in hooks
            if h.enabled
            and h.trigger_point == ctx.trigger_point
            and h.hook_type == ctx.hook_type
            and (not h.target_id or h.target_id == ctx.target_id)
        ]

        # Sort by execution order
        matching.sort(key=lambda h: h.execution_order)

        results: list[HookResult] = []

        for hook in matching:
            start = time.monotonic()
            result = await self._execute_hook(hook, ctx)
            result.duration_ms = int((time.monotonic() - start) * 1000)
            results.append(result)

            # Record execution to Go platform
            await self._record_execution(hook, ctx, result)

            if result.skip_remaining:
                logger.info(
                    "Hook requested skip remaining",
                    extra={"hook_id": hook.id, "hook_name": hook.name},
                )
                break

            # Apply modified data back to context for chaining
            if result.success and result.modified_data:
                if ctx.hook_type == "pre":
                    ctx.input_data.update(result.modified_data)
                else:
                    ctx.output_data.update(result.modified_data)

        return results

    async def _execute_hook(self, hook: HookInfo, ctx: HookContext) -> HookResult:
        """Execute a single hook.

        Args:
            hook: The hook definition.
            ctx: The hook context.

        Returns:
            HookResult from the execution.
        """
        handler = self._handlers.get(hook.handler_type)
        if not handler:
            logger.warning(
                "No handler registered for hook type",
                extra={"handler_type": hook.handler_type, "hook_id": hook.id},
            )
            return HookResult(success=True)

        try:
            result = await handler(ctx)
            if not isinstance(result, HookResult):
                result = HookResult(success=True)
            return result
        except Exception as e:
            logger.error(
                "Hook execution failed",
                extra={"hook_id": hook.id, "error": str(e)},
            )
            return HookResult(success=False, error=str(e))

    async def _record_execution(
        self, hook: HookInfo, ctx: HookContext, result: HookResult
    ) -> None:
        """Record hook execution to Go platform.

        Args:
            hook: The hook that was executed.
            ctx: The hook context.
            result: The execution result.
        """
        # This is a best-effort recording; don't fail the hook chain on errors
        try:
            # The execution is recorded via the router endpoint indirectly
            # when hooks are managed by the Go platform
            logger.debug(
                "Hook executed",
                extra={
                    "hook_id": hook.id,
                    "hook_name": hook.name,
                    "success": result.success,
                    "duration_ms": result.duration_ms,
                },
            )
        except Exception as e:
            logger.warning(
                "Failed to record hook execution",
                extra={"hook_id": hook.id, "error": str(e)},
            )
