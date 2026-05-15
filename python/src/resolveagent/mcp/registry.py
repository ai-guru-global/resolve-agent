"""MCP server registry managing connections and tool discovery.

Provides a centralized registry for MCP server configurations and
active connections with connection pooling.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from resolveagent.mcp.client import HTTPMCPClient, MCPClient, StdioMCPClient
from resolveagent.mcp.config import MCPConfig, MCPServerConfig

if TYPE_CHECKING:
    from resolveagent.mcp.types import MCPTool

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# MCP Registry
# ---------------------------------------------------------------------------


class MCPRegistry:
    """Registry for MCP server configurations and active connections."""

    def __init__(self, config: MCPConfig | None = None) -> None:
        self.config = config or MCPConfig()
        self._clients: dict[str, MCPClient] = {}
        self._tools: dict[str, MCPTool] = {}  # tool_name -> MCPTool

    async def initialize(self) -> None:
        """Initialize all enabled MCP servers and discover tools."""
        if not self.config.enabled:
            logger.info("MCP is disabled")
            return

        for server_config in self.config.list_enabled_servers():
            try:
                client = self._create_client(server_config)
                await client.connect()
                self._clients[server_config.name] = client

                # Discover tools
                tools = await client.list_tools()
                for tool in tools:
                    self._tools[tool.name] = tool
                    logger.info(
                        "Discovered MCP tool: %s (from %s)",
                        tool.name,
                        server_config.name,
                    )

            except Exception as e:
                logger.error(
                    "Failed to initialize MCP server '%s': %s",
                    server_config.name,
                    e,
                )

    async def shutdown(self) -> None:
        """Close all MCP connections."""
        for name, client in self._clients.items():
            try:
                await client.close()
                logger.info("Closed MCP connection: %s", name)
            except Exception as e:
                logger.warning("Error closing MCP connection %s: %s", name, e)
        self._clients.clear()
        self._tools.clear()

    def list_tools(self) -> list[MCPTool]:
        """List all discovered MCP tools."""
        return list(self._tools.values())

    def get_tool(self, name: str) -> MCPTool | None:
        """Get a tool by name."""
        return self._tools.get(name)

    def resolve_tool_server(self, tool_name: str) -> str | None:
        """Get the server name that provides a given tool.

        Supports 'server.tool' qualified names.
        """
        # Handle qualified names like "filesystem.read_file"
        if "." in tool_name:
            server_name, actual_tool = tool_name.split(".", 1)
            if server_name in self._clients:
                return server_name
            # Fall through to unqualified lookup
            tool_name = actual_tool

        tool = self._tools.get(tool_name)
        if tool is not None:
            return tool.server_name
        return None

    async def execute_tool(
        self,
        tool_name: str,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Execute a tool on the appropriate MCP server.

        Args:
            tool_name: Tool name (optionally qualified as 'server.tool').
            params: Tool parameters.

        Returns:
            Tool execution result.
        """
        # Determine actual tool name and server
        actual_tool = tool_name
        server_name: str | None = None

        if "." in tool_name:
            parts = tool_name.split(".", 1)
            server_name = parts[0]
            actual_tool = parts[1]

        if server_name is None:
            server_name = self.resolve_tool_server(tool_name)

        if server_name is None or server_name not in self._clients:
            return {
                "success": False,
                "error": f"MCP tool '{tool_name}' not found or server not connected",
            }

        client = self._clients[server_name]
        try:
            result = await client.call_tool(actual_tool, params)
            return {"success": True, "data": result}
        except Exception as e:
            logger.error("MCP tool execution failed: %s", e)
            return {"success": False, "error": str(e)}

    def _create_client(self, config: MCPServerConfig) -> MCPClient:
        """Create appropriate client based on transport type."""
        transport = config.transport.lower()
        if transport == "stdio":
            return StdioMCPClient(config)
        elif transport in ("http", "sse"):
            return HTTPMCPClient(config)
        else:
            raise ValueError(f"Unsupported MCP transport: {config.transport}")
