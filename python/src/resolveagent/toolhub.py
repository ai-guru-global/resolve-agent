"""ToolHub - 工具发现、注册、能力映射和安全策略管理."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class ToolCapability(Enum):
    """工具能力枚举."""

    WEB_SEARCH = "web_search"
    CODE_EXECUTION = "code_execution"
    FILE_OPERATIONS = "file_operations"
    API_CALL = "api_call"
    DATA_PROCESSING = "data_processing"
    CALCULATION = "calculation"
    CODE_ANALYSIS = "code_analysis"
    SECURITY_SCAN = "security_scan"
    DOCUMENTATION = "documentation"
    DEPLOYMENT = "deployment"
    MONITORING = "monitoring"
    UNKNOWN = "unknown"


class ToolSecurityLevel(Enum):
    """工具安全级别."""

    PUBLIC = "public"  # 可自由使用
    SENSITIVE = "sensitive"  # 需要确认
    RESTRICTED = "restricted"  # 需要特殊权限


@dataclass
class ToolSchema:
    """工具 Schema 定义."""

    name: str
    version: str
    description: str
    capabilities: list[ToolCapability]
    parameters: dict[str, Any] = field(default_factory=dict)
    returns: dict[str, Any] = field(default_factory=dict)
    examples: list[dict[str, Any]] = field(default_factory=list)
    security_level: ToolSecurityLevel = ToolSecurityLevel.PUBLIC
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class ToolRegistration:
    """工具注册信息."""

    schema: ToolSchema
    handler: Any  # 可调用的工具 handler
    enabled: bool = True
    tags: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


class CapabilityMap:
    """能力映射 - 支持语义搜索工具能力.

    使用简单的关键词匹配进行演示，实际应该使用 embedding search。
    """

    def __init__(self) -> None:
        self._capability_index: dict[ToolCapability, list[str]] = {
            cap: [] for cap in ToolCapability
        }
        self._tool_capabilities: dict[str, list[ToolCapability]] = {}

    def register_tool(
        self,
        tool_name: str,
        capabilities: list[ToolCapability],
        keywords: list[str],
    ) -> None:
        """注册工具能力.

        Args:
            tool_name: 工具名称
            capabilities: 能力列表
            keywords: 关键词 (用于搜索)
        """
        self._tool_capabilities[tool_name] = capabilities

        for cap in capabilities:
            self._capability_index[cap].append(tool_name)

        # NOTE: Semantic keyword-to-capability index requires an embedding model.
        #       For now, exact capability matching via _capability_index is sufficient.

    def find_tools_by_capability(self, capability: ToolCapability) -> list[str]:
        """根据能力查找工具.

        Args:
            capability: 能力类型

        Returns:
            工具名称列表
        """
        return self._capability_index.get(capability, [])

    def find_tools_by_keyword(self, keyword: str) -> list[tuple[str, float]]:
        """根据关键词查找相关工具.

        Args:
            keyword: 搜索关键词

        Returns:
            [(tool_name, relevance_score), ...]
        """
        keyword_lower = keyword.lower()
        results: list[tuple[str, float]] = []

        for tool_name, capabilities in self._tool_capabilities.items():
            score = 0.0

            # 能力匹配得分
            cap_keywords = {
                ToolCapability.WEB_SEARCH: ["search", "web", "google", "find"],
                ToolCapability.CODE_EXECUTION: ["code", "execute", "run", "script"],
                ToolCapability.FILE_OPERATIONS: ["file", "read", "write", "open"],
                ToolCapability.API_CALL: ["api", "http", "request", "call"],
                ToolCapability.DATA_PROCESSING: ["data", "process", "transform"],
                ToolCapability.CALCULATION: ["calc", "math", "compute"],
                ToolCapability.CODE_ANALYSIS: ["analyze", "review", "check"],
                ToolCapability.SECURITY_SCAN: ["security", "vuln", "scan"],
                ToolCapability.DOCUMENTATION: ["doc", "docs", "manual"],
                ToolCapability.DEPLOYMENT: ["deploy", "k8s", "kubernetes"],
                ToolCapability.MONITORING: ["monitor", "metric", "log"],
            }

            for cap in capabilities:
                kws = cap_keywords.get(cap, [])
                for kw in kws:
                    if kw in keyword_lower:
                        score += 0.3

            # 工具名匹配
            if keyword_lower in tool_name.lower():
                score += 0.5

            if score > 0:
                results.append((tool_name, min(score, 1.0)))

        return sorted(results, key=lambda x: x[1], reverse=True)

    def get_tool_capabilities(self, tool_name: str) -> list[ToolCapability]:
        """获取工具的能力列表."""
        return self._tool_capabilities.get(tool_name, [])


class SchemaRegistry:
    """工具 Schema 注册表 - 管理工具版本和 schema.

    特性:
    - Schema 版本管理
    - Schema 验证
    - 历史追踪
    """

    def __init__(self) -> None:
        self._schemas: dict[str, dict[str, ToolSchema]] = {}  # name -> version -> schema
        self._latest: dict[str, str] = {}  # name -> latest version

    def register(self, schema: ToolSchema) -> None:
        """注册工具 Schema.

        Args:
            schema: 工具 schema
        """
        name = schema.name

        if name not in self._schemas:
            self._schemas[name] = {}

        self._schemas[name][schema.version] = schema
        self._latest[name] = schema.version

        logger.info(
            "Tool schema registered",
            extra={"name": name, "version": schema.version},
        )

    def get(self, name: str, version: str | None = None) -> ToolSchema | None:
        """获取工具 Schema.

        Args:
            name: 工具名称
            version: 版本号, None 表示最新

        Returns:
            ToolSchema 或 None
        """
        if name not in self._schemas:
            return None

        if version is None:
            version = self._latest.get(name)

        return self._schemas[name].get(version)

    def get_latest(self, name: str) -> ToolSchema | None:
        """获取最新版本的 Schema."""
        return self.get(name)

    def list_versions(self, name: str) -> list[str]:
        """列出工具的所有版本."""
        if name not in self._schemas:
            return []
        return list(self._schemas[name].keys())

    def list_tools(self) -> list[str]:
        """列出所有注册的工具."""
        return list(self._schemas.keys())


class SecurityPolicy:
    """工具安全策略 - 管理工具权限和控制.

    特性:
    - 安全级别验证
    - 使用审计
    - 权限检查
    """

    def __init__(self) -> None:
        self._policies: dict[str, ToolSecurityLevel] = {}
        self._audit_log: list[dict[str, Any]] = []

    def set_policy(self, tool_name: str, level: ToolSecurityLevel) -> None:
        """设置工具安全级别.

        Args:
            tool_name: 工具名称
            level: 安全级别
        """
        self._policies[tool_name] = level
        logger.info("Security policy set", extra={"tool": tool_name, "level": level.value})

    def get_level(self, tool_name: str) -> ToolSecurityLevel:
        """获取工具安全级别."""
        return self._policies.get(tool_name, ToolSecurityLevel.PUBLIC)

    def can_use(self, tool_name: str, user_roles: list[str]) -> bool:
        """检查用户是否有权限使用工具.

        Args:
            tool_name: 工具名称
            user_roles: 用户角色列表

        Returns:
            是否有权限
        """
        level = self.get_level(tool_name)

        if level == ToolSecurityLevel.PUBLIC:
            return True

        if level == ToolSecurityLevel.SENSITIVE:
            # 需要确认的操作员或管理员
            return any(r in ("operator", "admin") for r in user_roles)

        if level == ToolSecurityLevel.RESTRICTED:
            # 只有管理员
            return "admin" in user_roles

        return False

    def audit(
        self,
        tool_name: str,
        user_id: str,
        action: str,
        success: bool,
    ) -> None:
        """记录工具使用审计.

        Args:
            tool_name: 工具名称
            user_id: 用户 ID
            action: 操作类型
            success: 是否成功
        """
        entry = {
            "timestamp": datetime.now().isoformat(),
            "tool": tool_name,
            "user": user_id,
            "action": action,
            "success": success,
        }
        self._audit_log.append(entry)

        # 保持最近 1000 条审计记录
        if len(self._audit_log) > 1000:
            self._audit_log = self._audit_log[-1000:]

    def get_audit_trail(
        self,
        tool_name: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """获取审计轨迹.

        Args:
            tool_name: 工具名称过滤, None 表示所有
            limit: 返回数量

        Returns:
            审计记录列表
        """
        records = [r for r in self._audit_log if r["tool"] == tool_name] if tool_name else self._audit_log

        return records[-limit:]


class DiscoveryService:
    """工具发现服务 - 自动发现和注册可用工具.

    特性:
    - MCP 工具自动发现
    - 本地工具注册
    - 能力索引
    """

    def __init__(
        self,
        schema_registry: SchemaRegistry,
        capability_map: CapabilityMap,
    ) -> None:
        self._registry = schema_registry
        self._capability_map = capability_map
        self._handlers: dict[str, Any] = {}
        self._discovered_tools: dict[str, dict[str, Any]] = {}

    def register_handler(self, tool_name: str, handler: Any) -> None:
        """注册工具处理器.

        Args:
            tool_name: 工具名称
            handler: 可调用对象
        """
        self._handlers[tool_name] = handler
        logger.debug("Tool handler registered", extra={"tool": tool_name})

    def discover_from_mcp(self, mcp_registry: Any) -> list[str]:
        """从 MCP Registry 发现工具.

        Args:
            mcp_registry: MCP Registry 实例

        Returns:
            发现工具列表
        """
        discovered = []

        try:
            tools = mcp_registry.list_tools()
            for tool in tools:
                name = tool.get("name", "")
                if name:
                    self._discovered_tools[name] = tool

                    # 自动注册 schema
                    schema = ToolSchema(
                        name=name,
                        version="1.0.0",
                        description=tool.get("description", ""),
                        capabilities=self._infer_capabilities(name),
                    )
                    self._registry.register(schema)
                    self._capability_map.register_tool(
                        name,
                        schema.capabilities,
                        self._extract_keywords(name),
                    )
                    discovered.append(name)

        except Exception as e:
            logger.error("Failed to discover from MCP: %s", e)

        return discovered

    def discover_local_tools(self, tools: list[dict[str, Any]]) -> list[str]:
        """发现本地工具.

        Args:
            tools: 工具定义列表

        Returns:
            发现工具列表
        """
        discovered = []

        for tool in tools:
            name = tool.get("name", "")
            if not name:
                continue

            self._discovered_tools[name] = tool

            schema = ToolSchema(
                name=name,
                version=tool.get("version", "1.0.0"),
                description=tool.get("description", ""),
                capabilities=[
                    self._str_to_capability(c) for c in tool.get("capabilities", [])
                ],
                parameters=tool.get("parameters", {}),
                returns=tool.get("returns", {}),
            )

            self._registry.register(schema)
            self._capability_map.register_tool(
                name,
                schema.capabilities,
                self._extract_keywords(name),
            )

            if tool.get("handler"):
                self.register_handler(name, tool["handler"])

            discovered.append(name)

        return discovered

    def _infer_capabilities(self, tool_name: str) -> list[ToolCapability]:
        """从工具名称推断能力."""
        name_lower = tool_name.lower()

        capability_map = {
            "search": ToolCapability.WEB_SEARCH,
            "web": ToolCapability.WEB_SEARCH,
            "code": ToolCapability.CODE_EXECUTION,
            "exec": ToolCapability.CODE_EXECUTION,
            "file": ToolCapability.FILE_OPERATIONS,
            "api": ToolCapability.API_CALL,
            "data": ToolCapability.DATA_PROCESSING,
            "calc": ToolCapability.CALCULATION,
            "analyze": ToolCapability.CODE_ANALYSIS,
            "security": ToolCapability.SECURITY_SCAN,
            "scan": ToolCapability.SECURITY_SCAN,
            "doc": ToolCapability.DOCUMENTATION,
            "deploy": ToolCapability.DEPLOYMENT,
            "monitor": ToolCapability.MONITORING,
        }

        found = []
        for kw, cap in capability_map.items():
            if kw in name_lower:
                found.append(cap)

        return found if found else [ToolCapability.UNKNOWN]

    def _str_to_capability(self, s: str) -> ToolCapability:
        """字符串转能力枚举."""
        try:
            return ToolCapability[s.upper()]
        except KeyError:
            return ToolCapability.UNKNOWN

    def _extract_keywords(self, tool_name: str) -> list[str]:
        """从工具名称提取关键词."""
        # 简单分词
        words = tool_name.replace("-", "_").replace("_", " ").split()
        return words + [tool_name]

    def get_handler(self, tool_name: str) -> Any | None:
        """获取工具处理器."""
        return self._handlers.get(tool_name)

    def list_discovered(self) -> list[str]:
        """列出所有发现工具."""
        return list(self._discovered_tools.keys())


class ToolHub:
    """工具中心 - 统一管理工具发现、注册、能力映射和安全策略.

    Example:
        >>> hub = ToolHub()
        >>> hub.discover_local_tools([...])
        >>> tools = hub.find_tools("code analysis")
        >>> if hub.can_use("security-scan", user_roles):
        ...     result = await hub.execute("security-scan", params)
    """

    def __init__(self) -> None:
        self._registry = SchemaRegistry()
        self._capability_map = CapabilityMap()
        self._security = SecurityPolicy()
        self._discovery = DiscoveryService(self._registry, self._capability_map)
        self._handlers: dict[str, Any] = {}

    def register_tool(
        self,
        name: str,
        version: str,
        description: str,
        capabilities: list[str],
        handler: Any,
        security_level: str = "public",
        **kwargs: Any,
    ) -> None:
        """注册工具.

        Args:
            name: 工具名称
            version: 版本
            description: 描述
            capabilities: 能力列表
            handler: 处理器
            security_level: 安全级别 (public/sensitive/restricted)
        """
        schema = ToolSchema(
            name=name,
            version=version,
            description=description,
            capabilities=[self._str_to_capability(c) for c in capabilities],
            security_level=ToolSecurityLevel(security_level),
        )

        self._registry.register(schema)
        self._capability_map.register_tool(
            name,
            schema.capabilities,
            name.replace("-", " ").split(),
        )
        self._security.set_policy(name, schema.security_level)
        self._discovery.register_handler(name, handler)
        self._handlers[name] = handler

    def _str_to_capability(self, s: str) -> ToolCapability:
        """字符串转能力枚举."""
        try:
            return ToolCapability[s.upper()]
        except KeyError:
            return ToolCapability.UNKNOWN

    def find_tools(
        self,
        query: str | ToolCapability,
        limit: int = 5,
    ) -> list[tuple[str, float]]:
        """查找工具.

        Args:
            query: 查询字符串或能力枚举
            limit: 返回数量

        Returns:
            [(tool_name, score), ...]
        """
        if isinstance(query, ToolCapability):
            tool_names = self._capability_map.find_tools_by_capability(query)
            return [(name, 1.0) for name in tool_names[:limit]]
        else:
            return self._capability_map.find_tools_by_keyword(query)[:limit]

    def get_schema(self, name: str, version: str | None = None) -> ToolSchema | None:
        """获取工具 Schema."""
        return self._registry.get(name, version)

    def can_use(self, tool_name: str, user_roles: list[str]) -> bool:
        """检查是否有权限使用工具."""
        return self._security.can_use(tool_name, user_roles)

    async def execute(
        self,
        tool_name: str,
        parameters: dict[str, Any],
        user_id: str = "system",
    ) -> dict[str, Any]:
        """执行工具.

        Args:
            tool_name: 工具名称
            parameters: 参数
            user_id: 用户 ID

        Returns:
            执行结果
        """
        if not self.can_use(tool_name, ["user"]):
            self._security.audit(tool_name, user_id, "execute", False)
            return {
                "success": False,
                "error": f"Access denied for tool: {tool_name}",
            }

        handler = self._handlers.get(tool_name) or self._discovery.get_handler(tool_name)

        if not handler:
            self._security.audit(tool_name, user_id, "execute", False)
            return {
                "success": False,
                "error": f"Handler not found for tool: {tool_name}",
            }

        try:
            if asyncio.iscoroutinefunction(handler):
                result = await handler(**parameters)
            else:
                result = handler(**parameters)

            self._security.audit(tool_name, user_id, "execute", True)
            return {"success": True, "data": result}

        except Exception as e:
            logger.error("Tool execution failed", extra={"tool": tool_name, "error": str(e)})
            self._security.audit(tool_name, user_id, "execute", False)
            return {"success": False, "error": str(e)}

    def list_tools(self) -> list[str]:
        """列出所有工具."""
        return self._registry.list_tools()

    def get_audit_trail(self, tool_name: str | None = None) -> list[dict[str, Any]]:
        """获取审计轨迹."""
        return self._security.get_audit_trail(tool_name)
