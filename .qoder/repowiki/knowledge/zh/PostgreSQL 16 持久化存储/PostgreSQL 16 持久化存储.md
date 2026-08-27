---
kind: external_dependency
name: PostgreSQL 16 持久化存储
slug: postgresql
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
- 平台主数据库，承载 9 大 Registry（Agent/Skill/Workflow/Memory/等）的元数据、用户认证、审计日志、工作流定义等结构化数据。
- Go Platform 通过 `jackc/pgx/v5` 连接，Python Runtime 通过 SQL 迁移脚本初始化 schema。

### 集成方式
- Docker Compose 以 `postgres:16-alpine` 启动，端口 5432，通过 `init-db.sql` 初始化 schema。
- 环境变量统一为 `RESOLVEAGENT_DATABASE_*`（host/port/user/password/dbname/sslmode），由 Platform 注入。

### 关键约束
- 生产部署需配置密码环境变量（`RESOLVEAGENT_DATABASE_PASSWORD` 必填），默认 SSL 关闭；迁移脚本位于 `scripts/migration/`。