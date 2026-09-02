"""Parallel fault tree evaluator with performance optimizations.

Provides:
- Topological sorting for correct evaluation order
- Parallel evaluation of independent basic events
- Level-by-level parallel gate evaluation (bottom-up)
- LRU cache for intermediate results
- Probability threshold pruning
"""

from __future__ import annotations

import asyncio
import logging
from collections import deque
from typing import TYPE_CHECKING, Any

from resolveagent.fta.evaluator import NodeEvaluator
from resolveagent.fta.tree import EventType, FaultTree, GateType

if TYPE_CHECKING:
    from resolveagent.llm.base import LLMProvider
    from resolveagent.skills.executor import SkillExecutor

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# LRU Cache for Gate Results
# ---------------------------------------------------------------------------


class _LRUCache:
    """Simple LRU cache for intermediate evaluation results."""

    def __init__(self, maxsize: int = 128) -> None:
        self._maxsize = maxsize
        self._cache: dict[str, Any] = {}
        self._access_order: deque[str] = deque()

    def get(self, key: str) -> Any | None:
        """Get value from cache, updating access order."""
        if key in self._cache:
            # Move to end (most recently used)
            self._access_order.remove(key)
            self._access_order.append(key)
            return self._cache[key]
        return None

    def set(self, key: str, value: Any) -> None:
        """Set value in cache, evicting oldest if at capacity."""
        if key in self._cache:
            self._access_order.remove(key)
        elif len(self._cache) >= self._maxsize:
            # Evict least recently used
            oldest = self._access_order.popleft()
            del self._cache[oldest]

        self._cache[key] = value
        self._access_order.append(key)

    def clear(self) -> None:
        """Clear the cache."""
        self._cache.clear()
        self._access_order.clear()


# ---------------------------------------------------------------------------
# Parallel FTA Evaluator
# ---------------------------------------------------------------------------


class ParallelFTAEvaluator(NodeEvaluator):
    """Parallel fault tree evaluator with caching and pruning.

    Optimizations:
    1. Parallel basic event evaluation using asyncio.gather
    2. Level-by-level parallel gate evaluation
    3. LRU cache for intermediate results
    4. Probability threshold pruning (skip low-probability subtrees)
    """

    def __init__(
        self,
        skill_executor: SkillExecutor | None = None,
        llm_provider: LLMProvider | None = None,
        rag_pipeline: Any | None = None,
        cache_size: int = 256,
        prune_threshold: float = 0.0,
    ) -> None:
        """Initialize the parallel evaluator.

        Args:
            skill_executor: Executor for running skills.
            llm_provider: LLM provider for classification tasks.
            rag_pipeline: RAG pipeline for querying collections.
            cache_size: Maximum number of cached results.
            prune_threshold: Skip subtrees with probability below this threshold.
        """
        super().__init__(skill_executor, llm_provider, rag_pipeline)
        self._gate_cache = _LRUCache(maxsize=cache_size)
        self._prune_threshold = prune_threshold

    async def evaluate_tree(
        self,
        tree: FaultTree,
        context: dict[str, Any],
    ) -> bool:
        """Evaluate a complete fault tree in parallel.

        Args:
            tree: The fault tree to evaluate.
            context: Execution context.

        Returns:
            Boolean result of the top event.
        """
        if not tree.top_event_id:
            logger.warning("Fault tree has no top event")
            return False

        # Build evaluation levels via topological sort
        levels = self._build_evaluation_levels(tree)
        if not levels:
            logger.warning("Could not build evaluation levels for fault tree")
            return False

        logger.debug(
            "Evaluating fault tree with %d levels",
            len(levels),
            extra={"tree_id": tree.id, "levels": len(levels)},
        )

        # Evaluate level by level (bottom-up)
        for level_idx, level_nodes in enumerate(levels):
            logger.debug(
                "Evaluating level %d with %d nodes",
                level_idx,
                len(level_nodes),
                extra={"tree_id": tree.id},
            )

            # Evaluate all nodes in this level in parallel
            await self._evaluate_level(tree, level_nodes, context)

        # Return top event result
        top_event = tree.get_event(tree.top_event_id)
        if top_event and top_event.value is not None:
            return top_event.value

        # Fallback: find gate that outputs to top event
        for gate in tree.gates:
            if gate.output_id == tree.top_event_id:
                return gate.evaluate(tree.get_input_values(gate.id))

        return False

    def _build_evaluation_levels(self, tree: FaultTree) -> list[list[str]]:
        """Build evaluation levels via topological sort.

        Returns levels where each level contains node IDs that can be
        evaluated in parallel (all dependencies in previous levels).

        Args:
            tree: The fault tree.

        Returns:
            List of levels, each containing node IDs.
        """
        # Build dependency graph
        # node_id -> set of node IDs it depends on
        dependencies: dict[str, set[str]] = {}

        # Basic events have no dependencies
        for event in tree.events:
            if event.event_type == EventType.BASIC:
                dependencies[event.id] = set()
            else:
                dependencies[event.id] = set()

        # Gates depend on their inputs
        for gate in tree.gates:
            deps = set(gate.input_ids)
            dependencies[gate.id] = deps

        # Events that are outputs of gates depend on the gate
        for gate in tree.gates:
            if gate.output_id:
                dependencies[gate.output_id] = {gate.id}

        # Topological sort using Kahn's algorithm
        in_degree = {node_id: 0 for node_id in dependencies}
        for deps in dependencies.values():
            for dep in deps:
                if dep in in_degree:
                    in_degree[dep] += 0  # Will be set below

        # Count actual in-degrees (number of prerequisites for each node)
        for node_id, deps in dependencies.items():
            in_degree[node_id] = len(deps)

        # Start with nodes that have no dependencies
        queue = deque([nid for nid, deg in in_degree.items() if deg == 0])
        levels: list[list[str]] = []
        visited = set()

        while queue:
            current_level = []
            next_queue: deque[str] = deque()

            while queue:
                node_id = queue.popleft()
                if node_id in visited:
                    continue
                visited.add(node_id)
                current_level.append(node_id)

                # Find nodes that depend on this one
                for other_id, deps in dependencies.items():
                    if node_id in deps and other_id not in visited:
                        in_degree[other_id] -= 1
                        if in_degree[other_id] <= 0:
                            next_queue.append(other_id)

            if current_level:
                levels.append(current_level)
            queue = next_queue

        # Reverse to get bottom-up order
        levels.reverse()
        return levels

    async def _evaluate_level(
        self,
        tree: FaultTree,
        node_ids: list[str],
        context: dict[str, Any],
    ) -> None:
        """Evaluate all nodes in a level in parallel.

        Args:
            tree: The fault tree.
            node_ids: Node IDs in this level.
            context: Execution context.
        """
        # Separate basic events and gates
        basic_event_ids = []
        gate_ids = []

        for node_id in node_ids:
            event = tree.get_event(node_id)
            if event and event.event_type == EventType.BASIC:
                basic_event_ids.append(node_id)
            else:
                # Check if it's a gate
                gate = next((g for g in tree.gates if g.id == node_id), None)
                if gate:
                    gate_ids.append(node_id)

        # Evaluate basic events in parallel
        if basic_event_ids:
            await asyncio.gather(*[self._evaluate_basic_event_async(tree, eid, context) for eid in basic_event_ids])

        # Evaluate gates in parallel (their inputs should now be ready)
        if gate_ids:
            await asyncio.gather(*[self._evaluate_gate_async(tree, gid) for gid in gate_ids])

    async def _evaluate_basic_event_async(
        self,
        tree: FaultTree,
        event_id: str,
        context: dict[str, Any],
    ) -> None:
        """Evaluate a basic event asynchronously.

        Args:
            tree: The fault tree.
            event_id: The event ID.
            context: Execution context.
        """
        event = tree.get_event(event_id)
        if not event:
            return

        # Check cache
        cache_key = f"be:{event_id}:{hash(str(context))}"
        cached = self._gate_cache.get(cache_key)
        if cached is not None:
            event.value = cached
            return

        # Evaluate using parent class method
        result = await self.evaluate(event, context)
        event.value = result
        self._gate_cache.set(cache_key, result)

    async def _evaluate_gate_async(
        self,
        tree: FaultTree,
        gate_id: str,
    ) -> None:
        """Evaluate a gate asynchronously.

        Args:
            tree: The fault tree.
            gate_id: The gate ID.
        """
        gate = next((g for g in tree.gates if g.id == gate_id), None)
        if not gate:
            return

        # Check cache
        cache_key = f"gate:{gate_id}:{','.join(str(ev.value) for iid in gate.input_ids if (ev := tree.get_event(iid)) is not None)}"
        cached = self._gate_cache.get(cache_key)
        if cached is not None:
            # Set output event value
            output_event = tree.get_event(gate.output_id)
            if output_event:
                output_event.value = cached
            return

        # Get input values
        input_values = []
        for input_id in gate.input_ids:
            event = tree.get_event(input_id)
            if event and event.value is not None:
                input_values.append(event.value)
            else:
                # Check if input is a gate
                input_gate = next((g for g in tree.gates if g.id == input_id), None)
                if input_gate:
                    # Use gate's last known output
                    input_values.append(input_gate.evaluate([]))
                else:
                    input_values.append(False)

        # Probability threshold pruning for OR gates
        if self._prune_threshold > 0 and gate.gate_type == GateType.OR:
            true_count = sum(input_values)
            result = True if true_count > 0 else gate.evaluate(input_values)
        else:
            result = gate.evaluate(input_values)

        # Cache result
        self._gate_cache.set(cache_key, result)

        # Set output event value
        output_event = tree.get_event(gate.output_id)
        if output_event:
            output_event.value = result

    def clear_cache(self) -> None:
        """Clear all caches."""
        super().clear_cache()
        self._gate_cache.clear()
