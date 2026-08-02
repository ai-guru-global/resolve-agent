"""Resilience patterns - Fallback Cascade and Circuit Breaker."""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


class CircuitState(Enum):
    """Circuit breaker states."""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing fast
    HALF_OPEN = "half_open"  # Testing recovery


@dataclass
class CircuitBreaker:
    """Circuit breaker to protect downstream services.

    When failures exceed a threshold, the circuit opens and
    subsequent calls fail immediately without attempting the service.

    After a reset timeout, the circuit goes to half-open and
    allows one test call through.

    Example:
        >>> cb = CircuitBreaker(failure_threshold=5, reset_timeout=30.0)
        >>> try:
        ...     result = await cb.call(my_function, arg1, arg2)
        ... except CircuitOpenError:
        ...     result = fallback_value
    """

    failure_threshold: int = 5
    reset_timeout: float = 30.0
    half_open_max_calls: int = 1

    _state: CircuitState = field(default=CircuitState.CLOSED, init=False)
    _failure_count: int = field(default=0, init=False)
    _last_failure_time: float = field(default=0.0, init=False)
    _half_open_calls: int = field(default=0, init=False)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock, init=False)

    async def call(self, func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        """Execute a function through the circuit breaker.

        Args:
            func: Async function to call.
            *args: Positional arguments for func.
            **kwargs: Keyword arguments for func.

        Returns:
            Result from func.

        Raises:
            CircuitOpenError: When circuit is open.
        """
        async with self._lock:
            if self._state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self._state = CircuitState.HALF_OPEN
                    self._half_open_calls = 0
                    logger.info("Circuit breaker entering half-open state")
                else:
                    raise CircuitOpenError("Circuit breaker is open")

            if self._state == CircuitState.HALF_OPEN:
                # 修复: 此前误写为 self._half_open_max_calls (不存在的属性)
                if self._half_open_calls >= self.half_open_max_calls:
                    raise CircuitOpenError("Circuit breaker is half-open, max calls reached")
                self._half_open_calls += 1

        try:
            result = await func(*args, **kwargs)
            await self._on_success()
            return result
        except Exception:
            await self._on_failure()
            raise

    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset."""
        # 修复: 此前误写为 self._reset_timeout (不存在的属性),
        # 导致熔断器 OPEN 后尝试恢复时必然抛 AttributeError, 永远无法恢复
        return (time.monotonic() - self._last_failure_time) >= self.reset_timeout

    async def _on_success(self) -> None:
        """Handle successful call."""
        async with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                logger.info("Circuit breaker closing after successful call")
                self._state = CircuitState.CLOSED
                self._failure_count = 0
            elif self._state == CircuitState.CLOSED:
                self._failure_count = max(0, self._failure_count - 1)

    async def _on_failure(self) -> None:
        """Handle failed call."""
        async with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.monotonic()

            # 修复: 此前误写为 self._failure_threshold (不存在的属性),
            # 导致失败达到阈值时抛 AttributeError 而非正常打开熔断器
            if self._failure_count >= self.failure_threshold:
                logger.warning(
                    "Circuit breaker opening",
                    extra={"failure_count": self._failure_count},
                )
                self._state = CircuitState.OPEN

    @property
    def state(self) -> CircuitState:
        """Get current circuit state."""
        return self._state

    @property
    def failure_count(self) -> int:
        """Get current failure count."""
        return self._failure_count

    def reset(self) -> None:
        """Manually reset the circuit breaker to closed state.

        Useful for operational recovery after the downstream
        service is confirmed healthy.
        """
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._half_open_calls = 0
        logger.info("Circuit breaker manually reset to closed")

    def get_state_info(self) -> dict[str, Any]:
        """Get observable state snapshot for monitoring/debugging."""
        return {
            "state": self._state.value,
            "failure_count": self._failure_count,
            "failure_threshold": self.failure_threshold,
            "reset_timeout": self.reset_timeout,
            "seconds_since_last_failure": (
                round(time.monotonic() - self._last_failure_time, 2)
                if self._last_failure_time > 0
                else None
            ),
        }


class CircuitOpenError(Exception):
    """Raised when circuit breaker is open."""

    pass


@dataclass
class FallbackResult:
    """Result from fallback cascade."""

    success: bool
    strategy_used: str
    data: Any = None
    error: str | None = None


class FallbackCascade:
    """Multi-level fallback strategy for graceful degradation.

    Tries multiple strategies in order until one succeeds.
    Useful when different execution modes may be available.

    Example:
        >>> cascade = FallbackCascade()
        >>> result = await cascade.execute(
        ...     lambda: try_mcp_tool(),
        ...     lambda: try_native_skill(),
        ...     lambda: try_llm_direct(),
        ... )
        >>> if result.success:
        ...     print(result.data)
    """

    def __init__(self) -> None:
        self._circuit_breakers: dict[str, CircuitBreaker] = {}

    def get_circuit_breaker(self, name: str) -> CircuitBreaker:
        """Get or create a circuit breaker for a service.

        Args:
            name: Service identifier.

        Returns:
            CircuitBreaker instance.
        """
        if name not in self._circuit_breakers:
            self._circuit_breakers[name] = CircuitBreaker()
        return self._circuit_breakers[name]

    async def execute(
        self,
        *strategies: Callable[[], Any],
        labels: list[str] | None = None,
    ) -> FallbackResult:
        """Execute strategies in order until one succeeds.

        Args:
            *strategies: Async functions to try in order.
            labels: Optional labels for each strategy for logging.

        Returns:
            FallbackResult with success status and data.
        """
        if labels is None:
            labels = [f"strategy_{i}" for i in range(len(strategies))]

        if not strategies:
            return FallbackResult(
                success=False,
                strategy_used="none",
                error="No fallback strategies provided",
            )

        for i, (strategy, label) in enumerate(zip(strategies, labels, strict=True)):
            try:
                result = await strategy()
                return FallbackResult(
                    success=True,
                    strategy_used=label,
                    data=result,
                )
            except Exception as e:
                logger.warning(
                    "Fallback strategy failed",
                    extra={
                        "strategy": label,
                        "index": i,
                        "error": str(e),
                    },
                )
                continue

        return FallbackResult(
            success=False,
            strategy_used="none",
            error="All fallback strategies failed",
        )

    async def execute_with_circuit_breaker(
        self,
        name: str,
        func: Callable[..., Any],
        *args: Any,
        fallback: Any = None,
        **kwargs: Any,
    ) -> FallbackResult:
        """Execute with circuit breaker protection.

        Args:
            name: Service identifier for circuit breaker.
            func: Async function to call.
            *args: Positional arguments.
            fallback: Value to return if circuit is open or call fails.
            **kwargs: Keyword arguments.

        Returns:
            FallbackResult with success status.
        """
        cb = self.get_circuit_breaker(name)

        try:
            result = await cb.call(func, *args, **kwargs)
            return FallbackResult(
                success=True,
                strategy_used=name,
                data=result,
            )
        except CircuitOpenError:
            logger.warning("Circuit breaker open, using fallback", extra={"service": name})
            return FallbackResult(
                success=False,
                strategy_used=f"{name}_circuit_open",
                data=fallback,
                error="Circuit breaker open",
            )
        except Exception as e:
            logger.error("Service call failed", extra={"service": name, "error": str(e)})
            return FallbackResult(
                success=False,
                strategy_used=name,
                data=fallback,
                error=str(e),
            )
