"""FTA execution engine."""

from __future__ import annotations

import logging
import time
import uuid
from typing import Any, AsyncIterator

from resolveagent.fta.evaluator import NodeEvaluator
from resolveagent.fta.tree import FaultTree

logger = logging.getLogger(__name__)


class FTAEngine:
    """Executes Fault Tree Analysis workflows.

    Traverses the fault tree from leaves upward, evaluating basic events
    and propagating through gates to determine the top event outcome.

    When an fta_client is provided, analysis results are persisted
    to the Go platform store.
    """

    def __init__(self, fta_client: Any | None = None) -> None:
        self.evaluator = NodeEvaluator()
        self._fta_client = fta_client

    async def execute(
        self,
        tree: FaultTree,
        context: dict[str, Any] | None = None,
        document_id: str | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """Execute a fault tree analysis.

        Args:
            tree: The fault tree to evaluate.
            context: Execution context data.
            document_id: Optional FTA document ID for result persistence.

        Yields:
            WorkflowEvent dicts with evaluation progress.
        """
        execution_id = str(uuid.uuid4())
        start_time = time.monotonic()

        logger.info("Starting FTA execution", extra={"tree_id": tree.id})

        yield {
            "type": "workflow.started",
            "message": f"Starting FTA workflow: {tree.name}",
        }

        gate_results: dict[str, Any] = {}
        event_results: dict[str, Any] = {}

        # Evaluate leaf nodes
        for event in tree.get_basic_events():
            yield {
                "type": "node.evaluating",
                "node_id": event.id,
                "message": f"Evaluating: {event.name}",
            }

            result = await self.evaluator.evaluate(event, context or {})
            event_results[event.id] = result

            yield {
                "type": "node.completed",
                "node_id": event.id,
                "message": f"Result: {result}",
                "data": {"result": result},
            }

        # Evaluate gates bottom-up
        top_event_result = False
        for gate in tree.get_gates_bottom_up():
            yield {
                "type": "gate.evaluating",
                "node_id": gate.id,
                "message": f"Evaluating gate: {gate.name} ({gate.gate_type})",
            }

            result = gate.evaluate(tree.get_input_values(gate.id))
            gate_results[gate.id] = result
            top_event_result = result  # Last gate is the top event

            yield {
                "type": "gate.completed",
                "node_id": gate.id,
                "message": f"Gate result: {result}",
                "data": {"result": result},
            }

        duration_ms = int((time.monotonic() - start_time) * 1000)

        # Persist analysis result if client available and document_id provided
        if self._fta_client and document_id:
            try:
                await self._fta_client.create_result(
                    document_id,
                    {
                        "execution_id": execution_id,
                        "top_event_result": top_event_result,
                        "basic_event_probabilities": event_results,
                        "gate_results": gate_results,
                        "status": "completed",
                        "duration_ms": duration_ms,
                        "context": context or {},
                    },
                )
            except Exception as e:
                logger.warning("Failed to persist FTA result", extra={"error": str(e)})

        yield {
            "type": "workflow.completed",
            "message": "FTA workflow completed",
            "data": {
                "execution_id": execution_id,
                "top_event_result": top_event_result,
                "duration_ms": duration_ms,
            },
        }
