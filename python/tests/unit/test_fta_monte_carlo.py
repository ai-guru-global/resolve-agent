"""Unit tests for FTA probability model and Monte Carlo simulation."""

import pytest

from resolveagent.fta.monte_carlo import MonteCarloSimulator
from resolveagent.fta.tree import EventType, FaultTree, FTAEvent, FTAGate, GateType


def test_fta_event_probability_defaults_to_none():
    event = FTAEvent(id="a", name="A")
    assert event.probability is None


def test_fta_event_probability_accepts_value():
    event = FTAEvent(id="a", name="A", probability=0.3)
    assert event.probability == 0.3


def _tree_with_inhibit(conditioning: bool) -> FaultTree:
    events = [
        FTAEvent(id="top", name="Top", event_type=EventType.TOP),
        FTAEvent(id="a", name="A", event_type=EventType.BASIC),
    ]
    gate_inputs = ["a"]
    if conditioning:
        events.append(FTAEvent(id="cond", name="Cond", event_type=EventType.CONDITIONING))
        gate_inputs.append("cond")
    return FaultTree(
        id="t",
        name="t",
        top_event_id="top",
        events=events,
        gates=[
            FTAGate(id="g1", name="INH", gate_type=GateType.INHIBIT, input_ids=gate_inputs, output_id="top")
        ],
    )


def test_validate_inhibit_with_conditioning_event_has_no_warning():
    assert _tree_with_inhibit(conditioning=True).validate() == []


def test_validate_inhibit_without_conditioning_event_warns():
    warnings = _tree_with_inhibit(conditioning=False).validate()
    assert len(warnings) == 1
    assert "g1" in warnings[0]
