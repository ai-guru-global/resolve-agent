"""Skill manifest parsing and validation."""

from __future__ import annotations

from enum import StrEnum
from typing import Any

import yaml
from pydantic import BaseModel, model_validator

# ---------------------------------------------------------------------------
# Skill Type Classification
# ---------------------------------------------------------------------------


class SkillType(StrEnum):
    """Skill type classification."""

    GENERAL = "general"
    SCENARIO = "scenario"


# ---------------------------------------------------------------------------
# Base Skill Models
# ---------------------------------------------------------------------------


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
    enum: list[Any] | None = None


# ---------------------------------------------------------------------------
# Scenario Skill Models
# ---------------------------------------------------------------------------


class TroubleshootingStep(BaseModel):
    """A single step in a structured troubleshooting flow."""

    id: str
    name: str
    description: str = ""
    step_type: str  # collect / diagnose / verify / action
    command: str | None = None
    skill_ref: str | None = None
    expected_output: str | None = None
    condition: str | None = None
    timeout_seconds: int = 30
    order: int = 0


class SolutionOutputTemplate(BaseModel):
    """Guidance prompts for generating the four-element structured output."""

    symptoms_prompt: str = ""
    key_info_prompt: str = ""
    troubleshooting_prompt: str = ""
    resolution_prompt: str = ""


class ScenarioConfig(BaseModel):
    """Configuration specific to scenario skills."""

    domain: str
    tags: list[str] = []
    troubleshooting_flow: list[TroubleshootingStep] = []
    output_template: SolutionOutputTemplate | None = None
    severity_levels: list[str] = ["critical", "high", "medium", "low"]


# ---------------------------------------------------------------------------
# Skill Manifest
# ---------------------------------------------------------------------------


class SkillManifest(BaseModel):
    """Parsed skill manifest supporting both general and scenario skills."""

    name: str
    version: str
    description: str = ""
    author: str = ""
    entry_point: str
    skill_type: SkillType = SkillType.GENERAL
    inputs: list[SkillParameter] = []
    outputs: list[SkillParameter] = []
    dependencies: list[str] = []
    permissions: SkillPermissions = SkillPermissions()
    scenario: ScenarioConfig | None = None

    @model_validator(mode="after")
    def _validate_scenario_config(self) -> SkillManifest:
        if self.skill_type == SkillType.SCENARIO and self.scenario is None:
            raise ValueError("Scenario skills must include a 'scenario' configuration block")
        return self


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
