"""Decision Audit Logger - records routing decisions for debugging and analysis."""

from __future__ import annotations

import asyncio
import contextlib
import hashlib
import logging
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class AuditRecord:
    """A complete audit record for a routing decision."""

    timestamp: str
    decision_type: str
    confidence: float
    reasoning: str
    route_target: str
    parameters: dict[str, Any] = field(default_factory=dict)

    input_hash: str = ""
    input_length: int = 0
    agent_id: str = ""

    context_snapshot: dict[str, Any] = field(default_factory=dict)
    enrichment_confidence: float = 0.0

    latency_ms: float = 0.0
    strategy: str = ""

    error: str | None = None


class DecisionAuditLogger:
    """Records each routing decision's complete context.

    This logger captures:
    - Decision output (route_type, confidence, target, reasoning)
    - Input metadata (hash, length, agent_id)
    - Context snapshot (skills count, conversation length, code issues)
    - Performance metrics (latency)
    - Errors if any

    All records are written asynchronously to avoid blocking the main flow.

    Example:
        >>> audit = DecisionAuditLogger()
        >>> await audit.log(decision, context, latency_ms=15.2)
    """

    def __init__(self, store_client: Any | None = None) -> None:
        """Initialize the audit logger.

        Args:
            store_client: Optional store client for persistent audit storage.
                         If None, logs to standard logger.
        """
        self._store_client = store_client
        self._enabled = True
        self._queue: asyncio.Queue[AuditRecord] = asyncio.Queue()
        self._worker_task: asyncio.Task | None = None
        self._started = False

    async def _start_worker_async(self) -> None:
        """Start the async worker that writes audit records."""
        if self._started:
            return
        self._worker_task = asyncio.create_task(self._process_queue())
        self._started = True

    async def _process_queue(self) -> None:
        """Process audit records from the queue asynchronously."""
        while self._enabled:
            try:
                record = await asyncio.wait_for(self._queue.get(), timeout=1.0)
                await self._write_record(record)
            except TimeoutError:
                continue
            except Exception as e:
                logger.error("Error processing audit record: %s", e)

    async def _write_record(self, record: AuditRecord) -> None:
        """Write an audit record to storage."""
        if self._store_client:
            try:
                await self._store_client.create_audit_record(asdict(record))
            except Exception as e:
                logger.error("Failed to write audit to store: %s", e)
        else:
            # Fallback to structured logging
            logger.info(
                "Routing audit",
                extra={
                    "audit": asdict(record),
                },
            )

    async def log(
        self,
        decision: Any,
        context: Any,
        latency_ms: float = 0.0,
        strategy: str = "",
        error: str | None = None,
    ) -> None:
        """Log a routing decision asynchronously.

        Args:
            decision: RouteDecision object.
            context: EnrichedContext object (or dict).
            latency_ms: Time taken for the routing decision in milliseconds.
            strategy: The routing strategy used.
            error: Optional error message if routing failed.
        """
        if not self._enabled:
            return

        # Ensure worker is started (lazy initialization)
        if not self._started:
            await self._start_worker_async()

        # Convert context to dict if needed
        if hasattr(context, "to_dict"):
            context_dict = context.to_dict()
        elif isinstance(context, dict):
            context_dict = context
        else:
            context_dict = {}

        # Extract decision fields
        decision_dict = (
            decision
            if isinstance(decision, dict)
            else {
                "route_type": getattr(decision, "route_type", "unknown"),
                "confidence": getattr(decision, "confidence", 0.0),
                "reasoning": getattr(decision, "reasoning", ""),
                "route_target": getattr(decision, "route_target", ""),
                "parameters": getattr(decision, "parameters", {}),
            }
        )

        # Build audit record
        record = AuditRecord(
            timestamp=datetime.now().isoformat(),
            decision_type=decision_dict.get("route_type", "unknown"),
            confidence=decision_dict.get("confidence", 0.0),
            reasoning=decision_dict.get("reasoning", ""),
            route_target=decision_dict.get("route_target", ""),
            parameters=decision_dict.get("parameters", {}),
            input_hash=context_dict.get("session_metadata", {}).get("input_hash", ""),
            input_length=context_dict.get("session_metadata", {}).get("input_length", 0),
            agent_id=getattr(context, "agent_id", "") or context_dict.get("agent_id", ""),
            context_snapshot=self._build_context_snapshot(context_dict),
            enrichment_confidence=context_dict.get("enrichment_confidence", 0.0),
            latency_ms=latency_ms,
            strategy=strategy,
            error=error,
        )

        # Queue for async writing
        await self._queue.put(record)

    def _build_context_snapshot(self, context: dict[str, Any]) -> dict[str, Any]:
        """Build a snapshot of relevant context for the audit record."""
        snapshot: dict[str, Any] = {
            "skills_count": len(context.get("available_skills", [])),
            "workflows_count": len(context.get("active_workflows", [])),
            "collections_count": len(context.get("rag_collections", [])),
            "conversation_length": len(context.get("conversation_history", [])),
        }

        # Add code context if present
        code_context = context.get("code_context")
        if code_context:
            if isinstance(code_context, dict):
                snapshot["code_issues"] = code_context.get("potential_issues", [])
                snapshot["code_language"] = code_context.get("language", "")
                snapshot["has_code_blocks"] = code_context.get("has_code_blocks", False)
            else:
                snapshot["code_issues"] = getattr(code_context, "potential_issues", [])
                snapshot["code_language"] = getattr(code_context, "language", "")
                snapshot["has_code_blocks"] = getattr(code_context, "has_code_blocks", False)

        return snapshot

    async def flush(self) -> None:
        """Wait for all queued records to be written."""
        await self._queue.join()

    async def close(self) -> None:
        """Stop the worker and flush pending records."""
        self._enabled = False
        if self._worker_task:
            self._worker_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._worker_task

    @staticmethod
    def hash_input(text: str) -> str:
        """Create a short hash of input text for audit trails."""
        return hashlib.md5(text.encode()).hexdigest()[:8]
