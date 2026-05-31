"""Fault tree data structures."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class EventType(StrEnum):
    """FTA event types."""

    TOP = "top"
    INTERMEDIATE = "intermediate"
    BASIC = "basic"
    UNDEVELOPED = "undeveloped"
    CONDITIONING = "conditioning"


class GateType(StrEnum):
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
        """Get gates in bottom-up evaluation order using topological sort."""
        if not self.gates:
            return []

        # Build adjacency list: gate -> list of gates that depend on it
        in_degree: dict[str, int] = {g.id: 0 for g in self.gates}
        dependents: dict[str, list[str]] = {g.id: [] for g in self.gates}

        for gate in self.gates:
            for input_id in gate.input_ids:
                # input_id may refer to an event or another gate
                parent_gate = next((g for g in self.gates if g.id == input_id), None)
                if parent_gate:
                    dependents[parent_gate.id].append(gate.id)
                    in_degree[gate.id] += 1

        # Kahn's algorithm
        queue = [gid for gid, deg in in_degree.items() if deg == 0]
        ordered_ids: list[str] = []

        while queue:
            current_id = queue.pop(0)
            ordered_ids.append(current_id)
            for dependent_id in dependents[current_id]:
                in_degree[dependent_id] -= 1
                if in_degree[dependent_id] == 0:
                    queue.append(dependent_id)

        if len(ordered_ids) != len(self.gates):
            # Cycle detected or disconnected graph; fall back to reverse order
            return list(reversed(self.gates))

        id_to_gate = {g.id: g for g in self.gates}
        return [id_to_gate[gid] for gid in ordered_ids]

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
