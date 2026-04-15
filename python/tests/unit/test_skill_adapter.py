"""Unit tests for the kudig Skill adapter."""

from resolveagent.corpus.skill_adapter import (
    AdaptedSkill,
    KudigSkillAdapter,
    parse_front_matter,
)


# ---------------------------------------------------------------------------
# parse_front_matter
# ---------------------------------------------------------------------------

SKILL_DOC = """\
---
skill_id: node-notready-recovery
version: "2.1"
skill_name:
  en: Node NotReady Recovery
  zh: 节点 NotReady 恢复
category: kubernetes/node
severity_range: P1-P2
trigger_keywords:
  - node notready
  - kubelet down
trigger_events:
  - NodeNotReady
related_skills:
  - pod-eviction-handler
fta_refs:
  - node-fta
---

## Overview

This skill handles NotReady nodes.

## Symptom

Nodes show NotReady status.

## Remediation

Restart kubelet.
"""


def test_parse_front_matter_extracts_yaml():
    fm, body = parse_front_matter(SKILL_DOC)
    assert fm["skill_id"] == "node-notready-recovery"
    assert fm["version"] == "2.1"
    assert fm["trigger_keywords"] == ["node notready", "kubelet down"]


def test_parse_front_matter_body():
    fm, body = parse_front_matter(SKILL_DOC)
    assert "## Overview" in body
    assert "## Remediation" in body
    assert "---" not in body[:10]  # Front matter removed


def test_parse_front_matter_no_yaml():
    content = "# Just a regular document\n\nNo front matter here."
    fm, body = parse_front_matter(content)
    assert fm == {}
    assert body == content


# ---------------------------------------------------------------------------
# KudigSkillAdapter.convert
# ---------------------------------------------------------------------------

def _make_adapted_skill() -> AdaptedSkill:
    fm, body = parse_front_matter(SKILL_DOC)
    adapter = KudigSkillAdapter()
    return adapter.convert(fm, body)


def test_convert_name():
    skill = _make_adapted_skill()
    assert skill.name == "node-notready-recovery"


def test_convert_version():
    skill = _make_adapted_skill()
    assert skill.version == "2.1"


def test_convert_description():
    skill = _make_adapted_skill()
    # English name preferred
    assert skill.description == "Node NotReady Recovery"


def test_convert_labels():
    skill = _make_adapted_skill()
    assert skill.labels["corpus"] == "kudig"
    assert skill.labels["category"] == "kubernetes/node"
    assert skill.labels["severity_range"] == "P1-P2"


def test_convert_manifest_trigger_keywords():
    skill = _make_adapted_skill()
    assert "trigger_keywords" in skill.manifest
    assert "node notready" in skill.manifest["trigger_keywords"]


def test_convert_manifest_related_skills():
    skill = _make_adapted_skill()
    assert skill.manifest.get("related_skills") == ["pod-eviction-handler"]


def test_convert_manifest_fta_refs():
    skill = _make_adapted_skill()
    assert skill.manifest.get("fta_refs") == ["node-fta"]


def test_convert_manifest_runbook_sections():
    skill = _make_adapted_skill()
    runbook = skill.manifest.get("runbook", {})
    assert "Overview" in runbook
    assert "Symptom" in runbook
    assert "Remediation" in runbook
    assert "Restart kubelet" in runbook["Remediation"]


# ---------------------------------------------------------------------------
# to_registration_dict
# ---------------------------------------------------------------------------

def test_to_registration_dict_has_required_keys():
    skill = _make_adapted_skill()
    d = skill.to_registration_dict()
    assert d["name"] == "node-notready-recovery"
    assert d["status"] == "active"
    assert d["source_type"] == "corpus"
    assert "manifest" in d
    assert "labels" in d


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

def test_convert_missing_skill_id_falls_back_to_name():
    fm = {"skill_name": "My Cool Skill", "version": "1.0.0"}
    body = "## Overview\n\nSome content."
    adapter = KudigSkillAdapter()
    skill = adapter.convert(fm, body)
    assert skill.name  # Should have derived a name
    assert "cool" in skill.name.lower() or "my" in skill.name.lower()


def test_convert_skill_name_string():
    fm = {"skill_id": "test-skill", "skill_name": "Simple Name"}
    body = ""
    adapter = KudigSkillAdapter()
    skill = adapter.convert(fm, body)
    assert skill.description == "Simple Name"


def test_convert_empty_body_no_runbook():
    fm = {"skill_id": "empty-body"}
    adapter = KudigSkillAdapter()
    skill = adapter.convert(fm, "")
    # Runbook should be absent or empty
    assert skill.manifest.get("runbook", {}) == {}
