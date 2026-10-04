"""Unit tests for telemetry tracing (telemetry/tracing.py)."""

from __future__ import annotations

import pytest

import resolveagent.telemetry.tracing as tracing


@pytest.fixture(autouse=True)
def reset_globals(monkeypatch: pytest.MonkeyPatch):
    """Isolate module globals between tests."""
    monkeypatch.setattr(tracing, "_tracer_provider", None)
    monkeypatch.setattr(tracing, "_tracer", None)
    yield
    tracing.shutdown_tracing()


class TestInitTracing:
    def test_init_without_endpoint_sets_global_tracer(self) -> None:
        tracing.init_tracing(service_name="unit-test")

        assert tracing.get_tracer() is not None

    def test_create_span_before_init_is_noop_context(self) -> None:
        with tracing.create_span("untimed-span") as span:
            assert span is None  # nullcontext yields None

    def test_create_span_after_init_is_real_span(self) -> None:
        tracing.init_tracing(service_name="unit-test")

        with tracing.create_span("unit-span", kind="internal", attributes={"k": "v"}) as span:
            assert span is not None

    def test_unknown_span_kind_falls_back_to_internal(self) -> None:
        tracing.init_tracing(service_name="unit-test")

        with tracing.create_span("unit-span", kind="bogus-kind") as span:
            assert span is not None

    def test_shutdown_resets_globals(self) -> None:
        tracing.init_tracing(service_name="unit-test")
        tracing.shutdown_tracing()

        assert tracing.get_tracer() is None
        assert tracing._tracer_provider is None

    def test_shutdown_without_init_is_safe(self) -> None:
        tracing.shutdown_tracing()
        assert tracing.get_tracer() is None
