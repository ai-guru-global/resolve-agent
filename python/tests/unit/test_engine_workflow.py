"""Unit tests for RuntimeExecutionEngine.execute_workflow honesty gate (runtime/engine.py)."""

from __future__ import annotations

from typing import Any

from resolveagent.runtime.engine import ExecutionEngine
from resolveagent.runtime.registry_client import WorkflowInfo


class FakeRegistry:
    def __init__(self, workflows: dict[str, WorkflowInfo]) -> None:
        self._workflows = workflows
        self.asked: list[str] = []

    async def get_workflow(self, workflow_id: str) -> WorkflowInfo | None:
        self.asked.append(workflow_id)
        return self._workflows.get(workflow_id)


async def collect_events(gen: Any, limit: int = 5) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    async for item in gen:
        events.append(item)
        if len(events) >= limit:
            break
    return events


def event_types(events: list[dict[str, Any]]) -> list[str]:
    return [e["event"]["type"] for e in events if e.get("type") == "event"]


class TestWorkflowHonestyGate:
    async def test_unknown_workflow_with_registry_is_rejected(self) -> None:
        engine = ExecutionEngine(registry_client=FakeRegistry({}))

        events = await collect_events(
            engine.execute_workflow("ghost-workflow", input_data={"text": "x"}),
            limit=3,
        )

        assert "workflow.started" in event_types(events)
        assert "workflow.not_found" in event_types(events)
        # 拒绝后不再进入任何执行步骤
        assert "workflow.step_started" not in event_types(events)

    async def test_registered_tree_workflow_discloses_pending_conversion(self) -> None:
        registry = FakeRegistry(
            {
                "real-workflow": WorkflowInfo(
                    id="real-workflow",
                    name="Real",
                    description="d",
                    type="fta",
                    status="active",
                    definition={"tree": {}},
                )
            }
        )
        engine = ExecutionEngine(registry_client=registry)

        events = await collect_events(
            engine.execute_workflow("real-workflow", input_data={"text": "x"}),
            limit=4,
        )

        types = event_types(events)
        assert "workflow.definition_pending" in types
        assert registry.asked == ["real-workflow"]

    async def test_without_registry_keeps_dev_fallback(self) -> None:
        engine = ExecutionEngine()

        events = await collect_events(
            engine.execute_workflow("dev-workflow", input_data={"text": "x"}),
            limit=3,
        )

        types = event_types(events)
        assert "workflow.started" in types
        assert "workflow.not_found" not in types
        assert "workflow.definition_pending" not in types
