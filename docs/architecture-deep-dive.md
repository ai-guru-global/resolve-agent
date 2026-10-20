# Architecture Deep Dive | 架构深潜

> 本文承接 README 的架构速览，给出核心模块的代码级讲解。
> 以下代码路径均相对 `python/src/resolveagent/` 目录（Go 模块另行标注）。
> 架构总览与三层分工见 [docs/design/00-overview.md](design/00-overview.md) 与 [docs/zh/architecture.md](zh/architecture.md)。

## Core Concepts | 核心概念

| 概念 | 说明 |
|------|------|
| **Route / RouteType** | 路由路径类型：`fta`（故障树推理）、`skill`（技能编排）、`knowledge`（RAG 检索）、`code_analysis`（代码分析）、`reasoning`（LLM 直答） |
| **IntelligentSelector** | 三阶段元路由器：意图分析 → 上下文增强 → 路由决策，支持 rule / llm / hybrid 三种策略 |
| **ResilientSelector** | 反馈驱动弹性路由：失败重试 + 错误分类路由偏好 + 上下文重增强 |
| **MegaAgent** | 顶层编排层：将 Selector、Planner、Memory、Skill、Hook 组装为可降级的完整 Agent（见 [选择器适配器](zh/selector-adapters.md)） |
| **FTA / 最小割集** | 形式化故障树：门类型组合表达故障传播逻辑，最小割集给出导致顶事件的最小根因组合 |
| **Skill** | 插件化专家技能（如 `k8s-pod-crash`）：manifest 描述 + 沙箱执行 + 生命周期管理 |
| **Corpus 语料** | 排查知识资产：RAG 文档、调用链语料、技能沉淀，支撑"越用越准"的飞轮 |
| **Hierarchical Memory** | 三层记忆：Working（会话内滚动窗口）/ Episodic（Redis TTL）/ Long-term（向量库 LRU） |
| **Loop Engineering** | 持续反馈闭环：信号收集 → 聚合 → 决策 → 执行，覆盖健康度/重试/工作流/熔断器 |

---

## 1. Intelligent Selector | 智能选择器

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

## 2. Resilient Selector | 弹性自适应路由

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

**错误分类路由偏好：**

| 失败类型 | 路由偏好 |
|---------|---------|
| `resource_missing` → RAG 失败 | 偏好 `reasoning`（LLM 推理兜底） |
| `resource_missing` → Skill 失败 | 偏好 `knowledge`（知识库检索） |
| FTA 任意失败（未试过 code_analysis） | 偏好 `code_analysis` |
| 其他 | 按权重依次尝试剩余路径 |

**核心思想:** 每一次失败都不是浪费，而是为下一次路由决策提供更丰富的上下文。

## 3. Decision Audit Logger | 决策审计

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

## 4. Hierarchical Memory | 分层记忆

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

## 5. Hybrid Planner | 混合规划器

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

## 6. FTA Engine | 故障树分析引擎

```python
# fta/engine.py
class FTAEngine:
    """五种门类型（AND/OR/VOTING/INHIBIT/PRIORITY_AND）+ 最小割集 + 蒙特卡洛仿真"""

# 实际用法：
result = await engine.analyze(tree)   # MOCUS 最小割集 + 蒙特卡洛仿真
# result.cut_sets → list[set[str]] 最小割集
# result.failure_probability → top 事件失效概率（基础事件需设置 probability，
#   PRIORITY_AND 按每次试验随机失效次序实现时序语义，附 Wilson 置信区间）
```

**AIOps 应用流程:** 工单/告警接入 → 故障树建模 → 割集分析定位根因 → 修复建议生成 → 反馈闭环验证

## 7. ToolHub | 工具中心

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

## 8. Resilience | 弹性模式

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

## 9. AgentMessageBus | 消息总线

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

## 10. Loop Engineering | 循环工程

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

> 📖 详见 [Loop Engineering 文档](zh/loop-engineering.md)

## 11. Circuit Breaker (Go) | 三态熔断器

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

## 12. Adaptive Selector | 自适应权重

```python
# selector/resilient_selector.py — 已内置接线，无需手工实例化
selector = ResilientSelector()  # 内置 AdaptiveWeightAdjuster（adaptive_weights_enabled=True）

# 每次路由尝试后自动 record_outcome(route_type, success)，会话结束 apply_decay()
session = await selector.route_and_execute("诊断 503", "ops-agent", executor)

# 备选路由按权重降序稳定排序（同权重保持 route_priority 顺序）；
# 错误分类路由偏好命中时仍最优先
stats = selector.get_session_stats()
weights = stats["adaptive_weights"]["weights"]
# → {"skill": 1.05, "rag": 0.95, ...}
```
