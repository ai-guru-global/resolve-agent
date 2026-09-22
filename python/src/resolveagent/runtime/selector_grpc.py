"""gRPC ``SelectorService`` shim backed by the shared ``RoutingService``.

Contract: ``api/proto/resolveagent/v1/selector.proto``. Mirrors the HTTP
``POST /v1/selector/route`` surface: routing always returns a valid
decision, degrading to the rule strategy when llm/hybrid fails.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# agent.proto RouteType enum values. "workflow" is IntelligentSelector's
# taxonomy name for FTA-style trees -> ROUTE_TYPE_FTA. "code_analysis" has no
# proto counterpart and falls back to ROUTE_TYPE_UNSPECIFIED.
_ROUTE_TYPE_ENUM: dict[str, int] = {
    "fta": 1,
    "workflow": 1,
    "skill": 2,
    "rag": 3,
    "multi": 4,
    "direct": 5,
}


def _route_type_enum(route_type: str) -> int:
    return _ROUTE_TYPE_ENUM.get(route_type, 0)


def _struct_to_dict(struct: Any) -> dict[str, Any]:
    """Convert a google.protobuf.Struct to a plain dict (best effort)."""
    try:
        return dict(struct)
    except Exception:
        return {}


class SelectorServicer:
    """Implements resolveagent.v1.SelectorService.

    Inherits from the generated base lazily at registration time via
    :func:`add_servicer` so importing this module does not require the
    generated stubs to be importable in tooling contexts.
    """

    def __init__(self, routing: Any = None) -> None:
        from resolveagent.runtime.routing import RoutingService

        self._routing = routing if routing is not None else RoutingService()

    async def Route(self, request: Any, context: Any) -> Any:  # noqa: N802
        import grpc

        from resolveagent.v1 import agent_pb2, selector_pb2

        text = request.input
        if not text:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "input is required")

        routed = await self._routing.route(
            text,
            request.agent_id,
            _struct_to_dict(request.context),
            strategy="hybrid",
        )
        d = routed.decision
        decision = agent_pb2.RouteDecision(  # type: ignore[attr-defined]
            route_type=_route_type_enum(d.get("route_type", "direct")),
            route_target=d.get("route_target", ""),
            confidence=float(d.get("confidence", 0.0)),
        )
        decision.parameters.update(d.get("parameters", {}))
        return selector_pb2.RouteResponse(  # type: ignore[attr-defined]
            decision=decision,
            reasoning=d.get("reasoning", ""),
        )

    async def ClassifyIntent(self, request: Any, context: Any) -> Any:  # noqa: N802
        import grpc

        from resolveagent.selector.intent import IntentAnalyzer
        from resolveagent.v1 import selector_pb2

        if not request.input:
            await context.abort(grpc.StatusCode.INVALID_ARGUMENT, "input is required")

        classification = await IntentAnalyzer().classify(request.input)
        resp = selector_pb2.ClassifyIntentResponse(  # type: ignore[attr-defined]
            intent_type=classification.intent_type,
            confidence=classification.confidence,
            entities=classification.entities,
        )
        resp.metadata.update(
            {
                "sub_intents": list(classification.sub_intents),
                "suggested_target": classification.suggested_target,
            }
        )
        return resp


def add_servicer(server: Any, routing: Any = None) -> None:
    """Register :class:`SelectorServicer` on a ``grpc.aio`` server.

    The generated ``add_*_to_server`` helper duck-types the servicer, so no
    subclassing of the generated base is required.
    """
    from resolveagent.v1 import selector_pb2_grpc

    selector_pb2_grpc.add_SelectorServiceServicer_to_server(SelectorServicer(routing), server)


class SelectorGrpcServer:
    """Standalone ``grpc.aio`` server exposing the SelectorService."""

    def __init__(self, host: str = "0.0.0.0", port: int = 9092, routing: Any = None) -> None:
        self.host = host
        self.port = port
        self._routing = routing
        self._server: Any = None

    def _build(self) -> tuple[Any, int]:
        import grpc

        server = grpc.aio.server()
        add_servicer(server, self._routing)
        bound = server.add_insecure_port(f"{self.host}:{self.port}")
        return server, bound

    async def start(self) -> None:
        """Bind, start, and block until termination."""
        self._server, bound = self._build()
        if bound == 0:
            raise RuntimeError(f"Failed to bind gRPC server on {self.host}:{self.port}")
        logger.info("Selector gRPC server starting on %s:%d", self.host, bound)
        await self._server.start()
        await self._server.wait_for_termination()

    async def stop(self, grace: float | None = None) -> None:
        if self._server is not None:
            await self._server.stop(grace)
            self._server = None
