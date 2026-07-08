# Loop Engineering 循环工程方法论集成

> **版本**: v0.4.0 | **集成时间**: 2026-07  
> **核心理念**: Observe → Orient → Decide → Act — 持续闭环改进

---

## 概述

Loop Engineering（循环工程）是一种面向自治系统的持续改进方法论，核心思想是**将每一次执行的结果反馈回系统输入端，形成闭环改进循环**。

ResolveAgent 从四个维度集成了 Loop Engineering：

| 维度 | 说明 | 实现模块 |
|------|------|----------|
| **持续反馈循环** | 信号收集 → 聚合 → 分发的闭环 | `pkg/feedback/` + `python/fta/feedback_loop.py` |
| **迭代开发流程** | CI/CD + 质量门禁 + 覆盖率基线 | `.github/workflows/` + `hack/` |
| **自动化测试闭环** | E2E 反馈验证 + API 契约测试 + 回归验证 | `test/e2e/` + `test/integration/` |
| **可重复工程模式** | Registry 模板 + Store 模式 + Hook 链模式 | `pkg/registry/template.go` + `pkg/store/patterns.go` |

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     Loop Engineering 闭环架构                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐   │
│  │   Observe    │     │   Orient     │     │      Decide          │   │
│  │              │     │              │     │                      │   │
│  │  Health      │     │  Aggregator  │     │  Alert Engine        │   │
│  │  Retry       │────▶│  (滑动窗口)  │────▶│  (规则评估+动作)     │   │
│  │  Workflow    │     │  Stats       │     │  circuit_break /     │   │
│  │  Telemetry   │     │              │     │  notify              │   │
│  └──────────────┘     └──────────────┘     └──────────┬───────────┘   │
│                                                        │               │
│                                              ┌─────────▼──────────┐   │
│                                              │       Act          │   │
│                                              │                    │   │
│                                              │  Circuit Breaker   │   │
│                                              │  Adaptive Weight   │   │
│                                              │  Hook Chain        │   │
│                                              └─────────┬──────────┘   │
│                                                        │               │
│  ┌──────────────────────────────────────────────────────▼──────────┐   │
│  │                    Feedback Dispatch                            │   │
│  │  Log │ Webhook │ NATS                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 一、反馈循环子系统 (Go)

### 位置: `pkg/feedback/`

Go 侧反馈循环子系统是 Loop Engineering 的核心基础设施，实现信号收集、聚合、分发的完整闭环。

### 1.1 核心类型 (`types.go`)

```go
// FeedbackSignal 是反馈循环的原子单元
type FeedbackSignal struct {
    ID            string            `json:"id"`
    Source        string            `json:"source"`         // health / retry / workflow / ...
    Event         string            `json:"event"`          // retry.exhausted / health.degraded / ...
    Severity      Severity          `json:"severity"`       // Info / Warn / Error / Critical
    Timestamp     time.Time         `json:"timestamp"`
    Metrics       map[string]float64 `json:"metrics,omitempty"`
    Labels        map[string]string  `json:"labels,omitempty"`
    Message       string            `json:"message"`
    CorrelationID string            `json:"correlation_id,omitempty"`
}

// AggregatedStats 滑动窗口聚合统计
type AggregatedStats struct {
    Source        string    `json:"source"`
    Event         string    `json:"event"`
    Count         int64     `json:"count"`
    RatePerMinute float64   `json:"rate_per_minute"`
    SeverityMax   Severity  `json:"severity_max"`
    // ...
}
```

**信号源常量**:

| 常量 | 值 | 说明 |
|------|-----|------|
| `SourceHealth` | `"health"` | 健康检查子系统 |
| `SourceRetry` | `"retry"` | 重试机制 |
| `SourceWorkflow` | `"workflow"` | 工作流执行 |
| `SourceTelemetry` | `"telemetry"` | 遥测指标 |
| `SourceSelector` | `"selector"` | 智能选择器 |
| `SourceSkill` | `"skill"` | 技能执行 |
| `SourceCircuitBrk` | `"circuit_breaker"` | 熔断器 |

### 1.2 中央收集器 (`collector.go`)

```go
type Collector struct {
    buffer      *RingBuffer                // 环形缓冲存储
    subscribers map[string][]SignalHandler  // 按 source 过滤的订阅者
    dispatchers []Dispatcher               // 外部输出通道
}

// Emit 发射信号 → 存储 → 通知订阅者 → 分发到外部
func (c *Collector) Emit(ctx context.Context, sig FeedbackSignal) error

// Subscribe 注册订阅者，source="*" 接收所有来源
func (c *Collector) Subscribe(source string, handler SignalHandler)

// AddDispatcher 注册分发通道
func (c *Collector) AddDispatcher(d Dispatcher)
```

### 1.3 环形缓冲区 (`ring_buffer.go`)

线程安全的固定窗口环形缓冲区，保留最近 N 条信号：

```go
type RingBuffer struct {
    signals []FeedbackSignal
    size    int
    head    int
    count   int
}
```

### 1.4 滑动窗口聚合器 (`aggregator.go`)

按 `"source:event"` 分组的滑动窗口统计聚合，自动过期清理：

```go
func (a *Aggregator) Record(sig FeedbackSignal)
func (a *Aggregator) Stats(source, event string) AggregatedStats
func (a *Aggregator) AllStats() map[string]AggregatedStats
```

### 1.5 分发器 (`dispatcher.go`)

三种内置分发器：

| 分发器 | 目标 | 说明 |
|--------|------|------|
| `LogDispatcher` | slog 结构化日志 | 按 severity 映射日志级别 |
| `WebhookDispatcher` | HTTP POST JSON | 发送到配置的 Webhook URL |
| `NATSDispatcher` | NATS 消息发布 | 通过 `NATSPublisher` 接口解耦 |

### 1.6 指标采集器 (`metrics.go`)

使用 `atomic.Int64` 实现高并发计数器/仪表盘：

```go
type MetricsCollector struct {
    counters sync.Map  // map[string]*atomic.Int64
    gauges   sync.Map  // map[string]*atomic.Int64
}

func (m *MetricsCollector) Increment(name string)
func (m *MetricsCollector) SetGauge(name string, value int64)
func (m *MetricsCollector) Snapshot() map[string]int64
```

### 1.7 告警引擎 (`alerts.go`)

基于聚合统计的自动告警规则引擎：

```go
type AlertRule struct {
    Name      string
    Condition func(stats map[string]AggregatedStats) bool
    Action    AlertAction  // "notify" | "circuit_break"
}

type AlertEngine struct {
    aggregator *Aggregator
    rules      []AlertRule
    interval   time.Duration
}
```

---

## 二、熔断器 (Go)

### 位置: `pkg/circuitbreaker/`

三态熔断器，保护下游服务免于级联故障：

```
CLOSED  --[failures >= threshold]--> OPEN
OPEN    --[recovery timeout elapsed]--> HALF_OPEN
HALF_OPEN --[probe success]--> CLOSED
HALF_OPEN --[probe failure]--> OPEN
```

**核心 API**:

```go
type Breaker struct { /* ... */ }

// Execute 通过熔断器执行函数
func (b *Breaker) Execute(ctx context.Context, fn func(ctx context.Context) error) error

// State 返回当前状态
func (b *Breaker) State() State

// Reset 强制重置为关闭状态
func (b *Breaker) Reset()
```

**StateObserver 接口** — 与反馈子系统集成：

```go
type StateObserver interface {
    OnStateChange(name string, from, to State)
}
```

当熔断器状态变化时，自动发射 `circuit_breaker.open` / `circuit_breaker.close` 等反馈信号。

**配置**:

```go
type Config struct {
    Name             string
    FailureThreshold int           // 默认 5
    RecoveryTimeout  time.Duration // 默认 30s
    HalfOpenMaxCalls int           // 默认 3
    Observer         StateObserver
}
```

---

## 三、健康检查与重试反馈集成

### 3.1 Health 模块集成 (`pkg/health/health.go`)

新增 `FeedbackEmitter` 接口，在健康检查状态转换时自动发射信号：

```go
type FeedbackEmitter interface {
    EmitHealthChange(prev, curr Status)
}

// Checker 新增方法
func (c *Checker) SetFeedbackEmitter(e FeedbackEmitter)
```

状态转换检测：
- `healthy → degraded` → 发射 `health.degraded` (SeverityWarn)
- `healthy → down` → 发射 `health.down` (SeverityError)
- `degraded/down → healthy` → 发射 `health.recovered` (SeverityInfo)

### 3.2 Retry 模块集成 (`pkg/retry/retry.go`)

新增 `RetryObserver` 接口，在重试成功/耗尽时发射信号：

```go
type RetryObserver interface {
    OnRetrySuccess(ctx context.Context, attempts int, totalDuration time.Duration)
    OnRetryExhausted(ctx context.Context, attempts int, totalDuration time.Duration, lastErr error)
}
```

**设计决策**: Health 和 Retry 模块使用**接口注入**而非直接导入 feedback 包，避免循环依赖。

---

## 四、FTA 反馈循环 (Python)

### 位置: `python/src/resolveagent/fta/feedback_loop.py`

Python 侧的 FTA 工作流反馈循环，与 Go 侧 `feedback.Collector` 互补：

```python
class FeedbackLoop:
    def record(self, metrics: WorkflowExecutionMetrics) -> list[ImprovementSuggestion]:
        """记录执行 → 分析指标 → 对比基线 → 生成改进建议"""

    def _analyze(self, metrics) -> list[ImprovementSuggestion]:
        """
        自动检测:
        - 持续时间回归 (当前 > 基线 × 1.5)
        - 成功率下降 (当前 < 基线 × 0.7)
        - 技能选择异常 (失败中关联的技能)
        - 连续失败模式 (5 次中 3+ 失败)
        """
```

### 回归验证器 (`regression_validator.py`)

四项回归检查确保迭代不引入退化：

| 检查项 | 说明 | 阈值 |
|--------|------|------|
| 持续时间回归 | 对比基线平均耗时 | +50% |
| 成功率下降 | 对比基线成功率 | -30% |
| 步骤覆盖率 | 执行覆盖的步骤比例 | < 80% |
| 新错误模式 | 历史未见过的错误类型 | 任何新增 |

---

## 五、自适应选择器增强

### AdaptiveWeightAdjuster (`selector/resilient_selector.py`)

基于反馈的选择器权重动态调整：

```python
class AdaptiveWeightAdjuster:
    def record_outcome(self, route_type: str, success: bool, latency_ms: float):
        """记录执行结果，基于成功率调整权重"""
        # 成功 → 权重增加
        # 失败 → 权重降低

    def apply_decay(self, decay_factor: float = 0.95):
        """时间衰减，所有权重向中性值 1.0 回归"""
        # weight = weight * decay + 1.0 * (1 - decay)

    def get_weights(self) -> dict[str, float]:
        """返回当前各路由类型的权重"""
```

---

## 六、Hook 链模式 (Python)

### 位置: `python/src/resolveagent/hooks/patterns.py`

标准化的 Hook 执行链模式：`pre_hook → execute → post_hook → feedback`

```python
class HookChain:
    def run(self, execute_fn, context: HookContext) -> HookResult:
        """
        Phase 1: Pre-hooks (验证、上下文丰富)
        Phase 2: 主执行
        Phase 3: Post-hooks (日志、指标)
        Phase 4: 反馈循环闭合 (自动收集执行摘要)
        """
```

**HookContext 数据流**:

```
request_id → metadata → pre_hook results → execute result → post_hook → feedback_data
```

---

## 七、可重复工程模式 (Go)

### 7.1 Registry 泛型模板 (`pkg/registry/template.go`)

```go
type Registry[T any] interface {
    Create(ctx context.Context, entity *T) error
    Get(ctx context.Context, id string) (*T, error)
    List(ctx context.Context, opts ListOptions) ([]*T, int, error)
    Update(ctx context.Context, entity *T) error
    Delete(ctx context.Context, id string) error
}
```

### 7.2 Store 模式抽象 (`pkg/store/patterns.go`)

```go
// CRUDStore 通用 CRUD 持久化接口
type CRUDStore[T any] interface {
    Create(ctx context.Context, entity *T) error
    Read(ctx context.Context, id string) (*T, error)
    Update(ctx context.Context, entity *T) error
    Delete(ctx context.Context, id string) error
    List(ctx context.Context, opts QueryOptions) ([]*T, int, error)
}

// Mixin 接口
type Timestamped interface { GetCreatedAt() time.Time; GetUpdatedAt() time.Time }
type Versioned interface { GetVersion() int; SetVersion(int) }
type SoftDeletable interface { IsDeleted() bool; MarkDeleted() }
```

---

## 八、CI/CD 与质量保障

### 8.1 GitHub Actions 流水线

| 流水线 | 文件 | 阶段 |
|--------|------|------|
| 主 CI | `.github/workflows/ci.yaml` | lint → test → build → quality-gate |
| E2E | `.github/workflows/e2e.yaml` | PostgreSQL + Redis services |
| Release | `.github/workflows/release.yaml` | Docker 矩阵构建 + Helm + GitHub Release |

### 8.2 质量门禁 (`hack/quality-gate.sh`)

```
Go:  go vet → go build → golangci-lint → go test → go coverage
Python:  ruff → format check → pytest
Web:  eslint → vitest
```

### 8.3 覆盖率基线 (`test/fixtures/baseline/coverage-baseline.json`)

迭代间覆盖率对比，防止测试覆盖退化。

---

## 九、配置参考

### 9.1 平台服务 (`configs/resolveagent.yaml`)

```yaml
feedback:
  enabled: true
  ring_buffer_size: 1000
  aggregation_window: "5m"
  dispatch:
    webhook:
      enabled: false
      url: ""
    nats:
      enabled: false
      subject: "feedback.signals"
    log:
      enabled: true
      level: "info"

observability_loop:
  enabled: true
  metrics:
    feedback_signals_total: true
    feedback_loop_duration_seconds: true
    retry_exhausted_total: true
    workflow_success_rate: true
  alerts:
    - name: "high_failure_rate"
      condition: "workflow_success_rate < 0.7"
      window: "5m"
      action: "notify"
    - name: "retry_storm"
      condition: "retry_exhausted_total > 50"
      window: "1m"
      action: "circuit_break"
```

### 9.2 Agent 运行时 (`configs/runtime.yaml`)

```yaml
feedback_loop:
  enabled: true
  selector_update_interval: "30s"
  rag_enrich_threshold: 0.8
  skill_adapt_threshold: 0.6

circuit_breaker:
  enabled: true
  failure_threshold: 5
  recovery_timeout: "30s"
  half_open_max_calls: 3

adaptive:
  selector_weight_update: true
  skill_confidence_decay: 0.95
  auto_fallback_enabled: true
```

---

## 十、新增指标

| 指标 | 类型 | 说明 |
|------|------|------|
| `feedback_signals_total` | Counter | 反馈信号总数 (by source, event) |
| `feedback_loop_duration_seconds` | Histogram | 反馈循环处理耗时 |
| `retry_exhausted_total` | Counter | 重试耗尽次数 |
| `workflow_success_rate` | Gauge | 工作流成功率 |
| `circuit_breaker_state` | Gauge | 熔断器状态 (0=closed, 1=open, 2=half_open) |
| `circuit_breaker_failures_total` | Counter | 熔断器累计失败数 |
| `adaptive_selector_weights` | Gauge | 自适应选择器权重 (by route_type) |

---

## 十一、文件清单

### Go 模块

| 文件 | 说明 |
|------|------|
| `pkg/feedback/types.go` | 核心类型定义 |
| `pkg/feedback/collector.go` | 中央反馈收集器 |
| `pkg/feedback/ring_buffer.go` | 环形缓冲区 |
| `pkg/feedback/aggregator.go` | 滑动窗口聚合器 |
| `pkg/feedback/dispatcher.go` | Log/Webhook/NATS 分发器 |
| `pkg/feedback/metrics.go` | 高并发指标采集器 |
| `pkg/feedback/alerts.go` | 告警规则引擎 |
| `pkg/feedback/collector_test.go` | 单元测试 |
| `pkg/circuitbreaker/breaker.go` | 三态熔断器实现 |
| `pkg/circuitbreaker/breaker_test.go` | 熔断器测试 |
| `pkg/registry/template.go` | 泛型 Registry 模板 |
| `pkg/store/patterns.go` | Store 模式抽象 |
| `pkg/health/health.go` | 健康检查 + 反馈集成 |
| `pkg/retry/retry.go` | 重试机制 + 观察器接口 |

### Python 模块

| 文件 | 说明 |
|------|------|
| `python/src/resolveagent/fta/feedback_loop.py` | FTA 反馈循环 |
| `python/src/resolveagent/fta/regression_validator.py` | 回归验证器 |
| `python/src/resolveagent/hooks/patterns.py` | Hook 链模式 |
| `python/src/resolveagent/selector/resilient_selector.py` | + AdaptiveWeightAdjuster |
| `python/tests/test_feedback_loop.py` | 反馈循环测试 |

### CI/CD & 脚本

| 文件 | 说明 |
|------|------|
| `.github/workflows/ci.yaml` | 主 CI 流水线 |
| `.github/workflows/e2e.yaml` | E2E 测试流水线 |
| `.github/workflows/release.yaml` | 发布流水线 |
| `hack/quality-gate.sh` | 质量门禁脚本 |
| `hack/coverage-report.sh` | 覆盖率报告生成 |
| `test/e2e/feedback_loop_test.go` | E2E 反馈循环测试 |
| `test/integration/api_contract_test.go` | API 契约测试 |
| `test/fixtures/baseline/coverage-baseline.json` | 覆盖率基线 |

---

## 十二、设计决策记录

### D1: 接口注入避免循环依赖

Health 和 Retry 模块通过接口（`FeedbackEmitter`、`RetryObserver`）与反馈子系统交互，而非直接导入 `feedback` 包。这避免了 `health → feedback → health` 的循环导入。

### D2: 环形缓冲区而非无限存储

反馈信号采用固定窗口（默认 1000 条）的环形缓冲区，而非无界切片。这确保了内存使用可控，防止信号洪峰导致 OOM。

### D3: 滑动窗口聚合

聚合器使用 5 分钟滑动窗口计算统计指标，而非全局累计。这使告警和决策基于**近期趋势**而非历史均值，对异常更敏感。

### D4: Python 与 Go 双层反馈

Go 侧 `feedback.Collector` 是通用信号基础设施，Python 侧 `FeedbackLoop` 专注于 FTA 工作流分析。两者互补，各司其职。

### D5: 熔断器与反馈的松耦合

熔断器通过 `StateObserver` 接口通知状态变化，而非直接依赖反馈包。这使得熔断器可以独立使用，也可选择性地接入反馈系统。
