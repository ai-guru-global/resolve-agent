"""Skill manifest parsing and validation."""

from __future__ import annotations

from typing import Any

import yaml
from pydantic import BaseModel


class SkillPermissions(BaseModel):
    """Permissions declared by a skill."""

    network_access: bool = False
    file_system_read: bool = False
    file_system_write: bool = False
    allowed_hosts: list[str] = []
    max_memory_mb: int = 256
    max_cpu_seconds: int = 30
    timeout_seconds: int = 60


class SkillParameter(BaseModel):
    """A skill input or output parameter."""

    name: str
    type: str
    description: str = ""
    required: bool = False
    default: Any = None


class SkillManifest(BaseModel):
    """Parsed skill manifest."""

    name: str
    version: str
    description: str = ""
    author: str = ""
    entry_point: str
    inputs: list[SkillParameter] = []
    outputs: list[SkillParameter] = []
    dependencies: list[str] = []
    permissions: SkillPermissions = SkillPermissions()


def load_manifest(path: str) -> SkillManifest:
    """Load and validate a skill manifest from YAML.

    Args:
        path: Path to manifest.yaml file.

    Returns:
        Validated SkillManifest instance.
    """
    with open(path) as f:
        data = yaml.safe_load(f)
    return SkillManifest(**data)
