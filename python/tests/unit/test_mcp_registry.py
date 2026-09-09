"""Unit tests for MCPRegistry.execute_tool error bubbling."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock

from resolveagent.mcp.registry import MCPRegistry


def _registry_with_client(call_result: Any) -> MCPRegistry:
    registry = MCPRegistry()
    client = AsyncMock()
    client.call_tool = AsyncMock(return_value=call_result)
    registry._clients["srv"] = client
    return registry


class TestExecuteTool:
    async def test_iserror_bubbles_as_failure(self):
        registry = _registry_with_client({"content": [{"type": "text", "text": "boom"}], "isError": True})

        result = await registry.execute_tool("srv.tool")

        assert result["success"] is False
        assert "boom" in result["error"]

    async def test_client_failure_dict_bubbles(self):
        registry = _registry_with_client({"success": False, "error": "No response from server"})

        result = await registry.execute_tool("srv.tool")

        assert result["success"] is False
        assert result["error"] == "No response from server"

    async def test_normal_result_is_success(self):
        registry = _registry_with_client({"content": [{"type": "text", "text": "ok"}]})

        result = await registry.execute_tool("srv.tool")

        assert result["success"] is True
        assert result["data"] == {"content": [{"type": "text", "text": "ok"}]}

    async def test_unknown_tool(self):
        result = await MCPRegistry().execute_tool("ghost.tool")

        assert result["success"] is False
