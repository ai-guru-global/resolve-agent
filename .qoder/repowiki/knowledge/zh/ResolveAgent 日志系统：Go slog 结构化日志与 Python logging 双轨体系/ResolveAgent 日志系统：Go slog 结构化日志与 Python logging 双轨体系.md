---
kind: logging_system
name: ResolveAgent 日志系统：Go slog 结构化日志与 Python logging 双轨体系
category: logging_system
scope:
    - '**'
source_files:
    - pkg/logger/logger.go
    - pkg/logger/logger_test.go
    - pkg/telemetry/logger.go
    - pkg/server/middleware/logging.go
    - cmd/resolveagent-server/main.go
    - internal/cli/serve.go
    - python/src/resolveagent/runtime/__main__.py
    - python/src/resolveagent/runtime/server.py
---

## 1. 使用的系统与框架

- **Go 侧**：基于标准库 `log/slog`（结构化日志），通过 `pkg/logger` 提供统一封装，并通过 `pkg/telemetry` 在可观测性子系统中复用。HTTP 请求日志由 `pkg/server/middleware/logging.go` 中的中间件统一输出。
- **Python 侧**：使用标准库 `logging`，每个模块以 `logger = logging.getLogger(__name__)` 获取命名 logger；运行时入口 `python/src/resolveagent/runtime/__main__.py` 通过 `logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")` 全局配置根 logger。

两个语言子系统各自独立初始化，没有跨语言的统一日志后端或集中式日志 SDK。

## 2. 关键文件与包

- `pkg/logger/logger.go`：Go 结构化日志抽象层，提供 `New`、`WithLevel`、`WithFormat`、`WithOutput`、`WithAttrs`、`Component`、`WithContext`/`FromContext`、`Nop` 等选项式 API。
- `pkg/telemetry/logger.go`：Telemetry 子系统的轻量级 `slog` 初始化器，按 level/format 选择 JSON/Text handler。
- `pkg/server/middleware/logging.go`：HTTP 访问日志中间件，记录 method/path/status/duration/remote_addr。
- `cmd/resolveagent-server/main.go`：生产 server 入口，直接构造 `slog.NewJSONHandler(os.Stdout, ...)` 并 `slog.SetDefault`。
- `internal/cli/serve.go`：CLI `serve` 子命令，构造 Text handler 并 `slog.SetDefault`。
- `python/src/resolveagent/runtime/__main__.py`：Python 运行时入口，调用 `logging.basicConfig(...)` 设置全局格式。
- `python/src/resolveagent/runtime/server.py`：gRPC/HTTP 运行时服务，所有模块通过 `logging.getLogger(__name__)` 使用。

## 3. 架构与约定

### Go 结构化日志
- **默认级别**：`info`；支持 `debug`/`warn`/`error`，未知值回退到 `info`。
- **默认格式**：`text`；可通过 `WithFormat("json")` 切换为 JSON 输出（便于容器化采集）。
- **输出目标**：默认 `os.Stdout`，可通过 `WithOutput(io.Writer)` 注入测试用 buffer。
- **组件作用域**：`Component(base, component)` 在每个日志条目中追加 `component` 字段，用于区分子系统。
- **上下文传播**：`WithContext(ctx, logger)` / `FromContext(ctx)` 将 logger 挂入 `context.Context`，缺失时回退到 `slog.Default()`。
- **测试友好**：提供 `Nop()` 丢弃所有输出的 logger。

### HTTP 请求日志
`middleware.Logging(logger)` 包装任意 `http.Handler`，在请求结束后以 `Info` 级别输出结构化字段：method、path、status、duration、remote_addr。

### Python 日志
- 每个模块顶部声明 `logger = logging.getLogger(__name__)`，形成以包路径为名的层级 logger。
- 运行时入口通过 `basicConfig` 一次性配置根 logger 的 level=INFO 和固定格式 `%(asctime)s [%(levelname)s] %(name)s: %(message)s`。
- 部分脚本（如 `corpus/kudig_rag_import.py`、`corpus/seed_vectorizer.py`）在局部再次调用 `basicConfig` 覆盖格式，属于独立工具场景。
- 日志内容多为人类可读文本，未强制结构化字段；错误堆栈通过 `logger.exception(...)` 输出。

### 进程级日志文件
仓库根 `.pids/` 目录下存在 `platform.log`、`runtime.log`、`webui.log`，表明各进程在部署时将 stdout/stderr 重定向至这些文件（由外部编排层负责，非代码内实现）。

## 4. 约定与约束

- **Go 必须使用 `log/slog`**：所有 Go 代码通过 `slog.Info/Error/Warn/Debug` 调用，禁止直接使用 `fmt.Println` 作为运行期日志。
- **日志级别语义**：`debug` 用于开发调试，`info` 为默认生产级别，`warn` 表示可恢复异常，`error` 表示失败路径；未知字符串一律降级为 `info`。
- **JSON 输出优先于 text**：生产 server (`cmd/resolveagent-server/main.go`) 默认使用 `slog.NewJSONHandler`，CLI 本地开发使用 Text handler；`pkg/logger` 也默认 text，需显式指定 json。
- **组件标识**：推荐通过 `logger.Component(base, "xxx")` 或 `With("component", "...")` 为每条日志附加组件名，便于过滤。
- **上下文传递**：跨 goroutine/函数边界应通过 `WithContext`/`FromContext` 传递 logger，避免全局 `slog.Default()` 隐式依赖。
- **Python 模块日志**：统一使用 `logging.getLogger(__name__)`，不在模块内重复 `basicConfig`；仅在顶层入口或独立脚本中配置根 logger。
- **HTTP 访问日志**：所有 HTTP 处理链必须经过 `middleware.Logging`，确保 method/path/status/duration 被一致记录。
- **无集中式 sink**：当前实现仅输出到 stdout/stderr，不写入文件、不发送到远端；日志落盘由部署层（Docker/Helm/容器运行时）完成。
- **测试隔离**：通过 `WithOutput(&buf)` 捕获日志，或通过 `Nop()` 禁用输出，保证单元测试可验证日志行为而不污染控制台。

## 5. 已知不一致点

- Go 侧有两个独立的 `slog` 初始化位置：`pkg/logger` 的选项式封装与 `pkg/telemetry` 的简化工厂，二者职责略有重叠但尚未合并。
- Python 侧并非全部模块都遵循单一 `basicConfig`：个别脚本在内部再次调用 `basicConfig`，可能覆盖全局配置。
- 目前没有在配置文件（`configs/*.yaml`）中集中声明 log_level/log_format，级别与格式硬编码在二进制入口中。
