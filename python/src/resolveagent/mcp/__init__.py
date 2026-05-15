"""MCP (Model Context Protocol) adapter for ResolveAgent.

Provides integration with MCP servers, allowing ResolveAgent to call
external tools through the standardized MCP protocol.
"""

from resolveagent.mcp.adapter import MCPAdapter
from resolveagent.mcp.config import MCPServerConfig, load_mcp_config
from resolveagent.mcp.types import MCPTool, MCPToolResult

__all__ = ["MCPAdapter", "MCPServerConfig", "load_mcp_config", "MCPTool", "MCPToolResult"]
