"""Unit tests for the Intelligent Selector.

Comprehensive tests for:
- Intent analysis
- Context enrichment
- Rule-based routing
- LLM-based routing
- Hybrid strategy
- Code analysis routing
"""

import pytest

from resolveagent.selector import (
    ContextEnricher,
    EnrichedContext,
    IntelligentSelector,
    IntentAnalyzer,
    IntentType,
    RouteDecision,
)
from resolveagent.selector.strategies import (
    HybridConfig,
    HybridStrategy,
    LLMStrategy,
    RuleStrategy,
)

# ==================== Intent Analyzer Tests ====================


class TestIntentAnalyzer:
    """Tests for the IntentAnalyzer class."""

    @pytest.fixture
    def analyzer(self):
        return IntentAnalyzer()

    @pytest.mark.asyncio
    async def test_workflow_intent(self, analyzer):
        """Test detection of workflow/FTA intents."""
        inputs = [
            "diagnose the root cause of this failure",
            "troubleshoot why the service is down",
            "investigate the incident",
            "run fault tree analysis",
        ]
        for input_text in inputs:
            result = await analyzer.classify(input_text)
            assert result.intent_type == IntentType.WORKFLOW.value, f"Expected workflow for: {input_text}"
            assert result.confidence > 0.5

    @pytest.mark.asyncio
    async def test_skill_intent(self, analyzer):
        """Test detection of skill intents."""
        inputs = [
            "search the web for Python tutorials",
            "execute this Python script",
            "read the file config.yaml",
            "calculate 15% of 200",
        ]
        for input_text in inputs:
            result = await analyzer.classify(input_text)
            assert result.intent_type == IntentType.SKILL.value, f"Expected skill for: {input_text}"

    @pytest.mark.asyncio
    async def test_rag_intent(self, analyzer):
        """Test detection of RAG/knowledge intents."""
        inputs = [
            "what is the deployment process?",
            "explain how authentication works",
            "find documentation about API endpoints",
            "how do I configure SSL?",
        ]
        for input_text in inputs:
            result = await analyzer.classify(input_text)
            assert result.intent_type == IntentType.RAG.value, f"Expected rag for: {input_text}"

    @pytest.mark.asyncio
    async def test_code_analysis_intent(self, analyzer):
        """Test detection of code analysis intents."""
        inputs = [
            "analyze this code for bugs",
            "review this function for security issues",
            "find vulnerabilities in this module",
            "```python\ndef hello(): pass```",
        ]
        for input_text in inputs:
            result = await analyzer.classify(input_text)
            assert result.intent_type == IntentType.CODE_ANALYSIS.value, f"Expected code_analysis for: {input_text}"

    @pytest.mark.asyncio
    async def test_empty_input(self, analyzer):
        """Test handling of empty input."""
        result = await analyzer.classify("")
        assert result.intent_type == IntentType.DIRECT.value
        assert result.confidence < 0.5

    @pytest.mark.asyncio
    async def test_code_detection(self, analyzer):
        """Test code block detection in input."""
        code_input = """
        ```python
        def calculate_sum(a, b):
            return a + b
        ```
        """
        result = await analyzer.classify(code_input)
        assert result.metadata.get("contains_code") is True


# ==================== Context Enricher Tests ====================


class TestContextEnricher:
    """Tests for the ContextEnricher class."""

    @pytest.fixture
    def enricher(self):
        return ContextEnricher()

    @pytest.mark.asyncio
    async def test_basic_enrichment(self, enricher):
        """Test basic context enrichment."""
        result = await enricher.enrich(
            input_text="test input",
            agent_id="test-agent",
            context={},
        )
        assert isinstance(result, EnrichedContext)
        assert result.input_text == "test input"
        assert result.agent_id == "test-agent"
        assert len(result.available_skills) > 0
        assert len(result.active_workflows) > 0
        assert len(result.rag_collections) > 0

    @pytest.mark.asyncio
    async def test_code_context_extraction(self, enricher):
        """Test code context extraction from input."""
        code_input = """
        ```python
        password = "hardcoded123"
        exec(user_input)
        ```
        """
        result = await enricher.enrich(
            input_text=code_input,
            agent_id="test-agent",
            context={},
        )
        assert result.code_context is not None
        assert result.code_context.has_code_blocks
        assert result.code_context.language == "python"
        # Should detect security issues
        assert len(result.code_context.potential_issues) > 0

    @pytest.mark.asyncio
    async def test_language_detection(self, enricher):
        """Test programming language detection."""
        test_cases = [
            ("def hello(): pass", "python"),
            ("function hello() { return 1; }", "javascript"),
            ("package main\nfunc main() {}", "go"),
        ]
        for code, expected_lang in test_cases:
            result = await enricher.enrich(
                input_text=code,
                agent_id="test",
                context={},
            )
            if result.code_context:
                assert result.code_context.language == expected_lang, f"Expected {expected_lang} for: {code[:30]}"

    @pytest.mark.asyncio
    async def test_to_dict(self, enricher):
        """Test EnrichedContext serialization."""
        result = await enricher.enrich("test", "agent", {})
        as_dict = result.to_dict()
        assert isinstance(as_dict, dict)
        assert "input_text" in as_dict
        assert "agent_id" in as_dict
        assert "available_skills" in as_dict


# ==================== Rule Strategy Tests ====================


class TestRuleStrategy:
    """Tests for the RuleStrategy class."""

    @pytest.fixture
    def strategy(self):
        return RuleStrategy()

    @pytest.mark.asyncio
    async def test_code_analysis_routing(self, strategy):
        """Test routing to code_analysis for code-related requests."""
        inputs = [
            "review this code: ```def foo(): pass```",
            "analyze this function for bugs",
            "find security vulnerabilities in the code",
            "run static analysis on this module",
        ]
        for input_text in inputs:
            decision = await strategy.decide(input_text, "agent", {})
            assert decision.route_type == "code_analysis", f"Expected code_analysis for: {input_text}"

    @pytest.mark.asyncio
    async def test_workflow_routing(self, strategy):
        """Test routing to workflow/FTA for diagnostic requests."""
        inputs = [
            "diagnose why the service failed",
            "troubleshoot the database issue",
            "investigate the root cause of the outage",
        ]
        for input_text in inputs:
            decision = await strategy.decide(input_text, "agent", {})
            assert decision.route_type == "fta", f"Expected fta for: {input_text}"

    @pytest.mark.asyncio
    async def test_skill_routing(self, strategy):
        """Test routing to skill for tool execution requests."""
        decision = await strategy.decide(
            "search the web for Python best practices",
            "agent",
            {},
        )
        assert decision.route_type == "skill"
        assert decision.route_target == "web-search"

    @pytest.mark.asyncio
    async def test_rag_routing(self, strategy):
        """Test routing to rag for documentation requests."""
        decision = await strategy.decide(
            "what is the deployment process according to docs?",
            "agent",
            {},
        )
        assert decision.route_type == "rag"

    @pytest.mark.asyncio
    async def test_confidence_scores(self, strategy):
        """Test that confidence scores are in valid range."""
        decision = await strategy.decide("test input", "agent", {})
        assert 0.0 <= decision.confidence <= 1.0

    def test_rules_summary(self, strategy):
        """Test rules summary generation."""
        summary = strategy.get_rules_summary()
        assert len(summary) > 0
        assert all("route_type" in rule for rule in summary)


# ==================== LLM Strategy Tests ====================


class TestLLMStrategy:
    """Tests for the LLMStrategy class."""

    @pytest.fixture
    def strategy(self):
        return LLMStrategy()

    @pytest.mark.asyncio
    async def test_code_analysis_routing(self, strategy):
        """Test LLM routing for code analysis requests."""
        decision = await strategy.decide(
            "```python\ndef foo(): pass```\nreview this code",
            "agent",
            {},
        )
        assert decision.route_type == "code_analysis"

    @pytest.mark.asyncio
    async def test_workflow_routing(self, strategy):
        """Test LLM routing for diagnostic requests."""
        decision = await strategy.decide(
            "diagnose why the API is returning 500 errors",
            "agent",
            {},
        )
        assert decision.route_type == "workflow"

    @pytest.mark.asyncio
    async def test_fallback_handling(self, strategy):
        """Test fallback decision on parse errors."""
        # Force a fallback by testing with ambiguous input
        decision = await strategy.decide("hello", "agent", {})
        assert decision.route_type in ("direct", "rag")
        assert decision.confidence > 0


# ==================== Hybrid Strategy Tests ====================


class TestHybridStrategy:
    """Tests for the HybridStrategy class."""

    @pytest.fixture
    def strategy(self):
        return HybridStrategy()

    @pytest.mark.asyncio
    async def test_high_confidence_rule_match(self, strategy):
        """Test that high confidence rule matches bypass LLM."""
        decision = await strategy.decide(
            "```python\ndef analyze_me(): pass```",
            "agent",
            {},
        )
        assert decision.route_type == "code_analysis"
        assert "Hybrid" in decision.reasoning

    @pytest.mark.asyncio
    async def test_llm_fallback(self, strategy):
        """Test LLM fallback for ambiguous cases."""
        decision = await strategy.decide(
            "help me with something",
            "agent",
            {},
        )
        assert "Hybrid" in decision.reasoning

    @pytest.mark.asyncio
    async def test_custom_config(self):
        """Test hybrid strategy with custom config."""
        config = HybridConfig(
            rule_confidence_threshold=0.9,
            llm_confidence_threshold=0.5,
            use_ensemble=False,
        )
        strategy = HybridStrategy(config=config)
        assert strategy.config.rule_confidence_threshold == 0.9

    def test_get_config(self, strategy):
        """Test configuration retrieval."""
        config = strategy.get_config()
        assert "rule_confidence_threshold" in config
        assert "use_ensemble" in config


# ==================== Intelligent Selector Tests ====================


class TestIntelligentSelector:
    """Tests for the IntelligentSelector class."""

    @pytest.mark.asyncio
    async def test_default_strategy(self):
        """Test that default strategy is hybrid."""
        selector = IntelligentSelector()
        assert selector.strategy == "hybrid"

    @pytest.mark.asyncio
    async def test_rule_strategy(self):
        """Test rule-based routing."""
        selector = IntelligentSelector(strategy="rule")
        decision = await selector.route("search the web for Python tutorials")
        assert decision.route_type in ("skill", "rag", "direct", "fta", "code_analysis")
        assert 0.0 <= decision.confidence <= 1.0

    @pytest.mark.asyncio
    async def test_hybrid_strategy(self):
        """Test hybrid routing strategy."""
        selector = IntelligentSelector(strategy="hybrid")
        decision = await selector.route("diagnose the root cause of the outage")
        assert decision.route_type in ("fta", "workflow", "skill", "rag", "direct")

    @pytest.mark.asyncio
    async def test_llm_strategy(self):
        """Test LLM-based routing."""
        selector = IntelligentSelector(strategy="llm")
        decision = await selector.route("what is the deployment process?")
        assert decision.route_type in ("rag", "skill", "direct", "workflow")

    @pytest.mark.asyncio
    async def test_invalid_strategy_fallback(self):
        """Test fallback to hybrid for invalid strategy."""
        selector = IntelligentSelector(strategy="invalid")
        assert selector.strategy == "hybrid"

    @pytest.mark.asyncio
    async def test_code_analysis_routing(self):
        """Test routing for code analysis requests."""
        selector = IntelligentSelector(strategy="hybrid")
        decision = await selector.route("```python\ndef vulnerable(): exec(input())```\nfind security issues")
        assert decision.route_type == "code_analysis"

    @pytest.mark.asyncio
    async def test_context_enrichment(self):
        """Test routing with context enrichment."""
        selector = IntelligentSelector()
        decision = await selector.route(
            "analyze this code",
            agent_id="test-agent",
            enrich_context=True,
        )
        assert isinstance(decision, RouteDecision)

    @pytest.mark.asyncio
    async def test_analyze_intent(self):
        """Test intent analysis without full routing."""
        selector = IntelligentSelector()
        intent = await selector.analyze_intent("diagnose the error")
        assert "intent_type" in intent
        assert "confidence" in intent
        assert intent["intent_type"] == "workflow"

    def test_strategy_info(self):
        """Test strategy information retrieval."""
        selector = IntelligentSelector(strategy="hybrid")
        info = selector.get_strategy_info()
        assert info["strategy"] == "hybrid"
        assert "valid_strategies" in info
        assert "description" in info


# ==================== Route Decision Tests ====================


class TestRouteDecision:
    """Tests for the RouteDecision model."""

    def test_default_values(self):
        """Test default values for RouteDecision."""
        decision = RouteDecision()
        assert decision.route_type == "direct"
        assert decision.confidence == 0.0
        assert decision.parameters == {}

    def test_is_code_related(self):
        """Test code-related detection."""
        decision = RouteDecision(
            route_type="code_analysis",
            route_target="static-analysis",
        )
        assert decision.is_code_related()

        decision2 = RouteDecision(
            route_type="rag",
            route_target="docs",
        )
        assert not decision2.is_code_related()

    def test_is_high_confidence(self):
        """Test high confidence detection."""
        high = RouteDecision(confidence=0.85)
        low = RouteDecision(confidence=0.4)

        assert high.is_high_confidence()
        assert not low.is_high_confidence()
        assert low.is_high_confidence(threshold=0.3)

    def test_confidence_bounds(self):
        """Test confidence value bounds validation."""
        # Pydantic should validate bounds
        with pytest.raises(ValueError):
            RouteDecision(confidence=1.5)
        with pytest.raises(ValueError):
            RouteDecision(confidence=-0.5)


# ==================== Integration Tests ====================


class TestIntegration:
    """Integration tests for the full selector pipeline."""

    @pytest.mark.asyncio
    async def test_full_pipeline_code_analysis(self):
        """Test full pipeline for code analysis request."""
        selector = IntelligentSelector(strategy="hybrid")
        code_request = """
        Review this function:
        ```python
        def process_user_input(data):
            # TODO: add validation
            result = eval(data)
            return result
        ```
        """
        decision = await selector.route(code_request, enrich_context=True)
        assert decision.route_type == "code_analysis"
        assert decision.confidence > 0.6

    @pytest.mark.asyncio
    async def test_full_pipeline_workflow(self):
        """Test full pipeline for workflow/diagnostic request."""
        selector = IntelligentSelector(strategy="hybrid")
        decision = await selector.route(
            "Why is the payment service returning 503 errors? We need to diagnose the root cause.",
            enrich_context=True,
        )
        assert decision.route_type in ("fta", "workflow")

    @pytest.mark.asyncio
    async def test_full_pipeline_rag(self):
        """Test full pipeline for RAG/knowledge request."""
        selector = IntelligentSelector(strategy="hybrid")
        decision = await selector.route(
            "What is the standard procedure for deploying to production?",
            enrich_context=True,
        )
        assert decision.route_type == "rag"
