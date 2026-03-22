"""gRPC server for agent execution."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class AgentExecutionServer:
    """gRPC server that handles agent execution requests.

    This server receives ExecuteAgent requests from the Go platform services
    and delegates to the execution engine.
    """

    def __init__(self, host: str = "0.0.0.0", port: int = 9091) -> None:
        self.host = host
        self.port = port
        self._server: Any = None

    async def start(self) -> None:
        """Start the gRPC server."""
        logger.info("Starting agent execution server on %s:%d", self.host, self.port)
        # TODO: Initialize gRPC server with generated service stubs
        # server = grpc.aio.server()
        # add_AgentExecutionServiceServicer_to_server(self, server)
        # server.add_insecure_port(f"{self.host}:{self.port}")
        # await server.start()

    async def stop(self) -> None:
        """Stop the gRPC server gracefully."""
        if self._server:
            logger.info("Stopping agent execution server...")
            # await self._server.stop(grace=5)

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
        from resolvenet.runtime.engine import ExecutionEngine

        engine = ExecutionEngine()
        async for response in engine.execute(agent_id, input_text, conversation_id, context):
            yield response
