# MCP Protocol Adapter 集成任务计划

- [x] 任务 1: MCP 模块基础结构
    - 1.1: 创建 `python/src/resolveagent/mcp/` 目录和 `__init__.py`
    - 1.2: 创建 `types.py`，定义 MCP Tool、Resource、Prompt 等数据类
    - 1.3: 创建 `config.py`，解析 mcp_servers.json / YAML 配置

- [x] 任务 2: MCP Client 实现
    - 2.1: 创建 `client.py`，实现 `MCPClient` 基类
    - 2.2: 实现 `StdioMCPClient`（子进程通信）
    - 2.3: 实现 `HTTPMCPClient`（HTTP/SSE 通信）
    - 2.4: 实现连接生命周期管理（connect/close/health_check）

- [x] 任务 3: MCP Registry 与 Adapter
    - 3.1: 创建 `registry.py`，管理 MCP Server 配置和连接池
    - 3.2: 创建 `adapter.py`，实现统一的 `execute(tool_name, params)` 接口
    - 3.3: 实现工具发现（list_tools）和参数校验

- [x] 任务 4: 与现有 Skill 系统集成
    - 4.1: 修改 `skills/manifest.py`，新增 `execution_mode` 字段
    - 4.2: 修改 `skills/sandbox.py`，根据 execution_mode 路由到 Native 或 MCP
    - 4.3: 修改 `runtime/engine.py`，传递 MCP 配置到执行层

- [x] 任务 5: 配置与测试
    - 5.1: 修改 `configs/resolveagent.yaml`，添加 mcp 配置示例
    - 5.2: 创建 `python/tests/test_mcp_adapter.py`，测试连接、调用、错误处理
    - 5.3: 运行 `uv run pytest tests/test_mcp_adapter.py -v`

- [x] 任务 6: 验证与文档
    - 6.1: 运行 `uv run mypy python/src/resolveagent/mcp/`
    - 6.2: 运行 `ruff check python/src/resolveagent/mcp/`
    - 6.3: 更新 `docs/zh/skill-system.md` 添加 MCP 集成说明
