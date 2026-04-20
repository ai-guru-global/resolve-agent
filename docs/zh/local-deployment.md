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
| psql | PostgreSQL 16 客户端 | 执行数据库迁移和种子数据导入 |

## 架构概览

```
┌──────────────────────────────────────────────────┐
│                   WebUI (React)                   │
│                 http://localhost:3000              │
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

> **重要**: 本地开发模式（`start-local.sh deps`）使用的是 `docker-compose.deps.yaml`，PostgreSQL 容器**不会自动执行** `init-db.sql`。必须手动执行迁移脚本。

### 3.1 执行全量迁移

```bash
# 设置数据库连接（与 .env 一致）
export DATABASE_URL="postgres://resolveagent:resolveagent@localhost:5432/resolveagent?sslmode=disable"

# 执行全量迁移（按序号依次执行 001~010 共 11 个 .up.sql 文件）
make migrate-up
```

迁移脚本位于 `scripts/migration/`，包含以下表结构：

| 迁移文件 | 创建内容 |
|----------|----------|
| `001_init.up.sql` | 基础表：agents、skills、workflows、models、audit_log |
| `002_hooks.up.sql` | Hooks 机制 |
| `003_rag_documents.up.sql` | RAG 文档存储 |
| `004_fta_documents.up.sql` | FTA 故障树文档 |
| `005_code_analysis.up.sql` | 代码分析结果 |
| `006_memory.up.sql` | Agent 记忆系统 |
| `007_indexes.up.sql` | 性能索引 |
| `008_call_graphs.up.sql` | 调用图存储 |
| `008_troubleshooting_solutions.up.sql` | 排障方案 |
| `009_traffic_captures.up.sql` | 流量捕获 |
| `010_traffic_graphs.up.sql` | 流量拓扑图 |

### 3.2 导入种子数据

```bash
make seed
```

种子数据（`scripts/seed/seed.sql`）会插入：

- **3 个 Qwen 模型注册**：qwen-plus、qwen-turbo、qwen-max
- **1 个默认 Agent**：`default-agent`，使用 qwen-plus 模型，hybrid 选择策略

### 3.3 回滚迁移（如需）

```bash
make migrate-down
```

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
| **WebUI** | http://localhost:3000 | React 前端界面（热重载） |
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
| `make migrate-up` | 执行数据库迁移 |
| `make migrate-down` | 回滚数据库迁移 |
| `make seed` | 导入种子数据 |
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

### Migration 执行失败

常见原因：PostgreSQL 尚未完全就绪。等待几秒后重试：

```bash
./scripts/start-local.sh status   # 确认 postgres 为 running
make migrate-up
```

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
