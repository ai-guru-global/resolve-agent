"""Unit tests for resilience patterns (circuit breaker + fallback cascade)."""

from __future__ import annotations

import asyncio

import pytest

from resolveagent.resilience import (
    CircuitBreaker,
    CircuitOpenError,
    CircuitState,
    FallbackCascade,
)


async def _ok() -> str:
    return "ok"


async def _boom() -> str:
    raise RuntimeError("boom")


class TestCircuitBreaker:
    """Circuit breaker state machine."""

    @pytest.mark.asyncio
    async def test_success_keeps_circuit_closed(self) -> None:
        cb = CircuitBreaker(failure_threshold=2)
        assert await cb.call(_ok) == "ok"
        assert cb.state is CircuitState.CLOSED

    @pytest.mark.asyncio
    async def test_opens_after_threshold_failures(self) -> None:
        cb = CircuitBreaker(failure_threshold=2, reset_timeout=60.0)

        for _ in range(2):
            with pytest.raises(RuntimeError):
                await cb.call(_boom)

        assert cb.state is CircuitState.OPEN

        # Subsequent calls fail fast without invoking the downstream func.
        with pytest.raises(CircuitOpenError):
            await cb.call(_ok)

    @pytest.mark.asyncio
    async def test_half_open_then_close_on_success(self) -> None:
        # reset_timeout=0 so the circuit is immediately eligible for retry.
        cb = CircuitBreaker(failure_threshold=1, reset_timeout=0.0)

        with pytest.raises(RuntimeError):
            await cb.call(_boom)
        assert cb.state is CircuitState.OPEN

        # Half-open probe succeeds -> circuit closes.
        assert await cb.call(_ok) == "ok"
        assert cb.state is CircuitState.CLOSED
        assert cb.failure_count == 0

    @pytest.mark.asyncio
    async def test_half_open_probe_failure_reopens(self) -> None:
        cb = CircuitBreaker(failure_threshold=1, reset_timeout=0.0)

        with pytest.raises(RuntimeError):
            await cb.call(_boom)

        # Probe fails -> back to OPEN.
        with pytest.raises(RuntimeError):
            await cb.call(_boom)
        assert cb.state is CircuitState.OPEN

    @pytest.mark.asyncio
    async def test_reset_timeout_not_elapsed_keeps_failing_fast(self) -> None:
        cb = CircuitBreaker(failure_threshold=1, reset_timeout=30.0)

        with pytest.raises(RuntimeError):
            await cb.call(_boom)

        with pytest.raises(CircuitOpenError):
            await cb.call(_ok)
        assert cb.state is CircuitState.OPEN

    @pytest.mark.asyncio
    async def test_success_decays_failure_count_while_closed(self) -> None:
        cb = CircuitBreaker(failure_threshold=5)

        with pytest.raises(RuntimeError):
            await cb.call(_boom)
        assert cb.failure_count == 1

        await cb.call(_ok)
        assert cb.failure_count == 0

    def test_manual_reset(self) -> None:
        cb = CircuitBreaker(failure_threshold=1)
        cb._state = CircuitState.OPEN
        cb._failure_count = 9

        cb.reset()

        assert cb.state is CircuitState.CLOSED
        assert cb.failure_count == 0

    def test_get_state_info_snapshot(self) -> None:
        cb = CircuitBreaker(failure_threshold=3, reset_timeout=15.0)
        info = cb.get_state_info()

        assert info["state"] == "closed"
        assert info["failure_threshold"] == 3
        assert info["reset_timeout"] == 15.0
        assert info["seconds_since_last_failure"] is None

    @pytest.mark.asyncio
    async def test_concurrent_failures_do_not_over_open(self) -> None:
        """Lock must serialise counter updates under concurrency."""
        cb = CircuitBreaker(failure_threshold=100, reset_timeout=60.0)

        async def failing() -> None:
            with pytest.raises(RuntimeError):
                await cb.call(_boom)

        await asyncio.gather(*(failing() for _ in range(50)))

        assert cb.failure_count == 50
        assert cb.state is CircuitState.CLOSED


class TestFallbackCascade:
    """Multi-level graceful degradation."""

    @pytest.mark.asyncio
    async def test_first_strategy_wins(self) -> None:
        cascade = FallbackCascade()
        result = await cascade.execute(_ok, _boom, labels=["primary", "backup"])

        assert result.success is True
        assert result.strategy_used == "primary"
        assert result.data == "ok"

    @pytest.mark.asyncio
    async def test_falls_through_to_later_strategy(self) -> None:
        cascade = FallbackCascade()
        result = await cascade.execute(_boom, _boom, _ok, labels=["a", "b", "c"])

        assert result.success is True
        assert result.strategy_used == "c"

    @pytest.mark.asyncio
    async def test_all_strategies_failed(self) -> None:
        cascade = FallbackCascade()
        result = await cascade.execute(_boom, _boom)

        assert result.success is False
        assert result.strategy_used == "none"
        assert result.error == "All fallback strategies failed"

    @pytest.mark.asyncio
    async def test_no_strategies_provided(self) -> None:
        cascade = FallbackCascade()
        result = await cascade.execute()

        assert result.success is False
        assert result.error == "No fallback strategies provided"

    @pytest.mark.asyncio
    async def test_default_labels_are_generated(self) -> None:
        cascade = FallbackCascade()
        result = await cascade.execute(_boom, _ok)

        assert result.strategy_used == "strategy_1"

    def test_circuit_breakers_are_cached_per_service(self) -> None:
        cascade = FallbackCascade()
        assert cascade.get_circuit_breaker("llm") is cascade.get_circuit_breaker("llm")
        assert cascade.get_circuit_breaker("llm") is not cascade.get_circuit_breaker("rag")

    @pytest.mark.asyncio
    async def test_execute_with_circuit_breaker_success(self) -> None:
        cascade = FallbackCascade()
        result = await cascade.execute_with_circuit_breaker("svc", _ok)

        assert result.success is True
        assert result.data == "ok"

    @pytest.mark.asyncio
    async def test_execute_with_circuit_breaker_returns_fallback_on_error(self) -> None:
        cascade = FallbackCascade()
        result = await cascade.execute_with_circuit_breaker("svc", _boom, fallback="degraded")

        assert result.success is False
        assert result.data == "degraded"
        assert result.error == "boom"

    @pytest.mark.asyncio
    async def test_execute_with_circuit_breaker_reports_open_circuit(self) -> None:
        cascade = FallbackCascade()
        cb = cascade.get_circuit_breaker("svc")
        cb.failure_threshold = 1
        cb.reset_timeout = 60.0

        await cascade.execute_with_circuit_breaker("svc", _boom, fallback="degraded")
        result = await cascade.execute_with_circuit_breaker("svc", _ok, fallback="degraded")

        assert result.success is False
        assert result.strategy_used == "svc_circuit_open"
        assert result.data == "degraded"
        assert result.error == "Circuit breaker open"
