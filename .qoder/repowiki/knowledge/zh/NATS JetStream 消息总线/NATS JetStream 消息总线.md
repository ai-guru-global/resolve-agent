---
kind: external_dependency
name: NATS JetStream 消息总线
slug: nats-jetstream
category: external_dependency
category_hints:
    - vendor_identity
    - framework_behavior
scope:
    - '**'
source_files:
    - deploy/docker-compose/docker-compose.yaml
    - go.mod
---

### 身份与角色
- 平台内部事件总线，承载 AgentMessageBus（Pub/Sub + Request/Response）、FeedbackSignal 上报、组件间异步通信。
- Go Platform 通过 `nats-io/nats.go` 连接，Compose 以 `nats:2-alpine --js --store_dir /data` 启动 JetStream 模式。

### 集成方式
- 环境变量 `RESOLVEAGENT_NATS_URL` 指向 nats 服务（默认 `nats://nats:4222`）。
- Feedback 模块（collector/aggregator/ring_buffer/alerts/dispatcher）通过 NATS 接收 Python Runtime 上报的执行信号，实现 OODA 外环。

### 关键约束
- 当前 AgentMessageBus 仍为 in-memory pub/sub，尚未完全接入 NATS；FeedbackEmitter 需在 Harness post_step/on_error hook 中主动上报信号才能形成闭环。