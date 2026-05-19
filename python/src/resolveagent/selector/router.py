"""Route decision engine."""

from __future__ import annotations

import logging
from typing import Any

from resolveagent.selector.selector import RouteDecision

logger = logging.getLogger(__name__)

# Confidence thresholds
HIGH_CONFIDENCE_THRESHOLD = 0.75
MEDIUM_CONFIDENCE_THRESHOLD = 0.5


class RouteDecider:
    """Makes the final routing decision.

    Given classified intent and enriched context, decides whether
    to route to FTA, Skills, RAG, or handle directly.
    """

    # Route type mapping from intent types
    INTENT_TO_ROUTE: dict[str, str] = {
        "workflow": "fta",
        "fta": "fta",
        "skill": "skill",
        "rag": "rag",
        "code_analysis": "code_analysis",
        "direct": "direct",
    }

    async def decide(
        self,
        intent_type: str,
        confidence: float,
        context: dict[str, Any],
    ) -> RouteDecision:
        """Make a routing decision.

        Args:
            intent_type: Classified intent type.
            confidence: Intent classification confidence.
            context: Enriched context.

        Returns:
            RouteDecision indicating the chosen path.
        """
        # Map intent type to route type
        route_type = self.INTENT_TO_ROUTE.get(intent_type, "direct")

        # Apply confidence-based adjustments
        adjusted_confidence = confidence

        # Consider context for routing adjustments
        route_target = self._determine_target(route_type, context)
        reasoning = self._build_reasoning(intent_type, route_type, confidence, context)

        # Low confidence with code context -> code_analysis
        if confidence < MEDIUM_CONFIDENCE_THRESHOLD:
            code_context = context.get("code_context")
            if code_context and (code_context.get("has_code_blocks") or code_context.get("potential_issues")):
                route_type = "code_analysis"
                route_target = "static-analysis"
                reasoning = f"Code context override: detected code blocks or issues (confidence: {confidence:.2f})"

        # High confidence workflow intent -> FTA
        if intent_type in ("workflow", "fta") and confidence >= HIGH_CONFIDENCE_THRESHOLD:
            route_type = "fta"
            workflows = context.get("active_workflows", [])
            route_target = (
                workflows[0].get("id", "incident-diagnosis") if workflows else "incident-diagnosis"
            )

        return RouteDecision(
            route_type=route_type,
            confidence=adjusted_confidence,
            reasoning=reasoning,
            route_target=route_target,
            parameters={
                "intent_type": intent_type,
                "original_confidence": confidence,
                "context_skills_count": len(context.get("available_skills", [])),
                "context_workflows_count": len(context.get("active_workflows", [])),
            },
        )

    def _determine_target(self, route_type: str, context: dict[str, Any]) -> str:
        """Determine the specific target within a route type."""
        if route_type == "skill":
            skills = context.get("available_skills", [])
            if skills:
                return skills[0].get("name", "web-search")
            return "web-search"

        if route_type == "fta":
            workflows = context.get("active_workflows", [])
            for wf in workflows:
                if wf.get("type") == "fta" or wf.get("id") == "incident-diagnosis":
                    return wf.get("id", "incident-diagnosis")
            return "incident-diagnosis"

        if route_type == "rag":
            collections = context.get("rag_collections", [])
            if collections:
                return collections[0].get("id", "product-docs")
            return "product-docs"

        if route_type == "code_analysis":
            code_context = context.get("code_context")
            if code_context and code_context.get("potential_issues"):
                issues = code_context.get("potential_issues", [])
                if any("security" in i for i in issues):
                    return "security-scan"
            return "static-analysis"

        return ""

    def _build_reasoning(
        self,
        intent_type: str,
        route_type: str,
        confidence: float,
        context: dict[str, Any],
    ) -> str:
        """Build human-readable reasoning for the routing decision."""
        parts = [f"Intent '{intent_type}' -> route '{route_type}'"]

        if confidence >= HIGH_CONFIDENCE_THRESHOLD:
            parts.append(f"high confidence ({confidence:.2f})")
        elif confidence >= MEDIUM_CONFIDENCE_THRESHOLD:
            parts.append(f"medium confidence ({confidence:.2f})")
        else:
            parts.append(f"low confidence ({confidence:.2f})")

        code_context = context.get("code_context")
        if code_context and code_context.get("has_code_blocks"):
            parts.append(f"code detected ({code_context.get('language', 'unknown')})")

        enrichment_confidence = context.get("enrichment_confidence", 0)
        parts.append(f"enrichment confidence: {enrichment_confidence:.2f}")

        return ", ".join(parts)
