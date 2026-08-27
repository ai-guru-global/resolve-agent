---
kind: configuration_system
name: ResolveAgent 配置系统：Viper 分层加载与多源配置管理
category: configuration_system
scope:
    - '**'
source_files:
    - pkg/config/config.go
    - pkg/config/types.go
    - configs/resolveagent.yaml
    - configs/runtime.yaml
    - configs/models.yaml
    - .env.example
    - deploy/docker-compose/.env.example
    - internal/cli/config/config.go
---

## 1. 使用的系统与框架

- **核心库**：Go 端使用 `github.com/spf13/viper` 作为统一的配置加载器，负责 YAML 文件、环境变量、默认值的合并与类型反序列化。
- **CLI 配置**：`internal/cli/config` 基于 `spf13/cobra` + `viper` 提供 `resolveagent config {set|get|view|init}` 子命令，用于用户级 CLI 配置管理。
- **Python 运行时**：通过独立的 `configs/runtime.yaml` 描述 Agent Runtime（Python）的运行时参数，由 Python 侧自行加载（与 Go 平台配置解耦）。
- **模型注册表**：`configs/models.yaml` 集中声明可用的 LLM 模型（id/provider/model_name/base_url/max_tokens/default_temperature），供运行时按 id 选择。

## 2. 关键文件

| 文件 | 作用 |
|---|---|
| `pkg/config/config.go` | 平台配置加载入口 `Load(configPath)`，定义默认值、搜索路径、环境变量映射、敏感字段校验 |
| `pkg/config/types.go` | 全部配置结构体定义（Server/Database/Redis/NATS/Runtime/Gateway/Telemetry/Store）及 mapstructure tag |
| `configs/resolveagent.yaml` | 平台主配置文件（server/database/redis/nats/gateway/telemetry/store/mcp/feedback/observability_loop） |
| `configs/runtime.yaml` | Python Agent Runtime 独立配置（selector/telemetry/store/memory/circuit_breaker/adaptive） |
| `configs/models.yaml` | LLM 模型清单（qwen/wenxin/zhipu/kimi/mimo） |
| `.env.example` / `deploy/docker-compose/.env.example` | 所有 `RESOLVEAGENT_*` 环境变量的完整清单与说明 |
| `internal/cli/config/config.go` | CLI 的 `config` 命令组（set/get/view/init），写入 `~/.resolveagent/config.yaml` |
| `deploy/helm/resolveagent/values.yaml` | Helm Chart 中覆盖平台/运行时配置的部署层入口 |

## 3. 架构与约定

### 3.1 配置来源优先级（从高到低）

`pkg/config/config.go` 中 `Load()` 的执行顺序即生效顺序：

1. **命令行传入的配置文件路径**（`configPath` 非空时直接 `SetConfigFile`）
2. **环境变量**：前缀 `RESOLVEAGENT_`，`.` 用 `_` 替换（如 `database.host` → `RESOLVEAGENT_DATABASE_HOST`），通过 `AutomaticEnv()` 自动绑定
3. **YAML 配置文件**：按以下顺序查找并合并（后找到者覆盖前者）：当前目录、`/etc/resolveagent`、`$HOME/.resolveagent`
4. **硬编码默认值**：在 `Load()` 开头通过 `SetDefault` 声明，涵盖 server、database、redis、nats、runtime、gateway、telemetry 等全部键
5. **最终反序列化**为 `pkg/config/types.go` 中的 `Config` 结构体

### 3.2 配置结构分层

`Config` 根结构按子系统划分：
- `server`：HTTP/gRPC 监听地址
- `database`：PostgreSQL 连接（含 `DSN()` 方法构造 DSN）
- `redis`：缓存与会话
- `nats`：消息总线
- `runtime`：Python 运行时的 gRPC 地址
- `gateway`：Higress AI Gateway 集成（admin_url/sync_interval/model_routing/auth/load_balancer）
- `telemetry`：OpenTelemetry 开关、OTLP endpoint、service name、metrics
- `store`：注册表后端选择（`backend: "memory"|"postgres"`，支持 per-registry override 的 `registries` 映射）

### 3.3 多进程/多组件配置分离

- **Go 平台**：通过 `pkg/config.Load()` 加载 `resolveagent.yaml` 或环境变量
- **Python 运行时**：独立 `configs/runtime.yaml`，包含 selector、memory、circuit_breaker、adaptive 等运行时特有项，与平台配置互不干扰
- **模型清单**：`configs/models.yaml` 是纯数据声明，被 Python 运行时按需读取，不属于平台启动配置

### 3.4 敏感字段安全校验

`validateSensitiveFields()` 在加载完成后检查：
- `database.password` 为空时打印警告
- `gateway.auth.enabled && gateway.auth.jwt_secret` 为空时打印警告
- `redis.password` 为空时打印警告
这些警告引导用户在生产环境通过 `RESOLVEAGENT_*` 环境变量注入密钥。

### 3.5 CLI 用户配置

`internal/cli/config` 提供用户级配置管理：
- `resolveagent config init` 创建 `~/.resolveagent/config.yaml`
- `resolveagent config set/get/view` 读写该文件
- 与平台服务配置（`pkg/config`）完全独立，服务于 CLI 自身行为（如服务器地址、API version）

### 3.6 环境变量命名规范

所有可配置项均提供 `RESOLVEAGENT_<SECTION>_<KEY>` 形式的环境变量（见 `.env.example`），例如：
- `RESOLVEAGENT_DATABASE_PASSWORD`
- `RESOLVEAGENT_GATEWAY_AUTH_JWT_SECRET`
- `RESOLVEAGENT_TELEMETRY_OTLP_ENDPOINT`
- `RESOLVEAGENT_LLM_QWEN_API_KEY`（Python 运行时侧使用）

## 4. 约定与约束

- **配置文件必须为 YAML**：`SetConfigType("yaml")` 强制格式
- **环境变量前缀固定为 `RESOLVEAGENT_`**：通过 `SetEnvPrefix` 统一，禁止使用其他前缀
- **键名到环境变量的转换规则**：点号分隔的 key（如 `gateway.model_routing.default_model`）映射为下划线大写（`GATEWAY_MODEL_ROUTING_DEFAULT_MODEL`）
- **配置文件可选**：`ReadInConfig` 忽略 `ConfigFileNotFoundError`，允许仅靠环境变量运行
- **默认值集中声明**：所有默认值集中在 `pkg/config/config.go` 的 `SetDefault` 调用中，新增配置项需在此处补充默认值
- **敏感字段不得明文写在配置文件中**：`resolveagent.yaml` 中 password/jwt_secret 默认为空字符串，并通过注释提示通过环境变量注入
- **存储后端可切换**：`store.backend` 支持 `memory`（开发）和 `postgres`（生产），并可按 registry 维度单独覆盖
- **Helm/Compose 覆盖方式**：部署层通过 `deploy/helm/resolveagent/values.yaml` 与 `deploy/docker-compose/.env*` 注入配置，不修改源码中的 YAML
- **Python 运行时配置独立**：`configs/runtime.yaml` 不被 Go 平台加载，避免跨语言耦合；其结构与平台配置无共享 schema
- **反馈闭环与可观测性配置**：`resolveagent.yaml` 中 `feedback` 与 `observability_loop` 段以声明式方式启用指标聚合、告警与断路器动作，属于运行时可调的行为开关

## 5. 适用性判断

本仓库存在完整的、多层次的配置系统（Go 平台 + Python 运行时 + CLI + 部署层），因此本类别适用。