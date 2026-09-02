<p align="center">
  <img src="docs/assets/logo.svg" alt="ResolveAgent Logo" width="200">
</p>

<h1 align="center">ResolveAgent</h1>

<p align="center">
  <strong>2026 Agent Engineering | 面向问题解决的生产级 AIOps 智能体平台</strong>
</p>

<p align="center">
  <strong>Production-grade AIOps Mega-Agent Platform for Troubleshooting & Resolution</strong>
</p>

<p align="center">
  <code>🧠 Intelligent Selector</code> · <code>🌳 Hybrid Planner</code> · <code>💾 Hierarchical Memory</code> · <code>🔍 FTA Engine</code> · <code>🔧 ToolHub</code> · <code>🔄 Loop Engineering</code>
</p>

<p align="center">
  🗺️ <a href="https://gjbs6uhxeute.meoo.fun"><strong>GTM 策略中枢 · 在线演示（GTM Strategy Hub）</strong></a>
</p>

<p align="center">
  <a href="https://github.com/ai-guru-global/resolve-agent/releases"><img src="https://img.shields.io/github/v/release/ai-guru-global/resolve-agent?style=flat-square" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square" alt="License"></a>
  <a href="https://github.com/ai-guru-global/resolve-agent/actions"><img src="https://img.shields.io/github/actions/workflow/status/ai-guru-global/resolve-agent/ci.yaml?branch=main&style=flat-square" alt="CI Status"></a>
  <a href="https://github.com/ai-guru-global/resolve-agent/issues"><img src="https://img.shields.io/github/issues/ai-guru-global/resolve-agent?style=flat-square" alt="Issues"></a>
  <a href="https://github.com/ai-guru-global/resolve-agent/pulls"><img src="https://img.shields.io/github/issues-pr/ai-guru-global/resolve-agent?style=flat-square" alt="Pull Requests"></a>
  <a href="https://github.com/ai-guru-global/resolve-agent/stargazers"><img src="https://img.shields.io/github/stars/ai-guru-global/resolve-agent?style=flat-square" alt="Stars"></a>
  <a href="https://github.com/ai-guru-global/resolve-agent/graphs/contributors"><img src="https://img.shields.io/github/contributors/ai-guru-global/resolve-agent?style=flat-square" alt="Contributors"></a>
  <a href="https://goreportcard.com/report/github.com/ai-guru-global/resolve-agent"><img src="https://img.shields.io/badge/Go-1.25-00ADD8.svg?style=flat-square&logo=go" alt="Go"></a>
  <a href="https://www.python.org/downloads/"><img src="https://img.shields.io/badge/Python-3.11%2B-3776AB.svg?style=flat-square&logo=python" alt="Python"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-20%2B-339933.svg?style=flat-square&logo=nodedotjs" alt="Node.js"></a>
</p>

---

## 📋 Table of Contents

- [What is ResolveAgent?](#what-is-resolveagent)
- [Why ResolveAgent?](#why-resolveagent)
- [Use Cases](#use-cases)
- [GTM Strategy Hub](#gtm-strategy-hub)
- [Quick Start in 60 Seconds](#quick-start-in-60-seconds)
- [Architecture Overview](#architecture-overview)
- [Twelve Architecture Highlights](#twelve-architecture-highlights)
- [Architecture Deep Dive](#architecture-deep-dive)
- [Quick Start (Detailed)](#quick-start-detailed)
- [Troubleshooting](#troubleshooting)
- [Feature Status](#feature-status)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Documentation](#documentation)
- [Testing](#testing)
- [Metrics](#metrics)
- [WebUI](#webui)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Security](#security)
- [Community & Support](#community--support)
- [Citation](#citation)
- [Acknowledgments](#acknowledgments)
- [License](#license)

---

## What is ResolveAgent?

**ResolveAgent** is a production-grade **AIOps Mega-Agent platform** built on **2026 Agent Engineering** best practices. It automates the entire troubleshooting and resolution lifecycle: from ticket ingestion and intent routing, through knowledge retrieval and fault-tree analysis (FTA), to remediation execution and feedback closure.

ResolveAgent is designed for teams running complex distributed systems who need to compress the time from **alert → root cause → fix** from hours to minutes, while continuously capturing tribal knowledge into reusable skills and RAG corpora.

> 📖 Full methodology and competitive assessment: [COMPREHENSIVE_ASSESSMENT_AND_METHODOLOGY.md](documentation/COMPREHENSIVE_ASSESSMENT_AND_METHODOLOGY.md)

---

## Why ResolveAgent?

Traditional AI chatbots give a single answer path. ResolveAgent introduces **multi-path intelligent routing** combined with a **self-reinforcing knowledge loop**:

| Differentiator | What it means for you |
|----------------|----------------------|
| **Multi-path routing** | Every request is analyzed and routed to the best engine: FTA, skill execution, RAG, code analysis, or direct LLM reasoning. |
| **Resilient routing** | Failures are not dead ends; the selector learns from them, retries with enriched context, and adapts route weights over time. |
| **Formal fault-tree reasoning** | FTA engine with six gate types, minimal cut sets, and Monte-Carlo simulation for rigorous root-cause analysis. |
| **Knowledge self-reinforcement** | Every resolution enriches skills, RAG documents, and memory, so the platform gets smarter with use. |
| **Production-grade resilience** | Circuit breakers, fallback cascades, structured observability, and OpenTelemetry tracing out of the box. |
| **Polyglot runtime** | Go platform services for scale, Python runtime for AI/ML, and React WebUI for operators. |

---

## Use Cases

ResolveAgent is built for SREs, platform engineers, and operations teams who need reliable, evidence-based incident resolution:

- **Kubernetes incident response** — Pod crashes, OOMKilled, CrashLoopBackOff, network partitions.
- **API / service degradation** — 5xx spikes, latency regressions, dependency failures.
- **Root-cause analysis (RCA)** — Fault-tree modeling with minimal cut sets and probabilistic simulation.
- **Knowledge-base Q&A** — RAG over runbooks, post-mortems, codebases, and call-chain corpora.
- **Code-level diagnosis** — Static analysis, call-graph traversal, and solution document generation.
- **Ticket triage and summarization** — Automatic classification, routing, and structured summarization.

---

## GTM Strategy Hub

**ResolveAgent GTM 策略中枢** 已上线：<https://gjbs6uhxeute.meoo.fun>

面向决策者与售前场景的企业级策略展示页，以「调度枢纽 / 终点站是根因」为叙事主线。单文件静态实现、零依赖，也可直接离线打开 [GTM/index.html](GTM/index.html)：

- **路由发车板（Route Departures）** — 翻牌式信息板实时呈现告警事件的智能路由分发
- **调度总图（Metro Map）** — 告警入口枢纽分岔四条分析线路：FTA 故障树推理 / RAG 检索增强 / Skill 技能编排 / 代码分析，直达「根因」终点站，附可交互的意图调度模拟器
- **可审计会话（Auditable Session）** — 意图分类、路径分发、证据求解、语料写回全部以终端留痕，可回放、可复盘
- **事件回放与语料飞轮** — 一次告警四路并行回放；排查结果沉淀语料，用得越多排查越准
- **GTM 战略线路规划图** — 目标客户画像（ICP）与里程碑的线路化呈现

页面设计契约（企业级视觉纪律：无 glow、无装饰性动效、仪器语法）见 [GTM/DESIGN.md](GTM/DESIGN.md)。

---

## Quick Start in 60 Seconds

```bash
# 1. Clone the repository
git clone https://github.com/ai-guru-global/resolve-agent.git
cd resolve-agent

# 2. Start the entire stack with one command
./scripts/start-local.sh all

# 3. Check service health
./scripts/start-local.sh status
```

After startup, open the WebUI at **http://localhost:5174** and the Platform API at **http://localhost:8080/api/v1/health**.

> ⚠️ First run of `./scripts/start-local.sh runtime` automatically creates `python/.venv` and installs dependencies (`.[rag]`); this may take a few minutes.

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
│  └──────────┘    └──────────────┘    └──────────────┬──────────────────┘ │
│                                                      │ HTTP/SSE + gRPC    │
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

---

## Twelve Architecture Highlights

| # | 特性 | 模块 | 说明 |
|---|------|------|------|
| 1 | **Intelligent Selector** | `selector/selector.py` | 三阶段元路由：意图分析 → 上下文增强 → 路由决策 |
| 2 | **Decision Audit Logger** | `selector/audit.py` | 完整路由决策审计追踪（异步写入，不阻塞主流程） |
| 3 | **Hierarchical Memory** | `memory.py` | Working / Episodic / Long-term 三层记忆（TTL + LRU） |
| 4 | **Hybrid Planner** | `planning.py` | REACTIVE + DELIBERATIVE 双模式，LLM 分解 + 规则回退 |
| 5 | **ToolHub** | `toolhub.py` | 工具发现 + Schema 注册 + Capability 映射 + 安全审计 |
| 6 | **Resilience** | `resilience.py` | CircuitBreaker 三态熔断 + FallbackCascade 多级降级 |
| 7 | **AgentMessageBus** | `message_bus.py` | Pub/Sub + Request/Response 消息总线 |
| 8 | **FTA Engine** | `fta/` | 故障树分析：六种门类型 + 最小割集 + 蒙特卡洛仿真 |
| 9 | **Resilient Selector** | `selector/resilient_selector.py` | 反馈驱动自适应路由：失败重试 + 上下文重增强 + 错误分类路由偏好 |
| 10 | **Loop Engineering** | `pkg/feedback/` + `fta/feedback_loop.py` | Observe-Orient-Decide-Act 持续反馈闭环 |
| 11 | **Circuit Breaker (Go)** | `pkg/circuitbreaker/` | 三态熔断器自愈运维：Closed → Open → HalfOpen → Closed |
| 12 | **Adaptive Weight Adjuster** | `selector/resilient_selector.py` | 基于反馈的路由权重动态调整 + 时间衰减 + 自动降级 |

> 📖 完整方法论与对标评估见 [COMPREHENSIVE_ASSESSMENT_AND_METHODOLOGY.md](documentation/COMPREHENSIVE_ASSESSMENT_AND_METHODOLOGY.md)

---

## Architecture Deep Dive

> 以下代码路径均相对 `python/src/resolveagent/` 目录。

### 1. Intelligent Selector | 智能选择器

```python
# selector/selector.py
class IntelligentSelector:
    """三层路由架构"""
    async def route(input_text, agent_id, context):
        # 1. Intent Analysis - 意图分类
        intent = await intent_analyzer.classify(input_text)

        # 2. Context Enrichment - 上下文增强
        enriched = await context_enricher.enrich(input_text, agent_id, context)
        #   - 记忆查询 (MemoryClient)
        #   - 偏好推断 (_infer_user_preferences)
        #   - 代码检测 (_analyze_code_context)

        # 3. Route Decision - 路由决策
        decision = await route_decider.decide(
            intent_type=intent.type,
            confidence=intent.confidence,
            context=enriched,
        )

        # 4. Audit Logging - 审计记录
        await audit_logger.log(decision, enriched, latency_ms)

        return decision
```

**路由策略:**
- `rule` — 快速精确模式（规则匹配）
- `llm` — LLM 智能分类
- `hybrid` — 规则优先 + LLM 回退（推荐）

### 2. Resilient Selector | 弹性自适应路由

```python
# selector/resilient_selector.py
class ResilientSelector:
    """反馈驱动自适应路由，带优雅降级"""

    MAX_RETRIES = 3

    async def route_and_execute(self, input_text, agent_id, executor):
        tried_routes = set()
        for attempt in range(self.MAX_RETRIES + 1):
            # 1. 上下文增强（首次全量，后续增量 + 失败上下文）
            ctx = await self._enrich(input_text, agent_id, attempt, tried_routes)

            # 2. 路由决策（排除已尝试路径）
            decision = await self._selector.route(input_text, agent_id, context=ctx)

            # 3. 执行
            result = await executor(decision)
            if result.success:
                return result

            # 4. 记录失败，为下一次决策提供上下文
            tried_routes.add(decision.route_type)
            ctx["last_failure"] = {"route": decision.route_type, "error": result.error}

        # 最终兜底
        return await self._fallback(input_text, agent_id)
```

**错误分类路由偏好**（本次工程强化）：

| 失败类型 | 路由偏好 |
|---------|---------|
| `resource_missing` → RAG 失败 | 偏好 `reasoning`（LLM 推理兜底） |
| `resource_missing` → Skill 失败 | 偏好 `knowledge`（知识库检索） |
| FTA 任意失败（未试过 code_analysis） | 偏好 `code_analysis` |
| 其他 | 按权重依次尝试剩余路径 |

**核心思想:** 每一次失败都不是浪费，而是为下一次路由决策提供更丰富的上下文。

### 3. Decision Audit Logger | 决策审计

```python
# selector/audit.py
@dataclass
class AuditRecord:
    timestamp: str
    decision_type: str      # fta/skill/rag/direct/code_analysis
    confidence: float
    reasoning: str
    context_snapshot: dict  # skills_count, code_issues, etc.
    latency_ms: float
```

**特性:**
- 异步写入，不阻塞主流程
- 支持持久化到 Go Platform Store
- 完整的上下文快照（可回溯路由依据）

### 4. Hierarchical Memory | 分层记忆

```python
# memory.py
class HierarchicalMemory:
    """三层记忆架构"""

    # Layer 1: Working Memory (进程内, 滚动窗口)
    working = WorkingMemory(max_size=20)

    # Layer 2: Episodic Memory (Redis, TTL 过期)
    episodic = EpisodicMemoryClient(redis_url="redis://localhost:6379")

    # Layer 3: Long-term Memory (Milvus/Qdrant 向量库, LRU 逐出)
    long_term = LongTermMemoryClient(collection="long_term_memory")
```

**记忆流动:**
```
User Message → Working Memory (实时)
             → Episodic Memory (session 压缩)
             → Long-term Memory (importance > 0.7)
```

### 5. Hybrid Planner | 混合规划器

```python
# planning.py
class PlanningMode(Enum):
    REACTIVE = "reactive"          # 快速响应
    DELIBERATIVE = "deliberative"  # 深思熟虑

class HybridPlanner:
    async def create_plan(goal, mode):
        if mode == REACTIVE:
            # 单步 ReAct 循环
            return Plan(steps=[...])
        # DELIBERATIVE: LLM 分解目标 → 多步骤（失败时 Replan，最多 3 次）
        return await self._llm_decompose_plan(goal)
```

**执行流程:**
```
DELIBERATIVE 模式:
  1. LLM 分解目标 → 子步骤 (JSON 三级容错解析)
  2. 执行每步骤 → 监控状态
  3. 失败时触发 Replan
  4. 最多重试 3 次

REACTIVE 模式:
  1. 直接 ReAct 循环
  2. Thought → Action → Observation
```

### 6. FTA Engine | 故障树分析引擎

```python
# fta/engine.py
class FTAEngine:
    """六种门类型 + 最小割集 + 蒙特卡洛仿真"""

    gates = [AND, OR, NOT, VOTING, INHIBIT, PRIORITY_AND]

    async def analyze(self, tree: FaultTree) -> FTAAnalysisResult:
        cut_sets = await self._compute_minimal_cut_sets(tree)   # 最小割集
        prob = await self._monte_carlo_simulation(tree)         # 蒙特卡洛仿真
        return FTAAnalysisResult(cut_sets=cut_sets, failure_probability=prob)
```

**AIOps 应用流程:** 工单/告警接入 → 故障树建模 → 割集分析定位根因 → 修复建议生成 → 反馈闭环验证

### 7. ToolHub | 工具中心

```python
# toolhub.py
class ToolHub:
    """工具统一管理"""

    registry = SchemaRegistry()      # Schema 版本管理
    capability_map = CapabilityMap()  # 能力索引
    security = SecurityPolicy()       # 权限控制

    async def execute(tool_name, parameters):
        if not security.can_use(tool_name, user_roles):
            return {"success": False, "error": "Access denied"}

        handler = discovery.get_handler(tool_name)
        result = await handler(**parameters)

        security.audit(tool_name, user_id, "execute", success)
        return result
```

**技能系统能力:**
| 能力 | 说明 |
|------|------|
| `WEB_SEARCH` | 网页搜索 |
| `CODE_EXECUTION` | 沙箱代码执行 |
| `CODE_ANALYSIS` | 代码分析 |
| `TROUBLESHOOT` | 故障排查 |
| `SOLUTION` | 解决方案生成 |

### 8. Resilience | 弹性模式

```python
# resilience.py
class CircuitBreaker:
    """熔断器保护下游服务 (asyncio.Lock 并发安全)"""

    failure_threshold = 5     # 连续失败阈值
    reset_timeout = 30.0      # 重置超时
    half_open_max_calls = 3   # 半开探测上限

    # States: CLOSED → OPEN → HALF_OPEN → CLOSED
    # 提供 reset() 手动重置 与 get_state_info() 可观测快照

class FallbackCascade:
    """多级降级策略, 返回结构化 FallbackResult"""

    async def execute(*strategies):
        for strategy in strategies:
            try:
                return await strategy()
            except Exception:
                continue  # 尝试下一个
        return FallbackResult(success=False, message="No fallback strategies provided")
```

**降级路径:**
```
MCP Tool → Native Skill → LLM Direct → Cached Response
```

### 9. AgentMessageBus | 消息总线

```python
# message_bus.py
class AgentMessageBus:
    """订阅-发布消息总线"""

    async def subscribe(agent_id, channel, callback):
        """订阅频道"""

    async def publish(message: AgentMessage):
        """发布消息"""

    async def request(sender, channel, content, timeout):
        """请求-响应模式 (带 correlation_id)"""
```

### 10. Loop Engineering | 循环工程

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Loop Engineering 闭环                            │
├─────────────────────────────────────────────────────────────────────┤
│  Observe          Orient           Decide           Act             │
│  ┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐   │
│  │ Health  │     │Aggregator│     │  Alert   │     │ Circuit  │   │
│  │ Retry   │────▶│ (滑动    │────▶│  Engine  │────▶│ Breaker  │   │
│  │ Workflow│     │  窗口)   │     │ (规则)   │     │ Adaptive │   │
│  │ Telemetry│    │          │     │          │     │ Weight   │   │
│  └─────────┘     └──────────┘     └──────────┘     └──────────┘   │
│                                                     │             │
│  ┌─────────────────────────────────────────────────▼──────────┐   │
│  │              Feedback Dispatch                             │   │
│  │         Log │ Webhook │ NATS                               │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

**三大支柱:**

| 支柱 | 说明 | 实现 |
|------|------|------|
| **持续反馈循环** | 信号收集 → 聚合 → 分发闭环 | `pkg/feedback/` (Go) + `fta/feedback_loop.py` (Python) |
| **自愈运维** | 三态熔断器保护下游，自动恢复 | `pkg/circuitbreaker/` |
| **自适应行为** | 基于反馈的路由权重动态调整 + 时间衰减 | `AdaptiveWeightAdjuster` |

```go
// Go: 发射反馈信号
collector.Emit(ctx, feedback.FeedbackSignal{
    Source:   feedback.SourceHealth,
    Event:    feedback.EventHealthDegraded,
    Severity: feedback.SeverityWarn,
    Message:  "Service health degraded",
})

// Python: FTA 工作流反馈循环
loop = FeedbackLoop(history_window=100)
suggestions = loop.record(metrics)
// → [ImprovementSuggestion(target="selector", priority="high", ...)]
```

> 📖 详见 [Loop Engineering 文档](docs/zh/loop-engineering.md)

### 11. Circuit Breaker (Go) | 三态熔断器

```go
// pkg/circuitbreaker/breaker.go
breaker := circuitbreaker.New(circuitbreaker.Config{
    Name:             "downstream-api",
    FailureThreshold: 5,
    RecoveryTimeout:  30 * time.Second,
    HalfOpenMaxCalls: 3,
    Observer:         feedbackObserver,  // 状态变化 → 反馈信号
})

err := breaker.Execute(ctx, func(ctx context.Context) error {
    return callDownstreamAPI(ctx, request)
})
```

**状态机:**
```
CLOSED  ──[failures >= 5]──▶  OPEN
  ▲                            │
  │                    [30s timeout]
  │                            ▼
CLOSED  ◀──[probe ok]──  HALF_OPEN
```

### 12. Adaptive Selector | 自适应权重

```python
# selector/resilient_selector.py
adjuster = AdaptiveWeightAdjuster(default_weight=1.0)

# 每次执行后记录结果
adjuster.record_outcome("skill", success=True, latency_ms=120)
adjuster.record_outcome("rag", success=False, latency_ms=3500)

# 时间衰减：权重向中性值 1.0 回归
adjuster.apply_decay(decay_factor=0.95)

# 获取当前权重
weights = adjuster.get_weights()
# → {"skill": 1.15, "rag": 0.85, "fta": 1.02, "code_analysis": 0.98}
```

---

## Quick Start (Detailed)

### Environment Requirements

| Dependency | Version | 说明 |
|------------|---------|------|
| Go | >= 1.25 | go.mod 锁定 1.25.0 |
| Python | >= 3.11 | 运行时（开发环境已验证 3.14） |
| Node.js | >= 20 | WebUI 开发（已验证 v22） |
| Docker | >= 20.10 | 依赖服务容器化 |
| Make | latest | 构建工具链 |
| uv | 推荐 | Python 依赖管理（无则回退 pip） |

### One-Command Startup (Recommended)

```bash
# 1. 克隆仓库
git clone https://github.com/ai-guru-global/resolve-agent.git
cd resolve-agent

# 2. 一键启动全部服务（依赖容器 + Go 平台 + Python 运行时 + WebUI）
./scripts/start-local.sh all

# 3. 查看状态
./scripts/start-local.sh status
```

Startup endpoints:

| 服务 | 地址 | 说明 |
|------|------|------|
| **WebUI** | http://localhost:5174 | React 可视化控制台 |
| **Platform API** | http://localhost:8080 | Go 平台服务（健康检查 `/api/v1/health`） |
| **Runtime API** | http://localhost:9091 | Python Agent 运行时（`/health`） |
| gRPC | localhost:9090 | Platform gRPC 接口 |
| PostgreSQL | localhost:5432 | 长期记忆 / 业务数据 |
| Redis | localhost:6379 | 短期记忆 / 缓存 |
| NATS | localhost:4222 | 消息总线 |
| Milvus | localhost:19530 | RAG 向量存储 |

### Step-by-Step Startup

```bash
# 仅启动依赖容器 (PostgreSQL / Redis / NATS / Milvus / etcd)
./scripts/start-local.sh deps

# 仅启动 Go 平台服务（自动编译）
./scripts/start-local.sh platform

# 仅启动 Python Agent 运行时（自动重建 venv）
./scripts/start-local.sh runtime

# 仅启动 WebUI 开发服务器
./scripts/start-local.sh web

# 其他子命令
./scripts/start-local.sh stop      # 停止全部（含依赖容器）
./scripts/start-local.sh restart   # 重启全部
./scripts/start-local.sh logs web  # 查看日志 (platform/runtime/webui/deps)
./scripts/start-local.sh doctor    # 环境诊断
```

> ⚠️ 首次启动 `start-local.sh runtime` 会自动创建 `python/.venv` 并安装依赖（`.[rag]`），耗时数分钟属正常现象。

### Alternative Startup (Makefile)

```bash
make setup-dev      # 初始化开发环境（依赖 + Git Hooks）
make compose-deps   # 启动依赖容器
make build          # 构建 Go / Python / WebUI
make compose-up     # Docker Compose 全栈启动
```

### Python Agent Example

```python
from resolveagent.selector.selector import IntelligentSelector
from resolveagent.memory import HierarchicalMemory
from resolveagent.planning import HybridPlanner, PlanningMode

# 初始化
selector = IntelligentSelector(strategy="hybrid")
memory = HierarchicalMemory(session_id="session-1")
planner = HybridPlanner()

# 路由请求
decision = await selector.route(
    input_text="分析代码中的安全漏洞",
    agent_id="my-agent",
)
# → RouteDecision(route_type="code_analysis", confidence=0.85)

# 规划执行 (Deliberative 模式)
plan = await planner.create_plan(
    goal="诊断 API 500 错误",
    mode=PlanningMode.DELIBERATIVE,
)
# → Plan(steps=[Step(gather_info), Step(diagnose), Step(fix)])

# 记忆管理
memory.add("user", "我想部署到 k8s", importance=0.8)
recent = memory.get_recent(limit=10)
```

---

## Troubleshooting

> 以下为本仓库实战验证过的本地启动问题与修复方案。

### 1. `status` / `stop` 输出为空且退出码 1

**根因**: `set -euo pipefail` 下 `lsof | head -1` 在端口空闲时（lsof 返回 1）导致命令替换赋值直接退出脚本。

**修复**: `scripts/start-local.sh` 的 `get_port_pid()` 已加 `|| true`。如遇旧版本，同步该修复即可。

### 2. Milvus 容器崩溃（SIGSEGV panic）

**根因**: Milvus standalone 的**嵌入式 etcd** 在 macOS Docker Desktop（Apple Silicon）上必然触发 `etcd.InitEtcdServer` nil pointer panic（[milvus-io/milvus#31925](https://github.com/milvus-io/milvus/issues/31925) 同类问题）。

**修复**: `deploy/docker-compose/docker-compose.deps.yaml` 已改用**外部 etcd 容器**（`quay.io/coreos/etcd:v3.5.16`），Milvus 配置 `ETCD_USE_EMBED=false` + `ETCD_ENDPOINTS=etcd:2379`（官方推荐的 standalone 部署方式）。

### 3. Docker Hub 镜像拉取超时（国内网络）

**现象**: `docker compose up` 报 `failed to resolve reference ... context deadline exceeded`。

**方案**: 使用加速镜像源拉取后重打官方 tag（零侵入）:

```bash
docker pull docker.1ms.run/library/postgres:16-alpine
docker tag docker.1ms.run/library/postgres:16-alpine postgres:16-alpine
# 大镜像（如 Milvus）如过慢可换 docker.m.daocloud.io 重拉（已下载层自动复用）
```

### 4. `pnpm dev` 崩溃（供应链策略校验超时）

**根因**: pnpm 11+ 在每次 run 前联网校验 lockfile 供应链策略（483 entries），网络慢时直接崩溃。

**修复**: `web/.npmrc` 已写入 `verify-deps-before-run=false`（项目级配置）。

### 5. `uv pip install` 卡死无输出

**方案**: 指定国内镜像源重装:

```bash
cd python
UV_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple uv pip install --python .venv/bin/python -e ".[rag]"
```

### 6. WebUI 端口冲突

**约定**: WebUI 固定运行在 **5174** 端口（`web/vite.config.ts` 与 `scripts/start-local.sh` 已统一），避免与 3000/5173 等其他项目冲突。如需修改，两处需同步变更。

---

## Feature Status

> **v0.3.0** | 核心组件经全面修复与测试加固（Python 测试 432+ 用例全绿）

### 核心引擎

| 引擎 | 状态 | 说明 |
|------|------|------|
| Intelligent Selector | 🟢 Ready | 三阶段元路由 + rule/llm/hybrid 策略 |
| Resilient Selector | 🟢 Ready | 失败重试 + 错误分类路由偏好 + 自适应权重 |
| Hierarchical Memory | 🟢 Ready | 三层记忆（Working/Episodic/Long-term） |
| Hybrid Planner | 🟢 Ready | 双模式 + LLM 分解 + JSON 容错解析 |
| FTA Engine | 🟢 Ready | 六门类型 + 最小割集 + 蒙特卡洛仿真 |
| RAG Pipeline | 🟢 Ready | Milvus / Qdrant 双后端向量检索 |
| ToolHub & Skills | 🟢 Ready | 技能注册 + 沙箱执行 + 安全审计 |
| Resilience | 🟢 Ready | CircuitBreaker + FallbackCascade |
| Loop Engineering | 🟢 Ready | Go 反馈闭环 + Python 工作流反馈 |
| LLM Providers | 🟢 Ready | Qwen / 文心 / 智谱 / Higress / OpenAI 兼容（Kimi 等） |
| MCP Adapter | 🟢 Ready | Model Context Protocol |

### 基础设施

| 组件 | 状态 | 说明 |
|------|------|------|
| Go Platform | 🟢 Ready | Registry / Auth / Route / Store / Feedback |
| Python Runtime | 🟢 Ready | HTTP + SSE 流式服务（`python -m resolveagent.runtime`） |
| WebUI | 🟢 Ready | 23 个功能页面（React + Vite + Tailwind） |
| Mobile Web | 🟢 Ready | `mobile/` 移动端适配 |
| CI/CD | 🟢 Ready | `ci.yaml` / `e2e.yaml` / `release.yaml` / `docker-publish.yaml` |
| 部署 | 🟢 Ready | Docker Compose + Helm + K8s manifests |

---

## Project Structure

```
resolve-agent/
├── api/                          # 协议定义
│   ├── proto/resolveagent/v1/   # Protocol Buffers
│   ├── openapi/v1/              # OpenAPI 规范
│   └── jsonschema/              # JSON Schema
├── cmd/
│   ├── resolveagent-cli/        # CLI 应用
│   └── resolveagent-server/     # Platform Server 入口
├── pkg/                         # Go 平台服务
│   ├── circuitbreaker/          # 🔄 三态熔断器
│   ├── config/                  # 配置加载 (Viper)
│   ├── event/                   # 事件体系
│   ├── feedback/                # 🔄 反馈循环 (Collector/RingBuffer/Aggregator)
│   ├── gateway/                 # Higress 网关集成
│   ├── health/                  # 健康检查
│   ├── registry/                # 9 大 Registry 注册表
│   ├── retry/                   # 重试机制
│   ├── server/                  # HTTP/gRPC 服务
│   ├── store/                   # Store 模式抽象
│   └── telemetry/               # 监控指标 (Prometheus/OTel)
├── python/src/resolveagent/
│   ├── selector/                # 🧠 智能选择器 (意图/上下文/路由/审计/弹性)
│   ├── memory.py                # 💾 分层记忆
│   ├── planning.py              # 🌳 混合规划器
│   ├── toolhub.py               # 🔧 工具中心
│   ├── resilience.py            # 🛡️ 弹性模式
│   ├── message_bus.py           # 📡 消息总线
│   ├── fta/                     # 🔍 FTA 引擎 + 反馈循环 + 回归验证
│   ├── rag/                     # RAG 管道 (Milvus/Qdrant 双后端)
│   ├── skills/                  # 技能系统 (manifest/executor/sandbox)
│   ├── llm/                     # LLM Provider 体系
│   ├── mcp/                     # MCP 适配器
│   ├── hooks/                   # 生命周期钩子
│   ├── code_analysis/           # 代码分析
│   ├── docsync/                 # 文档同步
│   ├── agent/                   # Agent 定义
│   └── runtime/                 # 运行时服务
├── web/                         # 🌐 React WebUI (Vite + Tailwind + shadcn/ui)
├── mobile/                      # 📱 移动端 Web 应用
├── docs-site/                   # 📚 Docusaurus 文档站点
├── docs/                        # 文档 (架构/ADR/API/中文文档)
│   └── zh/                      # 25 篇中文技术文档
├── documentation/               # 综合评估与工程报告
├── GTM/                         # 🗺️ GTM 策略中枢静态页（在线: https://gjbs6uhxeute.meoo.fun）
├── configs/                     # 运行配置
│   ├── resolveagent.yaml        # 平台配置
│   ├── runtime.yaml             # 运行时配置
│   └── models.yaml              # 模型配置
├── scripts/                     # 开发运维脚本
│   └── start-local.sh           # 🚀 本地一键启动 (all/deps/platform/runtime/web/status/...)
├── deploy/                      # 部署配置
│   ├── docker/                  # Dockerfile (platform/runtime/webui)
│   ├── docker-compose/          # Compose (deps 含 etcd / 全栈)
│   ├── helm/                    # Helm Chart
│   └── k8s/                     # K8s manifests
├── skills/                      # 技能注册表 (registry.yaml)
├── examples/                    # 示例 (quickstart / integrations)
├── integrations/dify/           # Dify 集成
├── test/                        # E2E / 集成 / 负载测试
├── hack/                        # 开发工具 (quality-gate / coverage-report)
└── .github/workflows/           # CI/CD 流水线
```

---

## Configuration

### Environment Variables (.env)

平台与运行时配置统一使用 `RESOLVEAGENT_*` 前缀（参考 `.env.example`）:

```bash
# 服务地址
RESOLVEAGENT_HTTP_ADDR=:8080
RESOLVEAGENT_GRPC_ADDR=:9090
RESOLVEAGENT_LOG_LEVEL=info

# 数据层
DATABASE_URL=postgres://resolveagent:resolveagent@localhost:5432/resolveagent?sslmode=disable
RESOLVEAGENT_REDIS_ADDR=localhost:6379
RESOLVEAGENT_NATS_URL=nats://localhost:4222

# LLM (多 Provider)
RESOLVEAGENT_LLM_QWEN_API_KEY=your-qwen-key
RESOLVEAGENT_LLM_WENXIN_API_KEY=your-wenxin-key
RESOLVEAGENT_LLM_ZHIPU_API_KEY=your-zhipu-key
KIMI_API_KEY=your-kimi-key          # 经 OpenAI 兼容层接入
LLM_BASE_URL=https://api.moonshot.cn/v1
LLM_DEFAULT_MODEL=kimi-k2.5-turbo-preview
# 小米 MiMo Token Plan (可选): 切到 MiMo 时 LLM_BASE_URL/LLM_DEFAULT_MODEL 改为:
#   LLM_BASE_URL=https://token-plan-cn.xiaomimimo.com/v1 (区域端点: cn/sgp/ams)
#   LLM_DEFAULT_MODEL=mimo-v2.5-pro
#   XIAOMI_TOKEN_PLAN_API_KEY=tp-xxxx (按 base_url 自动路由, 与 Kimi 互不干扰)

# 网关与可观测性
RESOLVEAGENT_GATEWAY_ENABLED=true
RESOLVEAGENT_TELEMETRY_ENABLED=true
RESOLVEAGENT_TELEMETRY_OTLP_ENDPOINT=http://localhost:4318
```

> ⚠️ Kimi K2.5 等模型调用需在 `configs/models.yaml` / provider 配置中**禁用 thinking 模式**，详见 [Kimi K2.5 集成规范](docs/zh/agentscope-higress-integration.md) 与 [configuration.md](docs/zh/configuration.md)。

### Configuration Files

| 文件 | 说明 |
|------|------|
| `configs/resolveagent.yaml` | Go 平台服务配置（注册表/网关/存储） |
| `configs/runtime.yaml` | Python 运行时配置（Agent/记忆/技能） |
| `configs/models.yaml` | LLM 模型路由与参数配置 |
| `configs/examples/` | 各环境配置示例 |

---

## Documentation

### Chinese Documentation (docs/zh/)

| 文档 | 说明 |
|------|------|
| [快速开始](docs/zh/quickstart.md) | 本地部署与启动指南 |
| [本地部署](docs/zh/local-deployment.md) | 本地开发环境搭建 |
| [架构详解](docs/zh/architecture.md) | 系统架构深度解析 |
| [智能选择器](docs/zh/intelligent-selector.md) | 路由机制与策略 |
| [弹性选择器评估](docs/zh/resilient-selector-evaluation.md) | Resilient Selector 设计评估 |
| [Loop Engineering](docs/zh/loop-engineering.md) | 循环工程方法论 |
| [FTA 引擎](docs/zh/fta-engine.md) | 故障树分析引擎 |
| [RAG 管道](docs/zh/rag-pipeline.md) | 检索增强生成 |
| [技能系统](docs/zh/skill-system.md) | 技能注册与沙箱 |
| [工单总结 Agent](docs/zh/ticket-summary-agent.md) | 核心业务场景设计 |
| [配置指南](docs/zh/configuration.md) | 环境变量与配置详解 |
| [CLI 参考](docs/zh/cli-reference.md) | 命令行接口 |
| [最佳实践](docs/zh/best-practices.md) | 生产最佳实践 |
| [部署指南](docs/zh/deployment.md) | Docker/Helm/K8s 部署 |

### Documentation Site

Online documentation site (Docusaurus): [`docs-site/`](docs-site/) —— 涵盖架构（architecture）、API、ADR、运维（ops）、开发指南（dev-guide）与用户指南（user-guide）。

---

## Testing

```bash
# 全量测试（Go + Python + WebUI 并行）
make test

# Python 单元测试（432+ 用例，含熔断器/降级/记忆/规划）
cd python && PYTHONPATH=src .venv/bin/python -m pytest tests/unit/ -v

# Go 测试
go test -race -coverprofile=coverage.out ./...

# WebUI 测试
cd web && pnpm run test

# 质量门禁（lint + test + coverage）
make lint
hack/quality-gate.sh
```

**测试覆盖亮点**（`python/tests/unit/`）:
- `test_resilience.py` — 熔断器三态机、50 并发失败、降级级联（19 用例）
- `test_memory.py` — 三层记忆、TTL 过期、LRU 逐出
- `test_planning.py` — 双模式规划、JSON 容错解析、Replan

---

## Metrics

| 指标 | 说明 |
|------|------|
| `resolveagent_selector_decisions_total` | 路由决策总数 |
| `resolveagent_selector_cache_hit_rate` | 缓存命中率 |
| `resolveagent_audit_records_total` | 审计记录数 |
| `resolveagent_memory_promotions_total` | 记忆沉淀数 |
| `resolveagent_planner_replans_total` | Replan 次数 |
| `resolveagent_toolhub_executions_total` | 工具执行数 |
| `resolveagent_circuit_breaker_state` | 熔断器状态 (0=closed, 1=open, 2=half_open) |
| `resolveagent_feedback_signals_total` | 🔄 反馈信号总数 (by source, event) |
| `resolveagent_feedback_loop_duration_seconds` | 🔄 反馈循环处理耗时 |
| `resolveagent_retry_exhausted_total` | 🔄 重试耗尽次数 |
| `resolveagent_workflow_success_rate` | 🔄 工作流成功率 |
| `resolveagent_adaptive_selector_weights` | 🔄 自适应选择器权重 (by route_type) |

---

## WebUI

访问 **http://localhost:5174** 查看可视化控制台，包含 23 个功能页面：

- **Home / Dashboard** — 平台总览与执行模式
- **Architecture** — 四层架构叙事
- **Playground** — 与 Agent 多轮对话（Kimi K2.5 等模型）
- **Selector / SelectorAdapters** — 智能路由决策可视化 + 自适应权重 + 适配器
- **FTAEngine** — 故障树编辑器与仿真
- **Workflows** — 工作流编排
- **Agents** — Agent 管理与配置
- **Skills** — 技能系统管理
- **RAG** — 知识库与向量检索
- **CodeAnalysis** — 代码分析
- **TicketSummary** — 工单总结业务场景
- **Solutions** — 解决方案
- **Monitoring / Traces** — 监控指标与链路追踪
- **Database / DatabaseSchema** — 数据管理与 Schema
- **AgentScopeHigress** — 网关集成演示
- **Demo / Evaluation** — 演示与评估
- **Settings** — 系统设置
- **Mobile** — 移动端预览

---

## Deployment

```bash
# 构建镜像 (platform / runtime / webui)
make docker

# Docker Compose 全栈
make compose-up

# Helm 部署
make helm-install

# 数据库迁移与种子数据
make migrate-up
make seed
```

生产部署推荐使用 `deploy/helm/resolveagent/`（含健康检查、资源限制、HPA 配置），详见 [部署指南](docs/zh/deployment.md)。

---

## Roadmap

Our public roadmap is tracked in [ROADMAP.md](ROADMAP.md) and on [GitHub Issues](https://github.com/ai-guru-global/resolve-agent/issues).

| Version | Theme | Highlights |
|---------|-------|------------|
| v0.1.0 | Foundation | Go platform (gRPC + REST), Python runtime, FTA engine, Intelligent Selector, RAG, WebUI, CLI, Docker Compose, Helm. |
| v0.2.0 | Hardening | DB migrations, unified error handling, OpenTelemetry logging, health checks, integration tests, retry with backoff. |
| v0.3.0 | WebUI & DevEx | Mock-data auto-detection, project cleanup, deployment unification, examples & scaffolding. |
| v0.4.0 | Ecosystem | Skill marketplace, plugin SDK, multi-tenancy, RBAC, audit dashboard. |
| v0.5.0 | Scale | Horizontal agent runtime, distributed workflows, NATS JetStream, advanced RAG. |

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

For general security practices, see:
- [LICENSE](LICENSE) — Apache 2.0
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — Community standards

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
