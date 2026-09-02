"""Unit tests for the Skill System."""

import pytest

from resolveagent.skills.loader import SkillLoader
from resolveagent.skills.manifest import SkillManifest, SkillPermissions


def test_skill_manifest_creation():
    manifest = SkillManifest(
        name="test-skill",
        version="1.0.0",
        entry_point="module:run",
        description="A test skill",
    )
    assert manifest.name == "test-skill"
    assert manifest.version == "1.0.0"
    assert manifest.permissions.network_access is False


def test_skill_permissions_defaults():
    perms = SkillPermissions()
    assert perms.max_memory_mb == 256
    assert perms.max_cpu_seconds == 30
    assert perms.timeout_seconds == 60
    assert perms.network_access is False


def test_loader_load_discovers_directory_skill():
    loader = SkillLoader()
    skill = loader.load("rule-route")
    assert skill is not None
    assert skill.manifest.name == "rule-route"
    assert skill.manifest.entry_point == "rule_route:main"


def test_loader_load_is_cached():
    loader = SkillLoader()
    skill_a = loader.load("rule-route")
    skill_b = loader.load("rule-route")
    assert skill_a is skill_b


def test_loader_load_missing_raises():
    loader = SkillLoader()
    with pytest.raises(FileNotFoundError):
        loader.load("nonexistent-skill-xyz")
