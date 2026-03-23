# AgentScope 与 Higress 深度集成架构

本文档详细说明 ResolveAgent 平台中 AgentScope 和 Higress 的深度集成架构。

## 架构概述

ResolveAgent 采用 **"单一真相源"（Single Source of Truth）** 架构模式：

- **Go Registry** 作为所有服务注册的中心
- **Python Runtime** 通过 gRPC 查询 Registry
- **Higress Gateway** 从 Registry 同步路由规则

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            客户端层                                      │
│         CLI/TUI (Go)  │  WebUI (React)  │  外部 API 消费者               │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      HIGRESS AI/API 网关                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   认证授权   │  │   限流降级   │  │  模型路由   │  │   负载均衡      │ │
│  │  JWT/OAuth2 │  │ Token/请求  │  │ qwen/wenxin │  │  round_robin   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘ │
│                                                                          │
│         路由规则从 Go Registry 同步 (每 30s)                             │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────┐
│  Platform API   │  │  Agent Runtime  │  │        LLM Providers           │
│   (Go gRPC)     │  │   (Python)      │  │  Qwen │ Wenxin │ Zhipu │ ...   │
└────────┬────────┘  └────────┬────────┘  └───────────────────────────────┘
         │                    │
         │    gRPC            │ gRPC (RegistryService)
         ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    GO REGISTRY (单一真相源)                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │  Agent Registry │  │  Skill Registry │  │    Model Router         │  │
│  │   (agents 注册) │  │  (skills 注册)  │  │  (LLM 路由配置)         │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
│                                │                                         │
│                         RouteSync                                        │
│                    (定期同步到 Higress)                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

## 核心设计原则

### 1. 单一真相源

**Go Registry 作为所有服务注册的唯一中心**：

| 组件 | 位置 | 职责 |
|------|------|------|
| AgentRegistry | `pkg/registry/agent.go` | Agent 定义和状态管理 |
| SkillRegistry | `pkg/registry/skill.go` | Skill 清单和版本管理 |
| WorkflowRegistry | `pkg/registry/workflow.go` | FTA 工作流定义 |
| ModelRouter | `pkg/gateway/model_router.go` | LLM 模型路由配置 |

```go
// pkg/service/registry_service.go
type RegistryService struct {
    agentRegistry    registry.AgentRegistry
    skillRegistry    registry.SkillRegistry
    workflowRegistry registry.WorkflowRegistry
    modelRouter      *gateway.ModelRouter
}
```

### 2. 路由职责分离

| 层级 | 组件 | 职责 |
|------|------|------|
| **外部路由** | Higress Gateway | 服务发现、LLM 模型路由、认证、限流 |
| **内部路由** | Intelligent Selector | Agent 内 FTA/Skill/RAG 决策 |

```
请求处理流程：

用户请求 ──▶ [Higress 网关]
                 │
                 │ 1. 认证验证
                 │ 2. 限流检查
                 │ 3. 路由到服务
                 ▼
           [Platform Service] (Go)
                 │
                 │ ExecuteAgent gRPC
                 ▼
           [Agent Runtime] (Python)
                 │
                 ▼
           [Intelligent Selector]  ← 仅做内部路由决策
                 │
     ┌───────────┼───────────┐
     ▼           ▼           ▼
   [FTA]      [Skill]      [RAG]
```

### 3. 统一的 LLM 调用路径

所有 LLM 调用通过 Higress 网关：

```python
# python/src/resolveagent/llm/higress_provider.py
class HigressLLMProvider(LLMProvider):
    async def chat(self, messages, model=None, **kwargs):
        # 从 Registry 获取模型端点
        model_info = await registry.get_model_route(model)
        endpoint = f"{self.gateway_url}{model_info.gateway_endpoint}"
        
        # 通过 Higress 发送请求
        response = await self._client.post(endpoint, json=payload)
        return response
```

**好处**：
- 集中的速率限制和配额管理
- 自动故障转移到备用模型
- 统一的流量监控
- 跨租户的负载均衡

## 关键组件

### Go 侧组件

| 组件 | 路径 | 职责 |
|------|------|------|
| GatewayConfig | `pkg/config/types.go` | Higress 配置结构 |
| Client | `pkg/gateway/client.go` | Higress Admin API 客户端 |
| RouteSync | `pkg/gateway/route_sync.go` | Registry → Higress 路由同步 |
| ModelRouter | `pkg/gateway/model_router.go` | LLM 模型路由管理 |
| RegistryService | `pkg/service/registry_service.go` | Python 查询 Registry 的服务 |
| AuthMiddleware | `pkg/server/middleware/auth.go` | 统一认证中间件 |

### Python 侧组件

| 组件 | 路径 | 职责 |
|------|------|------|
| RegistryClient | `runtime/registry_client.py` | 查询 Go Registry 的 gRPC 客户端 |
| HigressLLMProvider | `llm/higress_provider.py` | 通过 Higress 调用 LLM |
| HigressEmbeddingProvider | `llm/higress_provider.py` | 通过 Higress 生成嵌入 |
| IntelligentSelector | `selector/selector.py` | Agent 内部路由决策 |

## 配置说明

### 网关配置

```yaml
# configs/resolveagent.yaml
gateway:
  enabled: true
  admin_url: "http://localhost:8888"
  sync_interval: "30s"
  
  model_routing:
    enabled: true
    default_model: "qwen-plus"
    base_path: "/llm"
  
  auth:
    enabled: true
    jwt_secret: "${JWT_SECRET}"
    jwt_issuer: "resolveagent"
  
  load_balancer:
    strategy: "round_robin"
    health_check: true
```

### 环境变量

```bash
# Higress 集成
RESOLVEAGENT_GATEWAY_ENABLED=true
RESOLVEAGENT_GATEWAY_ADMIN_URL=http://higress:8888
RESOLVEAGENT_GATEWAY_SYNC_INTERVAL=30s

# 模型路由
RESOLVEAGENT_GATEWAY_MODEL_ROUTING_ENABLED=true
RESOLVEAGENT_GATEWAY_MODEL_ROUTING_DEFAULT_MODEL=qwen-plus

# 认证
RESOLVEAGENT_GATEWAY_AUTH_ENABLED=true
RESOLVEAGENT_GATEWAY_AUTH_JWT_SECRET=your-secret-key
```

## 数据流示例

### Agent 执行请求

```
1. 客户端 POST /api/v1/agents/{id}/execute
      │
      ▼
2. [Higress] 验证 JWT → 限流检查 → 路由到 Platform
      │
      ▼
3. [Platform Service] 验证 AuthContext → 调用 Runtime
      │
      ▼ gRPC
4. [Agent Runtime] 
      │
      ├─▶ [RegistryClient] 查询 Agent 配置
      │
      ├─▶ [IntelligentSelector] 路由决策
      │         │
      │         ├─▶ FTA Workflow
      │         ├─▶ Skill 执行
      │         └─▶ RAG 查询
      │
      └─▶ [HigressLLMProvider] 通过网关调用 LLM
               │
               ▼
           [Higress] /llm/models/qwen-plus → 通义千问 API
```

### LLM 调用流程

```
1. Python Agent 需要调用 LLM
      │
      ▼
2. [HigressLLMProvider].chat(messages, model="qwen-plus")
      │
      ▼
3. [RegistryClient].get_model_route("qwen-plus")
      │  返回: gateway_endpoint = "/llm/models/qwen-plus"
      ▼
4. HTTP POST → Higress Gateway: /llm/models/qwen-plus
      │
      ├─▶ [Higress] 模型路由
      │       │
      │       ├─▶ 限流检查 (tokens_per_minute)
      │       ├─▶ 负载均衡
      │       └─▶ 故障转移 (如果启用)
      │
      ▼
5. 转发到 https://dashscope.aliyuncs.com/...
      │
      ▼
6. 返回响应 → HigressLLMProvider → Agent
```

## 最佳实践

### 1. 避免重复的服务发现

❌ **错误做法**：Python 侧维护自己的服务注册表

```python
class LocalServiceRegistry:
    def __init__(self):
        self.services = {}  # 重复的数据源
```

✅ **正确做法**：始终通过 Go Registry 查询

```python
from resolveagent.runtime.registry_client import get_registry_client

async def get_skill(skill_name: str):
    registry = get_registry_client()
    return await registry.get_skill(skill_name)
```

### 2. 统一的 LLM 调用

❌ **错误做法**：直接调用 LLM API

```python
response = await httpx.post("https://api.qwen.com/...", ...)
```

✅ **正确做法**：通过 Higress 网关调用

```python
from resolveagent.llm.higress_provider import HigressLLMProvider

provider = HigressLLMProvider()
response = await provider.chat(messages, model="qwen-plus")
```

### 3. 认证处理

❌ **错误做法**：在每个 handler 中自行验证

```go
func handler(w http.ResponseWriter, r *http.Request) {
    token := r.Header.Get("Authorization")
    // ... 验证逻辑
}
```

✅ **正确做法**：使用统一的 AuthMiddleware

```go
authMiddleware := middleware.NewAuthMiddleware(config, logger)
router.Use(authMiddleware.Middleware)

func handler(w http.ResponseWriter, r *http.Request) {
    auth := middleware.GetAuthContext(r.Context())
    // 直接使用已验证的 auth 信息
}
```

## 监控指标

| 指标 | 描述 |
|------|------|
| `resolveagent_gateway_route_sync_total` | 路由同步次数 |
| `resolveagent_gateway_route_sync_errors` | 路由同步错误 |
| `resolveagent_llm_requests_total` | LLM 请求总数 |
| `resolveagent_llm_request_duration_seconds` | LLM 请求延迟 |
| `resolveagent_registry_queries_total` | Registry 查询次数 |

## 参考资料

- [Higress 官方文档](https://higress.io/docs/)
- [AgentScope 官方文档](https://modelscope.github.io/agentscope/)
- [架构概览](../architecture/overview.md)
- [智能选择器设计](intelligent-selector.md)
