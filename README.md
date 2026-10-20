<p align="center">
  <img src="docs/assets/logo.svg" alt="ResolveAgent Logo" width="200">
</p>

<h1 align="center">ResolveAgent</h1>

<p align="center">
  <strong>2026 Agent Engineering | 面向问题解决的生产级 AIOps 智能体平台</strong>
</p>

<p align="center">
  <strong>Production-grade AIOps Mega-Agent Platform for Troubleshooting &amp; Resolution</strong>
</p>

<p align="center">
  <code>🧠 Intelligent Selector</code> · <code>🌳 Hybrid Planner</code> · <code>💾 Hierarchical Memory</code> · <code>🔍 FTA Engine</code> · <code>🔧 ToolHub</code> · <code>🔄 Loop Engineering</code>
</p>

<p align="center">
  <a href="https://github.com/ai-guru-global/resolve-agent/releases"><img src="https://img.shields.io/github/v/release/ai-guru-global/resolve-agent?style=flat-square" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square" alt="License"></a>
  <a href="https://github.com/ai-guru-global/resolve-agent/actions"><img src="https://img.shields.io/github/actions/workflow/status/ai-guru-global/resolve-agent/ci.yaml?branch=main&style=flat-square" alt="CI Status"></a>
  <a href="https://github.com/ai-guru-global/resolve-agent/issues"><img src="https://img.shields.io/github/issues/ai-guru-global/resolve-agent?style=flat-square" alt="Issues"></a>
  <a href="https://github.com/ai-guru-global/resolve-agent/stargazers"><img src="https://img.shields.io/github/stars/ai-guru-global/resolve-agent?style=flat-square" alt="Stars"></a>
  <a href="https://github.com/ai-guru-global/resolve-agent/graphs/contributors"><img src="https://img.shields.io/github/contributors/ai-guru-global/resolve-agent?style=flat-square" alt="Contributors"></a>
  <a href="https://goreportcard.com/report/github.com/ai-guru-global/resolve-agent"><img src="https://img.shields.io/badge/Go-1.25-00ADD8.svg?style=flat-square&logo=go" alt="Go"></a>
  <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/Python-3.11%2B-3776AB.svg?style=flat-square&logo=python" alt="Python"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-20%2B-339933.svg?style=flat-square&logo=nodedotjs" alt="Node.js"></a>
</p>

---

## ✨ At a Glance | 项目速览

| 维度 | 数据 |
|------|------|
| **技术栈** | Go 1.25 平台服务 + Python 3.11+ Agent 运行时 + React WebUI（23 页）+ 移动端示例 |
| **分析路由** | 4 条业务路径：FTA 故障树推理 / Skill 技能编排 / RAG 检索增强 / 代码分析（+ LLM 直答兜底） |
| **FTA 引擎** | 5 种门类型（AND/OR/VOTING/INHIBIT/PRIORITY_AND 时序语义）+ 最小割集 + 蒙特卡洛仿真 |
| **记忆体系** | 3 层架构：Working（进程内）/ Episodic（Redis TTL）/ Long-term（Milvus/Qdrant LRU） |
| **数据层** | PostgreSQL 16 表 6 组 / Redis / NATS / Milvus-Qdrant 双后端向量库 |
| **质量工程** | 480+ Python 单元测试项 + 8 套集成测试 + Go `-race` 测试 + Go E2E + OpenAPI 契约测试 |

📖 代码级架构讲解见 [Architecture Deep Dive](docs/architecture-deep-dive.md)，功能就绪状态见 [Feature Status](docs/feature-status.md)。

---

## What is ResolveAgent?

**ResolveAgent** is a production-grade **AIOps Mega-Agent platform** built on **2026 Agent Engineering** best practices. It automates the entire troubleshooting and resolution lifecycle: from ticket ingestion and intent routing, through knowledge retrieval and fault-tree analysis (FTA), to remediation execution and feedback closure.

ResolveAgent is designed for teams running complex distributed systems who need to compress the time from **alert → root cause → fix** from hours to minutes, while continuously capturing tribal knowledge into reusable skills and RAG corpora.

### 核心闭环 | The Resolution Flywheel

ResolveAgent 的独特机制不是"单路径 AI 问答"，而是一个**自增强的排查知识飞轮**：

```
  告警 / 工单
      │
      ▼
  意图识别  ── Intelligent Selector：意图分析 → 上下文增强
      │
      ▼
  路由分发  ── FTA / Skill / RAG / 代码分析 / LLM 直答
      │
      ▼
  多路求解  ──▶ 根因结论 + 修复建议 + 证据链
      │
      ▼
  语料写回  ── RAG 文档 · 技能 · 长期记忆
      │
      └──▶ 权重自适应，回流至下一次「路由分发」

        用得越多 → 知识越厚 → 排查越准
```

每次排查的结果都会回流为语料（RAG 文档）、技能（Skill）与长期记忆，并驱动路由权重自适应调整——**平台随使用变得更聪明**。

---

## Why ResolveAgent?

Traditional AI chatbots give a single answer path. ResolveAgent introduces **multi-path intelligent routing** combined with a **self-reinforcing knowledge loop**:

| Differentiator | What it means for you |
|----------------|----------------------|
| **Multi-path routing** | Every request is analyzed and routed to the best engine: FTA, skill execution, RAG, code analysis, or direct LLM reasoning. |
| **Resilient routing** | Failures are not dead ends; the selector learns from them, retries with enriched context, and adapts route weights over time. |
| **Formal fault-tree reasoning** | FTA engine with five gate types (AND/OR/VOTING/INHIBIT/PRIORITY_AND with dynamic ordering semantics), minimal cut sets, and Monte-Carlo simulation with Wilson confidence intervals. |
| **Knowledge self-reinforcement** | Every resolution enriches skills, RAG documents, and memory, so the platform gets smarter with use. |
| **Full-chain auditability** | Intent classification, route decisions, evidence solving, and corpus write-back are all logged with context snapshots — replayable and reviewable. |
| **Production-grade resilience** | Circuit breakers, fallback cascades, structured observability, and OpenTelemetry tracing out of the box. |
| **Polyglot runtime** | Go platform services for scale, Python runtime for AI/ML, and React WebUI for operators. |

---

## How It Works: 一条告警的旅程

以一次典型的 K8s Pod 告警为例，ResolveAgent 端到端的处理链路：

```
 ① 接入        ② 意图分析         ③ 路由决策            ④ 多路求解
┌─────────┐  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────────┐
│ 告警/工单 │─▶│ Intelligent  │─▶│ Route Decision  │─▶│ FTA:   故障树建模     │
│ 文本/事件 │  │ Selector     │  │                 │  │ Skill: k8s-pod-crash │
└─────────┘  │ · 意图分类    │  │ fta / skill /   │  │ RAG:   运行手册检索   │
             │ · 上下文增强  │  │ knowledge /     │  │ Code:  调用链分析     │
             │   (记忆/偏好/ │  │ code_analysis / │  │ Reasoning: LLM 直答  │
             │    代码检测)  │  │ reasoning       │  └──────────┬───────────┘
             └──────────────┘  └─────────────────┘             │
                                                               ▼
 ⑦ 权重自适应    ⑥ 语料写回                          ⑤ 证据结论
┌────────────┐  ┌─────────────────────┐        ┌─────────────────────┐
│ Adaptive   │◀─│ · RAG 文档沉淀       │◀───────│ 根因 + 最小割集 +     │
│ Weight     │  │ · 技能沉淀           │        │ 修复建议 + 证据链     │
│ Adjuster   │  │ · 长期记忆沉淀        │        └─────────────────────┘
└────────────┘  └─────────────────────┘
```

关键设计：**任何一路失败都不是终点**。`ResilientSelector` 会记录失败上下文，按错误分类切换偏好路径（如 RAG 资源缺失 → 偏好 LLM 推理兜底），并排除已尝试路径重试，最多 3 次；全程决策留痕于审计日志，可回放、可复盘。

---

## Use Cases

ResolveAgent is built for SREs, platform engineers, and operations teams who need reliable, evidence-based incident resolution:

- **Kubernetes incident response** — Pod crashes, OOMKilled, CrashLoopBackOff, network partitions.
- **API / service degradation** — 5xx spikes, latency regressions, dependency failures.
- **Root-cause analysis (RCA)** — Fault-tree modeling with minimal cut sets and probabilistic simulation.
- **Knowledge-base Q&A** — RAG over runbooks, post-mortems, codebases, and call-chain corpora.
- **Code-level diagnosis** — Static analysis, call-graph traversal, and solution document generation.
- **Ticket triage and summarization** — Automatic classification, routing, and structured summarization.

以下场景全部基于**已接线可用**的能力（真实端点/页面），可按 Quick Start 启动后直接复现：

**Case 1 · K8s 告警值班响应（SRE）** — 告警触发后，值班工程师在 WebUI Playground（或 `POST /v1/agents/{id}/execute`）提交事件描述。MegaAgent 经智能选择器自动路由：命中场景技能时，排查引擎按 manifest 定义的步骤流执行——命令步骤在沙箱中真实运行（如 `kubectl get pods`），stdout/stderr 原样进入诊断证据；最终产出**四要素结构化解法**（症状 / 关键信息 / 排查步骤 / 解决步骤），一键沉淀到 Solutions 知识库，下次同类告警直接语义检索复用。

**Case 2 · 故障根因量化分析（稳定性团队）** — 在 FTAEngine 页面构建故障树（五种门类型，含时序与优先级语义），引擎计算**最小割集**定位最脆弱路径，蒙特卡洛仿真给出顶事件失效概率与 Wilson 置信区间。分析结果持久化到 `/api/v1/fta/documents/{id}/results`，作为架构评审与容量决策的量化依据。

**Case 3 · 运维知识库问答（技术支持 / 新人上手）** — 用 `POST /v1/corpus/import` 把 runbook、复盘报告、代码仓库批量导入 RAG（Milvus/Qdrant 向量库，自动分块入库）；团队在 RAG 页面或 `POST /v1/rag/query` 自然语言提问，检索命中带出处引用。排查产出的解法经 `/v1/solutions/sync-rag` 回写知识库，形成「用得越多、答得越准」的语料飞轮。

**Case 4 · 代码级诊断（研发团队）** — `POST /v1/code-analysis/static` 对目标服务做静态分析与错误诊断，`/v1/code-analysis/errors/parse` 解析报错堆栈；调用链图谱（call-graphs nodes/edges/subgraph）与流量分析交叉定位可疑变更；对持久化的流量图可再触发 `/v1/code-analysis/traffic/graphs/{id}/analyze` 生成 LLM 分析报告。

**Case 5 · 工单分诊与摘要（工单运营）** — TicketSummary 页面对入站工单自动分类、路由与结构化摘要，把「读工单」从分钟级压到秒级；摘要与分类结果可回写客户工单系统。

**Case 6 · 集成进已有平台（平台工程）** — 三条集成路径：**REST API**（Go 平台 ~100 条路由 + Python 运行时 14 个端点，含 SSE 流式）、**gRPC SelectorService**（把智能路由作为共享服务嵌入自有调度链）、**MCP 适配器**（把 ResolveAgent 能力暴露为 Model Context Protocol 工具，供 Claude/通义等 Agent 直接调用）；另有 Dify / LangGraph 集成适配层。无后端环境时可用 WebUI 演示模式（mock 数据驱动）先行体验。

---

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/ai-guru-global/resolve-agent.git
cd resolve-agent

# 2. Start the entire stack with one command
#    (deps containers + Go platform + Python runtime + WebUI)
./scripts/start-local.sh all

# 3. Check service health
./scripts/start-local.sh status
```

After startup, open the WebUI at **http://localhost:5174** and the Platform API at **http://localhost:8080/api/v1/health**.

> ⚠️ First run of `start-local.sh runtime` automatically creates `python/.venv` and installs dependencies (`.[rag]`); this may take a few minutes.

### Environment Requirements

| Dependency | Version | 说明 |
|------------|---------|------|
| Go | >= 1.25 | go.mod 锁定 1.25.0 |
| Python | >= 3.11 | 运行时（开发环境已验证 3.14） |
| Node.js | >= 20 | WebUI 开发（已验证 v22） |
| Docker | >= 20.10 | 依赖服务容器化 |
| Make | latest | 构建工具链 |
| uv | 推荐 | Python 依赖管理（无则回退 pip） |

### Startup endpoints

| 服务 | 地址 | 说明 |
|------|------|------|
| **WebUI** | http://localhost:5174 | React 可视化控制台 |
| **Platform API** | http://localhost:8080 | Go 平台服务（健康检查 `/api/v1/health`） |
| **Runtime API** | http://localhost:9091 | Python Agent 运行时（`/health`） |
| gRPC | localhost:9090 | Platform gRPC 服务（仅健康检查与反射；业务 API 走 REST） |
| PostgreSQL | localhost:5432 | 长期记忆 / 业务数据 |
| Redis | localhost:6379 | 短期记忆 / 缓存 |
| NATS | localhost:4222 | 消息总线 |
| Milvus | localhost:19530 | RAG 向量存储 |

### Step-by-Step & Makefile

```bash
./scripts/start-local.sh deps      # 仅启动依赖容器 (PostgreSQL / Redis / NATS / Milvus / etcd)
./scripts/start-local.sh platform  # 仅启动 Go 平台服务（自动编译）
./scripts/start-local.sh runtime   # 仅启动 Python Agent 运行时（自动重建 venv）
./scripts/start-local.sh web       # 仅启动 WebUI 开发服务器
./scripts/start-local.sh stop | restart | logs web | doctor

make setup-dev        # 初始化开发环境（依赖 + Git Hooks）
make build            # 构建 Go / Python / WebUI
make compose-up       # Docker Compose 全栈启动
make test             # 全量测试（Go + Python + WebUI）
make lint             # 全语言 lint 门禁（Go/Python/Web/Proto）
```

### Python Agent Example

```python
from resolveagent.selector.selector import IntelligentSelector
from resolveagent.memory import HierarchicalMemory
from resolveagent.planning import HybridPlanner, PlanningMode

selector = IntelligentSelector(strategy="hybrid")
memory = HierarchicalMemory(session_id="session-1")
planner = HybridPlanner()

decision = await selector.route(input_text="分析代码中的安全漏洞", agent_id="my-agent")
# → RouteDecision(route_type="code_analysis", confidence=0.85)

plan = await planner.create_plan(goal="诊断 API 500 错误", mode=PlanningMode.DELIBERATIVE)
# → Plan(steps=[Step(gather_info), Step(diagnose), Step(fix)])

memory.add("user", "我想部署到 k8s", importance=0.8)
recent = memory.get_recent(limit=10)
```

遇到启动问题？见 [Troubleshooting](docs/troubleshooting.md)。

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            RESOLVEAGENT                                   │
│                                                                           │
│  ┌──────────┐    ┌──────────────┐    ┌─────────────────────────────────┐ │
│  │  Client  │───▶│   Higress    │───▶│     Platform (Go)               │ │
│  │ CLI/WebUI│    │ AI Gateway   │    │  Registry │ Auth │ Route │ Store │ │
│  │ Mobile   │    │              │    │  Feedback │ CircuitBreaker       │ │
│  └──────────┘    └──────────────┘    └────────────┬──────────────────┘ │
│                                                      │ HTTP/SSE           │
│                                                      ▼                    │
│                            ┌─────────────────────────────────────────┐   │
│                            │     Agent Runtime (Python)              │   │
│                            │                                         │   │
│                            │  ┌──────────┐ ┌──────────┐ ┌─────────┐ │   │
│                            │  │ Selector │ │ Planner  │ │ Memory  │ │   │
│                            │  │ (路由)    │ │ (规划)   │ │ (记忆)  │ │   │
│                            │  └──────────┘ └──────────┘ └─────────┘ │   │
│                            │  ┌──────────┐ ┌──────────┐ ┌─────────┐ │   │
│                            │  │   FTA    │ │ Skills   │ │   RAG   │ │   │
│                            │  │ 引擎     │ │ +沙箱    │ │ Pipeline│ │   │
│                            │  └──────────┘ └──────────┘ └─────────┘ │   │
│                            │  ┌───────────────────────────────────┐ │   │
│                            │  │   Resilience │ MessageBus │ LLM   │ │   │
│                            │  └───────────────────────────────────┘ │   │
│                            └──────────────────┬──────────────────────┘   │
│                                               │                          │
│  ┌────────────────────────────────────────────▼──────────────────────┐   │
│  │        Data Layer: PostgreSQL │ Redis │ NATS │ Milvus/Qdrant      │   │
│  └───────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

**三层分工：** Go 平台负责注册表、鉴权、存储与反馈闭环等高并发基础服务；Python 运行时承载 Agent 编排与 AI 引擎（agentscope）；React WebUI 面向运维操作者。三者经 HTTP/SSE 互联。

### Twelve Architecture Highlights

| # | 特性 | 模块 | 说明 |
|---|------|------|------|
| 1 | **Intelligent Selector** | `selector/selector.py` | 三阶段元路由：意图分析 → 上下文增强 → 路由决策 |
| 2 | **Decision Audit Logger** | `selector/audit.py` | 完整路由决策审计追踪（异步写入，不阻塞主流程） |
| 3 | **Hierarchical Memory** | `memory.py` | Working / Episodic / Long-term 三层记忆（TTL + LRU） |
| 4 | **Hybrid Planner** | `planning.py` | REACTIVE + DELIBERATIVE 双模式，LLM 分解 + 规则回退 |
| 5 | **ToolHub** | `toolhub.py` | 工具发现 + Schema 注册 + Capability 映射 + 安全审计 |
| 6 | **Resilience** | `resilience.py` | CircuitBreaker 三态熔断 + FallbackCascade 多级降级 |
| 7 | **AgentMessageBus** | `message_bus.py` | Pub/Sub + Request/Response 消息总线 |
| 8 | **FTA Engine** | `fta/` | 五种门类型（PRIORITY_AND 带动态时序语义）+ 最小割集 + 蒙特卡洛仿真 |
| 9 | **Resilient Selector** | `selector/resilient_selector.py` | 反馈驱动自适应路由：失败重试 + 上下文重增强 + 错误分类路由偏好 |
| 10 | **Loop Engineering** | `pkg/feedback/` + `fta/feedback_loop.py` | Observe-Orient-Decide-Act 持续反馈闭环 |
| 11 | **Circuit Breaker (Go)** | `pkg/circuitbreaker/` | 三态熔断器自愈运维：Closed → Open → HalfOpen → Closed |
| 12 | **Adaptive Weight Adjuster** | `selector/resilient_selector.py` | 基于反馈的路由权重动态调整 + 时间衰减 + 自动降级 |

> 📖 逐模块代码级讲解见 [Architecture Deep Dive](docs/architecture-deep-dive.md)。

---

## CLI

`resolveagent` 命令行工具（Go 实现，位于 `internal/cli/` + `cmd/resolveagent-cli/`），覆盖平台全部核心操作，并提供交互式 TUI 控制台（`internal/tui/`）：

```bash
resolveagent agent create|list|describe|run|update|delete|logs   # Agent 管理
resolveagent skill list|info|install|test|remove|init           # 技能管理
resolveagent workflow create|list ...                           # 工作流管理
resolveagent rag ... / corpus ...                               # RAG 与语料
resolveagent config ... / serve / dashboard                     # 配置 / 本地服务 / TUI
```

> 📖 完整命令参考见 [CLI 参考](docs/zh/cli-reference.md)。

---

## WebUI

访问 **http://localhost:5174** 查看可视化控制台（23 个功能页面）：Dashboard / Playground（Agent 多轮对话）/ Selector 路由可视化 / FTAEngine 故障树编辑器 / Workflows / Agents / Skills / RAG / CodeAnalysis（调用链图谱）/ TicketSummary / Solutions / Monitoring / Traces / Database / Settings 等。

**演示模式：** 后端不可用时自动回落到浏览器端 mock 数据（按域拆分于 `web/src/api/mock/`），并显示**演示模式标识徽标**；演示数据带新鲜度测试，防止随时间推移变成"假旧"。

---

## Configuration

平台与运行时配置统一使用 `RESOLVEAGENT_*` 前缀（完整清单见 [`.env.example`](.env.example) 与 [配置指南](docs/zh/configuration.md)）:

```bash
# 服务地址
RESOLVEAGENT_HTTP_ADDR=:8080
RESOLVEAGENT_GRPC_ADDR=:9090

# 数据层
DATABASE_URL=postgres://resolveagent:resolveagent@localhost:5432/resolveagent?sslmode=disable
RESOLVEAGENT_REDIS_ADDR=localhost:6379
RESOLVEAGENT_NATS_URL=nats://localhost:4222

# LLM (多 Provider：Qwen / 文心 / 智谱 / Kimi / MiMo 等 OpenAI 兼容接入)
RESOLVEAGENT_LLM_QWEN_API_KEY=your-qwen-key
KIMI_API_KEY=your-kimi-key

# 网关与可观测性
RESOLVEAGENT_GATEWAY_ENABLED=true
RESOLVEAGENT_TELEMETRY_ENABLED=true
RESOLVEAGENT_TELEMETRY_OTLP_ENDPOINT=http://localhost:4318
```

| 文件 | 说明 |
|------|------|
| `configs/resolveagent.yaml` | Go 平台服务配置（注册表/网关/存储） |
| `configs/runtime.yaml` | Python 运行时配置（Agent/记忆/技能） |
| `configs/models.yaml` | LLM 模型路由与参数配置 |
| `configs/examples/` | 各环境配置示例（agent / skill / FTA workflow） |

---

## Documentation

| 类别 | 入口 |
|------|------|
| 架构深潜（代码级） | [docs/architecture-deep-dive.md](docs/architecture-deep-dive.md) |
| 功能状态与已知待办 | [docs/feature-status.md](docs/feature-status.md) |
| 中文技术文档（25 篇） | [docs/zh/INDEX.md](docs/zh/INDEX.md) — 快速开始 / 架构详解 / 智能选择器 / FTA 引擎 / RAG 管道 / 技能系统 / 数据库 Schema / 配置指南 / CLI 参考 / 部署指南… |
| 源码蒸馏设计文档（19 篇，带 `file:line` 锚点） | [docs/design/INDEX.md](docs/design/INDEX.md) |
| 疑难排查 | [docs/troubleshooting.md](docs/troubleshooting.md) |
| 文档站点（Docusaurus） | [`docs-site/`](docs-site/) —— 仅站点壳与导航；内容唯一源在 `docs/` |

---

## Testing

```bash
make test        # 全量测试（Go + Python + WebUI 并行）
make test-e2e    # Go E2E 测试（构建标签隔离，支持 E2E_BASE_URL 覆盖）
make lint        # 全语言 lint 门禁
hack/quality-gate.sh   # 质量门禁（lint + test + coverage）
```

- **Python** — 480+ 单元测试项 + 8 套集成测试（Dify 插件 / FTA 并行 / HTTP 服务 / MCP 适配器 / 弹性选择器等）
- **Go** — `-race` + 覆盖率；E2E 覆盖 agent lifecycle / workflow execution / feedback loop
- **Web** — Vitest 113 项（含演示数据新鲜度守卫）
- **契约** — 以 `router.go` 的 95 条路由注册为唯一事实源的 OpenAPI 契约测试
- **工程治理** — golangci-lint 全量规则清零或显式注明理由；sentinel 错误链 + 防泄漏统一错误出口

---

## Observability

- **Prometheus 指标** — `resolveagent_selector_decisions_total` / `resolveagent_audit_records_total` / `resolveagent_circuit_breaker_state` / `resolveagent_feedback_signals_total` / `resolveagent_adaptive_selector_weights` 等（`pkg/telemetry/`）
- **OpenTelemetry** — 结构化日志带 trace 关联（`pkg/logger/`），OTLP 导出（`RESOLVEAGENT_TELEMETRY_OTLP_ENDPOINT`）
- **健康检查** — liveness / readiness 端点（`pkg/health/`）：Platform `/api/v1/health`，Runtime `/health`
- **审计追踪** — Selector 决策审计（异步落库）+ ToolHub 执行审计 + 熔断器状态变化经反馈 Observer 采集

---

## Feature Status

核心引擎与基础设施的就绪状态、以及经代码实测裁定的已知待办，统一维护在 [docs/feature-status.md](docs/feature-status.md)。

---

## Project Structure

```
resolve-agent/
├── api/                          # 协议定义 (OpenAPI / JSON Schema / proto)
├── cmd/
│   ├── resolveagent-cli/        # CLI 应用入口
│   └── resolveagent-server/     # Platform Server 入口
├── internal/
│   ├── cli/                     # CLI 实现 (agent/skill/workflow/rag/corpus/config)
│   └── tui/                     # 交互式 TUI 控制台
├── pkg/                         # Go 平台服务
│   ├── circuitbreaker/          # 🔄 三态熔断器
│   ├── config/  errors/  event/ # 配置 / sentinel 错误链 / 事件体系
│   ├── feedback/                # 🔄 反馈循环 (Collector/RingBuffer/Aggregator)
│   ├── gateway/  health/  logger/
│   ├── registry/                # 14 个领域 Registry (agent/skill/rag/fta/solution/traffic…)
│   ├── retry/  server/  service/  store/  telemetry/  version/
├── python/src/resolveagent/
│   ├── selector/                # 🧠 智能选择器 (意图/上下文/路由/审计/弹性)
│   ├── memory.py  planning.py  toolhub.py  resilience.py  message_bus.py
│   ├── fta/                     # 🔍 FTA 引擎 + 反馈循环 + 回归验证
│   ├── rag/                     # RAG 管道 (Milvus/Qdrant 双后端)
│   ├── skills/  llm/  mcp/  hooks/  code_analysis/  docsync/  agent/  runtime/
├── web/                         # 🌐 React WebUI (Vite + Tailwind + shadcn/ui)
├── benchmarks/wiki-k8s/         # 基准语料（K8s wiki）
├── docs/                        # 文档 (架构深潜/功能状态/设计蒸馏/中文文档)
├── docs-site/                   # 📚 Docusaurus 站点壳（内容引用 docs/）
├── configs/                     # 运行配置 (resolveagent/runtime/models + examples)
├── scripts/                     # 开发运维脚本 (start-local.sh 一键启动)
├── deploy/                      # 部署配置 (docker / docker-compose / helm)
├── skills/                      # 技能注册 + 示例技能 (k8s-pod-crash / ticket-handler…)
├── examples/                    # 示例 (quickstart / integrations / mobile-demo)
├── integrations/dify/           # Dify 集成
├── test/                        # E2E (Go 构建标签) / 集成 / fixtures
├── hack/                        # 开发工具 (quality-gate / coverage-report)
└── .github/workflows/           # CI/CD (ci / e2e / release / codeql)
```

---

## Deployment

```bash
make docker          # 构建镜像 (platform / runtime / webui)
make compose-up      # Docker Compose 全栈
make helm-install    # Helm 部署
make migrate-up      # 数据库迁移
make seed            # 种子数据
```

生产部署推荐使用 `deploy/helm/resolveagent/`（含健康检查、资源限制），详见 [部署指南](docs/zh/deployment.md)。

---

## Roadmap

完整路线图（唯一权威副本）见 [ROADMAP.md](ROADMAP.md)，实时状态见 [GitHub Issues](https://github.com/ai-guru-global/resolve-agent/issues)。

| Version | Theme | Highlights |
|---------|-------|------------|
| v0.1.0 ✅ | Foundation | Go platform (gRPC + REST), Python runtime, FTA engine, Intelligent Selector, RAG, WebUI, CLI, Docker Compose, Helm. |
| v0.2.0 ✅ | Hardening | DB migrations, unified error handling, OpenTelemetry logging, health checks, integration tests, retry with backoff. |
| v0.3.0 ✅ | Quality & Foundation | CI/CD, unified versioning, router refactoring (2160 行 → 15 个域文件), PostgreSQL Registry 持久化, MCP adapter. |
| v0.4.0 ✅ | Core Capability | FTA 并行求值, 多语言代码分析 (tree-sitter), LangGraph 集成, Dify 插件, 语料导入链路. |
| v0.5.0 🔜 | Enterprise Readiness | Multi-tenant, RBAC, comprehensive audit logging, SSO (OIDC/SAML), data encryption, compliance. |
| v0.6.0 | Ecosystem & Scale | Skill marketplace, plugin SDK, horizontal agent runtime, distributed workflows, NATS JetStream, advanced RAG. |

Long-term vision: multi-cloud and edge deployment, visual workflow designer, AI-powered observability and self-healing.

---

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development environment setup (`make setup-dev`)
- Branch naming conventions (`feat/`, `fix/`, `docs/`, etc.)
- Conventional Commits format
- Pre-commit hooks and linting (`make lint`, `make fmt`)
- Pull request process and code review requirements
- Coding standards for Go, Python, and TypeScript/React

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).

---

## Security

If you discover a security vulnerability, please **do not** open a public issue. Instead, report it privately via [GitHub Security Advisories](https://github.com/ai-guru-global/resolve-agent/security/advisories) or contact the maintainers listed in [MAINTAINERS.md](MAINTAINERS.md).

Built-in security practices:

- **ToolHub SecurityPolicy** — 技能/工具基于角色的权限控制 + 执行审计
- **Skill Sandbox** — 技能在沙箱中执行，隔离宿主环境
- **防泄漏错误出口** — registry 错误统一经 `writeRegistryError` 输出，未知错误码不回显内部消息
- **Higress 网关鉴权** — 可选 JWT 鉴权（`RESOLVEAGENT_GATEWAY_AUTH_ENABLED`）

---

## Community & Support

- 💬 [GitHub Discussions](https://github.com/ai-guru-global/resolve-agent/discussions) — Ask questions, share ideas, and connect with other users.
- 🐛 [GitHub Issues](https://github.com/ai-guru-global/resolve-agent/issues) — Report bugs or request features.
- 📧 Maintainers — See [MAINTAINERS.md](MAINTAINERS.md) for contact information.
- ⭐ Star us on GitHub — If ResolveAgent is helpful, please consider starring the repository to help others discover it.

---

## Citation

If you use ResolveAgent in your research or production work, please consider citing it:

```bibtex
@software{resolveagent,
  title = {ResolveAgent: A Production-Grade AIOps Mega-Agent Platform},
  author = {The ResolveAgent Contributors},
  url = {https://github.com/ai-guru-global/resolve-agent},
  year = {2026},
  license = {Apache-2.0}
}
```

---

## Acknowledgments

ResolveAgent builds on the shoulders of excellent open-source projects and communities:

- [AgentScope](https://github.com/modelscope/agentscope) — Agent 编排
- [Higress](https://github.com/alibaba/higress) — AI 网关
- [LangGraph](https://github.com/langchain-ai/langgraph) — 图编排参考
- [MCP](https://modelcontextprotocol.io) — Model Context Protocol
- [Milvus](https://milvus.io) / [Qdrant](https://qdrant.tech) — 向量数据库
- [Vite](https://vitejs.dev) / [React](https://react.dev) / [Tailwind CSS](https://tailwindcss.com) — WebUI 技术栈
- [Go](https://go.dev) / [Python](https://www.python.org) / [Node.js](https://nodejs.org) — 核心运行时

A special thanks to all [contributors](https://github.com/ai-guru-global/resolve-agent/graphs/contributors) who have helped shape ResolveAgent.

---

## License

Apache 2.0 License — see [LICENSE](LICENSE)
