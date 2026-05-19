"""Resilient Selector — Feedback-driven adaptive routing with graceful degradation.

Converts the one-shot Intelligent Selector into a retry-capable routing engine
that learns from failures and progressively degrades through route types.

Degradation path:
    Skill (fast, precise) → RAG (knowledge) → FTA/Workflow (reasoning) → Code Analysis (deep fallback)

Each failure enriches the context for the next routing attempt, making
subsequent decisions smarter. The system only truly fails when even
Code Analysis cannot resolve the request.

Architecture nesting:
    ResilientSelector (route-level)
        → FallbackCascade (tool-level, inside each route)
            → HybridPlanner.replan (step-level, inside FTA/Workflow)
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Awaitable

from resolveagent.selector.selector import IntelligentSelector, RouteDecision

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class RouteAttempt:
    """Record of a single routing attempt."""

    route_type: str
    route_target: str
    success: bool
    error: str | None = None
    latency_ms: float = 0.0
    result_summary: str = ""
    attempt_number: int = 0


@dataclass
class RoutingSession:
    """Complete routing session — may contain multiple attempts."""

    session_id: str
    original_input: str
    agent_id: str
    attempts: list[RouteAttempt] = field(default_factory=list)
    final_result: Any | None = None
    final_route: str = ""
    success: bool = False
    total_latency_ms: float = 0.0

    @property
    def attempt_count(self) -> int:
        return len(self.attempts)

    def to_dict(self) -> dict[str, Any]:
        return {
            "session_id": self.session_id,
            "original_input": self.original_input[:200],
            "agent_id": self.agent_id,
            "attempt_count": self.attempt_count,
            "success": self.success,
            "final_route": self.final_route,
            "total_latency_ms": round(self.total_latency_ms, 2),
            "attempts": [
                {
                    "route_type": a.route_type,
                    "route_target": a.route_target,
                    "success": a.success,
                    "error": a.error,
                    "latency_ms": round(a.latency_ms, 2),
                }
                for a in self.attempts
            ],
        }


@dataclass
class ResilientConfig:
    """Configuration for the Resilient Selector."""

    max_retries: int = 3
    total_timeout_seconds: float = 30.0
    route_priority: list[str] = field(
        default_factory=lambda: ["skill", "rag", "fta", "code_analysis"]
    )
    enable_cache_bypass_on_retry: bool = True
    enable_circuit_breaker: bool = True
    fallback_to_code_analysis: bool = True


# ---------------------------------------------------------------------------
# Re-enrichment strategy
# ---------------------------------------------------------------------------

class ReEnricher:
    """Incremental context re-enrichment after routing failures.

    Instead of re-running the full ContextEnricher pipeline,
    this class incrementally adds failure information to the context,
    making subsequent routing decisions aware of what already failed.
    """

    def re_enrich(
        self,
        context: dict[str, Any],
        last_attempt: RouteAttempt,
        all_attempts: list[RouteAttempt],
    ) -> dict[str, Any]:
        """Incrementally enrich context with failure information.

        Args:
            context: Current enriched context dict.
            last_attempt: The most recent failed attempt.
            all_attempts: All previous attempts in this session.

        Returns:
            Updated context with failure information.
        """
        ctx = dict(context)

        # Track attempted routes
        attempted = ctx.get("attempted_routes", [])
        attempted.append(last_attempt.route_type)
        ctx["attempted_routes"] = attempted

        # Record last failure details
        ctx["last_failure"] = {
            "route": last_attempt.route_type,
            "target": last_attempt.route_target,
            "error": last_attempt.error or "unknown",
            "latency_ms": last_attempt.latency_ms,
        }

        # Calculate attempt count
        ctx["attempt_count"] = len(all_attempts)

        # Generate routing preference adjustments
        ctx["route_preferences"] = self._compute_preferences(
            all_attempts, ctx.get("route_preferences", {})
        )

        # Lower enrichment confidence after failures
        base_confidence = ctx.get("enrichment_confidence", 1.0)
        ctx["enrichment_confidence"] = max(0.3, base_confidence - 0.15 * len(all_attempts))

        logger.info(
            "Context re-enriched",
            extra={
                "attempt_count": len(all_attempts),
                "failed_route": last_attempt.route_type,
                "attempted_routes": attempted,
            },
        )

        return ctx

    def _compute_preferences(
        self,
        attempts: list[RouteAttempt],
        existing: dict[str, Any],
    ) -> dict[str, Any]:
        """Compute routing preferences based on failure history.

        Returns preference adjustments that guide the next routing decision
        away from failed routes and toward potentially successful ones.
        """
        prefs = dict(existing)
        failed_routes = {a.route_type for a in attempts if not a.success}

        # Mark failed routes as dispreferred
        prefs["dispreferred_routes"] = list(failed_routes)

        # Suggest next route based on failure pattern
        for attempt in reversed(attempts):
            if attempt.route_type == "rag" and not attempt.success:
                if "no results" in (attempt.error or "").lower() or "empty" in (attempt.error or "").lower():
                    prefs["prefer_reasoning"] = True  # RAG had no docs, try LLM reasoning
                break
            if attempt.route_type == "skill" and not attempt.success:
                prefs["prefer_knowledge"] = True  # Skill failed, try knowledge-based
                break
            if attempt.route_type == "fta" and not attempt.success:
                prefs["prefer_analysis"] = True  # Workflow failed, try deep analysis
                break

        return prefs


# ---------------------------------------------------------------------------
# Resilient Selector
# ---------------------------------------------------------------------------

class ResilientSelector:
    """Feedback-driven adaptive router with graceful degradation.

    Wraps IntelligentSelector with retry logic, incremental re-enrichment,
    and progressive degradation through route types.

    Example:
        >>> selector = ResilientSelector()
        >>> session = await selector.route_and_execute(
        ...     input_text="diagnose the 503 error",
        ...     agent_id="ops-agent",
        ...     executor=my_executor_function,
        ... )
        >>> if session.success:
        ...     print(f"Solved via {session.final_route} in {session.attempt_count} attempts")
        >>> else:
        ...     print("All routes exhausted")
    """

    def __init__(
        self,
        selector: IntelligentSelector | None = None,
        config: ResilientConfig | None = None,
    ) -> None:
        """Initialize the Resilient Selector.

        Args:
            selector: The underlying IntelligentSelector to use for routing.
                If None, creates a new one with default settings.
            config: Configuration for retry behavior. Uses defaults if None.
        """
        self._selector = selector or IntelligentSelector(strategy="hybrid")
        self._config = config or ResilientConfig()
        self._re_enricher = ReEnricher()
        self._session_counter = 0

    async def route_and_execute(
        self,
        input_text: str,
        agent_id: str,
        executor: Callable[[RouteDecision], Awaitable[Any]],
        context: dict[str, Any] | None = None,
    ) -> RoutingSession:
        """Route a request with automatic retry on failure.

        Executes the following loop:
        1. Route to the best available target
        2. Execute via the provided executor
        3. If failed: re-enrich context with failure info, re-route
        4. Repeat up to max_retries times
        5. Final fallback: Code Analysis
        6. If still fails: return failure session

        Args:
            input_text: The user input to route and execute.
            agent_id: The agent processing this request.
            executor: Async function that takes a RouteDecision and returns
                a result. Should have a .success attribute or return an
                object with .success, or raise an exception on failure.
            context: Optional initial context.

        Returns:
            RoutingSession with full attempt history.
        """
        self._session_counter += 1
        session = RoutingSession(
            session_id=f"resilient-{self._session_counter}",
            original_input=input_text,
            agent_id=agent_id,
        )

        start_time = time.monotonic()
        ctx = context or {}
        tried_routes: set[str] = set()

        for attempt_num in range(self._config.max_retries + 1):
            # Timeout check
            elapsed = time.monotonic() - start_time
            if elapsed > self._config.total_timeout_seconds:
                logger.warning(
                    "Routing session timed out",
                    extra={"session_id": session.session_id, "elapsed_s": round(elapsed, 2)},
                )
                break

            # Route decision
            bypass_cache = (
                self._config.enable_cache_bypass_on_retry and attempt_num > 0
            )
            decision = await self._selector.route(
                input_text=input_text,
                agent_id=agent_id,
                context=ctx,
                bypass_cache=bypass_cache,
            )

            # Skip already-tried routes (force different route)
            if decision.route_type in tried_routes and attempt_num > 0:
                decision = self._force_alternative_route(
                    decision, tried_routes, ctx
                )

            # Execute
            attempt_start = time.monotonic()
            attempt_record = await self._execute_route(
                decision, executor, attempt_num + 1
            )
            attempt_record.latency_ms = (time.monotonic() - attempt_start) * 1000

            session.attempts.append(attempt_record)
            tried_routes.add(decision.route_type)

            # Success → return
            if attempt_record.success:
                session.success = True
                session.final_result = attempt_record.result_summary
                session.final_route = decision.route_type
                break

            # Failure → re-enrich for next attempt
            if attempt_num < self._config.max_retries:
                ctx = self._re_enricher.re_enrich(
                    ctx, attempt_record, session.attempts
                )

        # Final fallback: Code Analysis (if not already tried)
        if (
            not session.success
            and self._config.fallback_to_code_analysis
            and "code_analysis" not in tried_routes
        ):
            fallback_decision = RouteDecision(
                route_type="code_analysis",
                route_target="static-analysis",
                confidence=0.5,
                reasoning="ResilientSelector: final fallback to code analysis",
                parameters={"fallback": True, "session_id": session.session_id},
            )
            attempt_start = time.monotonic()
            fallback_record = await self._execute_route(
                fallback_decision, executor, len(session.attempts) + 1
            )
            fallback_record.latency_ms = (time.monotonic() - attempt_start) * 1000
            session.attempts.append(fallback_record)

            if fallback_record.success:
                session.success = True
                session.final_result = fallback_record.result_summary
                session.final_route = "code_analysis"

        session.total_latency_ms = (time.monotonic() - start_time) * 1000

        logger.info(
            "Routing session complete",
            extra={
                "session_id": session.session_id,
                "success": session.success,
                "attempt_count": session.attempt_count,
                "final_route": session.final_route,
                "total_latency_ms": round(session.total_latency_ms, 2),
            },
        )

        return session

    async def _execute_route(
        self,
        decision: RouteDecision,
        executor: Callable[[RouteDecision], Awaitable[Any]],
        attempt_number: int,
    ) -> RouteAttempt:
        """Execute a route and capture the result.

        Handles multiple result formats:
        - Objects with .success attribute
        - Exceptions (treated as failure)
        """
        try:
            result = await executor(decision)

            # Handle different result formats
            if hasattr(result, "success"):
                success = bool(result.success)
                summary = getattr(result, "output", "") or getattr(result, "data", "") or str(result)[:200]
                error = getattr(result, "error", None)
            elif isinstance(result, dict):
                success = bool(result.get("success", False))
                summary = str(result.get("output", result.get("data", "")))[:200]
                error = result.get("error")
            else:
                success = result is not None
                summary = str(result)[:200] if result else ""
                error = None if success else "Empty result"

            return RouteAttempt(
                route_type=decision.route_type,
                route_target=decision.route_target,
                success=success,
                error=error,
                result_summary=summary,
                attempt_number=attempt_number,
            )

        except Exception as e:
            logger.warning(
                "Route execution failed",
                extra={
                    "route_type": decision.route_type,
                    "route_target": decision.route_target,
                    "error": str(e),
                    "attempt": attempt_number,
                },
            )
            return RouteAttempt(
                route_type=decision.route_type,
                route_target=decision.route_target,
                success=False,
                error=str(e)[:500],
                attempt_number=attempt_number,
            )

    def _force_alternative_route(
        self,
        original: RouteDecision,
        tried: set[str],
        context: dict[str, Any],
    ) -> RouteDecision:
        """Force a different route when the original was already tried.

        Follows the route priority order and picks the next untried route.
        """
        available = [
            r for r in self._config.route_priority if r not in tried
        ]

        if not available:
            # All routes tried — return original (will trigger fallback)
            return original

        next_route = available[0]
        prefs = context.get("route_preferences", {})

        # Apply preference adjustments
        if prefs.get("prefer_reasoning") and "fta" in available:
            next_route = "fta"
        elif prefs.get("prefer_knowledge") and "rag" in available:
            next_route = "rag"
        elif prefs.get("prefer_analysis") and "code_analysis" in available:
            next_route = "code_analysis"

        logger.info(
            "Forcing alternative route",
            extra={
                "original": original.route_type,
                "alternative": next_route,
                "tried": list(tried),
            },
        )

        return RouteDecision(
            route_type=next_route,
            route_target=f"resilient-fallback-{next_route}",
            confidence=0.4,
            reasoning=f"ResilientSelector: {original.route_type} already tried, forcing {next_route}",
            parameters={
                "original_route": original.route_type,
                "forced": True,
                "attempt_count": len(tried) + 1,
            },
        )

    def get_session_stats(self) -> dict[str, Any]:
        """Get statistics about all routing sessions."""
        return {
            "total_sessions": self._session_counter,
            "config": {
                "max_retries": self._config.max_retries,
                "total_timeout": self._config.total_timeout_seconds,
                "route_priority": self._config.route_priority,
            },
        }
