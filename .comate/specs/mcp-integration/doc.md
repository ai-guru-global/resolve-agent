# MCP Protocol Adapter 集成规格文档

## 1. 需求背景

竞品分析指出，2026 年 Agent 领域的关键趋势之一是 **MCP（Model Context Protocol）协议标准化**。ResolveAgent 当前使用自有的 Skill 系统（基于 Python 沙箱执行），与 MCP 生态不兼容，导致：
- 无法复用社区已有的 MCP 工具（如文件系统、数据库查询、浏览器自动化等）
- 用户需要学习 ResolveAgent 特有的 Skill 格式才能扩展能力
- 与 LangChain、AutoGen 等框架的互操作性差

本规格定义将 MCP 作为 Skill 执行的可选后端，让 ResolveAgent 既能运行原生 Skill，也能调用任意 MCP Server。

## 2. 技术方案

### 2.1 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    Skill Execution Request                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              SkillExecutor (统一执行入口)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ NativeSkill  │  │ MCPAdapter   │  │ Fallback: Direct │  │
│  │   (现有)      │  │   (新增)      │  │   LLM Response   │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Python   │   │ stdio    │   │ HTTP/SSE │
        │ Sandbox  │   │ MCP      │   │ MCP      │
        └──────────┘   └──────────┘   └──────────┘
```

### 2.2 MCPAdapter 设计

新增 `python/src/resolveagent/mcp/` 模块：

- `adapter.py` — `MCPAdapter` 类，实现统一的 `execute(tool_name, params)` 接口
- `client.py` — MCP Client 封装，支持 stdio 和 HTTP/SSE 两种传输
- `registry.py` — MCP Server 注册表，管理 Server 配置和连接池
- `types.py` — MCP 协议类型定义（Tool、Resource、Prompt 等）
- `config.py` — MCP Server 配置解析（mcp_servers.json / resolveagent.yaml 扩展）

### 2.3 配置扩展

在 `resolveagent.yaml` 中新增 `mcp` 配置段：

```yaml
mcp:
  enabled: true
  servers:
    - name: filesystem
      transport: stdio
      command: npx
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
      env:
        HOME: /tmp
    - name: fetch
      transport: http
      url: http://localhost:3001/sse
      headers:
        Authorization: Bearer ${FETCH_TOKEN}
```

### 2.4 与现有 Skill 系统的集成

- SkillManifest 新增 `execution_mode` 字段： `"direct" | "mcp"`
- 当 `execution_mode == "mcp"` 时，通过 MCPAdapter 调用外部工具
- 当 `execution_mode == "direct"` 时，保持现有 Python 沙箱执行
- Intelligent Selector 无需改动，仍基于意图路由到 Skill

## 3. 受影响文件

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `python/src/resolveagent/mcp/__init__.py` | 新增 | 模块入口 |
| `python/src/resolveagent/mcp/adapter.py` | 新增 | MCPAdapter 主类 |
| `python/src/resolveagent/mcp/client.py` | 新增 | MCP Client (stdio/http) |
| `python/src/resolveagent/mcp/registry.py` | 新增 | Server 注册表 |
| `python/src/resolveagent/mcp/types.py` | 新增 | 类型定义 |
| `python/src/resolveagent/mcp/config.py` | 新增 | 配置解析 |
| `python/src/resolveagent/skills/manifest.py` | 修改 | 新增 execution_mode 字段 |
| `python/src/resolveagent/skills/sandbox.py` | 修改 | 集成 MCPAdapter 调用 |
| `python/src/resolveagent/runtime/engine.py` | 修改 | 执行时选择 Native/MCP |
| `configs/resolveagent.yaml` | 修改 | 新增 mcp 配置示例 |
| `python/tests/test_mcp_adapter.py` | 新增 | 单元测试 |

## 4. 边界条件与异常处理

| 边界条件 | 处理策略 |
|---------|---------|
| MCP Server 未启动 | 返回明确错误，fallback 到 Direct LLM 响应 |
| MCP 工具返回非 JSON | 包装为结构化错误，记录日志 |
| 多个 MCP Server 同名工具 | 按注册顺序优先，或显式指定 server.tool_name |
| MCP Server 超时 | 默认 30s 超时，可配置 |
| 沙箱与 MCP 同时启用 | 优先匹配 Native Skill，未匹配时尝试 MCP |

## 5. 数据流路径

```
User Input → Intelligent Selector → Skill Manifest (execution_mode)
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
              execution_mode         execution_mode        execution_mode
                 "direct"               "mcp"              (fallback)
                    │                     │                     │
                    ▼                     ▼                     ▼
            Python Sandbox          MCPAdapter           Direct LLM
                    │                     │                     │
                    ▼                     ▼                     ▼
            Skill Result            Tool Result          LLM Response
```

## 6. 预期成果

1. ResolveAgent 可调用任意 MCP Server（stdio 或 HTTP/SSE）
2. 现有 Skill 系统向后兼容，无需迁移
3. 用户可通过 YAML 配置快速接入社区 MCP 工具
4. 测试覆盖 MCPAdapter 的核心路径（连接、调用、错误处理）

## 7. 与竞品分析的关联

本任务对应竞品分析 **Phase 1 核心能力强化** 中的第 3 项："MCP 协议适配器开发"。通过 MCP 集成，ResolveAgent 将从封闭的技能系统转变为开放的能力平台，与 LangChain、AutoGen 等框架形成互补而非对抗关系。
