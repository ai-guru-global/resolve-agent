"""Adapter to convert kudig Skill Schema to ResolveAgent SkillDefinition format.

kudig skills use YAML front matter with fields like ``skill_id``,
``trigger_keywords``, and a 10-section Runbook body.  This module maps
those into the SkillDefinition structure used by the Go platform's
skill registry.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any

import yaml

logger = logging.getLogger(__name__)

# Sections expected in a kudig skill runbook
RUNBOOK_SECTIONS = [
    "Overview",
    "Symptom",
    "Triage",
    "Diagnostic",
    "Root Cause",
    "Remediation",
    "Verification",
    "Escalation",
    "Version Compat",
    "Knowledge Evolution",
]

_FRONT_MATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)


@dataclass
class AdaptedSkill:
    """Converted skill ready for registration."""

    name: str
    version: str = "1.0.0"
    description: str = ""
    author: str = ""
    skill_type: str = "scenario"
    domain: str = ""
    tags: list[str] = field(default_factory=list)
    source_type: str = "kudig"
    source_uri: str = "https://github.com/kudig-io/kudig-database"
    manifest: dict[str, Any] = field(default_factory=dict)
    labels: dict[str, str] = field(default_factory=dict)

    def to_registration_dict(self) -> dict[str, Any]:
        """Produce the dict sent to ``POST /api/v1/skills``."""
        return {
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "author": self.author,
            "skill_type": self.skill_type,
            "domain": self.domain,
            "tags": self.tags,
            "source_type": self.source_type,
            "source_uri": self.source_uri,
            "manifest": self.manifest,
            "status": "active",
            "labels": self.labels,
        }


class KudigSkillAdapter:
    """Converts kudig skill files to ResolveAgent SkillDefinition format."""

    def convert(self, front_matter: dict[str, Any], body: str) -> AdaptedSkill:
        """Convert kudig front matter and Markdown body to an AdaptedSkill.

        Args:
            front_matter: Parsed YAML front matter dict.
            body: Markdown body (everything after the front matter).

        Returns:
            AdaptedSkill ready for registration.
        """
        # --- Core identity fields ---
        name = str(front_matter.get("skill_id", "")).strip()
        if not name:
            # Fallback: derive from skill_name or any available field
            name = str(front_matter.get("skill_name", "unknown-skill")).strip()
            # Slugify
            name = re.sub(r"[^a-zA-Z0-9_-]", "-", name).strip("-").lower()

        version = str(front_matter.get("version", "1.0.0")).strip()

        # Description: prefer English name, fall back to any available
        skill_name = front_matter.get("skill_name", {})
        description = skill_name.get("en", skill_name.get("zh", name)) if isinstance(skill_name, dict) else str(skill_name) if skill_name else name

        author = str(front_matter.get("author", "kudig")).strip()

        # --- Labels from categorical fields ---
        labels: dict[str, str] = {
            "corpus": "kudig",
            "type": "runbook",
        }
        for label_key in ("category", "severity_range", "risk_level", "agent_execution_mode"):
            val = front_matter.get(label_key)
            if val is not None:
                labels[label_key] = str(val)

        # --- Domain and tags (from kudig category and trigger_keywords) ---
        domain = str(front_matter.get("category", "kubernetes")).strip()
        trigger_kw = front_matter.get("trigger_keywords", [])
        tags: list[str] = []
        if isinstance(trigger_kw, list):
            tags = [str(kw).lower() for kw in trigger_kw if kw]
        elif isinstance(trigger_kw, str):
            tags = [kw.strip().lower() for kw in trigger_kw.split(",") if kw.strip()]

        # All kudig topic-skills are scenario-type troubleshooting skills
        skill_type = "scenario"

        # --- Manifest: routing and knowledge ---
        manifest: dict[str, Any] = {}
        for list_key in (
            "trigger_keywords",
            "trigger_events",
            "trigger_metrics",
            "related_skills",
            "fta_refs",
            "knowledge_refs",
            "k8s_versions",
        ):
            val = front_matter.get(list_key)
            if val is not None:
                manifest[list_key] = val

        # Estimated resolution time
        ert = front_matter.get("estimated_resolution_time")
        if ert is not None:
            manifest["estimated_resolution_time"] = str(ert)

        # --- Runbook sections ---
        runbook = self._extract_runbook_sections(body)
        if runbook:
            manifest["runbook"] = runbook

        return AdaptedSkill(
            name=name,
            version=version,
            description=description,
            author=author,
            skill_type=skill_type,
            domain=domain,
            tags=tags,
            manifest=manifest,
            labels=labels,
        )

    @staticmethod
    def _extract_runbook_sections(body: str) -> dict[str, str]:
        """Split the Markdown body into named sections by ``## `` headings."""
        sections: dict[str, str] = {}
        # Split on level-2 headings
        parts = re.split(r"(?=^## )", body, flags=re.MULTILINE)
        for part in parts:
            part = part.strip()
            if not part:
                continue
            # Extract heading text
            heading_match = re.match(r"^##\s+(.+)$", part, re.MULTILINE)
            if heading_match:
                heading = heading_match.group(1).strip()
                # Remove the heading line from the body
                section_body = part[heading_match.end() :].strip()
                sections[heading] = section_body
            else:
                # Content before first heading
                if part:
                    sections["_preamble"] = part
        return sections


def parse_front_matter(content: str) -> tuple[dict[str, Any], str]:
    """Extract YAML front matter and body from a Markdown file.

    Args:
        content: Full Markdown content.

    Returns:
        Tuple of (front_matter_dict, body_text).
    """
    match = _FRONT_MATTER_RE.match(content)
    if not match:
        return {}, content

    try:
        fm = yaml.safe_load(match.group(1)) or {}
    except yaml.YAMLError as e:
        logger.warning("Failed to parse YAML front matter", extra={"error": str(e)})
        fm = {}

    body = content[match.end() :]
    return fm, body
