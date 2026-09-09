"""Unit tests for the FTA Engine."""

from resolveagent.fta.engine import FTAEngine
from resolveagent.fta.gates import and_gate, or_gate, voting_gate
from resolveagent.fta.tree import EventType, FaultTree, FTAEvent, FTAGate, GateType


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


def test_get_input_values_resolves_gate_inputs():
    tree = FaultTree(
        id="t",
        name="t",
        top_event_id="top",
        events=[
            FTAEvent(id="top", name="Top", event_type=EventType.TOP),
            FTAEvent(id="a", name="A", event_type=EventType.BASIC, value=True),
            FTAEvent(id="b", name="B", event_type=EventType.BASIC, value=True),
        ],
        gates=[
            FTAGate(id="g1", name="AND1", gate_type=GateType.AND, input_ids=["a", "b"], output_id="mid", value=True),
            FTAGate(id="g2", name="AND2", gate_type=GateType.AND, input_ids=["g1", "a"], output_id="top"),
        ],
    )

    assert tree.get_input_values("g2") == [True, True]


async def test_engine_writes_back_event_values():
    tree = FaultTree(
        id="t",
        name="t",
        top_event_id="top",
        events=[
            FTAEvent(id="top", name="Top", event_type=EventType.TOP),
            FTAEvent(id="a", name="A", event_type=EventType.BASIC, evaluator="static:true"),
            FTAEvent(id="b", name="B", event_type=EventType.BASIC, evaluator="static:false"),
        ],
        gates=[
            FTAGate(id="g1", name="OR", gate_type=GateType.OR, input_ids=["a", "b"], output_id="top"),
        ],
    )

    events = [event async for event in FTAEngine().execute(tree, {})]

    completed = next(e for e in events if e["type"] == "workflow.completed")
    assert completed["data"]["top_event_result"] is True
    assert tree.get_event("a").value is True
    assert tree.get_event("b").value is False
    assert tree.get_event("top").value is True


async def test_engine_nested_gate_chain_propagates_false():
    tree = FaultTree(
        id="t",
        name="t",
        top_event_id="top",
        events=[
            FTAEvent(id="top", name="Top", event_type=EventType.TOP),
            FTAEvent(id="a", name="A", event_type=EventType.BASIC, evaluator="static:true"),
            FTAEvent(id="b", name="B", event_type=EventType.BASIC, evaluator="static:false"),
        ],
        gates=[
            FTAGate(id="g1", name="AND1", gate_type=GateType.AND, input_ids=["a", "b"], output_id="mid"),
            FTAGate(id="g2", name="AND2", gate_type=GateType.AND, input_ids=["g1", "a"], output_id="top"),
        ],
    )

    events = [event async for event in FTAEngine().execute(tree, {})]

    completed = next(e for e in events if e["type"] == "workflow.completed")
    assert completed["data"]["top_event_result"] is False


def _probabilistic_or_tree() -> FaultTree:
    return FaultTree(
        id="t",
        name="t",
        top_event_id="top",
        events=[
            FTAEvent(id="top", name="Top", event_type=EventType.TOP),
            FTAEvent(id="a", name="A", event_type=EventType.BASIC, evaluator="static:false", probability=0.5),
            FTAEvent(id="b", name="B", event_type=EventType.BASIC, evaluator="static:false", probability=0.5),
        ],
        gates=[
            FTAGate(id="g1", name="OR", gate_type=GateType.OR, input_ids=["a", "b"], output_id="top")
        ],
    )


async def test_engine_includes_simulation_when_probabilities_present():
    tree = _probabilistic_or_tree()
    events = [event async for event in FTAEngine().execute(tree, {})]
    completed = next(e for e in events if e["type"] == "workflow.completed")
    sim = completed["data"]["simulation"]
    assert abs(sim["failure_probability"] - 0.75) < 0.05
    assert sim["runs"] == 10_000


async def test_engine_omits_simulation_without_probabilities():
    tree = FaultTree(
        id="t",
        name="t",
        top_event_id="top",
        events=[
            FTAEvent(id="top", name="Top", event_type=EventType.TOP),
            FTAEvent(id="a", name="A", event_type=EventType.BASIC, evaluator="static:true"),
            FTAEvent(id="b", name="B", event_type=EventType.BASIC, evaluator="static:false"),
        ],
        gates=[
            FTAGate(id="g1", name="OR", gate_type=GateType.OR, input_ids=["a", "b"], output_id="top")
        ],
    )
    events = [event async for event in FTAEngine().execute(tree, {})]
    completed = next(e for e in events if e["type"] == "workflow.completed")
    assert completed["data"]["simulation"] is None


async def test_analyze_returns_cut_sets_and_simulation():
    result = await FTAEngine().analyze(_probabilistic_or_tree(), runs=5_000, seed=42)
    assert sorted(sorted(cs) for cs in result.cut_sets) == [["a"], ["b"]]
    assert result.simulation is not None
    assert abs(result.failure_probability - 0.75) < 0.05


async def test_analyze_without_probabilities_skips_simulation():
    tree = FaultTree(
        id="t",
        name="t",
        top_event_id="top",
        events=[
            FTAEvent(id="top", name="Top", event_type=EventType.TOP),
            FTAEvent(id="a", name="A", event_type=EventType.BASIC),
            FTAEvent(id="b", name="B", event_type=EventType.BASIC),
        ],
        gates=[
            FTAGate(id="g1", name="OR", gate_type=GateType.OR, input_ids=["a", "b"], output_id="top")
        ],
    )
    result = await FTAEngine().analyze(tree)
    assert result.cut_sets
    assert result.simulation is None
    assert result.failure_probability is None
