"""OpenTelemetry tracing setup."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def init_tracing(service_name: str = "resolveagent-runtime", endpoint: str = "") -> None:
    """Initialize OpenTelemetry tracing.

    Args:
        service_name: Service name for traces.
        endpoint: OTLP collector endpoint.
    """
    # TODO: Initialize OTLP exporter and tracer provider
    # from opentelemetry import trace
    # from opentelemetry.sdk.trace import TracerProvider
    # from opentelemetry.sdk.trace.export import BatchSpanProcessor
    # from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    logger.info(
        "Tracing initialized",
        extra={"service": service_name, "endpoint": endpoint},
    )
