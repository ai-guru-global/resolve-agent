"""Unit tests for the FTA Engine."""

from resolveagent.fta.gates import and_gate, or_gate, voting_gate
from resolveagent.fta.tree import FaultTree, GateType


def test_and_gate():
    assert and_gate([True, True]) is True
    assert and_gate([True, False]) is False
    assert and_gate([False, False]) is False
    assert and_gate([]) is False


def test_or_gate():
    assert or_gate([True, False]) is True
    assert or_gate([False, False]) is False
    assert or_gate([True, True]) is True
    assert or_gate([]) is False


def test_voting_gate():
    assert voting_gate([True, True, False], k=2) is True
    assert voting_gate([True, False, False], k=2) is False
    assert voting_gate([True, True, True], k=3) is True


def test_fault_tree_basic_events(sample_fault_tree: FaultTree):
    basic = sample_fault_tree.get_basic_events()
    assert len(basic) == 2
    assert all(e.event_type.value == "basic" for e in basic)


def test_fault_tree_get_event(sample_fault_tree: FaultTree):
    event = sample_fault_tree.get_event("event-a")
    assert event is not None
    assert event.name == "Component A Fails"

    missing = sample_fault_tree.get_event("nonexistent")
    assert missing is None
