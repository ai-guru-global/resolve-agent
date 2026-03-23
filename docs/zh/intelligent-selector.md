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

智能选择器支持五种路由类型：

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
| `chat` | "你好" | [] |

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

## 相关文档

- [架构设计](./architecture.md) - 系统整体架构
- [FTA 工作流引擎](./fta-engine.md) - 故障树分析详解
- [技能系统](./skill-system.md) - 技能开发与管理
- [配置参考](./configuration.md) - 完整配置选项
