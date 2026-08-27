---
kind: external_dependency
name: Higress AI 网关（模型路由与鉴权）
slug: higress-ai-gateway
category: external_dependency
category_hints:
    - vendor_identity
    - auth_protocol
scope:
    - '**'
source_files:
    - README.md
    - python/src/resolveagent/llm/higress_provider.py
    - deploy/docker-compose/docker-compose.yaml
---

### 身份与角色
- 阿里云开源的 AI 网关，作为 ResolveAgent 架构中的统一入口，承担模型路由、认证、限流、负载均衡等能力。
- 架构图显示 Client → Higress → Platform 的流量路径，Platform 通过 `RESOLVEAGENT_GATEWAY_*` 环境变量与之对接。

### 集成方式
- Platform 侧通过 `RESOLVEAGENT_GATEWAY_ENABLED/ADMIN_URL/JWT_SECRET` 等变量控制是否启用网关模式。
- Python 侧 `higress_provider.py` 提供基于 base_url 的 provider 构建逻辑，支持将请求转发到上游网关。

### 关键约束
- 默认关闭（`RESOLVEAGENT_GATEWAY_ENABLED=false`）；启用后需配置 JWT Secret 进行认证；负载平衡策略默认 round_robin。