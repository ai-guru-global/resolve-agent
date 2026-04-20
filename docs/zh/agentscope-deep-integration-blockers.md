# AgentScope + Higress 深度融合技术卡点与集成路径分析

> 评估日期：2026-04-17
> 分析范围：ResolveAgent 全栈 × AgentScope 2.0 × Higress AI Gateway
> 目标：识别所有技术卡点，给出逐一攻破方案，实现三者深度融合创新

---

## 目录

1. [卡点一：Higress LLM 路由 vs AgentScope 直连模型](#卡点一higress-llm-路由-vs-agentscope-直连模型)
2. [卡点二：IntelligentSelector vs AgentScope 编排模型](#卡点二intelligentselector-vs-agentscope-编排模型)
3. [卡点三：架构差异全面对比](#卡点三架构差异全面对比)
4. [卡点四：消息体系不兼容](#卡点四消息体系不兼容)
5. [卡点五：Go-Python 双层架构 vs AgentScope 纯 Python](#卡点五go-python-双层架构-vs-agentscope-纯-python)
6. [卡点六：SSE 流式协议差异](#卡点六sse-流式协议差异)
7. [卡点七：记忆系统双轨制](#卡点七记忆系统双轨制)
8. [深度融合路径：三阶段攻破方案](#深度融合路径三阶段攻破方案)
9. [创新点：ResolveAgent 可贡献给 AgentScope 生态的独特能力](#创新点resolveagent-可贡献给-agentscope-生态的独特能力)

---

## 卡点一：Higress LLM 路由 vs AgentScope 直连模型

### 冲突本质

这是**最核心的架构冲突**。ResolveAgent 要求所有 LLM 调用经过 Higress 网关统一管理；AgentScope 的 Model 体系（`DashScopeChatModel`、`OpenAIChatModel` 等）默认直连 LLM 提供商。

```
ResolveAgent 现有链路                     AgentScope 默认链路
━━━━━━━━━━━━━━━━━━━━━━━                   ━━━━━━━━━━━━━━━━━━━━━
MegaAgent                                 ReActAgent
  ↓ create_llm_provider()                   ↓ self.model(...)
  ↓                                         ↓
HigressLLMProvider                        DashScopeChatModel
  ↓ _get_model_endpoint()                   ↓ 直连 DashScope API
  ↓ 查询 Go Registry                       ↓
  ↓ 拼接 gateway_url + endpoint             ↓
  ↓                                         ↓
Higress AI 网关                            https://dashscope.aliyuncs.com
  ├── 认证 (JWT)                            (无集中管控)
  ├── 限流 (Token/请求)
  ├── 故障转移
  ├── 模型路由
  └── 负载均衡
  ↓
实际 LLM 提供商
```

### 具体冲突点

| 维度 | ResolveAgent (Higress) | AgentScope (直连) | 冲突描述 |
|------|----------------------|-------------------|---------|
| **请求路径** | `HigressLLMProvider` → Go Registry → Higress → LLM | `Model.__call__()` → 直连 API | AgentScope 绕过网关，丧失限流/监控/路由 |
| **认证方式** | Higress 统一 Bearer Token (`RESOLVEAGENT_API_KEY`) | 每个 Model 类自带 `api_key` 参数 | 密钥分散在两套体系 |
| **模型发现** | Go Registry 动态注册，`get_model_route()` 查询端点 | 硬编码 `model_name` 和 `api_key` | AgentScope 无法利用 Registry 动态路由 |
| **故障转移** | Higress 自动 failover 到备用模型 | 无 | 失去高可用保障 |
| **流量计费** | Higress 集中 Token 计量 | 无 | 失去统一计费能力 |
| **流式响应** | `chat_stream()` → Higress SSE | `model.stream=True` → 直连 SSE | 两套独立的流式处理链 |

### 攻破方案：HigressChatModel 适配器

**核心思路**：实现一个 AgentScope 的自定义 Model 类，内部委托给 `HigressLLMProvider`，让 AgentScope 的 Agent 透明地通过 Higress 网关调用 LLM。

```python
# python/src/resolveagent/bridge/agentscope_model.py

from agentscope.model import ModelWrapperBase, ModelResponse
from agentscope.message import Msg
from resolveagent.llm.higress_provider import HigressLLMProvider, create_llm_provider
from resolveagent.llm.provider import ChatMessage
import asyncio


class HigressChatModel(ModelWrapperBase):
    """AgentScope Model 适配器，将所有 LLM 调用路由到 Higress 网关。

    这是解决 AgentScope 直连 vs Higress 网关路由冲突的关键桥接组件。
    在 AgentScope 看来，这就是一个普通的 Model；
    在 Higress 看来，这就是一个普通的 HTTP 客户端。

    用法:
        agent = ReActAgent(
            name="resolver",
            model=HigressChatModel(
                model_name="qwen-plus",
                gateway_url="http://localhost:8888",
            ),
            ...
        )
    """

    model_type: str = "higress_chat"

    def __init__(
        self,
        config_name: str = "higress",
        model_name: str = "qwen-plus",
        gateway_url: str | None = None,
        stream: bool = True,
        **kwargs,
    ):
        super().__init__(config_name=config_name, model_name=model_name, **kwargs)
        self._provider = create_llm_provider(
            gateway_url=gateway_url,
            model=model_name,
        )
        self._stream = stream

    def __call__(self, messages: list, **kwargs) -> ModelResponse:
        """AgentScope 的调用入口，内部委托给 HigressLLMProvider。"""
        # 将 AgentScope Msg 格式转换为 ResolveAgent ChatMessage 格式
        chat_messages = []
        for msg in messages:
            if isinstance(msg, Msg):
                chat_messages.append(ChatMessage(
                    role=msg.role,
                    content=msg.get_text_content(),
                ))
            elif isinstance(msg, dict):
                chat_messages.append(ChatMessage(
                    role=msg.get("role", "user"),
                    content=msg.get("content", ""),
                ))

        # 调用 Higress 路由的 LLM
        loop = asyncio.get_event_loop()
        response = loop.run_until_complete(
            self._provider.chat(
                messages=chat_messages,
                model=self.model_name,
                **kwargs,
            )
        )

        # 转换为 AgentScope ModelResponse
        return ModelResponse(
            text=response.content,
            raw={
                "model": response.model,
                "usage": response.usage,
                "finish_reason": response.finish_reason,
            },
        )

    async def async_call(self, messages: list, **kwargs) -> ModelResponse:
        """异步版本，在 AgentScope 2.0 的 async agent 中使用。"""
        chat_messages = self._convert_messages(messages)
        response = await self._provider.chat(
            messages=chat_messages,
            model=self.model_name,
            **kwargs,
        )
        return ModelResponse(
            text=response.content,
            raw={"model": response.model, "usage": response.usage},
        )

    def _convert_messages(self, messages: list) -> list[ChatMessage]:
        """Msg/dict → ChatMessage 统一转换。"""
        result = []
        for msg in messages:
            if isinstance(msg, Msg):
                result.append(ChatMessage(role=msg.role, content=msg.get_text_content()))
            elif isinstance(msg, dict):
                result.append(ChatMessage(role=msg.get("role", "user"), content=msg.get("content", "")))
        return result
```

**关键设计**：
- 继承 `ModelWrapperBase` 满足 AgentScope 的 Model 接口规范
- 内部使用 `create_llm_provider()` 工厂，自动判断 Higress/直连模式
- 支持同步 `__call__` 和异步 `async_call` 两种调用方式
- Go Registry 的模型路由发现能力通过 `HigressLLMProvider._get_model_endpoint()` 透传

---

## 卡点二：IntelligentSelector vs AgentScope 编排模型

### 冲突本质

ResolveAgent 的核心差异化能力——IntelligentSelector 三阶段路由——在 AgentScope 框架中**没有对等概念**。

```
ResolveAgent: 请求驱动的智能路由
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
用户输入 → IntentAnalyzer(单次遍历)
         → ContextEnricher(并行查询注册表)
         → RouteDecision(规则/LLM/混合)
         → 分发到 FTA | Skill | RAG | CodeAnalysis | Direct

AgentScope: Agent 驱动的工具调用
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
用户输入 → ReActAgent.reply()
         → LLM 思考 (Thought)
         → 选择工具 (Action)
         → 执行工具 (Observation)
         → 循环直到 Final Answer
```

### 根本差异

| 维度 | IntelligentSelector | AgentScope ReAct | 差异分析 |
|------|--------------------|-----------------|---------| 
| **路由策略** | 规则 + LLM + 缓存混合 | 纯 LLM ReAct 循环 | Selector 有确定性规则快速路径 |
| **决策粒度** | 6 种路由类型（workflow/skill/rag/code/direct/multi） | 工具级粒度 | Selector 是子系统级路由 |
| **缓存机制** | SHA-256 LRU 缓存（1000 条，300s TTL） | 无 | Selector 避免重复 LLM 调用 |
| **多意图检测** | top-2 差距 < 0.15 → MULTI | 逐步 ReAct | Selector 一次识别多意图 |
| **上下文增强** | 并行查询 3 个注册表 + 记忆 | 工具调用获取信息 | Selector 预加载上下文 |
| **置信度系统** | 0-1 置信度 + 自适应加成 | 无置信度 | Selector 有量化决策质量 |

### 为什么不能简单替换

IntelligentSelector 的设计哲学是"**一次路由，精准分发**"——在请求入口用最小代价做出最优路由决策，然后交给专门的子系统执行。AgentScope 的 ReAct 模式是"**边思考边执行**"——LLM 在执行过程中动态决定下一步。

**两者解决的是不同层次的问题**：
- IntelligentSelector 解决的是"这个请求应该由哪个子系统处理"
- ReAct Agent 解决的是"在某个子系统内如何步步执行"

### 攻破方案：Selector 作为 AgentScope 的 Meta-Tool

**核心思路**：将 IntelligentSelector 封装为 AgentScope Toolkit 中的一个"元工具"（Meta-Tool），让 ReAct Agent 可以调用 Selector 来获取路由建议，同时保留 Selector 的所有高级能力。

```python
# python/src/resolveagent/bridge/selector_tool.py

from agentscope.tool import Toolkit, ToolFunction
from resolveagent.selector.selector import IntelligentSelector, RouteDecision


def create_selector_toolkit(
    selector: IntelligentSelector,
) -> Toolkit:
    """将 IntelligentSelector 封装为 AgentScope Toolkit。

    提供两个工具：
    1. route_request: 调用 Selector 获取路由建议
    2. execute_route: 执行 Selector 的路由决策
    """
    toolkit = Toolkit()

    @toolkit.register_tool_function
    async def route_request(
        user_input: str,
        agent_id: str = "default",
    ) -> dict:
        """分析用户请求意图并给出路由建议。

        Args:
            user_input: 用户的原始输入文本。
            agent_id: 当前 Agent 的 ID。

        Returns:
            路由决策，包含 route_type, route_target, confidence, reasoning。
        """
        decision = await selector.route(
            input_text=user_input,
            agent_id=agent_id,
        )
        return {
            "route_type": decision.route_type,
            "route_target": decision.route_target,
            "confidence": decision.confidence,
            "reasoning": decision.reasoning,
            "parameters": decision.parameters,
        }

    @toolkit.register_tool_function
    async def execute_subsystem(
        route_type: str,
        route_target: str,
        user_input: str,
        parameters: dict | None = None,
    ) -> str:
        """根据路由决策执行对应的子系统。

        Args:
            route_type: 路由类型 (workflow/skill/rag/code_analysis/direct)。
            route_target: 具体目标 (技能名/工作流名/集合名)。
            user_input: 用户输入。
            parameters: 额外参数。

        Returns:
            子系统执行结果。
        """
        # 委托给 MegaAgent 的子系统执行方法
        decision = RouteDecision(
            route_type=route_type,
            route_target=route_target,
            parameters=parameters or {},
        )
        # ... 实际执行逻辑
        return "执行结果"

    return toolkit
```

**融合后的执行模型**：

```
用户输入
    ↓
AgentScope ReActAgent
    ↓ LLM Thought: "用户想排查故障，需要先路由"
    ↓ Action: route_request(user_input="生产环境报错...")
    ↓
IntelligentSelector (3 阶段)
    ├── IntentAnalyzer: workflow (0.85)
    ├── ContextEnricher: 并行查询注册表
    └── RouteDecision: workflow → "k8s-pod-crash"
    ↓
ReActAgent 收到路由建议
    ↓ Action: execute_subsystem("workflow", "k8s-pod-crash", ...)
    ↓
FTA 引擎执行故障树分析
    ↓ Observation: 分析结果
    ↓
ReActAgent 可继续推理
    ↓ 可能再调用 RAG 补充知识
    ↓ Final Answer
```

**融合优势**：
- 保留 IntelligentSelector 的确定性路由优势（缓存、规则快速路径）
- 获得 ReAct Agent 的灵活推理能力（循环、多步、自适应）
- IntelligentSelector 的路由建议可被 Agent 选择性采纳或忽略

---

## 卡点三：架构差异全面对比

### 分层架构对比

```
ResolveAgent 现有架构                      AgentScope 标准架构
━━━━━━━━━━━━━━━━━━━━━                      ━━━━━━━━━━━━━━━━━━━

┌──────────────────────┐                   ┌──────────────────────┐
│  Higress AI Gateway  │ ← 外部入口        │    无对应概念         │
│  认证/限流/路由       │                   │                      │
└──────────┬───────────┘                   └──────────────────────┘
           │
┌──────────┴───────────┐                   ┌──────────────────────┐
│  Go Platform (8080)  │ ← 注册表/API      │    无对应概念         │
│  12 大 Registry      │                   │  (AgentScope 无      │
│  PostgreSQL/Redis    │                   │   外部注册表)         │
│  事件总线 (NATS)     │                   │                      │
└──────────┬───────────┘                   └──────────────────────┘
           │ HTTP+SSE
┌──────────┴───────────┐                   ┌──────────────────────┐
│  Python Runtime      │                   │  Python 进程          │
│  ┌────────────────┐  │                   │  ┌────────────────┐  │
│  │ ExecutionEngine │  │                   │  │ ReActAgent     │  │
│  │ MegaAgent       │  │  对应关系 ───────→ │  │ (自含 Model,  │  │
│  │ Selector        │  │                   │  │  Memory, Tool) │  │
│  │ FTA/Skill/RAG   │  │                   │  └────────────────┘  │
│  └────────────────┘  │                   │  ┌────────────────┐  │
│                      │                   │  │ MsgHub/Pipeline │  │
│  LLM → Higress      │  对应关系 ───────→ │  │ Model(直连LLM) │  │
│  Memory → Go API     │                   │  │ Memory(进程内)  │  │
└──────────────────────┘                   └──────────────────────┘
```

### 组件级对应关系

| ResolveAgent 组件 | AgentScope 对应 | 差异说明 | 融合策略 |
|-------------------|----------------|---------|---------|
| `BaseAgent` | `agentscope.agent.AgentBase` | RA 未实际继承 | 重构继承 AgentBase |
| `MegaAgent` | `ReActAgent` | RA 有 Selector；AS 有 ReAct 循环 | MegaAgent 继承 AgentBase，内嵌 Selector |
| `ExecutionEngine` | 无 | RA 独有的多 Agent 池管理和 SSE | 保留，作为 AgentScope 外层壳 |
| `IntelligentSelector` | 无 | RA 独有 | 封装为 AgentScope Tool |
| `HigressLLMProvider` | `DashScopeChatModel` | 路由方式不同 | 实现 `HigressChatModel` |
| `MemoryManager` | `InMemoryMemory` | RA 有 Go 持久化；AS 有压缩 | 混合使用 |
| `SkillExecutor` | `Toolkit` | 接口相似 | 适配为 Toolkit |
| `FTAEngine` | 无 | RA 独有 | 封装为 AgentScope Tool |
| `RAGPipeline` | 无内置 RAG | RA 独有完整管道 | 封装为 AgentScope Tool |
| `HookRunner` | 无 | RA 独有生命周期钩子 | 映射到 AgentScope 事件系统 |
| Go Registry | 无 | RA 独有 | 保留，AS 通过 RegistryClient 查询 |
| SSE 流式 | `stream=True` | 协议不同 | 适配层转换 |
| NATS 事件总线 | 无 | RA 独有 | 保留 |

### 核心差异总结

**ResolveAgent 独有而 AgentScope 缺失的**：
1. Go 平台作为"单一真相源"的注册表体系
2. Higress 网关统一的 LLM 流量管控
3. IntelligentSelector 混合路由决策
4. FTA 故障树分析引擎
5. 代码分析引擎（静态 AST + 动态流量）
6. Go-Python HTTP+SSE 双层通信
7. 生命周期 Hook 系统

**AgentScope 独有而 ResolveAgent 缺失的**：
1. ReAct Agent 自主推理循环
2. MCP/A2A 协议支持
3. MsgHub 多 Agent 消息广播
4. 记忆压缩和 SQLite 持久化
5. Agentic RL（强化学习微调）
6. 实时语音 Agent
7. AgentScope Studio（可视化调试）

---

## 卡点四：消息体系不兼容

### 消息格式对比

```python
# ResolveAgent 消息格式 (dict)
message = {
    "role": "user",
    "content": "帮我分析故障",
    "metadata": {"source": "web", "conversation_id": "abc"},
}

# AgentScope 消息格式 (Msg)
from agentscope.message import Msg
message = Msg(
    name="user",
    role="user",
    content="帮我分析故障",
    metadata={"source": "web"},
)
# Msg 还支持:
#   msg.get_text_content()  → 提取纯文本
#   msg.to_dict()           → 转为 dict
#   msg.url                 → 多模态资源 URL
```

### 冲突点

| 场景 | ResolveAgent 格式 | AgentScope 格式 | 冲突 |
|------|-------------------|----------------|------|
| Agent 输入 | `dict: {"role", "content"}` | `Msg` 对象 | 类型不兼容 |
| Agent 输出 | `dict: {"role", "content", "metadata"}` | `Msg` 对象 | 需双向转换 |
| ExecutionEngine SSE | `dict: {"type", "event"/"content"}` | 无对应 | RA 独有协议 |
| 会话历史 | `list[dict]` | `list[Msg]` | 需遍历转换 |
| LLM 调用 | `ChatMessage(role, content)` | OpenAI 格式 dict | 接近但不同 |

### 攻破方案：双向消息适配器

```python
# python/src/resolveagent/bridge/message_adapter.py

from agentscope.message import Msg
from resolveagent.llm.provider import ChatMessage


class MessageAdapter:
    """ResolveAgent ↔ AgentScope 消息双向转换器。"""

    @staticmethod
    def dict_to_msg(d: dict) -> Msg:
        """ResolveAgent dict → AgentScope Msg"""
        return Msg(
            name=d.get("name", d.get("role", "unknown")),
            role=d.get("role", "user"),
            content=d.get("content", ""),
            metadata=d.get("metadata", {}),
        )

    @staticmethod
    def msg_to_dict(msg: Msg) -> dict:
        """AgentScope Msg → ResolveAgent dict"""
        return {
            "role": msg.role,
            "content": msg.get_text_content(),
            "metadata": getattr(msg, "metadata", {}),
            "name": msg.name,
        }

    @staticmethod
    def chat_messages_to_msgs(messages: list[ChatMessage]) -> list[Msg]:
        """ChatMessage 列表 → Msg 列表"""
        return [
            Msg(name=m.role, role=m.role, content=m.content)
            for m in messages
        ]

    @staticmethod
    def msgs_to_chat_messages(msgs: list[Msg]) -> list[ChatMessage]:
        """Msg 列表 → ChatMessage 列表"""
        return [
            ChatMessage(role=m.role, content=m.get_text_content())
            for m in msgs
        ]
```

---

## 卡点五：Go-Python 双层架构 vs AgentScope 纯 Python

### 冲突本质

ResolveAgent 是 **Go（平台）+ Python（运行时）** 的微服务架构；AgentScope 是 **纯 Python 单进程** 架构。这导致：

1. **Agent 生命周期管理不同**：Go 平台通过 `RuntimeClient` 远程调用 Python 创建/执行 Agent；AgentScope Agent 在同一进程内直接实例化
2. **状态管理分离**：Go 注册表持有 Agent 定义和状态；AgentScope Agent 自持状态
3. **资源发现路径不同**：Go Registry REST API → RegistryClient → Python；AgentScope 本地配置或 MCP

### 通信链路

```
现有链路 (Go → Python):
  客户端 → Go HTTP :8080 → RuntimeClient.ExecuteAgent()
         → POST Python :9091/v1/agents/{id}/execute
         → ExecutionEngine.execute() → MegaAgent.reply()
         → SSE 流式返回给 Go → SSE 返回给客户端

AgentScope 链路:
  客户端 → Python 进程 → agent(msg)
         → 直接返回 Msg
```

### 攻破方案：AgentScope 作为 ExecutionEngine 内部框架

**核心思路**：不改变 Go-Python 通信链路，而是在 Python ExecutionEngine 内部使用 AgentScope 构建 Agent。Go 平台仍作为外层协调器。

```
融合后链路:
  客户端 → Go HTTP :8080 → RuntimeClient.ExecuteAgent()
         → POST Python :9091/v1/agents/{id}/execute
         → ExecutionEngine.execute()
             ↓
         → AgentScopeBridge.create_agent(agent_config)
             → 使用 Go Registry 配置创建 AgentScope ReActAgent
             → 注入 HigressChatModel
             → 注入 SelectorToolkit
             → 注入 FTA/Skill/RAG 工具
             ↓
         → agent(Msg("user", input_text))
             → ReAct 循环 (可调用 Selector/FTA/Skill/RAG)
             ↓
         → SSE 事件流式返回给 Go
```

---

## 卡点六：SSE 流式协议差异

### 冲突本质

ResolveAgent 使用自定义 SSE 事件协议在 Go-Python 间传输执行过程；AgentScope 使用 `stream=True` 的 LLM 直连流式。

```python
# ResolveAgent SSE 事件格式 (engine.py)
yield {"type": "event", "event": {"type": "selector.started", ...}}
yield {"type": "event", "event": {"type": "selector.completed", ...}}
yield {"type": "content_chunk", "content": "部分回复...", ...}
yield {"type": "content", "content": "完整回复", ...}
yield {"type": "event", "event": {"type": "execution.completed", ...}}

# AgentScope 流式 (model stream=True)
# 直接通过 model 的 stream 属性输出，无中间 SSE 层
async for chunk in agent(msg):
    print(chunk)  # 直接是 str 或 Msg
```

### 攻破方案：SSE 包装层

```python
# python/src/resolveagent/bridge/sse_wrapper.py

async def agentscope_to_sse(
    agent,
    msg: Msg,
    execution_id: str,
) -> AsyncIterator[dict]:
    """将 AgentScope Agent 的执行结果包装为 ResolveAgent SSE 事件流。"""

    yield {"type": "event", "event": {
        "type": "execution.started",
        "data": {"execution_id": execution_id},
    }}

    try:
        result = await agent(msg)

        # 如果是流式输出
        if hasattr(result, '__aiter__'):
            async for chunk in result:
                yield {"type": "content_chunk", "content": str(chunk)}
        else:
            yield {"type": "content", "content": result.get_text_content()}

    except Exception as e:
        yield {"type": "event", "event": {
            "type": "execution.failed",
            "data": {"error": str(e)},
        }}
        return

    yield {"type": "event", "event": {
        "type": "execution.completed",
        "data": {"execution_id": execution_id},
    }}
```

---

## 卡点七：记忆系统双轨制

### 冲突本质

ResolveAgent 记忆通过 Go 平台 REST API 持久化到 PostgreSQL；AgentScope 2.0 新增了 `InMemoryMemory` + SQLite 持久化 + 记忆压缩。

| 维度 | ResolveAgent Memory | AgentScope Memory |
|------|--------------------|--------------------|
| 短期存储 | Go REST → PostgreSQL | InMemoryMemory (进程内) |
| 长期存储 | Go REST → PostgreSQL | SQLite (本地文件) |
| 压缩 | 无 | 有（2026-01 新增） |
| 向量搜索 | 无（仅 importance 排序） | 无（但可集成 ReMe） |
| API 接口 | HTTP REST (10 端点) | Python 对象方法 |

### 攻破方案：PostgresMemory 适配器

```python
# python/src/resolveagent/bridge/agentscope_memory.py

from agentscope.memory import MemoryBase
from agentscope.message import Msg
from resolveagent.store.memory_client import MemoryClient


class HigressPersistentMemory(MemoryBase):
    """AgentScope Memory 适配器，通过 Go 平台持久化到 PostgreSQL。

    兼容 AgentScope 的 Memory 接口，同时利用 Go 平台的
    记忆管理能力（TTL、importance、access_count）。
    """

    def __init__(self, agent_id: str, conversation_id: str = ""):
        super().__init__()
        self._client = MemoryClient()
        self._agent_id = agent_id
        self._conversation_id = conversation_id
        self._local_buffer: list[Msg] = []  # 本地缓存

    async def add(self, msg: Msg) -> None:
        """添加消息到记忆。"""
        self._local_buffer.append(msg)
        # 异步持久化到 Go 平台
        await self._client.add_message(
            self._conversation_id,
            {
                "agent_id": self._agent_id,
                "role": msg.role,
                "content": msg.get_text_content(),
                "sequence_num": len(self._local_buffer),
            },
        )

    def get_memory(self, recent_n: int | None = None) -> list[Msg]:
        """获取记忆。"""
        if recent_n:
            return self._local_buffer[-recent_n:]
        return list(self._local_buffer)

    # ... 其他 MemoryBase 接口方法
```

---

## 深度融合路径：三阶段攻破方案

### 阶段一：桥接层（3 周）— 建立兼容基础

**目标**：在不破坏现有架构的前提下，建立 ResolveAgent ↔ AgentScope 的双向桥接。

```
新增 bridge/ 目录结构:
python/src/resolveagent/bridge/
├── __init__.py
├── agentscope_model.py      # HigressChatModel (卡点一)
├── message_adapter.py       # Msg ↔ dict 转换 (卡点四)
├── selector_tool.py         # Selector 封装为 Tool (卡点二)
├── subsystem_tools.py       # FTA/Skill/RAG 封装为 Tool
├── agentscope_memory.py     # Memory 适配 (卡点七)
├── sse_wrapper.py           # SSE 包装 (卡点六)
└── agent_factory.py         # 从 Go Registry 创建 AS Agent
```

**交付物**：
1. `HigressChatModel` — 让 AgentScope Agent 通过 Higress 调用 LLM
2. `MessageAdapter` — 双向消息转换
3. `create_selector_toolkit()` — Selector 作为 AgentScope Tool
4. 单元测试验证所有适配器

### 阶段二：Agent 重构（4 周）— 核心 Agent 迁入 AgentScope

**目标**：将 MegaAgent 重构为基于 AgentScope 的 Agent，同时保留所有自研能力。

```python
# python/src/resolveagent/agent/mega_v2.py

from agentscope.agent import ReActAgent
from agentscope.tool import Toolkit
from resolveagent.bridge.agentscope_model import HigressChatModel
from resolveagent.bridge.agentscope_memory import HigressPersistentMemory
from resolveagent.bridge.selector_tool import create_selector_toolkit
from resolveagent.bridge.subsystem_tools import (
    create_fta_tool,
    create_rag_tool,
    create_skill_tool,
    create_code_analysis_tool,
)


class MegaAgentV2:
    """基于 AgentScope 重构的 MegaAgent。

    融合策略:
    - AgentScope ReActAgent 作为推理引擎
    - IntelligentSelector 作为元工具提供路由建议
    - FTA/Skill/RAG/CodeAnalysis 作为可调用工具
    - HigressChatModel 确保 LLM 通过网关
    - HigressPersistentMemory 确保记忆持久化
    """

    def __init__(
        self,
        name: str,
        model_name: str = "qwen-plus",
        system_prompt: str = "",
        selector_strategy: str = "hybrid",
    ):
        # 构建 Toolkit
        toolkit = Toolkit()

        # 注入 IntelligentSelector 作为元工具
        selector_tools = create_selector_toolkit(strategy=selector_strategy)
        toolkit.merge(selector_tools)

        # 注入子系统工具
        toolkit.merge(create_fta_tool())
        toolkit.merge(create_rag_tool())
        toolkit.merge(create_skill_tool())
        toolkit.merge(create_code_analysis_tool())

        # 创建 AgentScope ReActAgent
        self._agent = ReActAgent(
            name=name,
            sys_prompt=system_prompt or "你是 ResolveAgent 智能诊断助手。",
            model=HigressChatModel(model_name=model_name),
            memory=HigressPersistentMemory(agent_id=name),
            toolkit=toolkit,
        )

    async def reply(self, message: dict) -> dict:
        """兼容旧接口的回复方法。"""
        from agentscope.message import Msg
        from resolveagent.bridge.message_adapter import MessageAdapter

        msg = MessageAdapter.dict_to_msg(message)
        result = await self._agent(msg)
        return MessageAdapter.msg_to_dict(result)
```

**关键变更**：

| 组件 | 现有实现 | 融合后实现 | 变更程度 |
|------|---------|-----------|---------|
| `BaseAgent` | 自研空壳 | 删除，用 `AgentBase` | 重写 |
| `MegaAgent` | 自研 Selector + 分发 | `MegaAgentV2` 包装 `ReActAgent` | 重写 |
| `ExecutionEngine` | 自研 Agent 池 + SSE | 保留，内部使用 `MegaAgentV2` | 小改 |
| `IntelligentSelector` | 自研 3 阶段 | 保留，封装为 Tool | 不变 |
| `FTA/Skill/RAG` | MegaAgent 内部方法 | 独立 Tool 函数 | 重构为工具 |

### 阶段三：生态融入（3 周）— 引入 AgentScope 高级能力

**目标**：利用 AgentScope 生态引入 ResolveAgent 缺失的能力。

| 引入能力 | AgentScope 组件 | 集成方式 |
|---------|-----------------|---------|
| MCP 工具协议 | `agentscope.mcp.HttpStatelessClient` | 作为 Toolkit 工具注册 |
| A2A Agent 互操作 | `agentscope.a2a` | 跨平台 Agent 通信 |
| 多 Agent 协作 | `MsgHub` + `sequential_pipeline` | 替换 `_execute_multi()` |
| 记忆压缩 | `agentscope.memory` 压缩模块 | 集成到 HigressPersistentMemory |
| Agentic RL | Trinity-RFT 集成 | 微调 Selector 路由准确性 |
| 可视化调试 | AgentScope Studio | 开发环境辅助 |

### 融合后的完整架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端层                                    │
│  CLI/TUI (Go)  │  WebUI (React)  │  外部 A2A Agent              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Higress AI Gateway (保留)                        │
│  认证 │ 限流 │ 模型路由 │ 负载均衡 │ 故障转移                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                Go Platform (保留，单一真相源)                      │
│  12 大 Registry │ PostgreSQL │ NATS │ RuntimeClient              │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP+SSE
┌───────────────────────────┴─────────────────────────────────────┐
│              Python Runtime (深度融合 AgentScope)                  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ExecutionEngine (保留，作为外层编排器)                        │ │
│  │  ├── 从 Go Registry 加载 Agent 配置                          │ │
│  │  ├── 创建 MegaAgentV2 (AgentScope ReActAgent)               │ │
│  │  ├── SSE 事件流管理                                          │ │
│  │  └── 生命周期 Hook                                           │ │
│  └──────────────────────┬──────────────────────────────────────┘ │
│                          │                                        │
│  ┌──────────────────────┴──────────────────────────────────────┐ │
│  │ MegaAgentV2 = AgentScope ReActAgent                          │ │
│  │  ├── Model: HigressChatModel (→ Higress 网关)               │ │
│  │  ├── Memory: HigressPersistentMemory (→ Go PostgreSQL)      │ │
│  │  ├── Toolkit:                                                │ │
│  │  │   ├── route_request (IntelligentSelector)                │ │
│  │  │   ├── execute_fta (FTA 引擎)                             │ │
│  │  │   ├── execute_skill (技能执行器)                          │ │
│  │  │   ├── query_rag (RAG 管道)                               │ │
│  │  │   ├── analyze_code (代码分析引擎)                         │ │
│  │  │   └── MCP 外部工具 (通过 agentscope.mcp)                 │ │
│  │  └── Formatter: AgentScope Formatter                         │ │
│  └──────────────────────┬──────────────────────────────────────┘ │
│                          │                                        │
│  ┌──────────────────────┴──────────────────────────────────────┐ │
│  │ AgentScope 生态能力                                           │ │
│  │  ├── MsgHub (多 Agent 协作)                                  │ │
│  │  ├── A2A Protocol (跨平台互操作)                             │ │
│  │  ├── Agentic RL (强化学习微调)                               │ │
│  │  └── AgentScope Studio (可视化调试)                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 创新点：ResolveAgent 可贡献给 AgentScope 生态的独特能力

深度融合不仅仅是 ResolveAgent 使用 AgentScope，反过来 ResolveAgent 的独特能力也能反哺 AgentScope 生态：

| 创新点 | 贡献内容 | AgentScope 社区价值 |
|--------|---------|-------------------|
| **Higress Gateway Model** | `HigressChatModel` 作为 AgentScope 官方网关模型 | 为企业用户提供统一 LLM 流量管控 |
| **IntelligentSelector Tool** | 三阶段智能路由作为 AgentScope 高级 Tool | 比纯 ReAct 更高效的子系统路由 |
| **FTA Engine Tool** | 故障树分析作为 AgentScope AIOps Tool | 拓展 AgentScope 的运维场景 |
| **Go Registry Bridge** | 外部注册表集成范式 | 企业级服务发现和配置管理 |
| **SSE Streaming Bridge** | AgentScope ↔ Go 微服务流式通信 | 跨语言 Agent 协作方案 |

### 潜在的开源贡献路径

1. 向 AgentScope 仓库提交 `HigressChatModel` 作为官方 Model 扩展
2. 向 Higress 社区提交 "AgentScope Agent 最佳实践" 文档
3. 以 ResolveAgent 作为 "AgentScope + Higress 企业级 AIOps" 参考实现

---

## 工期与风险总结

| 阶段 | 工期 | 风险 | 关键里程碑 |
|------|------|------|-----------|
| 阶段一：桥接层 | 3 周 | 低 | HigressChatModel 可用 + Selector Tool 可用 |
| 阶段二：Agent 重构 | 4 周 | 中 | MegaAgentV2 替换 MegaAgent + 全回归通过 |
| 阶段三：生态融入 | 3 周 | 中 | MCP 可用 + A2A 可用 + RL 原型验证 |
| **总计** | **10 周** | | **完整深度融合交付** |

**最大风险**：AgentScope 2.0 API 稳定性（2026-04 路线图显示即将发布），建议在桥接层做好版本抽象，隔离 API 变化影响。
