"""Fault tree data structures."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class EventType(str, Enum):
    """FTA event types."""

    TOP = "top"
    INTERMEDIATE = "intermediate"
    BASIC = "basic"
    UNDEVELOPED = "undeveloped"
    CONDITIONING = "conditioning"


class GateType(str, Enum):
    """FTA gate types."""

    AND = "and"
    OR = "or"
    VOTING = "voting"
    INHIBIT = "inhibit"
    PRIORITY_AND = "priority_and"


@dataclass
class FTAEvent:
    """An event node in the fault tree."""

    id: str
    name: str
    description: str = ""
    event_type: EventType = EventType.BASIC
    evaluator: str = ""  # e.g., "skill:web-search", "rag:collection-id"
    parameters: dict[str, Any] = field(default_factory=dict)
    value: bool | None = None


@dataclass
class FTAGate:
    """A logical gate connecting events in the fault tree."""

    id: str
    name: str
    gate_type: GateType
    input_ids: list[str] = field(default_factory=list)
    output_id: str = ""
    k_value: int = 1  # For VOTING gate

    def evaluate(self, input_values: list[bool]) -> bool:
        """Evaluate the gate given input values.

        Args:
            input_values: Boolean values from input nodes.

        Returns:
            Gate output value.
        """
        if not input_values:
            return False

        if self.gate_type == GateType.AND:
            return all(input_values)
        elif self.gate_type == GateType.OR:
            return any(input_values)
        elif self.gate_type == GateType.VOTING:
            return sum(input_values) >= self.k_value
        elif self.gate_type == GateType.INHIBIT:
            # INHIBIT: AND gate with a conditioning event
            return all(input_values)
        elif self.gate_type == GateType.PRIORITY_AND:
            # PRIORITY_AND: AND with order dependency
            return all(input_values)
        return False


@dataclass
class FaultTree:
    """Complete fault tree structure."""

    id: str
    name: str
    description: str = ""
    top_event_id: str = ""
    events: list[FTAEvent] = field(default_factory=list)
    gates: list[FTAGate] = field(default_factory=list)

    def get_basic_events(self) -> list[FTAEvent]:
        """Get all basic (leaf) events."""
        return [e for e in self.events if e.event_type == EventType.BASIC]

    def get_event(self, event_id: str) -> FTAEvent | None:
        """Get an event by ID."""
        for e in self.events:
            if e.id == event_id:
                return e
        return None

    def get_gates_bottom_up(self) -> list[FTAGate]:
        """Get gates in bottom-up evaluation order."""
        # TODO: Implement topological sort for proper ordering
        return list(reversed(self.gates))

    def get_input_values(self, gate_id: str) -> list[bool]:
        """Get the boolean values of a gate's inputs."""
        gate = next((g for g in self.gates if g.id == gate_id), None)
        if not gate:
            return []

        values = []
        for input_id in gate.input_ids:
            event = self.get_event(input_id)
            if event and event.value is not None:
                values.append(event.value)
        return values
