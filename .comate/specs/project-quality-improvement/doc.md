# ResolveAgent 项目质量改进规格文档

## 1. 需求背景

基于项目质量评估报告，ResolveAgent 当前在架构设计、文档完整性方面表现良好，但在 **CI/CD 流程、版本管理、代码结构、测试覆盖、类型安全和性能优化** 等方面存在明显短板。本规格文档定义系统化的改进方案，分三批次执行。

## 2. 改进范围与优先级

### 批次一：基础设施与代码结构（P0）

#### 2.1 建立 CI/CD 工作流
- **场景**：当前 `.github/workflows/` 目录完全缺失，无任何自动化测试、构建、发布流程
- **方案**：创建 `.github/workflows/ci.yaml`，覆盖以下阶段：
  - Go 模块：下载依赖、运行 `go test -race -cover`、运行 `golangci-lint`
  - Python 模块：`uv sync`、运行 `ruff check`、`mypy`、运行 `pytest`
  - Web 模块：`pnpm install`、运行 `eslint`、运行 `vitest`、运行 `tsc -b && vite build`
  - Docker 镜像构建验证（platform/runtime/webui）
- **触发条件**：`push` 到 `main` 分支、`pull_request` 到 `main` 分支
- **受影响文件**：新增 `.github/workflows/ci.yaml`

#### 2.2 统一版本管理
- **场景**：各模块版本号严重不一致
  - `VERSION` 文件：`0.3.0`
  - `web/package.json`：`0.1.0`
  - `python/pyproject.toml`：`0.1.0`
  - `mobile/package.json`：`1.0.0`
  - `docs-site/package.json`：`0.1.0`
- **方案**：以 `VERSION` 文件（`0.3.0`）为单一事实来源，同步更新所有 package.json 和 pyproject.toml
- **受影响文件**：
  - `web/package.json`
  - `python/pyproject.toml`
  - `mobile/package.json`
  - `docs-site/package.json`

#### 2.3 拆分巨型 Router 文件
- **场景**：`pkg/server/router.go` 高达 2160 行，同时包含路由注册和所有 HTTP Handler 实现，违反单一职责原则
- **方案**：按领域拆分为独立的子路由模块，每个模块包含该领域的路由注册和 Handler：
  - `pkg/server/handlers/agent.go` — Agent CRUD + 执行
  - `pkg/server/handlers/skill.go` — Skill 注册/注销
  - `pkg/server/handlers/workflow.go` — Workflow CRUD + 执行/验证
  - `pkg/server/handlers/rag.go` — RAG Collection/Document/查询
  - `pkg/server/handlers/model.go` — 模型管理
  - `pkg/server/handlers/config.go` — 配置管理
  - `pkg/server/handlers/hook.go` — Hook 管理
  - `pkg/server/handlers/fta.go` — FTA 文档管理
  - `pkg/server/handlers/analysis.go` — 代码分析
  - `pkg/server/handlers/corpus.go` — 语料导入
  - `pkg/server/handlers/system.go` — 健康检查、系统信息
  - `pkg/server/handlers/handlers.go` — 共享的 Handler 基础结构、Response 辅助函数
- `pkg/server/router.go` 精简为仅负责将各子路由挂载到 `http.ServeMux`
- **边界条件**：保持所有现有 API 路径和响应格式不变，确保向后兼容

#### 2.4 Web 路由懒加载
- **场景**：`web/src/App.tsx` 直接静态导入 40+ 页面组件，未使用 `React.lazy`，导致首屏加载所有页面代码
- **方案**：将所有页面组件改为 `React.lazy(() => import(...))` 动态导入，在 `MainLayout` 或路由级别添加 `Suspense` fallback
- **受影响文件**：`web/src/App.tsx`、`web/src/components/Layout/MainLayout.tsx`（可能需要添加 Suspense）

#### 2.5 收紧 MyPy 类型检查配置
- **场景**：`python/pyproject.toml` 中 mypy 配置禁用了 `attr-defined`、`call-arg`、`assignment`、`return-value`、`arg-type`、`union-attr` 等核心检查，类型安全形同虚设
- **方案**：
  1. 移除过度禁用的错误代码，保留 `ignore_missing_imports = true`（第三方库无类型声明属正常情况）
  2. 设置 `strict = false`（避免一次性引入过多严格模式错误），但启用 `warn_return_any = true`、`warn_unused_ignores = true`
  3. 逐步修复暴露出的类型错误（优先修复核心模块 `engine.py`、`selector.py`）
- **受影响文件**：`python/pyproject.toml`、`python/src/resolveagent/**/*.py`

### 批次二：测试基础设施（P1）

#### 2.6 Web 前端测试基础设施与核心测试
- **场景**：Vitest 和 Testing Library 已作为 devDependencies 配置，但项目中没有任何 `.test.{ts,tsx}` 文件
- **方案**：
  1. 为 `web/src/pages/Home.tsx`（或存在的核心页面）添加基础渲染测试
  2. 为 `web/src/App.tsx` 添加路由挂载测试
  3. 验证测试基础设施可正常运行（`pnpm test` 通过）
- **受影响文件**：新增测试文件

#### 2.7 Python 核心模块测试
- **场景**：`python/tests/` 目录存在但无测试文件，pytest 已在 pyproject.toml 中配置
- **方案**：
  1. 为 `python/src/resolveagent/runtime/engine.py` 中的 `ExecutionEngine` 添加单元测试：
     - 测试 agent 加载（从 pool 和默认创建）
     - 测试 execute 方法的基本事件流
     - 测试 conversation history 管理
  2. 为 `python/src/resolveagent/errors.py`（如果存在）或核心工具函数添加测试
- **受影响文件**：新增 `python/tests/test_engine.py`、`python/tests/test_selector.py` 等

#### 2.8 修复健康检查端点不一致
- **场景**：`deploy/docker/platform.Dockerfile` 中 `HEALTHCHECK` 调用 `http://localhost:8080/healthz`，但 `pkg/server/router.go` 注册的是 `/api/v1/health`，两者路径不一致
- **方案**：在 router 中额外注册 `GET /healthz` 路由，指向相同的健康检查 handler，确保与 Dockerfile 兼容
- **受影响文件**：`pkg/server/router.go`（或拆分后的 `pkg/server/handlers/system.go`）

### 批次三：安全与持久化（P2）

#### 2.9 安全配置加固
- **场景**：`configs/resolveagent.yaml` 中数据库密码明文存储（`password: resolveagent`）
- **方案**：
  1. 将默认密码改为空字符串 `""` 并添加注释说明必须通过环境变量设置
  2. 更新 `.env.example` 添加所有关键环境变量说明
  3. 在 config 加载逻辑中添加敏感字段缺失警告日志
- **受影响文件**：`configs/resolveagent.yaml`、`.env.example`、`pkg/config/config.go`

#### 2.10 实现 PostgreSQL Registry 持久化层
- **场景**：`configs/resolveagent.yaml` 配置 `store.backend: "postgres"`，但所有 Registry 均为 `InMemory` 实现，存在"配置与实现不一致"
- **方案**：
  1. 在 `pkg/store/postgres/` 中实现 `RegistryStore` 接口，提供基于 pgx 的 CRUD 操作
  2. 为各 Registry 添加 PostgreSQL 实现（`PostgresAgentRegistry` 等），通过配置切换
  3. 保持 InMemory 实现作为开发和测试的默认选项
- **受影响文件**：`pkg/store/postgres/registry_store.go`、各 `pkg/registry/*.go`

## 3. 技术方案

### 3.1 Go 后端拆分策略
- 使用 Go 1.22+ 的 `http.ServeMux` 模式，子 handler 函数接收 `*Server` 实例作为参数或嵌入到 handler 结构体中
- 共享的 response 辅助函数（`writeJSON`, `writeError`, `readJSON`）提取到 `pkg/server/handlers/handlers.go`
- 保持现有 handler 方法签名不变（`func (s *Server) handleXxx(w, r)`），通过 `s *Server` 访问 registry 和 runtimeClient

### 3.2 CI/CD 工作流策略
- 使用 `actions/setup-go@v5`、`actions/setup-python@v5`、`actions/setup-node@v4`
- Python 使用 `astral-sh/setup-uv@v3` 设置 uv 环境
- Web 使用 `pnpm/action-setup@v4`
- Docker 构建使用 `docker/build-push-action@v5`，但仅做构建验证（不推送），推送留给 release 工作流
- 并行执行各模块任务以缩短总耗时

### 3.3 测试策略
- Web：使用 Vitest + React Testing Library，测试组件渲染和交互
- Python：使用 pytest + pytest-asyncio，测试异步执行引擎
- Go：使用标准 `testing` 包，mock registry 和 runtimeClient

## 4. 边界条件与异常处理

| 边界条件 | 处理策略 |
|---------|---------|
| Router 拆分后 API 行为不一致 | 所有现有测试通过后再合并；保持 handler 方法签名和响应格式不变 |
| MyPy 收紧导致大量错误 | 分阶段收紧：先移除最不关键的禁用项，修复后再继续 |
| React.lazy 导致路由闪烁 | 在 MainLayout 层级添加统一的 Suspense fallback UI |
| CI 中 Python 依赖下载慢 | 使用 uv 的缓存机制和 GitHub Actions cache |
| PostgreSQL Registry 实现复杂度高 | 先实现一个（AgentRegistry）作为模板，其余按相同模式实现 |

## 5. 数据流路径

### CI/CD 数据流
```
Push/PR -> GitHub Actions -> Parallel Jobs:
  - Go: checkout -> setup-go -> go mod download -> go test -race -> golangci-lint
  - Python: checkout -> setup-uv -> uv sync -> ruff check -> mypy -> pytest
  - Web: checkout -> setup-pnpm -> pnpm install -> eslint -> vitest -> tsc + build
  - Docker: checkout -> docker build (platform/runtime/webui) --no-push
```

### Router 拆分数据流
```
HTTP Request -> ServeMux -> router.go (dispatch) -> handlers/*.go (domain handler)
                                       -> shared helpers (writeJSON, readJSON)
```

## 6. 预期成果

1. **CI/CD**：每次 push/PR 自动运行测试和 Lint，失败则阻止合并
2. **版本统一**：所有模块版本号一致为 `0.3.0`
3. **代码结构**：`router.go` 从 2160 行缩减至 <100 行，各领域 handler 独立文件 <300 行
4. **Web 性能**：首屏加载仅下载必要代码，其他页面按需加载
5. **类型安全**：Python 核心模块通过 mypy 检查，无 `Any` 滥用
6. **测试覆盖**：Web 和 Python 至少拥有基础测试套件，CI 中可运行
7. **健康检查**：Docker HEALTHCHECK 正常工作
8. **安全**：默认配置不再包含硬编码密码
