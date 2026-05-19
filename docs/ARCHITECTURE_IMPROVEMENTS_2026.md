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

**状态：** DONE - 实现于 `python/src/resolveagent/memory.py`

---

## 2. Planning 框架升级

**现状：** FTA 是 bottom-up 评估，缺乏 top-down 规划能力。

**目标：** 添加 Plan-and-Execute 双模式

```python
class PlanningMode(Enum):
    REACTIVE = "reactive"      # 当前: 快速响应
    DELIBERATIVE = "deliberate"  # 新增: 深思熟虑
```

**状态：** DONE - 实现于 `python/src/resolveagent/planning.py`

---

## 3. Multi-Agent 协作增强

**现状：** `MegaAgent` 是单一 orchestrator，缺乏 sub-agent 间通信。

**目标：** 实现 Agent 间消息总线

```python
class AgentMessageBus:
    """订阅-发布消息总线用于 agent 间通信"""
```

**状态：** DONE - 实现于 `python/src/resolveagent/message_bus.py`

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

**状态：** DONE - 实现于 `python/src/resolveagent/toolhub.py`

---

## 5. Observability 升级

**现状：** 有基础 tracing，缺少 decision audit trail。

**目标：** 添加 DecisionAuditLogger

```python
class DecisionAuditLogger:
    """记录每个路由决策的完整上下文"""
```

**状态：** DONE - 实现于 `python/src/resolveagent/selector/audit.py`

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

**状态：** DONE - 实现于 `python/src/resolveagent/resilience.py`

---

## 7. 版本一致性修复

**现状：** `go.mod` 声明 `1.25.0`（未发布），版本不一致。

**目标：** 统一版本号到 `0.3.0`

- `go.mod`: go 1.25 → go 1.22 ✅
- `python/__init__.py`: 0.1.0 → 0.3.0 ✅
- `python/pyproject.toml`: 0.3.0 ✅ (already correct)
- `web/package.json`: 0.3.0 ✅ (already correct)

**状态：** DONE

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