# ResolveAgent 本地部署指南

> 本文档详细说明如何在本地环境中部署和运行 ResolveAgent 全栈服务，包括依赖服务启动、数据库初始化、Mock 数据导入以及使用真实 LLM API Key 运行 Agent。

## 前提条件

| 工具 | 最低版本 | 用途 |
|------|----------|------|
| Docker Desktop | 最新版 | 运行 PostgreSQL / Redis / NATS / Milvus |
| Go | >= 1.22 | 编译 Go 平台服务 |
| Node.js | >= 20 | 前端 WebUI 开发服务器 |
| pnpm | 最新版 | 前端包管理 |
| Python | >= 3.11 | Agent 运行时 |
| uv | 最新版（推荐） | Python 依赖管理（也可用 pip） |
| psql | PostgreSQL 16 客户端 | 导入种子数据、查看迁移状态与排查数据问题 |

## 架构概览

```
┌──────────────────────────────────────────────────┐
│                   WebUI (React)                   │
│                 http://localhost:5174              │
└──────────────────┬───────────────────────────────┘
                   │ HTTP
┌──────────────────▼───────────────────────────────┐
│             Platform Service (Go)                 │
│          HTTP :8080  ·  gRPC :9090               │
└──┬───────────┬──────────┬──────────┬─────────────┘
   │           │          │          │
   ▼           ▼          ▼          ▼
PostgreSQL   Redis      NATS    Runtime (Python)
  :5432      :6379      :4222     gRPC :9091
                                     │
                                     ▼
                                LLM API (Qwen/Wenxin/Zhipu)
```

## Step 1: 配置环境变量

### 1.1 复制环境文件

```bash
cd /path/to/resolve-agent
cp .env.example .env
```

### 1.2 填入真实 LLM API Key

编辑 `.env` 文件，**至少配置一个** LLM API Key：

```env
# ── 服务地址 ──
RESOLVEAGENT_HTTP_ADDR=:8080
RESOLVEAGENT_GRPC_ADDR=:9090
RESOLVEAGENT_LOG_LEVEL=info
RESOLVEAGENT_LOG_FORMAT=text

# ── 数据库 ──
DATABASE_URL=postgres://resolveagent:resolveagent@localhost:5432/resolveagent?sslmode=disable

# ── Redis ──
RESOLVEAGENT_REDIS_ADDR=localhost:6379
RESOLVEAGENT_REDIS_PASSWORD=
RESOLVEAGENT_REDIS_DB=0

# ── NATS ──
RESOLVEAGENT_NATS_URL=nats://localhost:4222

# ── Agent 运行时 ──
RESOLVEAGENT_RUNTIME_GRPC_ADDR=localhost:9091

# ── Higress AI Gateway（本地可关闭）──
RESOLVEAGENT_GATEWAY_ENABLED=false

# ── LLM API Keys（至少配置一个）──
RESOLVEAGENT_LLM_QWEN_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx   # 通义千问（推荐）
RESOLVEAGENT_LLM_WENXIN_API_KEY=                              # 文心一言（可选）
RESOLVEAGENT_LLM_ZHIPU_API_KEY=                               # 智谱 GLM（可选）

# ── 遥测（本地可关闭）──
RESOLVEAGENT_TELEMETRY_ENABLED=false
```

### 1.3 模型注册信息

默认模型配置见 `configs/models.yaml`，系统预置以下模型：

| Model ID | Provider | 最大 Token | 说明 |
|-----------|----------|-----------|------|
| `qwen-turbo` | qwen | 8,192 | 快速响应 |
| `qwen-plus` | qwen | 32,768 | 均衡性能（**默认模型**） |
| `qwen-max` | qwen | 32,768 | 最高质量 |
| `ernie-4` | wenxin | 8,192 | 百度文心 |
| `glm-4` | zhipu | 8,192 | 智谱清言 |

## Step 2: 启动依赖服务

### 2.1 一键启动依赖容器

```bash
./scripts/start-local.sh deps
```

该命令会通过 `deploy/docker-compose/docker-compose.deps.yaml` 启动以下容器：

| 服务 | 镜像 | 地址 | 用途 |
|------|------|------|------|
| PostgreSQL 16 | `postgres:16-alpine` | localhost:5432 | 关系型数据存储 |
| Redis 7 | `redis:7-alpine` | localhost:6379 | 缓存 & 会话存储 |
| NATS 2 | `nats:2-alpine` | localhost:4222 | JetStream 消息总线 |
| Milvus 2.4 | `milvusdb/milvus:v2.4-latest` | localhost:19530 | 向量数据库 |

### 2.2 验证依赖状态

```bash
./scripts/start-local.sh status
```

等待所有依赖显示为绿色 `●` 状态后再继续。

## Step 3: 数据库初始化

> **重要**: 本地开发模式（`start-local.sh deps`）使用的是 `docker-compose.deps.yaml`，PostgreSQL 容器**不会自动执行** `init-db.sql`。表结构由**平台服务启动时自动创建**，不需要手动跑迁移脚本——见 3.1。

### 3.1 表结构：平台启动时自动迁移

唯一的权威迁移链内嵌在 Go 平台里（`pkg/store/postgres/postgres.go` 的 `Migrate()`），当 `store.backend: postgres` 时在平台进程启动阶段执行：

```go
// pkg/server/server.go
if err := pgStore.Migrate(context.Background()); err != nil {
    _ = pgStore.Close()
    return nil, fmt.Errorf("failed to migrate postgres: %w", err)
}
```

- 已应用版本记录在 `schema_migrations` 表；当前迁移链为 **version 1~16**，在 `public` schema 下创建 23 张业务表（agents、skills、workflows、model_routes、hooks、hook_executions、rag_documents、rag_collections、rag_ingestion_history、fta_documents、fta_analysis_results、code_analyses、code_analysis_findings、memory_short_term、memory_long_term、call_graphs、call_graph_nodes、call_graph_edges、traffic_captures、traffic_records、traffic_graphs、solutions、solution_executions）。
- 以 PostgreSQL 模式首次启动平台（Step 5）即完成建表，重复启动幂等。
- 因此本地开发**不需要**执行任何手动迁移命令。

确认迁移状态：

```bash
export DATABASE_URL="postgres://resolveagent:resolveagent@localhost:5432/resolveagent?sslmode=disable"
psql "$DATABASE_URL" -c 'SELECT version, applied_at FROM schema_migrations ORDER BY version;'
```

> **`make migrate-up` / `make migrate-down` 已废弃**（见 `scripts/migration/README.md`）。
> `scripts/migration/` 下的 SQL 是**另一套不兼容的 schema**：`resolveagent` schema + `UUID` 主键，而 Go 迁移链是 `public` schema + `VARCHAR(64)` 主键。对平台管理的数据库执行它们会与 Go 迁移链冲突，两个 Make 目标现在只会先打印警告。需要改表结构请扩展 Go 迁移链，不要新增 SQL 文件。

### 3.2 导入种子数据（可选）

```bash
make seed
```

种子入口 `scripts/seed/seed.sql` 混合了两套 schema，**在只跑过 Go 迁移链的库上只能部分成功**：

| 部分 | 目标 schema | 内容 | 对 Go 迁移链是否可用 |
|------|------------|------|---------------------|
| Part 1~6（`seed-agents/skills/workflows/fta/rag.sql`） | `public` | 7 agents、26 skills、42 workflows、11 FTA 故障树、102 RAG 文档（45 个 collection） | ✅ 列结构与 Go DDL 一致 |
| Part 0（默认模型与 `default-agent`）、Part 7（`seed-solutions.sql`） | `resolveagent` | 6 个模型注册、1 个默认 Agent、8 个排障方案 | ❌ 依赖 `models`、`troubleshooting_solutions` 表与 `agents.display_name` 列，Go 迁移链中均不存在 |

`make seed` 调用 psql 时**没有设置 `ON_ERROR_STOP`**，Part 0 / Part 7 的语句失败后 psql 会继续执行并以退出码 0 返回。也就是说 `make seed` 会在打印 `relation "models" does not exist` 之类错误的同时“成功”完成，Part 1~6 的数据仍然入库。

只想加载 Go schema 部分（推荐）：

```bash
for f in seed-agents seed-skills seed-workflows seed-fta seed-rag; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "scripts/seed/$f.sql"
done
```

### 3.3 重置数据库（如需）

Go 迁移链只提供向前迁移，没有回滚目标。本地开发要重来，直接重建库最快：

```bash
psql "$DATABASE_URL" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
./scripts/start-local.sh platform   # 重新启动，平台会自动重建全部表
```

> 这会删除本地数据库里的**全部**数据，仅限开发环境使用。

## Step 4: 存储后端配置

平台服务的存储配置文件为 `configs/resolveagent.yaml`。

### 内存模式（默认，适合快速试跑）

```yaml
store:
  backend: "memory"
  registries:
    hooks: "memory"
    rag_documents: "memory"
    fta_documents: "memory"
    code_analysis: "memory"
    memory: "memory"
```

> 数据仅存在于进程内存，服务重启后丢失。

### PostgreSQL 持久化模式（推荐正式使用）

将 `configs/resolveagent.yaml` 中的 `store` 部分改为：

```yaml
store:
  backend: "postgres"
  registries:
    hooks: "postgres"
    rag_documents: "postgres"
    fta_documents: "postgres"
    code_analysis: "postgres"
    memory: "postgres"
```

## Step 5: 启动应用服务

### 方式 A：一键启动全部

```bash
./scripts/start-local.sh
```

这会依次执行：
1. 启动依赖服务（Docker）
2. 等待依赖就绪
3. 编译并启动 Go 平台服务
4. 启动 Python Agent 运行时
5. 启动 WebUI 开发服务器

### 方式 B：分步启动（推荐调试时使用）

```bash
# 如果依赖已在 Step 2 启动，跳过 deps

# 编译并启动 Go 平台服务
./scripts/start-local.sh platform

# 启动 Python Agent 运行时
./scripts/start-local.sh runtime

# 启动 WebUI 开发服务器
./scripts/start-local.sh web
```

### Python 运行时依赖安装

首次启动 runtime 前，确保 Python 依赖已安装：

```bash
cd python
uv sync          # 推荐方式
# 或 pip install -e ".[dev,rag]"
cd ..
```

### Node.js 前端依赖安装

首次启动 web 前（脚本会自动检测并安装）：

```bash
cd web
pnpm install
cd ..
```

## Step 6: 验证服务

### 6.1 服务端口一览

| 服务 | 地址 | 说明 |
|------|------|------|
| **WebUI** | http://localhost:5174 | React 前端界面（热重载） |
| **Platform HTTP** | http://localhost:8080 | Go 平台 REST API |
| **Platform gRPC** | localhost:9090 | Go 平台 gRPC 接口 |
| **Runtime gRPC** | localhost:9091 | Python Agent 运行时 |
| **PostgreSQL** | localhost:5432 | 数据库 |
| **Redis** | localhost:6379 | 缓存 |
| **NATS** | localhost:4222 | 消息总线 |
| **NATS Monitor** | http://localhost:8222 | NATS 监控界面 |
| **Milvus** | localhost:19530 | 向量数据库 |

### 6.2 状态检查

```bash
./scripts/start-local.sh status
```

### 6.3 查看日志

```bash
# 平台服务日志
tail -f .pids/platform.log

# Agent 运行时日志
tail -f .pids/runtime.log

# WebUI 日志
tail -f .pids/webui.log

# Docker 依赖服务日志
./scripts/start-local.sh logs
```

## 常用运维命令

| 命令 | 说明 |
|------|------|
| `./scripts/start-local.sh` | 启动全部服务 |
| `./scripts/start-local.sh deps` | 仅启动依赖服务 |
| `./scripts/start-local.sh platform` | 仅启动 Go 平台服务 |
| `./scripts/start-local.sh runtime` | 仅启动 Python Agent 运行时 |
| `./scripts/start-local.sh web` | 仅启动 WebUI 开发服务器 |
| `./scripts/start-local.sh status` | 查看服务状态 |
| `./scripts/start-local.sh stop` | 停止全部服务 |
| `./scripts/start-local.sh logs` | 查看依赖服务日志 |
| `make seed` | 导入种子数据（仅 Go schema 部分生效，见 Step 3.2） |
| ~~`make migrate-up`~~ / ~~`make migrate-down`~~ | **已废弃**：表结构由平台启动时自动迁移（见 Step 3.1） |
| `make build-go` | 重新编译 Go 服务 |
| `make build-web` | 构建前端生产包 |
| `make test` | 运行全部测试 |

## 故障排查

### Docker 未启动

```
✘ 未找到 docker 命令，请先安装 Docker Desktop
```

解决：安装并启动 Docker Desktop，脚本会自动尝试唤起 Docker Desktop（macOS）。

### PostgreSQL 连接失败

```bash
# 检查容器状态
docker ps | grep resolveagent-postgres

# 手动测试连接
psql "postgres://resolveagent:resolveagent@localhost:5432/resolveagent?sslmode=disable" -c "SELECT 1"
```

### 平台启动时迁移失败

平台启动没有重试机制：`postgres.New()` 或 `Migrate()` 一旦失败，进程直接以 `failed to connect to postgres` / `failed to migrate postgres` 退出。最常见的原因是 PostgreSQL 容器还没就绪。等待其 running 后重启平台：

```bash
./scripts/start-local.sh status     # 确认 postgres 为 running
psql "$DATABASE_URL" -c "SELECT 1"  # 手动确认连接可用
./scripts/start-local.sh platform   # 重启平台，迁移会自动重跑
```

迁移是幂等的（逐版本 `CREATE TABLE IF NOT EXISTS` + `schema_migrations` 记录），重启不会破坏已有数据。

### Python 运行时启动失败

```bash
# 确保 Python 依赖已安装
cd python && uv sync && cd ..

# 检查日志
tail -50 .pids/runtime.log
```

### 端口冲突

如果本地已有服务占用 5432 / 6379 / 8080 等端口，修改 `.env` 中的对应端口配置，并同步更新 `configs/resolveagent.yaml`。

## 相关文档

- [架构设计](./architecture.md)
- [配置参考](./configuration.md)
- [数据库 Schema](./database-schema.md)
- [快速入门](./quickstart.md)
- [Docker 部署](./deployment.md)
