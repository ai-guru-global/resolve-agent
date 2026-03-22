"""Rule-based routing strategy."""

from __future__ import annotations

import re
from typing import Any

from resolvenet.selector.selector import RouteDecision


class RuleStrategy:
    """Uses pattern matching rules to route requests.

    Fast and deterministic. Best for known patterns with
    high-confidence matches.
    """

    # Default routing rules
    SKILL_PATTERNS = [
        (r"\b(search|find|look up)\b.*\b(web|internet|online)\b", "web-search"),
        (r"\b(run|execute|eval)\b.*\b(code|script|python)\b", "code-exec"),
        (r"\b(read|open|write|save)\b.*\b(file|document)\b", "file-ops"),
    ]

    RAG_PATTERNS = [
        (r"\b(what|how|explain|describe|tell me about)\b", None),
        (r"\b(document|knowledge|reference|manual)\b", None),
    ]

    FTA_PATTERNS = [
        (r"\b(diagnose|troubleshoot|root cause|analyze failure)\b", None),
        (r"\b(fault tree|decision tree|workflow)\b", None),
    ]

    async def decide(
        self, input_text: str, agent_id: str, context: dict[str, Any]
    ) -> RouteDecision:
        """Use rules to make routing decision."""
        text_lower = input_text.lower()

        # Check FTA patterns
        for pattern, target in self.FTA_PATTERNS:
            if re.search(pattern, text_lower):
                return RouteDecision(
                    route_type="fta",
                    route_target=target or "",
                    confidence=0.8,
                    reasoning=f"Rule match: {pattern}",
                )

        # Check skill patterns
        for pattern, target in self.SKILL_PATTERNS:
            if re.search(pattern, text_lower):
                return RouteDecision(
                    route_type="skill",
                    route_target=target or "",
                    confidence=0.85,
                    reasoning=f"Rule match: {pattern}",
                )

        # Check RAG patterns
        for pattern, target in self.RAG_PATTERNS:
            if re.search(pattern, text_lower):
                return RouteDecision(
                    route_type="rag",
                    route_target=target or "",
                    confidence=0.6,
                    reasoning=f"Rule match: {pattern}",
                )

        # No rule matched - low confidence default
        return RouteDecision(
            route_type="direct",
            confidence=0.3,
            reasoning="No rule matched",
        )
