---
kind: build_system
name: ResolveAgent 多语言统一构建与发布流水线
category: build_system
scope:
    - '**'
source_files:
    - Makefile
    - hack/setup-dev.sh
    - hack/quality-gate.sh
    - hack/generate-proto.sh
    - .github/workflows/ci.yaml
    - .github/workflows/release.yaml
    - .github/workflows/docker-publish.yaml
    - deploy/docker/platform.Dockerfile
    - deploy/docker/runtime.Dockerfile
    - deploy/docker/webui.Dockerfile
    - deploy/docker-compose/docker-compose.yaml
    - deploy/docker-compose/docker-compose.deps.yaml
    - deploy/helm/resolveagent/Chart.yaml
    - deploy/helm/resolveagent/values.yaml
    - tools/buf/buf.yaml
    - tools/buf/buf.gen.yaml
    - python/pyproject.toml
    - python/uv.lock
    - web/package.json
    - web/pnpm-lock.yaml
    - scripts/migration/001_init.up.sql
    - scripts/seed/seed.sql
    - VERSION
---

## 1. 使用的系统与工具

- **顶层 Makefile** (`Makefile`)：统一入口，聚合 Go/Python/Web 三端构建、测试、Lint、Docker 镜像、Helm 部署、数据库迁移与种子数据加载。
- **Go 构建**：`go build` + `-ldflags` 注入 `pkg/version`（Version/Commit/BuildDate），二进制输出到 `bin/resolveagent-server` 与 `bin/resolveagent-cli`。
- **Python 包管理**：`uv`（`uv sync` / `uv run pytest` / `uv run ruff` / `uv run mypy`），依赖锁定在 `python/pyproject.toml` + `python/uv.lock`。
- **Web 前端**：`pnpm`（`web/package.json` + `web/pnpm-lock.yaml`），Vite 构建产物输出到 `web/dist`。
- **Protobuf 代码生成**：`buf`（`tools/buf/buf.yaml` + `tools/buf/buf.gen.yaml`），通过 `make proto` 调用 `hack/generate-proto.sh`。
- **容器化**：三个独立 Dockerfile（`deploy/docker/platform.Dockerfile`、`runtime.Dockerfile`、`webui.Dockerfile`），均为多阶段构建；平台用 `golang:alpine` → `alpine`，运行时用 `python:slim` → `python:slim`，WebUI 用 `node:alpine` → `nginx:alpine`。
- **编排与部署**：`docker-compose`（`deploy/docker-compose/`）、Helm Chart（`deploy/helm/resolveagent/`）、Kustomize（`deploy/k8s/`）。
- **CI/CD**：GitHub Actions 四个工作流 — `ci.yaml`（PR/分支 lint→test→build→quality-gate）、`e2e.yaml`、`release.yaml`（tag 触发镜像+Helm 打包+Release Notes）、`docker-publish.yaml`（tag 推 GHCR）。
- **质量门禁**：`hack/quality-gate.sh` 统一执行 go vet/build/lint/test/ruff/mypy/web lint 并汇总 PASS/FAIL/WARN。
- **开发环境初始化**：`hack/setup-dev.sh` 校验 Go≥1.22、Python≥3.11、Node≥20，安装 uv/pnpm，创建默认配置 `~/.resolveagent/config.yaml`。

## 2. 关键文件

- `Makefile` — 全仓统一构建入口（build/test/lint/proto/docker/compose/helm/setup-dev/clean/fmt）
- `hack/setup-dev.sh` — 开发环境一键初始化
- `hack/quality-gate.sh` — 合并前质量门禁脚本
- `hack/generate-proto.sh` — Protobuf 代码生成
- `.github/workflows/ci.yaml` — PR/分支 CI（lint→test→build→quality-gate）
- `.github/workflows/release.yaml` — tag 触发 Release（镜像+Helm chart+Release Notes）
- `.github/workflows/docker-publish.yaml` — tag 直接推送镜像到 GHCR
- `deploy/docker/platform.Dockerfile` / `runtime.Dockerfile` / `webui.Dockerfile` — 三组件多阶段镜像定义
- `deploy/docker-compose/docker-compose.yaml` / `docker-compose.deps.yaml` — 本地/依赖编排
- `deploy/helm/resolveagent/Chart.yaml` / `values.yaml` / `templates/` — Helm Chart
- `tools/buf/buf.yaml` / `tools/buf/buf.gen.yaml` — Protobuf 规范与生成配置
- `python/pyproject.toml` / `python/uv.lock` — Python 依赖与锁定
- `web/package.json` / `web/pnpm-lock.yaml` — Web 依赖与锁定
- `mobile/package.json` — 移动端 Vite 项目
- `scripts/migration/*.up.sql` / `*.down.sql` — 数据库版本化迁移
- `scripts/seed/*.sql` — 种子数据
- `VERSION` + `pkg/version/version.go` — 版本号来源

## 3. 架构与约定

### 分层构建模型
- **Go 平台服务**（`cmd/resolveagent-server`、`cmd/resolveagent-cli`）编译为静态二进制，通过 `CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH}` 支持跨平台构建。
- **Python 运行时**（`python/src/resolveagent/runtime/server.py`）以模块方式运行，镜像内通过 `PYTHONPATH=/app/src` 暴露，依赖预装在 `/opt/venv`。
- **WebUI**（`web/`）由 Vite 构建为静态资源，由 Nginx 容器托管。
- **Mobile**（`mobile/`）独立 Node 工程，CI 中单独 tsc build。

### 版本注入策略
- 本地 `make`：`VERSION ?= $(git describe --tags --always --dirty || cat VERSION)`，通过 `-X pkg/version.Version` 注入。
- Docker 构建：`--build-arg VERSION` 或环境变量传入，同样注入 `pkg/version`。
- Release：GitHub Actions 从 `refs/tags/v*` 提取 tag 作为镜像 tag 与 Helm app-version。

### 测试矩阵
- Go：`go test -race -coverprofile=coverage.out ./...`，E2E 使用 `-tags=e2e`，Integration 使用 `-tags=integration`。
- Python：`pytest tests/ -v --cov=resolveagent`，覆盖率 XML 上传 artifact。
- Web：`pnpm test`（Jest/Vitest 未显式指定，按 `web/package.json` scripts）。
- Mobile：`tsc --noEmit` + `npm run build`。

### 数据库迁移
- 纯 SQL 版本化迁移，`scripts/migration/{NNN}_xxx.up.sql` / `.down.sql` 按数字顺序应用。
- `make migrate-up` / `migrate-down` 通过 `psql "$(DATABASE_URL)" -f` 顺序执行。
- `make seed` 加载 `scripts/seed/seed.sql` 及子文件。

### 镜像健康检查
- platform：`curl -f http://localhost:8080/healthz`
- runtime：`curl -f http://localhost:9091/healthz`
- webui：`wget -qO- http://localhost:80/`

## 4. 约定与约束

- **统一入口**：所有构建/测试/Lint/部署操作均通过 `make <target>` 触发，避免开发者直接调用各语言工具。
- **依赖锁定**：Python 使用 `uv.lock`，Web 使用 `pnpm-lock.yaml`，CI 中 `pnpm install --frozen-lockfile` 强制锁死。
- **Go 版本**：CI 固定 `GO_VERSION=1.23`，setup-dev 要求 ≥1.22；Dockerfile builder 使用 `golang:1.26-alpine`（较新基线）。
- **Python 版本**：CI 固定 `PYTHON_VERSION=3.12`，setup-dev 要求 ≥3.11；Dockerfile 使用 `python:3.14-slim`。
- **Node 版本**：CI 固定 `NODE_VERSION=20`，setup-dev 要求 ≥20；Web/Dockerfile 使用 `node:25-alpine`（builder 可更新）。
- **Lint 即门控**：CI 分 stage 执行 golangci-lint、ruff check/format、ESLint，任一失败阻断后续步骤。
- **质量门禁**：`hack/quality-gate.sh` 将 Go/Python/Web 三类检查聚合为单一 PASS/FAIL，被 CI quality-gate job 调用。
- **镜像标签**：Release 同时打 `{version}` 与 `latest` 双标签；CI 仅打 `:ci` 临时标签。
- **非交互式用户**：所有 Dockerfile 使用 `adduser -D -u 1000 resolveagent` 并以该用户运行，最小权限原则。
- **配置挂载**：platform/runtime 镜像将 `configs/` 复制到 `/etc/resolveagent/`，运行时通过命令行参数或环境变量覆盖。
- **Protobuf 契约**：接口变更需先修改 `api/proto/` 并通过 `make proto` 重新生成，buf lint 在 `make lint-proto` 中校验。
- **Helm 命名空间**：默认安装到 `resolveagent` 命名空间（`make helm-install` 带 `--namespace resolveagent --create-namespace`）。
- **数据库 URL**：迁移与种子任务要求设置 `DATABASE_URL` 环境变量，否则命令无法执行。