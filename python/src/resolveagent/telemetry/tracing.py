"""OpenTelemetry tracing setup."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# Global tracer provider
_tracer_provider: Any = None
_tracer: Any = None


def init_tracing(
    service_name: str = "resolveagent-runtime",
    endpoint: str = "",
) -> None:
    """Initialize OpenTelemetry tracing.

    Args:
        service_name: Service name for traces.
        endpoint: OTLP collector endpoint (e.g., "http://localhost:4317").
    """
    global _tracer_provider, _tracer

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.resources import Resource, SERVICE_NAME
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        # Create resource
        resource = Resource.create({SERVICE_NAME: service_name})

        # Create tracer provider
        _tracer_provider = TracerProvider(resource=resource)

        # Add OTLP exporter if endpoint provided
        if endpoint:
            try:
                from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
                    OTLPSpanExporter,
                )

                otlp_exporter = OTLPSpanExporter(endpoint=endpoint, insecure=True)
                span_processor = BatchSpanProcessor(otlp_exporter)
                _tracer_provider.add_span_processor(span_processor)

                logger.info(
                    "OTLP tracing exporter configured",
                    extra={"endpoint": endpoint},
                )
            except ImportError:
                logger.warning(
                    "OTLP exporter not available. Install with: pip install opentelemetry-exporter-otlp"
                )

        # Set global tracer provider
        trace.set_tracer_provider(_tracer_provider)
        _tracer = trace.get_tracer(service_name)

        logger.info(
            "Tracing initialized",
            extra={"service": service_name, "endpoint": endpoint or "console"},
        )

    except ImportError:
        logger.warning(
            "OpenTelemetry not installed. Install with: pip install opentelemetry-api opentelemetry-sdk"
        )
        _tracer = None


def get_tracer() -> Any:
    """Get the global tracer.

    Returns:
        Tracer instance or None if tracing not initialized.
    """
    return _tracer


def create_span(name: str, kind: str = "internal", attributes: dict[str, Any] | None = None):
    """Create a new span.

    Args:
        name: Span name.
        kind: Span kind (server, client, internal, producer, consumer).
        attributes: Optional span attributes.

    Returns:
        Span context manager.
    """
    if _tracer is None:
        # Return a no-op context manager
        from contextlib import nullcontext
        return nullcontext()

    from opentelemetry.trace import SpanKind

    kind_map = {
        "server": SpanKind.SERVER,
        "client": SpanKind.CLIENT,
        "internal": SpanKind.INTERNAL,
        "producer": SpanKind.PRODUCER,
        "consumer": SpanKind.CONSUMER,
    }

    span_kind = kind_map.get(kind, SpanKind.INTERNAL)

    return _tracer.start_as_current_span(
        name,
        kind=span_kind,
        attributes=attributes or {},
    )


def shutdown_tracing() -> None:
    """Shutdown tracing and flush pending spans."""
    global _tracer_provider, _tracer

    if _tracer_provider:
        try:
            _tracer_provider.shutdown()
            logger.info("Tracing shutdown complete")
        except Exception as e:
            logger.error(f"Error shutting down tracing: {e}")
        finally:
            _tracer_provider = None
            _tracer = None
