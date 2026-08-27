---
kind: dependency_management
name: 多语言依赖管理：Go/Python/Node 三套包管理器与统一自动化升级
category: dependency_management
scope:
    - '**'
source_files:
    - go.mod
    - go.sum
    - python/pyproject.toml
    - python/uv.lock
    - web/package.json
    - web/pnpm-lock.yaml
    - web/.npmrc
    - mobile/package.json
    - docs-site/package.json
    - .github/dependabot.yml
---

## 1. 使用的系统与工具

本仓库是一个多语言工程，按语言分别采用各自生态的标准依赖管理方案：
- **Go（平台核心）**：使用 `go.mod` + `go.sum` 作为模块声明与锁定文件，位于仓库根目录；未启用 vendor 目录，依赖通过 Go Module Proxy 拉取。
- **Python（运行时）**：使用 `python/pyproject.toml`（Hatchling 构建后端）声明依赖，配合 `python/uv.lock` 由 uv 生成并锁定所有传递依赖的精确版本与哈希；可选依赖通过 `[project.optional-dependencies]` 分组（`rag`、`dev`），并通过 `dependency-groups.dev` 声明类型定义等开发依赖。
- **Web/Mobile/Docs 前端**：`web/`、`mobile/`、`docs-site/` 各自维护独立的 `package.json`，并使用 pnpm（`pnpm-lock.yaml`）、npm（`package-lock.json`）锁文件进行锁定；其中 Web 端同时存在 `package-lock.json` 和 `pnpm-lock.yaml`，但实际工作区配置为 pnpm（见 `web/pnpm-workspace.yaml`）。
- **Docker 镜像层**：`deploy/docker/` 下的 Dockerfile 构成“容器镜像”这一额外依赖源，由 GitHub Dependabot 按月扫描更新。
- **自动升级**：`.github/dependabot.yml` 统一配置了对 gomod、pip、npm、docker、github-actions 五大生态的定期 PR 升级策略。

## 2. 关键文件

| 领域 | 关键文件 | 作用 |
|---|---|---|
| Go | `go.mod`、`go.sum` | 声明 Go 模块名 `github.com/ai-guru-global/resolve-agent`、Go 版本 `1.25.0` 及全部 direct/indirect 依赖 |
| Python | `python/pyproject.toml`、`python/uv.lock` | 声明 Python 包 `resolveagent`、`requires-python >=3.11`、直接依赖与可选依赖，并由 uv 锁定完整依赖树 |
| Web UI | `web/package.json`、`web/pnpm-lock.yaml`、`web/.npmrc` | 声明 React/Vite/Tailwind 等依赖，pnpm 锁定，关闭 pnpm 11+ 默认 run 前 lockfile 校验 |
| Mobile | `mobile/package.json` | 轻量 React 移动端应用依赖 |
| Docs Site | `docs-site/package.json` | Docusaurus 文档站依赖，要求 Node `>=20.0` |
| 自动升级 | `.github/dependabot.yml` | 对 gomod/pip/npm/docker/github-actions 设置周/月级定时升级 |
| 本地代理 | `docs-site/docs/dev-guide/local-dev.md` | 建议设置 `GOPROXY=https://goproxy.cn,direct` 或 `proxy.golang.org,direct` |

## 3. 架构与约定

### 3.1 分层隔离的多包结构
每个子项目（Go 平台、Python 运行时、Web、Mobile、Docs）都是**独立可构建单元**，拥有自己的依赖清单与锁文件，互不共享。这使得各语言栈可以独立升级、独立发布。

### 3.2 依赖粒度与锁定策略
- **Go**：`go.mod` 中 direct 依赖使用语义化版本（如 `v1.10.2`、`v1.50.0`），间接依赖通过 `// indirect` 注释标注；`go.sum` 锁定每个模块的精确版本与哈希，保证构建可重现。
- **Python**：`pyproject.toml` 中的 `dependencies` 使用宽松范围（如 `>=0.1.0`、`>=6.0.0`），但 `uv.lock` 将解析后的完整依赖树（含传递依赖）以固定版本与 sha256 哈希形式锁定，实现“灵活声明 + 严格锁定”的组合。
- **Node**：`package.json` 使用 `^` 前缀的 caret 范围（如 `^18.3.1`、`^6.0.1`），由 pnpm/npm 生成锁文件锁定具体安装版本；Web 端还通过 `pnpm.onlyBuiltDependencies` 仅允许 `esbuild` 编译原生模块，减少构建体积。

### 3.3 可选依赖与功能开关
Python 运行时通过 `[project.optional-dependencies]` 将 RAG 向量库（`pymilvus`、`qdrant-client`）与开发工具（`pytest`、`ruff`、`mypy`）拆分为可选组，避免生产环境引入不必要的依赖。

### 3.4 私有/代理配置
- Go 侧未在 `go.mod` 中配置 `GOPRIVATE` 或自定义 `GOPROXY`，但开发文档建议在中国大陆环境设置 `GOPROXY=https://goproxy.cn,direct` 或 `https://proxy.golang.org,direct`。
- Web 端通过 `web/.npmrc` 设置 `verify-deps-before-run=false`，禁用 pnpm 11+ 默认的 run 前联网校验，解决网络慢时超时导致 Vite 无法启动的问题。

### 3.5 统一自动化升级
`.github/dependabot.yml` 是仓库级的依赖治理中枢：
- gomod：每周扫描根目录
- pip：每周扫描 `/python`
- npm：每周扫描 `/web`
- docker：每月扫描 `/deploy/docker`
- github-actions：每周扫描根目录
这保证了所有语言的依赖都能获得一致的升级节奏。

## 4. 约定与约束

- **禁止手写锁定文件**：Go 的 `go.sum`、Python 的 `uv.lock`、Node 的 `pnpm-lock.yaml`/`package-lock.json` 均由对应包管理器自动生成，不应手动编辑。
- **新增依赖必须同步提交锁文件**：修改 `go.mod`、`pyproject.toml`、`package.json` 后需重新生成对应锁文件并提交，否则 CI 可能因依赖不一致失败。
- **可选依赖按需引入**：Python 的 `rag`、`dev` 可选组应仅在需要时安装（如 `uv pip install -e '.[rag]'`），生产镜像不应包含开发依赖。
- **前端构建优化**：Web 端通过 `pnpm.onlyBuiltDependencies: ["esbuild"]` 限制原生模块构建范围，减少构建时间与体积。
- **Node 版本约束**：`docs-site/package.json` 通过 `engines.node >=20.0` 强制 Node 版本，确保文档站点构建一致性。
- **Go 版本锁定**：`go.mod` 顶部声明 `go 1.25.0`，所有开发者与 CI 必须使用该版本以保证依赖解析一致。
- **无 vendoring**：仓库未使用 `go mod vendor`，依赖直接从远程代理拉取，因此 GOPROXY 配置在离线或受限网络环境下尤为重要。
