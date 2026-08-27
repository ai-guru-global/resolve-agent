---
kind: external_dependency
name: Redis 7 缓存与会话存储
slug: redis
category: external_dependency
category_hints:
    - vendor_identity
    - client_constraint
scope:
    - '**'
source_files:
    - deploy/docker-compose/docker-compose.yaml
    - go.mod
---

### 身份与角色
- 会话存储、短期记忆（Episodic Memory）、Selector 决策缓存（LRU+TTL）、熔断器状态共享等场景的内存数据存储。
- Go 侧通过 `redis/go-redis/v9` 连接，Python 侧通过 Redis URL 配置。

### 集成方式
- Docker Compose 以 `redis:7-alpine` 启动，启用 AOF 持久化（`appendonly yes, appendfsync everysec`），最大内存 256MB，策略 `allkeys-lru`。
- 环境变量 `RESOLVEAGENT_REDIS_ADDR/PASSWORD/DB` 注入 Platform。

### 关键约束
- 默认无密码；生产环境应设置 `REDIS_PASSWORD`；Memory 层 episodic 使用 TTL 过期机制。