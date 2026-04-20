# AgentScope 必要性评估

> 评估日期：2026-04-17
> 评估范围：ResolveAgent 项目中 AgentScope 框架的实际使用情况与引入必要性

---

## 目录

1. [当前事实：AgentScope 使用现状](#当前事实agentscope-使用现状)
2. [核心判断：当前阶段不需要 AgentScope](#核心判断当前阶段不需要-agentscope)
3. [自研实现 vs AgentScope 能力对比](#自研实现-vs-agentscope-能力对比)
4. [引入 AgentScope 的成本分析](#引入-agentscope-的成本分析)
5. [AgentScope 的真正价值点](#agentscope-的真正价值点)
6. [什么时候才真正需要 AgentScope](#什么时候才真正需要-agentscope)
7. [建议与行动项](#建议与行动项)

---

## 当前事实：AgentScope 使用现状

**AgentScope 在项目中的状态与 Higress 完全一样——"声明但零使用"：**

| 维度 | 状态 |
|------|------|
| `pyproject.toml` 依赖 | `agentscope>=0.1.0` ✅ 已声明 |
| `uv.lock` | 锁定到 `agentscope-1.0.18` ✅ 已安装 |
| **实际 import** | **0 处** ❌ 全项目无一行 `import agentscope` |
| `BaseAgent` | 自研，注释写着 "In production, this would extend agentscope.agents.AgentBase" 但**并未继承** |
| `MegaAgent` | 继承自研 `BaseAgent`，668 行全自研逻辑 |
| TODO 标记 | 3 处 `# TODO: Integrate with AgentScope...` 停留在意向阶段 |

### 代码证据

**`python/src/resolveagent/agent/base.py`**：

```python
class BaseAgent:
    """Base agent for the ResolveAgent platform.

    Extends AgentScope's AgentBase with ResolveAgent-specific capabilities
    including skill integration, memory management, and telemetry.

    In production, this would extend agentscope.agents.AgentBase.
    """
    # ↑ 注释声称要继承 AgentBase，但实际没有任何 AgentScope 导入

    async def reply(self, message: dict[str, Any]) -> dict[str, Any]:
        # TODO: Integrate with AgentScope's reply mechanism
        return {
            "role": "assistant",
            "content": f"[{self.name}] Received: {message.get('content', '')}",
        }
```

**`python/src/resolveagent/agent/mega.py`**：

```python
from resolveagent.agent.base import BaseAgent  # 自研基类，非 AgentScope

class MegaAgent(BaseAgent):
    """Mega Agent that owns the Intelligent Selector."""
    # 668 行全自研实现，无任何 AgentScope 调用
```

**全项目 AgentScope 引用搜索结果**：

```
# 仅在以下位置出现 "agentscope" 字样：
python/pyproject.toml:20       → "agentscope>=0.1.0",          # 依赖声明
python/uv.lock:20              → name = "agentscope"            # 锁文件
python/src/.../base.py:1       → """Base agent class extending AgentScope."""  # 注释
python/src/.../base.py:14      → Extends AgentScope's AgentBase...             # 注释
python/src/.../base.py:17      → In production, this would extend...           # 注释
python/src/.../base.py:44      → # TODO: Integrate with AgentScope's...        # TODO
python/src/.../lifecycle.py:73 → # TODO: Create agent from config via AgentScope  # TODO
```

**结论：无一行实际代码调用 AgentScope，全部是注释和 TODO。**

---

## 核心判断：当前阶段不需要 AgentScope

---

## 自研实现 vs AgentScope 能力对比

ResolveAgent 已经拥有比 AgentScope 更贴合 AIOps 场景的自研实现：

| 能力 | AgentScope 提供 | ResolveAgent 自研 | 对比 |
|------|----------------|-------------------|------|
| Agent 基类 | `AgentBase` / `ReActAgent` | `BaseAgent` + `MegaAgent` (668行) | 自研更贴合 AIOps 场景 |
| 智能路由 | ❌ 无原生概念 | `IntelligentSelector` 三阶段路由 | **自研是核心差异化能力** |
| 工作流编排 | Pipeline / MsgHub | FTA Engine (MOCUS算法) | 自研更专业 |
| LLM 调用 | `DashScopeChatModel` 直连 | `LLMProvider` 抽象 + 多后端 | 自研更灵活 |
| 记忆系统 | `InMemoryMemory` | 双层记忆 (短期+长期, Go持久化) | 自研更完整 |
| 工具集成 | Toolkit / MCP | Expert Skills 可插拔体系 | 自研更成熟 |
| 消息体系 | `Msg` 对象 | `dict[str, Any]` | 不兼容，迁移成本高 |

**关键点**：AgentScope 的核心价值（Agent 抽象 + 编排 + 工具调用）ResolveAgent 已经全部自研实现了，且更贴合 AIOps 领域。

---

## 引入 AgentScope 的成本分析

之前分析的技术卡点（去掉 Higress 后仍有 5 个）：

| 卡点 | 说明 | 适配成本 |
|------|------|---------|
| 消息体系不兼容 | `dict` ↔ `Msg` 需要 MessageAdapter | 中 |
| IntelligentSelector 无对等概念 | 需封装为 AgentScope Tool | 高 |
| Go-Python 双层架构 | AgentScope 假设纯 Python，需适配 | 高 |
| SSE 流式协议差异 | 需要 wrapper | 中 |
| 生命周期管理冲突 | Go 管 Agent 池 vs AgentScope 自管 | 高 |

**核心矛盾**：为了用上 AgentScope，需要写一堆适配器代码来弥合差异，**而这些适配器本身不产生业务价值**。

预估总工期：8-10 周（含适配器开发 + 测试 + 迁移验证），ROI 极低。

---

## AgentScope 的真正价值点

AgentScope 有两个值得关注的能力：

| 能力 | 价值 | 是否必须用 AgentScope |
|------|------|---------------------|
| **MCP 协议支持** | 标准化工具调用，扩大工具生态 | ❌ MCP 是开放协议，可独立实现 |
| **A2A 协议支持** | Agent 间通信标准化 | ❌ 同上，可独立实现 |

这两个协议是**开放标准**，不需要依赖 AgentScope 框架才能使用。可以直接引入对应的 SDK：

- MCP：`mcp` Python SDK
- A2A：Google A2A 协议规范

---

## 什么时候才真正需要 AgentScope

只有在以下场景下，AgentScope 才有实际价值：

| 场景 | 说明 | 当前是否适用 |
|------|------|-------------|
| 快速 prototype 新 Agent | 不想从零写 Agent 基础设施 | ❌ 已有成熟自研框架 |
| 复用社区现成 Agent | 利用 AgentScope 生态的 Agent 模板 | ❌ AIOps 领域几乎没有 |
| 社区贡献策略 | 把 ResolveAgent 能力变成 AgentScope 插件 | ⚠️ 这是**社区策略**而非技术必要性 |
| 多 Agent 协作 | 需要复杂的多 Agent 对话和协调 | ❌ 当前 MegaAgent 单 Agent 编排已满足 |

---

## 建议与行动项

### 具体行动

| 动作 | 说明 | 优先级 |
|------|------|--------|
| **从 `pyproject.toml` 移除 `agentscope` 依赖** | 减少约 400KB 无用依赖，加快安装速度 | P1 |
| **删除 `base.py` 中的 AgentScope TODO 注释** | 消除误导性信息，反映真实架构状态 | P1 |
| **保留评估文档** | `docs/zh/agentscope-*.md` 作为架构决策记录（ADR） | P2 |
| **独立实现 MCP 协议**（如需要） | 直接用 MCP SDK，无需通过 AgentScope | P3 |
| **聚焦自研核心能力** | IntelligentSelector + FTA + RAG + Expert Skills | 持续 |

### 一句话总结

> **AgentScope 和 Higress 在项目中的处境完全一样：精心设计了集成架构、写了大量预埋代码和文档，但从未实际使用。** 与其花 8-10 周做适配器来融合一个不需要的框架，不如把精力投入到打磨已经能跑的自研能力上。框架依赖应该是**解决实际痛点**驱动的，而不是"这个框架很热门所以应该用"。

---

## 附：与 Higress 评估的对比

| 维度 | Higress | AgentScope |
|------|---------|------------|
| 项目中状态 | 代码就绪但未启用 | 依赖声明但零调用 |
| 自研替代 | `OpenAICompatProvider` 直连 | `BaseAgent` + `MegaAgent` 全自研 |
| 引入成本 | 中（需部署容器 + 验证链路） | 高（5 个技术卡点 + 适配器开发） |
| 核心价值 | 限流/故障转移/模型路由 | Agent 抽象/编排/MCP |
| 当前建议 | 暂不引入，等有生产需求 | 暂不引入，聚焦自研能力 |
| 相关文档 | `higress-necessity-evaluation.md` | 本文档 |

> 参见 [Higress 网关必要性评估](./higress-necessity-evaluation.md) 了解完整的 Higress 评估分析。
