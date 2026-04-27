"""LLM-based routing strategy with intelligent classification.

This module uses Large Language Models to classify and route requests
when rule-based matching is insufficient or ambiguous.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from resolveagent.selector.selector import RouteDecision

logger = logging.getLogger(__name__)


class LLMStrategy:
    """Uses an LLM to intelligently classify and route requests.

    Features:
    - Sophisticated intent understanding through LLM
    - Context-aware routing decisions
    - Support for ambiguous and complex requests
    - Structured JSON output parsing
    - Fallback handling for LLM failures

    Best for:
    - Open-ended, ambiguous requests
    - Complex multi-intent queries
    - Cases where rule-based matching fails
    - Nuanced understanding requirements
    """

    # Detailed routing prompt with examples and constraints
    ROUTING_PROMPT = """You are an intelligent routing classifier for the ResolveAgent AIOps platform.
Your task is to analyze the user's request and determine the optimal processing path.

## Available Routes

1. **workflow** - Use for:
   - Complex multi-step diagnostic processes
   - Fault Tree Analysis (FTA) scenarios
   - Root cause analysis investigations
   - Incident troubleshooting workflows
   - Decision tree execution
   Example: "Why is the service down?", "Diagnose the database performance issue"

2. **skill** - Use for:
   - Specific tool execution (web search, code execution, file operations)
   - API calls and external service interactions
   - Calculations and data transformations
   - Direct action requests with clear tool mappings
   Example: "Search the web for Python best practices", "Execute this Python script"

3. **rag** - Use for:
   - Knowledge base queries and lookups
   - Documentation searches
   - "What is..." or "How to..." questions about concepts
   - Historical information retrieval
   - Best practices and guidelines queries
   Example: "What is the deployment process?", "How do we handle authentication?"

4. **code_analysis** - Use for:
   - Code review and inspection requests
   - Bug detection and vulnerability scanning
   - Static analysis and linting
   - Code refactoring suggestions
   - AST parsing or dependency analysis
   - Requests containing code blocks or snippets
   Example: "Review this code", "Find bugs in this function", "Is this code secure?"

5. **direct** - Use for:
   - General conversation and greetings
   - Simple questions not requiring specialized processing
   - Creative tasks and open-ended discussions
   - When no other route is clearly appropriate
   Example: "Hello", "What's the weather like?", "Tell me a joke"

## Context Information

{context}

## User Request

{input}

## Your Task

Analyze the request and respond with a JSON object:

```json
{{
  "route_type": "<workflow|skill|rag|code_analysis|direct>",
  "route_target": "<specific target if applicable, empty string otherwise>",
  "confidence": <0.0-1.0>,
  "reasoning": "<brief explanation of your decision>"
}}
```

Important:
- Choose the MOST specific route that applies
- Code-related requests should usually go to "code_analysis" unless they're asking for execution
- Questions about "how" or "why" something failed go to "workflow"
- Questions about "what" something is or documentation go to "rag"
- If code blocks are present, consider "code_analysis" first
- Confidence should reflect how certain you are (0.7+ for clear cases, lower for ambiguous)

Respond ONLY with the JSON object, no additional text."""

    # Suggested targets for each route type
    SUGGESTED_TARGETS = {
        "workflow": ["incident-diagnosis", "code-review-workflow", "deployment-check"],
        "skill": ["web-search", "code-exec", "file-ops", "api-call", "calculator"],
        "rag": ["product-docs", "runbooks", "incident-history", "code-standards"],
        "code_analysis": ["static-analysis", "security-scan", "linter", "refactor"],
        "direct": [],
    }

    def __init__(self, model_id: str | None = None) -> None:
        """Initialize the LLM strategy.

        Args:
            model_id: Optional specific model to use for classification.
        """
        self.model_id = model_id

    async def decide(self, input_text: str, agent_id: str, context: dict[str, Any]) -> RouteDecision:
        """Use LLM to make an intelligent routing decision.

        Args:
            input_text: User input to route.
            agent_id: Agent processing the request.
            context: Enriched context for decision making.

        Returns:
            RouteDecision with route type, target, and confidence.
        """
        try:
            # Format context for the prompt
            context_str = self._format_context(context)

            # Build the prompt
            prompt = self.ROUTING_PROMPT.format(
                context=context_str,
                input=input_text,
            )

            # Call LLM (placeholder - in production would call actual LLM)
            llm_response = await self._call_llm(prompt, original_input=input_text)

            # Parse the response
            decision = self._parse_llm_response(llm_response, input_text)

            logger.info(
                "LLM routing decision",
                extra={
                    "route_type": decision.route_type,
                    "confidence": decision.confidence,
                    "reasoning": decision.reasoning[:100],
                },
            )

            return decision

        except Exception as e:
            logger.error(f"LLM strategy error: {e}")
            # Return a fallback decision
            return self._fallback_decision(input_text, str(e))

    def _format_context(self, context: dict[str, Any]) -> str:
        """Format context information for the prompt."""
        parts = []

        # Available skills
        skills = context.get("available_skills", [])
        if skills:
            skill_names = [s.get("name", "") for s in skills[:5]]
            parts.append(f"Available Skills: {', '.join(skill_names)}")

        # Active workflows
        workflows = context.get("active_workflows", [])
        if workflows:
            wf_names = [w.get("name", "") for w in workflows[:5]]
            parts.append(f"Available Workflows: {', '.join(wf_names)}")

        # RAG collections
        collections = context.get("rag_collections", [])
        if collections:
            coll_names = [c.get("name", "") for c in collections[:5]]
            parts.append(f"Available Knowledge Bases: {', '.join(coll_names)}")

        # Code context
        code_context = context.get("code_context")
        if code_context and code_context.get("has_code_blocks"):
            lang = code_context.get("language", "unknown")
            parts.append(f"Code detected: {lang}")
            issues = code_context.get("potential_issues", [])
            if issues:
                parts.append(f"Potential issues detected: {', '.join(issues[:3])}")

        return "\n".join(parts) if parts else "No additional context available."

    async def _call_llm(self, prompt: str, original_input: str = "") -> str:
        """Call the LLM with the routing prompt.

        Integrates with the actual LLM provider for intelligent routing.
        Falls back to simulated response if LLM call fails.
        """
        try:
            from resolveagent.llm.higress_provider import create_llm_provider
            from resolveagent.llm.provider import ChatMessage

            llm = create_llm_provider(model=self.model_id)

            response = await llm.chat(
                messages=[ChatMessage(role="user", content=prompt)],
                model=self.model_id,
                temperature=0.3,
                max_tokens=500,
                thinking={"type": "disabled"},
            )

            logger.debug("LLM routing response received", extra={"model": response.model})
            return response.content

        except Exception as e:
            logger.warning(f"LLM call failed, using fallback: {e}")
            return self._simulate_llm_response(original_input or prompt)

    def _simulate_llm_response(self, prompt: str) -> str:
        """Simulate LLM response based on keywords in the prompt.

        This is a placeholder for actual LLM integration.
        """
        prompt_lower = prompt.lower()

        # Check for code blocks
        if "```" in prompt or "code detected" in prompt_lower:
            if any(kw in prompt_lower for kw in ["review", "analyze", "check", "bug", "issue"]):
                return json.dumps(
                    {
                        "route_type": "code_analysis",
                        "route_target": "static-analysis",
                        "confidence": 0.85,
                        "reasoning": "Request contains code and asks for analysis/review",
                    }
                )
            if any(kw in prompt_lower for kw in ["run", "execute", "eval"]):
                return json.dumps(
                    {
                        "route_type": "skill",
                        "route_target": "code-exec",
                        "confidence": 0.85,
                        "reasoning": "Request asks to execute code",
                    }
                )

        # Check for workflow indicators
        if any(
            kw in prompt_lower
            for kw in [
                "diagnose",
                "troubleshoot",
                "root cause",
                "why",
                "failed",
                "broken",
                "incident",
                "outage",
                "investigate",
            ]
        ):
            return json.dumps(
                {
                    "route_type": "workflow",
                    "route_target": "incident-diagnosis",
                    "confidence": 0.8,
                    "reasoning": "Request requires multi-step diagnostic workflow",
                }
            )

        # Check for skill indicators
        if any(
            kw in prompt_lower
            for kw in [
                "search",
                "find",
                "web",
                "execute",
                "run",
                "file",
                "calculate",
            ]
        ):
            target = "web-search" if "search" in prompt_lower else "general"
            return json.dumps(
                {
                    "route_type": "skill",
                    "route_target": target,
                    "confidence": 0.75,
                    "reasoning": "Request requires specific tool execution",
                }
            )

        # Check for RAG indicators
        if any(
            kw in prompt_lower
            for kw in [
                "what is",
                "how to",
                "explain",
                "document",
                "guide",
                "manual",
            ]
        ):
            return json.dumps(
                {
                    "route_type": "rag",
                    "route_target": "product-docs",
                    "confidence": 0.7,
                    "reasoning": "Request seeks knowledge/documentation",
                }
            )

        # Default to direct
        return json.dumps(
            {
                "route_type": "direct",
                "route_target": "",
                "confidence": 0.6,
                "reasoning": "General request without specific routing indicators",
            }
        )

    def _parse_llm_response(self, response: str, original_input: str) -> RouteDecision:
        """Parse the LLM response into a RouteDecision."""
        try:
            # Extract JSON from response (handle markdown code blocks)
            json_match = re.search(r"\{[^{}]*\}", response, re.DOTALL)
            if json_match:
                response = json_match.group(0)

            data = json.loads(response)

            route_type = data.get("route_type", "direct")
            route_target = data.get("route_target", "")
            confidence = float(data.get("confidence", 0.7))
            reasoning = data.get("reasoning", "LLM classification")

            # Validate route type
            valid_types = ["workflow", "skill", "rag", "code_analysis", "direct", "fta"]
            if route_type not in valid_types:
                route_type = "direct"
                confidence = 0.5

            # Map 'fta' to 'workflow' for consistency
            if route_type == "fta":
                route_type = "workflow"

            return RouteDecision(
                route_type=route_type,
                route_target=route_target,
                confidence=min(max(confidence, 0.0), 1.0),
                reasoning=f"LLM: {reasoning}",
                parameters={"llm_raw_response": response[:200]},
            )

        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.warning(f"Failed to parse LLM response: {e}")
            return self._fallback_decision(original_input, f"Parse error: {e}")

    def _fallback_decision(self, input_text: str, error_reason: str) -> RouteDecision:
        """Generate a fallback decision when LLM fails."""
        # Simple heuristic fallback
        input_text.lower()

        if "```" in input_text:
            return RouteDecision(
                route_type="code_analysis",
                route_target="static-analysis",
                confidence=0.6,
                reasoning=f"Fallback: code block detected ({error_reason})",
            )

        if "?" in input_text:
            return RouteDecision(
                route_type="rag",
                route_target="product-docs",
                confidence=0.5,
                reasoning=f"Fallback: question detected ({error_reason})",
            )

        return RouteDecision(
            route_type="direct",
            route_target="",
            confidence=0.5,
            reasoning=f"Fallback: default routing ({error_reason})",
        )
