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
