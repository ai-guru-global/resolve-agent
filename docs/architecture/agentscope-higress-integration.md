# AgentScope 与 Higress 深度集成架构

本文档详细说明 ResolveAgent 平台中 AgentScope 和 Higress 的深度集成架构，以及优化后的服务注册、路由和认证机制。

## 架构概述

ResolveAgent 采用"单一真相源"（Single Source of Truth）架构模式，Go Registry 作为所有服务注册的中心，Python 运行时通过 gRPC 查询 Registry，Higress 网关从 Registry 同步路由规则。

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
         │    gRPC            │ gRPC
         ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    GO REGISTRY (单一真相源)                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │  Agent Registry │  │  Skill Registry │  │    Model Router         │  │
│  │   (agents 注册) │  │  (skills 注册)  │  │  (LLM 路由配置)         │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
│                                │                                         │
│                         Route Sync                                       │
│                    (定期同步到 Higress)                                  │
└─────────────────────────────────────────────────────────────────────────┘
```

## 核心设计原则

### 1. 单一真相源 (Single Source of Truth)

**Go Registry 作为所有服务注册的唯一中心**：

- Agents、Skills、Workflows 的定义和状态都存储在 Go Registry
- Python 运行时通过 `RegistryClient` gRPC 客户端查询 Registry
- Higress 通过 `RouteSync` 组件自动同步路由规则

```go
// pkg/gateway/route_sync.go
type RouteSync struct {
    client        *Client
    agentRegistry registry.AgentRegistry
    skillRegistry registry.SkillRegistry
    // ...
}

// 定期同步路由到 Higress
func (rs *RouteSync) Sync(ctx context.Context) error {
    // 1. 同步平台 API 路由
    rs.syncPlatformRoutes(ctx)
    
    // 2. 同步 Agent 执行路由
    rs.syncAgentRoutes(ctx)
    
    // 3. 同步 Skill 执行路由
    rs.syncSkillRoutes(ctx)
    
    return nil
}
```

### 2. 职责分离的路由架构

**Higress 网关负责外部路由**：
- 服务发现和负载均衡
- LLM 模型路由 (qwen/wenxin/zhipu)
- 认证授权 (JWT/API Key)
- 限流降级

**Intelligent Selector 负责内部路由**：
- Agent 内部的 FTA/Skill/RAG 路由决策
- 基于意图分析和上下文增强
- 不涉及服务发现或负载均衡

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         请求处理流程                                     │
│                                                                          │
│  用户请求 ──▶ [Higress 网关]                                            │
│                    │                                                     │
│                    │ 1. 认证验证                                         │
│                    │ 2. 限流检查                                         │
│                    │ 3. 路由到服务                                       │
│                    ▼                                                     │
│              [Platform Service] (Go)                                     │
│                    │                                                     │
│                    │ ExecuteAgent gRPC 调用                              │
│                    ▼                                                     │
│              [Agent Runtime] (Python)                                    │
│                    │                                                     │
│                    ▼                                                     │
│              [Intelligent Selector]                                      │
│                    │                                                     │
│        ┌──────────┼──────────┬──────────┐                               │
│        ▼          ▼          ▼          ▼                               │
│      [FTA]     [Skill]     [RAG]    [Direct]                            │
│                                                                          │
│  注: Intelligent Selector 仅做内部路由决策，                            │
│      不涉及服务发现或外部通信                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3. 统一的 LLM 调用路径

**所有 LLM 调用通过 Higress 网关**：

```python
# python/src/resolveagent/llm/higress_provider.py
class HigressLLMProvider(LLMProvider):
    """通过 Higress 网关调用 LLM"""
    
    async def chat(self, messages, model=None, **kwargs):
        # 从 Registry 获取模型端点
        model_info = await registry.get_model_route(model)
        endpoint = f"{self.gateway_url}{model_info.gateway_endpoint}"
        
        # 通过 Higress 发送请求
        response = await self._client.post(endpoint, json=payload)
        return response
```

好处：
- 集中的速率限制和配额管理
- 自动故障转移到备用模型
- 统一的流量监控和可观测性
- 跨租户的负载均衡

### 4. 认证流程统一

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         认证处理流程                                     │
│                                                                          │
│  请求 (JWT/API Key) ──▶ [Higress 网关]                                  │
│                              │                                           │
│                              │ 验证 JWT/API Key                          │
│                              │ 提取用户信息                              │
│                              │                                           │
│                              ▼                                           │
│                    设置 X-Auth-User, X-Auth-Roles 头                    │
│                              │                                           │
│                              ▼                                           │
│                    [Platform Service]                                    │
│                              │                                           │
│                              │ AuthMiddleware 读取网关头                │
│                              │ 或进行二次验证                            │
│                              │                                           │
│                              ▼                                           │
│                    SetAuthContext(ctx)                                   │
│                              │                                           │
│                              ▼                                           │
│                    Handler 使用 AuthContext                              │
└─────────────────────────────────────────────────────────────────────────┘
```

## 关键组件

### Go 侧组件

| 组件 | 路径 | 职责 |
|------|------|------|
| `GatewayConfig` | `pkg/config/types.go` | Higress 配置结构 |
| `Client` | `pkg/gateway/client.go` | Higress Admin API 客户端 |
| `RouteSync` | `pkg/gateway/route_sync.go` | Registry → Higress 路由同步 |
| `ModelRouter` | `pkg/gateway/model_router.go` | LLM 模型路由管理 |
| `AuthMiddleware` | `pkg/server/middleware/auth.go` | 统一认证中间件 |
| `RegistryService` | `api/proto/resolveagent/v1/registry.proto` | Python 查询 Registry 的 gRPC API |

### Python 侧组件

| 组件 | 路径 | 职责 |
|------|------|------|
| `RegistryClient` | `python/src/resolveagent/runtime/registry_client.py` | 查询 Go Registry 的 gRPC 客户端 |
| `HigressLLMProvider` | `python/src/resolveagent/llm/higress_provider.py` | 通过 Higress 调用 LLM |
| `HigressEmbeddingProvider` | `python/src/resolveagent/llm/higress_provider.py` | 通过 Higress 生成嵌入 |
| `IntelligentSelector` | `python/src/resolveagent/selector/selector.py` | Agent 内部路由决策 |

## 配置说明

### 完整的网关配置

```yaml
gateway:
  # 启用 Higress 集成
  enabled: true
  
  # Higress Admin API 地址
  admin_url: "http://localhost:8888"
  
  # 路由同步间隔
  sync_interval: "30s"
  
  # LLM 模型路由
  model_routing:
    enabled: true
    default_model: "qwen-plus"
    base_path: "/llm"
  
  # 认证配置
  auth:
    enabled: true
    jwt_secret: "${JWT_SECRET}"
    jwt_issuer: "resolveagent"
    api_key_names:
      - "X-API-Key"
      - "Authorization"
  
  # 负载均衡
  load_balancer:
    strategy: "round_robin"
    health_check: true
    check_interval: "10s"
    unhealthy_count: 3
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
5. 转发到 https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation
      │
      ▼
6. 返回响应 → HigressLLMProvider → Agent
```

## 最佳实践

### 1. 避免重复的服务发现

❌ 错误做法:
```python
# Python 侧维护自己的服务注册表
class LocalServiceRegistry:
    def __init__(self):
        self.services = {}  # 重复的数据源
```

✅ 正确做法:
```python
# 始终通过 Go Registry 查询
from resolveagent.runtime.registry_client import get_registry_client

async def get_skill(skill_name: str):
    registry = get_registry_client()
    return await registry.get_skill(skill_name)
```

### 2. 统一的 LLM 调用

❌ 错误做法:
```python
# 直接调用 LLM API
import httpx
response = await httpx.post("https://api.qwen.com/...", ...)
```

✅ 正确做法:
```python
# 通过 Higress 网关调用
from resolveagent.llm.higress_provider import HigressLLMProvider

provider = HigressLLMProvider()
response = await provider.chat(messages, model="qwen-plus")
```

### 3. 认证处理

❌ 错误做法:
```go
// 在每个 handler 中自行验证 JWT
func handler(w http.ResponseWriter, r *http.Request) {
    token := r.Header.Get("Authorization")
    // ... 验证逻辑
}
```

✅ 正确做法:
```go
// 使用统一的 AuthMiddleware
func main() {
    authMiddleware := middleware.NewAuthMiddleware(config, logger)
    router.Use(authMiddleware.Middleware)
}

func handler(w http.ResponseWriter, r *http.Request) {
    auth := middleware.GetAuthContext(r.Context())
    // 直接使用已验证的 auth 信息
}
```

## 监控与可观测性

### 关键指标

| 指标 | 描述 |
|------|------|
| `resolveagent_gateway_route_sync_total` | 路由同步次数 |
| `resolveagent_gateway_route_sync_errors` | 路由同步错误 |
| `resolveagent_llm_requests_total` | LLM 请求总数 |
| `resolveagent_llm_request_duration_seconds` | LLM 请求延迟 |
| `resolveagent_registry_queries_total` | Registry 查询次数 |

### 日志追踪

所有组件的日志都包含 trace_id，可以追踪完整的请求链路：

```
[Higress] trace_id=abc123 path=/api/v1/agents/001/execute status=200
[Platform] trace_id=abc123 agent_id=001 action=execute
[Runtime] trace_id=abc123 route_decision=skill target=log-analyzer
[Higress] trace_id=abc123 path=/llm/models/qwen-plus model=qwen-plus tokens=150
```

## 参考资料

- [Higress 官方文档](https://higress.io/docs/)
- [AgentScope 官方文档](https://modelscope.github.io/agentscope/)
- [ResolveAgent 架构概览](overview.md)
- [智能选择器设计](intelligent-selector.md)
