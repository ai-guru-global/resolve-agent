"""gRPC server for agent execution."""

from __future__ import annotations

import logging
from typing import Any

import grpc

from resolveagent.runtime.engine import ExecutionEngine

logger = logging.getLogger(__name__)


class AgentExecutionServer:
    """gRPC server that handles agent execution requests.

    This server receives ExecuteAgent requests from the Go platform services
    and delegates to the execution engine.

    The server is initialized with the AgentExecutionServicer generated from
    proto/resolveagent/v1/agent.proto. If generated stubs are not available,
    falls back to a basic HTTP server implementation.
    """

    def __init__(self, host: str = "0.0.0.0", port: int = 9091) -> None:
        self.host = host
        self.port = port
        self._server: grpc.aio.Server | None = None
        self._engine = ExecutionEngine()

    async def start(self) -> None:
        """Start the gRPC server."""
        logger.info("Starting agent execution server on %s:%d", self.host, self.port)

        # Try to use generated gRPC stubs if available
        try:
            from resolveagent.api import agent_pb2_grpc

            self._server = grpc.aio.server()

            # Create and register the servicer
            servicer = AgentExecutionServicer(self._engine)
            agent_pb2_grpc.add_AgentExecutionServiceServicer_to_server(
                servicer, self._server
            )

            listen_addr = f"{self.host}:{self.port}"
            self._server.add_insecure_port(listen_addr)
            await self._server.start()
            logger.info("gRPC server started with generated stubs on %s", listen_addr)

        except ImportError:
            # Generated stubs not available - use basic implementation
            logger.warning(
                "Generated gRPC stubs not found, using HTTP fallback on port %d",
                self.port,
            )
            await self._start_http_fallback()

    async def _start_http_fallback(self) -> None:
        """Start a basic HTTP server as fallback when gRPC stubs unavailable."""
        from aiohttp import web

        async def handle_execute(request: web.Request) -> web.Response:
            """Handle execute agent requests via HTTP."""
            try:
                data = await request.json()
                agent_id = data.get("agent_id", "default")
                input_text = data.get("input", "")
                conversation_id = data.get("conversation_id")
                context = data.get("context")

                response_chunks = []
                async for chunk in self._engine.execute(
                    agent_id=agent_id,
                    input_text=input_text,
                    conversation_id=conversation_id,
                    context=context,
                    stream=True,
                ):
                    if chunk.get("type") in ("content", "content_chunk"):
                        response_chunks.append(chunk.get("content", ""))

                return web.json_response({
                    "content": "".join(response_chunks),
                    "agent_id": agent_id,
                })

            except Exception as e:
                logger.error("HTTP fallback execution failed: %s", e)
                return web.json_response({"error": str(e)}, status=500)

        async def handle_health(_: web.Request) -> web.Response:
            return web.json_response({"status": "ok"})

        app = web.Application()
        app.router.add_post("/api/v1/execute", handle_execute)
        app.router.add_get("/health", handle_health)

        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, self.host, self.port)
        await site.start()
        logger.info("HTTP fallback server started on %s:%d", self.host, self.port)

    async def stop(self) -> None:
        """Stop the gRPC server gracefully."""
        if self._server:
            logger.info("Stopping agent execution server...")
            await self._server.stop(grace=5)
        else:
            logger.info("Agent execution server stopped")

    async def execute_agent(
        self,
        agent_id: str,
        input_text: str,
        conversation_id: str | None = None,
        context: dict[str, Any] | None = None,
    ) -> Any:
        """Execute an agent and stream results.

        Args:
            agent_id: The ID of the agent to execute.
            input_text: User input text.
            conversation_id: Optional conversation ID for context continuity.
            context: Optional additional context.

        Yields:
            ExecuteAgentResponse chunks.
        """
        async for response in self._engine.execute(
            agent_id, input_text, conversation_id, context
        ):
            yield response


class AgentExecutionServicer:
    """gRPC servicer for agent execution.

    This class implements the AgentExecutionService interface from the
    generated protobuf stubs. It delegates to the ExecutionEngine.
    """

    def __init__(self, engine: ExecutionEngine) -> None:
        self._engine = engine

    async def execute_agent(  # noqa: N802
        self,
        request: Any,
        context: grpc.aio.ServicerContext,
    ) -> Any:
        """Handle ExecuteAgent streaming RPC.

        Args:
            request: ExecuteAgentRequest from proto.
            context: gRPC context.

        Yields:
            ExecuteAgentResponse messages.
        """
        from resolveagent.api.agent_pb2 import ExecuteAgentResponse, ExecutionEvent

        agent_id = request.agent_id
        input_text = request.input
        conversation_id = request.conversation_id or None
        context_data = dict(request.context) if request.HasField("context") else None

        try:
            async for chunk in self._engine.execute(
                agent_id=agent_id,
                input_text=input_text,
                conversation_id=conversation_id,
                context=context_data,
                stream=True,
            ):
                chunk_type = chunk.get("type", "")
                if chunk_type in ("content", "content_chunk"):
                    yield ExecuteAgentResponse(content=chunk.get("content", ""))
                elif chunk_type == "event":
                    event_data = chunk.get("event", {})
                    yield ExecuteAgentResponse(
                        event=ExecutionEvent(
                            type=event_data.get("type", ""),
                            message=event_data.get("message", ""),
                            data=event_data.get("data", {}),
                        )
                    )
                elif chunk.get("type") == "error":
                    from resolveagent.api.agent_pb2 import ExecutionError

                    yield ExecuteAgentResponse(
                        error=ExecutionError(
                            code=chunk.get("code", "UNKNOWN"),
                            message=chunk.get("message", str(chunk.get("error", ""))),
                        )
                    )

        except Exception as e:
            logger.exception("ExecuteAgent failed")
            from resolveagent.api.agent_pb2 import ExecutionError

            yield ExecuteAgentResponse(
                error=ExecutionError(
                    code="EXECUTION_ERROR",
                    message=str(e),
                )
            )
            context.set_code(grpc.StatusCode.INTERNAL)
            context.abort(grpc.StatusCode.INTERNAL, str(e))
