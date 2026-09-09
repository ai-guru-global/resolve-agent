"""Unit tests for the FTA NodeEvaluator: fail-closed semantics, cache TTL, skill loading."""

from __future__ import annotations

import time
from typing import Any
from unittest.mock import AsyncMock

from resolveagent.fta.evaluator import NodeEvaluator
from resolveagent.fta.tree import EventType, FTAEvent
from resolveagent.skills.executor import SkillResult


def _event(evaluator: str = "", **kwargs: Any) -> FTAEvent:
    return FTAEvent(id="e1", name="E1", event_type=EventType.BASIC, evaluator=evaluator, **kwargs)


class TestFailClosed:
    async def test_no_evaluator_returns_false(self):
        assert await NodeEvaluator().evaluate(_event(), {}) is False

    async def test_unknown_evaluator_type_returns_false(self):
        assert await NodeEvaluator().evaluate(_event("bogus:target"), {}) is False

    async def test_skill_without_executor_returns_false(self):
        assert await NodeEvaluator().evaluate(_event("skill:foo"), {}) is False

    async def test_rag_without_pipeline_returns_false(self):
        assert await NodeEvaluator().evaluate(_event("rag:col", parameters={"query": "q"}), {}) is False

    async def test_llm_without_provider_returns_false(self):
        assert await NodeEvaluator().evaluate(_event("llm:classify"), {}) is False

    async def test_static_evaluator(self):
        assert await NodeEvaluator().evaluate(_event("static:true"), {}) is True
        assert await NodeEvaluator().evaluate(_event("static:false"), {}) is False


class TestSkillEvaluation:
    async def test_skill_loaded_before_execute(self, tmp_path, monkeypatch):
        skill_dir = tmp_path / "my-skill"
        skill_dir.mkdir()
        (skill_dir / "manifest.yaml").write_text(
            "name: my-skill\nversion: 1.0.0\nentry_point: mod:run\n",
            encoding="utf-8",
        )
        monkeypatch.setenv("RESOLVEAGENT_SKILL_PATHS", str(tmp_path))

        executor = AsyncMock()
        executor.execute = AsyncMock(return_value=SkillResult(outputs={"result": True}, success=True))

        result = await NodeEvaluator(skill_executor=executor).evaluate(_event("skill:my-skill"), {})

        assert result is True
        loaded_skill, _inputs = executor.execute.call_args[0]
        assert loaded_skill.manifest.name == "my-skill"

    async def test_skill_error_result_returns_false(self, tmp_path, monkeypatch):
        skill_dir = tmp_path / "my-skill"
        skill_dir.mkdir()
        (skill_dir / "manifest.yaml").write_text(
            "name: my-skill\nversion: 1.0.0\nentry_point: mod:run\n",
            encoding="utf-8",
        )
        monkeypatch.setenv("RESOLVEAGENT_SKILL_PATHS", str(tmp_path))

        executor = AsyncMock()
        executor.execute = AsyncMock(return_value=SkillResult(outputs={}, success=False, error="boom"))

        result = await NodeEvaluator(skill_executor=executor).evaluate(_event("skill:my-skill"), {})

        assert result is False

    async def test_skill_not_found_returns_false(self, monkeypatch):
        monkeypatch.setenv("RESOLVEAGENT_SKILL_PATHS", "/nonexistent-skills-root")
        executor = AsyncMock()

        result = await NodeEvaluator(skill_executor=executor).evaluate(_event("skill:ghost"), {})

        assert result is False
        executor.execute.assert_not_called()


class TestCacheTTL:
    async def test_cache_hit_within_ttl(self):
        evaluator = NodeEvaluator()
        event = _event("static:true")
        assert await evaluator.evaluate(event, {}) is True

        # Same cache key: the changed evaluator string is not re-read
        event.evaluator = "static:false"
        assert await evaluator.evaluate(event, {}) is True

    async def test_cache_expires_after_ttl(self):
        evaluator = NodeEvaluator()
        event = _event("static:true")
        assert await evaluator.evaluate(event, {}) is True

        # Age the cached entry beyond the TTL
        key = next(iter(evaluator._cache))
        _, value = evaluator._cache[key]
        evaluator._cache[key] = (time.monotonic() - evaluator._cache_ttl - 1, value)

        event.evaluator = "static:false"
        assert await evaluator.evaluate(event, {}) is False
