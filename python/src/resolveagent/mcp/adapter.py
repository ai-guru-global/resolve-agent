"""MCP Adapter providing a unified interface for skill execution.

Acts as a bridge between ResolveAgent's skill system and MCP servers,
allowing skills to be backed by MCP tools.
"""

from __future__ import annotations

import logging
from typing import Any

from resolveagent.mcp.config import MCPConfig, load_mcp_config
from resolveagent.mcp.registry import MCPRegistry
from resolveagent.mcp.types import MCPTool, MCPToolResult

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# MCP Adapter
# ---------------------------------------------------------------------------


class MCPAdapter:
    """Unified adapter for executing skills via MCP servers.

    Usage:
        adapter = MCPAdapter()
        await adapter.initialize()

        # List available tools
        tools = adapter.list_tools()

        # Execute a tool
        result = await adapter.execute("filesystem.read_file", {"path": "/tmp/test.txt"})

        await adapter.shutdown()
    """

    def __init__(self, config: MCPConfig | None = None) -> None:
        self.config = config or load_mcp_config()
        self._registry = MCPRegistry(self.config)
        self._initialized = False

    @property
    def enabled(self) -> bool:
        """Whether MCP is enabled."""
        return self.config.enabled

    @property
    def initialized(self) -> bool:
        """Whether the adapter has been initialized."""
        return self._initialized

    async def initialize(self) -> None:
        """Initialize the MCP adapter and connect to all configured servers."""
        if self._initialized:
            return

        if not self.config.enabled:
            logger.info("MCP adapter is disabled")
            return

        await self._registry.initialize()
        self._initialized = True

        tool_count = len(self._registry.list_tools())
        logger.info("MCP adapter initialized with %d tools", tool_count)

    async def shutdown(self) -> None:
        """Shutdown the MCP adapter and close all connections."""
        await self._registry.shutdown()
        self._initialized = False
        logger.info("MCP adapter shutdown complete")

    def list_tools(self) -> list[MCPTool]:
        """List all available MCP tools."""
        return self._registry.list_tools()

    async def execute(
        self,
        tool_name: str,
        params: dict[str, Any] | None = None,
    ) -> MCPToolResult:
        """Execute an MCP tool.

        Args:
            tool_name: Name of the tool (optionally qualified as 'server.tool').
            params: Tool parameters.

        Returns:
            MCPToolResult with execution outcome.
        """
        if not self._initialized:
            return MCPToolResult(
                success=False,
                error="MCP adapter not initialized",
                tool_name=tool_name,
            )

        import time

        start = time.time()
        try:
            result = await self._registry.execute_tool(tool_name, params)
            duration = (time.time() - start) * 1000

            if result.get("success"):
                return MCPToolResult(
                    success=True,
                    data=result.get("data"),
                    tool_name=tool_name,
                    duration_ms=duration,
                )
            else:
                return MCPToolResult(
                    success=False,
                    error=result.get("error", "Unknown error"),
                    tool_name=tool_name,
                    duration_ms=duration,
                )

        except Exception as e:
            duration = (time.time() - start) * 1000
            logger.error("MCP execution error: %s", e)
            return MCPToolResult(
                success=False,
                error=str(e),
                tool_name=tool_name,
                duration_ms=duration,
            )

    def is_mcp_tool(self, name: str) -> bool:
        """Check if a tool name refers to an MCP tool."""
        return self._registry.get_tool(name) is not None
