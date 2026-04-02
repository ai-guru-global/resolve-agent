"""Comprehensive tests for the Intelligent Selector."""

from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from resolveagent.selector.selector import IntelligentSelector, RouteDecision
from resolveagent.selector.strategies.rule_strategy import RuleStrategy


class TestIntelligentSelector:
    """Test cases for IntelligentSelector."""

    @pytest.mark.asyncio
    async def test_selector_initialization(self):
        """Test selector initializes with valid strategies."""
        # Default strategy
        selector = IntelligentSelector()
        assert selector.strategy == "hybrid"

        # Explicit strategies
        for strategy in ["rule", "llm", "hybrid"]:
            selector = IntelligentSelector(strategy=strategy)
            assert selector.strategy == strategy

    @pytest.mark.asyncio
    async def test_selector_invalid_strategy_fallback(self):
        """Test selector falls back to hybrid for invalid strategy."""
        selector = IntelligentSelector(strategy="invalid")
        assert selector.strategy == "hybrid"

    @pytest.mark.asyncio
    async def test_route_code_analysis_request(self):
        """Test routing for code analysis requests."""
        selector = IntelligentSelector(strategy="rule")

        test_cases = [
            (
                "分析这段代码的 bug",
                "code_analysis",
                "代码分析请求应被路由到 code_analysis",
            ),
            (
                "帮我 review 这个 function",
                "code_analysis",
                "代码审查请求应被路由到 code_analysis",
            ),
            (
                "```python\ndef foo():\n    pass\n```",
                "code_analysis",
                "包含代码块应被路由到 code_analysis",
            ),
        ]

        for query, expected_type, msg in test_cases:
            decision = await selector.route(query)
            assert decision.route_type == expected_type, msg
            assert decision.confidence >= 0.6, f"{msg} - 置信度应 >= 0.6"

    @pytest.mark.asyncio
    async def test_route_rag_request(self):
        """Test routing for RAG/knowledge requests."""
        selector = IntelligentSelector(strategy="rule")

        test_cases = [
            (
                "什么是 Kubernetes？",
                "rag",
                "定义查询应被路由到 rag",
            ),
            (
                "如何部署服务？",
                "rag",
                "操作指南查询应被路由到 rag",
            ),
            (
                "查看文档",
                "rag",
                "文档查询应被路由到 rag",
            ),
        ]

        for query, expected_type, msg in test_cases:
            decision = await selector.route(query)
            assert decision.route_type == expected_type, msg

    @pytest.mark.asyncio
    async def test_route_skill_request(self):
        """Test routing for skill execution requests."""
        selector = IntelligentSelector(strategy="rule")

        test_cases = [
            (
                "搜索 Kubernetes 最佳实践",
                "skill",
                "web-search",
                "搜索请求应被路由到 web-search skill",
            ),
            (
                "运行这段 Python 代码",
                "skill",
                "code-exec",
                "代码执行请求应被路由到 code-exec skill",
            ),
            (
                "读取文件 /var/log/app.log",
                "skill",
                "file-ops",
                "文件操作应被路由到 file-ops skill",
            ),
        ]

        for query, expected_type, expected_target, msg in test_cases:
            decision = await selector.route(query)
            assert decision.route_type == expected_type, msg
            assert decision.route_target == expected_target, msg

    @pytest.mark.asyncio
    async def test_route_fta_request(self):
        """Test routing for FTA/workflow requests."""
        selector = IntelligentSelector(strategy="rule")

        test_cases = [
            (
                "诊断服务故障",
                "fta",
                "故障诊断应被路由到 FTA",
            ),
            (
                "分析根因",
                "fta",
                "根因分析应被路由到 FTA",
            ),
        ]

        for query, expected_type, msg in test_cases:
            decision = await selector.route(query)
            assert decision.route_type == expected_type, msg

    @pytest.mark.asyncio
    async def test_route_direct_fallback(self):
        """Test direct routing for general conversation."""
        selector = IntelligentSelector(strategy="rule")

        test_cases = [
            "你好",
            "今天天气怎么样",
            "谢谢",
        ]

        for query in test_cases:
            decision = await selector.route(query)
            # Should fall back to direct for general conversation
            assert decision.route_type in ["direct", "rag"], f"'{query}' 应被路由到 direct 或 rag"

    @pytest.mark.asyncio
    async def test_route_with_agent_id(self):
        """Test routing with agent ID."""
        selector = IntelligentSelector(strategy="rule")
        decision = await selector.route(
            "分析代码",
            agent_id="test-agent-001",
        )

        assert decision.route_type == "code_analysis"

    @pytest.mark.asyncio
    async def test_route_with_context(self):
        """Test routing with additional context."""
        selector = IntelligentSelector(strategy="rule")
        context = {
            "available_skills": ["code-analyzer", "log-viewer"],
            "history": [],
        }

        decision = await selector.route(
            "查看日志",
            agent_id="test-agent",
            context=context,
        )

        assert decision.confidence >= 0
        assert decision.confidence <= 1.0

    @pytest.mark.asyncio
    async def test_analyze_intent(self):
        """Test intent analysis without full routing."""
        selector = IntelligentSelector(strategy="rule")

        result = await selector.analyze_intent("分析这段代码的 bug")

        assert "intent_type" in result
        assert "confidence" in result
        assert result["confidence"] >= 0
        assert result["confidence"] <= 1.0


class TestRouteDecision:
    """Test cases for RouteDecision model."""

    def test_route_decision_defaults(self):
        """Test RouteDecision default values."""
        decision = RouteDecision()

        assert decision.route_type == "direct"
        assert decision.route_target == ""
        assert decision.confidence == 0.0
        assert decision.parameters == {}
        assert decision.reasoning == ""
        assert decision.chain == []

    def test_route_decision_custom_values(self):
        """Test RouteDecision with custom values."""
        decision = RouteDecision(
            route_type="code_analysis",
            route_target="static-analyzer",
            confidence=0.85,
            parameters={"language": "python"},
            reasoning="Code block detected",
        )

        assert decision.route_type == "code_analysis"
        assert decision.route_target == "static-analyzer"
        assert decision.confidence == 0.85
        assert decision.parameters == {"language": "python"}
        assert decision.reasoning == "Code block detected"

    def test_is_code_related(self):
        """Test code-related detection."""
        code_decisions = [
            RouteDecision(route_type="code_analysis", route_target="static-analysis"),
            RouteDecision(route_type="skill", route_target="code-exec"),
            RouteDecision(route_type="skill", route_target="python-linter"),
        ]

        for decision in code_decisions:
            assert decision.is_code_related(), f"{decision.route_type}/{decision.route_target} 应被识别为代码相关"

        non_code_decisions = [
            RouteDecision(route_type="rag", route_target="docs"),
            RouteDecision(route_type="skill", route_target="web-search"),
        ]

        for decision in non_code_decisions:
            assert not decision.is_code_related(), f"{decision.route_type}/{decision.route_target} 不应被识别为代码相关"

    def test_is_high_confidence(self):
        """Test high confidence detection."""
        high_confidence = RouteDecision(confidence=0.85)
        assert high_confidence.is_high_confidence()
        assert high_confidence.is_high_confidence(threshold=0.8)
        assert not high_confidence.is_high_confidence(threshold=0.9)

        low_confidence = RouteDecision(confidence=0.5)
        assert not low_confidence.is_high_confidence()


class TestRuleStrategy:
    """Test cases for RuleStrategy."""

    @pytest.mark.asyncio
    async def test_rule_strategy_initialization(self):
        """Test RuleStrategy initialization."""
        strategy = RuleStrategy()
        assert len(strategy._compiled_rules) > 0

    @pytest.mark.asyncio
    async def test_rule_matching(self):
        """Test rule pattern matching."""
        strategy = RuleStrategy()

        # Code analysis patterns
        decision = await strategy.decide(
            "帮我分析一下这段代码",
            agent_id="test",
            context={},
        )
        assert decision.route_type == "code_analysis"

        # Web search patterns
        decision = await strategy.decide(
            "搜索 Kubernetes 文档",
            agent_id="test",
            context={},
        )
        assert decision.route_type == "skill"
        assert decision.route_target == "web-search"

    @pytest.mark.asyncio
    async def test_no_match_fallback(self):
        """Test fallback when no rules match."""
        strategy = RuleStrategy()

        decision = await strategy.decide(
            "xyz abc 123",  # Random text
            agent_id="test",
            context={},
        )

        assert decision.route_type == "direct"
        assert decision.confidence < 0.5

    def test_get_rules_summary(self):
        """Test getting rules summary."""
        strategy = RuleStrategy()
        summary = strategy.get_rules_summary()

        assert len(summary) > 0
        for rule in summary:
            assert "route_type" in rule
            assert "target" in rule
            assert "description" in rule
            assert "pattern_count" in rule


class TestStrategyInfo:
    """Test cases for strategy information."""

    @pytest.mark.asyncio
    async def test_get_strategy_info(self):
        """Test getting strategy information."""
        selector = IntelligentSelector(strategy="hybrid")
        info = selector.get_strategy_info()

        assert info["strategy"] == "hybrid"
        assert "valid_strategies" in info
        assert "description" in info
        assert "hybrid" in info["valid_strategies"]
