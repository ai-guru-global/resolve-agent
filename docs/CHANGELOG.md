# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

> 覆盖 2026-04-08 至 2026-10-04 的 160 次提交。仓库自 `[0.3.0]` 之后未打过任何 git tag，
> `VERSION` 仍为 `0.3.0`，故本段暂记为 Unreleased；下一次发版时再切分为具体版本号。
> 本节由 git log 逐条归纳回填，只记录能在提交或代码中找到证据的变更。

### Added

#### Python 运行时

- **MCP（Model Context Protocol）适配器** (`python/src/resolveagent/mcp/`) — `adapter` / `client` / `config` / `registry` / `types` 五个模块，把外部 MCP server 的工具暴露为运行时可调用能力
- **LangGraph 集成** (`python/src/resolveagent/integrations/langgraph/`) — `builder.py` 把 FTA 工作流编译为 LangGraph 图，`node.py` 提供节点适配
- **Dify 插件** (`integrations/dify/resolveagent-dify/`) — 含 `manifest.yaml`、provider 定义与 `code_diagnosis`、`fta_analyzer` 两个工具，可在 Dify 中直接调用 ResolveAgent
- **FTA 并行评估器** (`python/src/resolveagent/fta/parallel_evaluator.py`) — 独立子事件并发求值
- **多语言代码分析** (`python/src/resolveagent/code_analysis/parsers/`) — tree-sitter 通用解析器 + Python 专用解析器 + `factory.py` 按语言分发
- **外部语料导入与 RAG 入库** — `corpus/kudig_rag_import.py`、`corpus/call_chain_rag_generator.py`，配套 `internal/cli/corpus/`（Go CLI）与 `scripts/import-kudig-solutions.ts`
- **FTA 蒙特卡洛仿真器** — Bernoulli 采样、动态门传播（含 `PRIORITY_AND` 时序语义）、Wilson 置信区间；`FTAEngine.execute` 注入 simulation 数据，`analyze` 组合 MOCUS 割集与仿真结果
- **FTA 概率模型** — `FTAEvent` 新增 `probability` 字段；`FaultTree.validate` 校验 `INHIBIT` 门缺失 conditioning 输入
- **Selector 自适应权重** — `AdaptiveWeightAdjuster` 接线至选择链：会话级 `record_outcome` / `decay`，备选路由按权重降序稳定排序
- **Agent 核心模块落地** — `memory.py`（三层记忆）、`message_bus.py`（Agent 消息总线）、`planning.py`（混合规划器）、`toolhub.py`（能力发现与安全策略）、`resilience.py`（熔断与降级级联）、`selector/audit.py`（决策审计）、`selector/resilient_selector.py`。
  > 注：截至本次回填，仅 `CircuitBreaker` 与 `DecisionAuditLogger` 在 `python/src/` 内有生产调用点，其余模块只有单测覆盖、尚未接线，逐项证据见 `docs/ARCHITECTURE_IMPROVEMENTS_2026.md` 的「实施状态复核（2026-10-04）」小节。
- **生命周期 Hook 链默认启用** — `HookStore` 协议化；短路钩子的 `modified_data` 现在会回写 ctx；可用 `RESOLVEAGENT_HOOKS_DISABLED` 关闭
- **gRPC SelectorService shim** — routing 逻辑抽取为共享 `RoutingService`，proto 桩生成物入 `resolveagent.v1`（lint/mypy 已排除），设置 `RESOLVEAGENT_GRPC_PORT` 时可选双栈启动
- **Solution Registry 落 Postgres** — 迁移 v16 新增 `solutions` / `solution_executions` 表；store 层 Postgres 实现（sentinel 错误同构、`tags`/`metadata` JSONB 回读、独立连接验证重启不丢数据）；server 层接线，内存实现保留为无 DB 时的默认

#### Go 平台服务

- **共享基础库** — `pkg/errors`（sentinel 错误与链式包装）、`pkg/health`、`pkg/logger`、`pkg/retry`，四者均带单测
- **Registry 扩展** — `call_graph.go`、`code_analysis.go`、`fta_document.go`
- **Server handler 按域拆分** — `agent` / `analysis` / `callgraph` / `config` / `fta` / `hook` / `memory` / `model` / `rag` / `skill` / `system` / `traffic` / `workflow` 十三个 handler 文件 + 统一 `response.go`
- **OpenAPI 契约测试** — 以 `router.go` 的 95 条路由注册为契约唯一事实源，双向断言同时防缺漏与防幻影端点

#### WebUI 与移动端

- **移动端 AIOps 诊断应用** — 初版落在顶层 `Mobile/`，后降级为 `examples/mobile-demo`（见 Removed）
- **Traces / Monitoring 页面接入 mock 端点**，Trace 与 Monitoring 的数据类型下沉至公共类型层
- **Mock 数据按域拆分** — 拆至 `web/src/api/mock/`，`mock.ts` 仅保留 `mockApi` 编排；配套演示数据新鲜度守卫测试与控制台「演示模式」标识徽标
- **全域去假化改造** — Dashboard、Monitoring、Agents、Skills、Solutions、Workflows、Tickets、GTM 八个域接入实时数据或高质量演示数据：可用性/闭合率去假化、部署状态机、`last_execution_at`、LTM 删除、协作时间字段、技能状态真值与 Agent 引用反查、方案列表过滤器与新建/编辑表单、执行详情深度渲染与管线 trace 按路由差异化
- **架构可视化页** — Memory / Planner / ToolHub 三张 Architecture 页面

#### 工程与治理

- **质量门禁** — `hack/quality-gate.sh` 收口；Go 工具链钉在与 CI 同源的 `go1.25.6`；覆盖率基线按同工具链重测并写入 `test/fixtures/baseline/coverage-baseline.json`
- **E2E 体系** — 统一构建标签、支持 `E2E_BASE_URL` 覆盖服务地址、`E2E_STRICT` 防假绿；本地全绿验证 Go server + Python runtime 启动链路
- **Go 测试补全** — `internal/cli/{agent,config,corpus,rag,skill,workflow}`、`internal/tui/{styles,views}`、`pkg/event`、`pkg/server`（含 middleware）、`pkg/service`、`pkg/store/redis`、`pkg/version`、`test/e2e/helper_test.go`
- **仓库元数据** — `VERSION`、`NOTICE`、根 `ROADMAP.md`、`CONTRIBUTING.md`、`api/openapi/v1/resolveagent.yaml`、`examples/quickstart/`、`docs/adr|api|dev-guide|ops/` 目录骨架

### Changed

- **CI 流水线合并** — 重复 workflow 合并为单一 `.github/workflows/ci.yaml`，Go 版本对齐 1.25，新增 e2e / mobile / docker 阶段
- **golangci-lint 治理** — errcheck 全量修复（可处置错误真实处理，不可处置错误显式弃置）；revive 全量修复（补包注释与导出符号文档，消除命名 stutter）；gofumpt 统一格式；gocritic / errorlint / govet / gosec / unparam / nilerr / unused / staticcheck 判断性修复（真实处理或注明理由）
- **错误体系收敛** — registry 裸错误统一为 `pkg/errors` sentinel 链式包装，helpers 补 `Cause`（TDD 先行）；新增统一出口 `writeRegistryError`，sentinel 映射 HTTP 状态、内部错误只记日志；postgres store 错误同构 sentinel 化
- **`ResilientSelector` 支持注入 `weight_adjuster`**；`PRIORITY_AND` 注释注明为静态近似
- **WebUI 容器与安装严格化** — webui 容器非 root 化，`pnpm install` 严格化
- **文档归一** — `documentation/` 并入 `docs/archive/`；docs-site 内容归一至 `docs/` 唯一源，站点壳薄化为引导页，sidebars 修复 9 个幻影 id
- **OpenAPI 补全至 95 条操作**与 router 一致，17 域 tags 全覆盖，附枚举脚本辅助人工核对
- **类型与静态检查** — MegaAgent 懒加载属性补齐 `Optional` 类型注解（消除 15 处 mypy 错误）；skills `outputs` 变量补 `dict` 类型标注
- **运行期产物出库** — `.pids/` 下的运行期 pid 移出版本控制
- **依赖升级** — Go：`google.golang.org/grpc` 1.79.3、`spf13/viper` 1.21.0、`spf13/cobra` 1.10.2、`charmbracelet/lipgloss` 1.1.0、`charmbracelet/bubbletea` 1.3.10；Python：`agentscope>=1.0.18`、`pytest>=9.0.3`、`mypy>=1.20.0`、`httpx>=0.28.1`；Web：`vite` ^8、`@vitejs/plugin-react` ^6、`eslint/js` 10.0.1、`eslint-plugin-react-hooks` 7.0.1；镜像与 Action：`golang` 1.26-alpine、`python` 3.14-slim、`node` 25-alpine、`nginx` 1.29-alpine、`alpine` 3.23、`golangci-lint-action` v9、`codecov-action` 5、`build-push-action` 7、`setup-python` 6、`setup-node` 6

### Fixed

- **三个长期红灯的 CI 门禁** — golangci-lint 由 `go install .../v2/cmd/golangci-lint@v1.64`（v2 模块路径配 v1 版本号，无法解析）迁至 v2 action；pnpm workspace 配置收敛为单一来源（修 `ERROR packages field missing or empty`）；gitleaks 由需要 `GITLEAKS_LICENSE` 的第三方 action 改为官方镜像 `docker run`
- **运行时缺陷** — skill execute 端点旧签名调用、`TrafficGraphClient` 地址拼接、三处类型错误（补 4 个端点测试）
- **信息泄漏** — `writeRegistryError` 对未知错误码不再回显原始消息，统一走通用 500 防泄漏路径
- **Milvus 永久阻塞** — `MilvusClient` 连接显式设 10s 超时；pymilvus 2.6 默认 `None` 会在 Milvus 宕机时永久阻塞 `connect`
- **Web 依赖错配** — 清理误提交的冲突标记；`react-dom` / `@types/react-dom` 回退 18 与 `react` 18 配对，保留 `vite` ^8 + `plugin-react` ^6
- **E2E 脆弱性** — 删除弃用的 migrate/seed 预跑；`sleep 5` 换成 `/healthz` 探活循环；反馈环测试适配 `*Config` / `*Signal` 新签名（`-tags e2e` 编译恢复）
- **门禁脚本自身缺陷** — `quality-gate.sh` 自增改用算术展开，规避 `set -e` 下 `((x++))` 返回非零导致退出；golangci-lint 的 govet 改 v1 写法并用 goinstall 构建，解决 Go 1.25 兼容与 schema 校验
- **测试代码问题** — 契约测试预分配 routes；solution 测试内层 `err` 遮蔽按 `uerr` / `derr` 模式重命名
- **移动端 TypeScript 构建错误**
- **Resilient selector 7 项 gap 全部关闭**（源自 gap 分析文档）
- **文档失实修正** — 撤下 README 中 proto/gRPC 业务面的失实宣传（互联实际仅 HTTP/SSE，9090 为健康检查与反射端口）；复核 `docs/ARCHITECTURE_IMPROVEMENTS_2026.md` 全部 7 项改进的真实状态，纠正 `go.mod` 版本回退与 gRPC stub 位置两处失实声明；修正 `docs/design/06-memory-planner-toolhub.md` 中失效的行号锚点；`docs/design/00-overview.md` 的 gRPC 现状改写为「只有半边」并列出两处会误导读者的残留
- **本地部署文档 Step 3** — 数据库迁移由平台启动时自动执行，不再要求手工跑 `scripts/migration/*.sql`；`scripts/seed/seed.sql` 头部行数统计同步为实测值
- **覆盖率基线校准** — Go 快照 17.5 → 17.1（自 2026-09-11 起 29 次提交带来的真实回落），Python 门禁阈值 42.0 → 42.5（实测 42.86%，打印为 43%）；`minimum_go_coverage` 刻意保持 17.0 不抬升，避免对一个正在下行的指标设零余量门槛

### Removed

- `README 2.md` 与 `docs/design/03-fta 2.md` 两份陈旧副本
- `docs/ROADMAP.md` — 内容合并入根 `ROADMAP.md`，消除两份路线图分歧
- 顶层 `Mobile/` 原型 — 降级迁移为 `examples/mobile-demo` 示例，CI 与文档路径同步
- 跟踪残留清理 — `client 2.ts`、占位包、`test-load`、陈旧的 `coverage.out` 磁盘残留

### Security

- **gitleaks 全历史秘钥扫描 + CodeQL 静态分析（go / python）进 CI**
- **Trivy 镜像扫描上发布卡口**，发布镜像名对齐消费端 `resolveagent-*`
- **WebUI 容器非 root 化**
- **新增 `.gitleaks.toml`** 处置 4 处既有误报，使全历史扫描可以在不放宽规则的前提下通过
- **统一 500 出口不再回显内部错误消息**（见 Fixed）

### Deprecated

- `scripts/migration/*.sql` — 与 `pkg/store/postgres/postgres.go` 的 `Migrate()` 内联迁移链（版本 1–16）双轨并存，schema 命名（`resolveagent` vs `public`）与主键类型（UUID vs `VARCHAR(64)`）均不兼容；内联链是唯一会在启动时执行的路径，SQL 脚本已不再被任何文档或流程引用
- `python/src/resolveagent/api/` — buf 生成物的占位目录，从未真正生成过（`buf` 未安装，同模板的 Go 产物 `pkg/api` 也不存在）；运行时实际使用的桩在 `resolveagent/v1/`

## [0.3.0] - 2026-04-07

### Added

- **WebUI Mock Data System** (`web/src/api/mock.ts`)
  - 7 realistic AIOps agents covering mega/fta/rag/skill/custom types
  - 6 operational skills (ticket-handler, log-analyzer, metric-alerter, etc.)
  - 5 FTA workflows (K8s NotReady, RDS replication lag, SLB health check, etc.)
  - 5 RAG knowledge base collections with real document/vector counts
  - Context-aware agent execution responses per agent type
  - Auto-detect backend availability with transparent mock fallback

### Changed

- **Unified deploy directory** — merged `deployment/docker/` (production configs) into `deploy/docker/`, eliminating duplicate deployment configurations
- **Cleaned root directory** — removed 6 process documents (DEVELOPMENT_PLAN, PROJECT_COMPLETION, QUALITY_REPORT, UNIMPLEMENTED, WEEK5_FIXES, WEEK6_FIXES), 2 committed binaries, and consolidated community governance files into `.github/`
- **Updated .gitignore** — added root-level binary exclusions, fixed stale `resolvenet` references to `resolveagent`

### Fixed

- **AgentList.tsx** — added missing `AgentStatus` type import, fixed default-to-named import for `api`, corrected `listAgents()` return value destructuring
- **DataTable.tsx** — removed trailing redundant `}` braces causing Babel parse errors
- **Playground** — fixed `listAgents()` response handling and `executeAgent()` content field access

## [0.2.0-beta] - 2026-04-02

### Added - Complete Feature Implementation

#### Week 5: Critical Gap Fixes
- **Go ↔ Python HTTP Bridge** (`pkg/server/runtime_client.go`, `python/src/resolveagent/runtime/http_server.py`)
  - HTTP + SSE streaming as gRPC alternative
  - Full Agent/Workflow/RAG/Skill forwarding from Go platform to Python runtime

- **RAG Vector Store** (`python/src/resolveagent/rag/pipeline.py`)
  - Real vector database queries replacing placeholder responses
  - Milvus index integration

- **Selector Registry Queries** (`python/src/resolveagent/selector/context_enricher.py`)
  - Real registry lookups replacing mock data

- **Built-in Skills** (`python/src/resolveagent/skills/builtin/file_ops.py`)
  - Complete file operations implementation (read, write, list, search)

#### Week 6: Final Polish (100% Feature Completion)
- Workflow validation logic in `pkg/server/router.go`
- LLM Strategy integration in selector
- OpenTelemetry span creation (Go) and OTLP exporter init (Python)
- Agent config loading and workflow registry loading
- E2E tests (3 test cases added)

#### Week 1-4: Core Implementation
- **PostgreSQL Storage Layer** (`pkg/store/postgres/`)
  - pgx connection pool with health checks
  - Automatic database migrations (5 schemas)
  - Full CRUD operations for agents, skills, workflows
  - Connection pool optimization (max 25 conns)

- **Redis Cache Layer** (`pkg/store/redis/`)
  - go-redis client with connection pooling
  - Get/Set/Delete operations with TTL support
  - JSON serialization helpers
  - Health check via PING

- **NATS JetStream** (`pkg/event/nats.go`)
  - Full NATS connection management
  - JetStream initialization with 4 streams
  - Publish/Subscribe with message persistence
  - Automatic ACK handling

- **LLM Providers** (`python/src/resolveagent/llm/`)
  - Qwen (通义千问) via DashScope API
  - Wenxin (文心一言) via Baidu Qianfan API with JWT auth
  - Zhipu (智谱清言) via GLM API with streaming
  - OpenAI-compatible layer for vLLM/Ollama

#### Week 2: CLI Tools (18 Commands)
- **Agent CLI** (`internal/cli/agent/`)
  - `agent create` - Create agents with YAML/config
  - `agent list` - List all agents with filters
  - `agent delete` - Delete with confirmation
  - `agent run` - Execute agents interactively
  - `agent logs` - View execution logs

- **Skill CLI** (`internal/cli/skill/`)
  - `skill list` - List installed skills
  - `skill info` - Show skill details
  - `skill install` - Install from local/git/registry
  - `skill remove` - Uninstall skills
  - `skill test` - Test skills with input

- **Workflow CLI** (`internal/cli/workflow/`)
  - `workflow create` - Create from YAML
  - `workflow list` - List all workflows
  - `workflow validate` - Validate definitions
  - `workflow visualize` - ASCII tree rendering
  - `workflow run` - Execute workflows

- **RAG CLI** (`internal/cli/rag/`)
  - `rag collection create/list/delete` - Manage collections
  - `rag ingest` - Document ingestion with chunking
  - `rag query` - Vector search queries

- **Config CLI** (`internal/cli/config/`)
  - `config init` - Initialize configuration
  - `config set/get/view` - Manage settings

#### Week 3: Core Engine Features
- **FTA Engine** (`python/src/resolveagent/fta/`)
  - MOCUS algorithm for minimal cut sets
  - Support for AND/OR/VOTING/INHIBIT/PRIORITY_AND gates
  - Cut set probability calculation
  - Importance ranking

- **FTA Evaluator** (`python/src/resolveagent/fta/evaluator.py`)
  - Skill execution integration
  - RAG query integration
  - LLM classification support
  - Static value and context evaluation

- **RAG Reranker** (`python/src/resolveagent/rag/retrieve/reranker.py`)
  - BGE-Reranker cross-encoder support
  - LLM-based reranking fallback
  - Frequency-based scoring fallback
  - MMR (Maximal Marginal Relevance) diversity selection

- **RAG Server API** (`pkg/server/router.go`)
  - Collection CRUD endpoints
  - Document ingestion API
  - Vector search queries
  - RAG Registry implementation

- **Execution Engine** (`python/src/resolveagent/runtime/engine.py`)
  - Full execution flow with streaming
  - Conversation history management
  - Intelligent Selector integration
  - Agent pool management

- **Skill Executor** (`python/src/resolveagent/skills/executor.py`)
  - Input/output validation (manifest schema)
  - Sandbox execution integration
  - Subprocess isolation
  - Execution history tracking

#### Week 4: Observability & WebUI
- **OpenTelemetry Tracing** (`pkg/telemetry/tracer.go`)
  - OTLP gRPC exporter
  - Distributed tracing support
  - Span management and event recording
  - Trace context propagation

- **OpenTelemetry Metrics** (`pkg/telemetry/metrics.go`)
  - Prometheus HTTP exporter
  - Runtime metrics (goroutines, memory)
  - Business metrics (requests, latency, agent executions)

- **Telemetry Middleware** (`pkg/server/middleware/telemetry.go`)
  - HTTP request tracing
  - Metrics collection
  - Response status capture

- **WebUI API Integration**
  - AgentCreate with API integration
  - AgentList with real-time data
  - Playground with agent execution

### Testing
- Unit tests for registry package (54.4% coverage)
- Unit tests for CLI client (30% coverage)
- Unit tests for telemetry package
- Go build and vet validation
- Python syntax validation

## [0.1.0-alpha] - 2026-03-22

### Added - Initial Release
- Project scaffolding with Go + Python + TypeScript
- Protocol Buffer API definitions
- Go platform services skeleton
- Go CLI with cobra/viper
- Go TUI with bubbletea
- Python agent runtime with AgentScope integration
- Intelligent Selector routing framework
- FTA Workflow Engine skeleton
- Skill System with manifest support
- RAG Pipeline framework
- React + TypeScript WebUI skeleton
- Docker Compose deployment
- Kubernetes/Helm charts
- CI/CD pipelines

## Migration Guide

### From 0.1.0-alpha to 0.2.0-beta

All APIs remain backward compatible. New features are additive only.

**Required Actions:**
1. Update dependencies: `make setup-dev`
2. Run database migrations: `resolveagent-server migrate`
3. Update LLM provider configurations if using Wenxin/Zhipu

**New Environment Variables:**
```bash
# OpenTelemetry
export OTEL_EXPORTER_OTLP_ENDPOINT="localhost:4317"
export OTEL_ENVIRONMENT="production"

# Prometheus Metrics
export PROMETHEUS_PORT="9090"
```
