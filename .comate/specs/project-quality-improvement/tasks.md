# ResolveAgent 项目质量改进任务计划

- [x] 任务 1: 建立 CI/CD 工作流
    - 1.1: 创建 `.github/workflows/` 目录结构
    - 1.2: 编写 Go 模块 CI 任务（测试、Lint、覆盖率）
    - 1.3: 编写 Python 模块 CI 任务（uv sync、ruff、mypy、pytest）
    - 1.4: 编写 Web 模块 CI 任务（pnpm install、eslint、vitest、tsc build）
    - 1.5: 编写 Docker 构建验证任务（platform、runtime、webui）
    - 1.6: 配置工作流触发条件（push/PR 到 main）和并行策略
    - 1.7: 本地验证工作流 YAML 语法正确

- [x] 任务 2: 统一版本管理
    - 2.1: 同步 `web/package.json` 版本到 `0.3.0`
    - 2.2: 同步 `python/pyproject.toml` 版本到 `0.3.0`
    - 2.3: 同步 `mobile/package.json` 版本到 `0.3.0`
    - 2.4: 同步 `docs-site/package.json` 版本到 `0.3.0`
    - 2.5: 验证所有模块版本一致性

- [x] 任务 3: 拆分巨型 Router 文件
    - 3.1: 创建 `pkg/server/handlers/` 目录
    - 3.2: 提取共享辅助函数（writeJSON、writeError、readJSON）到 `handlers/handlers.go`
    - 3.3: 迁移 Agent 相关 handler 到 `handlers/agent.go`
    - 3.4: 迁移 Skill 相关 handler 到 `handlers/skill.go`
    - 3.5: 迁移 Workflow 相关 handler 到 `handlers/workflow.go`
    - 3.6: 迁移 RAG 相关 handler 到 `handlers/rag.go`
    - 3.7: 迁移 Model/Config/Hook/FTA/Analysis/Corpus 相关 handler 到各自文件
    - 3.8: 迁移 System（健康检查、系统信息）handler 到 `handlers/system.go`
    - 3.9: 重构 `pkg/server/router.go`，仅保留路由注册逻辑
    - 3.10: 验证 Go 编译通过，确保所有路由和 handler 可正常访问

- [x] 任务 4: Web 路由懒加载优化
    - 4.1: 分析 `web/src/App.tsx` 中所有页面导入，确定拆分策略
    - 4.2: 将所有页面组件改为 `React.lazy` 动态导入
    - 4.3: 在路由层级或 `MainLayout` 中添加 `Suspense` 与 fallback UI
    - 4.4: 验证 `pnpm build` 产出包含多个 chunk，且路由切换正常

- [x] 任务 5: 收紧 MyPy 类型检查配置
    - 5.1: 修改 `python/pyproject.toml`，移除过度禁用的 mypy 错误代码（保留 `ignore_missing_imports`）
    - 5.2: 启用 `warn_return_any = true` 和 `warn_unused_ignores = true`
    - 5.3: 运行 mypy 检查，记录所有暴露的类型错误
    - 5.4: 修复 `engine.py` 中的核心类型问题（优先处理）
    - 5.5: 修复 `selector.py` 中的核心类型问题
    - 5.6: 修复其他核心模块的类型问题，确保 `uv run mypy` 通过

- [x] 任务 6: Web 前端测试基础设施
    - 6.1: 确认 Vitest 和 Testing Library 配置正确
    - 6.2: 为 `web/src/App.tsx` 编写基础路由挂载测试
    - 6.3: 为核心页面组件编写渲染测试（至少 2 个页面）
    - 6.4: 运行 `pnpm test`，确保测试套件通过

- [x] 任务 7: Python 核心模块测试
    - 7.1: 确认 pytest 和 pytest-asyncio 配置正确
    - 7.2: 为 `ExecutionEngine` 编写单元测试（agent pool、默认创建、事件流）
    - 7.3: 为 conversation history 管理编写测试
    - 7.4: 为 `IntelligentSelector` 路由决策编写测试
    - 7.5: 运行 `uv run pytest`，确保测试套件通过

- [x] 任务 8: 修复健康检查端点不一致
    - 8.1: 在 router（或 system handler）中注册 `GET /healthz` 路由
    - 8.2: 确保 `/healthz` 和 `/api/v1/health` 返回相同响应
    - 8.3: 验证 Dockerfile 中 HEALTHCHECK 指令可正常工作

- [x] 任务 9: 安全配置加固
    - 9.1: 将 `configs/resolveagent.yaml` 中默认数据库密码改为空字符串并添加注释
    - 9.2: 更新 `.env.example`，添加所有关键环境变量和说明
    - 9.3: 在 `pkg/config/config.go` 中添加敏感字段缺失检测和警告日志
    - 9.4: 验证配置加载在密码为空时的行为合理

- [x] 任务 10: PostgreSQL Registry 持久化层
    - 10.1: 设计 `RegistryStore` 接口（基于现有 InMemory 接口的持久化扩展）
    - 10.2: 在 `pkg/store/postgres/` 中实现通用 CRUD 辅助函数
    - 10.3: 实现 `PostgresAgentRegistry`
    - 10.4: 实现 `PostgresSkillRegistry`
    - 10.5: 实现 `PostgresWorkflowRegistry`
    - 10.6: 实现其余 Registry 的 PostgreSQL 版本（RAG、Hook、Memory 等）
    - 10.7: 在 `server.New` 中根据配置选择 InMemory 或 PostgreSQL 实现
    - 10.8: 编写 PostgreSQL Registry 的集成测试
