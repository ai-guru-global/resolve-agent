"""Built-in hook handlers for the selector routing pipeline.

These handlers can be registered with ``HookRunner`` and are used by
``HookSelectorAdapter`` to intercept / modify routing decisions.
"""

from __future__ import annotations

import logging
import time
from typing import Any

from resolveagent.hooks.models import HookContext, HookResult

logger = logging.getLogger(__name__)


async def intent_analysis_handler(ctx: HookContext) -> HookResult:
    """Pre-hook: run IntentAnalyzer and store classification in modified_data."""
    from resolveagent.selector.intent import IntentAnalyzer

    input_text = ctx.input_data.get("input_text", "")
    if not input_text:
        return HookResult(success=True)

    analyzer = IntentAnalyzer()
    classification = await analyzer.classify(input_text)

    return HookResult(
        success=True,
        modified_data={
            "intent_classification": {
                "intent_type": classification.intent_type,
                "confidence": classification.confidence,
                "entities": classification.entities,
                "sub_intents": classification.sub_intents,
                "suggested_target": classification.suggested_target,
            },
        },
    )


async def decision_audit_handler(ctx: HookContext) -> HookResult:
    """Post-hook: log the routing decision for observability."""
    decision_data = ctx.output_data.get("route_decision", {})
    logger.info(
        "Selector decision audit",
        extra={
            "route_type": decision_data.get("route_type"),
            "route_target": decision_data.get("route_target"),
            "confidence": decision_data.get("confidence"),
            "agent_id": ctx.target_id,
            "timestamp": time.time(),
        },
    )
    return HookResult(
        success=True,
        modified_data={
            "audit": {
                "audited": True,
                "timestamp": time.time(),
            },
        },
    )


async def confidence_override_handler(ctx: HookContext) -> HookResult:
    """Post-hook: adjust confidence based on thresholds in metadata."""
    overrides: dict[str, float] = ctx.metadata.get("confidence_overrides", {})
    if not overrides:
        return HookResult(success=True)

    decision_data: dict[str, Any] = ctx.output_data.get("route_decision", {})
    route_type = decision_data.get("route_type", "")
    current_conf = decision_data.get("confidence", 0.0)

    override_val = overrides.get(route_type)
    if override_val is not None:
        new_conf = min(max(current_conf + override_val, 0.0), 1.0)
        decision_data["confidence"] = new_conf
        return HookResult(
            success=True,
            modified_data={"route_decision": decision_data},
        )

    return HookResult(success=True)
