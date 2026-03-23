"""Unit tests for the Skill System."""

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
