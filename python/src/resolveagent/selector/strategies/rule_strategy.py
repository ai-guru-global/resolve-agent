"""Rule-based routing strategy with comprehensive pattern matching.

This module implements a fast, deterministic routing strategy using
pre-defined patterns and rules. It's designed for high-confidence
matching of known request types.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from resolveagent.selector.selector import RouteDecision


@dataclass
class RoutingRule:
    """A routing rule with pattern and metadata."""

    route_type: str
    patterns: list[str]
    target: str = ""
    confidence: float = 0.8
    description: str = ""


class RuleStrategy:
    """Uses pattern matching rules to route requests with high precision.

    Features:
    - Hierarchical pattern matching (most specific first)
    - Confidence scoring based on match quality
    - Support for multiple patterns per route type
    - Fast path for known patterns with deterministic results

    Best for:
    - Known patterns with high-confidence matches
    - Performance-critical routing (no LLM latency)
    - Predictable, auditable routing decisions
    """

    # Routing rules ordered by specificity (most specific first)
    ROUTING_RULES: list[RoutingRule] = [
        # ========== Code Analysis Rules (High Priority) ==========
        RoutingRule(
            route_type="code_analysis",
            patterns=[
                r"```[\s\S]*```",
                r"\b(analyze|review|check|inspect)\b.*\b(code|function|class|method)\b",
                r"\b(find|detect|identify)\b.*\b(bug|issue|vulnerability|error|problem)\b",
                r"\b(static analysis|code review|security scan|lint|linting)\b",
                r"\b(refactor|optimize|improve)\b.*\b(code|function|performance)\b",
                r"\b(ast|syntax tree|parse tree|call graph|dependency graph)\b",
                r"\b(code quality|code smell|technical debt|complexity)\b",
                r"\b(security|vulnerable|cve|injection|xss|csrf)\b.*\b(code|scan|check)\b",
                r"(分析|审查|检查).*(代码|bug|漏洞|安全)",
                r"(代码|bug|漏洞).*(分析|审查|检查|review)",
                r"review.*(function|代码|这段)",
            ],
            target="static-analysis",
            confidence=0.85,
            description="Code analysis and review requests",
        ),
        RoutingRule(
            route_type="code_analysis",
            patterns=[
                r"\bdef\s+\w+\s*\(",
                r"\bclass\s+\w+.*:",
                r"\bfunction\s+\w+\s*\(",
                r"\bfunc\s+\w+\s*\(",
                r"\bpublic\s+class\s+\w+",
            ],
            target="code-exec",
            confidence=0.75,
            description="Code snippet execution or analysis",
        ),
        # ========== Workflow/FTA Rules ==========
        RoutingRule(
            route_type="fta",
            patterns=[
                r"\b(diagnose|troubleshoot|investigate)\b.*\b(issue|problem|failure|error)\b",
                r"\b(diagnose|troubleshoot|investigate)\b.*\b(root cause|outage|incident|degradation)\b",
                r"\b(root cause|rca)\b.*\b(analysis|find|determine|of)\b",
                r"\bfault tree\b.*\b(analysis|build|create)\b",
                r"\b(decision tree|workflow)\b.*\b(run|execute|start)\b",
                r"\b(incident|outage|degradation)\s+(analysis|investigation|triage)\b",
                r"\b(why|how).*\b(failed|broken|not working|crashed|down)\b",
                r"\b(step.?by.?step|multi.?step|complex)\s+(process|diagnosis|analysis)\b",
                r"\broot cause of\b",
                r"(诊断|排查|分析).*(故障|根因|原因|问题)",
                r"(故障|根因|原因).*(诊断|排查|分析)",
            ],
            target="incident-diagnosis",
            confidence=0.85,
            description="Complex diagnostic workflows",
        ),
        # ========== Skill Rules ==========
        RoutingRule(
            route_type="skill",
            patterns=[
                r"\b(search|find|look up)\b.*\b(web|internet|online|google)\b",
                r"\b(search for|find me|look for)\b.*\b(information|results|articles)\b",
                r"(搜索|查找|检索)",
            ],
            target="web-search",
            confidence=0.9,
            description="Web search requests",
        ),
        RoutingRule(
            route_type="skill",
            patterns=[
                r"\b(run|execute|eval|evaluate)\b.*\b(code|script|command|program)\b",
                r"\b(python|javascript|bash|shell)\b.*\b(run|execute)\b",
                r"(运行|执行).*(代码|脚本|程序)",
            ],
            target="code-exec",
            confidence=0.85,
            description="Code execution requests",
        ),
        RoutingRule(
            route_type="skill",
            patterns=[
                r"\b(read|open|view|show|display)\b.*\b(file|document|content)\b",
                r"\b(write|save|create|append)\b.*\b(file|document)\b",
                r"\b(delete|remove)\b.*\b(file|folder|directory)\b",
                r"(读取|查看|打开).*(文件|日志)",
            ],
            target="file-ops",
            confidence=0.85,
            description="File system operations",
        ),
        RoutingRule(
            route_type="skill",
            patterns=[
                r"\b(send|post|get|fetch|call)\b.*\b(api|request|endpoint|http)\b",
                r"\b(curl|wget|http|https)\b.*\b(request|call)\b",
            ],
            target="api-call",
            confidence=0.85,
            description="API call requests",
        ),
        RoutingRule(
            route_type="skill",
            patterns=[
                r"\b(calculate|compute|math|sum|average)\b",
                r"\b(convert|transform|format)\b.*\b(data|json|xml|csv)\b",
            ],
            target="calculator",
            confidence=0.75,
            description="Calculation and conversion",
        ),
        # ========== RAG Rules ==========
        RoutingRule(
            route_type="rag",
            patterns=[
                r"\b(what is|what are|what's)\b.*\b(definition|meaning)\b",
                r"\b(explain|describe|tell me about)\b.*\b(concept|topic|term)\b",
                r"\b(how (do|does|to)|what's the)\b.*\b(work|function|operate)\b",
                r"\b(documentation|docs|manual|guide)\b.*\b(for|about|on)\b",
                r"\b(find|search)\b.*\b(documentation|docs|info|information)\b",
                r"\b(according to|based on|per|as per)\b.*\b(docs|documentation|manual)\b",
                r"(什么是|如何|怎么|怎样|查看文档)",
                r"(文档|手册|指南|部署|配置).*(查看|查询|搜索)",
            ],
            target="product-docs",
            confidence=0.7,
            description="Documentation and knowledge lookup",
        ),
        RoutingRule(
            route_type="rag",
            patterns=[
                r"\b(how to|steps to|procedure for)\b.*\b(deploy|configure|setup|install)\b",
                r"\b(runbook|playbook|sop)\b.*\b(for|about)\b",
                r"\b(standard|procedure|process)\b.*\b(for|to)\b.*\b(handling|responding)\b",
            ],
            target="runbooks",
            confidence=0.75,
            description="Operations runbooks lookup",
        ),
        RoutingRule(
            route_type="rag",
            patterns=[
                r"\b(similar|past|previous|historical)\b.*\b(incident|issue|problem)\b",
                r"\b(has (this|it)|did (we|anyone))\b.*\b(happen|occur|see)\b.*\bbefore\b",
                r"\b(incident|issue)\s+#?\d+\b",
            ],
            target="incident-history",
            confidence=0.8,
            description="Historical incident lookup",
        ),
    ]

    def __init__(self) -> None:
        """Initialize the rule strategy with compiled patterns."""
        self._compiled_rules: list[tuple[RoutingRule, list[re.Pattern[str]]]] = []
        self._compile_patterns()

    def _compile_patterns(self) -> None:
        """Pre-compile regex patterns for efficiency."""
        for rule in self.ROUTING_RULES:
            compiled = [re.compile(p, re.IGNORECASE | re.MULTILINE) for p in rule.patterns]
            self._compiled_rules.append((rule, compiled))

    async def decide(self, input_text: str, agent_id: str, context: dict[str, Any]) -> RouteDecision:
        """Use rules to make routing decision with confidence scoring.

        Args:
            input_text: User input to route.
            agent_id: Agent processing the request.
            context: Additional context for decision making.

        Returns:
            RouteDecision with route type, target, and confidence.
        """
        best_match: RouteDecision | None = None
        best_score = 0.0
        all_matches: list[tuple[str, float, str]] = []

        for rule, patterns in self._compiled_rules:
            match_count = 0
            matched_patterns: list[str] = []

            for pattern in patterns:
                if pattern.search(input_text):
                    match_count += 1
                    matched_patterns.append(pattern.pattern[:50])

            if match_count > 0:
                score = rule.confidence * (0.7 + 0.3 * min(match_count / max(len(patterns), 1), 1.0))
                all_matches.append((rule.route_type, score, rule.target))

                if score > best_score:
                    best_score = score
                    best_match = RouteDecision(
                        route_type=rule.route_type,
                        route_target=rule.target,
                        confidence=min(score + 0.1, 1.0),  # Boost confidence slightly
                        reasoning=f"Rule match: {rule.description} (patterns: {matched_patterns})",
                        parameters={"matched_patterns": matched_patterns},
                    )

        # If we have a match, return it
        if best_match and best_match.confidence >= 0.6:
            return best_match

        # Check for code blocks as a fallback for code_analysis
        if self._contains_code_block(input_text):
            return RouteDecision(
                route_type="code_analysis",
                route_target="static-analysis",
                confidence=0.75,
                reasoning="Code block detected in input",
                parameters={"detection_method": "code_block"},
            )

        # No confident rule matched - return low confidence default
        return RouteDecision(
            route_type="direct",
            route_target="",
            confidence=0.3,
            reasoning="No rule matched with sufficient confidence",
            parameters={"attempted_matches": [m[0] for m in all_matches[:3]]},
        )

    def _contains_code_block(self, text: str) -> bool:
        """Check if text contains code blocks."""
        # Markdown code blocks
        if re.search(r"```[\s\S]*?```", text):
            return True
        # Multiple lines of code-like content
        code_lines = 0
        for line in text.split("\n"):
            if re.match(r"^\s*(def|class|function|import|from|var|let|const|func|package)\b", line):
                code_lines += 1
        return code_lines >= 2

    def get_rules_summary(self) -> list[dict[str, Any]]:
        """Get a summary of all routing rules for introspection."""
        return [
            {
                "route_type": rule.route_type,
                "target": rule.target,
                "description": rule.description,
                "pattern_count": len(rule.patterns),
                "default_confidence": rule.confidence,
            }
            for rule in self.ROUTING_RULES
        ]
