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
        gates=[FTAGate(id="g1", name="INH", gate_type=GateType.INHIBIT, input_ids=gate_inputs, output_id="top")],
    )


def test_validate_inhibit_with_conditioning_event_has_no_warning():
    assert _tree_with_inhibit(conditioning=True).validate() == []


def test_validate_inhibit_without_conditioning_event_warns():
    warnings = _tree_with_inhibit(conditioning=False).validate()
    assert len(warnings) == 1
    assert "g1" in warnings[0]


def _two_input_tree(gate_type: GateType, p_a: float, p_b: float, **gate_kwargs) -> FaultTree:
    return FaultTree(
        id="t",
        name="t",
        top_event_id="top",
        events=[
            FTAEvent(id="top", name="Top", event_type=EventType.TOP),
            FTAEvent(id="a", name="A", event_type=EventType.BASIC, probability=p_a),
            FTAEvent(id="b", name="B", event_type=EventType.BASIC, probability=p_b),
        ],
        gates=[
            FTAGate(
                id="g1",
                name="g1",
                gate_type=gate_type,
                input_ids=["a", "b"],
                output_id="top",
                **gate_kwargs,
            )
        ],
    )


def test_or_gate_matches_analytic_solution():
    result = MonteCarloSimulator().simulate(_two_input_tree(GateType.OR, 0.5, 0.5), runs=50_000, seed=42)
    assert abs(result.failure_probability - 0.75) < 0.02


def test_and_gate_matches_analytic_solution():
    result = MonteCarloSimulator().simulate(_two_input_tree(GateType.AND, 0.3, 0.4), runs=50_000, seed=42)
    assert abs(result.failure_probability - 0.12) < 0.02


def test_voting_gate_matches_analytic_solution():
    tree = _two_input_tree(GateType.VOTING, 0.5, 0.5, k_value=2)
    tree.events.append(FTAEvent(id="c", name="C", event_type=EventType.BASIC, probability=0.5))
    tree.gates[0].input_ids = ["a", "b", "c"]
    # P(≥2 of 3 fail, p=0.5) = 0.5
    result = MonteCarloSimulator().simulate(tree, runs=50_000, seed=42)
    assert abs(result.failure_probability - 0.5) < 0.02


def test_same_seed_is_reproducible():
    sim = MonteCarloSimulator()
    r1 = sim.simulate(_two_input_tree(GateType.OR, 0.5, 0.5), runs=5_000, seed=7)
    r2 = sim.simulate(_two_input_tree(GateType.OR, 0.5, 0.5), runs=5_000, seed=7)
    assert r1.failure_probability == r2.failure_probability
    assert r1.confidence_interval == r2.confidence_interval


def test_priority_and_requires_input_order():
    # p=1.0 双输入：两事件必然都失效，失效顺序随机 → 恰好一半试验满足 input_ids 顺序
    result = MonteCarloSimulator().simulate(_two_input_tree(GateType.PRIORITY_AND, 1.0, 1.0), runs=50_000, seed=42)
    assert abs(result.failure_probability - 0.5) < 0.03


def test_priority_and_asymmetric_probability():
    # P(双失效)=0.5 × P(顺序命中)=0.5 → 0.25
    result = MonteCarloSimulator().simulate(_two_input_tree(GateType.PRIORITY_AND, 1.0, 0.5), runs=50_000, seed=42)
    assert abs(result.failure_probability - 0.25) < 0.03


def test_confidence_interval_brackets_estimate():
    result = MonteCarloSimulator().simulate(_two_input_tree(GateType.OR, 0.5, 0.5), runs=10_000, seed=1)
    low, high = result.confidence_interval
    assert 0.0 <= low <= result.failure_probability <= high <= 1.0


def test_missing_probability_raises():
    tree = _two_input_tree(GateType.OR, 0.5, 0.5)
    tree.events[1].probability = None
    with pytest.raises(ValueError, match="missing probability"):
        MonteCarloSimulator().simulate(tree)


def test_out_of_range_probability_raises():
    with pytest.raises(ValueError, match="out of range"):
        MonteCarloSimulator().simulate(_two_input_tree(GateType.OR, 1.5, 0.5))
