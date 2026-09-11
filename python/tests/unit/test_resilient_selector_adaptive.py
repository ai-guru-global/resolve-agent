"""Unit tests for AdaptiveWeightAdjuster wiring in ResilientSelector."""

from typing import Any

from resolveagent.selector.resilient_selector import (
    AdaptiveWeightAdjuster,
    ResilientConfig,
    ResilientSelector,
)
from resolveagent.selector.selector import RouteDecision


class StubSelector:
    """Returns a canned route decision on every call."""

    def __init__(self, route_type: str = "skill") -> None:
        self.route_type = route_type

    async def route(
        self,
        input_text: str,
        agent_id: str,
        context: dict[str, Any] | None = None,
        bypass_cache: bool = False,
    ) -> RouteDecision:
        return RouteDecision(
            route_type=self.route_type,
            route_target="stub",
            confidence=0.9,
            reasoning="stub",
        )


def _ok_executor():
    async def _run(_decision: RouteDecision) -> dict[str, Any]:
        return {"success": True, "output": "done"}

    return _run


def _fail_executor():
    async def _run(_decision: RouteDecision) -> dict[str, Any]:
        return {"success": False, "error": "boom"}

    return _run


async def test_successful_route_increases_weight():
    selector = ResilientSelector(selector=StubSelector("skill"))
    await selector.route_and_execute("hello", "agent-1", _ok_executor())
    assert selector._weight_adjuster.get_weight("skill") > 1.0


async def test_failed_route_decreases_weight():
    config = ResilientConfig(max_retries=0, fallback_to_code_analysis=False)
    selector = ResilientSelector(selector=StubSelector("skill"), config=config)
    await selector.route_and_execute("hello", "agent-1", _fail_executor())
    assert selector._weight_adjuster.get_weight("skill") < 1.0


async def test_disabled_flag_skips_recording():
    config = ResilientConfig(adaptive_weights_enabled=False, max_retries=0, fallback_to_code_analysis=False)
    selector = ResilientSelector(selector=StubSelector("skill"), config=config)
    await selector.route_and_execute("hello", "agent-1", _fail_executor())
    assert selector._weight_adjuster.get_all_weights() == {}
    assert "adaptive_weights" not in selector.get_session_stats()


def test_weight_ordering_influences_alternative_route():
    selector = ResilientSelector(
        selector=StubSelector(),
        config=ResilientConfig(route_priority=["skill", "rag", "fta", "code_analysis"]),
    )
    for _ in range(10):
        selector._weight_adjuster.record_outcome("code_analysis", True)
        selector._weight_adjuster.record_outcome("fta", False)
    original = RouteDecision(route_type="skill", route_target="x", confidence=0.9, reasoning="orig")
    alternative = selector._force_alternative_route(original, tried={"skill", "rag"}, context={})
    assert alternative.route_type == "code_analysis"


def test_disabled_keeps_priority_order():
    selector = ResilientSelector(
        selector=StubSelector(),
        config=ResilientConfig(
            route_priority=["skill", "rag", "fta", "code_analysis"],
            adaptive_weights_enabled=False,
        ),
    )
    for _ in range(10):
        selector._weight_adjuster.record_outcome("code_analysis", True)
    original = RouteDecision(route_type="skill", route_target="x", confidence=0.9, reasoning="orig")
    alternative = selector._force_alternative_route(original, tried={"skill", "rag"}, context={})
    assert alternative.route_type == "fta"


async def test_session_stats_expose_weights():
    selector = ResilientSelector(selector=StubSelector("skill"))
    await selector.route_and_execute("hello", "agent-1", _ok_executor())
    stats = selector.get_session_stats()
    assert stats["adaptive_weights"]["weights"]["skill"] > 1.0


def test_weight_adjuster_is_injectable():
    adjuster = AdaptiveWeightAdjuster()
    selector = ResilientSelector(weight_adjuster=adjuster)
    assert selector._weight_adjuster is adjuster
