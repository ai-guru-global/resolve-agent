# 路由重试环路架构评估

> 提出者: Allen
> 评估日期: 2026-05-19
> 评估对象: Intelligent Selector 路由失败后的反馈重试机制

---

## 一、你的思路描述

```
用户输入
  ↓
意图分析 + 上下文丰富
  ↓
路由决策 → 选择权重最高的路由
  ↓
执行路由 (Skill / RAG / Workflow / ...)
  ↓
成功 → 返回结果
失败 ↓
  ↓
回到上下文丰富器 (注入失败信息: 哪个路由失败、失败原因、错误类型)
  ↓
重新路由决策 (此时上下文更丰富，可能选择不同路由)
  ↓
执行路由
  ↓
成功 → 返回结果
失败 ↓
  ↓
... 循环 ...
  ↓
最终兜底: 代码解析器 (Code Analysis)
  ↓
成功 → 返回结果
失败 ↓
  ↓
真正的失败退出
```

核心理念: **每一次失败都不是浪费，而是为下一次路由决策提供更丰富的上下文**。

---

## 二、当前架构 vs 提议架构

### 当前架构 (One-shot)

```
Intent → ContextEnrich → RouteDecide → Execute → 返回
                                                  (失败就失败了)
```

问题:
- 路由决策是**一次性的**，失败后没有重试机制
- 用户需要手动重新表述问题
- 对于 AIOps 场景，很多问题需要多轮尝试才能定位

### 提议架构 (Feedback Loop)

```
Intent → ContextEnrich → RouteDecide → Execute
              ↑                            |
              └──── 失败反馈 ←─────────────┘
```

优势:
- 自动化的"试错-学习-重试"循环
- 每次重试都携带更丰富的上下文
- 代码解析器作为最终兜底，最大化覆盖率

---

## 三、深度评估

### 3.1 这个思路对不对？— 非常对

这个思路本质上是一个 **Selector-level 的 ReAct 循环**:

```
传统 ReAct:  Thought → Action → Observation → Thought → ...
你的思路:    Route   → Execute → Failure    → Re-enrich → Route → ...
```

而且你选择的重试顺序体现了正确的降级策略:

```
Skill (快, 精确) → RAG (知识) → Workflow (复杂推理) → Code Analysis (深度分析)
```

这和已有的 FallbackCascade 思路一脉相承，但粒度更细:
- FallbackCascade 是 tool-level 的降级 (MCP → Native → LLM)
- 你提出的是 **route-level 的降级** (不同子系统之间的切换)

两者互补，不冲突。

### 3.2 具体优势分析

**1. 大幅提升问题解决覆盖率**

当前 one-shot 模式下，如果路由到 RAG 但文档中没有答案，就直接失败。
你的方案会自动尝试 Workflow (让 LLM 推理) 或 Code Analysis (深度分析)。

**2. 失败信息是极好的路由信号**

```python
# 第一次: 意图分析认为是 RAG 问题
intent = "what is the deployment process?"
→ route: RAG
→ 失败: "No relevant documents found"

# 第二次: 重丰富后，路由决策知道 RAG 失败了
# 新的上下文: {"rag_failed": True, "rag_reason": "no_docs"}
→ route: Workflow (让 LLM 直接回答)
→ 成功
```

**3. 对 AIOps 场景特别适合**

AIOps 的问题特点:
- 同一个问题可能需要多种方法才能解决
- 先查文档 (RAG)，再分析代码 (Code Analysis)，最后人工推理 (Workflow)
- 用户不想关心用什么方法，只想问题被解决

### 3.3 需要注意的风险

**风险 1: 无限循环**

必须有硬上限。建议:
```python
MAX_ROUTE_RETRIES = 3  # 最多重试 3 次
```

**风险 2: 延迟累积**

每次重试 = 重新 enrich + 重新 route + 重新 execute。
如果每次 3 秒，3 次重试就是 9 秒。

缓解措施:
- 重丰富时**增量添加**失败信息，不重跑完整的 enrich 管道
- 设置整体超时: `total_timeout = 30s`

**风险 3: 重复路由到同一个失败路径**

必须记录已尝试的路由，避免重复:
```python
tried_routes: list[str] = ["rag"]  # 已尝试
# 下次决策时排除 RAG
```

**风险 4: 定义"失败"**

需要明确什么算失败:
- Skill 执行抛异常 → 失败 ✓
- RAG 返回空结果 → 失败 ✓
- RAG 返回低相关度结果 → ?
- Workflow 执行超时 → 失败 ✓
- Workflow 返回结果但用户不满意 → 需要额外判断

建议: 先用简单定义 (异常 + 空结果 + 超时)，后续迭代优化。

**风险 5: 重丰富器需要知道"什么信息对下次路由有用"**

不是简单的把错误信息 append 到 context 中。
好的重丰富策略:
```python
def re_enrich_with_failure(context, failed_route, error):
    context["attempted_routes"].append(failed_route)
    context["last_failure"] = {
        "route": failed_route,
        "error_type": type(error).__name__,
        "error_message": str(error),
        "timestamp": now(),
    }
    # 关键: 根据失败类型调整路由偏好
    if failed_route == "rag" and "no results" in str(error):
        context["prefer_non_rag"] = True  # 引导下次不要选 RAG
    return context
```

---

## 四、推荐的设计方案

### 4.1 数据结构

```python
@dataclass
class RouteAttempt:
    """一次路由尝试的记录"""
    route_type: str          # skill / rag / fta / code_analysis
    route_target: str        # 具体目标
    success: bool            # 是否成功
    error: str | None        # 失败原因
    latency_ms: float        # 耗时
    result_summary: str      # 结果摘要

@dataclass
class RoutingSession:
    """一次完整的路由会话 (可能包含多次尝试)"""
    session_id: str
    original_input: str
    attempts: list[RouteAttempt]
    final_result: Any | None
    total_latency_ms: float
```

### 4.2 核心流程

```python
class ResilientSelector:
    """带回退重试的智能选择器"""

    MAX_RETRIES = 3
    TOTAL_TIMEOUT = 30.0  # 秒
    ROUTE_PRIORITY = ["skill", "rag", "fta", "code_analysis"]

    async def route_and_execute(
        self,
        input_text: str,
        agent_id: str,
        executor: Callable,  # 执行路由的函数
    ) -> RoutingSession:
        session = RoutingSession(...)
        start = time.monotonic()
        context = {}
        tried_routes: set[str] = set()

        for attempt in range(self.MAX_RETRIES + 1):
            # 1. 超时检查
            if time.monotonic() - start > self.TOTAL_TIMEOUT:
                break

            # 2. 增量丰富上下文 (第一次完整, 后续增量)
            if attempt == 0:
                enriched = await self._enricher.enrich(input_text, agent_id, context)
            else:
                enriched = await self._re_enrich(enriched, session.attempts[-1])

            # 3. 路由决策 (排除已尝试的路由)
            decision = await self._selector.route(
                input_text, agent_id,
                context={**enriched.to_dict(), "tried_routes": list(tried_routes)},
                bypass_cache=attempt > 0,  # 重试时跳过缓存
            )

            # 4. 执行
            tried_routes.add(decision.route_type)
            attempt_record = await self._execute(decision, executor)
            session.attempts.append(attempt_record)

            # 5. 成功则返回
            if attempt_record.success:
                session.final_result = attempt_record.result_summary
                break

        session.total_latency_ms = (time.monotonic() - start) * 1000
        return session
```

### 4.3 重丰富策略

```python
async def _re_enrich(self, enriched, last_attempt):
    """增量重丰富 — 只添加失败信息, 不重跑完整管道"""
    enriched.session_metadata["attempt_count"] = len(enriched.session_metadata.get("attempted_routes", [])) + 1
    enriched.session_metadata.setdefault("attempted_routes", []).append(last_attempt.route_type)

    if last_attempt.error:
        enriched.session_metadata["last_failure"] = {
            "route": last_attempt.route_type,
            "error": last_attempt.error,
            "suggestion": self._suggest_from_failure(last_attempt),
        }
    return enriched

def _suggest_from_failure(self, attempt):
    """根据失败类型建议下次路由偏好"""
    if attempt.route_type == "rag":
        return "try_workflow_or_code_analysis"
    if attempt.route_type == "skill":
        return "try_rag_or_workflow"
    if attempt.route_type == "fta":
        return "try_code_analysis"
    return "try_any"
```

### 4.4 路由决策中的排除逻辑

在 RouteDecider 中添加:

```python
async def decide(self, intent_type, confidence, context):
    tried = set(context.get("tried_routes", []))

    # 如果已尝试的路由失败了, 降低对应路由的权重
    route_type = self.INTENT_TO_ROUTE.get(intent_type, "direct")
    if route_type in tried:
        # 尝试下一个优先级的路由
        route_type = self._next_route(route_type, tried)

    # ... 其余逻辑不变
```

---

## 五、与现有架构的兼容性

### 5.1 与 FallbackCascade 的关系

```
ResilientSelector (route-level)
  ↓ 路由到 Skill
  ↓
FallbackCascade (tool-level)  ← 现有架构
  MCP Tool → Native Skill → LLM Direct → Cached
```

两者是**嵌套关系**，不是替代关系:
- ResilientSelector 决定去哪个子系统
- FallbackCascade 在子系统内部决定用哪个具体工具

### 5.2 与 HybridPlanner 的关系

当 ResilientSelector 路由到 Workflow/FTA 时，HybridPlanner 负责具体的步骤分解和执行。如果 Planner 执行失败 (replan 耗尽)，ResilientSelector 会收到失败信号并尝试下一个路由。

### 5.3 与 CircuitBreaker 的关系

如果某个路由类型连续失败 (比如 RAG 服务不可用)，CircuitBreaker 会快速失败，ResilientSelector 可以直接跳过该路由。

---

## 六、总结

### 结论: 强烈推荐实施

这个思路**非常正确**，原因:

1. **符合 2026 Agent Engineering 趋势**: 反馈驱动的自适应路由是 Agent 系统的核心竞争力
2. **与现有架构完美兼容**: 不需要推翻任何现有模块，是在 Selector 之上加一层编排
3. **投入产出比高**: 核心改动集中在 `selector/selector.py` 和新增 `selector/resilient_selector.py`，预计 300-500 行代码
4. **AIOps 场景的刚需**: 运维问题很少一次路由就能解决，多轮尝试是常态

### 实施优先级建议

| 阶段 | 内容 | 工作量 |
|------|------|--------|
| Phase 1 | ResilientSelector 基础框架 + max_retries + timeout | 2 天 |
| Phase 2 | 重丰富策略 + 路由排除逻辑 | 1 天 |
| Phase 3 | 与 FallbackCascade/CircuitBreaker 集成 | 1 天 |
| Phase 4 | 测试 + 调优 (retry 次数、超时、降级顺序) | 1 天 |

### 一句话评价

**这是从 "一次性路由" 进化到 "自适应路由" 的关键一步，是 ResolveAgent 区别于普通 Agent 框架的核心差异点。**
