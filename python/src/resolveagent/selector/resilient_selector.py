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
from typing import Any, Awaitable, Callable

from resolveagent.resilience import CircuitBreaker, CircuitOpenError
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
    route_priority: list[str] = field(default_factory=lambda: ["skill", "rag", "fta", "code_analysis"])
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
        ctx["route_preferences"] = self._compute_preferences(all_attempts, ctx.get("route_preferences", {}))

        # Lower enrichment confidence after failures.
        # 修复: 此前直接读取上一轮已衰减的 enrichment_confidence 再减去
        # 0.15 * len(all_attempts), 衰减被复合放大 (第 2 轮直接掉到 0.55)。
        # 现固定以首轮基线为准做线性衰减。
        base_confidence = ctx.get("enrichment_confidence_base")
        if base_confidence is None:
            base_confidence = ctx.get("enrichment_confidence", 1.0)
            ctx["enrichment_confidence_base"] = base_confidence
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

    # Error-type keyword mappings for smarter preference inference
    _ERROR_PATTERNS: dict[str, list[str]] = {
        "resource_missing": ["not found", "empty", "missing", "no results", "404", "不存在", "未找到"],
        "timeout": ["timeout", "timed out", "deadline exceeded", "context deadline", "超时"],
        "permission": ["permission", "unauthorized", "forbidden", "access denied", "403", "无权限"],
        "connection": ["connection", "refused", "reset", "unreachable", "network", "连接"],
        "logic_error": ["invalid", "validation", "syntax", "parse", "format", "逻辑", "格式"],
        "rate_limit": ["rate limit", "too many requests", "throttled", "429", "限流"],
        "capacity": ["out of memory", "oom", "resource exhausted", "quota", "容量", "内存不足"],
    }

    def _classify_error(self, error: str | None) -> str:
        """Classify an error message into a high-level error type."""
        if not error:
            return "unknown"
        error_lower = error.lower()
        for error_type, patterns in self._ERROR_PATTERNS.items():
            for pat in patterns:
                if pat in error_lower:
                    return error_type
        return "unknown"

    def _compute_preferences(
        self,
        attempts: list[RouteAttempt],
        existing: dict[str, Any],
    ) -> dict[str, Any]:
        """Compute routing preferences based on failure history.

        Uses error-type classification (not just string matching) to infer
        what went wrong and which route type is most likely to succeed next.
        """
        prefs = dict(existing)
        failed_routes = {a.route_type for a in attempts if not a.success}

        # Mark failed routes as dispreferred
        prefs["dispreferred_routes"] = list(failed_routes)

        # Aggregate error types across all failed attempts
        error_types: dict[str, int] = {}
        for attempt in attempts:
            if not attempt.success:
                et = self._classify_error(attempt.error)
                error_types[et] = error_types.get(et, 0) + 1

        # Infer preferences based on dominant error patterns
        if error_types.get("resource_missing", 0) > 0:
            # RAG 检索不到内容 → 知识库帮不上, 转推理
            if "rag" in failed_routes:
                prefs["prefer_reasoning"] = True
            # 技能/工具缺失 → 知识库里可能有替代方案文档
            elif "skill" in failed_routes:
                prefs["prefer_knowledge"] = True

        if (error_types.get("timeout", 0) > 0 or error_types.get("connection", 0) > 0) and "code_analysis" not in failed_routes:
            # Network/timeout issues → try local analysis (Code Analysis)
            prefs["prefer_analysis"] = True

        if error_types.get("logic_error", 0) > 0 and "code_analysis" not in failed_routes:
            # Syntax/validation/format errors → Code Analysis is ideal
            prefs["prefer_analysis"] = True

        if error_types.get("permission", 0) > 0 and "rag" not in failed_routes:
            # Permission issues → try knowledge-based (may have workaround docs)
            prefs["prefer_knowledge"] = True

        if (error_types.get("capacity", 0) > 0 or error_types.get("rate_limit", 0) > 0) and "skill" not in failed_routes:
            # Resource exhausted → fall back to lighter-weight routes
            prefs["prefer_knowledge"] = True

        # Per-route-specific heuristics (last-attempt granular analysis)
        last_failed = next((a for a in reversed(attempts) if not a.success), None)
        if last_failed:
            last_error_type = self._classify_error(last_failed.error)
            if last_failed.route_type == "rag" and last_error_type == "resource_missing":
                prefs["prefer_reasoning"] = True
            elif last_failed.route_type == "skill" and last_error_type in ("timeout", "connection"):
                prefs["prefer_analysis"] = True
            elif last_failed.route_type == "fta" and "code_analysis" not in failed_routes:
                # 故障树工作流自身失败 (逻辑错误/崩溃/未知原因) 时,
                # 不再重试 FTA, 退化为本地代码分析
                prefs["prefer_analysis"] = True

        logger.info(
            "Computed routing preferences",
            extra={
                "error_types": error_types,
                "preferences": prefs,
                "failed_routes": list(failed_routes),
            },
        )

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

        # Circuit breakers per route type
        self._circuit_breakers: dict[str, CircuitBreaker] = {}
        if self._config.enable_circuit_breaker:
            for route_type in self._config.route_priority:
                self._circuit_breakers[route_type] = CircuitBreaker(
                    failure_threshold=3,
                    reset_timeout=30.0,
                )

    async def route_and_execute(
        self,
        input_text: str,
        agent_id: str,
        executor: Callable[[RouteDecision], Awaitable[Any]],
        context: dict[str, Any] | None = None,
    ) -> RoutingSession:
        """Route a request with automatic retry on failure."""
        return await self._route_and_execute_core(
            input_text=input_text,
            agent_id=agent_id,
            executor=executor,
            context=context,
        )

    async def route_and_execute_with_clarification(
        self,
        input_text: str,
        agent_id: str,
        executor: Callable[[RouteDecision], Awaitable[Any]],
        ask_user_callback: Callable[[str], Awaitable[str | None]],
        context: dict[str, Any] | None = None,
    ) -> RoutingSession:
        """Route with interactive user clarification on repeated failures."""
        session = await self._route_and_execute_core(
            input_text=input_text,
            agent_id=agent_id,
            executor=executor,
            context=context,
        )

        clarification_rounds = 0
        max_clarifications = 2
        while not session.success and clarification_rounds < max_clarifications:
            question = self._build_clarification_question(session)
            clarification = await ask_user_callback(question)

            if not clarification:
                break

            input_text = f"{input_text}\n[用户补充: {clarification}]"
            clarification_rounds += 1

            new_session = await self._route_and_execute_core(
                input_text=input_text,
                agent_id=agent_id,
                executor=executor,
                context=context,
            )
            session.attempts.extend(new_session.attempts)
            session.success = new_session.success
            session.final_result = new_session.final_result
            session.final_route = new_session.final_route
            session.total_latency_ms += new_session.total_latency_ms

        return session

    def _build_clarification_question(self, session: RoutingSession) -> str:
        """Build a question to ask the user when all routes have failed."""
        attempted = [a.route_type for a in session.attempts]
        errors = [a.error for a in session.attempts if a.error]
        return (
            f"已尝试 {len(session.attempts)} 种方案 ({', '.join(attempted)}) 但未解决。"
            f"失败原因: {'; '.join(errors[:3])}. "
            "能否补充更多信息或澄清您的需求？"
        )

    def _extract_suggested_rephrase(self, error: str) -> str | None:
        """Extract a suggested rephrase hint from an error message."""
        import re

        patterns = [
            r"suggested_rephrase[:：]\s*(.+?)(?:\n|$)",
            r"请尝试[:：]\s*(.+?)(?:\n|$)",
            r"hint[:：]\s*(.+?)(?:\n|$)",
        ]
        for pat in patterns:
            m = re.search(pat, error, re.IGNORECASE)
            if m:
                return m.group(1).strip()
        return None

    async def _route_and_execute_core(
        self,
        input_text: str,
        agent_id: str,
        executor: Callable[[RouteDecision], Awaitable[Any]],
        context: dict[str, Any] | None = None,
    ) -> RoutingSession:
        """Core routing loop implementation."""
        self._session_counter += 1
        session = RoutingSession(
            session_id=f"resilient-{self._session_counter}",
            original_input=input_text,
            agent_id=agent_id,
        )

        start_time = time.monotonic()
        ctx = context or {}
        tried_routes: set[str] = set()
        original_input = input_text

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
            bypass_cache = self._config.enable_cache_bypass_on_retry and attempt_num > 0
            decision = await self._selector.route(
                input_text=input_text,
                agent_id=agent_id,
                context=ctx,
                bypass_cache=bypass_cache,
            )

            # Skip already-tried routes (force different route)
            if decision.route_type in tried_routes and attempt_num > 0:
                decision = self._force_alternative_route(decision, tried_routes, ctx)

            # Execute
            attempt_start = time.monotonic()
            attempt_record = await self._execute_route(decision, executor, attempt_num + 1)
            attempt_record.latency_ms = (time.monotonic() - attempt_start) * 1000

            session.attempts.append(attempt_record)
            tried_routes.add(decision.route_type)

            # Check if executor suggested a rephrase
            if not attempt_record.success and attempt_record.error:
                rephrase = self._extract_suggested_rephrase(attempt_record.error)
                if rephrase:
                    input_text = f"{original_input}\n[系统提示: {rephrase}]"
                    logger.info(
                        "Input rephrased based on executor suggestion",
                        extra={"original": original_input, "rephrased": input_text},
                    )

            # Success → return
            if attempt_record.success:
                session.success = True
                session.final_result = attempt_record.result_summary
                session.final_route = decision.route_type
                break

            # Failure → re-enrich for next attempt
            if attempt_num < self._config.max_retries:
                ctx = self._re_enricher.re_enrich(ctx, attempt_record, session.attempts)

        # Final fallback: Code Analysis (if not already tried)
        if not session.success and self._config.fallback_to_code_analysis and "code_analysis" not in tried_routes:
            fallback_decision = RouteDecision(
                route_type="code_analysis",
                route_target="static-analysis",
                confidence=0.5,
                reasoning="ResilientSelector: final fallback to code analysis",
                parameters={"fallback": True, "session_id": session.session_id},
            )
            attempt_start = time.monotonic()
            fallback_record = await self._execute_route(fallback_decision, executor, len(session.attempts) + 1)
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
        - Circuit breaker protection
        """
        # Circuit breaker check
        cb = self._circuit_breakers.get(decision.route_type)
        if cb and not self._config.enable_circuit_breaker:
            cb = None

        if cb:
            try:
                result = await cb.call(executor, decision)
            except CircuitOpenError:
                logger.warning(
                    "Circuit breaker open, skipping route",
                    extra={
                        "route_type": decision.route_type,
                        "route_target": decision.route_target,
                    },
                )
                return RouteAttempt(
                    route_type=decision.route_type,
                    route_target=decision.route_target,
                    success=False,
                    error="Circuit breaker open",
                    attempt_number=attempt_number,
                )
            except Exception as e:
                # Circuit breaker recorded the failure, treat as route failure
                logger.warning(
                    "Route execution failed (circuit breaker recorded)",
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

            # Circuit breaker call succeeded — parse result
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

        # No circuit breaker — direct execution
        try:
            result = await executor(decision)

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
        available = [r for r in self._config.route_priority if r not in tried]

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


# ---------------------------------------------------------------------------
# Loop Engineering: Adaptive Weight Adjuster
# ---------------------------------------------------------------------------


class AdaptiveWeightAdjuster:
    """
    Dynamically adjusts route selection weights based on accumulated
    feedback from routing sessions. Implements the continuous improvement
    loop: observe outcomes -> adjust weights -> improve future selections.

    Weights are decayed over time (configurable decay factor) to ensure
    the system adapts to changing conditions rather than being permanently
    biased by old data.

    This class is designed to be plugged into the ResilientSelector's
    feedback path to close the routing improvement loop.
    """

    def __init__(
        self,
        decay_factor: float = 0.95,
        learning_rate: float = 0.1,
        min_weight: float = 0.1,
        max_weight: float = 2.0,
    ):
        self._decay_factor = decay_factor
        self._learning_rate = learning_rate
        self._min_weight = min_weight
        self._max_weight = max_weight
        # Route type -> weight (1.0 = neutral)
        self._weights: dict[str, float] = {}
        # Route type -> running success count
        self._success_counts: dict[str, int] = {}
        # Route type -> running total count
        self._total_counts: dict[str, int] = {}

    def record_outcome(self, route_type: str, success: bool) -> None:
        """Record a routing outcome and update the weight."""
        self._total_counts[route_type] = self._total_counts.get(route_type, 0) + 1
        if success:
            self._success_counts[route_type] = self._success_counts.get(route_type, 0) + 1

        # Compute success rate
        total = self._total_counts[route_type]
        successes = self._success_counts.get(route_type, 0)
        success_rate = successes / total if total > 0 else 0.5

        # Adjust weight based on success rate
        current_weight = self._weights.get(route_type, 1.0)
        adjustment = self._learning_rate * (success_rate - 0.5)
        new_weight = current_weight + adjustment

        # Clamp to bounds
        new_weight = max(self._min_weight, min(self._max_weight, new_weight))
        self._weights[route_type] = new_weight

    def apply_decay(self) -> None:
        """Apply time decay to all weights, pulling them toward 1.0 (neutral)."""
        for route_type in self._weights:
            w = self._weights[route_type]
            # Decay toward neutral (1.0)
            self._weights[route_type] = 1.0 + (w - 1.0) * self._decay_factor

    def get_weight(self, route_type: str) -> float:
        """Get the current weight for a route type."""
        return self._weights.get(route_type, 1.0)

    def get_all_weights(self) -> dict[str, float]:
        """Get all current weights."""
        return dict(self._weights)

    def get_stats(self) -> dict[str, Any]:
        """Get statistics about the adaptive adjuster."""
        return {
            "weights": dict(self._weights),
            "success_counts": dict(self._success_counts),
            "total_counts": dict(self._total_counts),
            "config": {
                "decay_factor": self._decay_factor,
                "learning_rate": self._learning_rate,
            },
        }

    def reset(self) -> None:
        """Reset all weights and counts to defaults."""
        self._weights.clear()
        self._success_counts.clear()
        self._total_counts.clear()
