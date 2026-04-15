# 智能选择器 (Intelligent Selector)

智能选择器是 ResolveAgent 的核心组件，作为 LLM 驱动的元路由器，动态决定每个请求的最佳执行路径。

---

## 概述

### 什么是智能选择器？

智能选择器是一个**意图感知的请求路由系统**，它能够：

1. **分析用户意图** - 理解用户真正想要什么
2. **评估可用能力** - 检查哪些技能、工作流、知识库可用
3. **做出最优决策** - 选择最合适的执行路径

### 为什么需要智能选择器？

传统 AI Agent 系统的问题：

| 问题 | 传统方案 | ResolveAgent 方案 |
|------|----------|-----------------|
| 固定流程 | 预定义处理管道 | 动态路由决策 |
| 缺乏灵活性 | 硬编码条件判断 | LLM + 规则混合 |
| 扩展困难 | 修改核心代码 | 声明式能力注册 |
| 意图误判 | 关键词匹配 | 语义理解 + 上下文 |

---

## 路由策略

智能选择器支持三种路由策略：

### 1. 规则策略 (Rule-based)

基于模式匹配的快速路由，适用于明确的请求类型。

```yaml
# 规则配置示例
selector:
  strategy: rule
  rules:
    - pattern: "搜索|查找|查询"
      route_type: skill
      target: web-search
      confidence: 0.9
      
    - pattern: "分析日志|查看错误"
      route_type: skill
      target: log-analyzer
      confidence: 0.85
      
    - pattern: "故障|问题|诊断"
      route_type: fta
      target: incident-diagnosis
      confidence: 0.8
      
    - pattern: "文档|知识库|手册"
      route_type: rag
      target: knowledge-base
      confidence: 0.85
```

**优点**：
- 速度快，无 LLM 调用开销
- 可预测性强
- 易于调试

**缺点**：
- 覆盖有限，需要预定义模式
- 无法处理复杂/模糊意图

### 2. LLM 策略 (LLM-based)

使用 LLM 进行意图分类和路由决策。

```python
class LLMStrategy:
    """LLM 驱动的路由策略"""
    
    SYSTEM_PROMPT = """
    你是一个智能路由器。根据用户输入，决定使用哪种执行方式：
    
    可选路由类型：
    - fta: 复杂的多步骤故障诊断或决策流程
    - skill: 单一功能调用（搜索、计算、API调用等）
    - rag: 需要检索文档或知识库
    - direct: 简单对话，直接 LLM 回复
    
    可用技能: {available_skills}
    可用工作流: {available_workflows}
    可用知识库: {available_collections}
    
    输出 JSON 格式：
    {
      "route_type": "fta|skill|rag|direct",
      "target": "目标名称",
      "confidence": 0.0-1.0,
      "reasoning": "决策理由"
    }
    """
    
    async def decide(self, input_text: str, context: dict) -> RouteDecision:
        # 构建提示词
        prompt = self.SYSTEM_PROMPT.format(
            available_skills=context.get("skills", []),
            available_workflows=context.get("workflows", []),
            available_collections=context.get("rag_collections", [])
        )
        
        # 调用快速 LLM
        response = await self.llm.chat([
            {"role": "system", "content": prompt},
            {"role": "user", "content": input_text}
        ])
        
        # 解析决策
        return RouteDecision.parse(response)
```

**优点**：
- 语义理解能力强
- 可处理复杂/模糊意图
- 自适应新能力

**缺点**：
- 有 LLM 调用延迟
- 成本较高
- 可能不稳定

### 3. 混合策略 (Hybrid) - 默认

结合规则和 LLM 的优势，规则优先，LLM 兜底。

```python
class HybridStrategy:
    """混合路由策略 - 默认推荐"""
    
    def __init__(self, confidence_threshold: float = 0.7):
        self.rule_strategy = RuleStrategy()
        self.llm_strategy = LLMStrategy()
        self.confidence_threshold = confidence_threshold
    
    async def decide(self, input_text: str, context: dict) -> RouteDecision:
        # Step 1: 尝试规则匹配
        rule_decision = await self.rule_strategy.decide(input_text, context)
        
        # 如果规则匹配置信度足够高，直接返回
        if rule_decision.confidence >= self.confidence_threshold:
            return rule_decision
        
        # Step 2: 规则置信度不足，使用 LLM
        llm_decision = await self.llm_strategy.decide(input_text, context)
        
        # 选择置信度更高的决策
        if llm_decision.confidence > rule_decision.confidence:
            return llm_decision
        return rule_decision
```

**工作流程**：

```
用户输入
    │
    ▼
┌─────────────────────────────────────┐
│         规则策略匹配                │
└──────────────┬──────────────────────┘
               │
               ▼
        置信度 >= 0.7?
        ┌─────┴─────┐
        │ 是        │ 否
        ▼           ▼
   返回规则决策   ┌─────────────────────┐
                 │    LLM 策略决策      │
                 └──────────┬──────────┘
                            │
                            ▼
                     返回最优决策
```

---

## 路由类型

智能选择器支持六种路由类型：

### 1. FTA (Fault Tree Analysis)

路由到故障树分析工作流，适用于：
- 复杂故障诊断
- 多步骤决策流程
- 需要综合多源信息

```json
{
  "route_type": "fta",
  "target": "incident-diagnosis",
  "confidence": 0.92,
  "parameters": {
    "context": "生产环境 API 响应缓慢"
  }
}
```

### 2. Skill (技能调用)

路由到单一技能执行，适用于：
- 原子化操作（搜索、计算、API调用）
- 明确的功能需求
- 快速响应场景

```json
{
  "route_type": "skill",
  "target": "web-search",
  "confidence": 0.95,
  "parameters": {
    "query": "Python 3.12 新特性",
    "num_results": 5
  }
}
```

### 3. RAG (检索增强生成)

路由到 RAG 管道，适用于：
- 知识库查询
- 文档检索
- 基于上下文的问答

```json
{
  "route_type": "rag",
  "target": "product-docs",
  "confidence": 0.88,
  "parameters": {
    "query": "如何配置认证",
    "top_k": 5
  }
}
```

### 4. Multi (链式执行)

多个路由的链式组合，适用于：
- 需要多步骤处理
- 先检索后生成
- 复合型任务

```json
{
  "route_type": "multi",
  "confidence": 0.85,
  "chain": [
    {
      "route_type": "rag",
      "target": "knowledge-base",
      "parameters": {"query": "错误处理最佳实践"}
    },
    {
      "route_type": "skill",
      "target": "code-generator",
      "parameters": {"template": "error-handler"}
    }
  ]
}
```

### 5. Direct (直接响应)

直接使用 LLM 响应，适用于：
- 简单对话
- 闲聊
- 无需工具/知识的问答

```json
{
  "route_type": "direct",
  "target": "",
  "confidence": 0.75,
  "reasoning": "简单问候，无需工具调用"
}
```

### 6. Code Analysis (代码分析)

路由到代码分析引擎，支持三种子类型（通过 `parameters.sub_type` 区分）：

- **static**: AST 调用图构建 + 错误解析 + LLM+RAG 方案生成
- **traffic**: 动态流量采集 + 服务依赖图 + LLM 报告生成
- **llm**: 传统 LLM 代码审查（向后兼容，默认值）

适用场景：
- 代码调用链分析和入口点追踪
- 服务间流量依赖可视化
- 错误堆栈自动诊断和方案推荐
- 代码审查和安全扫描

**静态分析示例**：

```json
{
  "route_type": "code_analysis",
  "target": "static-analysis",
  "confidence": 0.88,
  "parameters": {
    "sub_type": "static",
    "repo_path": "/opt/repos/my-service",
    "language": "python",
    "entry_points": ["main.py:app"],
    "error_logs": "Traceback (most recent call last):\n  File \"app.py\", line 42..."
  }
}
```

**流量分析示例**：

```json
{
  "route_type": "code_analysis",
  "target": "traffic-analysis",
  "confidence": 0.85,
  "parameters": {
    "sub_type": "traffic",
    "sources": [
      {"type": "otel", "endpoint": "http://jaeger:16686"},
      {"type": "proxy", "log_path": "/var/log/envoy/access.log"}
    ],
    "name": "production-traffic",
    "target_service": "api-gateway"
  }
}
```

---

## 三阶段处理流程

### 阶段 1: 意图分析 (Intent Analysis)

```python
class IntentAnalyzer:
    """意图分析器"""
    
    async def analyze(self, input_text: str) -> IntentResult:
        """
        分析用户意图
        
        Returns:
            IntentResult:
                - intent_type: 意图类型
                - entities: 提取的实体
                - confidence: 置信度
        """
        # 实体提取
        entities = await self._extract_entities(input_text)
        
        # 意图分类
        intent_type = await self._classify_intent(input_text, entities)
        
        return IntentResult(
            intent_type=intent_type,
            entities=entities,
            confidence=self._calculate_confidence()
        )
```

**意图类型示例**：

| 意图类型 | 示例输入 | 提取实体 |
|----------|----------|----------|
| `search` | "搜索最新的 AI 论文" | [AI, 论文] |
| `troubleshoot` | "服务器 CPU 占用过高" | [服务器, CPU] |
| `query_docs` | "查看部署文档" | [部署, 文档] |
| `analyze` | "分析这段日志" | [日志] |
| `code_analysis` | "分析这段代码的调用链" | [代码, 调用链] |
| `code_analysis` | "查看服务间的流量依赖" | [服务, 流量, 依赖] |
| `chat` | "你好" | [] |

#### 代码分析意图模式详解

`IntentAnalyzer` 中新增的 `code_analysis` 意图检测模式包括：

**正则模式**（`INTENT_PATTERNS`）：
```python
# 流量/网络分析模式
r"(traffic|流量|packet|包|capture|捕获).*(analy|分析|graph|图)"
r"(service|服务).*(dependency|依赖|topology|拓扑)"
r"(ebpf|eBPF|bpf|tcpdump|packet\s*capture)"

# 代码分析模式 (原有)
r"(code|代码).*(review|审查|analy|分析|scan|扫描)"
r"(call|调用).*(graph|图|chain|链|tree|树)"
```

**关键词**（scoring 权重 0.3）：
```
traffic, 流量, packet, capture, eBPF, service-dependency,
call-graph, call-chain, entry-point, 调用链, 入口点, 服务依赖
```

**子路由逻辑** — `_get_suggested_target()` 根据关键词进一步细分目标：

```
code_analysis 意图
    │
    ├── 包含 "traffic/packet/capture/eBPF/流量/服务依赖"
    │   → suggested_target = "traffic-analysis"
    │   → parameters.sub_type = "traffic"
    │
    ├── 包含 "call-graph/call-chain/entry-point/调用链/入口点"
    │   → suggested_target = "static-analysis"
    │   → parameters.sub_type = "static"
    │
    └── 其他代码分析关键词
        → suggested_target = ""
        → parameters.sub_type = "llm" (默认)
```

### 阶段 2: 上下文增强 (Context Enrichment)

```python
class ContextEnricher:
    """上下文增强器"""
    
    async def enrich(
        self, 
        intent: IntentResult,
        agent_context: dict
    ) -> EnrichedContext:
        """
        增强路由决策所需的上下文
        
        Args:
            intent: 意图分析结果
            agent_context: Agent 上下文（记忆、配置等）
            
        Returns:
            EnrichedContext: 增强后的上下文
        """
        return EnrichedContext(
            # 可用能力
            available_skills=await self._get_skills(agent_context),
            available_workflows=await self._get_workflows(agent_context),
            available_rag_collections=await self._get_collections(agent_context),
            
            # 历史上下文
            conversation_history=agent_context.get("memory", [])[-10:],
            
            # 用户偏好
            user_preferences=agent_context.get("preferences", {}),
            
            # 原始意图
            intent=intent
        )
```

**增强内容**：

```
┌─────────────────────────────────────────────────────────────┐
│                    上下文增强内容                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  可用能力:                                                  │
│    ├── 技能: [web-search, log-analyzer, code-runner, ...]  │
│    ├── 工作流: [incident-diagnosis, deploy-check, ...]     │
│    └── 知识库: [product-docs, runbook, faq, ...]           │
│                                                             │
│  会话历史:                                                  │
│    ├── 用户: "查看一下最近的错误日志"                      │
│    ├── Agent: "发现 3 个错误..."                           │
│    └── 用户: "分析一下根本原因" ← 当前                     │
│                                                             │
│  Agent 记忆:                                                │
│    ├── 用户角色: SRE                                       │
│    ├── 关注系统: production-api                            │
│    └── 常用技能: log-analyzer, metrics-checker             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 阶段 3: 路由决策 (Route Decision)

```python
class RouteDecider:
    """路由决策器"""
    
    async def decide(
        self,
        input_text: str,
        enriched_context: EnrichedContext,
        strategy: str = "hybrid"
    ) -> RouteDecision:
        """
        做出最终路由决策
        """
        # 获取策略
        strategy_impl = self._get_strategy(strategy)
        
        # 执行决策
        decision = await strategy_impl.decide(
            input_text=input_text,
            context=enriched_context.to_dict()
        )
        
        # 验证决策
        validated = self._validate_decision(decision, enriched_context)
        
        return validated
```

---

## 配置指南

### Agent 级别配置

在 Agent 定义中配置选择器：

```yaml
# agent.yaml
agent:
  name: my-assistant
  type: mega
  config:
    model_id: qwen-plus
    selector_config:
      # 路由策略
      strategy: hybrid  # rule | llm | hybrid
      
      # 置信度阈值（仅 hybrid 策略）
      confidence_threshold: 0.7
      
      # 选择器专用模型（可选，默认使用 agent 模型）
      selector_model_id: qwen-turbo
      
      # 自定义规则
      rules:
        - pattern: "紧急|urgent"
          route_type: fta
          target: urgent-response
          confidence: 0.95
```

### 运行时配置

全局默认配置：

```yaml
# runtime.yaml
selector:
  # 全局默认策略
  default_strategy: hybrid
  
  # 全局置信度阈值
  confidence_threshold: 0.7
  
  # LLM 调用超时
  llm_timeout_seconds: 5
  
  # 缓存配置
  cache:
    enabled: true
    ttl_seconds: 300
```

---

## 监控与调试

### 日志

选择器会输出详细的决策日志：

```json
{
  "level": "info",
  "message": "Route decision made",
  "strategy": "hybrid",
  "input_preview": "帮我分析一下...",
  "intent_type": "troubleshoot",
  "route_type": "fta",
  "target": "incident-diagnosis",
  "confidence": 0.92,
  "decision_time_ms": 45,
  "used_llm": false
}
```

### 指标

```prometheus
# 决策总数
resolveagent_selector_decisions_total{strategy="hybrid", route_type="fta"} 1234

# 决策延迟
resolveagent_selector_decision_latency_seconds{strategy="hybrid"} 0.045

# 置信度分布
resolveagent_selector_confidence_histogram{route_type="skill"} 

# LLM 回退次数
resolveagent_selector_llm_fallback_total 56
```

### 调试模式

启用调试模式获取详细决策过程：

```bash
export RESOLVEAGENT_SELECTOR_DEBUG=true
resolveagent agent run my-assistant
```

调试输出：

```
[Selector Debug] Input: "帮我分析一下最近的生产故障"
[Selector Debug] Intent Analysis:
  - type: troubleshoot
  - entities: [生产, 故障]
  - confidence: 0.85
[Selector Debug] Context Enrichment:
  - available_skills: [log-analyzer, metrics-checker, ...]
  - available_workflows: [incident-diagnosis, ...]
  - history_length: 5
[Selector Debug] Rule Match:
  - pattern: "故障|诊断"
  - route_type: fta
  - confidence: 0.8
[Selector Debug] Confidence below threshold (0.8 < 0.7), skipping LLM
[Selector Debug] Final Decision:
  - route_type: fta
  - target: incident-diagnosis
  - confidence: 0.8
```

---

## 最佳实践

### 1. 策略选择建议

| 场景 | 推荐策略 | 理由 |
|------|----------|------|
| 请求类型明确、固定 | `rule` | 快速、稳定 |
| 请求多变、模糊 | `llm` | 灵活、智能 |
| 生产环境 | `hybrid` | 平衡性能和灵活性 |

### 2. 规则设计原则

```yaml
rules:
  # ✅ 好的规则：具体、无歧义
  - pattern: "搜索最新(的)?.*新闻|news"
    route_type: skill
    target: news-search
    confidence: 0.9
    
  # ❌ 避免：过于宽泛
  - pattern: ".*"
    route_type: direct
    confidence: 0.5
```

### 3. 置信度阈值调优

- **阈值过高**（>0.85）：规则覆盖不足，频繁 LLM 回退
- **阈值过低**（<0.5）：规则误匹配，结果不准确
- **推荐值**：0.7 - 0.8

### 4. 性能优化

```yaml
selector:
  # 启用缓存减少重复计算
  cache:
    enabled: true
    ttl_seconds: 300
    
  # 使用快速模型做路由决策
  selector_model_id: qwen-turbo  # 比 qwen-max 更快
  
  # 设置超时避免阻塞
  llm_timeout_seconds: 3
```

---

## API 参考

### gRPC API

```protobuf
// SelectorService 提供意图分类和路由决策
service SelectorService {
  // ClassifyIntent 分析用户意图
  rpc ClassifyIntent(ClassifyIntentRequest) returns (ClassifyIntentResponse);
  
  // Route 获取路由决策
  rpc Route(RouteRequest) returns (RouteResponse);
}

message ClassifyIntentRequest {
  string input = 1;
  string conversation_id = 2;
  google.protobuf.Struct context = 3;
}

message RouteRequest {
  string input = 1;
  string intent_type = 2;
  string agent_id = 3;
  google.protobuf.Struct context = 4;
}
```

### Python SDK

```python
from resolveagent.selector import IntelligentSelector, RouteDecision

# 创建选择器
selector = IntelligentSelector(strategy="hybrid")

# 执行路由决策
decision: RouteDecision = await selector.route(
    input_text="帮我搜索一下最新的 AI 新闻",
    agent_id="my-assistant",
    context={"skills": ["web-search", "news-crawler"]}
)

print(f"路由类型: {decision.route_type}")
print(f"目标: {decision.route_target}")
print(f"置信度: {decision.confidence}")
print(f"推理: {decision.reasoning}")
```

---

## 性能优化

### 路由决策缓存

`RouteDecisionCache` (`selector/cache.py`) 提供基于 TTL 的 LRU 缓存，避免对相同输入的重复路由计算。

```python
# 实例级缓存（每个 selector 独立）
selector = IntelligentSelector(strategy="hybrid", cache_scope="instance")

# 全局共享缓存（模块级单例）
selector = IntelligentSelector(strategy="hybrid", cache_scope="global")

# 跳过缓存（强制重新计算）
decision = await selector.route("input", bypass_cache=True)
```

特性：
- **缓存键**: 基于 SHA-256 哈希 `(input_text, agent_id, strategy)` 生成
- **可配置参数**: `max_size`（默认 1000）和 `ttl_seconds`（默认 300）
- **线程安全**: 使用 `threading.Lock` 保护
- **监控**: `cache_stats()` 返回 hit/miss/hit_rate/size 指标

### 策略实例缓存

策略对象 (RuleStrategy, LLMStrategy, HybridStrategy) 通过 `_get_strategy()` 惰性创建并缓存在 `_strategy_instances` 中，避免每次 `route()` 调用重新编译正则表达式和初始化状态。

### 上下文并行查询

`ContextEnricher` 使用 `asyncio.gather()` 并行执行注册中心查询（技能、工作流、RAG 集合），替代原有的串行查询模式。同时新增加权技能排序，按相关性排列并取 top-10。

### 单次遍历意图分析

`IntentAnalyzer` 将关键词评分、模式匹配、代码检测和问题检测合并为一次文本遍历，替代原有的 4 阶段管道。正则表达式在 `__init__` 中预编译，问题词使用 `frozenset` 实现 O(1) 查找。

增强的多意图检测：当前两名意图评分差距小于 `split_threshold` 且第二名 > 0.2 时，分类为 `MULTI`。

### MegaAgent 选择器复用

`MegaAgent._get_selector()` 工厂方法惰性创建选择器并在所有 `reply()` 调用中复用，替代原来每次请求创建新 `IntelligentSelector` 的模式。

---

## 选择器适配器

### 统一协议 (SelectorProtocol)

所有选择器实现遵循 `SelectorProtocol`（`selector/protocol.py`），基于 `runtime_checkable` Protocol 实现结构子类型化：

```python
@runtime_checkable
class SelectorProtocol(Protocol):
    async def route(
        self, input_text: str, agent_id: str = "",
        context: dict[str, Any] | None = None, enrich_context: bool = True,
    ) -> RouteDecision: ...

    def get_strategy_info(self) -> dict[str, Any]: ...
```

三种实现满足此协议：

| 实现 | 模式名 | 说明 |
|------|--------|------|
| `IntelligentSelector` | `"selector"` | 默认 LLM 驱动的元路由器 |
| `HookSelectorAdapter` | `"hooks"` | 带 pre/post hook 的选择器 |
| `SkillSelectorAdapter` | `"skills"` | 基于技能调用的选择器 |

### Hook 选择器适配器

`HookSelectorAdapter` (`selector/hook_selector.py`) 将 `IntelligentSelector` 包装在 hooks 基础设施中，允许外部代码通过 pre/post hook 拦截和修改路由决策。

```python
from resolveagent.selector.hook_selector import HookSelectorAdapter

# 默认：自动创建 InMemoryHookClient + 安装默认 hooks
adapter = HookSelectorAdapter(strategy="hybrid")
decision = await adapter.route("诊断错误原因", agent_id="agent-1")
```

**执行流程**：

```
route() 调用
    │
    ▼
Pre-hooks（触发点: selector.route, 类型: pre）
    │   • intent_analysis_handler → 预分析意图
    │   • 可短路: 如果 modified_data 包含 route_decision 且 skip_remaining=True
    ▼
IntelligentSelector.route()（短路时跳过）
    │
    ▼
Post-hooks（触发点: selector.route, 类型: post）
    │   • decision_audit_handler → 记录决策日志
    │   • confidence_override_handler → 调整置信度
    ▼
返回 RouteDecision
```

**内置 Handler**：

| Handler | 类型 | 说明 |
|---------|------|------|
| `intent_analysis_handler` | Pre | 运行 IntentAnalyzer，将分类存入 modified_data |
| `decision_audit_handler` | Post | 记录路由类型、目标、置信度和时间戳 |
| `confidence_override_handler` | Post | 根据 metadata 中的阈值映射调整置信度 |

**自定义 Hook 示例**：

```python
from resolveagent.hooks.models import HookContext, HookResult

# 定义自定义 handler
async def my_custom_handler(ctx: HookContext) -> HookResult:
    # 自定义逻辑
    return HookResult(success=True, modified_data={"custom_key": "value"})

# 注册 handler
adapter._runner.register_handler("my_handler", my_custom_handler)

# 创建 hook 定义
await adapter._client.create({
    "name": "my-custom-hook",
    "hook_type": "pre",
    "trigger_point": "selector.route",
    "handler_type": "my_handler",
    "execution_order": 0,
    "enabled": True,
})
```

### InMemoryHookClient

`InMemoryHookClient` (`hooks/memory_client.py`) 是平台 `HookClient` 的内存替代品，用 Python dict 存储 hook 定义，无需 Go 平台依赖。适用于开发、测试和独立部署场景。

```python
from resolveagent.hooks.memory_client import InMemoryHookClient

client = InMemoryHookClient()
result = await client.create({"name": "hook-1", "hook_type": "pre", ...})
hooks = await client.list()
await client.update(result["id"], {"enabled": False})
await client.delete(result["id"])
```

### Skill 选择器适配器

`SkillSelectorAdapter` (`selector/skill_selector.py`) 将路由逻辑包装为技能调用，通过 skills 基础设施执行选择器功能。

```python
from resolveagent.selector.skill_selector import SkillSelectorAdapter

adapter = SkillSelectorAdapter()
decision = await adapter.route("搜索 Python 教程", agent_id="agent-1")
```

- 技能入口: `resolveagent.skills.builtin.selector_skill:run`
- 独立 Manifest: `python/skills/intelligent-selector/manifest.yaml`
- 错误回退: 出错时返回 `route_type="direct"`, `confidence=0.3`

---

## MegaAgent 集成

MegaAgent 通过 `selector_mode` 参数支持三种选择器模式：

```python
from resolveagent.agent.mega import MegaAgent

# 默认模式: IntelligentSelector
agent = MegaAgent(name="default-agent", selector_mode="selector")

# Hook 模式: 带 pre/post hook 的选择器
agent = MegaAgent(name="hooks-agent", selector_mode="hooks")

# Skill 模式: 通过技能调用路由
agent = MegaAgent(name="skills-agent", selector_mode="skills")
```

`_get_selector()` 工厂方法根据 `selector_mode` 惰性创建对应的选择器实例，并在所有 `reply()` 调用中复用：

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
        if self._selector_instance is not None:
            return self._selector_instance
        if self.selector_mode == "hooks":
            self._selector_instance = HookSelectorAdapter(strategy=self.selector_strategy)
        elif self.selector_mode == "skills":
            self._selector_instance = SkillSelectorAdapter()
        else:
            self._selector_instance = IntelligentSelector(strategy=self.selector_strategy)
        return self._selector_instance
```

---

## Hybrid 策略增强

`HybridStrategy` 通过 `HybridConfig.per_route_boosts` 支持可配置的路由权重加成：

```python
from resolveagent.selector.strategies.hybrid_strategy import HybridConfig, HybridStrategy

config = HybridConfig(
    rule_confidence_threshold=0.7,
    per_route_boosts={"code_analysis": 0.05, "rag": 0.03},
)
strategy = HybridStrategy(config=config)
```

`_apply_boosts()` 自适应加成：
- 代码复杂度加成: 高复杂度时 +0.05
- 对话历史加成: 历史 > 3 条时 +0.03
- 路由类型加成: 来自 `per_route_boosts` 的可配置值

---

## 模块导出

```python
from resolveagent.selector import (
    # 核心
    IntelligentSelector, RouteDecision,
    # 协议 & 缓存
    SelectorProtocol, RouteDecisionCache, get_global_cache,
    # 适配器（惰性加载）
    HookSelectorAdapter, SkillSelectorAdapter,
    # 意图分析
    IntentAnalyzer, IntentClassification, IntentPattern, IntentType,
    # 上下文增强
    ContextEnricher, EnrichedContext, CodeContext,
)

from resolveagent.hooks import (
    HookContext, HookResult, HookRunner,
    # 惰性加载
    InMemoryHookClient,
    intent_analysis_handler,
    decision_audit_handler,
    confidence_override_handler,
)
```

适配器和缓存相关符号使用模块级 `__getattr__` 惰性加载，避免循环导入。

---

## 组件清单

| 组件 | 文件 | 说明 |
|------|------|------|
| `IntelligentSelector` | `selector/selector.py` | 主编排器，含策略分发和缓存 |
| `RouteDecision` | `selector/selector.py` | Pydantic 路由输出模型 |
| `SelectorProtocol` | `selector/protocol.py` | `runtime_checkable` 统一协议 |
| `RouteDecisionCache` | `selector/cache.py` | TTL-aware LRU 缓存（instance/global） |
| `IntentAnalyzer` | `selector/intent.py` | 单次遍历意图分类器 |
| `ContextEnricher` | `selector/context_enricher.py` | 并行上下文增强管道 |
| `HybridStrategy` | `selector/strategies/hybrid_strategy.py` | 规则 + LLM 回退 + 可配置路由加成 |
| `LLMStrategy` | `selector/strategies/llm_strategy.py` | 纯 LLM 分类 |
| `RuleStrategy` | `selector/strategies/rule_strategy.py` | 模式匹配规则 |
| `HookSelectorAdapter` | `selector/hook_selector.py` | Hook 管道选择器 |
| `SkillSelectorAdapter` | `selector/skill_selector.py` | 技能调用选择器 |
| `InMemoryHookClient` | `hooks/memory_client.py` | 内存 Hook 存储 |
| `selector_handlers` | `hooks/selector_handlers.py` | 内置 Hook handler (3个) |
| `selector_skill` | `skills/builtin/selector_skill.py` | 技能入口函数 |

---

## 测试

| 测试文件 | 覆盖范围 |
|----------|----------|
| `test_selector.py` | IntentAnalyzer、ContextEnricher、策略、IntelligentSelector、RouteDecision |
| `test_selector_cache.py` | 缓存 hit/miss、TTL 过期、LRU 淘汰、bypass、stats、全局单例 |
| `test_hook_selector.py` | InMemoryHookClient CRUD、HookSelectorAdapter 路由/短路/协议 |
| `test_skill_selector.py` | SkillSelectorAdapter 路由/惰性加载/错误回退/协议 |
| `test_mega_selector_modes.py` | MegaAgent 三模式工厂/实例复用/策略传递 |

---

## 相关文档

- [架构设计](./architecture.md) - 系统整体架构、代码分析引擎详解
- [FTA 工作流引擎](./fta-engine.md) - 故障树分析详解
- [技能系统](./skill-system.md) - 技能开发与管理
- [AgentScope 与 Higress 集成](./agentscope-higress-integration.md) - 网关集成、代码分析 API 端点
- [配置参考](./configuration.md) - 完整配置选项
