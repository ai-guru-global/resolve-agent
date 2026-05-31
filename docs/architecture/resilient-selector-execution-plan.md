# Resilient Selector 修复执行计划

> 基于差距分析: `docs/architecture/resilient-selector-gap-analysis.md`

---

## Phase 1 — 立即修复（阻断性问题）

### 1.1 修复 ContextEnricher 信息丢失

**问题**: ReEnricher 注入的 `attempted_routes` / `last_failure` / `route_preferences` 等反馈信息，在下一轮被 `ContextEnricher.enrich()` 创建的全新 `EnrichedContext` 覆盖。

**修复方案**:
- 在 `EnrichedContext` 中新增 `resilient_feedback: dict[str, Any]` 字段
- 在 `ContextEnricher.enrich()` 中合并传入 context 中的反馈信息
- 在 `EnrichedContext.to_dict()` 中保留该字段

**影响文件**:
- `python/src/resolveagent/selector/context_enricher.py`

### 1.2 修复 enrichment_confidence 冲突

**问题**: ReEnricher 每次失败减 0.15，但 ContextEnricher 每次都重新计算覆盖。

**修复方案**:
- 在 `ContextEnricher.enrich()` 中，若传入 context 包含 `attempt_count`，说明是 resilience 循环，优先使用传入的 `enrichment_confidence`

**影响文件**:
- `python/src/resolveagent/selector/context_enricher.py`

---

## Phase 2 — 本周修复

### 2.1 接入 CircuitBreaker

**问题**: `ResilientConfig.enable_circuit_breaker = True` 存在但代码从未使用。

**修复方案**:
- 在 `ResilientSelector.__init__()` 中初始化各路由类型的 CircuitBreaker
- 在 `_execute_route()` 中检查并记录熔断状态

**影响文件**:
- `python/src/resolveagent/selector/resilient_selector.py`
- `python/src/resolveagent/resilience.py`

### 2.2 让 Selector 主动排除已失败路由

**问题**: `_force_alternative_route()` 是被动防御，浪费一次尝试。

**修复方案**:
- 将 `tried_routes` 作为 `excluded_routes` 传入 context
- 在 `IntelligentSelector` 的决策策略中（hybrid/rule/llm）识别并排除这些路由

**影响文件**:
- `python/src/resolveagent/selector/resilient_selector.py`
- `python/src/resolveagent/selector/strategies/*.py`

---

## Phase 3 — 下月规划

### 3.1 输入修正机制

- 支持 executor 返回 `suggested_rephrase`
- 在重试循环中替换 `input_text`

### 3.2 LLM 驱动的偏好分析

- 替代 `_compute_preferences()` 中的字符串匹配
- 使用 LLM 对失败原因分类（timeout / not_found / permission / logic_error）

### 3.3 交互式澄清接口

- 新增 `route_and_execute_with_clarification()` 方法
- 支持传入 `ask_user_callback` 在多次失败后请求用户补充信息

---

## 验证清单

- [ ] Python 单元测试全部通过 (199 tests)
- [ ] Go 构建通过
- [ ] Mobile 构建通过
- [ ] 新增 ResilientSelector 反馈循环端到端测试
- [ ] 新增 CircuitBreaker 集成测试
