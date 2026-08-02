"""Unit tests for the Hybrid Planner (planning.py)."""

from __future__ import annotations

import asyncio
from typing import Any

import pytest

from resolveagent.planning import (
    ExecutionResult,
    HybridPlanner,
    Plan,
    PlanningMode,
    PlanStep,
)


class FakeLLMResponse:
    def __init__(self, content: str) -> None:
        self.content = content


class FakeLLM:
    """Minimal LLM stub returning a canned response."""

    default_model = "fake-model"

    def __init__(self, content: str) -> None:
        self._content = content
        self.calls = 0

    async def chat(self, messages: Any, model: str) -> FakeLLMResponse:
        self.calls += 1
        return FakeLLMResponse(self._content)


class TestCreatePlan:
    @pytest.mark.asyncio
    async def test_reactive_mode_single_step(self) -> None:
        planner = HybridPlanner()
        plan = await planner.create_plan("查询服务状态", mode=PlanningMode.REACTIVE)

        assert plan.mode == PlanningMode.REACTIVE
        assert len(plan.steps) == 1
        assert plan.steps[0].action == "execute"

    @pytest.mark.asyncio
    async def test_deliberative_without_llm_uses_keyword_fallback(self) -> None:
        planner = HybridPlanner()
        plan = await planner.create_plan(
            "诊断数据库连接问题并修复，最后验证",
            mode=PlanningMode.DELIBERATIVE,
        )

        actions = [s.action for s in plan.steps]
        assert actions == ["gather_info", "execute_fix", "verify"]

    @pytest.mark.asyncio
    async def test_deliberative_with_llm_plain_json(self) -> None:
        llm = FakeLLM(
            '{"steps": [{"description": "检查 Pod 状态", "action": "inspect"},'
            ' {"description": "重启 Pod", "action": "restart"}]}'
        )
        planner = HybridPlanner(llm_provider=llm)
        plan = await planner.create_plan("修复 Pod", mode=PlanningMode.DELIBERATIVE)

        assert llm.calls == 1
        assert len(plan.steps) == 2
        assert plan.steps[0].action == "inspect"

    @pytest.mark.asyncio
    async def test_deliberative_with_llm_markdown_fenced_json(self) -> None:
        """Regression: fenced ```json responses previously broke json.loads
        and silently degraded to keyword decomposition."""
        llm = FakeLLM(
            '好的，以下是分解结果：\n```json\n'
            '{"steps": [{"description": "收集日志", "action": "gather_logs"}]}\n'
            "```\n希望对你有帮助。"
        )
        planner = HybridPlanner(llm_provider=llm)
        plan = await planner.create_plan("排查报错", mode=PlanningMode.DELIBERATIVE)

        assert len(plan.steps) == 1
        assert plan.steps[0].action == "gather_logs"

    @pytest.mark.asyncio
    async def test_llm_empty_steps_falls_back(self) -> None:
        llm = FakeLLM('{"steps": []}')
        planner = HybridPlanner(llm_provider=llm)
        plan = await planner.create_plan("诊断问题", mode=PlanningMode.DELIBERATIVE)

        # Empty LLM plan must fall back to keyword decomposition
        assert len(plan.steps) >= 1

    @pytest.mark.asyncio
    async def test_llm_garbage_response_falls_back(self) -> None:
        llm = FakeLLM("I cannot help with that.")
        planner = HybridPlanner(llm_provider=llm)
        plan = await planner.create_plan("诊断问题", mode=PlanningMode.DELIBERATIVE)

        assert len(plan.steps) >= 1


class TestExtractJson:
    def test_plain_json(self) -> None:
        assert HybridPlanner._extract_json('{"a": 1}') == {"a": 1}

    def test_fenced_json(self) -> None:
        assert HybridPlanner._extract_json('```json\n{"a": 1}\n```') == {"a": 1}

    def test_fence_without_language_tag(self) -> None:
        assert HybridPlanner._extract_json('```\n{"a": 1}\n```') == {"a": 1}

    def test_json_embedded_in_prose(self) -> None:
        assert HybridPlanner._extract_json('结果如下 {"a": 1} 完毕') == {"a": 1}

    def test_no_json_raises(self) -> None:
        with pytest.raises(ValueError):
            HybridPlanner._extract_json("no json here")


class TestExecution:
    @pytest.mark.asyncio
    async def test_execute_step_success(self) -> None:
        planner = HybridPlanner()
        step = PlanStep(id="s1", description="test", action="execute")

        async def executor(s: PlanStep) -> str:
            return "ok"

        result = await planner.execute_step(step, executor)
        assert result.success
        assert step.status == "completed"

    @pytest.mark.asyncio
    async def test_execute_step_timeout_triggers_replan(self) -> None:
        planner = HybridPlanner(step_timeout=0.05)
        step = PlanStep(id="s1", description="slow", action="execute")

        async def slow_executor(s: PlanStep) -> str:
            await asyncio.sleep(1.0)
            return "never"

        result = await planner.execute_step(step, slow_executor)
        assert not result.success
        assert result.replan_triggered
        assert step.status == "failed"

    @pytest.mark.asyncio
    async def test_execute_plan_runs_replanned_steps(self) -> None:
        """Regression: after replan the new plan had status='pending'
        so the while-loop exited and the new plan never executed."""
        planner = HybridPlanner(max_replan_attempts=1, step_timeout=5.0)
        plan = Plan(
            id="p1",
            goal="two-step goal",
            steps=[
                PlanStep(id="p1-step-1", description="will fail", action="execute"),
                PlanStep(id="p1-step-2", description="follow-up", action="execute"),
            ],
            mode=PlanningMode.DELIBERATIVE,
            original_goal="two-step goal",
        )

        executed: list[str] = []
        fail_once = {"done": False}

        async def executor(s: PlanStep) -> str:
            executed.append(s.action)
            if s.description == "will fail" and not fail_once["done"]:
                fail_once["done"] = True
                raise ConnectionError("downstream unavailable")
            return "ok"

        final_plan = await planner.execute_plan(plan, executor)

        # The replanned recover step and the follow-up step must both run
        assert "recover" in executed
        assert final_plan.status in ("completed", "failed")
        assert len(executed) >= 3  # fail + recover + follow-up

    @pytest.mark.asyncio
    async def test_replan_preserves_remaining_steps(self) -> None:
        planner = HybridPlanner()
        plan = Plan(
            id="p1",
            goal="goal",
            steps=[
                PlanStep(id="a", description="first", action="x", expected_outcome="done-x"),
                PlanStep(id="b", description="second", action="y", expected_outcome="done-y"),
            ],
            original_goal="goal",
        )

        new_plan = await planner.replan(plan, plan.steps[0], "boom")

        assert new_plan.steps[0].action == "recover"
        assert new_plan.steps[1].description == "second"
        assert new_plan.steps[1].expected_outcome == "done-y"
        assert new_plan.execution_history

    def test_need_replan_on_explicit_trigger(self) -> None:
        planner = HybridPlanner()
        result = ExecutionResult(step_id="s1", success=False, replan_triggered=True)
        assert planner.need_replan(result)

    def test_no_replan_on_success(self) -> None:
        planner = HybridPlanner()
        result = ExecutionResult(step_id="s1", success=True)
        assert not planner.need_replan(result)
