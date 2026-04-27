"""Hook-based selector adapter.

``HookSelectorAdapter`` wraps the real ``IntelligentSelector`` with
pre/post hook execution, allowing external code to intercept and modify
routing decisions through the existing hooks infrastructure.
"""

from __future__ import annotations

import contextlib
import logging
from typing import Any

from resolveagent.hooks.memory_client import InMemoryHookClient
from resolveagent.hooks.models import HookContext
from resolveagent.hooks.runner import HookRunner
from resolveagent.hooks.selector_handlers import (
    confidence_override_handler,
    decision_audit_handler,
    intent_analysis_handler,
)
from resolveagent.selector.selector import IntelligentSelector, RouteDecision

logger = logging.getLogger(__name__)


class HookSelectorAdapter:
    """Selector that routes decisions through the hooks infrastructure.

    Pre-hooks can inspect / modify input or short-circuit with a decision.
    Post-hooks can inspect / modify the final ``RouteDecision``.

    If *hook_client* is ``None`` an :class:`InMemoryHookClient` with
    sensible defaults is created automatically.
    """

    def __init__(
        self,
        hook_client: Any | None = None,
        strategy: str = "hybrid",
    ) -> None:
        if hook_client is None:
            hook_client = InMemoryHookClient()
        self._client = hook_client
        self._runner = HookRunner(hook_client)
        self._selector = IntelligentSelector(strategy=strategy)
        self._strategy = strategy

        # Register built-in handlers.
        self._runner.register_handler("intent_analysis", intent_analysis_handler)
        self._runner.register_handler("decision_audit", decision_audit_handler)
        self._runner.register_handler("confidence_override", confidence_override_handler)

        self._default_hooks_installed = False

    async def _ensure_default_hooks(self) -> None:
        """Lazily install sensible default hooks if none exist yet."""
        if self._default_hooks_installed:
            return
        existing = await self._client.list()
        if not existing:
            await self._client.create(
                {
                    "name": "intent-pre-analysis",
                    "hook_type": "pre",
                    "trigger_point": "selector.route",
                    "handler_type": "intent_analysis",
                    "execution_order": 0,
                    "enabled": True,
                }
            )
            await self._client.create(
                {
                    "name": "decision-audit",
                    "hook_type": "post",
                    "trigger_point": "selector.route",
                    "handler_type": "decision_audit",
                    "execution_order": 0,
                    "enabled": True,
                }
            )
        self._default_hooks_installed = True

    async def route(
        self,
        input_text: str,
        agent_id: str = "",
        context: dict[str, Any] | None = None,
        enrich_context: bool = True,
    ) -> RouteDecision:
        """Route via pre-hook -> selector -> post-hook pipeline."""
        await self._ensure_default_hooks()

        # -- 1. Pre-hooks --
        pre_ctx = HookContext(
            trigger_point="selector.route",
            hook_type="pre",
            target_id=agent_id,
            input_data={
                "input_text": input_text,
                "context": context or {},
                "enrich_context": enrich_context,
            },
        )
        pre_results = await self._runner.run(pre_ctx)

        # Check for short-circuit: a pre-hook may supply a full decision.
        decision: RouteDecision | None = None
        for r in pre_results:
            rd = r.modified_data.get("route_decision")
            if rd and r.skip_remaining:
                decision = RouteDecision(**rd)
                break

        # Possibly the pre-hooks modified the input.
        routed_input = pre_ctx.input_data.get("input_text", input_text)
        routed_context = pre_ctx.input_data.get("context", context)

        # -- 2. Core routing (skipped if short-circuited) --
        if decision is None:
            decision = await self._selector.route(
                routed_input,
                agent_id=agent_id,
                context=routed_context,
                enrich_context=enrich_context,
            )

        # -- 3. Post-hooks --
        post_ctx = HookContext(
            trigger_point="selector.route",
            hook_type="post",
            target_id=agent_id,
            output_data={"route_decision": decision.model_dump()},
        )
        await self._runner.run(post_ctx)

        # Apply any modifications from post-hooks.
        modified_rd = post_ctx.output_data.get("route_decision")
        if modified_rd and isinstance(modified_rd, dict):
            with contextlib.suppress(Exception):
                decision = RouteDecision(**modified_rd)

        return decision

    def get_strategy_info(self) -> dict[str, Any]:
        return {
            "strategy": "hooks",
            "underlying_strategy": self._strategy,
            "description": ("Hook-based selector adapter (pre/post hooks around IntelligentSelector)"),
        }
