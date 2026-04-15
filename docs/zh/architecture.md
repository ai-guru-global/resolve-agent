# 架构设计

本文档深入介绍 ResolveAgent 的系统架构、设计理念和核心组件。

---

## 设计理念

ResolveAgent 的设计遵循以下核心原则：

### 1. 统一智能路由

传统的 AI Agent 系统通常采用固定的处理流程，而 ResolveAgent 通过**智能选择器（Intelligent Selector）**实现动态路由，根据用户意图自动选择最优的执行路径。智能选择器支持三种策略（规则/LLM/混合），通过三阶段流程（意图分析 -> 上下文增强 -> 路由决策）实现自适应路由。

### 2. 可组合的能力层

系统将能力分为四个可组合的层次：
- **FTA 工作流**：复杂的多步骤决策流程，支持 AND/OR/NOT/VOTING/INHIBIT/PRIORITY_AND 门类型
- **技能（Skills）**：原子化的功能单元，沙箱执行（10s CPU、512MB 内存限制）
- **RAG 管道**：知识检索与增强，三级重排序（cross-encoder / LLM / Jaccard+MMR 回退）
- **代码分析（Code Analysis）**：静态分析（AST 调用图 + 错误解析 + 方案生成）与动态分析（混合流量采集 + 服务依赖图 + LLM 报告），RAG 双写沉淀

### 3. 云原生优先

采用现代云原生架构，支持：
- 容器化部署
- 水平扩展
- 服务网格集成
- 可观测性（Metrics, Logs, Traces）

### 4. 唯一数据源

Go 注册表系统作为所有服务注册的唯一数据源（Single Source of Truth），通过 Higress 网关同步路由配置，确保系统拓扑一致性。

---

## 系统架构全景

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              客户端层                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────────────┐  │
│  │  CLI/TUI  │    │   WebUI   │    │    SDK    │    │  External Client  │  │
│  │   (Go)    │    │ (React)   │    │ (Python)  │    │    (gRPC/REST)    │  │
│  └─────┬─────┘    └─────┬─────┘    └─────┬─────┘    └─────────┬─────────┘  │
│        │                │                │                    │            │
└────────┼────────────────┼────────────────┼────────────────────┼────────────┘
         │                │                │                    │
         ▼                ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     API 网关层 (Higress)                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │    认证     │ │    限流     │ │  模型路由   │ │   路由同步 (30s)    │   │
│  │Authentication│ │Rate Limiting│ │Model Router │ │    Route Sync       │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────────┘   │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            平台服务层 (Go)                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         API Server                                   │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────────────────────────────┐ │   │
│  │  │  HTTP API │ │ gRPC API  │ │ RuntimeClient (HTTP+SSE → :9091)  │ │   │
│  │  │  :8080    │ │   :9090   │ │ 120s timeout, SSE streaming       │ │   │
│  │  └───────────┘ └───────────┘ └───────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    12 大注册表（内存存储）                             │   │
│  │  核心: Agent | Skill | Workflow                                      │   │
│  │  知识: RAG | RAGDocument | FTADocument                               │   │
│  │  基础: Hook | CodeAnalysis | Memory                                  │   │
│  │  分析: CallGraph | TrafficCapture | TrafficGraph                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────────────────────────┐   │
│  │ 配置管理 (Viper)     │  │ 事件总线 (NATS) | 遥测 (OpenTelemetry)   │   │
│  │ YAML + 环境变量      │  │                                          │   │
│  └──────────────────────┘  └──────────────────────────────────────────┘   │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ HTTP + SSE
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Agent 运行时层 (Python)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                   MegaAgent 编排器 (selector_mode)                    │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│  ┌──────────────────────────────┴──────────────────────────────────────┐   │
│  │                        智能选择器 (3 策略)                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┐  │   │
│  │  │  意图分析   │→→│ 上下文增强  │→→│        路由决策             │  │   │
│  │  │ 单次遍历    │  │ 并行查询    │  │ 规则/LLM/混合 + 缓存       │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────────┘  │   │
│  └──────────────────────────────┬──────────────────────────────────────┘   │
│                                 │                                           │
│         ┌───────────────────────┼───────────────────────┐                  │
│         ▼                       ▼                       ▼                  │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐          │
│  │ FTA 引擎    │         │ 技能执行器  │         │ RAG 管道    │          │
│  │ 6种门类型   │         │ 沙箱 + 3内置│         │ 6格式 5策略 │          │
│  └─────────────┘         └─────────────┘         └─────────────┘          │
│                                 │                                           │
│                                 ▼                                           │
│                          ┌─────────────┐                                   │
│                          │ 代码分析引擎│                                   │
│                          │ 静态 + 动态 │                                   │
│                          └─────────────┘                                   │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────────────┐   │
│  │ 语料库导入   │  │    Hooks     │  │   LLM 提供者抽象层              │   │
│  │+ RAG 双写    │  │  生命周期钩子│  │   通义 | 文心 | 智谱 | OpenAI   │   │
│  └──────────────┘  └──────────────┘  └────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 核心组件详解

### 1. API 网关层 (Higress)

基于 [Higress](https://github.com/alibaba/higress) 构建的 AI 网关层，提供：

| 功能 | 说明 |
|------|------|
| **认证授权** | JWT/API Key 身份验证，RBAC 权限控制 |
| **限流降级** | 基于 Token、请求数的限流策略 |
| **模型路由** | 根据 model_id 路由到不同 LLM 后端（通义/文心/智谱/OpenAI 兼容） |
| **路由同步** | Go 平台 `RouteSync` 每 30 秒将注册路由推送至 Higress，确保网关与服务拓扑一致 |
| **负载均衡** | 多实例负载分发 |

```
┌──────────────┐   路由同步 (30s)    ┌──────────────────┐
│  Go 注册表   │ ──────────────────▶ │  Higress 网关    │
│  (9 个存储)  │                    │  - 认证           │
└──────────────┘                    │  - 限流           │
                                    │  - 模型路由       │
┌──────────────┐   LLM 请求        │  - 负载均衡       │
│  Python LLM  │ ──────────────────▶│                    │
│  抽象层      │                    └──────────────────┘
└──────────────┘                           │
                                           ▼
                                    ┌──────────────────┐
                                    │  LLM 提供商      │
                                    │ 通义/文心/智谱   │
                                    └──────────────────┘
```

### 2. 平台服务层 (Go)

Go 语言实现的核心平台服务，提供资源管理和协调能力。

#### 2.1 API Server

```go
// API Server 架构 - 双端口服务
type Server struct {
    httpServer     *http.Server      // HTTP API (REST) :8080
    grpcServer     *grpc.Server      // gRPC API :9090
    runtimeClient  *RuntimeClient    // HTTP+SSE 桥接 Python :9091
    eventBus       event.Bus         // 事件总线
    registries     [12]Registry      // 12 大注册表
    config         *config.Config    // Viper 配置管理
}
```

**API 端点示例**：

| 服务 | gRPC 方法 | HTTP 路由 | 说明 |
|------|-----------|-----------|------|
| AgentService | CreateAgent | POST /api/v1/agents | 创建 Agent |
| AgentService | ExecuteAgent | POST /api/v1/agents/{id}/execute | 执行 Agent |
| SkillService | ListSkills | GET /api/v1/skills | 列出技能 |
| WorkflowService | ExecuteWorkflow | POST /api/v1/workflows/{id}/execute | 执行工作流 |
| RAGService | QueryCollection | POST /api/v1/rag/{collection}/query | 查询 RAG |
| CorpusService | ImportCorpus | POST /api/v1/corpus/import | 导入语料库 |

#### 2.2 注册表系统

9 大内存注册表，统一 CRUD 接口，作为系统唯一数据源：

| 注册表 | 资源类型 | 职责 |
|--------|----------|------|
| **AgentRegistry** | Agent 定义 | Agent 生命周期、配置、状态管理 |
| **SkillRegistry** | 技能清单 | 技能发现、版本管理、依赖追踪 |
| **WorkflowRegistry** | FTA 工作流 | 工作流定义、树结构验证、执行调度 |
| **RAGRegistry** | RAG 集合 | 集合元数据、嵌入配置 |
| **RAGDocumentRegistry** | RAG 文档 | 单个文档追踪 |
| **FTADocumentRegistry** | FTA 文档 | 故障树文档管理 |
| **HookRegistry** | Hook 定义 | 生命周期钩子配置 |
| **CodeAnalysisRegistry** | 分析结果 | 静态分析结果存储 |
| **MemoryRegistry** | Agent 记忆 | 对话历史、已解决问题记忆 |

所有注册表实现统一泛型接口：

```go
type Registry[T any] interface {
    Create(ctx context.Context, item T) (T, error)
    Get(ctx context.Context, id string) (T, error)
    Update(ctx context.Context, id string, item T) (T, error)
    Delete(ctx context.Context, id string) error
    List(ctx context.Context, opts ListOptions) ([]T, error)
}

type ListOptions struct {
    Page     int               // 页码
    PageSize int               // 每页数量
    Filter   map[string]string // 过滤条件
    Sort     string            // 排序字段
}
```

后端选择（内存或 PostgreSQL）通过 `StoreConfig` 按注册表独立配置。

#### 2.3 配置管理

基于 Viper 的配置系统，支持多层配置源：

- **YAML 配置文件**：主配置文件
- **环境变量**：`RESOLVEAGENT_*` 前缀，自动映射到配置路径
- **按注册表存储后端选择**：每个注册表可独立选择 memory 或 postgres 后端

### 3. Go-Python 通信桥

Go 平台与 Python 运行时通过 HTTP + SSE 桥接通信：

```
┌───────────────────────┐                    ┌───────────────────────┐
│  Go 平台服务          │   HTTP + SSE       │  Python 运行时         │
│  (端口 8080/9090)     │ ──────────────────▶│  (FastAPI :9091)       │
│                       │                    │                       │
│  RuntimeClient        │   POST /execute    │  ExecutionEngine       │
│  - executeAgent()     │ ─────────────────▶ │  - run_agent()         │
│  - executeWorkflow()  │   SSE 流式响应     │  - run_workflow()      │
│  - importCorpus()     │ ◀───────────────── │  - import_corpus()     │
│  - 超时: 120s         │  text/event-stream │                       │
└───────────────────────┘                    └───────────────────────┘
```

关键特性：
- **SSE 流式传输**: 长时间运行的操作（Agent 执行、语料库导入）通过 SSE 事件流向 Go 端回传进度
- **RuntimeClient**: Go 端 HTTP 客户端，可配置超时（默认 120s）
- **ExecutionEngine**: Python 端 FastAPI 请求分发器
- **RegistryClient**: Python 端 HTTP 客户端，查询 Go 注册表获取技能、工作流、RAG 集合信息

### 4. Agent 运行时层 (Python)

Python 实现的 Agent 执行引擎，基于 [AgentScope](https://github.com/modelscope/agentscope) 构建。

#### 4.1 MegaAgent

MegaAgent 是顶层编排器，支持三种选择器模式：

```python
class MegaAgent(BaseAgent):
    def __init__(
        self,
        name: str,
        selector_strategy: str = "hybrid",
        selector_mode: SelectorMode = "selector",  # "selector" | "hooks" | "skills"
        **kwargs,
    ) -> None: ...

    def _get_selector(self) -> SelectorProtocol:
        """惰性创建并缓存选择器，在所有 reply() 调用中复用。"""
        if self._selector_instance is not None:
            return self._selector_instance
        if self.selector_mode == "hooks":
            self._selector_instance = HookSelectorAdapter(strategy=self.selector_strategy)
        elif self.selector_mode == "skills":
            self._selector_instance = SkillSelectorAdapter()
        else:
            self._selector_instance = IntelligentSelector(strategy=self.selector_strategy)
        return self._selector_instance

    async def reply(self, message: dict) -> dict:
        selector = self._get_selector()
        decision = await selector.route(
            input_text=message.get("content", ""),
            agent_id=self.name,
        )
        # 根据 decision.route_type 分发执行 ...
```

#### 4.2 智能选择器三阶段流程

```
┌────────────────────────────────────────────────────────────────────┐
│                     智能选择器处理流程                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  用户输入: "帮我分析一下生产环境最近的故障"                        │
│      │                                                             │
│      ▼                                                             │
│  ┌──────────────────────────────────┐                              │
│  │ [缓存检查] SHA-256(input+agent+strategy)                        │
│  │  命中 → 直接返回缓存的 RouteDecision                           │
│  └──────────────┬───────────────────┘                              │
│      │ 未命中                                                       │
│      ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 阶段1: 意图分析 (IntentAnalyzer - 单次遍历)                  │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  - 关键词评分 + 模式匹配 + 代码检测 + 问题检测（一次遍历）  │  │
│  │  - 预编译正则 (_code_block_re, _code_syntax_patterns)       │  │
│  │  - frozenset O(1) 问题词查找                                 │  │
│  │  - 输出: IntentClassification (类型, 实体, 置信度, 分数)     │  │
│  │  - 多意图检测: top-2 差距 < 0.15 → MULTI                    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│      │                                                             │
│      ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 阶段2: 上下文增强 (ContextEnricher - asyncio.gather 并行)    │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  并行查询:                                                    │  │
│  │  ├── 技能注册表 → 加权排序 top-10                             │  │
│  │  ├── 工作流注册表                                              │  │
│  │  └── RAG 集合注册表                                            │  │
│  │  附加: Agent 记忆、对话历史（最近 10 条）                     │  │
│  │  代码场景: CodeContext (语言检测 8种, 问题类型, 复杂度)       │  │
│  └─────────────────────────────────────────────────────────────┘  │
│      │                                                             │
│      ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 阶段3: 路由决策 (策略执行)                                    │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  混合策略三阶段:                                               │  │
│  │  1. 快速规则路径: 18 条规则匹配, 置信度 >= 0.7 → 直接返回    │  │
│  │  2. LLM 回退: 调用快速 LLM 分类                               │  │
│  │  3. 集成决策: 规则 vs LLM 置信度比较 + 自适应加成             │  │
│  │     • 代码复杂度加成: +0.05                                    │  │
│  │     • 对话历史加成: +0.03 (历史 > 3 条)                       │  │
│  │     • 路由类型加成: 可配置 per_route_boosts                   │  │
│  │  输出: RouteDecision (type, target, confidence, reasoning)    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│      │                                                             │
│      ▼                                                             │
│  [写入缓存] TTL-aware LRU (默认 1000 条, 300s TTL)               │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**路由类型**:

| 路由类型 | 目标 | 说明 |
|----------|------|------|
| `workflow` | FTA 工作流 | 复杂多步骤故障诊断流程 |
| `skill` | 注册技能 | 具体工具执行（搜索、代码执行、文件操作） |
| `rag` | 知识集合 | 从文档中检索增强生成 |
| `code_analysis` | 静态分析工具 | 代码审查、安全扫描、AST 分析 |
| `direct` | LLM | 简单直接响应，无需工具 |
| `multi` | 链式路由 | 多路由按序组合执行 |

**选择器适配器**:

所有选择器实现遵循 `SelectorProtocol`（`runtime_checkable` Protocol），支持结构子类型化：

| 实现 | 模式 | 说明 |
|------|------|------|
| `IntelligentSelector` | `"selector"` | 默认 LLM 驱动的元路由器 |
| `HookSelectorAdapter` | `"hooks"` | 带 pre/post hook 拦截的选择器 |
| `SkillSelectorAdapter` | `"skills"` | 通过技能调用执行路由 |

---

## FTA / 技能系统 / RAG 管道 / 代码分析引擎协同

四大执行子系统通过智能选择器协调运作：

```
                    用户请求
                       │
                       ▼
              ┌─────────────────┐
              │   MegaAgent     │
              │   (编排器)      │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │   智能选择器    │ ── 缓存 (SHA-256, TTL-LRU)
              │  (3 种策略)     │
              └────────┬────────┘
                       │ RouteDecision
         ┌─────────────┼─────────────┬─────────────┐
         ▼             ▼             ▼             ▼
  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────┐
  │  FTA 引擎  │ │  技能系统  │ │  RAG 管道  │ │  代码分析引擎  │
  └──────┬─────┘ └──────┬─────┘ └──────┬─────┘ └───────┬────────┘
         │              │              │          ┌─────┴─────┐
         ▼              ▼              ▼          ▼           ▼
   故障树分析      沙箱执行       向量检索    静态分析     动态分析
                                  +重排序    (AST/调用图) (流量/图谱)
                                                  │           │
                                                  └─────┬─────┘
                                                        ▼
                                                  RAG 双写管道
                                              (code-analysis + kudig-rag)
```

### FTA 引擎

**位置**: `python/src/resolveagent/fta/`

执行故障树工作流，用于复杂的多步骤故障诊断：

| 组件 | 说明 |
|------|------|
| **FaultTree** | 故障树数据结构，包含事件（FTAEvent）和门（FTAGate） |
| **FTAGate** | 6 种门类型: AND, OR, NOT, VOTING, INHIBIT, PRIORITY_AND |
| **FTAEngine** | 分析引擎: `analyze()`, `cut_sets()` (最小割集), `monte_carlo()` (蒙特卡罗模拟) |
| **FTAEvaluator** | 概率评估器，Fussell-Vesely 重要度计算 |
| **FTASerializer** | 序列化/反序列化，支持 JSON 和 Mermaid 格式 |

### 技能系统

**位置**: `python/src/resolveagent/skills/`

原子化功能单元，沙箱执行环境保障安全：

**沙箱配置**：
```python
@dataclass
class SandboxConfig:
    cpu_timeout: int = 10      # CPU 时间限制 (秒)
    memory_limit: int = 512    # 内存限制 (MB)
    network_access: bool = False  # 网络访问权限
```

**内置技能**：

| 技能 | 说明 | 详情 |
|------|------|------|
| **WebSearchSkill** | 网络搜索 | 4 个提供商: Bing, Google, Searx, DuckDuckGo |
| **CodeExecutionSkill** | 代码执行 | 3 种语言: Python, Bash, JavaScript |
| **FileOpsSkill** | 文件操作 | 路径遍历保护，权限验证 |

技能通过 `SkillManifest` 声明元数据（名称、版本、能力、参数模式），由 `SkillLoader` 发现和加载。

### RAG 管道

**位置**: `python/src/resolveagent/rag/`

完整的知识检索增强生成管道：

```
解析 → 分块 → 嵌入 → 索引 → 检索 → 重排序

  解析器                分块器               嵌入器
  6 种格式:            5 种策略:            BGE 模型:
  MD, HTML,            fixed (固定大小)     Dashscope API
  PDF, DOCX,           sentence (句子)
  JSON, TXT            by_h2 (H2 标题)      索引器
                       by_h3 (H3 标题)      Milvus IVF_FLAT
                       by_section (章节)    Qdrant (备选)

                       重排序器 (3 级回退):
                       1. cross-encoder 模型 (最优)
                       2. LLM 重排序 (次优)
                       3. Jaccard + MMR (无模型回退)
```

### 代码分析引擎

**位置**: `python/src/resolveagent/code_analysis/` + `python/src/resolveagent/traffic/`

代码分析引擎是 ResolveAgent 的第四大执行子系统，包含**静态分析**和**动态分析**两个子引擎，分析结果通过 RAG 双写管道沉淀为可检索的知识资产。

#### 静态分析引擎

从源码仓库构建调用图、解析错误/堆栈，并结合 LLM + RAG 生成标准化解决方案。

| 组件 | 文件 | 说明 |
|------|------|------|
| **ASTParser** | `code_analysis/ast_parser.py` | 多语言 AST 解析（Python: `ast` 模块; Go/JS/TS/Java: 编译正则） |
| **CallGraphBuilder** | `code_analysis/call_graph.py` | BFS 调用图构建，入口点自动检测（装饰器模式），环检测 (visited set)，max_depth 保护 |
| **ErrorParser** | `code_analysis/error_parser.py` | 多语言错误/堆栈解析（Python traceback, Go panic, JavaScript, Java + 通用回退） |
| **SolutionGenerator** | `code_analysis/solution_generator.py` | LLM + RAG 混合方案生成，输出 SolutionDocument (Markdown + dict) |
| **StaticAnalysisEngine** | `code_analysis/engine.py` | 3 阶段 SSE 流式编排器 |

**3 阶段 SSE 管道**：

```
请求 (repo_path, language, entry_points, error_logs)
  │
  ▼
┌──────────────────────────────────────────────────────────┐
│ Phase 1: 调用图构建                                       │
│  ASTParser → CallGraphBuilder (BFS) → 持久化到 Go 平台   │
│  SSE: code_analysis.call_graph.progress                   │
└───────────────────────┬──────────────────────────────────┘
                        ▼
┌──────────────────────────────────────────────────────────┐
│ Phase 2: 错误解析                                         │
│  ErrorParser → ParsedError[] (多语言堆栈 + 严重性分级)    │
│  SSE: code_analysis.error_parsing.progress                │
└───────────────────────┬──────────────────────────────────┘
                        ▼
┌──────────────────────────────────────────────────────────┐
│ Phase 3: 方案生成 + RAG 双写                              │
│  SolutionGenerator (RAG 检索上下文 → LLM 生成)            │
│  → DualWriteRAGPipeline.ingest_solutions()                │
│  SSE: code_analysis.solution.generated                    │
└───────────────────────┬──────────────────────────────────┘
                        ▼
                   分析完成
```

**支持的语言**：

| 语言 | 解析方式 | 入口点检测 |
|------|----------|-----------|
| Python | `ast` 模块（完整 AST） | `@app.route`, `@api_view`, `def main` |
| Go | 编译正则（`func` 声明 + 调用） | `func main()`, `func handler(` |
| JavaScript/TypeScript | 编译正则（函数 + 箭头函数） | `export default`, `app.get(` |
| Java | 编译正则（方法声明 + 调用） | `public static void main`, `@RequestMapping` |

#### 动态流量分析引擎

通过混合采集方案收集运行时流量，构建服务依赖图并生成分析报告。

| 组件 | 文件 | 说明 |
|------|------|------|
| **TrafficCollector** | `traffic/collector.py` | 混合流量采集（OTel/Proxy/eBPF 三适配器模式） |
| **TrafficGraphBuilder** | `traffic/graph_builder.py` | 服务依赖图构建 + XYFlow 格式转换（网格布局） |
| **ReportGenerator** | `traffic/report_generator.py` | 规则基线分析 + LLM 增强报告 |
| **DynamicAnalysisEngine** | `traffic/engine.py` | 4 阶段 SSE 流式编排器 |

**三种流量采集适配器**：

| 适配器 | 数据源 | 输出 |
|--------|--------|------|
| `_OTelAdapter` | OpenTelemetry spans (Jaeger/Tempo) | 统一 `RawRecord` |
| `_ProxyLogAdapter` | Envoy/Higress 访问日志 | 统一 `RawRecord` |
| `_EBPFAdapter` | eBPF 包捕获 (tcpdump/bpftrace) | 统一 `RawRecord` |

**4 阶段 SSE 管道**：

```
请求 (sources[], name, target_service)
  │
  ▼
┌──────────────────────────────────────────────────────────┐
│ Phase 1: 流量采集                                         │
│  TrafficCollector.collect_multi() → 统一 RawRecord[]      │
│  SSE: traffic_analysis.collection.progress                │
└───────────────────────┬──────────────────────────────────┘
                        ▼
┌──────────────────────────────────────────────────────────┐
│ Phase 2: 图谱构建                                         │
│  TrafficGraphBuilder.build() → ServiceNode[] + Edge[]     │
│  → to_xyflow() 生成前端可视化数据                          │
│  SSE: traffic_analysis.graph.built                        │
└───────────────────────┬──────────────────────────────────┘
                        ▼
┌──────────────────────────────────────────────────────────┐
│ Phase 3: 报告生成                                         │
│  ReportGenerator (规则: 热点/异常/建议 → LLM 增强)        │
│  SSE: traffic_analysis.report.generated                   │
└───────────────────────┬──────────────────────────────────┘
                        ▼
┌──────────────────────────────────────────────────────────┐
│ Phase 4: 持久化 + RAG 双写                                │
│  → Go TrafficGraphRegistry 存储                            │
│  → DualWriteRAGPipeline.ingest_report()                   │
│  SSE: traffic_analysis.completed                          │
└──────────────────────────────────────────────────────────┘
```

#### RAG 双写管道

**位置**: `python/src/resolveagent/rag/dual_writer.py`

代码分析结果通过双写策略沉淀到向量数据库，同时服务于专用检索和通用知识查询：

```
静态分析方案 / 动态分析报告
          │
          ▼
┌───────────────────────────┐
│  DualWriteRAGPipeline     │
│                           │
│  ┌─────────────────────┐  │
│  │ Primary 写入         │  │    "code-analysis" 向量集合
│  │ (同步, 必须成功)     │──│──▶ 专用代码分析检索
│  └─────────────────────┘  │
│                           │
│  ┌─────────────────────┐  │
│  │ Secondary 写入       │  │    "kudig-rag" 向量集合
│  │ (best-effort)        │──│──▶ 通用 RAG 查询也受益
│  └─────────────────────┘  │
└───────────────────────────┘
```

| 方法 | 输入 | 说明 |
|------|------|------|
| `ingest_solutions()` | `SolutionDocument[]` | 静态分析方案 → 分块 → 嵌入 → 双写 |
| `ingest_report()` | `AnalysisReport` | 动态分析报告 → 分块 → 嵌入 → 双写 |
| `query()` | 查询文本 | 从 "code-analysis" 集合检索 |

#### Go 平台代码分析注册表

三个新注册表为代码分析提供持久化存储（InMemory + PostgreSQL 双后端）：

| 注册表 | 文件 | 核心方法 |
|--------|------|----------|
| **CallGraphRegistry** | `pkg/registry/call_graph.go` | CRUD + `AddNodes` / `AddEdges` / `ListNodes` / `ListEdges` / `GetSubgraph` |
| **TrafficCaptureRegistry** | `pkg/registry/traffic_capture.go` | CRUD + `AddRecords` / `ListRecords` / `GetRecordsByService` |
| **TrafficGraphRegistry** | `pkg/registry/traffic_graph.go` | CRUD + `GetByCaptureID` / `UpdateReport` |

**数据库迁移**：
- `008_call_graphs.sql` — `call_graphs`, `call_graph_nodes`, `call_graph_edges` 表
- `009_traffic_captures.sql` — `traffic_captures`, `traffic_records` 表
- `010_traffic_graphs.sql` — `traffic_graphs` 表 (含 `graph_data JSONB`, `analysis_report TEXT`)

#### MegaAgent 代码分析子路由

MegaAgent 通过 `_execute_code_analysis()` 实现子类型分发：

```
code_analysis 路由
    │
    ▼
sub_type = parameters.get("sub_type", "llm")
    │
    ├── "static"  → StaticAnalysisEngine.analyze_single()
    │                  (repo_path, language, entry_points, error_logs)
    │
    ├── "traffic" → DynamicAnalysisEngine.analyze_single()
    │                  (sources[], name, target_service)
    │
    └── "llm"     → LLM 代码审查 (传统模式，向后兼容)
```

---

## 语料库导入管道

语料库导入系统支持从 kudig-database Git 仓库批量导入：

```
Git Clone ──▶ 目录扫描 ──▶ 策略映射 ──▶ 解析 ──▶ 索引
                                │
                  ┌─────────────┼─────────────┬─────────────┐
                  ▼             ▼             ▼             ▼
            FTA 文档       技能文档       RAG 文档      代码分析文档
          (Mermaid+JSON) (YAML 前置元数据) (标题分块)   (AST+CallGraph)
                  │             │             │             │
                  ▼             ▼             ▼             ▼
            FaultTree +    AdaptedSkill +  Chunks +    CallGraph +
            基础事件       Manifest       Embeddings   Solutions
                                                          │
                                                          ▼
                                                     RAG 双写
                                                (code-analysis + kudig-rag)
```

| 组件 | 说明 |
|------|------|
| **CorpusConfig** | 目录模式到解析策略的映射（如 `topic-fta/*` → FTA 解析器，`domain-*` → RAG by_h2 分块） |
| **FTA Parser** | 从 Markdown 提取 Mermaid 图和 JSON 元数据块，生成 FaultTree 结构（事件、门、基础事件参数） |
| **Skill Adapter** | 将 kudig 格式技能（YAML 前置元数据 + Markdown 正文）转换为 AdaptedSkill（含 manifest 和 runbook 章节） |
| **CodeAnalysisImporter** | 扫描源码文件，驱动 StaticAnalysisEngine 构建调用图和方案，通过 RAG 双写管道沉淀 |
| **进度流** | 导入进度通过 SSE 事件流回传至 Go 平台 |

---

## 数据流

### 请求处理流程

```
客户端请求
    │
    ▼
┌───────────────────┐
│    API 网关       │  认证、限流、模型路由
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│   平台服务        │  查找 Agent 配置，转发至运行时
└────────┬──────────┘
         │ HTTP + SSE
         ▼
┌───────────────────┐
│  Agent 运行时     │
├───────────────────┤
│  1. 加载 Agent    │
│  2. 缓存检查      │
│  3. 智能选择器    │
│     (意图→增强→决策)│
│  4. 执行子系统    │
│  5. SSE 流式返回  │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│   执行子系统                │
├─────────────────────────────┤
│  FTA / Skill / RAG /        │
│  Code Analysis              │
└────────┬────────────────────┘
         │
         ▼
┌───────────────────┐
│    LLM 调用       │  通义/文心/智谱 (经 Higress 路由)
└───────────────────┘
```

### 事件驱动架构

系统采用事件驱动架构，通过 NATS 实现组件间解耦通信：

```
┌─────────────────────────────────────────────────────────────────┐
│                        事件总线 (NATS)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  主题 (Topics):                                                 │
│  ├── agent.created         Agent 创建事件                      │
│  ├── agent.execution.start 执行开始                            │
│  ├── agent.execution.done  执行完成                            │
│  ├── skill.registered      技能注册                            │
│  ├── workflow.event        工作流事件流                        │
│  └── telemetry.metrics     遥测指标                            │
│                                                                 │
│  订阅者:                                                        │
│  ├── 平台服务 - 状态同步                                       │
│  ├── WebUI - 实时更新                                          │
│  └── 遥测收集器 - 指标采集                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 扩展性设计

### 水平扩展

```
                     负载均衡器
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ 平台服务-1  │   │ 平台服务-2  │   │ 平台服务-3  │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│ Agent运行时-1│   │ Agent运行时-2│   │ Agent运行时-3│
└─────────────┘   └─────────────┘   └─────────────┘
```

### 插件化扩展点

| 扩展点 | 说明 | 接口 |
|--------|------|------|
| LLM Provider | 新增大模型支持 | `LLMProvider` |
| Skill Source | 新增技能来源 | `SkillLoader` |
| Selector Strategy | 自定义路由策略 | `RoutingStrategy` |
| Vector Backend | 新增向量数据库 | `VectorStore` |
| Event Handler | 自定义事件处理 | `EventHandler` |
| Chunking Strategy | 自定义分块策略 | `TextChunker` |
| Reranker | 自定义重排序器 | `Reranker` |

---

## 安全架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        安全层次                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 网络层: TLS 加密、网络策略、服务网格                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 认证层: JWT Token、API Key、OAuth2                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 授权层: RBAC、资源级权限、操作审计                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 数据层: 加密存储、敏感数据脱敏、密钥管理                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 技能沙箱: CPU 10s / 内存 512MB / 网络隔离 / 权限声明   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 文件操作: 路径遍历保护、目录白名单、只读/读写权限控制  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 可观测性

### OpenTelemetry 集成

ResolveAgent 全面集成 OpenTelemetry，提供三大支柱：

| 类型 | 工具 | 用途 |
|------|------|------|
| **Metrics** | Prometheus | 系统指标、业务指标 |
| **Logs** | Loki | 结构化日志聚合 |
| **Traces** | Jaeger/Tempo | 分布式链路追踪 |

### 关键指标

```
# Agent 执行指标
resolveagent_agent_executions_total          # 执行总数
resolveagent_agent_execution_duration_seconds # 执行耗时
resolveagent_agent_execution_errors_total     # 错误数

# 选择器指标
resolveagent_selector_decisions_total         # 决策总数
resolveagent_selector_decision_latency_seconds # 决策延迟
resolveagent_selector_confidence_histogram    # 置信度分布
resolveagent_selector_cache_hit_rate          # 缓存命中率

# 技能指标
resolveagent_skill_invocations_total          # 调用总数
resolveagent_skill_duration_seconds           # 执行时长
resolveagent_skill_sandbox_violations_total   # 沙箱违规数

# RAG 指标
resolveagent_rag_queries_total                # 查询总数
resolveagent_rag_retrieval_latency_seconds   # 检索延迟
resolveagent_rag_rerank_tier_used            # 重排序层级使用分布

# 代码分析指标
resolveagent_code_analysis_runs_total        # 分析运行总数 (by type: static/traffic)
resolveagent_code_analysis_duration_seconds  # 分析耗时
resolveagent_call_graph_nodes_total          # 调用图节点总数
resolveagent_call_graph_edges_total          # 调用图边总数
resolveagent_traffic_captures_total          # 流量捕获会话数
resolveagent_traffic_graph_builds_total      # 流量图谱构建数
resolveagent_rag_dual_write_total            # RAG 双写次数 (by collection, status)
```

---

## 相关文档

- [智能选择器](./intelligent-selector.md) - 深入了解路由机制、六种路由类型、适配器架构、代码分析意图模式
- [FTA 工作流引擎](./fta-engine.md) - 故障树分析详解
- [技能系统](./skill-system.md) - 技能开发与管理
- [RAG 管道](./rag-pipeline.md) - 检索增强生成管道详解
- [AgentScope 与 Higress 集成](./agentscope-higress-integration.md) - 网关集成、代码分析 API 端点、数据流
- [部署指南](./deployment.md) - 生产环境部署
- [配置参考](./configuration.md) - 完整配置选项
