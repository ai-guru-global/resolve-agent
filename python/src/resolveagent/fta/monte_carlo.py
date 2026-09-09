"""Monte Carlo simulation for fault trees.

Samples basic-event failures Bernoulli-style over many trials and propagates
them through gates bottom-up to estimate the top-event failure probability.

PRIORITY_AND gates use dynamic ordering semantics: each trial assigns a random
failure rank to every basic event, and the gate fires only when all inputs fail
in the order given by ``input_ids``. Ordering applies to BASIC inputs; gate
outputs as inputs are not rank-constrained (documented simplification).
"""

from __future__ import annotations

import logging
import math
import random
from dataclasses import dataclass
from typing import TYPE_CHECKING

from resolveagent.fta.tree import FaultTree, GateType

if TYPE_CHECKING:
    from resolveagent.fta.tree import FTAGate

logger = logging.getLogger(__name__)


@dataclass
class MonteCarloResult:
    """Aggregated outcome of a Monte Carlo simulation."""

    failure_probability: float
    confidence_interval: tuple[float, float]
    runs: int
    seed: int | None
    top_event_id: str


class MonteCarloSimulator:
    """Monte Carlo estimator for the top-event probability of a fault tree."""

    def __init__(self, default_runs: int = 10_000) -> None:
        self._default_runs = default_runs

    def simulate(
        self,
        tree: FaultTree,
        runs: int | None = None,
        seed: int | None = None,
    ) -> MonteCarloResult:
        """Simulate trials and estimate the top-event failure probability.

        Args:
            tree: Fault tree whose BASIC events carry ``probability`` in [0, 1].
            runs: Number of trials (defaults to ``default_runs``).
            seed: Optional RNG seed for reproducible results.

        Returns:
            MonteCarloResult with the estimate and a Wilson confidence interval.

        Raises:
            ValueError: If any BASIC event lacks a probability, a probability is
                out of [0, 1], or ``runs`` is not positive.
        """
        trials = runs if runs is not None else self._default_runs
        if trials <= 0:
            raise ValueError(f"runs must be positive, got {trials}")

        basics = tree.get_basic_events()
        if not basics:
            raise ValueError("fault tree has no basic events to simulate")

        missing = [e.id for e in basics if e.probability is None]
        if missing:
            raise ValueError(f"basic events missing probability: {', '.join(missing)}")

        for event in basics:
            if not 0.0 <= event.probability <= 1.0:
                raise ValueError(
                    f"probability for '{event.id}' out of range [0, 1]: {event.probability}"
                )

        rng = random.Random(seed)
        failures = 0
        for _ in range(trials):
            if self._sample_trial(tree, rng):
                failures += 1

        estimate = failures / trials
        logger.info(
            "Monte Carlo simulation complete",
            extra={
                "tree_id": tree.id,
                "runs": trials,
                "failures": failures,
                "failure_probability": estimate,
            },
        )
        return MonteCarloResult(
            failure_probability=estimate,
            confidence_interval=self._wilson_interval(failures, trials),
            runs=trials,
            seed=seed,
            top_event_id=tree.top_event_id,
        )

    def _sample_trial(self, tree: FaultTree, rng: random.Random) -> bool:
        """Run one trial: sample basic events, propagate gates, read the last gate result."""
        values: dict[str, bool] = {}
        ranks: dict[str, float] = {}
        for event in tree.get_basic_events():
            values[event.id] = rng.random() < event.probability
            ranks[event.id] = rng.random()

        gate_by_output: dict[str, FTAGate] = {g.output_id: g for g in tree.gates if g.output_id}
        gate_values: dict[str, bool] = {}
        top_result = False

        for gate in tree.get_gates_bottom_up():
            inputs = [self._resolve_input(i, values, gate_by_output, gate_values) for i in gate.input_ids]
            result = self._evaluate_gate(gate.gate_type, inputs, gate.k_value)
            if result and gate.gate_type == GateType.PRIORITY_AND:
                result = self._priority_order_ok(gate.input_ids, ranks)
            gate_values[gate.id] = result
            top_result = result

        return top_result

    @staticmethod
    def _resolve_input(
        node_id: str,
        values: dict[str, bool],
        gate_by_output: dict[str, FTAGate],
        gate_values: dict[str, bool],
    ) -> bool:
        """Resolve an input id to its sampled value (basic event or gate output)."""
        if node_id in values:
            return values[node_id]
        gate = gate_by_output.get(node_id)
        if gate is not None:
            return gate_values.get(gate.id, False)
        return False

    @staticmethod
    def _evaluate_gate(gate_type: GateType, inputs: list[bool], k_value: int) -> bool:
        if not inputs:
            return False
        if gate_type == GateType.AND:
            return all(inputs)
        if gate_type == GateType.OR:
            return any(inputs)
        if gate_type == GateType.VOTING:
            return sum(inputs) >= k_value
        if gate_type in (GateType.INHIBIT, GateType.PRIORITY_AND):
            return all(inputs)
        return False

    @staticmethod
    def _priority_order_ok(input_ids: list[str], ranks: dict[str, float]) -> bool:
        """True when ranked inputs failed in input_ids order (strictly increasing)."""
        seq = [ranks[i] for i in input_ids if i in ranks]
        return all(seq[i] < seq[i + 1] for i in range(len(seq) - 1))

    @staticmethod
    def _wilson_interval(successes: int, n: int, z: float = 1.96) -> tuple[float, float]:
        if n == 0:
            return (0.0, 1.0)
        p = successes / n
        denom = 1.0 + z * z / n
        center = (p + z * z / (2 * n)) / denom
        margin = z * math.sqrt(p * (1.0 - p) / n + z * z / (4.0 * n * n)) / denom
        return (max(0.0, center - margin), min(1.0, center + margin))
