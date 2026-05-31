# Resilient Selector — 代码 vs 设计的差距分析

> 分析日期: 2026-05-31  
> 分析对象: `python/src/resolveagent/selector/resilient_selector.py`  
> 参考设计: `docs/architecture/resilient-selector-loop.md`

---

## 一、架构概览对比

### 设计意图（文档/架构图）

```
用户输入
  ↓
Intent Analysis → Context Enricher → Route Decision → Execute
                       ↑                              |
                       └──── 失败反馈 ← ReEnricher ←─┘
```

**核心循环**: 失败 → **回到 Context Enricher**（重新整理上下文）→ **重新权重选择** → 执行新路由

### 代码实现（实际）

```
用户输入
  ↓
for attempt in range(max_retries + 1):
    decision = selector.route(input_text, agent_id, context=ctx)
    result = executor(decision)
    if failed:
        ctx = re_enricher.re_enrich(ctx, attempt_record, all_attempts)
        # ctx 是 dict，下一轮直接传入 selector.route()
```

**核心循环**: 失败 → ReEnricher 修改 dict → 直接传入下一轮 route()

---

## 二、关键差距（按严重性排序）

### 🔴 P0 — 严重：ReEnricher 的反馈信息在下一轮被 ContextEnricher 覆盖

**问题描述**:

`ReEnricher.re_enrich()` 往 `ctx` 字典中注入了关键反馈信息：

```python
ctx["attempted_routes"] = [...]
ctx["last_failure"] = {"route": ..., "error": ...}
ctx["route_preferences"] = {"prefer_reasoning": True, ...}
ctx["enrichment_confidence"] = 0.85  # 递减
```

但下一轮 `selector.route()` 默认 `enrich_context=True`，会调用：

```python
# selector.py:258-272
async def _enrich_context(self, input_text, agent_id, context):
    if self._context_enricher is None:
        self._context_enricher = ContextEnricher(...)
    enriched = await self._context_enricher.enrich(input_text, agent_id, context)
    return enriched.to_dict()
```

而 `ContextEnricher.enrich()` 的实现：

```python
# context_enricher.py:196-247
async def enrich(self, input_text, agent_id, context):
    enriched = EnrichedContext(
        input_text=input_text,
        agent_id=agent_id,
        session_metadata={"input_hash": ..., "input_length": ...},
    )
    # 查询 skills, workflows, collections, conversation_history...
    enriched.enrichment_confidence = self._calculate_confidence(enriched)
    return enriched
```

`EnrichedContext` 的字段是**固定的**：

```python
@dataclass
class EnrichedContext:
    input_text: str
    agent_id: str
    conversation_history: list[dict] = field(default_factory=list)
    available_skills: list[dict] = field(default_factory=list)
    active_workflows: list[dict] = field(default_factory=list)
    rag_collections: list[dict] = field(default_factory=list)
    code_context: CodeContext | None = None
    user_preferences: dict = field(default_factory=dict)
    session_metadata: dict = field(default_factory=dict)
    enrichment_confidence: float = 1.0
```

**没有** `attempted_routes`、`last_failure`、`route_preferences` 字段！

**后果**:
- `EnrichedContext.to_dict()` 返回的字典**不包含** ReEnricher 注入的所有反馈信息
- 下一轮 IntelligentSelector 做决策时，context 中**没有失败历史**
- IntelligentSelector 可能**重复选择已失败的路由**（因为没有 attempted_routes 提醒）
- `enrichment_confidence` 被重新计算，覆盖了 ReEnricher 的递减逻辑
- `_force_alternative_route()` 成为唯一的防重复机制，但它只在 `decision.route_type in tried_routes` 时触发

**修复建议**:

```python
# 方案 A: 在 EnrichedContext 中保留扩展字段
@dataclass
class EnrichedContext:
    # ... 现有字段 ...
    enrichment_confidence: float = 1.0
    # 新增：保留来自 ReEnricher 的反馈信息
    resilient_feedback: dict[str, Any] = field(default_factory=dict)

# 方案 B: 在 ContextEnricher.enrich() 中合并传入的 context
async def enrich(self, input_text, agent_id, context):
    enriched = EnrichedContext(...)
    # ... 现有丰富逻辑 ...
    # 保留传入 context 中的 resilient 反馈信息
    enriched.resilient_feedback = {
        k: v for k, v in context.items()
        if k in ("attempted_routes", "last_failure", "route_preferences", "attempt_count")
    }
    return enriched
```

---

### 🔴 P0 — 严重：input_text 在循环中完全不变

**问题描述**:

架构设计暗示"重新整理上下文，新增客户输入"，但代码中：

```python
for attempt_num in range(self._config.max_retries + 1):
    decision = await self._selector.route(
        input_text=input_text,  # ← 永远不变
        agent_id=agent_id,
        context=ctx,
        bypass_cache=bypass_cache,
    )
```

用户输入没有任何变化，**没有新的反馈或澄清**被加入 input_text。

**后果**:
- 如果用户输入本身模糊或不完整，反复重试同一输入不会改善结果
- 这与人类"试错-澄清-再试"的模式不符
- 每次循环只是换路由执行同一问题，可能反复遇到同一根本性障碍

**修复建议**:

```python
# 方案 A: 允许 executor 返回修正后的 input_text
if not attempt_record.success and attempt_record.suggested_rephrase:
    input_text = attempt_record.suggested_rephrase

# 方案 B: 将失败摘要追加到 input_text（带标记）
if not attempt_record.success:
    input_text = f"{original_input}\n[系统提示: 之前尝试 {decision.route_type} 失败，原因: {attempt_record.error}]"
```

---

### 🟡 P1 — 高：_force_alternative_route 是被动防御，非主动排除

**问题描述**:

代码逻辑：

```python
decision = await self._selector.route(...)

# 只有当选中已尝试的路由时才强制切换
if decision.route_type in tried_routes and attempt_num > 0:
    decision = self._force_alternative_route(decision, tried_routes, ctx)
```

**后果**:
- 如果 IntelligentSelector 选择了新路由，但新路由同样失败，浪费一次尝试
- 最优策略应是**主动告知** Selector 哪些路由不可用，让它一开始就别选
- 当前实现依赖 "选错 → 发现重复 → 强制切换" 的被动模式

**修复建议**:

```python
# 将 attempted_routes 明确传入 selector 的决策逻辑
ctx["excluded_routes"] = list(tried_routes)  # 让 Selector 主动排除
decision = await self._selector.route(
    input_text=input_text,
    agent_id=agent_id,
    context=ctx,
)
# 然后不需要 _force_alternative_route，因为 Selector 已经知道该排除什么
```

---

### 🟡 P1 — 高：CircuitBreaker 配置存在但未使用

**问题描述**:

```python
@dataclass
class ResilientConfig:
    enable_circuit_breaker: bool = True  # ← 配置项存在
```

但在 `ResilientSelector` 的整个 `route_and_execute()` 中，**没有任何地方**检查或使用 CircuitBreaker。

**后果**:
- 配置项是"死配置"，用户设置 `enable_circuit_breaker=False` 没有任何效果
- 如果某个路由持续失败（如外部服务宕机），ResilientSelector 会持续重试，加剧问题
- 与 `resilience.py` 中已实现的 `CircuitBreaker` 类没有联动

**修复建议**:

```python
from resolveagent.resilience import CircuitBreaker

class ResilientSelector:
    def __init__(self, ...):
        # ...
        self._circuit_breakers: dict[str, CircuitBreaker] = {}

    async def _execute_route(self, decision, executor, attempt_number):
        cb = self._circuit_breakers.get(decision.route_type)
        if cb and not cb.can_execute():
            return RouteAttempt(
                route_type=decision.route_type,
                success=False,
                error="Circuit breaker open",
            )
        try:
            result = await executor(decision)
            if cb:
                cb.record_success()
            return RouteAttempt(success=..., ...)
        except Exception as e:
            if cb:
                cb.record_failure()
            return RouteAttempt(success=False, error=str(e), ...)
```

---

### 🟡 P1 — 高：enrichment_confidence 双源冲突

**问题描述**:

两条独立逻辑同时修改 `enrichment_confidence`：

1. **ReEnricher**（基于失败次数递减）：
   ```python
   base_confidence = ctx.get("enrichment_confidence", 1.0)
   ctx["enrichment_confidence"] = max(0.3, base_confidence - 0.15 * len(all_attempts))
   ```

2. **ContextEnricher**（基于数据完整性重新计算）：
   ```python
   enriched.enrichment_confidence = self._calculate_confidence(enriched)
   ```

由于 ContextEnricher 会覆盖 ReEnricher 的值，**递减逻辑实际上不生效**。

**后果**:
- 失败次数增加不会导致 confidence 降低
- 路由决策无法感知"已失败多次，应更谨慎"
- 与设计的 "每次失败降低置信度" 意图不符

**修复建议**:

```python
# 在 ContextEnricher.enrich() 中合并外部传入的 confidence
async def enrich(self, input_text, agent_id, context):
    enriched = EnrichedContext(...)
    # ...
    # 如果外部传入了 resilience 相关的 confidence，以它为准（它反映失败历史）
    if "enrichment_confidence" in context and "attempt_count" in context:
        enriched.enrichment_confidence = context["enrichment_confidence"]
    else:
        enriched.enrichment_confidence = self._calculate_confidence(enriched)
    return enriched
```

---

### 🟢 P2 — 中：_compute_preferences 只处理三种特定错误模式

**问题描述**:

```python
def _compute_preferences(self, attempts, existing):
    for attempt in reversed(attempts):
        if attempt.route_type == "rag" and not attempt.success:
            if "no results" in error.lower() or "empty" in error.lower():
                prefs["prefer_reasoning"] = True
            break
        if attempt.route_type == "skill" and not attempt.success:
            prefs["prefer_knowledge"] = True
            break
        if attempt.route_type == "fta" and not attempt.success:
            prefs["prefer_analysis"] = True
            break
```

**问题**:
- 只匹配 `"no results"` / `"empty"` 字符串，非常脆弱
- 没有利用 LLM 的 reasoning 能力来分析失败原因
- `route_preferences` 在 _force_alternative_route 中被使用，但如果 ContextEnricher 覆盖了它，就无效了

**修复建议**:
- 使用 LLM 对失败原因进行分类（timeout / not_found / permission / logic_error）
- 基于分类结果设置更精确的偏好

---

### 🟢 P2 — 中：缺少"用户输入修正"机制

**问题描述**:

架构图没有明确，但设计意图中的"新增客户输入"暗示了交互式澄清。当前代码是纯自动重试，没有与用户交互的接口。

**修复建议**:

```python
class ResilientSelector:
    async def route_and_execute_with_clarification(
        self, input_text, agent_id, executor, ask_user_callback=None
    ):
        # ...
        if not success and ask_user_callback:
            clarification = await ask_user_callback(
                f"尝试 {attempted_routes} 都失败了。需要您补充什么信息吗？"
            )
            if clarification:
                input_text = f"{input_text}\n[用户补充: {clarification}]"
                # 重置部分状态，重新尝试
```

---

## 三、差距总览矩阵

| # | 设计意图 | 代码实现 | 差距严重性 | 影响 |
|---|----------|----------|-----------|------|
| 1 | ReEnricher 信息被 ContextEnricher 保留并用于下一轮决策 | ReEnricher 的 dict 信息被 EnrichedContext.to_dict() 覆盖 | 🔴 P0 | 反馈循环失效 |
| 2 | 每次循环"新增客户输入"或修正输入 | input_text 永远不变 | 🔴 P0 | 无法解决根本性模糊问题 |
| 3 | Selector 主动排除已失败路由 | 被动检测重复后强制切换 | 🟡 P1 | 浪费尝试次数 |
| 4 | CircuitBreaker 保护下游服务 | 配置存在但代码未使用 | 🟡 P1 | 无熔断保护 |
| 5 | enrichment_confidence 随失败递减 | 被 ContextEnricher 重新计算覆盖 | 🟡 P1 | 无法感知历史失败 |
| 6 | 智能偏好调整 | 仅字符串匹配三种错误模式 | 🟢 P2 | 偏好调整不够智能 |
| 7 | 可交互式澄清 | 纯自动循环 | 🟢 P2 | 缺少人机协作 |

---

## 四、修复优先级建议

### Phase 1 — 立即修复（阻断性问题）

1. **修复 ContextEnricher 信息丢失** — 在 EnrichedContext 中保留 resilient 反馈字段
2. **修复 enrichment_confidence 冲突** — 让 ContextEnricher 尊重 ReEnricher 的递减值

### Phase 2 — 本周修复

3. **接入 CircuitBreaker** — 联动 `resilience.py` 中的实现
4. **优化 _force_alternative_route** — 将 attempted_routes 传入 Selector 决策逻辑

### Phase 3 — 下月规划

5. **输入修正机制** — 支持 executor 返回 suggested_rephrase
6. **LLM 驱动的偏好分析** — 替代字符串匹配
7. **交互式澄清接口** — 支持人机协作

---

## 五、测试建议

当前有 33 个 ResilientSelector 相关测试，但缺少：

```python
# 应补充的测试
async def test_re_enricher_feedback_survives_context_enrichment():
    """验证 ReEnricher 的信息在下一轮 ContextEnrichment 后仍然可用。"""
    selector = ResilientSelector()
    # 模拟第一次失败
    ctx = {"attempted_routes": ["skill"], "last_failure": {"route": "skill", "error": "timeout"}}
    # 调用 route，验证 context 中包含 feedback 信息
    # ...

async def test_circuit_breaker_prevents_retry_when_open():
    """验证 CircuitBreaker 打开时跳过重试。"""
    # ...

async def test_enrichment_confidence_decreases_with_failures():
    """验证 confidence 随失败次数递减。"""
    # ...
```
