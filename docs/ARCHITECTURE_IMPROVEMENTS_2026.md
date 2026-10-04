# ResolveAgent 架构改进建议 (2026-05)

基于 2026 年 Agent 工程最佳实践，本文档记录 ResolveAgent 的架构改进方向。

---

## 1. Memory 架构强化

**现状：** `ContextEnricher._get_conversation_history()` 仅做简单查询，无记忆压缩。

**目标：** 实现 hierarchical memory 三层架构

```
Working Memory (in-process)
  └── Rolling window: 最近 20 条，实时访问

Episodic Memory (Redis)
  └── 按 session 压缩存储，semantic summary

Long-term Memory (RAG Vector DB)
  └── 跨 session 知识沉淀，重要性 > 0.7 才写入
```

**状态：** 实现完成，未接线 - 三层记忆 `WorkingMemory` / `EpisodicMemoryClient` / `LongTermMemoryClient` 与门面 `HierarchicalMemory` 均在 `python/src/resolveagent/memory.py`（:32 / :135 / :299 / :428），但 `src/` 内无任何调用点，`ContextEnricher` 仍走自己的 `memory_manager`，只有单测覆盖

---

## 2. Planning 框架升级

**现状：** FTA 是 bottom-up 评估，缺乏 top-down 规划能力。

**目标：** 添加 Plan-and-Execute 双模式

```python
class PlanningMode(Enum):
    REACTIVE = "reactive"      # 当前: 快速响应
    DELIBERATIVE = "deliberate"  # 新增: 深思熟虑
```

**状态：** PARTIAL - `PlanningMode` / `HybridPlanner` / `ReActExecutor` 均存在于 `python/src/resolveagent/planning.py`，但：

- `ReActExecutor._execute_action()` 是占位实现，只回显字符串、不调用任何工具（`planning.py:670-673`），REACTIVE 模式跑不出真实动作；
- `_act()` 是关键词匹配（`planning.py:645-668`），没有工具选择逻辑；
- `HybridPlanner` 在 `src/` 内无调用点，REACTIVE / DELIBERATIVE 的自动判定尚未落地。

同类占位还有 `skills/troubleshoot.py:249-263` 的 `_execute_command()`（`[Command execution placeholder]`，注释写明「In production this would use the SandboxExecutor」）。详见 [docs/design/06-memory-planner-toolhub.md](design/06-memory-planner-toolhub.md)。

---

## 3. Multi-Agent 协作增强

**现状：** `MegaAgent` 是单一 orchestrator，缺乏 sub-agent 间通信。

**目标：** 实现 Agent 间消息总线

```python
class AgentMessageBus:
    """订阅-发布消息总线用于 agent 间通信"""
```

**状态：** 实现完成，未接线 - `AgentMessageBus` 在 `python/src/resolveagent/message_bus.py:61`，`src/` 内无调用点（`MegaAgent` 未接入），只有单测覆盖

---

## 4. Tool 标准化：ToolHub

**现状：** MCP 已实现，但缺乏工具发现和版本管理。

**目标：** 实现 ToolHub

```
ToolHub
├── Discovery Service (自动发现可用工具)
├── Schema Registry (工具 schema 版本化)
├── Capability Map (能力矩阵，支持复合查询)
└── Security Policy (工具权限控制)
```

**状态：** 实现完成，未接线 - 四个子服务 `CapabilityMap` / `SchemaRegistry` / `SecurityPolicy` / `DiscoveryService` 与门面 `ToolHub` 均在 `python/src/resolveagent/toolhub.py`（:67 / :159 / :224 / :323 / :481），但 `src/` 内无调用点，MCP 适配器与 Skill 执行链仍各自解析工具，只有单测覆盖

---

## 5. Observability 升级

**现状：** 有基础 tracing，缺少 decision audit trail。

**目标：** 添加 DecisionAuditLogger

```python
class DecisionAuditLogger:
    """记录每个路由决策的完整上下文"""
```

**状态：** DONE（已接线） - `DecisionAuditLogger` 在 `python/src/resolveagent/selector/audit.py:40`，由 `selector/selector.py:16` 导入、`:161` 实例化、`:225` 在每次路由决策后 `await self._audit.log(...)`

---

## 6. Resilience 增强

**现状：** 有基本 error handling，缺少 graceful degradation。

**目标：** 实现 FallbackCascade 和 CircuitBreaker

```python
class FallbackCascade:
    """多级降级策略"""

class CircuitBreaker:
    """熔断器保护下游服务"""
```

**状态：** PARTIAL - 两个类都在 `python/src/resolveagent/resilience.py`（`CircuitBreaker` :26、`FallbackCascade` :169），但接线程度不同：

- `CircuitBreaker` **已接线**：`selector/resilient_selector.py:26` 导入并在路由降级中使用；
- `FallbackCascade` **未接线**：全仓仅出现在 `resilient_selector.py:15` 的文档字符串与 `python/tests/unit/test_resilience.py`，没有生产调用点。

---

## 7. 版本一致性修复

**现状：** 模块版本号不一致。

**目标：** 统一版本号到 `0.3.0`

- `go.mod`: go 1.25 → go 1.22 ❌ **未发生**——`go.mod:3` 至今仍是 `go 1.25.0`（Go 1.25 已正式发布，原文「未发布」的判断也不成立）
- `python/src/resolveagent/__init__.py`: `__version__ = "0.3.0"` ✅
- `python/pyproject.toml`: 0.3.0 ✅
- `web/package.json`: 0.3.0 ✅
- `VERSION`: 0.3.0 ✅

**状态：** PARTIAL - 0.3.0 版本号确实已统一；`go.mod` 的降级从未执行，本文档此前记录的 ✅ 是错的

---

## 实施状态复核（2026-10-04）

本文档最初把 7 项全部记为 DONE。逐项对照代码复核后，实际状态如下。判定口径：**「实现」= 目标类/模块存在**；**「接线」= `python/src/` 内有生产调用点**（仅被单测引用不算接线）。

| # | 改进项 | 实现 | 接线 | 复核结论 |
|---|--------|------|------|----------|
| 1 | Memory 三层架构 | ✅ | ❌ | 实现完成，未接线 |
| 2 | Planning 双模式 | ✅ | ❌ | **PARTIAL**：`_execute_action` 是占位实现 |
| 3 | AgentMessageBus | ✅ | ❌ | 实现完成，未接线 |
| 4 | ToolHub | ✅ | ❌ | 实现完成，未接线 |
| 5 | DecisionAuditLogger | ✅ | ✅ | DONE |
| 6 | Resilience | ✅ | 部分 | **PARTIAL**：`CircuitBreaker` 已接线，`FallbackCascade` 未接线 |
| 7 | 版本一致性 | 部分 | — | **PARTIAL**：0.3.0 已统一；`go.mod` 降级从未发生 |

复核方式（均为静态代码核对，未运行服务）：

```bash
# 目标类是否存在
grep -n "^class " python/src/resolveagent/{memory,message_bus,toolhub,resilience,planning}.py \
                  python/src/resolveagent/selector/audit.py

# 是否有生产调用点（按类名反查 import，覆盖绝对与相对导入）
grep -rn "import \(HierarchicalMemory\|AgentMessageBus\|ToolHub\|FallbackCascade\|CircuitBreaker\|DecisionAuditLogger\|HybridPlanner\)" \
     --include="*.py" python/src/resolveagent
# → 仅 2 条命中：
#   selector/resilient_selector.py:26  from resolveagent.resilience import CircuitBreaker, CircuitOpenError
#   selector/selector.py:16            from resolveagent.selector.audit import DecisionAuditLogger

# 版本声明
head -3 go.mod && cat VERSION
```

> [!IMPORTANT]
> 未接线不等于无用——这些模块有完整单测覆盖，是可直接调用的能力库。但把它们记为 DONE 会让读者误以为诊断链路已经具备三层记忆、工具发现和消息总线，实际运行时并没有。要真正生效，需要在 `MegaAgent` / `ContextEnricher` / Skill 执行链里补上调用点。

---

## 优先级矩阵

| 改进项 | 影响力 | 实施难度 | 优先级 |
|--------|--------|----------|--------|
| 版本一致性修复 | ⭐⭐⭐ | 低 | P0 |
| Decision Audit Logger | ⭐⭐⭐⭐ | 低 | P1 |
| Fallback Cascade | ⭐⭐⭐⭐ | 中 | P1 |
| Memory 架构强化 | ⭐⭐⭐⭐ | 中 | P2 |
| ToolHub 实现 | ⭐⭐⭐ | 中 | P2 |
| Planning Mode 升级 | ⭐⭐⭐⭐ | 高 | P3 |
| Agent Message Bus | ⭐⭐⭐ | 高 | P3 |

---

## 更新日志

| 日期 | 更新内容 |
|------|----------|
| 2026-05-18 | 初始文档创建 |
| 2026-05-18 | 完成版本一致性修复 (P0) |
| 2026-05-18 | 完成 DecisionAuditLogger 实现 (P1) |
| 2026-05-18 | 完成 FallbackCascade + CircuitBreaker 实现 (P1) |
| 2026-05-18 | 完成 Memory 架构强化 (P2) - 三层记忆 |
| 2026-05-18 | 完成 ToolHub 实现 (P2) - 工具发现与安全 |
| 2026-05-18 | 完成 Planning Mode 升级 (P3) - Plan-and-Execute |
| 2026-05-19 | 完成论文更新 - 新增 5.6-5.10 章节（ToolHub/Memory/Planner/AgentMessageBus/弹性机制），更新摘要与贡献列表，更新架构图与系统亮点说明 |
| 2026-05-18 | 完成 Agent Message Bus (P3) - 订阅-发布消息总线 |
| 2026-10-04 | **状态复核并纠正失实声明**：新增「实施状态复核」小节；第 2/6/7 项由 DONE 下调为 PARTIAL（`ReActExecutor._execute_action` 是占位实现、`FallbackCascade` 无生产调用点、`go.mod` 的 1.25→1.22 降级从未发生）；第 1/3/4 项标注「实现完成，未接线」；第 5 项补充接线证据 |
