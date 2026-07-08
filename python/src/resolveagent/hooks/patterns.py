"""
Loop Engineering: Hook Execution Pattern Templates.

Provides the canonical pre-hook -> execute -> post-hook -> feedback pattern
that all hook runners in the ResolveAgent runtime should follow. This ensures
consistent lifecycle management and feedback loop closure across all hooks.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


@dataclass
class HookContext:
    """Context passed through the hook execution chain."""

    request_id: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)
    results: dict[str, Any] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)
    started_at: float = 0.0
    completed_at: float = 0.0


@dataclass
class HookResult:
    """Result of a hook execution step."""

    success: bool
    data: dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    duration_ms: float = 0.0


# Type aliases for hook functions
PreHook = Callable[[HookContext], HookResult]
PostHook = Callable[[HookContext, Any], HookResult]
FeedbackCallback = Callable[[HookContext, dict[str, Any]], None]


class HookChain:
    """
    Executes the Loop Engineering hook pattern:
    pre_hook -> execute -> post_hook -> feedback.

    This is the canonical pattern for all hook execution in the runtime,
    ensuring that every operation closes the feedback loop.

    Example:
        chain = HookChain(
            pre_hooks=[validate_input, enrich_context],
            post_hooks=[log_result, update_metrics],
        )
        result = chain.run(execute_fn, context)
    """

    def __init__(
        self,
        pre_hooks: list[PreHook] | None = None,
        post_hooks: list[PostHook] | None = None,
        feedback_callback: FeedbackCallback | None = None,
    ):
        self.pre_hooks = pre_hooks or []
        self.post_hooks = post_hooks or []
        self.feedback_callback = feedback_callback or self._default_feedback

    def run(
        self,
        execute_fn: Callable[[HookContext], Any],
        context: HookContext,
    ) -> HookResult:
        """Execute the full hook chain: pre -> execute -> post -> feedback."""
        context.started_at = time.time()

        # Phase 1: Pre-hooks (validation, enrichment)
        for hook in self.pre_hooks:
            start = time.time()
            result = hook(context)
            duration = (time.time() - start) * 1000
            if not result.success:
                logger.warning(
                    "Pre-hook failed after %.1fms: %s", duration, result.error
                )
                context.errors.append(f"pre-hook: {result.error}")
                return HookResult(success=False, error=result.error)
            context.results["pre_hook"] = result.data

        # Phase 2: Main execution
        start = time.time()
        try:
            exec_result = execute_fn(context)
            exec_duration = (time.time() - start) * 1000
            context.results["execute"] = {
                "result": exec_result,
                "duration_ms": exec_duration,
            }
        except Exception as e:
            exec_duration = (time.time() - start) * 1000
            logger.error("Execution failed after %.1fms: %s", exec_duration, e)
            context.errors.append(f"execute: {e}")
            context.completed_at = time.time()
            return HookResult(
                success=False,
                error=str(e),
                duration_ms=exec_duration,
            )

        # Phase 3: Post-hooks (logging, metrics, cleanup)
        for hook in self.post_hooks:
            start = time.time()
            result = hook(context, exec_result)
            duration = (time.time() - start) * 1000
            if not result.success:
                logger.warning(
                    "Post-hook failed after %.1fms: %s", duration, result.error
                )
                # Post-hook failures are non-fatal but logged

        # Phase 4: Feedback loop closure
        context.completed_at = time.time()
        feedback_data = {
            "request_id": context.request_id,
            "total_duration_ms": (context.completed_at - context.started_at) * 1000,
            "success": len(context.errors) == 0,
            "error_count": len(context.errors),
            "results": context.results,
        }
        self.feedback_callback(context, feedback_data)

        return HookResult(
            success=len(context.errors) == 0,
            data={"result": exec_result, "feedback": feedback_data},
            duration_ms=(context.completed_at - context.started_at) * 1000,
        )

    @staticmethod
    def _default_feedback(context: HookContext, feedback_data: dict[str, Any]) -> None:
        """Default feedback handler: logs the execution summary."""
        logger.info(
            "Feedback loop: request=%s duration=%.1fms success=%s errors=%d",
            feedback_data.get("request_id", "unknown"),
            feedback_data.get("total_duration_ms", 0),
            feedback_data.get("success", False),
            feedback_data.get("error_count", 0),
        )
