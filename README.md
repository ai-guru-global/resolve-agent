<p align="center">
  <img src="docs/assets/logo.svg" alt="ResolveAgent Logo" width="200">
</p>

<h1 align="center">ResolveAgent</h1>

<p align="center">
  <strong>2026 Agent Engineering | 面向问题解决的 AIOps 智能体</strong>
</p>

<p align="center">
  <code>🧠 Intelligent Selector</code> · <code>🌳 Hybrid Planner</code> · <code>💾 Hierarchical Memory</code> · <code>🔧 ToolHub</code>
</p>

<p align="center">
  <a href="https://github.com/ai-guru-global/resolve-agent/releases"><img src="https://img.shields.io/github/v/release/ai-guru-global/resolve-agent?style=flat-square" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square" alt="License"></a>
  <a href="https://github.com/ai-guru-global/resolve-agent/actions"><img src="https://img.shields.io/github/actions/workflow/status/ai-guru-global/resolve-agent/ci.yaml?branch=main&style=flat-square" alt="CI Status"></a>
  <a href="https://goreportcard.com/report/github.com/ai-guru-global/resolve-agent"><img src="https://img.shields.io/badge/Go-1.22-00ADD8.svg?style=flat-square&logo=go" alt="Go"></a>
</p>

---

## 🌟 Overview | 概述

**ResolveAgent** 是基于 **2026 Agent Engineering** 最佳实践构建的生产级 AIOps 智能体平台。

### 核心架构 | Core Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RESOLVEAGENT                                 │
│                                                                      │
│  ┌──────────┐    ┌──────────────┐    ┌────────────────────────────┐ │
│  │  Client  │───▶│   Higress    │───▶│     Platform (Go)          │ │
│  │  CLI/UI  │    │   Gateway    │    │  Registry │ Auth │ Route   │ │
│  └──────────┘    └──────────────┘    └────────────────────────────┘ │
│                                            │                         │
│                                            ▼                         │
│                          ┌─────────────────────────────────────┐   │
│                          │       Agent Runtime (Python)         │   │
│                          │                                      │   │
│                          │  ┌─────────┐  ┌─────────┐  ┌───────┐ │   │
│                          │  │Selector │  │Planner │  │Memory │ │   │
│                          │  │ +Audit  │  │+ReAct  │  │+Hub   │ │   │
│                          │  └─────────┘  └─────────┘  └───────┘ │   │
│                          │                                      │   │
│                          │  ┌─────────┐  ┌─────────┐  ┌───────┐ │   │
│                          │  │   FTA   │  │ Skills  │  │  RAG  │ │   │
│                          │  │ Engine  │  │ +ToolHub│  │Pipeline│ │   │
│                          │  └─────────┘  └─────────┘  └───────┘ │   │
│                          │                                      │   │
│                          │  ┌─────────────────────────────────┐ │   │
│                          │  │   AgentMessageBus (Pub/Sub)     │ │   │
│                          │  └─────────────────────────────────┘ │   │
│                          └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 九大架构特性 | 9 Architecture Highlights

| # | 特性 | 模块 | 说明 |
|---|------|------|------|
| 1 | **Intelligent Selector** | `selector/` | 意图分析 + 上下文丰富 + 路由决策 |
| 2 | **Decision Audit Logger** | `selector/audit.py` | 完整路由决策审计追踪 |
| 3 | **Hierarchical Memory** | `memory.py` | Working/Episodic/Long-term 三层记忆 |
| 4 | **Hybrid Planner** | `planning.py` | REACTIVE + DELIBERATIVE 双模式 |
| 5 | **ToolHub** | `toolhub.py` | 工具发现 + Schema注册 + Capability映射 |
| 6 | **Resilience** | `resilience.py` | CircuitBreaker + FallbackCascade |
| 7 | **AgentMessageBus** | `message_bus.py` | 订阅-发布消息总线 |
| 8 | **gRPC Server** | `runtime/server.py` | 带 HTTP fallback 的 gRPC 服务 |
| 9 | **Resilient Selector** | `selector/resilient_selector.py` | 反馈驱动自适应路由：失败重试 + 上下文重丰富 + 渐进降级 |

---

## 🏗️ Architecture Deep Dive | 架构深度解析

### 1. Intelligent Selector | 智能选择器

```python
# selector/selector.py
class IntelligentSelector:
    """三层路由架构"""
    async def route(input_text, agent_id, context):
        # 1. Intent Analysis - 意图分类
        intent = await intent_analyzer.classify(input_text)

        # 2. Context Enrichment - 上下文丰富
        enriched = await context_enricher.enrich(
            input_text, agent_id, context
        )
        #   - 记忆查询 (MemoryClient)
        #   - 偏好推断 (_infer_user_preferences)
        #   - 代码检测 (_analyze_code_context)

        # 3. Route Decision - 路由决策
        decision = await route_decider.decide(
            intent_type=intent.type,
            confidence=intent.confidence,
            context=enriched
        )

        # 4. Audit Logging - 审计记录
        await audit_logger.log(decision, enriched, latency_ms)

        return decision
```

**路由策略:**
- `rule` - 快速精确模式
- `llm` - LLM 智能分类
- `hybrid` - 规则优先 + LLM 回退 (推荐)

### 2. Decision Audit Logger | 决策审计

```python
# selector/audit.py
@dataclass
class AuditRecord:
    timestamp: str
    decision_type: str      # fta/skill/rag/direct
    confidence: float
    reasoning: str
    context_snapshot: dict  # skills_count, code_issues, etc.
    latency_ms: float
```

**特性:**
- 异步写入，不阻塞主流程
- 支持持久化到 Go Platform Store
- 完整的上下文快照

### 3. Hierarchical Memory | 分层记忆

```python
# memory.py
class HierarchicalMemory:
    """三层记忆架构"""

    # Layer 1: Working Memory (in-process)
    working = WorkingMemory(max_size=20)  # Rolling window

    # Layer 2: Episodic Memory (Redis)
    episodic = EpisodicMemoryClient(redis_url="redis://...")

    # Layer 3: Long-term Memory (RAG Vector DB)
    long_term = LongTermMemoryClient(collection="long_term_memory")
```

**记忆流动:**
```
User Message → Working Memory (实时)
             → Episodic Memory (session 压缩)
             → Long-term Memory (importance > 0.7)
```

### 4. Hybrid Planner | 混合规划器

```python
# planning.py
class PlanningMode(Enum):
    REACTIVE = "reactive"      # 快速响应
    DELIBERATIVE = "deliberative"  # 深思熟虑

class HybridPlanner:
    async def create_plan(goal, mode):
        if mode == REACTIVE:
            # 单步执行
            return Plan(steps=[...])
        else:
            # LLM 分解为多步骤
            return await self._llm_decompose_plan(goal)
```

**执行流程:**
```
DELIBERATIVE 模式:
  1. LLM 分解目标 → 子步骤
  2. 执行每步骤 → 监控状态
  3. 失败时触发 Replan
  4. 最多重试 3 次

REACTIVE 模式:
  1. 直接 ReAct 循环
  2. Thought → Action → Observation
```

### 5. ToolHub | 工具中心

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

**工具能力:**
| 能力 | 说明 |
|------|------|
| `WEB_SEARCH` | 网页搜索 |
| `CODE_EXECUTION` | 代码执行 |
| `FILE_OPERATIONS` | 文件操作 |
| `CODE_ANALYSIS` | 代码分析 |
| `SECURITY_SCAN` | 安全扫描 |

### 6. Resilience | 弹性模式

```python
# resilience.py
class CircuitBreaker:
    """熔断器保护下游服务"""

    failure_threshold = 5
    reset_timeout = 30.0

    # States: CLOSED → OPEN → HALF_OPEN → CLOSED

class FallbackCascade:
    """多级降级策略"""

    async def execute(*strategies):
        for strategy in strategies:
            try:
                return await strategy()
            except Exception as e:
                continue  # 尝试下一个
        return FallbackResult(success=False)
```

**降级路径:**
```
MCP Tool → Native Skill → LLM Direct → Cached Response
```

### 7. AgentMessageBus | 消息总线

```python
# message_bus.py
class AgentMessageBus:
    """订阅-发布消息总线"""

    async def subscribe(agent_id, channel, callback):
        """订阅频道"""

    async def publish(message: AgentMessage):
        """发布消息"""

    async def request(sender, channel, content, timeout):
        """请求-响应模式"""
```

**消息模式:**
- **Pub/Sub** - 发布订阅
- **Request/Response** - 请求响应 (带 correlation_id)
- **Broadcast** - 广播

### 8. gRPC Server | gRPC 服务

```python
# runtime/server.py
class AgentExecutionServer:
    async def start(self):
        try:
            # 优先使用 gRPC + Protobuf
            server = grpc.aio.server()
            agent_pb2_grpc.add_AgentExecutionServiceServicer_to_server(
                AgentExecutionServicer(self._engine), server
            )
        except ImportError:
            # Fallback 到 aiohttp HTTP 服务器
            await self._start_http_fallback()
```

### 9. Resilient Selector | 弹性自适应路由

```python
# selector/resilient_selector.py
class ResilientSelector:
    """Feedback-driven adaptive routing with graceful degradation"""
    
    MAX_RETRIES = 3
    ROUTE_PRIORITY = ["skill", "rag", "fta", "code_analysis"]
    
    async def route_and_execute(self, input_text, agent_id, executor):
        tried_routes = set()
        for attempt in range(self.MAX_RETRIES + 1):
            # 1. Enrich context (first time: full, subsequent: incremental)
            ctx = await self._enrich(input_text, agent_id, attempt, tried_routes)
            
            # 2. Route decision (exclude tried routes)
            decision = await self._selector.route(input_text, agent_id, context=ctx)
            
            # 3. Execute
            result = await executor(decision)
            if result.success:
                return result
            
            # 4. Record failure for next iteration
            tried_routes.add(decision.route_type)
            ctx["last_failure"] = {"route": decision.route_type, "error": result.error}
        
        # Final fallback: Code Analysis
        return await self._code_analysis_fallback(input_text, agent_id)
```

**降级路径:**
```
Skill (快速精确) → RAG (知识检索) → Workflow (LLM 推理) → Code Analysis (深度兜底)
```

**核心思想:** 每一次失败都不是浪费，而是为下一次路由决策提供更丰富的上下文。

---

## 🚀 Quick Start | 快速开始

### 环境要求

| Dependency | Version |
|------------|---------|
| Go | >= 1.22 |
| Python | >= 3.11 |
| Docker | >= 20.10 |

### 启动服务

```bash
# 克隆仓库
git clone https://github.com/ai-guru-global/resolve-agent.git
cd resolve-agent

# 启动依赖
make compose-deps

# 构建
make build

# 启动
make compose-up

# 访问
# - API: http://localhost:8080
# - WebUI: http://localhost:3000
```

### Python Agent 示例

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
    agent_id="my-agent"
)
# → RouteDecision(route_type="code_analysis", confidence=0.85)

# 规划执行 (Deliberative 模式)
plan = await planner.create_plan(
    goal="诊断 API 500 错误",
    mode=PlanningMode.DELIBERATIVE
)
# → Plan(steps=[Step(gather_info), Step(diagnose), Step(fix)])

# 记忆管理
memory.add("user", "我想部署到 k8s", importance=0.8)
recent = memory.get_recent(limit=10)
```

---

## 📊 Feature Status | 功能状态

> **v0.3.0** | 2026-05 Architecture Complete

### 架构组件

| 组件 | 状态 | 文件 |
|------|------|------|
| Intelligent Selector | 🟢 Ready | `selector/selector.py` |
| Decision Audit Logger | 🟢 Ready | `selector/audit.py` |
| Context Enricher | 🟢 Ready | `selector/context_enricher.py` |
| Route Decider | 🟢 Ready | `selector/router.py` |
| Hierarchical Memory | 🟢 Ready | `memory.py` |
| Hybrid Planner | 🟢 Ready | `planning.py` |
| ReAct Executor | 🟢 Ready | `planning.py` |
| ToolHub | 🟢 Ready | `toolhub.py` |
| Schema Registry | 🟢 Ready | `toolhub.py` |
| Capability Map | 🟢 Ready | `toolhub.py` |
| Security Policy | 🟢 Ready | `toolhub.py` |
| Circuit Breaker | 🟢 Ready | `resilience.py` |
| Fallback Cascade | 🟢 Ready | `resilience.py` |
| Agent Message Bus | 🟢 Ready | `message_bus.py` |
| Message Bus Registry | 🟢 Ready | `message_bus.py` |
| gRPC Server | 🟢 Ready | `runtime/server.py` |
| Resilient Selector | 🟡 Planned | `selector/resilient_selector.py` |

### 核心引擎

| 引擎 | 状态 | 说明 |
|------|------|------|
| FTA Engine | 🟢 Ready | 故障树分析 |
| RAG Pipeline | 🟢 Ready | 检索增强生成 |
| Skill Executor | 🟢 Ready | 技能执行 + 沙箱 |
| LLM Providers | 🟢 Ready | 6 个 Provider |
| MCP Adapter | 🟢 Ready | Model Context Protocol |

---

## 🗂️ Project Structure | 项目结构

```
resolve-agent/
├── api/
│   └── proto/resolveagent/v1/   # Protocol Buffers
├── cmd/
│   ├── resolveagent-cli/        # CLI 应用
│   └── resolveagent-server/     # Platform Server
├── pkg/                         # Go 平台服务
│   ├── config/
│   ├── event/
│   ├── gateway/
│   ├── registry/
│   ├── server/
│   └── store/
├── python/src/resolveagent/
│   ├── selector/               # 🧠 智能选择器
│   │   ├── audit.py           # Decision Audit Logger
│   │   ├── cache.py           # 路由决策缓存
│   │   ├── context_enricher.py # 上下文丰富
│   │   ├── intent.py          # 意图分析
│   │   ├── router.py         # 路由决策
│   │   └── strategies/        # 路由策略
│   ├── memory.py              # 💾 分层记忆
│   ├── planning.py            # 🌳 混合规划器
│   ├── toolhub.py             # 🔧 工具中心
│   ├── resilience.py          # 🛡️ 弹性模式
│   ├── message_bus.py         # 📡 消息总线
│   ├── agent/                 # Agent 定义
│   ├── fta/                   # FTA 引擎
│   ├── rag/                   # RAG 管道
│   ├── skills/                # 技能系统
│   ├── llm/                   # LLM 提供者
│   ├── mcp/                   # MCP 适配器
│   └── runtime/               # 运行时
├── web/                        # 🌐 React WebUI
├── deploy/                     # 部署配置
└── docs/                       # 文档

```

---

## 🔧 Configuration | 配置

### 环境变量

```bash
# LLM 配置
LLM_DEFAULT_MODEL=qwen-plus
LLM_API_KEY=your-api-key
HIGRESS_URL=http://localhost:8080

# 记忆配置
REDIS_URL=redis://localhost:6379
MILVUS_URL=http://localhost:19530

# MCP 配置
MCP_ENABLED=true
MCP_STDIO_SERVERS=[]

# 安全配置
AUTH_ENABLED=true
RATE_LIMIT_PER_MINUTE=100
```

---

## 📚 Documentation | 文档

| 文档 | 说明 |
|------|------|
| [Architecture](docs/zh/architecture.md) | 系统架构详解 |
| [CLI Reference](docs/zh/cli-reference.md) | 命令行接口 |
| [Configuration](docs/zh/configuration.md) | 配置指南 |
| [API Reference](docs/api/) | API 文档 |
| [Best Practices](docs/zh/best-practices.md) | 生产最佳实践 |

---

## 🧪 Testing | 测试

```bash
# Python 单元测试
cd python && .venv/bin/python -m pytest tests/unit/ -v

# Go 测试
go test -race -coverprofile=coverage.out ./...

# WebUI 测试
cd web && pnpm run test

# 完整测试
make test
```

---

## 📈 Metrics | 指标

| 指标 | 说明 |
|------|------|
| `resolveagent_selector_decisions_total` | 路由决策总数 |
| `resolveagent_selector_cache_hit_rate` | 缓存命中率 |
| `resolveagent_audit_records_total` | 审计记录数 |
| `resolveagent_memory_promotions_total` | 记忆沉淀数 |
| `resolveagent_planner_replans_total` | Replan 次数 |
| `resolveagent_toolhub_executions_total` | 工具执行数 |
| `resolveagent_circuit_breaker_state` | 熔断器状态 |
| `resolveagent_message_bus_messages_total` | 消息总数 |

---

## 🌐 WebUI | Web 界面

访问 `http://localhost:3000` 查看可视化界面：

- **Agent 管理** - 创建、配置、监控 Agent
- **工作流编辑器** - 可视化 FTA 工作流
- **记忆面板** - 查看三层记忆状态
- **审计日志** - 完整路由决策追踪
- **工具市场** - ToolHub 可视化

---

## 📝 License

Apache 2.0 License - 见 [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

- [AgentScope](https://github.com/modelscope/agentscope) - Agent 编排
- [Higress](https://github.com/alibaba/higress) - AI 网关
- [LangGraph](https://github.com/langchain-ai/langgraph) - 图编排
- [MCP](https://modelcontextprotocol.io) - Model Context Protocol