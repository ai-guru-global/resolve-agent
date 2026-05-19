"""Planning Framework - Plan-and-Execute 双模式实现.

支持两种模式:
- REACTIVE: 快速响应, 直接 ReAct 循环
- DELIBERATIVE: 深思熟虑, 子目标分解 + replan
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable

logger = logging.getLogger(__name__)


class PlanningMode(Enum):
    """Planning mode enumeration."""

    REACTIVE = "reactive"  # 快速响应
    DELIBERATIVE = "deliberative"  # 深思熟虑


@dataclass
class PlanStep:
    """计划中的单个步骤."""

    id: str
    description: str
    action: str  # 动作类型
    parameters: dict[str, Any] = field(default_factory=dict)
    expected_outcome: str = ""
    status: str = "pending"  # pending, running, completed, failed
    result: Any = None
    error: str | None = None


@dataclass
class Plan:
    """执行计划."""

    id: str
    goal: str
    steps: list[PlanStep] = field(default_factory=list)
    mode: PlanningMode = PlanningMode.REACTIVE
    status: str = "pending"  # pending, executing, completed, failed, replanning
    context: dict[str, Any] = field(default_factory=dict)
    original_goal: str = ""  # 原始目标 (用于 replan)
    execution_history: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class ExecutionResult:
    """步骤执行结果."""

    step_id: str
    success: bool
    data: Any = None
    error: str | None = None
    replan_triggered: bool = False


class HybridPlanner:
    """混合规划器 - 支持 REACTIVE 和 DELIBERATIVE 模式.

    REACTIVE 模式:
    - 直接进入 ReAct 循环
    - 快速响应

    DELIBERATIVE 模式:
    - LLM 辅助子目标分解
    - 执行过程中监控状态
    - 需要时触发 replan

    Example:
        >>> planner = HybridPlanner(llm_provider=my_llm)
        >>> if mode == PlanningMode.DELIBERATIVE:
        ...     plan = await planner.create_plan("诊断数据库连接问题")
        ...     for step in plan.steps:
        ...         result = await planner.execute_step(step)
        ...         if planner.need_replan(result):
        ...             plan = await planner.replan(plan)
    """

    def __init__(
        self,
        llm_provider: Any | None = None,
        max_replan_attempts: int = 3,
        step_timeout: float = 30.0,
    ) -> None:
        self._llm = llm_provider
        self._max_replan_attempts = max_replan_attempts
        self._step_timeout = step_timeout
        self._step_counter = 0

    async def create_plan(
        self,
        goal: str,
        mode: PlanningMode = PlanningMode.REACTIVE,
        context: dict[str, Any] | None = None,
    ) -> Plan:
        """创建执行计划.

        Args:
            goal: 目标描述
            mode: 规划模式
            context: 额外上下文

        Returns:
            Plan 对象
        """
        self._step_counter += 1
        plan_id = f"plan-{self._step_counter}"

        if mode == PlanningMode.REACTIVE:
            # Reactive 模式: 单步计划
            step = PlanStep(
                id=f"{plan_id}-step-1",
                description=goal,
                action="execute",
                parameters={"goal": goal},
            )
            return Plan(
                id=plan_id,
                goal=goal,
                steps=[step],
                mode=mode,
                original_goal=goal,
                context=context or {},
            )

        # Deliberative 模式: LLM 辅助分解
        if self._llm:
            return await self._llm_decompose_plan(plan_id, goal, context or {})
        else:
            # Fallback: 简单分解
            return self._simple_decompose_plan(plan_id, goal)

    async def _llm_decompose_plan(
        self,
        plan_id: str,
        goal: str,
        context: dict[str, Any],
    ) -> Plan:
        """使用 LLM 分解目标为子步骤.

        Args:
            plan_id: 计划 ID
            goal: 目标描述
            context: 上下文

        Returns:
            分解后的 Plan
        """
        try:
            from resolveagent.llm.provider import ChatMessage

            prompt = f"""将以下目标分解为具体的执行步骤。每个步骤应该:
1. 有明确的动作描述
2. 可独立执行
3. 有明确的预期结果

目标: {goal}

请以 JSON 格式返回步骤列表:
{{
  "steps": [
    {{"description": "步骤1", "action": "action_type", "parameters": {{}}}},
    {{"description": "步骤2", "action": "action_type", "parameters": {{}}}}
  ]
}}"""

            response = await self._llm.chat(
                messages=[ChatMessage(role="user", content=prompt)],
                model=getattr(self._llm, "default_model", "qwen-plus"),
            )

            import json

            data = json.loads(response.content)
            steps = [
                PlanStep(
                    id=f"{plan_id}-step-{i+1}",
                    description=s["description"],
                    action=s.get("action", "execute"),
                    parameters=s.get("parameters", {}),
                )
                for i, s in enumerate(data.get("steps", []))
            ]

            return Plan(
                id=plan_id,
                goal=goal,
                steps=steps,
                mode=PlanningMode.DELIBERATIVE,
                original_goal=goal,
                context=context,
            )

        except Exception as e:
            logger.warning("LLM decomposition failed, using simple fallback: %s", e)
            return self._simple_decompose_plan(plan_id, goal)

    def _simple_decompose_plan(self, plan_id: str, goal: str) -> Plan:
        """简单分解 (无 LLM 时 fallback).

        Args:
            plan_id: 计划 ID
            goal: 目标描述

        Returns:
            简单分解的 Plan
        """
        # 基于关键词的简单分解
        steps = []
        step_num = 1

        goal_lower = goal.lower()

        # 检测需要的步骤类型
        if any(kw in goal_lower for kw in ["诊断", "排查", "分析", "diagnose"]):
            steps.append(
                PlanStep(
                    id=f"{plan_id}-step-{step_num}",
                    description="收集问题信息",
                    action="gather_info",
                )
            )
            step_num += 1

        if any(kw in goal_lower for kw in ["修复", "解决", "fix", "resolve"]):
            steps.append(
                PlanStep(
                    id=f"{plan_id}-step-{step_num}",
                    description="执行修复操作",
                    action="execute_fix",
                )
            )
            step_num += 1

        if any(kw in goal_lower for kw in ["验证", "测试", "verify", "test"]):
            steps.append(
                PlanStep(
                    id=f"{plan_id}-step-{step_num}",
                    description="验证结果",
                    action="verify",
                )
            )
            step_num += 1

        # 默认步骤
        if not steps:
            steps.append(
                PlanStep(
                    id=f"{plan_id}-step-1",
                    description=goal,
                    action="execute",
                    parameters={"goal": goal},
                )
            )

        return Plan(
            id=plan_id,
            goal=goal,
            steps=steps,
            mode=PlanningMode.DELIBERATIVE,
            original_goal=goal,
        )

    async def execute_step(
        self,
        step: PlanStep,
        executor: Callable[[PlanStep], Any],
    ) -> ExecutionResult:
        """执行单个步骤.

        Args:
            step: PlanStep 对象
            executor: 执行器函数

        Returns:
            ExecutionResult
        """
        step.status = "running"

        try:
            # 带超时执行
            result = await asyncio.wait_for(
                executor(step),
                timeout=self._step_timeout,
            )
            step.status = "completed"
            step.result = result

            return ExecutionResult(
                step_id=step.id,
                success=True,
                data=result,
            )

        except TimeoutError:
            step.status = "failed"
            step.error = "Execution timeout"

            return ExecutionResult(
                step_id=step.id,
                success=False,
                error="Execution timeout",
                replan_triggered=True,
            )

        except Exception as e:
            step.status = "failed"
            step.error = str(e)
            logger.error("Step execution failed", extra={"step_id": step.id, "error": e})

            return ExecutionResult(
                step_id=step.id,
                success=False,
                error=str(e),
                replan_triggered=self._should_replan_on_error(e),
            )

    def _should_replan_on_error(self, error: Exception) -> bool:
        """判断错误是否应该触发 replan.

        Args:
            error: 异常对象

        Returns:
            是否 replan
        """
        # 超时、依赖服务不可用等情况应该 replan
        replan_on = (TimeoutError, ConnectionError, asyncio.CancelledError)
        return isinstance(error, replan_on)

    def need_replan(self, result: ExecutionResult, plan: Plan | None = None) -> bool:
        """判断是否需要 replan.

        Args:
            result: 执行结果
            plan: 可选的 Plan 对象

        Returns:
            是否需要 replan
        """
        # 明确触发 replan
        if result.replan_triggered:
            return True

        # 执行失败且不是最后一个步骤
        if not result.success and plan:
            current_step_idx = next(
                (i for i, s in enumerate(plan.steps) if s.id == result.step_id),
                -1,
            )
            if current_step_idx < len(plan.steps) - 1:
                return True

        return False

    async def replan(
        self,
        plan: Plan,
        failed_step: PlanStep,
        error: str,
    ) -> Plan:
        """重新规划.

        Args:
            plan: 原计划
            failed_step: 失败的步骤
            error: 错误信息

        Returns:
            新 Plan
        """
        self._step_counter += 1
        new_plan_id = f"plan-{self._step_counter}"

        plan.status = "replanning"
        plan.execution_history.append({
            "failed_step": failed_step.id,
            "error": error,
            "timestamp": asyncio.get_event_loop().time(),
        })

        # 构建新的计划: 跳过失败步骤或插入修复步骤
        new_steps: list[PlanStep] = []
        failed_idx = next(
            (i for i, s in enumerate(plan.steps) if s.id == failed_step.id),
            -1,
        )

        # 添加修复步骤
        fix_step = PlanStep(
            id=f"{new_plan_id}-fix-1",
            description=f"修复失败: {failed_step.description}",
            action="recover",
            parameters={"original_step": failed_step.id, "error": error},
        )
        new_steps.append(fix_step)

        # 添加后续步骤 (如果失败步骤不是最后一步)
        if failed_idx >= 0 and failed_idx < len(plan.steps) - 1:
            for step in plan.steps[failed_idx + 1:]:
                new_step = PlanStep(
                    id=f"{new_plan_id}-step-{len(new_steps) + 1}",
                    description=step.description,
                    action=step.action,
                    parameters=step.parameters,
                )
                new_steps.append(new_step)

        new_plan = Plan(
            id=new_plan_id,
            goal=f"Replan: {plan.goal}",
            steps=new_steps,
            mode=plan.mode,
            status="pending",
            original_goal=plan.original_goal,
            context=plan.context,
            execution_history=plan.execution_history,
        )

        logger.info(
            "Replan created",
            extra={
                "original_plan": plan.id,
                "new_plan": new_plan.id,
                "failed_step": failed_step.id,
            },
        )

        return new_plan

    async def execute_plan(
        self,
        plan: Plan,
        executor: Callable[[PlanStep], Any],
        on_step_complete: Callable[[PlanStep, ExecutionResult], None] | None = None,
    ) -> Plan:
        """执行完整计划.

        Args:
            plan: Plan 对象
            executor: 步骤执行器
            on_step_complete: 步骤完成回调

        Returns:
            完成的 Plan
        """
        plan.status = "executing"
        replan_count = 0

        while plan.status == "executing":
            for step in plan.steps:
                if step.status != "pending":
                    continue

                result = await self.execute_step(step, executor)

                if on_step_complete:
                    on_step_complete(step, result)

                # 检查是否需要 replan
                if self.need_replan(result, plan) and replan_count < self._max_replan_attempts:
                    new_plan = await self.replan(
                        plan,
                        step,
                        result.error or "Unknown error",
                    )
                    plan = new_plan
                    replan_count += 1
                    break  # 重新开始执行新计划

            else:
                # 所有步骤都执行完成
                failed_count = sum(1 for s in plan.steps if s.status == "failed")
                plan.status = "completed" if failed_count == 0 else "failed"

        return plan


class ReActExecutor:
    """ReAct (Reasoning + Acting) 执行器.

    简单的 ReAct 循环实现，用于 reactive 模式。
    """

    def __init__(
        self,
        llm_provider: Any | None = None,
        max_iterations: int = 5,
    ) -> None:
        self._llm = llm_provider
        self._max_iterations = max_iterations

    async def execute(
        self,
        goal: str,
        context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """执行 ReAct 循环.

        Args:
            goal: 目标
            context: 上下文

        Returns:
            执行结果
        """
        observation = ""
        history = []

        for i in range(self._max_iterations):
            # Thought
            thought = await self._think(goal, observation, history, context)

            # Action
            action, action_input = await self._act(thought, goal, history, context)

            if action == "finish":
                return {
                    "success": True,
                    "result": action_input,
                    "iterations": i + 1,
                }

            # Execute action (placeholder)
            observation = await self._execute_action(action, action_input)

            history.append({
                "thought": thought,
                "action": action,
                "action_input": action_input,
                "observation": observation,
            })

        return {
            "success": False,
            "error": "Max iterations reached",
            "iterations": self._max_iterations,
        }

    async def _think(
        self,
        goal: str,
        observation: str,
        history: list[dict],
        context: dict[str, Any] | None,
    ) -> str:
        """思考下一步."""
        if not self._llm:
            return f"思考: {goal[:50]}..."

        # 使用 LLM 进行推理
        from resolveagent.llm.provider import ChatMessage

        history_text = "\n".join(
            f"- Thought: {h['thought']}, Action: {h['action']}, Obs: {h['observation']}"
            for h in history[-3:]
        )

        prompt = f"""Goal: {goal}
Previous observations: {observation}
History:
{history_text}

根据以上信息，给出下一步的思考。直接说明要做什么动作。

思考:"""

        response = await self._llm.chat(
            messages=[ChatMessage(role="user", content=prompt)],
            model=getattr(self._llm, "default_model", "qwen-plus"),
        )

        return response.content

    async def _act(
        self,
        thought: str,
        goal: str,
        history: list[dict],
        context: dict[str, Any] | None,
    ) -> tuple[str, str]:
        """决定动作."""
        thought_lower = thought.lower()

        # 简单的动作分类
        if any(kw in thought_lower for kw in ["搜索", "search", "查找"]):
            return ("search", goal)

        if any(kw in thought_lower for kw in ["执行", "execute", "run"]):
            return ("execute", goal)

        if any(kw in thought_lower for kw in ["分析", "analyze", "检查"]):
            return ("analyze", goal)

        if any(kw in thought_lower for kw in ["完成", "finish", "结束"]):
            return ("finish", thought)

        return ("answer", thought)

    async def _execute_action(self, action: str, action_input: str) -> str:
        """执行动作 (placeholder)."""
        # 实际应该调用相应的工具
        return f"Action '{action}' executed with input: {action_input[:50]}..."
