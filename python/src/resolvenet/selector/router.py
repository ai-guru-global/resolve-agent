"""Route decision engine."""

from __future__ import annotations

from typing import Any

from resolvenet.selector.selector import RouteDecision


class RouteDecider:
    """Makes the final routing decision.

    Given classified intent and enriched context, decides whether
    to route to FTA, Skills, RAG, or handle directly.
    """

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
        # TODO: Implement sophisticated routing logic
        # For now, default to direct LLM response
        return RouteDecision(
            route_type="direct",
            confidence=confidence,
            reasoning=f"Default routing for intent: {intent_type}",
        )
