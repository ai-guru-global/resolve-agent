"""Minimal cut set computation for FTA explainability.

Implements the MOCUS (Method of Obtaining Cut Sets) algorithm for
computing minimal cut sets in fault trees.
"""

from __future__ import annotations

import logging
from copy import deepcopy

from resolveagent.fta.tree import FaultTree, GateType, EventType

logger = logging.getLogger(__name__)


def compute_minimal_cut_sets(tree: FaultTree) -> list[set[str]]:
    """Compute minimal cut sets for a fault tree using MOCUS algorithm.

    MOCUS (Method of Obtaining Cut Sets) is a bottom-up algorithm that:
    1. Starts with the top event
    2. Expands gates according to their type:
       - OR gate: creates multiple cut sets (one per input)
       - AND gate: expands current cut set (combines inputs)
    3. Continues until all events are basic events
    4. Removes duplicate and absorbed (superset) cut sets

    Args:
        tree: The fault tree to analyze.

    Returns:
        List of minimal cut sets (each a set of event IDs).
    """
    if not tree.top_event_id:
        return []

    # Build gate lookup
    gates_by_output = {g.output_id: g for g in tree.gates}
    gates_by_id = {g.id: g for g in tree.gates}
    events_by_id = {e.id: e for e in tree.events}

    # Initialize with top event
    initial_cut_sets = [{tree.top_event_id}]

    # Expand cut sets until all are basic events
    cut_sets = _expand_cut_sets(
        initial_cut_sets,
        gates_by_output,
        gates_by_id,
        events_by_id,
    )

    # Remove absorbed (superset) cut sets
    minimal_cut_sets = _remove_absorbed_cut_sets(cut_sets)

    logger.info(
        "Computed minimal cut sets",
        extra={
            "tree_id": tree.id,
            "total_cut_sets": len(minimal_cut_sets),
            "cut_set_sizes": [len(cs) for cs in minimal_cut_sets],
        },
    )

    return minimal_cut_sets


def _expand_cut_sets(
    cut_sets: list[set[str]],
    gates_by_output: dict[str, any],
    gates_by_id: dict[str, any],
    events_by_id: dict[str, any],
) -> list[set[str]]:
    """Expand cut sets by replacing intermediate events with their gates.

    Args:
        cut_sets: Current list of cut sets.
        gates_by_output: Mapping from output event ID to gate.
        gates_by_id: Mapping from gate ID to gate.
        events_by_id: Mapping from event ID to event.

    Returns:
        Expanded cut sets where all events are basic events.
    """
    changed = True
    max_iterations = 100  # Prevent infinite loops
    iteration = 0

    while changed and iteration < max_iterations:
        changed = False
        iteration += 1
        new_cut_sets = []

        for cut_set in cut_sets:
            # Find first non-basic event in this cut set
            expandable_event = None
            for event_id in cut_set:
                event = events_by_id.get(event_id)
                if event and event.event_type != EventType.BASIC:
                    # Check if this event is output of a gate
                    if event_id in gates_by_output:
                        expandable_event = event_id
                        break

            if expandable_event is None:
                # All events are basic, keep this cut set
                new_cut_sets.append(cut_set)
                continue

            # Expand this event using its gate
            gate = gates_by_output[expandable_event]
            expanded = _expand_event_in_cut_set(
                cut_set, expandable_event, gate, events_by_id
            )
            new_cut_sets.extend(expanded)
            changed = True

        cut_sets = new_cut_sets

    if iteration >= max_iterations:
        logger.warning(
            "Max iterations reached in cut set expansion",
            extra={"max_iterations": max_iterations},
        )

    return cut_sets


def _expand_event_in_cut_set(
    cut_set: set[str],
    event_id: str,
    gate: any,
    events_by_id: dict[str, any],
) -> list[set[str]]:
    """Expand a single event in a cut set using its gate.

    Args:
        cut_set: The cut set containing the event.
        event_id: The event to expand.
        gate: The gate defining this event.
        events_by_id: Mapping from event ID to event.

    Returns:
        New cut sets after expansion.
    """
    # Remove the expanded event from the cut set
    base_cut_set = cut_set - {event_id}

    if gate.gate_type == GateType.OR:
        # OR gate: create one cut set per input
        # (any input can cause the output)
        new_cut_sets = []
        for input_id in gate.input_ids:
            new_cut_set = base_cut_set | {input_id}
            new_cut_sets.append(new_cut_set)
        return new_cut_sets

    elif gate.gate_type == GateType.AND:
        # AND gate: combine all inputs into the cut set
        # (all inputs must occur for the output)
        new_cut_set = base_cut_set | set(gate.input_ids)
        return [new_cut_set]

    elif gate.gate_type == GateType.VOTING:
        # VOTING gate: k-out-of-n
        # For minimal cut sets, we need combinations of k inputs
        from itertools import combinations
        k = getattr(gate, 'k_value', 1)
        new_cut_sets = []
        for combo in combinations(gate.input_ids, k):
            new_cut_set = base_cut_set | set(combo)
            new_cut_sets.append(new_cut_set)
        return new_cut_sets

    elif gate.gate_type in (GateType.INHIBIT, GateType.PRIORITY_AND):
        # These behave like AND gates for cut set computation
        new_cut_set = base_cut_set | set(gate.input_ids)
        return [new_cut_set]

    else:
        # Unknown gate type, treat inputs as separate cut sets
        logger.warning("Unknown gate type: %s", gate.gate_type)
        new_cut_sets = []
        for input_id in gate.input_ids:
            new_cut_set = base_cut_set | {input_id}
            new_cut_sets.append(new_cut_set)
        return new_cut_sets


def _remove_absorbed_cut_sets(cut_sets: list[set[str]]) -> list[set[str]]:
    """Remove absorbed (superset) cut sets.

    A cut set is absorbed if it is a superset of another cut set.
    Minimal cut sets should not contain any other cut set as a subset.

    Args:
        cut_sets: List of cut sets.

    Returns:
        List of minimal cut sets with absorbed sets removed.
    """
    if not cut_sets:
        return []

    # Sort by size (smallest first) for efficient absorption check
    sorted_cut_sets = sorted(cut_sets, key=lambda x: (len(x), sorted(x)))

    minimal = []
    for cut_set in sorted_cut_sets:
        # Check if this cut set is absorbed by any already-minimal set
        is_absorbed = False
        for minimal_set in minimal:
            if minimal_set <= cut_set:  # minimal_set is subset of cut_set
                is_absorbed = True
                break

        if not is_absorbed:
            minimal.append(cut_set)

    # Remove duplicates by converting to frozenset and back
    unique_minimal = [set(cs) for cs in {frozenset(cs) for cs in minimal}]

    # Sort by size for consistent output
    return sorted(unique_minimal, key=lambda x: (len(x), sorted(x)))


def explain_cut_sets(cut_sets: list[set[str]], tree: FaultTree) -> list[str]:
    """Generate human-readable explanations of cut sets.

    Args:
        cut_sets: Minimal cut sets to explain.
        tree: The fault tree for event name lookup.

    Returns:
        List of explanation strings.
    """
    explanations = []
    events_by_id = {e.id: e for e in tree.events}

    for i, cut_set in enumerate(cut_sets, 1):
        event_names = []
        for event_id in cut_set:
            event = events_by_id.get(event_id)
            if event:
                event_names.append(event.name)
            else:
                event_names.append(event_id)

        if len(event_names) == 1:
            explanation = f"Cut Set {i}: {event_names[0]}"
        else:
            explanation = f"Cut Set {i}: {' AND '.join(event_names)}"

        explanations.append(explanation)

    return explanations


def compute_cut_set_probability(
    cut_set: set[str],
    tree: FaultTree,
    event_probabilities: dict[str, float] | None = None,
) -> float:
    """Compute the probability of a cut set occurring.

    For a cut set to occur, all events in it must occur.
    Assuming independence: P(A AND B) = P(A) * P(B)

    Args:
        cut_set: The cut set to compute probability for.
        tree: The fault tree containing event definitions.
        event_probabilities: Optional mapping from event ID to probability.
            If not provided, assumes equal probability for all events.

    Returns:
        Probability of the cut set (0.0 to 1.0).
    """
    if not cut_set:
        return 0.0

    events_by_id = {e.id: e for e in tree.events}
    event_probs = event_probabilities or {}

    probability = 1.0
    for event_id in cut_set:
        event = events_by_id.get(event_id)
        if event:
            # Use provided probability or default to 0.5
            prob = event_probs.get(event_id, getattr(event, 'probability', 0.5))
            probability *= prob

    return probability


def rank_cut_sets_by_importance(
    cut_sets: list[set[str]],
    tree: FaultTree,
    event_probabilities: dict[str, float] | None = None,
) -> list[tuple[set[str], float]]:
    """Rank cut sets by their importance (probability).

    Args:
        cut_sets: List of cut sets to rank.
        tree: The fault tree.
        event_probabilities: Optional mapping from event ID to probability.

    Returns:
        List of (cut_set, probability) tuples sorted by probability (descending).
    """
    ranked = []
    for cut_set in cut_sets:
        prob = compute_cut_set_probability(cut_set, tree, event_probabilities)
        ranked.append((cut_set, prob))

    # Sort by probability (descending), then by size (ascending)
    return sorted(ranked, key=lambda x: (-x[1], len(x[0])))
