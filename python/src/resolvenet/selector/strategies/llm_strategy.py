"""LLM-based routing strategy."""

from __future__ import annotations

from typing import Any

from resolvenet.selector.selector import RouteDecision


class LLMStrategy:
    """Uses an LLM to classify and route requests.

    Best for open-ended, ambiguous requests where rule-based
    matching is insufficient.
    """

    ROUTING_PROMPT = """You are a routing classifier for an AI agent platform.
Given the user input, classify which subsystem should handle this request:

- "fta": Use for structured decision trees, root cause analysis, multi-step diagnostics
- "skill": Use for specific tool execution (web search, code execution, file operations)
- "rag": Use for knowledge retrieval, document Q&A, information lookup
- "direct": Use for general conversation, simple questions, creative tasks

User input: {input}

Available skills: {skills}
Available workflows: {workflows}
Available RAG collections: {collections}

Respond with JSON: {{"route_type": "...", "route_target": "...", "confidence": 0.0-1.0, "reasoning": "..."}}"""

    async def decide(
        self, input_text: str, agent_id: str, context: dict[str, Any]
    ) -> RouteDecision:
        """Use LLM to make routing decision."""
        # TODO: Call LLM with ROUTING_PROMPT
        # For now, return default
        return RouteDecision(
            route_type="direct",
            confidence=0.7,
            reasoning="LLM strategy: defaulting to direct response",
        )
