"""Hybrid traffic collector supporting multiple capture backends.

Adapts multiple data sources into a unified TrafficRecord format:
- eBPF / tcpdump (raw packet captures)
- Application-layer proxy (Higress access logs)
- OpenTelemetry distributed tracing spans
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class RawRecord:
    """Unified intermediate record from any capture source."""

    source_service: str = ""
    dest_service: str = ""
    protocol: str = ""
    method: str = ""
    path: str = ""
    status_code: int = 0
    latency_ms: int = 0
    request_size: int = 0
    response_size: int = 0
    trace_id: str = ""
    span_id: str = ""
    timestamp: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


class _BaseAdapter:
    """Base class for capture source adapters."""

    def parse(self, raw_data: Any) -> list[RawRecord]:
        raise NotImplementedError


class _OTelAdapter(_BaseAdapter):
    """Parse OpenTelemetry spans into RawRecords."""

    def parse(self, raw_data: Any) -> list[RawRecord]:
        records: list[RawRecord] = []
        spans = raw_data if isinstance(raw_data, list) else raw_data.get("spans", [])

        for span in spans:
            attrs = span.get("attributes", {})
            records.append(RawRecord(
                source_service=span.get("serviceName", attrs.get("service.name", "")),
                dest_service=attrs.get("peer.service", attrs.get("net.peer.name", "")),
                protocol=attrs.get("rpc.system", attrs.get("http.scheme", "http")),
                method=attrs.get("http.method", attrs.get("rpc.method", "")),
                path=attrs.get("http.url", attrs.get("http.target", "")),
                status_code=int(attrs.get("http.status_code", 0)),
                latency_ms=int(span.get("duration", 0) / 1000) if span.get("duration") else 0,
                trace_id=span.get("traceId", ""),
                span_id=span.get("spanId", ""),
                timestamp=span.get("startTime", ""),
                metadata={"source": "otel", "kind": span.get("kind", "")},
            ))

        return records


class _ProxyLogAdapter(_BaseAdapter):
    """Parse Higress / Envoy access log entries into RawRecords."""

    def parse(self, raw_data: Any) -> list[RawRecord]:
        records: list[RawRecord] = []
        entries = raw_data if isinstance(raw_data, list) else raw_data.get("entries", [])

        for entry in entries:
            records.append(RawRecord(
                source_service=entry.get("downstream_service", entry.get("source", "")),
                dest_service=entry.get("upstream_cluster", entry.get("dest", "")),
                protocol=entry.get("protocol", "http"),
                method=entry.get("method", ""),
                path=entry.get("path", ""),
                status_code=int(entry.get("response_code", 0)),
                latency_ms=int(entry.get("duration", 0)),
                request_size=int(entry.get("bytes_received", 0)),
                response_size=int(entry.get("bytes_sent", 0)),
                trace_id=entry.get("x_request_id", ""),
                timestamp=entry.get("timestamp", ""),
                metadata={"source": "proxy"},
            ))

        return records


class _EBPFAdapter(_BaseAdapter):
    """Parse eBPF / tcpdump capture output into RawRecords."""

    def parse(self, raw_data: Any) -> list[RawRecord]:
        records: list[RawRecord] = []
        packets = raw_data if isinstance(raw_data, list) else raw_data.get("packets", [])

        for pkt in packets:
            records.append(RawRecord(
                source_service=pkt.get("src_addr", ""),
                dest_service=pkt.get("dst_addr", ""),
                protocol=pkt.get("protocol", "tcp"),
                method=pkt.get("method", ""),
                path=pkt.get("path", ""),
                status_code=int(pkt.get("status", 0)),
                latency_ms=int(pkt.get("latency_us", 0) / 1000) if pkt.get("latency_us") else 0,
                request_size=int(pkt.get("req_bytes", 0)),
                response_size=int(pkt.get("resp_bytes", 0)),
                timestamp=pkt.get("timestamp", ""),
                metadata={"source": "ebpf", "interface": pkt.get("iface", "")},
            ))

        return records


# Adapter registry
_ADAPTERS: dict[str, type[_BaseAdapter]] = {
    "otel": _OTelAdapter,
    "proxy": _ProxyLogAdapter,
    "ebpf": _EBPFAdapter,
}


class TrafficCollector:
    """Collect and normalise traffic data from multiple sources.

    Usage::

        collector = TrafficCollector()
        records = collector.collect("otel", otel_spans_data)
        records += collector.collect("proxy", proxy_log_data)
    """

    def __init__(self) -> None:
        self._adapters: dict[str, _BaseAdapter] = {
            name: cls() for name, cls in _ADAPTERS.items()
        }

    @property
    def supported_sources(self) -> list[str]:
        return list(self._adapters)

    def collect(
        self,
        source_type: str,
        raw_data: Any,
    ) -> list[RawRecord]:
        """Collect and parse raw data from a specific source type.

        Args:
            source_type: One of "otel", "proxy", "ebpf".
            raw_data: Raw data from the capture source.

        Returns:
            List of normalised ``RawRecord`` instances.
        """
        adapter = self._adapters.get(source_type)
        if adapter is None:
            logger.warning("Unknown source type: %s", source_type)
            return []

        try:
            records = adapter.parse(raw_data)
            logger.info(
                "Collected %d records from %s", len(records), source_type
            )
            return records
        except Exception:
            logger.exception("Failed to collect from %s", source_type)
            return []

    def collect_multi(
        self, sources: list[dict[str, Any]]
    ) -> list[RawRecord]:
        """Collect from multiple sources at once.

        Args:
            sources: List of ``{"type": "otel", "data": ...}`` dicts.

        Returns:
            Merged list of ``RawRecord`` from all sources.
        """
        all_records: list[RawRecord] = []
        for src in sources:
            src_type = src.get("type", "")
            src_data = src.get("data", {})
            all_records.extend(self.collect(src_type, src_data))
        return all_records

    @staticmethod
    def records_to_dicts(records: list[RawRecord]) -> list[dict[str, Any]]:
        """Convert RawRecords to plain dicts for store persistence."""
        return [
            {
                "source_service": r.source_service,
                "dest_service": r.dest_service,
                "protocol": r.protocol,
                "method": r.method,
                "path": r.path,
                "status_code": r.status_code,
                "latency_ms": r.latency_ms,
                "request_size": r.request_size,
                "response_size": r.response_size,
                "trace_id": r.trace_id,
                "span_id": r.span_id,
                "timestamp": r.timestamp or datetime.utcnow().isoformat(),
                "metadata": r.metadata,
            }
            for r in records
        ]
