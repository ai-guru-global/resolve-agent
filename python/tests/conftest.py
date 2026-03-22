"""Shared pytest fixtures."""

import pytest

from resolvenet.fta.tree import EventType, FaultTree, FTAEvent, FTAGate, GateType


@pytest.fixture
def sample_fault_tree() -> FaultTree:
    """Create a sample fault tree for testing."""
    return FaultTree(
        id="test-tree",
        name="Test Fault Tree",
        top_event_id="top-event",
        events=[
            FTAEvent(
                id="top-event",
                name="System Failure",
                event_type=EventType.TOP,
            ),
            FTAEvent(
                id="event-a",
                name="Component A Fails",
                event_type=EventType.BASIC,
                evaluator="skill:check-a",
            ),
            FTAEvent(
                id="event-b",
                name="Component B Fails",
                event_type=EventType.BASIC,
                evaluator="skill:check-b",
            ),
        ],
        gates=[
            FTAGate(
                id="gate-or-1",
                name="Any Component Fails",
                gate_type=GateType.OR,
                input_ids=["event-a", "event-b"],
                output_id="top-event",
            ),
        ],
    )
