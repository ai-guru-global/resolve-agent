# AgentScope 深度集成与 Mem0 记忆替换技术评估报告

> 评估日期：2026-04-17
> 评估范围：ResolveAgent 全栈架构（Go 平台 + Python 运行时 + Web 前端）
> 目标版本：AgentScope ≥ 2.0 / Mem0 OSS ≥ 1.0

---

## 目录

1. [执行摘要](#执行摘要)
2. [当前架构现状分析](#当前架构现状分析)
3. [AgentScope 深度集成评估](#agentscope-深度集成评估)
4. [Mem0 记忆系统替换评估](#mem0-记忆系统替换评估)
5. [迁移成本估算](#迁移成本估算)
6. [替换后的优势与潜在问题](#替换后的优势与潜在问题)
7. [详细实施步骤建议](#详细实施步骤建议)
8. [决策建议](#决策建议)

---

## 执行摘要

### 结论概要

| 维度 | AgentScope 深度集成 | Mem0 记忆替换 |
|------|-------------------|--------------|
| **可行性** | ⚠️ 中等（需大幅重构 Agent 层） | ✅ 高（可渐进式替换） |
| **预估工期** | 6-8 周（含测试） | 3-4 周（含测试） |
| **风险等级** | 🔴 高（涉及核心执行引擎） | 🟡 中（接口兼容性可控） |
| **收益评级** | ⭐⭐⭐ 中长期价值 | ⭐⭐⭐⭐ 短期即可见收益 |
| **推荐策略** | 渐进式深度集成 | 优先实施，作为快速胜利 |

### 核心发现

1. **AgentScope 当前仅为声明式依赖**：`pyproject.toml` 声明了 `agentscope>=0.1.0`，但 `BaseAgent` 未实际继承 `agentscope.agents.AgentBase`（仅有注释说明"In production, this would extend"），实际执行流完全自研。
2. **记忆系统功能完整但缺乏语义能力**：现有双层记忆（短期/长期）具备 CRUD 和 TTL，但缺少向量语义搜索、记忆去重、自动提取、图谱关系等高级能力。
3. **AgentScope 2.0 已具备生产级能力**：支持 ReAct Agent、MCP/A2A 协议、内存压缩、实时语音、分布式部署，与 ResolveAgent 的 AIOps 场景高度契合。
4. **Mem0 OSS 可完全自托管**：Apache 2.0 协议，支持 Qdrant/Milvus 等 20+ 向量库，可复用 ResolveAgent 已有的 Milvus/Qdrant 基础设施。

---

## 当前架构现状分析

### 整体架构

```
客户端 → Higress AI 网关 → Go 平台 (8080/9090) → Python 运行时 (9091)
                                ↓                       ↓
                          12 大注册表              MegaAgent → 智能选择器
                          PostgreSQL                    ↓
                                               FTA / Skill / RAG / CodeAnalysis
```

### Python 运行时 Agent 层现状

| 组件 | 文件 | AgentScope 使用程度 | 说明 |
|------|------|-------------------|------|
| `BaseAgent` | `agent/base.py` | ❌ 未使用 | 纯自研基类，注释提及应继承 AgentBase |
| `MegaAgent` | `agent/mega.py` | ❌ 未使用 | 继承 BaseAgent，完全自研编排逻辑 |
| `MemoryManager` | `agent/memory.py` | ❌ 未使用 | 自研内存管理，通过 HTTP 持久化到 Go |
| `ExecutionEngine` | `runtime/engine.py` | ❌ 未使用 | 自研执行引擎，管理 Agent 池和 SSE |
| `IntelligentSelector` | `selector/selector.py` | ❌ 未使用 | 自研三阶段路由（意图/增强/决策） |
| `HigressLLMProvider` | `llm/higress_provider.py` | ❌ 未使用 | 自研 LLM 提供者，通过 Higress 网关 |

**关键发现**：AgentScope 作为依赖存在但**零实际使用**。所有核心能力均为自研实现。

### 现有记忆系统架构

```
Python MemoryManager        →  HTTP  →  Go MemoryRegistry  →  PostgreSQL
  ├── 短期: _entries 列表                  ├── AddMessage()         memory_short_term 表
  ├── add_async() 持久化                   ├── GetConversation()    memory_long_term 表
  ├── load_conversation()                  ├── StoreLongTermMemory()
  └── get_context() 窗口化                 └── PruneExpiredMemories()
```

**现有能力**：
- ✅ 短期记忆（会话历史，窗口化，序列号排序）
- ✅ 长期记忆（跨会话知识，importance 评分，access_count 热度）
- ✅ PostgreSQL 持久化（双表结构，TTL 过期清理）
- ✅ Go REST API（10 个端点）

**缺失能力**：
- ❌ 语义向量搜索（SearchLongTermMemory 仅按 importance 排序）
- ❌ 记忆自动提取（需手动调用 StoreLongTermMemory）
- ❌ 智能去重（无重复检测机制）
- ❌ 图谱记忆（无实体关系建模）
- ❌ 记忆压缩/摘要（长对话无自动摘要）
- ❌ 上下文增强实际对接（`context_enricher.py:417` 存在 TODO）

---

## AgentScope 深度集成评估

### AgentScope 2.0 核心能力

| 能力 | 版本 | ResolveAgent 对应 | 匹配度 |
|------|------|-------------------|--------|
| ReAct Agent | 2.0 | MegaAgent 自研路由 | 🟡 部分重叠 |
| MCP 协议支持 | 2025-11 | 无 | ✅ 可直接受益 |
| A2A 协议支持 | 2025-12 | 无 | ✅ 可直接受益 |
| InMemoryMemory | 2026-01 | MemoryManager | 🟡 功能重叠 |
| 记忆压缩 | 2026-01 | 无 | ✅ 可直接受益 |
| 实时语音 | 2026-02 | 无 | ✅ 可扩展 |
| MsgHub 多 Agent | 2.0 | 无多 Agent 通信 | ✅ 可直接受益 |
| Toolkit/工具注册 | 2.0 | SkillLoader/Executor | 🟡 部分重叠 |
| 分布式部署 | 2.0 | Go 平台分发 | 🟡 架构不同 |
| Agentic RL | 2.0 | 无 | ✅ 可扩展 |

### 集成方案分析

#### 方案 A：浅层集成（推荐）

**策略**：保留自研核心架构，选择性采用 AgentScope 组件。

```
现有架构（保留）               引入 AgentScope 组件
┌────────────────────┐        ┌──────────────────────┐
│ ExecutionEngine    │        │ agentscope.tool      │
│ MegaAgent          │  ←──── │   Toolkit            │
│ IntelligentSelector│        │   MCP 协议           │
│ FTA/Skill/RAG/Code │        │ agentscope.memory    │
└────────────────────┘        │   InMemoryMemory     │
                              │   记忆压缩           │
                              │ agentscope.pipeline   │
                              │   MsgHub (多 Agent)  │
                              └──────────────────────┘
```

**具体集成点**：

| 集成点 | 变更范围 | 优先级 | 说明 |
|--------|---------|--------|------|
| MCP 工具协议 | `skills/` 目录 | P0 | 通过 `agentscope.mcp` 接入外部 MCP 工具服务器 |
| Toolkit 注册 | `skills/loader.py` | P1 | 用 `agentscope.tool.Toolkit` 统一工具注册和发现 |
| MsgHub 多 Agent | `agent/mega.py` | P2 | 在 `_execute_multi` 中引入 MsgHub 进行 Agent 间通信 |
| 记忆压缩 | `agent/memory.py` | P2 | 利用 AgentScope 的记忆压缩能力处理长对话 |

**优势**：
- 最小破坏性，可渐进式集成
- 保留 IntelligentSelector 等核心差异化能力
- 新增 MCP/A2A 等生态集成能力

**劣势**：
- 维护两套体系的认知负担
- 未完全发挥 AgentScope 的编排优势

#### 方案 B：深层重构

**策略**：将 BaseAgent 重构为继承 `agentscope.agents.AgentBase`，全面采用 AgentScope 生命周期。

```
重构后架构
┌─────────────────────────────────────────┐
│           AgentScope 框架层               │
│  ┌──────────────┐  ┌─────────────────┐  │
│  │ AgentBase    │  │ MsgHub/Pipeline │  │
│  │ (生命周期)   │  │ (多 Agent 编排) │  │
│  └──────┬───────┘  └─────────────────┘  │
│         │                                │
│  ┌──────┴───────────────────────────┐   │
│  │ MegaAgent(AgentBase)              │   │
│  │  ├── IntelligentSelector (保留)   │   │
│  │  ├── agentscope.tool.Toolkit      │   │
│  │  └── agentscope.memory            │   │
│  └───────────────────────────────────┘  │
│                                          │
│  LLM: agentscope.model.DashScopeChat   │
│  → 可能与 Higress 路由冲突              │
└─────────────────────────────────────────┘
```

**关键冲突点**：

| 冲突 | 现有实现 | AgentScope 实现 | 解决方案 |
|------|---------|----------------|---------|
| LLM 调用 | HigressLLMProvider（网关路由） | DashScopeChatModel（直连） | 自定义 AgentScope Model 包装 Higress |
| 消息格式 | `dict[str, Any]` | `agentscope.message.Msg` | 编写适配层双向转换 |
| Agent 加载 | ExecutionEngine._agent_pool | AgentScope 内部管理 | 桥接注册表查询 |
| 流式输出 | SSE AsyncIterator | AgentScope stream | 需适配 SSE 协议 |
| 选择器 | 自研 3 阶段路由 | AgentScope 无等价物 | 保留为自定义组件 |

**优势**：
- 统一技术栈，降长期维护成本
- 获得 AgentScope 完整生态（A2A、RL、分布式）
- 社区支持和持续迭代

**劣势**：
- 大规模重构风险极高
- Higress LLM 路由与 AgentScope 直连 LLM 存在架构冲突
- IntelligentSelector 在 AgentScope 中无原生等价物
- 可能影响 Go-Python SSE 通信协议

### AgentScope 集成可行性评分

| 维度 | 方案 A 浅层 | 方案 B 深层 |
|------|-----------|-----------|
| 技术可行性 | 9/10 | 6/10 |
| 实施复杂度 | 低 | 高 |
| 对现有功能的影响 | 最小 | 显著 |
| 生态收益 | 中 | 高 |
| 推荐度 | ⭐⭐⭐⭐⭐ | ⭐⭐ |

---

## Mem0 记忆系统替换评估

### Mem0 OSS 核心能力

| 能力 | Mem0 OSS | 现有系统 | 差距 |
|------|----------|---------|------|
| 语义向量搜索 | ✅ 多向量库支持 | ❌ 仅 importance 排序 | 🔴 关键缺失 |
| 智能去重 | ✅ 自动检测 | ❌ 无 | 🔴 关键缺失 |
| 记忆自动提取 | ✅ LLM 驱动 | ❌ 需手动存储 | 🔴 关键缺失 |
| 图谱记忆 | ✅ 实体关系 | ❌ 无 | 🟡 增强能力 |
| 多模态支持 | ✅ 图文 | ❌ 纯文本 | 🟡 增强能力 |
| 用户/Agent 隔离 | ✅ user_id/agent_id | ✅ 同 | ✅ 已具备 |
| TTL 过期 | ✅ | ✅ | ✅ 已具备 |
| 自定义元数据 | ✅ | ✅ JSONB | ✅ 已具备 |
| REST API | ✅ (需 feature flag) | ✅ Go REST | ✅ 已具备 |
| 向量库选择 | Qdrant/Milvus/Chroma/+20 | Milvus/Qdrant (RAG 已有) | ✅ 可复用 |

### 替换方案分析

#### 方案 1：Mem0 OSS 作为 Python 层记忆后端（推荐）

```
替换前                              替换后
Python MemoryManager                Python Mem0Client (新)
  ↓ HTTP                              ↓ 本地调用
Go MemoryRegistry                   Mem0 OSS (Python 进程内)
  ↓ SQL                                ↓
PostgreSQL memory_*                 Qdrant/Milvus (向量) + PostgreSQL (元数据)
```

**实现方式**：

```python
# python/src/resolveagent/agent/memory_mem0.py (新文件)
from mem0 import Memory

class Mem0MemoryManager:
    """基于 Mem0 OSS 的记忆管理器，替换原有 MemoryManager。"""

    def __init__(self, agent_id: str, user_id: str = ""):
        self._mem0 = Memory.from_config({
            "vector_store": {
                "provider": "qdrant",  # 复用已有 Qdrant
                "config": {"host": "localhost", "port": 6333}
            },
            "llm": {
                "provider": "openai_structured",  # 通过 Higress 兼容端点
                "config": {"api_key": "...", "base_url": "http://higress/llm/v1"}
            },
            "embedder": {
                "provider": "openai",
                "config": {"api_key": "...", "base_url": "http://higress/llm/v1"}
            }
        })
        self._agent_id = agent_id
        self._user_id = user_id

    async def add(self, content: str, metadata: dict = None):
        """添加记忆，Mem0 自动提取、去重、向量化。"""
        self._mem0.add(
            content,
            user_id=self._user_id,
            agent_id=self._agent_id,
            metadata=metadata or {},
        )

    async def search(self, query: str, limit: int = 10):
        """语义搜索记忆。"""
        return self._mem0.search(
            query,
            user_id=self._user_id,
            agent_id=self._agent_id,
            limit=limit,
        )

    async def get_all(self):
        """获取所有记忆。"""
        return self._mem0.get_all(
            user_id=self._user_id,
            agent_id=self._agent_id,
        )
```

**与现有系统的关系**：

| 组件 | 处置策略 | 说明 |
|------|---------|------|
| `MemoryManager` | 保留，添加 Mem0 适配器 | 通过工厂模式选择后端 |
| Go `MemoryRegistry` | 保留，短期记忆继续使用 | 长期记忆迁移到 Mem0 |
| `memory_short_term` 表 | 保留 | 会话历史仍由 Go 管理 |
| `memory_long_term` 表 | 渐进废弃 | Mem0 接管长期记忆 |
| `context_enricher.py` | 对接 Mem0 search | 填充 TODO 实现 |

#### 方案 2：Mem0 完全替换 Go 记忆层

```
替换后（完全模式）
Python Runtime → Mem0 OSS → Qdrant/Milvus + PostgreSQL
  （Go MemoryRegistry 完全废弃）
```

**优势**：架构更简洁，去除 Go-Python 记忆通信开销
**劣势**：需修改 Go 平台 REST API、前端 API 调用链、数据迁移复杂

**不推荐**：Go 平台已有 10 个记忆 API 端点在前端使用中，完全替换影响面过大。

#### 方案 3：混合模式（最佳推荐）

```
┌─────────────────────────────────────────────────────────┐
│                    Python Runtime                         │
│                                                           │
│  ┌─────────────────┐     ┌──────────────────────────┐   │
│  │  MemoryManager  │     │  Mem0MemoryManager       │   │
│  │  (短期/会话)     │     │  (长期/语义)              │   │
│  └────────┬────────┘     └──────────┬───────────────┘   │
│           │                          │                    │
│           ▼                          ▼                    │
│  Go MemoryRegistry          Mem0 OSS (进程内)            │
│  (REST API)                 ├── Qdrant 向量搜索          │
│  ├── memory_short_term      ├── LLM 记忆提取            │
│  └── 前端 API 兼容          └── 图谱记忆 (可选)          │
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ContextEnricher 统一调度                           │   │
│  │  recent_history ← MemoryManager.get_context()    │   │
│  │  relevant_memories ← Mem0MemoryManager.search()  │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**分工**：
- **短期记忆**（会话历史）：保持现有 MemoryManager → Go → PostgreSQL 链路不变
- **长期记忆**（知识、偏好、模式）：使用 Mem0 OSS，获得语义搜索和自动提取
- **上下文增强**：ContextEnricher 同时查询两个记忆源，合并后作为 LLM 上下文

---

## 迁移成本估算

### AgentScope 浅层集成（方案 A）

| 任务 | 预估工时 | 开发者 | 风险 |
|------|---------|--------|------|
| MCP 工具协议集成 | 5 天 | Python 后端 | 低 |
| Toolkit 工具注册重构 | 3 天 | Python 后端 | 低 |
| MsgHub 多 Agent 通信 | 5 天 | Python 后端 | 中 |
| 记忆压缩集成 | 3 天 | Python 后端 | 低 |
| 消息格式适配层 | 2 天 | Python 后端 | 低 |
| 集成测试 | 5 天 | 全栈 | 中 |
| 文档更新 | 2 天 | 全栈 | 低 |
| **小计** | **25 天 (5 周)** | | |

### Mem0 记忆替换（混合方案 3）

| 任务 | 预估工时 | 开发者 | 风险 |
|------|---------|--------|------|
| Mem0 OSS 依赖集成 | 1 天 | Python 后端 | 低 |
| Mem0MemoryManager 实现 | 3 天 | Python 后端 | 低 |
| Higress 兼容的 LLM/Embedder 配置 | 2 天 | Python + 运维 | 中 |
| ContextEnricher 对接 Mem0 | 3 天 | Python 后端 | 中 |
| 工厂模式 + 配置切换 | 1 天 | Python 后端 | 低 |
| 历史长期记忆数据迁移脚本 | 2 天 | 后端 | 中 |
| 集成测试 | 3 天 | 全栈 | 中 |
| 文档更新 | 1 天 | 全栈 | 低 |
| **小计** | **16 天 (3.5 周)** | | |

### 总体成本

| 项目 | 单独实施 | 合并实施 |
|------|---------|---------|
| AgentScope 浅层集成 | 5 周 | 合并可节省 ~1 周 |
| Mem0 记忆替换 | 3.5 周 | （记忆压缩可用 Mem0 替代） |
| **合计** | 8.5 周 | **7 周** |
| Buffer (20%) | | **8.5 周** |

### 风险评估矩阵

| 风险项 | 概率 | 影响 | 缓解措施 |
|--------|------|------|---------|
| AgentScope 版本兼容性 | 中 | 高 | 锁定特定版本，编写适配层 |
| Mem0 LLM 调用与 Higress 路由冲突 | 中 | 中 | 自定义 Mem0 LLM provider 走 Higress |
| Go 记忆 API 兼容性破坏 | 低 | 高 | 混合模式保留 Go 短期记忆 API |
| 向量库资源竞争（RAG vs Mem0 共用） | 低 | 中 | 独立 Collection 隔离 |
| 前端记忆页面功能回归 | 中 | 中 | 保留 Go API，前端无感知 |
| 性能退化（Mem0 增加 LLM 调用） | 中 | 中 | 记忆提取异步化，批量处理 |

---

## 替换后的优势与潜在问题

### 优势

#### AgentScope 集成优势

| 优势 | 说明 | 影响范围 |
|------|------|---------|
| **MCP 生态接入** | 一行代码接入 Gaode Map、GitHub、Slack 等 MCP 工具服务器 | 技能系统扩展 |
| **A2A 协议** | 支持跨平台 Agent 互操作，可与外部 Agent 系统通信 | 架构扩展 |
| **社区驱动迭代** | 阿里持续投入，每月新功能发布 | 长期维护 |
| **Agentic RL** | 通过强化学习微调 Agent 行为，提升路由准确性 | 智能选择器优化 |
| **多 Agent 编排** | MsgHub 提供结构化的多 Agent 通信和工作流 | 复杂工作流 |

#### Mem0 替换优势

| 优势 | 说明 | 影响范围 |
|------|------|---------|
| **语义记忆搜索** | 基于向量相似度检索相关记忆，而非简单排序 | 上下文增强质量 |
| **自动记忆提取** | LLM 自动从对话中提取关键知识，无需手动存储 | 运维负担 |
| **智能去重** | 自动检测和合并重复记忆 | 数据质量 |
| **图谱记忆** | 构建实体关系图，理解用户/系统关联 | 个性化能力 |
| **复用向量基础设施** | 可直接使用 ResolveAgent 已有的 Qdrant/Milvus | 部署成本 |
| **填补 TODO** | 直接解决 `context_enricher.py:417` 的记忆查询 TODO | 功能完整性 |

### 潜在问题

#### AgentScope 潜在问题

| 问题 | 严重性 | 详情 | 缓解方案 |
|------|--------|------|---------|
| **LLM 路由冲突** | 🔴 高 | AgentScope `DashScopeChatModel` 直连 LLM，绕过 Higress 网关 | 自定义 Model 类包装 HigressLLMProvider |
| **消息格式不兼容** | 🟡 中 | AgentScope 使用 `Msg` 对象，ResolveAgent 使用 `dict` | 编写双向转换适配器 |
| **版本锁定风险** | 🟡 中 | AgentScope 迭代快（2.0 即将发布），API 可能不稳定 | 抽象适配层隔离变化 |
| **调试复杂度增加** | 🟡 中 | 两套框架叠加，错误排查难度上升 | 完善日志和追踪 |

#### Mem0 潜在问题

| 问题 | 严重性 | 详情 | 缓解方案 |
|------|--------|------|---------|
| **额外 LLM 调用成本** | 🟡 中 | 记忆提取需要 LLM 调用，增加 Token 消耗 | 异步批量处理，设置调用频率限制 |
| **冷启动延迟** | 🟡 中 | 首次加载 Mem0 需初始化向量索引 | 预热机制，延迟初始化 |
| **数据一致性** | 🟡 中 | 两套记忆系统（Go 短期 + Mem0 长期）可能不一致 | 明确分工边界，避免交叉引用 |
| **向量库运维** | 🟢 低 | 新增 Mem0 的向量 Collection 需要管理 | 与 RAG 向量库统一运维 |

---

## 详细实施步骤建议

### Phase 0：准备阶段（1 周）

```
┌─────────────────────────────────────────────────────┐
│ Task 0.1: 环境准备                                    │
│  ├── 升级 agentscope 到 ≥2.0 (pyproject.toml)       │
│  ├── 添加 mem0ai 依赖                                │
│  ├── 验证 Qdrant/Milvus 向量库连接                   │
│  └── 创建 feature/agentscope-mem0 分支               │
│                                                       │
│ Task 0.2: 配置体系扩展                                │
│  ├── runtime.yaml 添加 mem0 配置节                   │
│  ├── 环境变量 RESOLVEAGENT_MEM0_* 定义               │
│  └── 工厂模式配置切换支持                             │
└─────────────────────────────────────────────────────┘
```

**配置扩展示例**：

```yaml
# configs/runtime.yaml 新增
memory:
  short_term:
    backend: "go_platform"  # 保持不变
    max_messages_per_conversation: 200
  long_term:
    backend: "mem0"  # 新增: "go_platform" | "mem0"
    mem0:
      vector_store:
        provider: "qdrant"
        host: "localhost"
        port: 6333
        collection_name: "resolveagent_memory"
      llm:
        provider: "openai_structured"
        base_url: "http://localhost:8080/llm/v1"  # 通过 Higress
      embedder:
        provider: "openai"
        base_url: "http://localhost:8080/llm/v1"
```

### Phase 1：Mem0 记忆替换（2.5 周）— 优先实施

```
Week 1:
┌─────────────────────────────────────────────────────┐
│ Task 1.1: Mem0MemoryManager 实现 (3 天)              │
│  ├── python/src/resolveagent/agent/memory_mem0.py   │
│  ├── add() / search() / get_all() / delete()       │
│  ├── Higress 兼容的 LLM/Embedder 配置              │
│  └── 单元测试                                        │
│                                                       │
│ Task 1.2: MemoryFactory 工厂模式 (1 天)              │
│  ├── python/src/resolveagent/agent/memory_factory.py│
│  ├── 根据 runtime.yaml 选择后端                      │
│  └── 向后兼容：默认使用 go_platform                  │
│                                                       │
│ Task 1.3: ContextEnricher 对接 (2 天)                │
│  ├── 修改 context_enricher.py:417 TODO              │
│  ├── search Mem0 获取 relevant_memories              │
│  └── 合并到 enriched_context 输出                    │
└─────────────────────────────────────────────────────┘

Week 2:
┌─────────────────────────────────────────────────────┐
│ Task 1.4: ExecutionEngine 集成 (2 天)                │
│  ├── engine.py: 对话结束后异步提取记忆到 Mem0        │
│  ├── 利用 Mem0 的 add() 自动提取关键信息             │
│  └── 不影响现有 SSE 流式执行流程                     │
│                                                       │
│ Task 1.5: 数据迁移脚本 (1 天)                        │
│  ├── scripts/migrate-memory-to-mem0.py              │
│  ├── 从 memory_long_term 表读取 → Mem0 add()        │
│  └── 可选：保留原表作为备份                          │
│                                                       │
│ Task 1.6: 集成测试 + 回归 (2 天)                     │
│  ├── 测试 Mem0 搜索质量                              │
│  ├── 测试与现有 Go 短期记忆 API 的兼容性            │
│  └── 前端记忆页面功能回归                            │
└─────────────────────────────────────────────────────┘
```

### Phase 2：AgentScope 浅层集成（3.5 周）

```
Week 3-4:
┌─────────────────────────────────────────────────────┐
│ Task 2.1: MCP 工具协议集成 (5 天)                    │
│  ├── 引入 agentscope.mcp.HttpStatelessClient        │
│  ├── 新增 MCPSkillAdapter 适配 SkillExecutor        │
│  ├── 支持通过配置注册外部 MCP 工具服务器            │
│  └── 测试 MCP 工具调用链路                           │
│                                                       │
│ Task 2.2: Toolkit 工具注册 (3 天)                    │
│  ├── SkillLoader 输出 agentscope.tool.Toolkit       │
│  ├── 统一工具发现和参数 Schema 管理                  │
│  └── 向后兼容现有 skill manifest 格式               │
└─────────────────────────────────────────────────────┘

Week 5:
┌─────────────────────────────────────────────────────┐
│ Task 2.3: MsgHub 多 Agent 通信 (3 天)               │
│  ├── MegaAgent._execute_multi() 引入 MsgHub         │
│  ├── 支持 Agent 间消息广播和订阅                     │
│  └── 测试多路由链式执行                              │
│                                                       │
│ Task 2.4: 消息格式适配 (2 天)                        │
│  ├── Msg ↔ dict 双向转换器                           │
│  ├── 确保 SSE 流式输出不受影响                       │
│  └── 日志和追踪格式统一                              │
│                                                       │
│ Task 2.5: 端到端测试 + 文档 (3 天)                   │
│  ├── MCP 工具 → Selector → 执行 完整链路测试        │
│  ├── 更新 architecture.md 和 agentscope 集成文档    │
│  └── 性能基准对比                                    │
└─────────────────────────────────────────────────────┘
```

### Phase 3：验证与优化（1 周）

```
Week 6:
┌─────────────────────────────────────────────────────┐
│ Task 3.1: 性能基准测试                                │
│  ├── Mem0 记忆搜索延迟 vs 原有方案                   │
│  ├── MCP 工具调用延迟                                │
│  └── 端到端请求延迟对比                              │
│                                                       │
│ Task 3.2: 记忆质量评估                                │
│  ├── 语义搜索准确率测试                              │
│  ├── 记忆去重效果验证                                │
│  └── 上下文增强质量 A/B 对比                         │
│                                                       │
│ Task 3.3: 生产就绪检查                                │
│  ├── feature flag 开关验证                           │
│  ├── 回退机制测试（Mem0 故障 → 降级到 Go 记忆）     │
│  └── 监控指标和告警配置                              │
└─────────────────────────────────────────────────────┘
```

---

## 决策建议

### 推荐实施路径

```
Phase 1 (优先)          Phase 2 (次优先)         Phase 3
Mem0 记忆替换           AgentScope 浅层集成       验证优化
[3.5 周]                [3.5 周]                  [1 周]
┌──────────┐           ┌──────────┐              ┌──────┐
│ Mem0 OSS │           │ MCP 协议 │              │ 基准 │
│ 混合模式 │    →      │ Toolkit  │      →       │ 测试 │
│ 上下文增强│           │ MsgHub   │              │ 质量 │
└──────────┘           └──────────┘              └──────┘
     ↓ 快速见效              ↓ 生态扩展              ↓ 生产就绪
```

### 理由

1. **Mem0 优先**：直接解决记忆系统的核心痛点（语义搜索、自动提取），填补 `context_enricher.py` 的 TODO，3.5 周即可产出可感知的效果。
2. **AgentScope 渐进式**：采用方案 A 浅层集成，避免大规模重构风险，优先引入 MCP 生态能力。
3. **不推荐方案 B 深层重构**：当前 IntelligentSelector 三阶段路由是项目核心差异化能力，AgentScope 中无等价物；Higress LLM 路由架构也与 AgentScope 直连模型冲突明显。

### 前置条件

| 条件 | 状态 | 说明 |
|------|------|------|
| Python ≥ 3.11 | ✅ 已满足 | pyproject.toml requires-python |
| Qdrant/Milvus 可用 | ⚠️ 需确认 | RAG 模块已声明依赖，需确认实例可用 |
| AgentScope ≥ 2.0 | ⚠️ 待发布 | 2026-04 路线图显示 2.0 即将发布 |
| Higress 网关 LLM 端点 | ✅ 已配置 | Mem0 LLM 调用可通过 Higress |

---

## 附录

### 关键文件索引

| 文件 | 用途 | 迁移影响 |
|------|------|---------|
| `python/pyproject.toml` | 依赖声明 | 需添加 `mem0ai` |
| `python/src/resolveagent/agent/base.py` | Agent 基类 | AgentScope 集成时需修改 |
| `python/src/resolveagent/agent/mega.py` | 编排器 | 方案 A 小改 / 方案 B 大改 |
| `python/src/resolveagent/agent/memory.py` | 记忆管理 | Mem0 适配器新增 |
| `python/src/resolveagent/runtime/engine.py` | 执行引擎 | Mem0 集成点 |
| `python/src/resolveagent/selector/context_enricher.py` | 上下文增强 | L417 TODO 填充 |
| `pkg/registry/memory.go` | Go 记忆接口 | 保持不变 |
| `pkg/store/postgres/memory_store.go` | Go 记忆存储 | 保持不变 |
| `scripts/migration/006_memory.up.sql` | 记忆表结构 | 保持不变（短期记忆继续用） |
| `configs/runtime.yaml` | 运行时配置 | 新增 mem0 配置节 |
| `configs/resolveagent.yaml` | 平台配置 | 保持不变 |

### 参考资料

- [AgentScope GitHub](https://github.com/modelscope/agentscope) — 官方仓库
- [AgentScope 文档](https://modelscope.github.io/agentscope/) — API 文档和教程
- [Mem0 GitHub](https://github.com/mem0ai/mem0) — 官方仓库
- [Mem0 文档](https://docs.mem0.ai/) — API 文档和集成指南
- [Mem0 Platform vs OSS](https://docs.mem0.ai/platform/platform-vs-oss) — 功能对比
- [ResolveAgent 架构设计](./architecture.md) — 当前系统架构
- [AgentScope 与 Higress 集成](./agentscope-higress-integration.md) — 现有集成说明
