"""FTA execution engine."""

from __future__ import annotations

import logging
from typing import Any, AsyncIterator

from resolveagent.fta.evaluator import NodeEvaluator
from resolveagent.fta.tree import FaultTree

logger = logging.getLogger(__name__)


class FTAEngine:
    """Executes Fault Tree Analysis workflows.

    Traverses the fault tree from leaves upward, evaluating basic events
    and propagating through gates to determine the top event outcome.
    """

    def __init__(self) -> None:
        self.evaluator = NodeEvaluator()

    async def execute(
        self,
        tree: FaultTree,
        context: dict[str, Any] | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """Execute a fault tree analysis.

        Args:
            tree: The fault tree to evaluate.
            context: Execution context data.

        Yields:
            WorkflowEvent dicts with evaluation progress.
        """
        logger.info("Starting FTA execution", extra={"tree_id": tree.id})

        yield {
            "type": "workflow.started",
            "message": f"Starting FTA workflow: {tree.name}",
        }

        # Evaluate leaf nodes
        for event in tree.get_basic_events():
            yield {
                "type": "node.evaluating",
                "node_id": event.id,
                "message": f"Evaluating: {event.name}",
            }

            result = await self.evaluator.evaluate(event, context or {})

            yield {
                "type": "node.completed",
                "node_id": event.id,
                "message": f"Result: {result}",
                "data": {"result": result},
            }

        # Evaluate gates bottom-up
        for gate in tree.get_gates_bottom_up():
            yield {
                "type": "gate.evaluating",
                "node_id": gate.id,
                "message": f"Evaluating gate: {gate.name} ({gate.gate_type})",
            }

            result = gate.evaluate(tree.get_input_values(gate.id))

            yield {
                "type": "gate.completed",
                "node_id": gate.id,
                "message": f"Gate result: {result}",
                "data": {"result": result},
            }

        yield {
            "type": "workflow.completed",
            "message": "FTA workflow completed",
        }
