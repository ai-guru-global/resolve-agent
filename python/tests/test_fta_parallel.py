"""Tests for parallel FTA evaluator."""

from __future__ import annotations

import pytest

from resolveagent.fta.parallel_evaluator import ParallelFTAEvaluator
from resolveagent.fta.tree import EventType, FaultTree, FTAEvent, FTAGate, GateType


class TestParallelFTAEvaluator:
    """Tests for parallel fault tree evaluator."""

    def test_build_evaluation_levels(self):
        """Test topological sort builds correct levels."""
        evaluator = ParallelFTAEvaluator()

        # Simple tree: A AND B -> TOP
        tree = FaultTree(
            id="test",
            name="Simple AND",
            top_event_id="top",
            events=[
                FTAEvent(id="top", name="Top", event_type=EventType.TOP),
                FTAEvent(id="A", name="A", event_type=EventType.BASIC, value=True),
                FTAEvent(id="B", name="B", event_type=EventType.BASIC, value=True),
            ],
            gates=[
                FTAGate(id="g1", name="AND Gate", gate_type=GateType.AND, input_ids=["A", "B"], output_id="top"),
            ],
        )

        levels = evaluator._build_evaluation_levels(tree)
        # Should have at least 1 level containing all nodes
        flat_levels = [node for level in levels for node in level]
        assert "A" in flat_levels
        assert "B" in flat_levels
        assert "top" in flat_levels or "g1" in flat_levels

    @pytest.mark.asyncio
    async def test_evaluate_simple_and_tree(self):
        """Test evaluating a simple AND gate tree."""
        evaluator = ParallelFTAEvaluator()

        tree = FaultTree(
            id="test",
            name="Simple AND",
            top_event_id="top",
            events=[
                FTAEvent(id="top", name="Top", event_type=EventType.TOP),
                FTAEvent(id="A", name="A", event_type=EventType.BASIC, value=True),
                FTAEvent(id="B", name="B", event_type=EventType.BASIC, value=True),
            ],
            gates=[
                FTAGate(id="g1", name="AND Gate", gate_type=GateType.AND, input_ids=["A", "B"], output_id="top"),
            ],
        )

        result = await evaluator.evaluate_tree(tree, {})
        assert result is True  # True AND True = True

    @pytest.mark.asyncio
    async def test_evaluate_simple_or_tree(self):
        """Test evaluating a simple OR gate tree."""
        evaluator = ParallelFTAEvaluator()

        tree = FaultTree(
            id="test",
            name="Simple OR",
            top_event_id="top",
            events=[
                FTAEvent(id="top", name="Top", event_type=EventType.TOP),
                FTAEvent(id="A", name="A", event_type=EventType.BASIC, value=False),
                FTAEvent(id="B", name="B", event_type=EventType.BASIC, value=True),
            ],
            gates=[
                FTAGate(id="g1", name="OR Gate", gate_type=GateType.OR, input_ids=["A", "B"], output_id="top"),
            ],
        )

        result = await evaluator.evaluate_tree(tree, {})
        assert result is True  # False OR True = True

    @pytest.mark.asyncio
    async def test_evaluate_voting_gate(self):
        """Test evaluating a VOTING gate."""
        evaluator = ParallelFTAEvaluator()

        tree = FaultTree(
            id="test",
            name="Voting Gate",
            top_event_id="top",
            events=[
                FTAEvent(id="top", name="Top", event_type=EventType.TOP),
                FTAEvent(id="A", name="A", event_type=EventType.BASIC, value=True),
                FTAEvent(id="B", name="B", event_type=EventType.BASIC, value=False),
                FTAEvent(id="C", name="C", event_type=EventType.BASIC, value=True),
            ],
            gates=[
                FTAGate(id="g1", name="2-of-3", gate_type=GateType.VOTING, input_ids=["A", "B", "C"], output_id="top", k_value=2),
            ],
        )

        result = await evaluator.evaluate_tree(tree, {})
        assert result is True  # 2 True out of 3, k=2

    @pytest.mark.asyncio
    async def test_evaluate_nested_gates(self):
        """Test evaluating nested gates."""
        evaluator = ParallelFTAEvaluator()

        tree = FaultTree(
            id="test",
            name="Nested",
            top_event_id="top",
            events=[
                FTAEvent(id="top", name="Top", event_type=EventType.TOP),
                FTAEvent(id="A", name="A", event_type=EventType.BASIC, value=True),
                FTAEvent(id="B", name="B", event_type=EventType.BASIC, value=True),
                FTAEvent(id="C", name="C", event_type=EventType.BASIC, value=False),
                FTAEvent(id="D", name="D", event_type=EventType.BASIC, value=True),
            ],
            gates=[
                FTAGate(id="g1", name="AND1", gate_type=GateType.AND, input_ids=["A", "B"], output_id="mid"),
                FTAGate(id="g2", name="OR1", gate_type=GateType.OR, input_ids=["mid", "C", "D"], output_id="top"),
            ],
        )

        result = await evaluator.evaluate_tree(tree, {})
        assert result is True  # (A AND B) OR C OR D = True OR False OR True = True

    @pytest.mark.asyncio
    async def test_cache_usage(self):
        """Test that caching works correctly."""
        evaluator = ParallelFTAEvaluator()

        tree = FaultTree(
            id="test",
            name="Cache Test",
            top_event_id="top",
            events=[
                FTAEvent(id="top", name="Top", event_type=EventType.TOP),
                FTAEvent(id="A", name="A", event_type=EventType.BASIC, value=True),
            ],
            gates=[
                FTAGate(id="g1", name="AND", gate_type=GateType.AND, input_ids=["A"], output_id="top"),
            ],
        )

        # First evaluation
        result1 = await evaluator.evaluate_tree(tree, {})

        # Second evaluation should use cache
        result2 = await evaluator.evaluate_tree(tree, {})

        assert result1 == result2

    @pytest.mark.asyncio
    async def test_empty_tree(self):
        """Test evaluating empty tree."""
        evaluator = ParallelFTAEvaluator()

        tree = FaultTree(id="empty", name="Empty", top_event_id="")

        result = await evaluator.evaluate_tree(tree, {})
        assert result is False

    @pytest.mark.asyncio
    async def test_pruning_threshold(self):
        """Test probability threshold pruning."""
        evaluator = ParallelFTAEvaluator(prune_threshold=0.5)

        tree = FaultTree(
            id="test",
            name="Prune Test",
            top_event_id="top",
            events=[
                FTAEvent(id="top", name="Top", event_type=EventType.TOP),
                FTAEvent(id="A", name="A", event_type=EventType.BASIC, value=True),
                FTAEvent(id="B", name="B", event_type=EventType.BASIC, value=False),
            ],
            gates=[
                FTAGate(id="g1", name="OR", gate_type=GateType.OR, input_ids=["A", "B"], output_id="top"),
            ],
        )

        result = await evaluator.evaluate_tree(tree, {})
        assert result is True  # A is True, so OR is True

    def test_lru_cache(self):
        """Test LRU cache behavior."""
        from resolveagent.fta.parallel_evaluator import _LRUCache
        cache = _LRUCache(maxsize=2)

        cache.set("a", 1)
        cache.set("b", 2)
        cache.set("c", 3)  # Should evict "a"

        assert cache.get("a") is None
        assert cache.get("b") == 2
        assert cache.get("c") == 3

        # Access "b" to make it recently used
        cache.get("b")
        cache.set("d", 4)  # Should evict "c"

        assert cache.get("c") is None
        assert cache.get("b") == 2
        assert cache.get("d") == 4
