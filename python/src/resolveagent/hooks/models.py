"""Data models for lifecycle hooks."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class HookContext:
    """Context passed to hook handlers during execution.

    Contains all information about the triggering event and allows
    hooks to modify input/output data.
    """

    trigger_point: str  # "agent.execute", "skill.invoke", "workflow.run"
    hook_type: str  # "pre" or "post"
    target_id: str  # The entity being operated on
    execution_id: str = ""
    input_data: dict[str, Any] = field(default_factory=dict)
    output_data: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class HookResult:
    """Result of a hook execution."""

    success: bool = True
    modified_data: dict[str, Any] = field(default_factory=dict)
    error: str = ""
    skip_remaining: bool = False  # If True, skip remaining hooks in chain
    duration_ms: int = 0
