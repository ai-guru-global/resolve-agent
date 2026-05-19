"""Comprehensive unit tests for the Resilient Selector.

Covers data models (RouteAttempt, RoutingSession), ReEnricher logic,
ResilientSelector route_and_execute, _force_alternative_route, and ResilientConfig.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from resolveagent.selector.resilient_selector import (
    ReEnricher,
    ResilientConfig,
    ResilientSelector,
    RouteAttempt,
    RoutingSession,
)
from resolveagent.selector.selector import RouteDecision


# ---------------------------------------------------------------------------
# Helper factories
# ---------------------------------------------------------------------------

def make_decision(route_type: str = "skill", target: str = "test-target") -> RouteDecision:
    return RouteDecision(
        route_type=route_type,
        route_target=target,
        confidence=0.9,
        reasoning="test",
        parameters={},
    )


def make_success_executor():
    async def executor(decision):
        return type("Result", (), {"success": True, "output": "ok", "error": None})()
    return executor


def make_fail_then_succeed(fail_count: int):
    call_count = 0

    async def executor(decision):
        nonlocal call_count
        call_count += 1
        if call_count <= fail_count:
            raise Exception(f"Failure {call_count}")
        return type("Result", (), {"success": True, "output": "ok", "error": None})()

    return executor


def make_always_fail():
    async def executor(decision):
        raise Exception("Always fails")
    return executor


def make_selector_mock(route_type: str = "skill") -> MagicMock:
    """Return a mock IntelligentSelector whose .route() always returns the same decision."""
    mock = MagicMock()
    mock.route = AsyncMock(return_value=make_decision(route_type))
    return mock


# ---------------------------------------------------------------------------
# 1. Data models
# ---------------------------------------------------------------------------

class TestRouteAttempt:
    def test_route_attempt_creation(self):
        attempt = RouteAttempt(
            route_type="skill",
            route_target="my-skill",
            success=True,
            error=None,
            latency_ms=12.5,
            result_summary="done",
            attempt_number=1,
        )
        assert attempt.route_type == "skill"
        assert attempt.route_target == "my-skill"
        assert attempt.success is True
        assert attempt.error is None
        assert attempt.latency_ms == 12.5
        assert attempt.result_summary == "done"
        assert attempt.attempt_number == 1

    def test_route_attempt_defaults(self):
        attempt = RouteAttempt(route_type="rag", route_target="kb", success=False)
        assert attempt.error is None
        assert attempt.latency_ms == 0.0
        assert attempt.result_summary == ""
        assert attempt.attempt_number == 0


class TestRoutingSession:
    def test_routing_session_to_dict(self):
        a1 = RouteAttempt("skill", "sk", True, latency_ms=10.123)
        a2 = RouteAttempt("rag", "kb", False, error="no results", latency_ms=5.456)
        session = RoutingSession(
            session_id="s1",
            original_input="hello world",
            agent_id="agent-1",
            attempts=[a1, a2],
            final_result="ok",
            final_route="skill",
            success=True,
            total_latency_ms=15.579,
        )
        d = session.to_dict()
        assert d["session_id"] == "s1"
        assert d["original_input"] == "hello world"
        assert d["agent_id"] == "agent-1"
        assert d["attempt_count"] == 2
        assert d["success"] is True
        assert d["final_route"] == "skill"
        assert d["total_latency_ms"] == 15.58
        assert len(d["attempts"]) == 2
        assert d["attempts"][0]["route_type"] == "skill"
        assert d["attempts"][0]["latency_ms"] == 10.12
        assert d["attempts"][1]["error"] == "no results"

    def test_routing_session_attempt_count(self):
        session = RoutingSession(session_id="s2", original_input="x", agent_id="a")
        assert session.attempt_count == 0
        session.attempts.append(RouteAttempt("skill", "sk", True))
        assert session.attempt_count == 1
        session.attempts.append(RouteAttempt("rag", "kb", False))
        assert session.attempt_count == 2

    def test_routing_session_to_dict_truncates_long_input(self):
        long_input = "x" * 500
        session = RoutingSession(
            session_id="s3", original_input=long_input, agent_id="a"
        )
        d = session.to_dict()
        assert len(d["original_input"]) == 200


# ---------------------------------------------------------------------------
# 2. ReEnricher
# ---------------------------------------------------------------------------

class TestReEnricher:
    def _make_attempt(self, route_type="skill", error="boom", success=False):
        return RouteAttempt(
            route_type=route_type,
            route_target="target",
            success=success,
            error=error,
            latency_ms=10.0,
        )

    def test_re_enrich_adds_attempted_routes(self):
        enricher = ReEnricher()
        attempt = self._make_attempt("skill")
        ctx = enricher.re_enrich({}, attempt, [attempt])
        assert "attempted_routes" in ctx
        assert "skill" in ctx["attempted_routes"]

    def test_re_enrich_accumulates_attempted_routes(self):
        enricher = ReEnricher()
        a1 = self._make_attempt("skill")
        a2 = self._make_attempt("rag")
        ctx = enricher.re_enrich({}, a1, [a1])
        ctx = enricher.re_enrich(ctx, a2, [a1, a2])
        assert ctx["attempted_routes"] == ["skill", "rag"]

    def test_re_enrich_records_last_failure(self):
        enricher = ReEnricher()
        attempt = self._make_attempt("rag", error="no results found")
        ctx = enricher.re_enrich({}, attempt, [attempt])
        lf = ctx["last_failure"]
        assert lf["route"] == "rag"
        assert lf["target"] == "target"
        assert lf["error"] == "no results found"
        assert lf["latency_ms"] == 10.0

    def test_re_enrich_degrades_confidence(self):
        enricher = ReEnricher()
        ctx: dict = {"enrichment_confidence": 1.0}
        a1 = self._make_attempt("skill")
        ctx = enricher.re_enrich(ctx, a1, [a1])
        assert ctx["enrichment_confidence"] == pytest.approx(0.85)

        a2 = self._make_attempt("rag")
        ctx = enricher.re_enrich(ctx, a2, [a1, a2])
        assert ctx["enrichment_confidence"] == pytest.approx(0.7)

    def test_re_enrich_confidence_floor(self):
        enricher = ReEnricher()
        ctx: dict = {"enrichment_confidence": 0.3}
        attempts = [self._make_attempt(f"r{i}") for i in range(10)]
        for i, a in enumerate(attempts):
            ctx = enricher.re_enrich(ctx, a, attempts[: i + 1])
        assert ctx["enrichment_confidence"] >= 0.3

    def test_rag_failure_sets_prefer_reasoning(self):
        enricher = ReEnricher()
        attempt = self._make_attempt("rag", error="No results in vector store")
        ctx = enricher.re_enrich({}, attempt, [attempt])
        assert ctx["route_preferences"]["prefer_reasoning"] is True

    def test_rag_failure_empty_sets_prefer_reasoning(self):
        enricher = ReEnricher()
        attempt = self._make_attempt("rag", error="Empty result set")
        ctx = enricher.re_enrich({}, attempt, [attempt])
        assert ctx["route_preferences"]["prefer_reasoning"] is True

    def test_skill_failure_sets_prefer_knowledge(self):
        enricher = ReEnricher()
        attempt = self._make_attempt("skill", error="tool not found")
        ctx = enricher.re_enrich({}, attempt, [attempt])
        assert ctx["route_preferences"]["prefer_knowledge"] is True

    def test_fta_failure_sets_prefer_analysis(self):
        enricher = ReEnricher()
        attempt = self._make_attempt("fta", error="workflow crashed")
        ctx = enricher.re_enrich({}, attempt, [attempt])
        assert ctx["route_preferences"]["prefer_analysis"] is True


# ---------------------------------------------------------------------------
# 3. ResilientSelector.route_and_execute
# ---------------------------------------------------------------------------

class TestRouteAndExecute:
    @pytest.mark.asyncio
    async def test_success_on_first_try(self):
        mock_sel = make_selector_mock("skill")
        selector = ResilientSelector(selector=mock_sel, config=ResilientConfig())
        session = await selector.route_and_execute(
            input_text="do something",
            agent_id="a1",
            executor=make_success_executor(),
        )
        assert session.success is True
        assert session.attempt_count == 1
        assert session.final_route == "skill"
        mock_sel.route.assert_called_once()

    @pytest.mark.asyncio
    async def test_retry_on_failure_then_success(self):
        mock_sel = make_selector_mock("skill")
        config = ResilientConfig(max_retries=3)
        selector = ResilientSelector(selector=mock_sel, config=config)

        # Executor that fails once then succeeds
        executor = make_fail_then_succeed(fail_count=1)
        session = await selector.route_and_execute(
            input_text="test",
            agent_id="a1",
            executor=executor,
        )
        # First attempt fails (skill tried), second call gets forced alternative
        assert session.success is True
        assert session.attempt_count == 2

    @pytest.mark.asyncio
    async def test_max_retries_exhausted(self):
        mock_sel = make_selector_mock("skill")
        config = ResilientConfig(max_retries=2, fallback_to_code_analysis=False)
        selector = ResilientSelector(selector=mock_sel, config=config)

        session = await selector.route_and_execute(
            input_text="test",
            agent_id="a1",
            executor=make_always_fail(),
        )
        assert session.success is False
        # max_retries=2 → 3 attempts in the loop (0,1,2) but forced alternatives
        # reduce duplicates, then code_analysis fallback is disabled
        assert session.attempt_count >= 3

    @pytest.mark.asyncio
    async def test_max_retries_with_code_analysis_fallback(self):
        """When all normal routes fail, code_analysis is tried as fallback."""
        mock_sel = make_selector_mock("skill")
        config = ResilientConfig(max_retries=2, fallback_to_code_analysis=True)
        selector = ResilientSelector(selector=mock_sel, config=config)

        session = await selector.route_and_execute(
            input_text="test",
            agent_id="a1",
            executor=make_always_fail(),
        )
        # Should have tried skill + alternatives + code_analysis fallback
        route_types = [a.route_type for a in session.attempts]
        assert "code_analysis" in route_types
        assert session.success is False

    @pytest.mark.asyncio
    async def test_code_analysis_fallback_succeeds(self):
        """code_analysis fallback can succeed when other routes fail."""
        call_count = 0

        async def executor(decision):
            nonlocal call_count
            call_count += 1
            if decision.route_type == "code_analysis":
                return type("Result", (), {"success": True, "output": "analyzed", "error": None})()
            raise Exception(f"fail on {decision.route_type}")

        mock_sel = make_selector_mock("skill")
        config = ResilientConfig(max_retries=1, fallback_to_code_analysis=True)
        selector = ResilientSelector(selector=mock_sel, config=config)

        session = await selector.route_and_execute(
            input_text="test", agent_id="a1", executor=executor
        )
        assert session.success is True
        assert session.final_route == "code_analysis"

    @pytest.mark.asyncio
    async def test_timeout_respected(self):
        """Slow executor should cause session to terminate within timeout."""
        async def slow_executor(decision):
            await asyncio.sleep(0.5)
            raise Exception("slow fail")

        mock_sel = make_selector_mock("skill")
        config = ResilientConfig(max_retries=100, total_timeout_seconds=0.3)
        selector = ResilientSelector(selector=mock_sel, config=config)

        session = await selector.route_and_execute(
            input_text="test", agent_id="a1", executor=slow_executor
        )
        # Should have timed out before exhausting all retries
        assert session.attempt_count < 101
        assert session.total_latency_ms / 1000.0 < 5.0  # sanity bound

    @pytest.mark.asyncio
    async def test_tried_routes_excluded(self):
        """Same route type should not be tried twice."""
        mock_sel = make_selector_mock("skill")
        config = ResilientConfig(max_retries=3, fallback_to_code_analysis=False)
        selector = ResilientSelector(selector=mock_sel, config=config)

        session = await selector.route_and_execute(
            input_text="test",
            agent_id="a1",
            executor=make_always_fail(),
        )
        route_types = [a.route_type for a in session.attempts]
        # Each route type should appear at most once (except forced alternatives fill gaps)
        # At minimum, the first "skill" should not repeat consecutively
        for i in range(1, len(route_types)):
            if route_types[i] == route_types[i - 1]:
                # consecutive duplicates should not happen
                pytest.fail(f"Duplicate consecutive route: {route_types[i]}")

    @pytest.mark.asyncio
    async def test_session_dict_output(self):
        mock_sel = make_selector_mock("skill")
        selector = ResilientSelector(selector=mock_sel, config=ResilientConfig())
        session = await selector.route_and_execute(
            input_text="hello",
            agent_id="a1",
            executor=make_success_executor(),
        )
        d = session.to_dict()
        assert "session_id" in d
        assert "original_input" in d
        assert "agent_id" in d
        assert "attempt_count" in d
        assert "success" in d
        assert "final_route" in d
        assert "total_latency_ms" in d
        assert "attempts" in d
        assert isinstance(d["attempts"], list)
        assert len(d["attempts"]) == 1


# ---------------------------------------------------------------------------
# 4. _force_alternative_route
# ---------------------------------------------------------------------------

class TestForceAlternativeRoute:
    def _make_selector(self, **config_overrides):
        config = ResilientConfig(**config_overrides)
        return ResilientSelector(selector=MagicMock(), config=config)

    def test_force_alternative_follows_priority(self):
        selector = self._make_selector()
        original = make_decision("skill")
        tried = {"skill"}
        new_decision = selector._force_alternative_route(original, tried, {})
        # After skill, priority order is: rag, fta, code_analysis
        assert new_decision.route_type == "rag"
        assert new_decision.parameters.get("forced") is True

    def test_force_alternative_skips_tried(self):
        selector = self._make_selector()
        original = make_decision("rag")
        tried = {"skill", "rag"}
        new_decision = selector._force_alternative_route(original, tried, {})
        assert new_decision.route_type == "fta"

    def test_force_alternative_applies_prefer_reasoning(self):
        selector = self._make_selector()
        original = make_decision("skill")
        tried = {"skill"}
        context = {"route_preferences": {"prefer_reasoning": True}}
        new_decision = selector._force_alternative_route(original, tried, context)
        assert new_decision.route_type == "fta"

    def test_force_alternative_applies_prefer_knowledge(self):
        selector = self._make_selector()
        original = make_decision("skill")
        tried = {"skill"}
        context = {"route_preferences": {"prefer_knowledge": True}}
        new_decision = selector._force_alternative_route(original, tried, context)
        assert new_decision.route_type == "rag"

    def test_force_alternative_applies_prefer_analysis(self):
        selector = self._make_selector()
        original = make_decision("skill")
        tried = {"skill", "rag", "fta"}
        context = {"route_preferences": {"prefer_analysis": True}}
        new_decision = selector._force_alternative_route(original, tried, context)
        assert new_decision.route_type == "code_analysis"

    def test_force_alternative_returns_original_when_all_tried(self):
        selector = self._make_selector()
        original = make_decision("skill")
        tried = {"skill", "rag", "fta", "code_analysis"}
        new_decision = selector._force_alternative_route(original, tried, {})
        # Should return original decision unchanged
        assert new_decision.route_type == original.route_type
        assert new_decision.route_target == original.route_target


# ---------------------------------------------------------------------------
# 5. ResilientConfig
# ---------------------------------------------------------------------------

class TestResilientConfig:
    def test_default_config(self):
        config = ResilientConfig()
        assert config.max_retries == 3
        assert config.total_timeout_seconds == 30.0
        assert config.route_priority == ["skill", "rag", "fta", "code_analysis"]
        assert config.enable_cache_bypass_on_retry is True
        assert config.enable_circuit_breaker is True
        assert config.fallback_to_code_analysis is True

    def test_custom_config(self):
        config = ResilientConfig(
            max_retries=5,
            total_timeout_seconds=60.0,
            route_priority=["rag", "skill"],
            enable_cache_bypass_on_retry=False,
            enable_circuit_breaker=False,
            fallback_to_code_analysis=False,
        )
        assert config.max_retries == 5
        assert config.total_timeout_seconds == 60.0
        assert config.route_priority == ["rag", "skill"]
        assert config.enable_cache_bypass_on_retry is False
        assert config.enable_circuit_breaker is False
        assert config.fallback_to_code_analysis is False


# ---------------------------------------------------------------------------
# 6. Integration-style / edge cases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    @pytest.mark.asyncio
    async def test_executor_returns_dict_result(self):
        """Executor returning a dict with success key should work."""
        async def dict_executor(decision):
            return {"success": True, "output": "dict result", "error": None}

        mock_sel = make_selector_mock("skill")
        selector = ResilientSelector(selector=mock_sel)
        session = await selector.route_and_execute(
            input_text="test", agent_id="a1", executor=dict_executor
        )
        assert session.success is True

    @pytest.mark.asyncio
    async def test_executor_returns_none(self):
        """Executor returning None should be treated as failure."""
        async def none_executor(decision):
            return None

        mock_sel = make_selector_mock("skill")
        config = ResilientConfig(max_retries=0, fallback_to_code_analysis=False)
        selector = ResilientSelector(selector=mock_sel, config=config)
        session = await selector.route_and_execute(
            input_text="test", agent_id="a1", executor=none_executor
        )
        # None is falsy → success=False
        assert session.attempt_count == 1
        assert session.attempts[0].success is False

    @pytest.mark.asyncio
    async def test_get_session_stats(self):
        mock_sel = make_selector_mock("skill")
        selector = ResilientSelector(selector=mock_sel, config=ResilientConfig())
        await selector.route_and_execute(
            input_text="test", agent_id="a1", executor=make_success_executor()
        )
        stats = selector.get_session_stats()
        assert stats["total_sessions"] == 1
        assert stats["config"]["max_retries"] == 3
