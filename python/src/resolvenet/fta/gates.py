"""Gate logic implementations for FTA."""

from __future__ import annotations


def and_gate(inputs: list[bool]) -> bool:
    """AND gate: all inputs must be True."""
    return all(inputs) if inputs else False


def or_gate(inputs: list[bool]) -> bool:
    """OR gate: at least one input must be True."""
    return any(inputs) if inputs else False


def voting_gate(inputs: list[bool], k: int) -> bool:
    """VOTING gate: at least k-of-n inputs must be True."""
    return sum(inputs) >= k if inputs else False


def inhibit_gate(inputs: list[bool]) -> bool:
    """INHIBIT gate: AND with conditioning event."""
    return all(inputs) if inputs else False


def priority_and_gate(inputs: list[bool]) -> bool:
    """PRIORITY-AND gate: AND with order dependency."""
    return all(inputs) if inputs else False
