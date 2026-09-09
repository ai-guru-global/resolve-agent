"""MCP client implementations for stdio and HTTP/SSE transports.

Supports JSON-RPC 2.0 communication with MCP servers.
"""

from __future__ import annotations

import asyncio
import json
import logging
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from typing_extensions import Self

    from resolveagent.mcp.config import MCPServerConfig

from resolveagent import __version__
from resolveagent.mcp.types import JSONRPCRequest, JSONRPCResponse, MCPTool

logger = logging.getLogger(__name__)

# MCP protocol revision this client speaks.
MCP_PROTOCOL_VERSION = "2024-11-05"


# ---------------------------------------------------------------------------
# Base MCP Client
# ---------------------------------------------------------------------------


class MCPClient(ABC):
    """Abstract base class for MCP clients."""

    def __init__(self, config: MCPServerConfig) -> None:
        self.config = config
        self._connected = False
        self._request_id = 0

    @property
    def connected(self) -> bool:
        """Whether the client is connected."""
        return self._connected

    @abstractmethod
    async def connect(self) -> Self:
        """Connect to the MCP server."""
        ...

    @abstractmethod
    async def close(self) -> None:
        """Close the connection."""
        ...

    async def health_check(self) -> bool:
        """Check if the server is responsive.

        Sends an MCP ``ping`` (falling back to ``tools/list`` for servers that
        do not implement ping). ``initialize`` is deliberately not used here:
        it is only valid once per session, during ``connect()``.

        Returns:
            True if the server responds to the probe.
        """
        for probe in ("ping", "tools/list"):
            try:
                await self._call_method(probe, {})
                return True
            except Exception as e:
                logger.debug("Health check probe %s failed for %s: %s", probe, self.config.name, e)
        return False

    async def list_tools(self) -> list[MCPTool]:
        """List available tools from the MCP server.

        Returns:
            List of MCPTool definitions.
        """
        result = await self._call_method("tools/list", {})
        if result is None or not isinstance(result, dict):
            return []

        tools_data = result.get("tools", [])
        tools: list[MCPTool] = []
        for tool_data in tools_data:
            if not isinstance(tool_data, dict):
                continue
            tools.append(
                MCPTool(
                    name=tool_data.get("name", ""),
                    description=tool_data.get("description", ""),
                    server_name=self.config.name,
                )
            )
        return tools

    async def call_tool(self, tool_name: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        """Call a tool on the MCP server.

        Args:
            tool_name: Name of the tool to call.
            params: Tool parameters.

        Returns:
            Tool execution result.
        """
        arguments = params or {}
        result: Any = await self._call_method(
            "tools/call",
            {"name": tool_name, "arguments": arguments},
        )
        if result is None:
            return {"success": False, "error": "No response from server"}
        if isinstance(result, dict):
            return result
        return {"success": True, "data": result}

    @abstractmethod
    async def _call_method(self, method: str, params: dict[str, Any] | None = None) -> Any:
        """Call a JSON-RPC method."""
        ...

    def _next_id(self) -> int:
        """Generate next request ID."""
        self._request_id += 1
        return self._request_id


# ---------------------------------------------------------------------------
# Stdio MCP Client
# ---------------------------------------------------------------------------


class StdioMCPClient(MCPClient):
    """MCP client using stdio transport (subprocess)."""

    def __init__(self, config: MCPServerConfig) -> None:
        super().__init__(config)
        self._process: asyncio.subprocess.Process | None = None
        self._lock = asyncio.Lock()

    async def connect(self) -> Self:
        """Start the MCP server subprocess."""
        if self._connected:
            return self

        command = self.config.resolve_command()
        if command is None:
            raise ValueError(f"MCP server '{self.config.name}' has no command configured")

        args = [command] + self.config.args
        env = self.config.resolve_env()

        logger.info("Starting MCP server: %s", self.config.name)
        try:
            self._process = await asyncio.create_subprocess_exec(
                *args,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env if env else None,
            )
        except Exception as e:
            raise RuntimeError(f"Failed to start MCP server '{self.config.name}': {e}") from e

        self._connected = True

        # MCP handshake: initialize request + initialized notification,
        # required before any other method (e.g. tools/list) per the spec.
        try:
            await self._call_method(
                "initialize",
                {
                    "protocolVersion": MCP_PROTOCOL_VERSION,
                    "capabilities": {},
                    "clientInfo": {"name": "resolveagent", "version": __version__},
                },
            )
            await self._notify("notifications/initialized")
        except Exception:
            await self.close()
            raise

        logger.info("MCP server started: %s (PID: %s)", self.config.name, self._process.pid)
        return self

    async def _notify(self, method: str, params: dict[str, Any] | None = None) -> None:
        """Send a JSON-RPC notification (no id, no response expected)."""
        if not self._connected or self._process is None:
            raise RuntimeError("MCP client not connected")

        async with self._lock:
            notification = JSONRPCRequest(method=method, params=params)
            notification_json = notification.model_dump_json(exclude_none=True)

            assert self._process.stdin is not None
            self._process.stdin.write(notification_json.encode() + b"\n")
            await self._process.stdin.drain()

    async def close(self) -> None:
        """Terminate the subprocess."""
        if self._process is None:
            self._connected = False
            return

        try:
            self._process.terminate()
            try:
                await asyncio.wait_for(self._process.wait(), timeout=5.0)
            except TimeoutError:
                self._process.kill()
                await self._process.wait()
        except Exception as e:
            logger.warning("Error stopping MCP server %s: %s", self.config.name, e)
        finally:
            self._process = None
            self._connected = False

    async def _call_method(self, method: str, params: dict[str, Any] | None = None) -> Any:
        """Call a JSON-RPC method via stdio."""
        if not self._connected or self._process is None:
            raise RuntimeError("MCP client not connected")

        async with self._lock:
            request = JSONRPCRequest(
                method=method,
                params=params,
                id=self._next_id(),
            )
            request_json = request.model_dump_json(exclude_none=True)

            # Send request
            assert self._process.stdin is not None
            self._process.stdin.write(request_json.encode() + b"\n")
            await self._process.stdin.drain()

            # Read response
            assert self._process.stdout is not None
            try:
                line = await asyncio.wait_for(
                    self._process.stdout.readline(),
                    timeout=self.config.timeout_seconds,
                )
            except TimeoutError as err:
                raise TimeoutError(f"MCP request timeout after {self.config.timeout_seconds}s") from err

            if not line:
                raise RuntimeError("MCP server closed stdout")

            # Parse response
            try:
                response_data = json.loads(line.decode("utf-8", errors="replace"))
            except json.JSONDecodeError as e:
                raise RuntimeError(f"Invalid JSON response: {line.decode(errors='replace')}") from e

            response = JSONRPCResponse(**response_data)
            if response.error is not None:
                raise RuntimeError(f"MCP error: {response.error}")

            return response.result


# ---------------------------------------------------------------------------
# HTTP MCP Client
# ---------------------------------------------------------------------------


class HTTPMCPClient(MCPClient):
    """MCP client using HTTP/SSE transport."""

    def __init__(self, config: MCPServerConfig) -> None:
        super().__init__(config)
        self._session: Any | None = None
        self._lock = asyncio.Lock()

    async def connect(self) -> Self:
        """Initialize HTTP session."""
        if self._connected:
            return self

        try:
            import aiohttp
        except ImportError as err:
            raise ImportError("aiohttp is required for HTTP MCP transport. Install with: uv add aiohttp") from err

        url = self.config.resolve_url()
        if url is None:
            raise ValueError(f"MCP server '{self.config.name}' has no URL configured")

        self._session = aiohttp.ClientSession(
            headers=self.config.headers,
            timeout=aiohttp.ClientTimeout(total=self.config.timeout_seconds),
        )
        self._connected = True
        logger.info("HTTP MCP session created: %s", self.config.name)
        return self

    async def close(self) -> None:
        """Close HTTP session."""
        if self._session is not None:
            try:
                await self._session.close()
            except Exception as e:
                logger.warning("Error closing HTTP session for %s: %s", self.config.name, e)
            finally:
                self._session = None
                self._connected = False

    async def _call_method(self, method: str, params: dict[str, Any] | None = None) -> Any:
        """Call a JSON-RPC method via HTTP POST."""
        if not self._connected or self._session is None:
            raise RuntimeError("MCP client not connected")

        url = self.config.resolve_url()
        if url is None:
            raise ValueError("MCP server URL not configured")

        async with self._lock:
            request = JSONRPCRequest(
                method=method,
                params=params,
                id=self._next_id(),
            )

            try:
                async with self._session.post(
                    url,
                    json=request.model_dump(exclude_none=True),
                ) as response:
                    response_data = await response.json()
            except Exception as e:
                raise RuntimeError(f"HTTP MCP request failed: {e}") from e

            rpc_response = JSONRPCResponse(**response_data)
            if rpc_response.error is not None:
                raise RuntimeError(f"MCP error: {rpc_response.error}")

            return rpc_response.result
