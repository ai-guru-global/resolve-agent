"""Integration tests for RouteDecider."""

from __future__ import annotations

import pytest

from resolveagent.selector.router import (
    HIGH_CONFIDENCE_THRESHOLD,
    MEDIUM_CONFIDENCE_THRESHOLD,
    RouteDecider,
)


class TestRouteDecider:
    """Tests for routing decision logic."""

    @pytest.fixture
    def decider(self) -> RouteDecider:
        return RouteDecider()

    @pytest.mark.asyncio
    async def test_workflow_high_confidence_routes_to_fta(self, decider: RouteDecider) -> None:
        context = {"active_workflows": [{"id": "incident-diagnosis", "type": "fta"}]}
        decision = await decider.decide("workflow", 0.9, context)
        assert decision.route_type == "fta", "高置信度 workflow 应路由到 FTA"
        assert decision.route_target == "incident-diagnosis"

    @pytest.mark.asyncio
    async def test_skill_intent_routes_to_skill_with_target(self, decider: RouteDecider) -> None:
        context = {"available_skills": [{"name": "web-search"}, {"name": "log-analyzer"}]}
        decision = await decider.decide("skill", 0.85, context)
        assert decision.route_type == "skill", "skill 意图应路由到技能执行器"
        assert decision.route_target == "web-search", "应选择第一个可用 skill"

    @pytest.mark.asyncio
    async def test_skill_intent_no_skills_defaults_to_web_search(self, decider: RouteDecider) -> None:
        decision = await decider.decide("skill", 0.85, {})
        assert decision.route_target == "web-search"

    @pytest.mark.asyncio
    async def test_rag_intent_routes_with_collection(self, decider: RouteDecider) -> None:
        context = {"rag_collections": [{"id": "ops-kb"}]}
        decision = await decider.decide("rag", 0.8, context)
        assert decision.route_type == "rag", "rag 意图应路由到 RAG"
        assert decision.route_target == "ops-kb"

    @pytest.mark.asyncio
    async def test_rag_intent_no_collections_defaults(self, decider: RouteDecider) -> None:
        decision = await decider.decide("rag", 0.8, {})
        assert decision.route_target == "product-docs"

    @pytest.mark.asyncio
    async def test_low_confidence_with_code_context_overrides_to_code_analysis(self, decider: RouteDecider) -> None:
        context = {
            "code_context": {
                "has_code_blocks": True,
                "language": "python",
                "potential_issues": [],
            }
        }
        decision = await decider.decide("direct", MEDIUM_CONFIDENCE_THRESHOLD - 0.1, context)
        assert decision.route_type == "code_analysis", "低置信度+代码上下文应覆盖为 code_analysis"
        assert decision.route_target == "static-analysis"

    @pytest.mark.asyncio
    async def test_low_confidence_without_code_context_stays_direct(self, decider: RouteDecider) -> None:
        decision = await decider.decide("direct", MEDIUM_CONFIDENCE_THRESHOLD - 0.1, {})
        assert decision.route_type == "direct"

    @pytest.mark.asyncio
    async def test_unknown_intent_defaults_to_direct(self, decider: RouteDecider) -> None:
        decision = await decider.decide("nonsense_intent", 0.5, {})
        assert decision.route_type == "direct", "未知意图应默认为 direct"

    @pytest.mark.asyncio
    async def test_reasoning_includes_confidence_level(self, decider: RouteDecider) -> None:
        decision = await decider.decide("skill", HIGH_CONFIDENCE_THRESHOLD + 0.1, {})
        assert "high confidence" in decision.reasoning

        decision2 = await decider.decide("skill", MEDIUM_CONFIDENCE_THRESHOLD + 0.1, {})
        assert "medium confidence" in decision2.reasoning

        decision3 = await decider.decide("skill", MEDIUM_CONFIDENCE_THRESHOLD - 0.1, {})
        assert "low confidence" in decision3.reasoning

    @pytest.mark.asyncio
    async def test_code_analysis_security_issue_routes_to_security_scan(self, decider: RouteDecider) -> None:
        context = {
            "code_context": {
                "has_code_blocks": False,
                "potential_issues": ["security vulnerability", "sql injection"],
            }
        }
        decision = await decider.decide("code_analysis", 0.9, context)
        assert decision.route_target == "security-scan", "security issues 应路由到 security-scan"

    @pytest.mark.asyncio
    async def test_parameters_include_context_stats(self, decider: RouteDecider) -> None:
        context = {
            "available_skills": [{"name": "s1"}, {"name": "s2"}],
            "active_workflows": [{"id": "w1"}],
        }
        decision = await decider.decide("skill", 0.8, context)
        assert decision.parameters["context_skills_count"] == 2
        assert decision.parameters["context_workflows_count"] == 1
