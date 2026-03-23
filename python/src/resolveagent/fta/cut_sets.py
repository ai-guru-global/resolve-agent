"""Minimal cut set computation for FTA explainability."""

from __future__ import annotations

from resolveagent.fta.tree import FaultTree, GateType


def compute_minimal_cut_sets(tree: FaultTree) -> list[set[str]]:
    """Compute minimal cut sets for a fault tree.

    A minimal cut set is a smallest combination of basic events
    that, if all occur, will cause the top event.

    Args:
        tree: The fault tree to analyze.

    Returns:
        List of minimal cut sets (each a set of event IDs).
    """
    if not tree.top_event_id:
        return []

    # TODO: Implement MOCUS algorithm or BDD-based computation
    # For now, return a simple placeholder
    basic_events = tree.get_basic_events()
    return [{e.id for e in basic_events}]


def explain_cut_sets(cut_sets: list[set[str]], tree: FaultTree) -> list[str]:
    """Generate human-readable explanations of cut sets.

    Args:
        cut_sets: Minimal cut sets to explain.
        tree: The fault tree for event name lookup.

    Returns:
        List of explanation strings.
    """
    explanations = []
    for i, cut_set in enumerate(cut_sets, 1):
        event_names = []
        for event_id in cut_set:
            event = tree.get_event(event_id)
            if event:
                event_names.append(event.name)
        explanation = f"Cut Set {i}: {' AND '.join(event_names)}"
        explanations.append(explanation)
    return explanations
