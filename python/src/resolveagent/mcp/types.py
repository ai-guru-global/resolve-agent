"""MCP protocol type definitions.

Defines data classes for MCP Tools, Resources, and communication primitives.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# MCP Tool Types
# ---------------------------------------------------------------------------


class MCPToolParameter(BaseModel):
    """A parameter for an MCP tool."""

    name: str
    type: str = "string"
    description: str = ""
    required: bool = False
    default: Any = None


class MCPTool(BaseModel):
    """An MCP tool definition."""

    name: str
    description: str = ""
    parameters: list[MCPToolParameter] = Field(default_factory=list)
    server_name: str = ""  # Which MCP server provides this tool


class MCPToolResult(BaseModel):
    """Result of calling an MCP tool."""

    success: bool
    data: Any = None
    error: str | None = None
    tool_name: str = ""
    server_name: str = ""
    duration_ms: float = 0.0


# ---------------------------------------------------------------------------
# MCP Resource Types
# ---------------------------------------------------------------------------


class MCPResource(BaseModel):
    """An MCP resource definition."""

    uri: str
    name: str = ""
    description: str = ""
    mime_type: str = "text/plain"


class MCPResourceContent(BaseModel):
    """Content of an MCP resource."""

    uri: str
    mime_type: str = "text/plain"
    text: str | None = None
    blob: bytes | None = None


# ---------------------------------------------------------------------------
# MCP Prompt Types
# ---------------------------------------------------------------------------


class MCPPromptArgument(BaseModel):
    """An argument for an MCP prompt."""

    name: str
    description: str = ""
    required: bool = False


class MCPPrompt(BaseModel):
    """An MCP prompt definition."""

    name: str
    description: str = ""
    arguments: list[MCPPromptArgument] = Field(default_factory=list)


class MCPPromptMessage(BaseModel):
    """A message within an MCP prompt."""

    role: str = "user"  # user | assistant
    content: str = ""


# ---------------------------------------------------------------------------
# JSON-RPC Primitives
# ---------------------------------------------------------------------------


class JSONRPCRequest(BaseModel):
    """A JSON-RPC 2.0 request."""

    jsonrpc: str = "2.0"
    method: str
    params: dict[str, Any] | None = None
    id: int | str | None = None


class JSONRPCResponse(BaseModel):
    """A JSON-RPC 2.0 response."""

    jsonrpc: str = "2.0"
    result: Any = None
    error: dict[str, Any] | None = None
    id: int | str | None = None


class JSONRPCError(BaseModel):
    """A JSON-RPC 2.0 error."""

    code: int
    message: str
    data: Any = None
