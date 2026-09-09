"""Unit tests for SkillExecutor manifest default merging."""

from __future__ import annotations

from pathlib import Path

from resolveagent.skills.executor import SkillExecutor
from resolveagent.skills.loader import LoadedSkill
from resolveagent.skills.manifest import SkillManifest, SkillParameter


def _skill(params: list[SkillParameter]) -> LoadedSkill:
    manifest = SkillManifest(
        name="demo",
        version="1.0.0",
        entry_point="mod:run",
        parameters=params,
    )
    return LoadedSkill(manifest=manifest, directory=Path("."), entry_module="mod", entry_function="run")


class TestDefaultMerging:
    async def test_required_param_with_default_passes_validation(self):
        executor = SkillExecutor(use_sandbox=False)
        skill = _skill(
            [
                SkillParameter(name="query", type="string", required=True),
                SkillParameter(name="limit", type="integer", required=True, default=10),
            ]
        )
        captured = {}

        def run(**kwargs):
            captured.update(kwargs)
            return {"ok": True}

        skill._callable = run
        result = await executor.execute(skill, {"query": "q"})

        assert result.success is True
        assert captured["limit"] == 10

    async def test_explicit_input_overrides_default(self):
        executor = SkillExecutor(use_sandbox=False)
        skill = _skill([SkillParameter(name="limit", type="integer", default=10)])
        captured = {}

        def run(**kwargs):
            captured.update(kwargs)
            return {"ok": True}

        skill._callable = run
        result = await executor.execute(skill, {"limit": 5})

        assert result.success is True
        assert captured["limit"] == 5

    async def test_missing_required_without_default_still_fails(self):
        executor = SkillExecutor(use_sandbox=False)
        skill = _skill([SkillParameter(name="query", type="string", required=True)])

        result = await executor.execute(skill, {})

        assert result.success is False
        assert "query" in (result.error or "")
