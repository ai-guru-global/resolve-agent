# ResolveAgent 项目现状报告

| 项 | 值 |
|---|---|
| 报告日期 | 2026-10-04 |
| 分析基线 commit | `bc9d946`（2026-09-22，分析当时 `HEAD == origin/main`、工作树干净） |
| 实施后 HEAD | 基线之上 **12 个实施提交**（`6492367`..`0037e7b`）+ 本报告自身的沉淀与修订提交，均**尚未 push**；`origin/main` 仍为 `bc9d946` |
| 版本 | 0.3.0（`VERSION`、`python/pyproject.toml:3`、`web/package.json:4` 三处一致） |
| 分析方法 | 本地实跑质量门禁与 linter + GitHub Actions 远端日志取证 + 全量代码走查（只读） |
| 状态 | **实施完成**（§8 的 11 项中 10 项已落地，1d 已评估、待用户授权推送） |

> 本报告的所有结论均可由 §9 附录的命令复现。凡未能验证的判断，文中显式标注"未验证"。
>
> **阅读约定**：§1–§7 与 §9 是**基线 `bc9d946` 时的分析快照**，保持原样以留取证价值，不随实施回改；实施后的实际状态一律以 **§8 的状态列**与 **§10 实施记录**为准。§2.3 是唯一例外——它的原始数字本身测错了（见该节更正）。

---

## 1. 结论

代码主体健康：本地质量门禁 **9/10 通过**，Go 代码用 v2 默认 linter 跑出 **0 issues**，Python ruff/format/测试全绿，Web lint/test 全绿。

但**远端 CI 自 2026-09-22 起全红，已持续 12 天**，19 个 dependabot PR 全部阻塞。三处失败**均为工具链配置错配，无一源于代码质量**。修复成本低，收益是立刻恢复交付验证能力。

次级风险是**宣称与实现的落差**：`docs/ARCHITECTURE_IMPROVEMENTS_2026.md` 标记为 DONE 的 Planning 能力，其动作执行环节实为占位符；排查技能的命令执行同样是占位符。这与 `PRODUCT.md` 首条产品原则"证据先行"直接冲突。

> **实施后更正（2026-10-04）**：上述三条判断在基线时成立，处置结果见 §10。其中第 2 条（CI 全红）的三个根因已在 `6492367` 本地修完，门禁复跑 **10/10 全绿**；但因约定"不 push"，**远端 CI 仍是红的**，19 个 PR 仍全阻塞——解除阻塞需要用户授权推送。第 3 条按 §8 的方案 (b) 处置（降级宣称而非伪造实现），另在核查中发现并修掉一处**报告未列出的失实宣称**（FTA「六种门 + NOT」，实为 5 种），见 §10.3。§8 第 3 项（迁移双轨）经复核**原判定失实**——基线前已由 `dacbcac` 以选项 (b) 解决，见 §10.2。

---

## 2. 规模与进度

### 2.1 代码体量（实测）

| 层 | 文件数 | 行数 | 说明 |
|---|---|---|---|
| Go 平台（`pkg/` `internal/` `cmd/`） | 162 | 23,185（非测试 18,278） | 两个二进制：`resolveagent-server`（HTTP :8080 + gRPC :9090）、`resolveagent-cli`（含 TUI） |
| Python 运行时（`python/src/resolveagent/`） | 203 | 42,359 | 18 个子包 + 5 个根模块 |
| Web 控制台（`web/src/`） | 138 | 33,198 | 46 条路由 / 23 个页面目录 |

Python 子包体量排序：`selector/` 3,927 → `corpus/` 3,742 → `runtime/` 2,858 → `skills/` 2,752 → `rag/` 2,704 → `code_analysis/` 2,530 → `fta/` 2,249 → `llm/` 1,680 → `docsync/` 1,414 → `store/` 1,364 → `traffic/` 1,001 → `mcp/` 958 → `agent/` 936 → `integrations/` 733 → `hooks/` 550 → `v1/` 772（生成物） → `telemetry/` 129 → `api/` 27。
根模块：`planning.py` 673、`toolhub.py` 624、`memory.py` 599、`message_bus.py` 442、`resilience.py` 295。

### 2.2 提交节奏

- 2026-09-01 至今：**106 次提交**
- 2026-04-08 至今：**154 次提交**
- 最后一次提交：2026-09-22 → **静默约 12 天**

### 2.3 计划执行状态

> **本节数字已更正**——原表的 5 个勾账数**全部测错**，方法缺陷见下方说明。这是全报告唯一回改的分析结论。

| 计划文档 | 原报告勾账 | 实测勾账（锚定） | 判定 |
|---|---|---|---|
| `2026-09-11-p2-delivery-security.md` | 39/39 | **39/39** | 完成（原数字正确） |
| `2026-09-11-p3-contract-data-loop.md` | 30/30 | **29/29** | 完成（原数字多算 1） |
| `2026-09-11-p4-governance-cleanup.md` | 30/30 | **29/29** | 完成（原数字多算 1） |
| `2026-09-09-p0-p1-production-hardening.md` | 0/59 | **58/58** | 已回填勾账（`0037e7b`）——原报告"状态失真"的判定成立 |
| `2026-09-05-best-practices-remediation.md` | 0/51 | **50/50** | 已回填勾账（`8c5559e`）——原报告"状态失真"的判定成立 |

**多算 1 的成因**：每份计划第 3 行的 `> **For agentic workers:**` 引导块里有一处**字面量** `` `- [ ]` ``（用于说明"步骤用复选框语法书写"）。用 `grep -o '- [ ]' | wc -l` 统计会把它算进未勾项，`grep -c '^- \[ \]'`（锚定行首）则不会——它不在行首。p3/p4 还额外有一处字面量 `` `- [x]` ``，故未锚定口径下多出的是**已勾**计数。**锚定行首的口径是权威口径**，本表与 §10 全部采用。

复核命令：

```bash
cd docs/superpowers/plans
for f in *.md; do
  echo "$f $(grep -c '^- \[x\]' "$f")/$(($(grep -c '^- \[x\]' "$f")+$(grep -c '^- \[ \]' "$f")))"
done
```

后两份的落地证据（抽查，原报告结论未被推翻）：`python/src/resolveagent/fta/monte_carlo.py` 已存在（P1 要求，`36f6195`）；`hack/quality-gate.sh` 已将全部 `((PASS++))` 改为 `PASS=$((PASS+1))`（Task 1 要求，实测 L37/50/80/95/125）。逐项证据见两份计划各自新增的 `## 执行状态复核` 段：p0-p1 有 13 行 Task 级证据表 + 14 个提交哈希（`git cat-file -e` 全部确认存在），best-practices 有对应的逐项核对记录。

**注意**：勾账的含义是"结果今天可在代码树中验证存在"，**不是**"今天重新执行了一遍"。p0-p1 复核过程中还发现该计划的 3 条验收命令**与其自身实现矛盾**（详见 §10.2 与计划内的矛盾表），其中 2 条已由 `93e408e` 真正修绿，1 条按写法不可能达成。

---

## 3. 质量现状（本地实跑）

`bash hack/quality-gate.sh` 完整输出：

```
==> Go Quality Checks
  [go-vet]              PASS
  [go-build]            PASS
  [go-lint]             FAIL      ← 唯一失败项
  [go-test]             PASS
  [go-coverage>=17.0%]  17.1%

==> Python Quality Checks
  [py-ruff]                     PASS
  [py-format]                   PASS
  [py-test+coverage>=42.0%]     43%

==> Web Quality Checks
  [web-lint]  PASS
  [web-test]  PASS

Summary: Passed 9 / Failed 1 / Warnings 0 → QUALITY GATE FAILED
```

### 3.1 覆盖率棘轮未收紧

`test/fixtures/baseline/coverage-baseline.json`（timestamp 2026-09-11）：

| 指标 | 记录基线 | 门禁阈值 | 2026-10-04 实测 | 判定 |
|---|---|---|---|---|
| Go | 17.5% | 17.0% | **17.1%** | 已从基线回落 0.4pt，仍高于阈值 |
| Python | 42.9% | 42.0% | **43%** | 略高于基线 |

设计意图是"只升不降"，但阈值自 2026-09-11 起未随实测值上调，Go 侧实际已出现回退而门禁无感。

### 3.2 测试分布

- Python：44 个测试文件 = `tests/unit/` 30 + `tests/integration/` 6 + 顶层 8（**无 e2e 目录**）
- Web：12 个测试文件、约 138 个 `it/test` 块，**全部只覆盖 mock 数据质量 / 组件渲染 / store / hook / env 标志逻辑，无一测真实后端**
- Go：`test/e2e/` 4 文件（靠 `skipIfNoServer` 探测 `localhost:8080/healthz` 决定跳过）、`test/integration/api_contract_test.go`、`pkg/server/openapi_contract_test.go`
- Python 零测试模块：`telemetry/`、`toolhub.py`、`message_bus.py`、`store/` 客户端、`llm/` providers、`api/`、`v1/`

---

## 4. CI 全红：三个独立根因

远端最新 push 运行 `35734654582`（2026-09-22，commit `bc9d946`）：

| Job | 结论 | 失败步骤 |
|---|---|---|
| Lint Go | **failure** | `golangci-lint` |
| Lint Web | **failure** | `Install dependencies` |
| Secret Scan (gitleaks) | **failure** | `Run gitleaks/gitleaks-action@v2` |
| Lint Python | success | — |
| Test Python | success | — |
| Test Mobile | success | — |
| Test Go / Test Web / Build / E2E / Docker Build / Quality Gate | **skipped** | 依赖上述失败 job |

即：**6 个 job 从未执行**，包括全部 Go/Web 测试、构建、E2E 与质量门禁。

### 4.1 根因一：Lint Go —— action v9 与 golangci-lint v1.64 不兼容

远端错误：

```
Installing golangci-lint v1.64...
Failed to run: Error: Command failed: go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v1.64
go: github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v1.64: module github.com/golangci/golangci-lint@v1.64
    found (v1.64.8), but does not contain package github.com/golangci/golangci-lint/v2/cmd/golangci-lint
```

因果链：

1. `.github/workflows/ci.yaml:52` 使用 `golangci/golangci-lint-action@v9`
2. action v9 **只支持 golangci-lint v2.x**，故拼接 v2 模块路径
3. `ci.yaml:57` 仍钉 `version: v1.64`（`install-mode: goinstall`）
4. → v2 模块路径 + v1 版本号 = 包不存在

action 由 dependabot 在 commit `6c0e0b4`（v6 → v9）升级。而 `ci.yaml:54-56` 的注释正是上一轮 commit `55cfce9` 为解决 v1 兼容性所写：

```yaml
# v1.64 pinned: the repo config is v1-schema, which golangci-lint v2.x rejects.
# install-mode: goinstall so the binary is built by CI's Go 1.25 — the prebuilt
# v1.64 release binary is go1.24-built and refuses go.mod's go 1.25.0.
```

dependabot 的自动升级直接推翻了这条人工约束，且因 CI 已红无人察觉。

**本地同一根因**：`.golangci.yml` 为 v1 schema（缺 `version: "2"` 键），本地 golangci-lint 2.13.2 拒绝加载：

```
Error: can't load config: unsupported version of the configuration: ""
See https://golangci-lint.run/docs/product/migration-guide for migration instructions
```

`.golangci.yml` 启用 22 个 linter：errcheck、gosimple、govet、ineffassign、staticcheck、unused、bodyclose、durationcheck、errname、errorlint、exhaustive、gocritic、gofumpt、gosec、misspell、nilerr、noctx、prealloc、predeclared、revive、unconvert、unparam、whitespace。

**关键取证**：绕过仓库配置、用 v2 默认 linter 集合运行 `golangci-lint run --no-config ./...` → **0 issues**。
→ Go 代码本身干净，失败纯属工具链配置。
→ **未验证**：迁移到 v2 schema 后，仓库额外启用的 gosec / revive / gocritic 等 linter 是否会暴露新问题。默认集合仅含 errcheck、govet、ineffassign、staticcheck、unused 五项。

### 4.2 根因二：Lint Web —— pnpm 版本错配

远端错误：

```
pnpm cache is not found
ERROR  packages field missing or empty
##[error]Process completed with exit code 1.
```

因果链：

1. `web/pnpm-workspace.yaml` 内容为：
   ```yaml
   allowBuilds:
     esbuild: true
   onlyBuiltDependencies:
     - esbuild
   ```
   —— 只有 pnpm 10+ 的键，**无 `packages:` 字段**
2. `ci.yaml:86` 钉 `pnpm/action-setup@v4` 的 `version: 9`
3. pnpm 9 把 `pnpm-workspace.yaml` 视为 workspace 清单，要求 `packages:` → 报错
4. 本地 pnpm 为 **11.6.0**，故本地 `pnpm install` / `pnpm lint` / `pnpm test` 全部正常，问题只在 CI 暴露

该文件由 commit `e3b9d4a` 引入。`web/package.json:61` 另有 `pnpm.onlyBuiltDependencies: ["esbuild"]`，与 workspace 文件内容重复。

### 4.3 根因三：Secret Scan —— 组织仓库缺 gitleaks 许可证

远端错误：

```
[ai-guru-global] is an organization. License key is required.
##[error]🛑 missing gitleaks license. Go grab one at gitleaks.io and store it as a
GitHub Secret named GITLEAKS_LICENSE.
```

**不是发现了密钥**。`gitleaks/gitleaks-action@v2` 对组织所属仓库强制要求付费许可证，`GITLEAKS_LICENSE` secret 未配置 → action 直接失败退出。此 job 由 commit `699ddf9` 引入（"安全扫描进 CI"）。

### 4.4 连带损害：19 个 dependabot PR 全阻塞

当前 OPEN PR 共 **19 个**，编号 27–45，全部为 dependabot 自动升级，全部 CI 红：

- Docker 基础镜像 4 个（#42 nginx-unprivileged 1.29→1.31、#43 golang 1.26→1.27、#44 alpine 3.23→3.24、#45 node 25→26）
- Go modules 5 个（#33 otel/sdk/metric、#34 otel/trace、#35 otelhttp、#37 grpc 1.80→1.83.2、#38 otlptracegrpc）
- Web npm 5 个（#32 typescript 5.6→6.0、#36 postcss、#39 @testing-library/react、#40 typescript-eslint、#41 @testing-library/jest-dom）
- GitHub Actions 5 个（#27 build-push-action、#28 action-gh-release、#29 setup-buildx-action、#30 setup-python、#31 gitleaks-action 2→3）

依赖升级通道完全堵死。其中 #32（typescript 5.6 → 6.0）为跨主版本升级，需单独评估。

---

## 5. 实现与宣称的落差

`PRODUCT.md` 首条产品原则为"证据先行：排查结论必须可追溯到证据"。以下几处代码与文档不一致，属净损害。

### 5.1 需要处置的占位实现

| 位置 | 现状 | 影响 |
|---|---|---|
| `python/src/resolveagent/planning.py:671` | `_execute_action` 为占位符，返回伪造字符串 | **Plan-and-Execute 的 ReAct 循环实际不执行任何工具**。而 `docs/ARCHITECTURE_IMPROVEMENTS_2026.md:40` 标记 Planning Mode 为 **DONE** |
| `python/src/resolveagent/skills/troubleshoot.py:254-256` | `"[Command execution placeholder]"` | 排查技能不真的执行命令，与产品核心叙事冲突 |
| `python/src/resolveagent/agent/base.py:45` | `reply()` 为 echo 占位 | 基类默认行为无意义（`agent/mega.py:403` 有真实的降级到 LLM 路径） |
| `python/src/resolveagent/runtime/registry_client.py:564-582` | `watch_registry` 不产出任何事件 | 无 WebSocket/SSE 注册表变更订阅 |
| `python/src/resolveagent/runtime/engine.py:609` | 从 registry 加载 workflow 为占位 | 执行引擎无法按名加载工作流 |
| `python/src/resolveagent/rag/index/milvus.py:397` | delete-by-expr 为占位 | Milvus 侧按表达式删除文档不生效 |
| `python/src/resolveagent/api/` | 仅 27 行 `__init__.py`，docstring 承诺的 `registry_pb2_grpc` / `agent_pb2_grpc` **在目录中不存在** | 空壳包，docstring 失实 |

良性（抽象基类的 `NotImplementedError`，子类已实现，无需处置）：`docsync/processors.py:32-44`、`traffic/collector.py:42`、`v1/*_pb2_grpc.py` 中 12 处生成物 servicer 基类。

### 5.2 做对了的部分（勿误伤）

- **gRPC 宣传治理诚实**：Go 侧 `api/proto/resolveagent/v1/` 有 8 个 `.proto`（agent、common、platform、rag、registry、selector、skill、workflow），但**无任何生成的 `.pb.go`、无业务服务注册**；`:9090` 的 gRPC server 只注册 `grpc_health_v1.Health` + reflection（`pkg/server/server.go:98-105,131-137`）。Python 侧 `v1/*_pb2.py` 是**真实 protoc 产物**（Protobuf Python 6.31.1，含序列化 descriptor），`runtime/selector_grpc.py` 是可用的 `grpc.aio` SelectorService（Route + ClassifyIntent，委托 RoutingService），默认端口 9092（`selector_grpc.py:118`），**仅在设置 `RESOLVEAGENT_GRPC_PORT` 时启动**（`runtime/__main__.py:25,32-41`）。commit `1ea49b5` 主动撤下 README 失实宣传，方向正确。
- **OpenAPI 契约测试是真的**：`pkg/server/router.go` 实测 95 条 `mux.HandleFunc` 注册（137 行、19 个注释分节）；`pkg/server/openapi_contract_test.go` 的 `TestOpenAPIRouteCountParity`（:78-83）解析 router.go 并与 `api/openapi/v1/resolveagent.yaml` **双向断言**、钉死数量 95。
  - 措辞需修正："拆成 17 个 domain 文件"不准确——路由集中在单个 `router.go`，被拆分的是 16 个 `*_handlers.go`（agent、analysis、callgraph、config、corpus、fta、hook、memory、model、rag、skill、solution、system、traffic、workflow + error_mapping）。
- **存储层完整**：`store.backend == "postgres"` 时全部 **13 个 registry** 走 Postgres 实现（`pkg/server/server.go:52-94`；solutionRegistry 见 `:77`），否则 13 个全部回落内存（默认 `"memory"`，`pkg/config/types.go:19`）。
- **优雅降级**：Python `store/` 客户端对 Go 平台不可用时记日志并返回 None；Redis 连接失败仅告警（`memory.py:146,170`）；selector 路由 LLM → rule 逐级降级。

### 5.3 Web 数据层现状

- 路由定义单点：`web/src/App.tsx:62-108`，46 条 `<Route>`
- `mock.ts` **仅部分拆分**：`web/src/api/mock.ts` 仍 1,023 行（`mockApi` 定义于 :268，约 62 个方法）；共享数据已抽至 `web/src/api/mock/`（ops.ts、rag.ts 268L、skills.ts 477L、workflows.ts 615L、shared.ts）
- 后端探活：`web/src/api/client.ts:55-86` `checkBackend()` 探测 `GET /api/v1/health`，1.5s 超时，要求可解析为 JSON 对象（防 SPA fallback 200），结果缓存 30s
- 降级代理：`client.ts:391-428` 对 `realApi`（71 个真实 fetch 方法，:109-322）套 `Proxy`——存在对应 mock 方法且后端不可用时走 mock；否则调真实 API，失败再回落 mock 并 toast 提示"页面展示的是本地模拟数据"
- mock 开关：`web/src/api/mockRuntime.ts:9-11,19-25`，受 `import.meta.env.DEV || VITE_MOCK_FALLBACK==='1'` 控制，`VITE_ENABLE_MOCK==='false'` 可关
- **6 个 code-analysis 方法（callGraphs / trafficGraphs，`client.ts:328-335`）永远走 mock**，从不触达后端
- 依赖代差风险：vite `^8.0.8` 配 vitest `^2.1.8`（vitest 2.x 早于 Vite 8，疑似 peer 不匹配）；`@eslint/js ^10.0.1` 配 eslint `^9.15.0`；react `^18.3.1` 配 react-router-dom `^7`；typescript `~5.6.3` 是唯一 tilde 钉版

---

## 6. 治理与文档债务

### 6.1 数据库迁移双轨分叉（定时炸弹）

| 源 | 覆盖版本 | 谁在用 |
|---|---|---|
| `pkg/store/postgres/postgres.go` 内嵌列表 | **16 个版本，最新 v16**（:561） | **运行时实际执行**（`postgres.go:110-126`） |
| `scripts/migration/*.sql` | **001–011**（11 个 `.up.sql`） | 无（人工/外部工具用） |

差 **5 个版本**。用 `scripts/migration/` 建库的新环境会缺表。线上因走内嵌列表而未爆，但两源已实质分叉。

### 6.2 文档冲突与陈旧

- **两份 ROADMAP 冲突**：`ROADMAP.md:31` = `## v0.3.0 — WebUI & DevEx (Current)`；`docs/ROADMAP.md:31` = `## v0.3.0 — Quality & Foundation (Current)`，且后者 v0.4.0 Phase 1 已勾 4 项（FTA 性能优化、多语言代码分析、LangGraph 集成、Dify 插件导出）。P4 号称"文档归一到 docs/ 唯一源"，**漏了 ROADMAP**。
- **CHANGELOG 停在半年前**：`docs/CHANGELOG.md:8` 最新条目 `## [0.3.0] - 2026-04-07`，而 4 月至今有 154 次提交，整个 P0–P4 生产化零记录。
- **架构改进文档全部标 DONE**：`docs/ARCHITECTURE_IMPROVEMENTS_2026.md` 7 项状态全为 DONE（:24 memory、:40 planning、:55 message_bus、:73 toolhub、:88 audit、:106 resilience、:121 version），其中 :40 与 §5.1 的占位符事实矛盾。
- **未做项仍挂在 ROADMAP**：Load testing benchmarks（`test/load/` 为空目录，仅 `.gitkeep`）、OpenAPI specification **自动生成**（现状是手工维护 YAML + 契约测试守护，不等于自动生成）。

### 6.3 仓库卫生残留

macOS 复制残留**仍被 git 跟踪**：

- `README 2.md`（47,847 字节，与 `README.md` 60,195 字节并存）
- `docs/design/03-fta 2.md`

P4 Task 只清理了 `web/src/api/client 2.ts`。另：`test/testdata/` 为空目录。

---

## 7. 外部依赖与默认配置（运行时事实）

| 依赖 | 环境变量 / 默认值 | 缺失时行为 |
|---|---|---|
| Go 平台 | `RESOLVEAGENT_PLATFORM_ADDR` = `localhost:8080`（`runtime/http_server.py:132`、`store/base_client.py:23`） | 记日志、返回 None，优雅降级 |
| LLM 网关（Higress） | `HIGRESS_GATEWAY_URL` = `http://localhost:8888`（`llm/higress_provider.py:100`）；直连模式 `RESOLVEAGENT_LLM_DIRECT`；`LLM_BASE_URL` 默认 Moonshot（:437） | selector 降级 LLM → rule |
| 向量库 | Milvus `localhost:19530` / Qdrant `localhost:6333`（`rag/index/milvus.py:85-86`、`rag/retriever.py:39-41`） | — |
| Redis | `redis://localhost:6379`（情景记忆，`memory.py:146,170`） | 仅告警，优雅降级 |
| Postgres | **Python 侧完全未引用**（已 grep 验证）——DB 访问仅存在于 Go 侧 | 默认 `memory` 后端 |
| 运行时 HTTP | 端口 9091（`runtime/__main__.py:24`，`RESOLVEAGENT_RUNTIME_PORT` 可覆盖） | Go 侧 `runtime_client.go:29` 默认连此 |
| 运行时 gRPC | `RESOLVEAGENT_GRPC_PORT`，**默认关闭**，类默认端口 9092 | 不启动 |

注：Milvus 连接已在 commit `0995420` 显式加 10s 超时（pymilvus 2.6 默认 None 会在 Milvus 宕机时永久阻塞）。

---

## 8. 处置计划

| # | 事项 | 具体动作 | 优先级 | 状态 |
|---|---|---|---|---|
| 1a | 修 Lint Go | `.golangci.yml` 迁移到 v2 schema（加 `version: "2"`、按 v2 结构调整 `linters` / `linters-settings` / `issues`），`ci.yaml` 改用 v2.x 版本并更新过期注释；迁移后实跑确认新增 linter（gosec/revive/gocritic）无未处理告警 | P0 | **已完成** `6492367`——本地 lint **0 issues**（23 项告警全部真修，非静默）→ §10.2 |
| 1b | 修 Lint Web | `web/pnpm-workspace.yaml` 补 `packages: ['.']`（或改由 `package.json` 单一来源承载并删除该文件），CI pnpm 版本与本地对齐 | P0 | **已完成** `6492367`——采用 `packages: ['.']` 方案（删文件方案实测不可行）→ §10.2 |
| 1c | 修 Secret Scan | gitleaks 改为 CLI/docker 直跑（绕开 action 的组织许可证要求），或降级为非阻断并记录理由 | P0 | **已完成** `6492367`——改官方 `gitleaks/gitleaks-action` docker 镜像直跑；**未降级为非阻断**，扫描仍是硬门禁 → §10.2 |
| 1d | 疏通 PR | CI 转绿后逐个评估 19 个 dependabot PR；#32（typescript 5.6→6.0）跨主版本需单独验证 | P1 | **已评估，待用户授权**——19 个 PR 逐个判定完成（1 个应关、1 个应搁置、2 个需改 `package.json`），但解除阻塞必须 push / merge / close，属共享远端状态操作 → §10.6 |
| 2 | 对齐宣称与实现 | 二选一：(a) 真实实现 `planning.py:671` `_execute_action` 与 `troubleshoot.py:254` 命令执行；(b) 将 `ARCHITECTURE_IMPROVEMENTS_2026.md:40` 等 DONE 降级为 PARTIAL 并注明缺口。另修 `api/__init__.py` 失实 docstring | P1 | **已完成（选 b）** `24d2e6d`——7 项逐条复核，3 项降 PARTIAL、3 项标注"实现完成未接线"、1 项维持 DONE；另纠正 2 处报告未列出的失实声明（`go.mod` 降级从未发生、gRPC stub 位置）→ §10.2 |
| 3 | 合并迁移双轨 | 二选一：(a) 将 v12–v16 回填 `scripts/migration/`；(b) 废弃该目录、以内嵌列表为唯一源并在 README 注明 | P1 | **原判定失实，无需实施**——基线 `bc9d946` 之前已由 `dacbcac`（2026-09-09）以选项 (b) 完成，`scripts/migration/README.md` 首行即 `# DEPRECATED`；本报告漏读该文件 → §10.2 |
| 4a | ROADMAP 归一 | 消除根目录与 `docs/` 两份 ROADMAP 的 v0.3.0 分歧，保留单一源 | P2 | **已完成** `86c1592`——`docs/ROADMAP.md` 合并入根 `ROADMAP.md` 后删除，保留的 4 项已勾进度一并迁入 → §10.2 |
| 4b | CHANGELOG 补账 | 补 0.3.0（2026-04-07）之后至今的条目，覆盖 P0–P4 生产化 | P2 | **已完成** `0fe863a`——补 `Unreleased` 段，按 Added/Changed/Fixed/Deprecated 归纳 160 次提交 → §10.2 |
| 4c | 清理残留 | `git rm` `README 2.md`、`docs/design/03-fta 2.md` | P2 | **已完成** `2c75950`——两份副本删除，删前逐字节 diff 确认删的是副本而非正本 → §10.2 |
| 4d | 计划勾账 | 补勾 `2026-09-05` 与 `2026-09-09` 两份计划的已完成项，或标注"已被 P2–P4 取代" | P2 | **已完成** `8c5559e` + `0037e7b`——两份计划 50/50 与 58/58 全部逐项复核后勾选，各新增 `## 执行状态复核` 证据段 → §10.2 |
| 5 | 覆盖率棘轮 | 按实测值上调 `coverage-baseline.json` 阈值，使"只升不降"真正生效 | P2 | **已完成** `da0a376`——Python 阈值 42.0→42.5，Go 快照 17.5→17.1；Go 阈值保持 17.0（余量 0.1pt，见 §10.4 关于工具链敏感性的告警）→ §10.2 |

**范围外追加**（不在上表，实施中发现并修掉）：`93e408e`（FTA「六种门 + NOT」失实宣称 8 处、README 测试数 370→382、`ruff` UP032、`gotchas.md` 追加更正段）、`acbe18d`（统一 registry 错误出口，内部错误细节不再泄漏）、`c1be6a4`（`quality-gate.sh` 覆盖率管道 `pipefail` 中断）、`76a9d42`（本地部署文档 Step 3 迁移说明）。详见 §10.3。

---

## 9. 附录：复现命令

```bash
# 本地质量门禁（Go vet/build/lint/test/coverage + Python ruff/format/test + Web lint/test）
bash hack/quality-gate.sh

# 覆盖率基线
cat test/fixtures/baseline/coverage-baseline.json

# 验证 Go 代码本身干净（绕过 v1 schema 配置，用 v2 默认 linter）
golangci-lint run --no-config ./...

# 复现本地 lint 配置加载失败
golangci-lint version && golangci-lint run ./...

# 远端 CI 取证
gh run list --limit 15
gh run view 35734654582 --json jobs \
  --jq '.jobs[] | {name, conclusion, steps: [.steps[] | select(.conclusion=="failure") | .name]}'
gh run view --job <jobId> --log | grep -iE "error|fail"

# 阻塞的 PR
gh pr list --state open --limit 100

# 路由契约计数
grep -c 'mux.HandleFunc' pkg/server/router.go
cat api/openapi/v1/resolveagent.yaml | grep -c 'operationId'

# 迁移双轨比对
ls scripts/migration/*.up.sql | wc -l
grep -oE 'version: *[0-9]+' pkg/store/postgres/postgres.go | tail -3

# 代码体量
find . -name "*.go" -not -path "./third_party/*" -not -path "./.git/*" -exec cat {} + | wc -l
find python -name "*.py" -not -path "*/.venv/*" -exec cat {} + | wc -l
find web/src \( -name "*.ts" -o -name "*.tsx" \) -exec cat {} + | wc -l

# 仓库卫生残留
git ls-files | grep -iE " 2\.|copy|\.orig|\.bak|~$"
```

---

## 10. 实施记录

> 本节在实施过程中逐项回填：做了什么、验证命令与实测输出、偏差与理由。

实施遵守仓库既有约定：**直接在 `main` 提交；中文 Conventional Commits；不 push；不用 `--no-verify`；只 `git add` 指定文件，禁止 `git add -A`。**

### 10.1 落地总览

基线 `bc9d946` 之上共 **12 个实施提交**（`git log --oneline bc9d946..0037e7b` → 12 条）。本报告自身的沉淀与后续修订提交在其之后、不计入实施提交，故 `bc9d946..HEAD` 的条数多于下表。截至定稿 `origin/main` 仍为 `bc9d946`：

| 提交 | 主题 | 变更规模 | 对应 §8 |
|---|---|---|---|
| `6492367` | fix(ci): 修复三个长期红灯的 CI 门禁——golangci-lint 迁 v2、pnpm workspace 单一来源、gitleaks 改官方镜像 | 8 文件 +144/−93 | 1a 1b 1c |
| `2c75950` | docs: 删除两份陈旧副本 README 2.md 与 docs/design/03-fta 2.md | 2 文件 −1192 | 4c |
| `76a9d42` | docs(deploy): 修正本地部署 Step 3——数据库迁移由平台启动时自动执行 | 2 文件 +56/−37 | 范围外 |
| `86c1592` | docs(roadmap): 合并 docs/ROADMAP.md 到根 ROADMAP.md，消除两份路线图分歧 | 2 文件 +53/−99 | 4a |
| `24d2e6d` | docs(architecture): 复核 7 项改进的真实状态，纠正 go.mod 与 gRPC stub 的失实声明 | 4 文件 +84/−40 | 2 |
| `da0a376` | ci(coverage): 按实测值校准覆盖率基线——Go 快照 17.5→17.1，Python 阈值 42.0→42.5 | 1 文件 +3/−3 | 5 |
| `0fe863a` | docs(changelog): 回填 Unreleased 段——归纳 0.3.0 之后 160 次提交 | 1 文件 +96 | 4b |
| `acbe18d` | fix(server): 统一 registry 错误出口，内部错误细节不再泄漏给客户端 | 1 文件 +18/−16 | 范围外 |
| `c1be6a4` | fix(ci): quality-gate.sh coverage 管道补 `\|\| true`，规避 pipefail 下 set -e 中断 | 1 文件 +5/−3 | 范围外 |
| `8c5559e` | docs(plan): 最佳实践修复计划勾账回填——50 步骤全部核对完成，补记 2 处残留与 7 项偏差 | 1 文件 +89/−50 | 4d |
| `93e408e` | fix(docs): 清除 FTA「六种门 + NOT」的失实宣称——前端与 zh 文档补齐 2026-09-09 对齐任务漏扫的面 | 5 文件 +16/−10 | 范围外 |
| `0037e7b` | docs(plan): P0/P1 生产化加固计划勾账回填——58/58 步骤逐项复核并登记 3 处验收矛盾 | 1 文件 +114/−58 | 4d |

### 10.2 §8 逐项记录

#### 1a 修 Lint Go —— `6492367`

**做了什么**

- `.golangci.yml` 迁到 v2 schema（+108/−… 行）：首行加 `version: "2"`；`linters` 段改为**只列 v2 默认集之外额外启用的检查器**（v2 默认已含 errcheck / govet / ineffassign / staticcheck / unused，且 `gosimple` 已并入 `staticcheck`，故原 22 项列表里的这 6 项删除）；`linters-settings` / `issues` 按 v2 结构调整。
- `ci.yaml:62-67`：`golangci/golangci-lint-action@v9` 保留，`version` 由 `v1.64` 改为 `${{ env.GOLANGCI_LINT_VERSION }}` = **`v2.13.2`**，并删除 `install-mode: goinstall`——该模式是当初为绕开"v1.64 预编译二进制由 go1.24 构建、拒绝 `go.mod` 的 `go 1.25.0`"而加的；v2.13.2 的二进制由 go1.27 构建，可正常解析，不再需要。
- `ci.yaml:64-66` 的注释同步重写：原注释宣称"仓库配置是 v1 schema，v2.x 会拒绝"，迁移后已失实。

**真修而非静默**：迁移后本地实跑暴露 **23 项告警**（`gocritic` 3 + `gosec` 4 + `noctx` 16），**全部按告警本身修掉**，未用 `//nolint` 或 `issues.exclude` 掩盖。涉及 `internal/cli/client/client.go`（+12/−12）、`pkg/server/runtime_client.go`（+49/−…）、`pkg/server/server.go`（+4/−…）。`noctx` 的 16 处是把裸 `http.NewRequest` 换成 `http.NewRequestWithContext` 并透传调用链的 ctx；`gosec` 4 处是 TLS/超时/错误处理加固。

**验证**

```
$ golangci-lint version
2.13.2
$ golangci-lint run ./...
0 issues
$ bash hack/quality-gate.sh   # [go-lint] PASS
```

这直接回答了基线报告 §4.1 标注的"**未验证**：迁移到 v2 schema 后，仓库额外启用的 gosec / revive / gocritic 等 linter 是否会暴露新问题"——**会，23 项，已全部处理**。（注：`revive` 在 v2 下实测 0 告警。）

#### 1b 修 Lint Web —— `6492367`

**做了什么**：`web/pnpm-workspace.yaml` 补 `packages: ['.']`，并删掉 `web/package.json` 里重复的 `pnpm.onlyBuiltDependencies`（−5 行），使 `onlyBuiltDependencies` **只在 workspace 文件里存在一处**。`ci.yaml:24` 的 `PNPM_VERSION` 定为 `"11.6.0"`，与本地实测版本一致。

文件现状（含解释性注释，说明为何 pnpm 9 与 11 需要不同处理）：

```yaml
packages:
  - '.'
onlyBuiltDependencies:
  - esbuild
```

**为何不选"删除该文件"方案**（§8 括号里的另一个选项）：实测删除后 `pnpm install` 报 `ERR_PNPM_IGNORED_BUILDS: esbuild@0.21.5`——pnpm 10+ 已不再读 `package.json` 的 `pnpm` 字段，`onlyBuiltDependencies` 只能由 workspace 文件承载。**该方案不可行，已排除。**

#### 1c 修 Secret Scan —— `6492367`

**做了什么**：`ci.yaml:44-48` 把 `gitleaks/gitleaks-action@v2` 换成直接跑官方镜像：

```yaml
docker run --rm -v "$PWD:/repo" \
  "ghcr.io/gitleaks/gitleaks:${GITLEAKS_VERSION}" \
  detect --source=/repo --config=/repo/.gitleaks.toml --exit-code=1 --redact -v
```

`GITLEAKS_VERSION` = `v8.30.1`（`ci.yaml:25`）。组织许可证要求来自 **action**，CLI/镜像本身免费且功能等价，因此**没有降级为非阻断**——`--exit-code=1` 保持硬门禁，扫描仍然会拦下真实泄露。`--redact` 避免命中内容进 CI 日志，`--config` 显式传入以保证配置真的被加载（而非静默走默认规则集）。

**新增 `.gitleaks.toml`**：全量扫 168 个提交后报 4 处 `curl-auth-header`，命中的"密钥"是 `docs/api/index.md` curl 示例里的字面占位符 `YOUR_API_KEY` / `YOUR_JWT_TOKEN`。放行做了**两层收窄**避免掩盖真实泄露：`regexTarget = secret` + `^...$` 全匹配（真实密钥不可能恰好等于这两个词），且 `paths` 限定 `\.md$`（源码/配置里出现同样字符串仍告警）。

#### 1d 疏通 PR —— 已评估，**待用户授权**

19 个 OPEN PR（#27–#45）**全部**因同一组 3 个检查失败，来自 2026-09-13 的同一次运行；三个根因均已被本地 `6492367` 修掉。逐个判定：

| PR | 内容 | 判定 |
|---|---|---|
| #31 | `gitleaks-action` 2→3 | **应关闭**——`6492367` 已不再使用该 action，升级对象已不存在 |
| #43 | `golang` 1.26→1.27-alpine | **应搁置**——`hack/quality-gate.sh:14` 钉 `GOTOOLCHAIN=go1.25.6`，且 Go 覆盖率对工具链敏感（见 §10.4） |
| #32 | `typescript` 5.6→6.0 | **跨主版本，需改 `package.json`**；且**依赖 #40**（`typescript-eslint`）先合 |
| #41 | `@testing-library/jest-dom` →7.0.1 | **跨主版本，需改 `package.json`** |
| #36 #39 #40 | postcss / @testing-library/react / typescript-eslint | 范围内升级，低风险 |
| #33 #34 #35 #37 #38 | otel/sdk/metric、otel/trace、otelhttp、grpc 1.80→1.83.2、otlptracegrpc | Go minor bump，可本地 `go build && go test` 验证 |
| #27 #28 #29 #30 #42 #44 #45 | build-push-action、action-gh-release、setup-buildx-action、setup-python、nginx-unprivileged、alpine、node | 适用，push 后应自动转绿 |

**为何停在这里**：解除阻塞需要把这些本地提交 push 到 `origin/main`，以及 close #31 / merge 若干 PR。这三类都是**改变共享远端状态**的操作，且 push 直接违反仓库既有的"不 push"约定，**必须用户显式授权**。见 §10.6。

#### 2 对齐宣称与实现 —— `24d2e6d`（选方案 b）

**做了什么**：`docs/ARCHITECTURE_IMPROVEMENTS_2026.md` 7 项逐条对照代码复核（+74/−…），而非笼统降级。新增 `## 实施状态复核（2026-10-04）` 段（`:135-168`），引入**二维判定口径**：「实现」= 目标类/模块存在；「接线」= `python/src/` 内有生产调用点（**仅被单测引用不算接线**）。

| # | 改进项 | 原状态 | 复核结论 |
|---|---|---|---|
| 1 | Memory 三层架构 | DONE | **实现完成，未接线** |
| 2 | Planning 双模式 | DONE | **PARTIAL**——`_execute_action` 是占位实现 |
| 3 | AgentMessageBus | DONE | **实现完成，未接线** |
| 4 | ToolHub | DONE | **实现完成，未接线** |
| 5 | DecisionAuditLogger | DONE | **DONE**（补接线证据：`selector/audit.py:40`，由 `selector/selector.py:16` 导入、`:161` 实例化、`:225` 每次路由决策后 `await self._audit.log(...)`） |
| 6 | Resilience | DONE | **PARTIAL**——`CircuitBreaker` 已接线，`FallbackCascade` 未接线 |
| 7 | 版本一致性 | DONE | **PARTIAL**——0.3.0 已统一；`go.mod` 降级从未发生 |

即：**3 项降 PARTIAL、3 项标注"实现完成但未接线"、1 项维持 DONE 并补证据**。判定依据的 grep（`ARCHITECTURE_IMPROVEMENTS_2026.md:151-165`，均为静态核对，未运行服务）显示 6 个目标类在 `python/src/resolveagent` 内**只有 2 条生产导入**：`resilient_selector.py:26` 的 `CircuitBreaker` 与 `selector/selector.py:16` 的 `DecisionAuditLogger`。

**纠正的 2 处报告未列出的失实声明**：

- **item 7 的 `go.mod` 说法是凭空捏造的**——文档原先打了 ✅，声称 `go.mod` 已从 1.25 降级到 1.22；`head -3 go.mod` 实测为 `go 1.25.0`，**该降级从未发生**。
- gRPC stub 的真实位置是 `python/src/resolveagent/v1/`（真实 protoc 产物），文档原先指向 `api/`（该目录下没有任何 `.pb2_grpc`）。

另：`python/src/resolveagent/api/__init__.py` 的失实 docstring 重写（+40/−…）；`docs/design/00-overview.md`、`docs/design/06-memory-planner-toolhub.md` 同步。

**关于 §8 提到的 `troubleshoot.py:254`**：它**不是** ARCHITECTURE_IMPROVEMENTS 的 7 项之一，方案 (b) 不覆盖它。处置是把它作为**同类占位交叉引用**记入 `ARCHITECTURE_IMPROVEMENTS_2026.md:46`，并核实 `docs/design/05-skills-hooks.md:149` 已如实写明"`_execute_command` 直接返回 `[Command execution placeholder]`，未接 SandboxExecutor——含 command 步骤的排障流不会真的执行命令"。**代码里的占位符仍在**（`planning.py` 的 `_execute_action` 与 `troubleshoot.py` 的 `_execute_command` 均未实现），选 (b) 只保证文档不再撒谎，不消除能力缺口——缺口列入 §10.6 待排期。

**为何选 (b) 而非 (a)**：(a) 要求真实实现 `_execute_action` 的工具执行环与 `_execute_command` 的沙箱执行——这是新增能力，不是修复宣称；在一个以"证据先行"为首条产品原则的仓库里，**先把宣称改回与实现一致**是代价更低且方向正确的动作，实现工作应作为独立需求排期。(b) 完成后文档不再对读者撒谎，且 PARTIAL / 未接线标注本身成了待办的取证入口（`ARCHITECTURE_IMPROVEMENTS_2026.md:168` 明确写了"未接线不等于无用……要真正生效，需要在 `MegaAgent` / `ContextEnricher` / Skill 执行链里补上调用点"）。

**重要修正**：本报告 §5.1 曾断言 `api/` 是"空壳包、无导入者"。**该断言是错的**——`runtime/server.py:38,161,189,200` 实际导入并使用它。因此该包被**纠正**而非删除。

#### 3 合并迁移双轨 —— **原判定失实，无需实施**

**复核结论**：§8 第 3 项与 §6.1 的"定时炸弹"判定**不成立**。选项 (b) 在**分析基线之前**就已由 `dacbcac`（2026-09-09）完成：

```
$ git merge-base --is-ancestor dacbcac bc9d946 && echo ancestor
ancestor
$ git show bc9d946:scripts/migration/README.md | head -5
# DEPRECATED - scripts/migration
**These SQL scripts are deprecated and kept for reference only.**
The single authoritative migration chain is **embedded in the Go platform**
(`pkg/store/postgres/postgres.go`) and runs automatically at platform startup.
```

该 README 的每条断言都独立验证为真，包括：compose 栈刻意**不挂载**这些脚本；两源 schema 不兼容（`scripts/` 用 UUID id + `resolveagent` schema search_path，Go 内嵌链用 `VARCHAR(64)` id + `public`，同时应用会破坏 Go 迁移）；`Makefile:107-121` 的 `migrate-up` / `migrate-down` **确实**在运行前先 `@echo "WARNING: scripts/migration is deprecated; ..."`。`0fe863a` 的 CHANGELOG `### Deprecated` 段进一步固化了这一状态。

**失实原因**：原分析比对了两个源的版本号（16 vs 11）就下了"实质分叉"的结论，**没有读 `scripts/migration/README.md`**——目录里就放着写明废弃状态的文件。v12–v16 从未回填，且**本就不该回填**（回填会重新引入被明确废弃的第二套 schema）。

**教训**：判定"双轨分叉"这类结构性债务前，先读被判定为废弃方的自述文件；版本号差异本身不是债务，**未被声明的差异**才是。

#### 4a ROADMAP 归一 —— `86c1592`

`docs/ROADMAP.md`（−83 行）合并入根 `ROADMAP.md`（+69/−…）后删除。合并时**保留了 `docs/` 版里已勾的 4 项 v0.4.0 Phase 1 进度**（FTA 性能优化、多语言代码分析、LangGraph 集成、Dify 插件导出），未因归一而丢失既有勾账。保留根目录版为单一源（与 `README.md`、`PRODUCT.md` 同级，符合"入口文档在根"的惯例）。

#### 4b CHANGELOG 补账 —— `0fe863a`

新增 `Unreleased` 段（+96 行），按 Keep a Changelog 的 `Added` / `Changed` / `Fixed` / `Deprecated` 四类归纳 0.3.0（2026-04-07）之后的 160 次提交。`### Deprecated` 段（`docs/CHANGELOG.md:99`）登记 `scripts/migration/*.sql`（双轨并存、`resolveagent` vs `public`、UUID vs `VARCHAR(64)`、"内联链是唯一会在启动时执行的路径"）与 `python/src/resolveagent/api/`。

#### 4c 清理残留 —— `2c75950`

`git rm "README 2.md"`（−1067 行）与 `git rm "docs/design/03-fta 2.md"`（−125 行）。

**删前双向 diff 确认方向**：两份副本与正本的字节数不同（`README 2.md` 47,847 vs `README.md` 60,195），意味着副本是**更旧**的版本而非更新的工作成果；仍逐份 diff 核对了删除方向，避免误删正本。这是本次实施中风险最高的一步——`git rm` 一个 1,067 行的文件不可轻易回退。

#### 4d 计划勾账 —— `8c5559e` + `0037e7b`

两份计划均**先逐项复核、后勾选**，不是机械打钩：

- `2026-09-05-best-practices-remediation.md`：**50/50**，新增执行状态复核段，登记 2 处残留与 7 项偏差。
- `2026-09-09-p0-p1-production-hardening.md`：**58/58**，新增 `## 执行状态复核（2026-10-04 回填勾账）` 段（+114/−58），含：13 行 Task 级落地证据表（Task 0–12，附提交哈希与精确行号）、3 行验收命令矛盾表、范围外发现段、2 项"已知残留登记"（刻意不修 + 理由）、6 项偏差。该计划的 14 个提交哈希（`c8d7153`→`f90bf68`→`ac22392`→`dacbcac`→`8cd4a98`→`d1ef0c8`→`d369bc8`→`623e769`→`80de663`→`36f6195`→`6b48dc8`→`aaceb6f`→`458c3c5`→`9d27a43`）用 `git cat-file -e` **全部确认存在**。

**勾选口径**（写进了计划里，避免后人误读）：勾选 = **结果今天可在代码树中验证存在**，不等于今天重新执行了一遍。P0 项以"计划规定的提交信息 + 文件增删状态"判定，P1 项以"逐符号逐行实测"判定。

**sed 的安全性**：勾选用的命令锚定行首且要求后随 `**`——`sed -i '' 's/^- \[ \] \*\*/- [x] **/'`。若用无锚定的 `s/- \[ \]/- [x]/`，会把第 3 行引导块里的字面量 `` `- [ ]` `` 一起改掉，破坏文档自述。改完显式验证第 3 行未变（`grep -c` = 1）。

**发现该计划 3 条验收命令与自身实现矛盾**：

| 计划的验收步骤 | 矛盾 | 处置 |
|---|---|---|
| Step 12.2 `ruff check .` 应通过 | 实测有 1 处 UP032（`python/skills/rule-route/rule_route.py:281` 用 `.format()`），自 `3e13e65`（2026-09-02）起存在，早于本计划；`pyproject.toml:54` 只排除 `src/resolveagent/v1`，故 `skills/` **在扫描范围内** | **已修** `93e408e` 改为 f-string，现返回 `All checks passed!` |
| Step 11.6 README 测试数应与实测一致 | README 写 370，`pytest tests/unit -q --collect-only` 实测 **382** | **已修** `93e408e` 改为 382（`8 套集成测试`经核实准确——顶层恰好 8 个非 unit 的 `test_*.py`，未改） |
| Step 11.8 `grep -rn "六种门"` 应 `Expected: 0` | **按写法不可能达成**：7 处命中里 6 处是该计划文档自身与其 spec（自指），第 7 处是归档报告 | 未强改为 0；两处刻意保留项的理由见 §10.3 |

### 10.3 计划范围外的追加修复

#### `93e408e` —— FTA「六种门 + NOT」失实宣称（8 处）

**这是本次实施发现的最实质问题，且不在 §8 任何一项里。**

`python/src/resolveagent/fta/tree.py:20-27` 的 `class GateType(StrEnum)` 只有 **5 个成员**：`AND` / `OR` / `VOTING` / `INHIBIT` / `PRIORITY_AND`。**从来就没有 NOT 门。** 而代码树里有 8 处仍把 `NOT` 列进门类型枚举（其中 2 处明写「六种门类型」：`index.tsx:123` 与 `:1213`），其中 `docs/design/03-fta.md:27` 更是写着"2026-09-09 起文档与实现对齐：README、前端与本文档均不再宣称第六种 NOT 门"——**这句话在它被提交的那一刻就是假的**。

8 处分布在 2 个文件（下表逐行照抄 `git show 93e408e` 的原文，可用 `git show 93e408e -- web/src/pages/Architecture/index.tsx docs/zh/architecture.md` 复核）：

| # | 位置 | 原宣称（逐字） | 改后 |
|---|---|---|---|
| 1 | `web/src/pages/Architecture/index.tsx:65` | `故障树分析引擎，支持 AND/OR/NOT/VOTING 等门类型与蒙特卡洛仿真` | `支持 AND/OR/VOTING/INHIBIT/PRIORITY_AND 五种门类型与蒙特卡洛仿真` |
| 2 | 同上 `:123` | `……支持 AND/OR/NOT/VOTING/INHIBIT/PRIORITY_AND **六种**门类型，最小割集计算与蒙特卡罗仿真` | `AND/OR/VOTING/INHIBIT/PRIORITY_AND **五种**门类型……` |
| 3 | 同上 `:485` | SVG 文案 `AND/OR/NOT/VOTING Gates` | `AND/OR/VOTING Gates`（SVG 宽度有限，保留短文案） |
| 4 | 同上 `:932` | SVG 文案 `AND/OR/NOT/VOTING` | `AND/OR/VOTING` |
| 5 | 同上 `:1055` | `故障树分析，支持 AND/OR/NOT/VOTING/INHIBIT/PRIORITY_AND 门类型，……` | `支持 AND/OR/VOTING/INHIBIT/PRIORITY_AND **五种**门类型，……` |
| 6 | 同上 `:1213` | 小标题 `六种门类型` | `五种门类型` |
| 7 | 同上 `:1214` | `AND / OR / NOT / VOTING / INHIBIT / PRIORITY_AND，支持因果、时序与优先级语义` | 删除 `NOT /` |
| 8 | `docs/zh/architecture.md:18` | `- **FTA 工作流**：……支持 AND/OR/NOT/VOTING/INHIBIT/PRIORITY_AND 门类型` | `支持 AND/OR/VOTING/INHIBIT/PRIORITY_AND 五种门类型` |

第 6、7 行在同一个 hunk 内（`@@ -1210,8 +1210,8 @@`），故 `index.tsx` 的 diffstat 是 `14 +++++++-------`（7 增 7 删 = 7 处）。

> [!NOTE]
> `README.md` 在 `93e408e` 里也改了 1 行，但**不是门类型宣称**，而是 `:973` 的单元测试数 `Python 370 个单元测试项` → `382`。核对该提交时容易把它误算进 8 处里——README 的门类型宣称在 2026-09-09 就已改完，本次核实无残留。

**根因**：p0-p1 计划 Step 11.7 规定的扫描面是 `docs/zh/` + `docs/design/`，**不含 `web/src/`**。前端页面文案是最容易漏的一路——它不参与任何 lint 或契约测试，也没有文档交叉引用指向它。

`docs/design/03-fta.md:27` 的那句宣称**在 `93e408e` 之后才变为真**：8 处全部修完，`tsc --noEmit` 与 `eslint` 均 exit 0。

**同提交顺带修掉的另外两处**（与门类型无关，但同源于"宣称与实测不符"）：README `:973` 测试数 370→382（实测 `pytest tests/unit -q --collect-only` → `382 tests collected`）、`python/skills/rule-route/rule_route.py:281` 的 `ruff` UP032 改 f-string（该告警自 `3e13e65`／2026-09-02 起存在，使 `ruff check .` 无法全绿；`pyproject.toml:54` 只排除 `src/resolveagent/v1`，`skills/` 在扫描范围内）。另 `gotchas.md` 追加 `## 2026-10-04 · 现状复核` 段。

#### 两处「六种门」残留，刻意不修

| 位置 | 不修的理由 |
|---|---|
| `docs/archive/session-reports/COMPREHENSIVE_ASSESSMENT_AND_METHODOLOGY.md:49` | **归档完整性**。这是某次会话的评估存档，改写它会销毁取证链——归档的价值恰恰在于它记录了"当时以为的是什么"。 |
| `.zread/wiki/versions/2026-04-21-000030/*.md`（36 个受跟踪文件） | 这是 **zread 生成的带日期 wiki 快照**，有 `.zread/wiki/current` 指针。正确处置是**重新生成**，不是手改。且其"第六种门"指的是解析器合成的**隐式 OR 门**（见该目录下 `12-liu-chong-men-...md:138`），与 NOT 门是**两个不同的宣称**，本身未必失实。 |

#### `gotchas.md` 的更正方式

`gotchas.md` 是**按日期归档的日志**（`## 2026-09-05 · code-up`、`## 2026-09-06 · code-up`），条目记录的是"当天为真"的事实。其中 2026-09-05 那条"无 monte_carlo 实现"已过期（`monte_carlo.py` 由 `36f6195` 落地、`FTAEngine.analyze()` 由 `6b48dc8` 接入）。处置是**追加 `## 2026-10-04 · 现状复核` 新段落更正**，而不是回改旧条目——回改会让日志失去取证价值。追加段同时记下了"核对宣称面必须把 `web/src/` 一起 grep"这条通用教训。

#### `acbe18d` —— 统一 registry 错误出口

`pkg/server/traffic_handlers.go`（+18/−16）：18 处各自 `http.Error(...)` 的分支统一走包级 `writeRegistryError(w, err, logger, scope)`（`pkg/server/response.go:25`），内部错误细节不再泄漏给客户端。另有 `handleAnalyzeTrafficGraph` 里 **2 处计划未列出的同类泄漏**一并收敛。

**注**：该函数签名与 p0-p1 计划的描述**不符**——计划写的是 Server 方法，实际是包级函数，参数为 `(w, err, logger, scope)`；计划提到的 `pkg/server/error_response_test.go` / `TestWriteRegistryErrorMapping` / `testLogger` **均不存在**，真实测试是 `response_test.go:16 TestWriteRegistryError`。以代码为准。

**一处 PostToolUse MEDIUM 级 SSRF 告警判定为误报**：`runtimeURL` 派生自 `s.runtimeClient.baseURL`，即服务端配置，不接受任何请求侧输入。

#### `c1be6a4` —— quality-gate.sh 的 pipefail 中断

覆盖率管道在 `set -euo pipefail` 下，`VAR=$(pipeline)` 形式的赋值会因管道非零退出**直接终止脚本**（而 `if cmd; then` 形式豁免——这就是 `:90` 没坏而 `:119` 坏了的原因）。补 `|| true`（+5/−3）。**这是计划 Step 2b 之外的第三处同类缺陷。**

#### `76a9d42` —— 本地部署文档

`docs/zh/local-deployment.md`（+89/−…）Step 3 原先要求手工跑迁移脚本；实际迁移由平台启动时自动执行（`postgres.go:110-126`），照原文操作会应用被废弃的第二套 schema 并破坏 Go 迁移链。同时修正 `scripts/seed/seed.sql`。

### 10.4 偏差与判断修正登记

实施过程中**推翻或修正了本报告与相关计划文档的以下判断**。逐条登记，因为其中若干条说明原分析方法有系统性盲区。

**A. 本报告自身结论被推翻**

| # | 原判断 | 实际 |
|---|---|---|
| A1 | §8-3 / §6.1 迁移双轨是"定时炸弹"，需二选一处置 | **失实**。基线前已由 `dacbcac` 以选项 (b) 解决，`scripts/migration/README.md` 首行即 `# DEPRECATED`；原分析漏读该文件 |
| A2 | §5.1 `api/` 是"空壳包、无导入者" | **失实**。`runtime/server.py:38,161,189,200` 实际导入使用；故纠正而非删除 |
| A3 | §2.3 五个勾账数（30/30、30/30、0/59、0/51） | **全部测错**。无锚定 grep 把计划第 3 行的字面量 `` `- [ ]` `` 计入；权威口径见 §2.3 |
| A4 | §3.1 记录的 Go 基线 17.5% 疑为"虚假覆盖率记录" | **该怀疑被推翻**。17.5% 是 go1.25 下的真实测量值；差异源于工具链（见 D1） |
| A5 | §6.1 迁移"无条件"由内嵌链执行 | **表述过头**。实际有 `store.backend == "postgres"` 前置条件，默认 `memory` 后端下不执行 |
| A6 | 报告未提及 FTA「六种门 + NOT」失实 | **遗漏**。这是本次发现的最实质问题，8 处，见 §10.3 |
| A7 | §6.2 称 `test/load/` 为"空目录，仅 `.gitkeep`" | **该目录不存在** |
| A8 | 报告引用的 Go 代码片段 | **不精确**，漏了 `_ = pgStore.Close()`；已在实施中按源码核对 |
| A9 | 种子数据行数 | **原正则测错**。正确值：agents 7 / skills 26 / workflows 42 / fta 11 / rag 102（跨 45 个 collection）/ solutions 8 |
| A10 | 我写的 `api/__init__.py` docstring 里关于 `.gitignore` 的说法 | **不准确**。Task 5 规定的三条规则是 `.impeccable/review/`、`.impeccable/questions/`、`.hallmark/`（`.gitignore:127-130`）；我起初用错误的 grep 模式（`comp-`）去核对，读文件才发现是自己模式写错 |
| A11 | `docs/design/00-overview.md:142` 疑有失实 | **本就准确**（"五门类型故障树"），唯一欠缺是对齐脚注，属外观问题非事实错误，未改 |

**B. p0-p1 计划文档与实现不符**

| # | 计划的说法 | 实际 |
|---|---|---|
| B1 | `writeRegistryError` 是 Server 方法 | 包级函数，签名 `(w, err, logger, scope)` |
| B2 | 测试在 `pkg/server/error_response_test.go`，名 `TestWriteRegistryErrorMapping`，有 `testLogger` | 三者**均不存在**；真实测试是 `response_test.go:16 TestWriteRegistryError` |
| B3 | `platform.Dockerfile` 应为 go 1.25 | `deploy/docker/platform.Dockerfile:11` 的 `golang:1.26-alpine` 是 `6c0e0b4` **主动回退** `e21c0b6`（1.25）的结果，不是漏做的步骤 |
| B4 | Step 2b 是唯一的 pipefail 缺陷 | 还有第三处（`quality-gate.sh:119`），已由 `c1be6a4` 修 |
| B5 | Step 11.8 `Expected: 0` | **不可能达成**：7 处命中里 6 处是计划文档自身与其 spec |
| B6 | Step 11.7 扫描面 `docs/zh/` + `docs/design/` | **不足**，漏了 `web/src/`——正是 8 处 NOT 门宣称中 6 处的所在 |
| B7 | 文档片段引用 `schema_migrations.name` 列 | **该列不存在** |

**C. 刻意不做 / 不改**

| # | 事项 | 理由 |
|---|---|---|
| C1 | `resilient_selector.py:536-537` | 是**刻意的守卫**，不是反转条件 bug；`record_outcome` / `apply_decay` 调用链（`:459-460`、`:496-497`、`:504-505`）均正常 |
| C2 | `tools/buf/buf.gen.yaml` | 本地**未安装 `buf`**，改了无法验证；不提交未经验证的生成配置 |
| C3 | `ci.yaml` 内部 action 版本漂移 | `setup-node` 在 `:161`/`:183` 是 v4、在 `:96`/`:333` 是 v6；`setup-python` 在 `:237` 是 v5、在 `:74`/`:135`/`:323` 是 v6。**属实际缺陷但不在 §8 范围**，且统一升级会扩大 diff 面、干扰 dependabot PR 的判定，留待 1d 一并处理 |
| C4 | `docs/archive/` 与 `.zread/wiki/versions/` 的「六种门」 | 见 §10.3 的两条理由 |
| C5 | `.golangci.bck.yml` | **始终未跟踪、未改动**，与 `/tmp/golangci.yml.bak` 逐字节相同，从未提交——可能是用户既有工作，不擅动 |
| C6 | `pkg/event/nats.go` | 是**可用的 JetStream 总线实现**，只是零调用者；属未接线而非死代码缺陷，记录不删 |
| C7 | `AgentExecutionServer` | 指向一个不存在的服务；**记录在案而非删除**（删除会破坏 Go→Python 反向 gRPC 的既有契约面） |
| C8 | Go 覆盖率阈值 | 保持 17.0（见 D1） |

**D. 工具链与环境事实**

| # | 事实 |
|---|---|
| D1 | **Go 覆盖率对工具链高度敏感**：同一份代码在 `GOTOOLCHAIN=go1.25.6`（`hack/quality-gate.sh:14` 所钉）下测得 17.1–17.5%，在 go1.27 下测得 **32.2%**。当前 17.1% 对 17.0% 阈值只有 **0.1pt 余量**——这是正确的保守棘轮语义，且在钉版工具链下确定性可复现，故**不改**。但**任何 Go minor 升级都必须触发阈值重新校准**，否则棘轮会静默失效（阈值远低于实测，形同无门禁）。这也是 #43（golang 1.27-alpine）应搁置的原因。 |
| D2 | 本地 `go version` = go1.27.1；`go.mod` = `go 1.25.0`；`deploy/docker/platform.Dockerfile:11` = `golang:1.26-alpine`。三者不一致是既有状态，非本次引入。 |
| D3 | 门禁比较用的是**打印值/舍入值**：Go 一位小数（17.1），Python 整数（真实 42.8594% 打印为 `43%`）。 |
| D4 | `hack/quality-gate.sh` 权限是 **644**，`./hack/quality-gate.sh` 会 permission denied；正确调用方式是 `bash hack/quality-gate.sh`。`hack/*.sh` 普遍缺执行位。 |
| D5 | macOS **没有 `timeout` 命令**；本地**无 psql / docker**，故所有数据库相关结论均为**静态验证**（读代码 + 读迁移链），未实跑。 |
| D6 | `grep -rn` 会被 `.qoder/repowiki` 污染（该目录已在 `.gitignore:123`）；`grep --include=*.md` 在 zsh 下会因 glob 展开报 `no matches found`。 |
| D7 | `git add` 在遇到被忽略路径时会**输出建议并 exit 1，但文件其实已正确暂存**——不能只看退出码。 |
| D8 | `gh api compare/6492367...` 返回 **404**，因为该提交只存在于本地。 |
| D9 | gitleaks 的模块路径是 `github.com/zricethezav/gitleaks/v8`（非 `gitleaks/gitleaks`）。 |
| D10 | YAML 的 `uses` 是 **step 级**键，不是 job 级。 |
| D11 | `make seed` **半失败**（部分表插入成功、部分失败），故种子数据行数需从 `scripts/seed/seed.sql` 静态统计而非实跑得出（见 A9）。 |
| D12 | 真实的 gRPC stub 在 `python/src/resolveagent/v1/`（772 行生成物，Protobuf Python 6.31.1，含序列化 descriptor），不在 `api/`；`api/proto/resolveagent/v1/` 的 8 个 `.proto` **无任何生成的 `.pb.go`、无业务服务注册**。Go↔Python 的 gRPC `RegistryService` 是死代码（无 `RegisterRegistryServiceServer` 注册点），Python 实际经 `store/` 的 REST 客户端消费事实源。 |

**E. 本次实施中的操作失误（均已当场纠正，未进入提交）**

| # | 失误 | 纠正 |
|---|---|---|
| E1 | `cd python` 在 Bash 工具里**跨命令持续**，导致下一条 `cd python` 报 `no such file or directory` | 改用绝对路径。**同类失误发生两次**（另一次使 `bash hack/quality-gate.sh` 失败） |
| E2 | `t=$(grep -c '...' "$f" \|\| echo 0)` 报 `bad math expression: operator expected at '0'` | `grep -c` 无匹配时**本身已打印 `0` 并 exit 1**，`\|\| echo 0` 又追加一行 `0` → 两行。去掉兜底即可 |
| E3 | `grep -n '...' "$P" && ...` 链因合法的无匹配（exit 1）**静默跳过后续检查** | 改用 `;` 分隔 |
| E4 | `grep -rn "六种门" --include=*.md` 在 zsh 下报 `no matches found: --include=*.md` | 改用 Grep 工具 + `glob: !{node_modules,.git}/**`——**正是这次改用工具才发现 `.zread/wiki/` 的残留** |
| E5 | 用错误的模式（`comp-`）核对 `.gitignore`，一度以为子代理的结论是假的 | 直接读 `.gitignore:112-131`，证实**子代理是对的、我的模式是错的**。教训：两者冲突时读文件，不要信任何一方的 grep |
| E6 | 差点误删「2」副本的**正本** | 靠 diff 方向核对（副本 47,847 字节 < 正本 60,195 字节 → 副本更旧）避免 |
| E7 | 中文正文里混入直引号 | 统一为全角引号 |

### 10.5 复跑验收

实施全部完成后重跑门禁（`bash hack/quality-gate.sh`）：

```
==> Go Quality Checks
  [go-vet] PASS
  [go-build] PASS
  [go-lint] PASS          ← 基线时唯一的 FAIL，现已转绿
  [go-test] PASS
  [go-coverage>=17.0%] 17.1%

==> Python Quality Checks
  [py-ruff] PASS
  [py-format] PASS
  [py-test+coverage>=42.5%] 43%   ← 阈值由 42.0 上调（da0a376）

==> Web Quality Checks
  [web-lint] PASS
  [web-test] PASS

Quality Gate Summary: Passed 10 / Failed 0 / Warnings 0
QUALITY GATE PASSED
```

**基线 9/10 → 实施后 10/10。**

其他验收：

| 命令 | 结果 |
|---|---|
| `golangci-lint run ./...` | `0 issues`（v2.13.2，含 gosec/revive/gocritic 等全部额外 linter） |
| `cd python && uv run ruff check .` | `All checks passed!`（基线时有 1 处 UP032） |
| `cd web && pnpm exec tsc --noEmit` | exit 0 |
| `cd web && pnpm lint` | exit 0 |
| `cd python && uv run pytest tests/unit -q --collect-only` | `382 tests collected`（README 已同步为 382） |
| `actionlint .github/workflows/ci.yaml` | 无错误（`/Users/allengaller/go/bin/actionlint`） |
| `git ls-files \| grep -iE " 2\.\|copy\|\.orig\|\.bak\|~$"` | 无输出（两份副本已删；`.golangci.bck.yml` 未跟踪故不在此列） |

**未在本地验证的部分**：远端 CI 是否真的转绿——**必须 push 后在 GitHub Actions 验证**，本地无法替代。数据库迁移、gitleaks docker 镜像拉取、dependabot PR 重跑同理。

### 10.6 待用户授权事项

以下动作会改变**共享远端状态**，且 push 直接违反仓库既有的"不 push"约定，因此**已评估但未执行**：

1. **push 本地全部提交到 `origin/main`**（`bc9d946` → 当前 `HEAD`，即 12 个实施提交 + 本报告）。这是解除 19 个 dependabot PR 阻塞的**唯一前置条件**——三个 CI 根因都已在本地修完，但 `origin/main` 仍是被 dependabot 视为失败基线的 `bc9d946`。
2. **push 后在 GitHub Actions 验证 CI 转绿**，然后按 §10.2-1d 的判定表处理 PR：关闭 #31、搁置 #43、先合 #40 再评估 #32、#41 需改 `package.json`。
3. **用户账号侧操作（不进代码库）**：轮换 `.env` 中的 `XIAOMI_TOKEN_PLAN_API_KEY` 与 `EMBEDDING_API_KEY`。这两个键曾在历史提交中出现过，即使后续提交已移除，**旧提交对象里仍然可读**，只有轮换才能真正失效。此项无法由代码变更替代。

**未处理的已知债务**（不在 §8，建议排期）：

- **§5.1 的占位实现在代码里全部原样保留**。§8 第 2 项选的是方案 (b)——**只修正宣称，不伪造实现**，因此 `planning.py:670-673` 的 `_execute_action`（Plan-and-Execute 的 ReAct 循环仍不执行任何工具）与 `troubleshoot.py:250-260` 的 `_execute_command`（仍返回 `[Command execution placeholder]`）**至今是占位符**，与产品首条原则"证据先行"直接冲突，属最高优先级的真实功能缺口。其余 4 处：`agent/base.py:45`（基类 `reply()` 为 echo）、`registry_client.py:564-582`（`watch_registry` 不产出事件）、`runtime/engine.py:609`（无法按名加载 workflow）、`rag/index/milvus.py:397`（delete-by-expr 不生效）。`api/__init__.py` 的失实 docstring 已由 `24d2e6d` 修正，但该包仍是 27 行空壳。
- **ARCHITECTURE_IMPROVEMENTS 的 3 项「实现完成，未接线」**（Memory 三层架构、AgentMessageBus、ToolHub）：模块与单测齐备，但 `MegaAgent` / `ContextEnricher` / Skill 执行链里**没有任何生产调用点**，运行时不生效。接线是独立工作量，见该文档 `:168` 的说明。
- `ci.yaml` 内部 action 版本漂移（C3）、`hack/*.sh` 缺执行位（D4）。
- §3.2 的测试分布缺口（Python 零测试模块 7 个；Web 12 个测试文件无一测真实后端；6 个 code-analysis 方法永远走 mock）、§5.3 的依赖代差（vite 8 配 vitest 2.x）。
- `pkg/event/nats.go`（可用的 JetStream 总线，零调用方）与 `AgentExecutionServer`（指向不存在的服务）的接线（C6/C7）。
- **覆盖率棘轮的工具链敏感性**（D1）：Go 阈值 17.0% 对实测 17.1% 只有 0.1pt 余量，且该值随 Go 版本剧变（go1.25 → 17.5%，go1.27 → 32.2%）。**任何 Go minor 升级都必须重新标定基线**，否则棘轮会静默失效（阈值远低于实测 = 门禁形同虚设）。这也是 PR #43（`golang:1.27-alpine`）应搁置的原因。
