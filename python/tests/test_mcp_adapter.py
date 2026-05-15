"""Tests for MCP adapter and client implementations."""

from __future__ import annotations

import asyncio
import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from resolveagent.mcp.adapter import MCPAdapter
from resolveagent.mcp.client import HTTPMCPClient, MCPClient, StdioMCPClient
from resolveagent.mcp.config import MCPConfig, MCPServerConfig, load_mcp_config, load_mcp_config_from_dict
from resolveagent.mcp.registry import MCPRegistry
from resolveagent.mcp.types import JSONRPCRequest, JSONRPCResponse, MCPTool, MCPToolResult


# ==================== Config Tests ====================


class TestMCPConfig:
    """Tests for MCP configuration parsing."""

    def test_load_from_dict(self):
        """Test loading MCP config from dictionary."""
        data = {
            "enabled": True,
            "servers": [
                {
                    "name": "test-server",
                    "transport": "stdio",
                    "command": "echo",
                    "args": ["hello"],
                    "env": {"KEY": "value"},
                }
            ],
        }
        config = load_mcp_config_from_dict(data)
        assert config.enabled is True
        assert len(config.servers) == 1
        assert config.servers[0].name == "test-server"
        assert config.servers[0].transport == "stdio"

    def test_load_from_dict_nested_mcp_key(self):
        """Test loading from dict with nested 'mcp' key."""
        data = {
            "mcp": {
                "enabled": True,
                "servers": [{"name": "fs", "transport": "stdio", "command": "npx"}],
            }
        }
        config = load_mcp_config_from_dict(data)
        assert config.enabled is True
        assert config.servers[0].name == "fs"

    def test_get_server(self):
        """Test getting server by name."""
        config = MCPConfig(
            enabled=True,
            servers=[
                MCPServerConfig(name="server1", transport="stdio", command="echo"),
                MCPServerConfig(name="server2", transport="http", url="http://localhost"),
            ],
        )
        server = config.get_server("server1")
        assert server is not None
        assert server.name == "server1"

        missing = config.get_server("nonexistent")
        assert missing is None

    def test_env_var_resolution(self):
        """Test environment variable resolution in config."""
        import os

        os.environ["TEST_TOKEN"] = "secret123"
        config = MCPServerConfig(
            name="test",
            transport="http",
            url="http://localhost",
            env={"TOKEN": "${TEST_TOKEN}"},
        )
        resolved = config.resolve_env()
        assert resolved["TOKEN"] == "secret123"
        del os.environ["TEST_TOKEN"]


# ==================== Type Tests ====================


class TestMCPTypes:
    """Tests for MCP type definitions."""

    def test_mcp_tool_creation(self):
        """Test creating MCPTool instances."""
        tool = MCPTool(name="read_file", description="Read a file", server_name="fs")
        assert tool.name == "read_file"
        assert tool.server_name == "fs"

    def test_mcp_tool_result(self):
        """Test MCPToolResult creation."""
        result = MCPToolResult(success=True, data={"content": "hello"}, tool_name="read_file")
        assert result.success is True
        assert result.data == {"content": "hello"}

    def test_json_rpc_request(self):
        """Test JSONRPCRequest creation."""
        req = JSONRPCRequest(method="tools/list", params={}, id=1)
        assert req.method == "tools/list"
        assert req.id == 1
        assert req.jsonrpc == "2.0"

    def test_json_rpc_response(self):
        """Test JSONRPCResponse creation."""
        resp = JSONRPCResponse(result={"tools": []}, id=1)
        assert resp.result == {"tools": []}
        assert resp.error is None


# ==================== Client Tests ====================


class TestMCPClient:
    """Tests for MCP client base class."""

    def test_next_id_increments(self):
        """Test request ID generation."""
        config = MCPServerConfig(name="test", transport="stdio", command="echo")
        client = StdioMCPClient(config)
        assert client._next_id() == 1
        assert client._next_id() == 2
        assert client._next_id() == 3


class TestStdioMCPClient:
    """Tests for stdio MCP client."""

    @pytest.mark.asyncio
    async def test_connect_missing_command(self):
        """Test connect fails when command is missing."""
        config = MCPServerConfig(name="test", transport="stdio")
        client = StdioMCPClient(config)
        with pytest.raises(ValueError, match="no command"):
            await client.connect()

    @pytest.mark.asyncio
    async def test_connect_success(self):
        """Test successful connection."""
        config = MCPServerConfig(name="test", transport="stdio", command="cat")
        client = StdioMCPClient(config)

        # Mock subprocess
        mock_process = MagicMock()
        mock_process.pid = 12345
        mock_process.stdin = MagicMock()
        mock_process.stdout = MagicMock()
        mock_process.stdout.readline = AsyncMock(return_value=b"")

        with patch("asyncio.create_subprocess_exec", return_value=mock_process):
            result = await client.connect()
            assert result is client
            assert client.connected is True

        await client.close()

    @pytest.mark.asyncio
    async def test_health_check(self):
        """Test health check method."""
        config = MCPServerConfig(name="test", transport="stdio", command="cat")
        client = StdioMCPClient(config)

        # Mock _call_method to return a valid result
        client._call_method = AsyncMock(return_value={"protocolVersion": "2024-11-05"})
        client._connected = True

        healthy = await client.health_check()
        assert healthy is True

    @pytest.mark.asyncio
    async def test_list_tools(self):
        """Test listing tools from MCP server."""
        config = MCPServerConfig(name="test", transport="stdio", command="cat")
        client = StdioMCPClient(config)

        mock_result = {
            "tools": [
                {"name": "read_file", "description": "Read file"},
                {"name": "write_file", "description": "Write file"},
            ]
        }
        client._call_method = AsyncMock(return_value=mock_result)
        client._connected = True

        tools = await client.list_tools()
        assert len(tools) == 2
        assert tools[0].name == "read_file"
        assert tools[1].name == "write_file"

    @pytest.mark.asyncio
    async def test_call_tool(self):
        """Test calling a tool."""
        config = MCPServerConfig(name="test", transport="stdio", command="cat")
        client = StdioMCPClient(config)

        mock_result = {"content": "file contents"}
        client._call_method = AsyncMock(return_value=mock_result)
        client._connected = True

        result = await client.call_tool("read_file", {"path": "/tmp/test.txt"})
        assert result == mock_result


class TestHTTPMCPClient:
    """Tests for HTTP MCP client."""

    @pytest.mark.asyncio
    async def test_connect_missing_url(self):
        """Test connect fails when URL is missing."""
        config = MCPServerConfig(name="test", transport="http")
        client = HTTPMCPClient(config)
        with pytest.raises(ValueError, match="no URL"):
            await client.connect()

    @pytest.mark.asyncio
    async def test_connect_without_aiohttp(self):
        """Test connect fails when aiohttp is not installed."""
        config = MCPServerConfig(name="test", transport="http", url="http://localhost")
        client = HTTPMCPClient(config)

        with patch.dict("sys.modules", {"aiohttp": None}):
            with pytest.raises(ImportError, match="aiohttp"):
                await client.connect()


# ==================== Registry Tests ====================


class TestMCPRegistry:
    """Tests for MCP registry."""

    @pytest.mark.asyncio
    async def test_initialize_disabled(self):
        """Test initialization when MCP is disabled."""
        config = MCPConfig(enabled=False)
        registry = MCPRegistry(config)
        await registry.initialize()
        assert len(registry.list_tools()) == 0

    @pytest.mark.asyncio
    async def test_list_tools_empty(self):
        """Test listing tools when none discovered."""
        config = MCPConfig(enabled=True, servers=[])
        registry = MCPRegistry(config)
        assert registry.list_tools() == []

    def test_resolve_tool_server(self):
        """Test resolving tool to server."""
        registry = MCPRegistry()
        # Manually add a tool
        tool = MCPTool(name="read_file", server_name="filesystem")
        registry._tools["read_file"] = tool

        server = registry.resolve_tool_server("read_file")
        assert server == "filesystem"

    def test_resolve_tool_server_qualified(self):
        """Test resolving qualified tool name."""
        registry = MCPRegistry()
        registry._clients["filesystem"] = MagicMock()

        server = registry.resolve_tool_server("filesystem.read_file")
        assert server == "filesystem"

    @pytest.mark.asyncio
    async def test_execute_tool_not_found(self):
        """Test executing non-existent tool."""
        registry = MCPRegistry()
        result = await registry.execute_tool("nonexistent", {})
        assert result["success"] is False
        assert "not found" in result["error"]


# ==================== Adapter Tests ====================


class TestMCPAdapter:
    """Tests for MCP adapter."""

    @pytest.mark.asyncio
    async def test_initialize_disabled(self):
        """Test adapter initialization when disabled."""
        config = MCPConfig(enabled=False)
        adapter = MCPAdapter(config)
        await adapter.initialize()
        assert adapter.initialized is False
        assert adapter.enabled is False

    @pytest.mark.asyncio
    async def test_execute_not_initialized(self):
        """Test execution when adapter not initialized."""
        config = MCPConfig(enabled=True)
        adapter = MCPAdapter(config)
        # Don't initialize
        result = await adapter.execute("some_tool", {})
        assert result.success is False
        assert "not initialized" in result.error

    @pytest.mark.asyncio
    async def test_is_mcp_tool(self):
        """Test checking if a tool is an MCP tool."""
        adapter = MCPAdapter()
        adapter._registry._tools["read_file"] = MCPTool(name="read_file")
        assert adapter.is_mcp_tool("read_file") is True
        assert adapter.is_mcp_tool("nonexistent") is False

    @pytest.mark.asyncio
    async def test_execute_success(self):
        """Test successful tool execution."""
        config = MCPConfig(enabled=True)
        adapter = MCPAdapter(config)
        adapter._initialized = True

        # Mock registry execute
        adapter._registry.execute_tool = AsyncMock(return_value={"success": True, "data": "result"})

        result = await adapter.execute("read_file", {"path": "/tmp/test.txt"})
        assert result.success is True
        assert result.data == "result"
        assert result.tool_name == "read_file"

    @pytest.mark.asyncio
    async def test_execute_failure(self):
        """Test failed tool execution."""
        config = MCPConfig(enabled=True)
        adapter = MCPAdapter(config)
        adapter._initialized = True

        # Mock registry execute with failure
        adapter._registry.execute_tool = AsyncMock(return_value={"success": False, "error": "Tool error"})

        result = await adapter.execute("read_file", {})
        assert result.success is False
        assert "Tool error" in result.error

    @pytest.mark.asyncio
    async def test_execute_exception(self):
        """Test execution with exception."""
        config = MCPConfig(enabled=True)
        adapter = MCPAdapter(config)
        adapter._initialized = True

        # Mock registry to raise exception
        adapter._registry.execute_tool = AsyncMock(side_effect=RuntimeError("Connection lost"))

        result = await adapter.execute("read_file", {})
        assert result.success is False
        assert "Connection lost" in result.error


# ==================== Integration Tests ====================


@pytest.mark.asyncio
async def test_full_mcp_lifecycle():
    """Test full MCP adapter lifecycle: init -> list -> execute -> shutdown."""
    config = MCPConfig(enabled=True, servers=[])
    adapter = MCPAdapter(config)

    # Initialize with no servers
    await adapter.initialize()
    assert adapter.initialized is True

    # List tools (should be empty)
    tools = adapter.list_tools()
    assert tools == []

    # Execute non-existent tool
    result = await adapter.execute("missing", {})
    assert result.success is False

    # Shutdown
    await adapter.shutdown()
    assert adapter.initialized is False
