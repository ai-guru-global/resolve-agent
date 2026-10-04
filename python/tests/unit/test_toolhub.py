"""Unit tests for ToolHub (toolhub.py)."""

from __future__ import annotations

from typing import Any

import pytest

from resolveagent.toolhub import (
    CapabilityMap,
    DiscoveryService,
    SchemaRegistry,
    SecurityPolicy,
    ToolCapability,
    ToolHub,
    ToolSchema,
    ToolSecurityLevel,
)


def make_schema(name: str, version: str = "1.0.0") -> ToolSchema:
    return ToolSchema(
        name=name,
        version=version,
        description=f"schema for {name}",
        capabilities=[ToolCapability.CODE_ANALYSIS],
    )


class TestSchemaRegistry:
    def test_register_and_get_latest(self) -> None:
        reg = SchemaRegistry()
        reg.register(make_schema("t", "1.0.0"))
        reg.register(make_schema("t", "2.0.0"))

        assert reg.list_tools() == ["t"]
        assert reg.list_versions("t") == ["1.0.0", "2.0.0"]
        assert reg.get_latest("t").version == "2.0.0"
        assert reg.get("t", "1.0.0").version == "1.0.0"
        assert reg.get("t", "9.9.9") is None
        assert reg.get("missing") is None


class TestCapabilityMap:
    def test_find_by_capability(self) -> None:
        cm = CapabilityMap()
        cm.register_tool("analyzer", [ToolCapability.CODE_ANALYSIS], ["analyze"])
        cm.register_tool("scanner", [ToolCapability.CODE_ANALYSIS, ToolCapability.SECURITY_SCAN], ["scan"])

        assert set(cm.find_tools_by_capability(ToolCapability.CODE_ANALYSIS)) == {"analyzer", "scanner"}
        assert cm.find_tools_by_capability(ToolCapability.MONITORING) == []

    def test_find_by_keyword_ranks_name_match_first(self) -> None:
        cm = CapabilityMap()
        cm.register_tool("k8s_analyzer", [ToolCapability.CODE_ANALYSIS], ["analyze"])
        cm.register_tool("generic_review", [ToolCapability.CODE_ANALYSIS], ["analyze"])

        results = cm.find_tools_by_keyword("k8s")
        assert results[0][0] == "k8s_analyzer"
        scores = [s for _, s in results]
        assert scores == sorted(scores, reverse=True)
        assert all(0.0 < s <= 1.0 for s in scores)

    def test_find_by_keyword_no_match(self) -> None:
        cm = CapabilityMap()
        cm.register_tool("analyzer", [ToolCapability.CODE_ANALYSIS], ["analyze"])
        assert cm.find_tools_by_keyword("kubernetes-deploy") == []

    def test_get_tool_capabilities(self) -> None:
        cm = CapabilityMap()
        cm.register_tool("analyzer", [ToolCapability.CODE_ANALYSIS], ["analyze"])
        assert cm.get_tool_capabilities("analyzer") == [ToolCapability.CODE_ANALYSIS]
        assert cm.get_tool_capabilities("missing") == []


class TestSecurityPolicy:
    def test_default_is_public(self) -> None:
        policy = SecurityPolicy()
        assert policy.get_level("anything") == ToolSecurityLevel.PUBLIC
        assert policy.can_use("anything", [])

    def test_role_matrix(self) -> None:
        policy = SecurityPolicy()
        policy.set_policy("sensitive-tool", ToolSecurityLevel.SENSITIVE)
        policy.set_policy("restricted-tool", ToolSecurityLevel.RESTRICTED)

        assert policy.can_use("sensitive-tool", ["user"]) is False
        assert policy.can_use("sensitive-tool", ["operator"]) is True
        assert policy.can_use("sensitive-tool", ["admin"]) is True

        assert policy.can_use("restricted-tool", ["user"]) is False
        assert policy.can_use("restricted-tool", ["operator"]) is False
        assert policy.can_use("restricted-tool", ["admin"]) is True

    def test_audit_trail_ring_and_filter(self) -> None:
        policy = SecurityPolicy()
        for i in range(1001):
            policy.audit(f"tool-{i % 3}", "user-1", "execute", i % 2 == 0)

        # 审计环保留最近 1000 条，默认视图返回最后 100 条
        assert len(policy.get_audit_trail(limit=1000)) == 1000
        assert len(policy.get_audit_trail()) == 100
        trail = policy.get_audit_trail("tool-1")
        assert all(r["tool"] == "tool-1" for r in trail)
        assert len(policy.get_audit_trail(limit=5)) == 5


class TestDiscoveryService:
    def test_discover_local_tools(self) -> None:
        reg = SchemaRegistry()
        cm = CapabilityMap()
        svc = DiscoveryService(reg, cm)

        handler = lambda **kwargs: "ok"  # noqa: E731
        discovered = svc.discover_local_tools(
            [
                {
                    "name": "log_analyzer",
                    "version": "2.1.0",
                    "description": "analyze logs",
                    "capabilities": ["CODE_ANALYSIS", "bogus_capability"],
                    "handler": handler,
                },
                {"description": "nameless entry is skipped"},
            ]
        )

        assert discovered == ["log_analyzer"]
        assert svc.get_handler("log_analyzer") is handler
        assert reg.get_latest("log_analyzer").version == "2.1.0"
        caps = cm.get_tool_capabilities("log_analyzer")
        assert ToolCapability.CODE_ANALYSIS in caps
        assert ToolCapability.UNKNOWN in caps
        assert svc.list_discovered() == ["log_analyzer"]

    def test_discover_from_mcp(self) -> None:
        class FakeMcpRegistry:
            def list_tools(self) -> list[dict[str, Any]]:
                return [{"name": "web_search", "description": "search the web"}]

        reg = SchemaRegistry()
        cm = CapabilityMap()
        svc = DiscoveryService(reg, cm)

        discovered = svc.discover_from_mcp(FakeMcpRegistry())
        assert discovered == ["web_search"]
        assert reg.get_latest("web_search") is not None
        assert cm.find_tools_by_capability(ToolCapability.WEB_SEARCH) == ["web_search"]

    def test_discover_from_mcp_swallows_errors(self) -> None:
        class BrokenRegistry:
            def list_tools(self) -> list[dict[str, Any]]:
                raise RuntimeError("boom")

        svc = DiscoveryService(SchemaRegistry(), CapabilityMap())
        assert svc.discover_from_mcp(BrokenRegistry()) == []


class TestToolHub:
    def test_register_and_schema(self) -> None:
        hub = ToolHub()
        hub.register_tool(
            name="log_analyzer",
            version="1.0.0",
            description="analyze logs",
            capabilities=["CODE_ANALYSIS"],
            handler=lambda **kw: "ok",
        )

        assert hub.list_tools() == ["log_analyzer"]
        schema = hub.get_schema("log_analyzer")
        assert schema is not None
        assert schema.capabilities == [ToolCapability.CODE_ANALYSIS]
        assert hub.get_schema("missing") is None

    def test_find_tools_by_capability_and_query(self) -> None:
        hub = ToolHub()
        hub.register_tool("log_analyzer", "1.0.0", "d", ["CODE_ANALYSIS"], lambda **kw: None)

        assert hub.find_tools(ToolCapability.CODE_ANALYSIS) == [("log_analyzer", 1.0)]
        # 关键词 "log" 只命中工具名（+0.5），不命中 CODE_ANALYSIS 的关键词集
        assert hub.find_tools("log") == [("log_analyzer", 0.5)]
        assert hub.find_tools("log", limit=0) == []

    @pytest.mark.asyncio
    async def test_execute_sync_and_async_handlers(self) -> None:
        hub = ToolHub()

        async def async_handler(x: int) -> int:
            return x * 2

        hub.register_tool("double", "1.0.0", "d", ["CALCULATION"], async_handler)
        hub.register_tool("upper", "1.0.0", "d", ["DATA_PROCESSING"], lambda *, text: text.upper())

        assert await hub.execute("double", {"x": 21}) == {"success": True, "data": 42}
        assert await hub.execute("upper", {"text": "abc"}) == {"success": True, "data": "ABC"}

    @pytest.mark.asyncio
    async def test_execute_denies_sensitive_tool_for_user_role(self) -> None:
        hub = ToolHub()
        hub.register_tool("secret_scan", "1.0.0", "d", ["SECURITY_SCAN"], lambda **kw: "x", security_level="sensitive")

        result = await hub.execute("secret_scan", {})
        assert result["success"] is False
        assert "Access denied" in result["error"]

        trail = hub.get_audit_trail("secret_scan")
        assert len(trail) == 1
        assert trail[0]["success"] is False

    @pytest.mark.asyncio
    async def test_execute_missing_handler(self) -> None:
        hub = ToolHub()
        # 未注册的工具：can_use 默认 PUBLIC 通过，但无 handler
        result = await hub.execute("never_registered", {})
        assert result == {"success": False, "error": "Handler not found for tool: never_registered"}

    @pytest.mark.asyncio
    async def test_execute_handler_exception_is_reported(self) -> None:
        hub = ToolHub()

        def boom() -> None:
            raise ValueError("kaboom")

        hub.register_tool("bomber", "1.0.0", "d", ["CALCULATION"], boom)
        result = await hub.execute("bomber", {})
        assert result["success"] is False
        assert "kaboom" in result["error"]

        assert hub.get_audit_trail("bomber")[-1]["success"] is False

    @pytest.mark.asyncio
    async def test_successful_execution_audited(self) -> None:
        hub = ToolHub()
        hub.register_tool("adder", "1.0.0", "d", ["CALCULATION"], lambda *, a, b: a + b)
        await hub.execute("adder", {"a": 1, "b": 2}, user_id="u-7")

        entry = hub.get_audit_trail("adder")[0]
        assert entry["success"] is True
        assert entry["user"] == "u-7"
        assert entry["action"] == "execute"
