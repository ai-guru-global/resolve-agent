"""Execution context for agent runs."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ExecutionContext:
    """Holds state for a single agent execution.

    Attributes:
        execution_id: Unique execution identifier.
        agent_id: The agent being executed.
        conversation_id: Conversation continuity ID.
        input_text: The user input.
        context: Additional context data.
        trace_id: OpenTelemetry trace ID.
        metadata: Mutable metadata accumulated during execution.
    """

    execution_id: str
    agent_id: str
    conversation_id: str
    input_text: str
    context: dict[str, Any] = field(default_factory=dict)
    trace_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def with_trace(self, trace_id: str) -> ExecutionContext:
        """Return a copy with the given trace ID."""
        self.trace_id = trace_id
        return self
