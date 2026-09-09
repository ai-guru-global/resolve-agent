# ResolveAgent 最佳实践修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复整体评估发现的全部 P0/P1 问题与可安全落地的 P2 问题：让 CI 真正可运行（含 e2e）、统一服务端错误处理（不泄漏内部细节）、加固 quality-gate、清理仓库卫生、给演示数据加新鲜度守卫与标识、拆分 mock.ts 数据层。

**Architecture:** 单仓库多语言（Go 平台服务 + Python runtime + React WebUI）。CI 是保障链的根，先修 CI 与 quality-gate；然后沿 "registry 返回 sentinel 错误 → server 统一映射为 HTTP 且不泄漏内部信息" 打通错误闭环；最后做不改变行为的卫生与结构清理。每个任务独立提交，全程 `main` 分支（仓库既有惯例为单分支直接提交）。

**Tech Stack:** Go 1.25 / golangci-lint、Python 3.11+ (uv)、React 18 + Vite + pnpm、GitHub Actions、actionlint。

**背景事实（执行者必读）：**
- `.github/workflows/ci.yaml` 第 8 行与第 184 行各有一份完整 workflow（`name/on/jobs` 重复定义），GitHub Actions 拒绝解析 → **CI 全线失效**。新版段（1-183）Go 版本写 1.23、旧版段写 1.22，均与 `go.mod` 的 `go 1.25.0` 不符。
- `hack/quality-gate.sh` 用 `((PASS++))` 自增；macOS bash 3.2 存活，但 CI Ubuntu bash 5.x 下 `set -e` 会让首个自增（值为 0）直接终止脚本。
- Go server 默认存储为内存实现（`pkg/server/server.go:52` 仅当 `cfg.Store.Backend == "postgres"` 才用 PG；config 无默认值 → 空字符串走内存），因此 CI 可无 Postgres 直接起服务跑 e2e。
- Python runtime 启动方式：`python -m resolveagent.runtime`（`python/src/resolveagent/runtime/__main__.py`，HTTP 端口默认 9091，可用 `RESOLVEAGENT_RUNTIME_PORT` 覆盖）。Go 侧 `pkg/server/runtime_client.go:25` 默认连 `localhost:9091` 的 HTTP `/v1`。
- e2e 测试（`test/e2e/`）通过 `skipIfNoServer`（探测 `localhost:8080/healthz`）决定是否跳过；`agent_lifecycle_test.go` 覆盖 create/get/list/execute(SSE)/delete/verify-404 全流程，execute 步骤需要 runtime 在 9091 存活。
- `pkg/registry/` 各实现用裸 `fmt.Errorf("... not found")`/`"... already exists"`，与 `pkg/errors` 的 sentinel 错误（`ErrNotFound`/`ErrAlreadyExists`/`ErrInvalidArgument`）完全不打通；`pkg/errors.HTTPStatus()` 已存在但无人使用。
- `pkg/server/agent_handlers.go:18,59,72` 等 22 个 handler 文件把 `err.Error()` 直接写进 HTTP 响应，内部错误细节会泄漏给客户端。
- `web/src/lib/demoTime.ts:1` 的 `DEMO_NOW = '2026-08-31T10:30:00Z'` 是**有意设计**：`web/src/api/mockQuality.test.ts:23` 专门断言演示窗口统一在 2026-08-25~08-31，且 GTM 页与控制台"数字同源"依赖固定锚点。正确修法是"新鲜度守卫 + 演示标识"，不是改成相对时间。
- `web/src/api/mock.ts` 3443 行，唯一导出是 2689 行的 `export const mockApi = {...}`，对象方法 0 处使用 `this.`，内部数据/帮助函数均为文件内顶层声明 → 可安全按域拆分。
- `web/src/api/client 2.ts`（macOS 复制残留）被 git 跟踪，且无任何 import 引用（已验证）。
- `internal/platform/{doc.go,agent/doc.go,skill/doc.go,workflow/doc.go}` 4 个占位文件被跟踪，无任何外部 import（已验证）。`test/load/.gitkeep` 被跟踪，目录为空。
- `README.md:75` 引用 `documentation/COMPREHENSIVE_ASSESSMENT_AND_METHODOLOGY.md`，该目录已不存在 → 死链。
- `python/README.md` 为 0 字节空文件。
- `.pids/`、`vibe_images/`、`documentation/`、`coverage.out`、`resolveagent-server` 二进制均**未被 git 跟踪**（无需清理，勿误删本地文件）。

**执行环境约定：**
- 工作目录：仓库根 `/Users/allengaller/Documents/GitHub/ai-guru-global/resolve-agent`。
- 不使用 worktree：仓库为单分支 main 直接提交的惯例，且 `.venv`/`node_modules` 等重型本地依赖使 worktree 成本过高。每任务独立 commit，随时可回滚。
- 只在本地提交，**不 push**；CI 是否真正变绿需用户 push 后在 GitHub Actions 验证（见 Task 9）。

---

## Task 1: quality-gate.sh 自增加固

**Files:**
- Modify: `hack/quality-gate.sh:27,36,69-75,101,117`（所有 `((PASS++))`、`((FAIL++))`、`((WARN++))`）

- [ ] **Step 1: 确认所有自增点**

Run: `grep -n "((PASS++))\|((FAIL++))\|((WARN++))" hack/quality-gate.sh`
Expected: 11 处（PASS×3、FAIL×2、WARN×6；含 check/warn 函数内 4 处与各阶段内联 7 处）。注意：所有位置都必须替换——只修函数内 6 处会让脚本在 set -e 下仍于内联位置（如 WARN=0 时的 `((WARN++))`）崩溃。

- [ ] **Step 2: 逐一替换为算术展开形式**

每处 `((PASS++))` 改为 `PASS=$((PASS+1))`；`((FAIL++))` → `FAIL=$((FAIL+1))`；`((WARN++))` → `WARN=$((WARN+1))`。例如 `hack/quality-gate.sh:27`：

```bash
# before
        ((PASS++))
# after
        PASS=$((PASS+1))
```

- [ ] **Step 3: 语法与行为验证**

Run: `bash -n hack/quality-gate.sh && echo SYNTAX_OK`
Expected: `SYNTAX_OK`

Run: `PASS=0; FAIL=0; WARN=0; set -e; PASS=$((PASS+1)); echo alive`
Expected: `alive`

- [ ] **Step 4: Commit**

```bash
git add hack/quality-gate.sh
git commit -m "fix(ci): quality-gate.sh 自增改用算术展开，规避 set -e 下 ((x++)) 退出"
```

---

## Task 2: 本地跑通 e2e（Go server + Python runtime）

此任务先于 CI 重写执行，确保写入 CI 的命令是被本地验证过的。

**Files:**
- Modify: `test/e2e/helper_test.go`（如健康检查等待需加长，可选）
- 无新文件

- [ ] **Step 1: 构建 Go server**

Run: `go build -o bin/resolveagent-server ./cmd/resolveagent-server && echo BUILD_OK`
Expected: `BUILD_OK`

- [ ] **Step 2: 启动 Python runtime 并确认存活**

```bash
cd python && RESOLVEAGENT_RUNTIME_PORT=9091 uv run python -m resolveagent.runtime > /tmp/runtime.log 2>&1 &
```

等待 5 秒后验证：

Run: `curl -sf http://localhost:9091/health && echo RUNTIME_OK || cat /tmp/runtime.log`
Expected: 返回 200 body + `RUNTIME_OK`。若失败，读 `/tmp/runtime.log` 排查（缺依赖时 `uv sync`），修正命令后重试；最终以验证通过的命令为准，后续 Task 3 使用同一命令。

- [ ] **Step 3: 启动 Go server 并确认健康**

```bash
./bin/resolveagent-server > /tmp/server.log 2>&1 &
```

Run: `sleep 2 && curl -sf http://localhost:8080/healthz && echo SERVER_OK || cat /tmp/server.log`
Expected: `{"status":...}` 之类的 200 body + `SERVER_OK`

- [ ] **Step 4: 运行 e2e 全套**

Run: `go test ./test/e2e/... -v -timeout 5m 2>&1 | tail -25`
Expected: 所有子测试 PASS（agent_lifecycle、workflow_execution、feedback_loop）。若 ExecuteAgent 因 LLM 凭证失败，检查 runtime 是否有 mock/offline 提供商配置（`configs/models.yaml`）；把使 e2e 全绿所需的最小 env（如 `RESOLVEAGENT_LLM_PROVIDER=mock` 之类）记录下来，Task 3 的 job 里要带上。若某子测试失败且根因是测试本身过时，修复测试并在 commit message 中说明。

- [ ] **Step 5: 收尾（杀进程、留档）**

```bash
pkill -f resolveagent-server; pkill -f "resolveagent.runtime"; true
```

- [ ] **Step 6: Commit（仅当改了测试/helper）**

```bash
git add test/e2e/
git commit -m "test(e2e): 本地全绿验证 Go server + Python runtime 启动链路"
```

（若本任务未改任何文件则跳过 commit，但必须把「验证通过的 runtime 启动命令 + 所需 env」记录在执行笔记中，Task 3 直接引用。）

---

## Task 3: 重写 ci.yaml（单份 workflow：lint → test → build → e2e → docker → quality-gate）

**Files:**
- Modify: `.github/workflows/ci.yaml`（全量重写，324 行 → 单份合并版）
- Modify: `deploy/docker/platform.Dockerfile`（builder 基础镜像对齐 go.mod）

- [ ] **Step 1: 对齐 platform.Dockerfile 的 Go builder 版本**

Run: `grep -n "golang:" deploy/docker/platform.Dockerfile`
若为 `golang:1.26-alpine` 或其他版本，改为 `golang:1.25-alpine`（与 `go.mod` 的 `go 1.25.0` 一致，消除"未来版本镜像"疑点）。`python:3.14`（runtime）与 `node`/`nginx`（webui）保持不动。

- [ ] **Step 2: 全量重写 .github/workflows/ci.yaml 为以下内容**

```yaml
# =============================================================================
# ResolveAgent CI Pipeline — Loop Engineering Continuous Integration Cycle
# =============================================================================
# commit -> lint -> test -> build -> e2e -> docker -> quality-gate
# Each stage gates the next; failures emit feedback signals for rapid iteration.
# =============================================================================

name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

env:
  GO_VERSION: "1.25"
  PYTHON_VERSION: "3.12"
  NODE_VERSION: "20"

jobs:
  # ===========================================================================
  # Stage 1: Lint Gate
  # ===========================================================================
  lint-go:
    name: Lint Go
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}
      - name: golangci-lint
        uses: golangci/golangci-lint-action@v6
        with:
          version: latest

  lint-python:
    name: Lint Python
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      - uses: astral-sh/setup-uv@v3
      - name: Install dependencies
        working-directory: python
        run: uv sync
      - name: Ruff check
        working-directory: python
        run: uv run ruff check src/ tests/
      - name: Ruff format check
        working-directory: python
        run: uv run ruff format --check src/ tests/

  lint-web:
    name: Lint Web
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
          cache-dependency-path: web/pnpm-lock.yaml
      - name: Install dependencies
        working-directory: web
        run: pnpm install --frozen-lockfile
      - name: ESLint
        working-directory: web
        run: pnpm lint

  # ===========================================================================
  # Stage 2: Unit Tests
  # ===========================================================================
  test-go:
    name: Test Go
    runs-on: ubuntu-latest
    needs: [lint-go]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}
      - name: Run Go tests
        run: go test -race -coverprofile=coverage-go.out -covermode=atomic ./...
      - name: Upload Go coverage
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-go
          path: coverage-go.out

  test-python:
    name: Test Python
    runs-on: ubuntu-latest
    needs: [lint-python]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      - uses: astral-sh/setup-uv@v3
      - name: Install dependencies
        working-directory: python
        run: uv sync
      - name: Run Python tests
        working-directory: python
        run: uv run pytest tests/ -v --cov=resolveagent --cov-report=xml
      - name: Upload Python coverage
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-python
          path: python/coverage.xml

  test-web:
    name: Test Web
    runs-on: ubuntu-latest
    needs: [lint-web]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
          cache-dependency-path: web/pnpm-lock.yaml
      - name: Install dependencies
        working-directory: web
        run: pnpm install --frozen-lockfile
      - name: Type-check & build
        working-directory: web
        run: pnpm build
      - name: Run Web tests
        working-directory: web
        run: pnpm test

  test-mobile:
    name: Test Mobile
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - name: Install dependencies
        working-directory: mobile
        run: npm ci
      - name: Type-check
        working-directory: mobile
        run: npx tsc --noEmit
      - name: Build
        working-directory: mobile
        run: npm run build

  # ===========================================================================
  # Stage 3: Build binaries
  # ===========================================================================
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [test-go, test-python, test-web]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}
      - name: Build Go binaries
        run: |
          mkdir -p bin
          go build -ldflags "-s -w" -o bin/resolveagent-server ./cmd/resolveagent-server
          go build -ldflags "-s -w" -o bin/resolveagent ./cmd/resolveagent-cli
      - name: Upload binaries
        uses: actions/upload-artifact@v4
        with:
          name: binaries
          path: bin/

  # ===========================================================================
  # Stage 4: End-to-End (Go server + Python runtime, in-memory store)
  # ===========================================================================
  e2e:
    name: E2E
    runs-on: ubuntu-latest
    needs: [build]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      - uses: astral-sh/setup-uv@v3
      - name: Install Python runtime dependencies
        working-directory: python
        run: uv sync --python 3.12
      - name: Build Go server
        run: go build -o bin/resolveagent-server ./cmd/resolveagent-server
      # Task 2 已本地验证：e2e 全绿无需 LLM 凭证（LLM 401 时 runtime 仍以 200 流式返回 SSE）。
      # 注意：必须带 -tags e2e，否则 feedback_loop_test.go（唯一带 //go:build e2e 的文件）被静默跳过。
      - name: Start Python runtime
        working-directory: python
        run: |
          RESOLVEAGENT_RUNTIME_PORT=9091 uv run python -m resolveagent.runtime > /tmp/runtime.log 2>&1 &
          echo $! > /tmp/runtime.pid
      - name: Start Go server
        run: |
          ./bin/resolveagent-server > /tmp/server.log 2>&1 &
          echo $! > /tmp/server.pid
      - name: Wait for services
        run: |
          for i in $(seq 1 30); do
            if curl -sf http://localhost:8080/healthz > /dev/null && curl -sf http://localhost:9091/health > /dev/null; then
              echo "services ready"; break
            fi
            sleep 2
          done
          curl -sf http://localhost:8080/healthz > /dev/null || { echo "Go server failed:"; cat /tmp/server.log; exit 1; }
          curl -sf http://localhost:9091/health > /dev/null || { echo "Python runtime failed:"; cat /tmp/runtime.log; exit 1; }
      - name: Run E2E tests
        run: go test ./test/e2e/... -v -tags e2e -count=1 -timeout 5m
      - name: Stop services
        if: always()
        run: |
          kill $(cat /tmp/server.pid) 2>/dev/null || true
          kill $(cat /tmp/runtime.pid) 2>/dev/null || true

  # ===========================================================================
  # Stage 5: Docker Build
  # ===========================================================================
  docker-build:
    name: Docker Build
    runs-on: ubuntu-latest
    needs: [build, test-mobile]
    steps:
      - uses: actions/checkout@v4
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      - name: Build runtime image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: deploy/docker/runtime.Dockerfile
          push: false
          tags: resolve-agent/runtime:ci
      - name: Build platform image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: deploy/docker/platform.Dockerfile
          push: false
          tags: resolve-agent/platform:ci
      - name: Build webui image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: deploy/docker/webui.Dockerfile
          push: false
          tags: resolve-agent/webui:ci

  # ===========================================================================
  # Stage 6: Quality Gate (feedback loop checkpoint)
  # ===========================================================================
  quality-gate:
    name: Quality Gate
    runs-on: ubuntu-latest
    needs: [e2e, docker-build]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}
      - name: Run quality gate
        run: bash hack/quality-gate.sh
      - name: Feedback loop summary
        run: |
          echo "=== Loop Engineering CI Feedback ==="
          echo "Stage: Quality Gate"
          echo "Status: PASSED"
```

- [ ] **Step 3: 结构自检（无重复顶层键）**

Run: `grep -c "^name: CI" .github/workflows/ci.yaml && grep -c "^on:" .github/workflows/ci.yaml`
Expected: `1` 和 `1`（各恰好一次）

Run: `python3 -c "import yaml; d=yaml.safe_load(open('.github/workflows/ci.yaml')); print(sorted(d['jobs'].keys()))"`
Expected: `['build', 'docker-build', 'e2e', 'lint-go', 'lint-python', 'lint-web', 'quality-gate', 'test-go', 'test-mobile', 'test-python', 'test-web']`

- [ ] **Step 4: actionlint 校验**

Run: `go install github.com/rhysd/actionlint/cmd/actionlint@latest && "$(go env GOPATH)/bin/actionlint" .github/workflows/ci.yaml`
Expected: 无输出（0 错误）。若 actionlint 对某个第三方 action 报 unknown 参数类警告，确认是误报后可忽略；结构错误必须修复。

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yaml deploy/docker/platform.Dockerfile
git commit -m "fix(ci): 合并重复 workflow 为单一流水线，Go 版本对齐 1.25，新增 e2e/mobile/docker 阶段"
```

---

## Task 4: Registry 错误统一为 sentinel 包装（TDD）

**Files:**
- Modify: `pkg/registry/` 下所有返回裸 `fmt.Errorf` 的实现（以 grep 结果为准，已知至少：`skill.go`、`rag.go`、`template.go`、`rag_document.go`、`fta_document.go`、`workflow.go`）
- Test: 受影响的现有 `pkg/registry/*_test.go`（如存在断言旧消息文本的用例则同步更新）

- [ ] **Step 1: 列出全部改造点**

Run: `grep -rn 'fmt.Errorf(".*not found")\|fmt.Errorf(".*already exists")\|fmt.Errorf("validation: %w"' pkg/registry/ | wc -l`
记录数量 N（预计 25-35 处）。

- [ ] **Step 2: 写失败测试（选一个代表文件，如 skill）**

在 `pkg/registry` 已有的 skill 测试文件中追加（若无该测试文件则新建 `pkg/registry/sentinel_test.go`，package 与被测包一致）：

```go
func TestSkillErrorsAreSentinelWrapped(t *testing.T) {
	reg := NewInMemorySkillRegistry()
	ctx := context.Background()

	_, err := reg.Get(ctx, "no-such-skill")
	if !errors.Is(err, errpkg.ErrNotFound) {
		t.Fatalf("expected ErrNotFound sentinel, got %v", err)
	}

	_ = reg.Create(ctx, &Skill{Name: "dup"})
	err = reg.Create(ctx, &Skill{Name: "dup"})
	if !errors.Is(err, errpkg.ErrAlreadyExists) {
		t.Fatalf("expected ErrAlreadyExists sentinel, got %v", err)
	}
}
```

（类型名/构造函数以 `pkg/registry/skill.go` 实际签名为准；import 需要：标准库 `context`、`errors`、`testing`，以及 `errpkg "github.com/ai-guru-global/resolve-agent/pkg/errors"`。）

- [ ] **Step 3: 运行确认失败**

Run: `go test ./pkg/registry/ -run TestSkillErrorsAreSentinelWrapped -v`
Expected: FAIL（sentinel 未包装）

- [ ] **Step 4: 批量改造包装格式**

统一格式：保留原实体描述、把 sentinel 放尾部 `%w`：

```go
// before
return nil, fmt.Errorf("skill %s not found", name)
// after
return nil, fmt.Errorf("skill %s: %w", name, errpkg.ErrNotFound)

// before
return fmt.Errorf("collection %s already exists", collection.ID)
// after
return fmt.Errorf("collection %s: %w", collection.ID, errpkg.ErrAlreadyExists)
```

对 Step 1 列出的全部 N 处逐一应用；`validation: %w` 保持原样（其上游已带 InvalidArgument 语义的不动）。文件顶部补 import `errpkg "github.com/ai-guru-global/resolve-agent/pkg/errors"`。

- [ ] **Step 5: 运行测试确认通过**

Run: `go test ./pkg/registry/... -v 2>&1 | tail -5`
Expected: 全部 PASS

- [ ] **Step 6: 全仓回归**

Run: `go build ./... && go test ./... 2>&1 | grep -v "^ok\|no test files" | head -10`
Expected: 无 FAIL 输出（e2e/integration 因无服务自动 skip 属正常）

- [ ] **Step 7: Commit**

```bash
git add pkg/registry/
git commit -m "refactor(registry): 错误统一包装 pkg/errors sentinel，打通 HTTP 状态映射"
```

---

## Task 5: Server 统一错误出口，禁止泄漏内部细节（TDD）

**Files:**
- Modify: `pkg/server/response.go`（新增 helper）
- Modify: `pkg/server/` 全部 22 个 handler 文件中的 registry/store 错误出口
- Test: `pkg/server/error_response_test.go`（新建）

- [ ] **Step 1: 写失败测试**

新建 `pkg/server/error_response_test.go`（fake registry 的构造方式先读 `pkg/server/server_test.go` 沿用其既有模式；下面代码按"构造最小 Server + httptest"写）：

```go
package server

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	errpkg "github.com/ai-guru-global/resolve-agent/pkg/errors"
)

func TestWriteRegistryErrorMapping(t *testing.T) {
	cases := []struct {
		name       string
		err        error
		wantStatus int
		wantBody   string // 必须包含；内部细节不得出现
	}{
		{"not found", fmt.Errorf("agent x-1: %w", errpkg.ErrNotFound), http.StatusNotFound, "x-1"},
		{"already exists", fmt.Errorf("agent x-2: %w", errpkg.ErrAlreadyExists), http.StatusConflict, "x-2"},
		{"invalid", fmt.Errorf("name: %w", errpkg.ErrInvalidArgument), http.StatusBadRequest, "name"},
		{"internal", fmt.Errorf("boom: pq: password dsn leaked"), http.StatusInternalServerError, "internal error"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			s := &Server{logger: testLogger(t)}
			w := httptest.NewRecorder()
			s.writeRegistryError(w, tc.err, "agent")
			if w.Code != tc.wantStatus {
				t.Fatalf("status = %d, want %d", w.Code, tc.wantStatus)
			}
			body := w.Body.String()
			if !contains(body, tc.wantBody) {
				t.Fatalf("body %q missing %q", body, tc.wantBody)
			}
			if tc.wantStatus == http.StatusInternalServerError && contains(body, "boom") {
				t.Fatalf("internal detail leaked: %q", body)
			}
		})
	}
}

func TestGetUnknownAgentReturns404WithoutLeak(t *testing.T) {
	s := newTestServer(t) // 若 server_test.go 无此 helper，则按其构造模式内联
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/agents/nope", nil)
	s.handleGetAgent(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", w.Code)
	}
	if contains(w.Body.String(), "goroutine") || contains(w.Body.String(), "localhost:5432") {
		t.Fatalf("internal detail leaked: %s", w.Body.String())
	}
}

func contains(s, sub string) bool { return strings.Contains(s, sub) }
```

（`Server` 字段名、logger 类型以 `pkg/server/server.go` 实际定义为准；若用 `errors` 包名冲突，测试文件内标准库 import 别名 stderrors 或直接用 `errpkg.As`。）

- [ ] **Step 2: 运行确认编译失败（helper 不存在）**

Run: `go test ./pkg/server/ -run TestWriteRegistryErrorMapping 2>&1 | head -5`
Expected: 编译错误 `s.writeRegistryError undefined`

- [ ] **Step 3: 在 pkg/server/response.go 实现 helper**

```go
import (
	errpkg "github.com/ai-guru-global/resolve-agent/pkg/errors"
)

// writeRegistryError 将 registry/store 层错误映射为 HTTP 响应。
// 只有 sentinel 语义错误会把错误文本回传客户端；其余一律记录日志并
// 返回 "internal error"，防止内部实现细节（DSN、SQL、堆栈）外泄。
func (s *Server) writeRegistryError(w http.ResponseWriter, err error, entity string) {
	switch {
	case errpkg.Is(err, errpkg.ErrNotFound):
		writeError(w, http.StatusNotFound, err.Error())
	case errpkg.Is(err, errpkg.ErrAlreadyExists), errpkg.Is(err, errpkg.ErrConflict):
		writeError(w, http.StatusConflict, err.Error())
	case errpkg.Is(err, errpkg.ErrInvalidArgument):
		writeError(w, http.StatusBadRequest, err.Error())
	default:
		var e *errpkg.Error
		if errpkg.As(err, &e) && errpkg.HTTPStatus(e) != http.StatusInternalServerError {
			writeError(w, errpkg.HTTPStatus(e), e.Message)
			return
		}
		s.logger.Error("request failed", "entity", entity, "error", err)
		writeError(w, http.StatusInternalServerError, "internal error")
	}
}
```

- [ ] **Step 4: 运行 Task 5 Step 1 的测试确认通过**

Run: `go test ./pkg/server/ -run "TestWriteRegistryErrorMapping|TestGetUnknownAgentReturns404" -v 2>&1 | tail -8`
Expected: 全部 PASS

- [ ] **Step 5: 全量替换 handler 中的裸错误出口**

逐文件把「registry/store/runtime 调用返回的 err 直接写响应」的调用点替换为 `s.writeRegistryError(w, err, "<entity>")`。entity 取该 handler 管理的资源名（agent/skill/workflow/collection/document/FTA tree/...）。替换判定规则：

- `writeError(w, http.StatusInternalServerError, err.Error())` → 一律替换
- `writeError(w, http.StatusNotFound, err.Error())` / `http.StatusConflict, err.Error())` → 一律替换（状态码改由 sentinel 决定）
- `writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())` 等**客户端输入**错误保持不变（回显的是客户端自己的输入，非内部细节）

Run（定位全部改造点）: `grep -rn "err.Error())" pkg/server/*_handlers.go | wc -l`
改完后验证：

Run: `grep -rn "writeError(w, http.StatusInternalServerError, err.Error())" pkg/server/ | wc -l`
Expected: `0`

- [ ] **Step 6: 回归 + lint**

Run: `go build ./... && go test ./... 2>&1 | grep -E "FAIL|panic" | head -5`
Expected: 无输出

Run: `golangci-lint run ./pkg/... 2>&1 | tail -5`
Expected: 无新增告警

- [ ] **Step 7: Commit**

```bash
git add pkg/server/
git commit -m "fix(server): 统一 registry 错误出口，内部错误细节不再泄漏给客户端"
```

---

## Task 6: 仓库卫生清理

**Files:**
- Delete: `web/src/api/client 2.ts`（git 跟踪）、`internal/platform/{doc.go,agent/doc.go,skill/doc.go,workflow/doc.go}`（git 跟踪）、`test/load/.gitkeep`（git 跟踪）
- Modify: `README.md:75`（死链）、`python/README.md`（0 字节 → 写实内容）
- Modify: `.github/workflows/e2e.yaml`、`.github/workflows/release.yaml`（Task 3 质量审查发现：两者仍钉 `GO_VERSION: "1.23"`，与 go.mod 1.25.0 漂移，依赖 GOTOOLCHAIN 自动下载——改为 "1.25"）

- [ ] **Step 1: 确认 client 2.ts 与 client.ts 无实质差异**

Run: `diff "web/src/api/client 2.ts" web/src/api/client.ts > /tmp/client-diff.txt; wc -l < /tmp/client-diff.txt`
Expected: 0（完全相同）。若 diff 非空，**停下**阅读差异：若 `client 2.ts` 含有 client.ts 没有的改动，先向用户报告而不是删除。

- [ ] **Step 2: 删除跟踪文件**

```bash
git rm "web/src/api/client 2.ts"
git rm internal/platform/doc.go internal/platform/agent/doc.go internal/platform/skill/doc.go internal/platform/workflow/doc.go
git rm test/load/.gitkeep
rmdir internal/platform/agent internal/platform/skill internal/platform/workflow internal/platform test/load 2>/dev/null; true
```

- [ ] **Step 3: 确认无引用残留**

Run: `grep -rn "internal/platform\|client 2\|test/load" --include="*.go" --include="*.ts" --include="*.tsx" --include="Makefile" --include="*.yaml" . | grep -v node_modules | grep -v ".venv" | head -5`
Expected: 无输出

Run: `go build ./... && echo GO_OK`
Expected: `GO_OK`

- [ ] **Step 4: 修复 README 死链**

删除 `README.md:75` 这一行（引用了不存在的 `documentation/COMPREHENSIVE_ASSESSMENT_AND_METHODOLOGY.md`）：

```markdown
> 📖 Full methodology and competitive assessment: [COMPREHENSIVE_ASSESSMENT_AND_METHODOLOGY.md](documentation/COMPREHENSIVE_ASSESSMENT_AND_METHODOLOGY.md)
```

Run: `grep -rn "documentation/" README.md | head -3`
Expected: 无输出

- [ ] **Step 5: 补写 python/README.md**

写入以下内容（基于 python/pyproject.toml 实际事实）：

```markdown
# ResolveAgent Python Runtime

ResolveAgent 的 Agent Runtime：意图路由（Selector）、故障树推理（FTA）、RAG 管线、
技能执行（Skills/Sandbox）、工具中枢（ToolHub）与语料生成（Corpus）。

## 环境要求

- Python 3.12（注意：3.14 会因 site.py 跳过 `_` 前缀 .pth 导致 uv 可编辑安装失效，`import resolveagent` 报 ModuleNotFoundError）
- [uv](https://docs.astral.sh/uv/)

## 快速开始

```bash
uv sync                      # 安装依赖（含可编辑安装 resolveagent）
uv run pytest tests/ -v      # 单元 + 集成测试
uv run ruff check src/ tests/  # lint
uv run python -m resolveagent.runtime  # 启动 runtime HTTP 服务（默认 :9091）
```

## 目录结构

- `src/resolveagent/` 第一方源码（selector / fta / rag / skills / toolhub / runtime / corpus / code_analysis 等）
- `tests/` 单元（unit/）与集成（integration/）测试
- `skills/` 运行时技能包
```

- [ ] **Step 5b: 对齐兄弟 workflow 的 Go 版本**

`.github/workflows/e2e.yaml` 与 `.github/workflows/release.yaml` 中 `GO_VERSION: "1.23"` → `"1.25"`（与 ci.yaml、go.mod 一致）。改动后 `"$(go env GOPATH)/bin/actionlint" .github/workflows/e2e.yaml .github/workflows/release.yaml` 校验。

- [ ] **Step 6: Commit**

```bash
git add -A README.md python/README.md
git commit -m "chore: 清理跟踪残留（client 2.ts/占位包/test-load），修复 README 死链，补 python README"
```

（commit 前用 `git status` 复核暂存区，确认只包含本任务文件。）

---

## Task 7: 演示数据新鲜度守卫 + 演示模式标识（TDD）

**Files:**
- Test: `web/src/api/mockQuality.test.ts`（追加守卫测试）
- Create: `web/src/components/DemoModeBadge.tsx`
- Modify: `web/src/components/Layout/MainLayout.tsx`（header 挂载徽标）

- [ ] **Step 1: 写失败测试（新鲜度守卫）**

在 `web/src/api/mockQuality.test.ts` 末尾追加（import 区域补 `import { DEMO_NOW } from '../lib/demoTime';`）：

```ts
describe('演示窗口新鲜度守卫', () => {
  it('DEMO_NOW 锚点距今天数 <= 90，过期说明演示窗口需有意识地整体更新', () => {
    const anchorAgeDays = (Date.now() - new Date(DEMO_NOW).getTime()) / 86_400_000;
    expect(anchorAgeDays).toBeLessThanOrEqual(90);
  });
});
```

- [ ] **Step 2: 运行确认通过（当前锚点 2026-08-31，未过期）**

Run: `cd web && pnpm test -- mockQuality 2>&1 | tail -5`
Expected: PASS（此测试当下应为绿；它的价值在 90 天后自动变红，倒逼整体刷新演示窗口）。若想当场验证守卫有效性，可临时把 `demoTime.ts` 的锚点改成 `2026-01-01` 观察变红，再改回。

- [ ] **Step 3: 创建 DemoModeBadge 组件**

新建 `web/src/components/DemoModeBadge.tsx`：

```tsx
import { Badge } from '@/components/ui/badge';
import { DEMO_NOW } from '@/lib/demoTime';
import { DEV_MOCKS_ENABLED } from '@/api/mockRuntime';

export function DemoModeBadge() {
  if (!DEV_MOCKS_ENABLED) return null;
  return (
    <Badge
      variant="outline"
      className="shrink-0 text-xs text-muted-foreground"
      title="当前页面由内置演示数据驱动，数据锚点固定，不代表真实运行状态"
    >
      演示数据 · 锚点 {DEMO_NOW.slice(0, 10)}
    </Badge>
  );
}
```

（若 `@/components/ui/badge` 不存在，改用 `<span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">` 等价实现。）

- [ ] **Step 4: 挂载到 MainLayout header**

在 `web/src/components/Layout/MainLayout.tsx` 的顶部 header 右侧控件区（主题切换按钮附近）插入 `<DemoModeBadge />`，并补 import。用真实 DOM 结构定位：读文件后放在与既有 header 控件同级的容器内。

- [ ] **Step 5: 验证**

Run: `cd web && pnpm build && pnpm lint && pnpm test 2>&1 | tail -6`
Expected: build/lint/test 全绿

Run: `cd web && pnpm dev &` 后浏览器打开 `http://localhost:5173`，确认 header 出现「演示数据 · 锚点 2026-08-31」徽标、页面无布局错乱；`Ctrl+C` 停止。

- [ ] **Step 6: Commit**

```bash
git add web/src/api/mockQuality.test.ts web/src/components/DemoModeBadge.tsx web/src/components/Layout/MainLayout.tsx
git commit -m "feat(web): 演示数据新鲜度守卫测试 + 控制台演示模式标识徽标"
```

---

## Task 8: mock.ts 数据层拆分（行为不变的机械重构）

前提已验证：`mockApi` 是唯一导出、0 处 `this.` 引用 → 拆分安全。策略：**只搬顶层声明，不动物体方法**；`mockApi` 留在 `mock.ts`，通过 import 引用搬走的数据与帮助函数。

**Files:**
- Create: `web/src/api/mock/shared.ts`、`mock/skills.ts`、`mock/workflows.ts`、`mock/rag.ts`、`mock/ops.ts`
- Modify: `web/src/api/mock.ts`（删除被搬走的声明，改为 import）

- [ ] **Step 1: 生成精确搬迁清单**

Run: `grep -n "^const \|^function \|^type \|^interface \|^export " web/src/api/mock.ts`
按行号把顶层声明归类（起始行已知，实际归属以依赖关系为准，用 `grep -n "名字" web/src/api/mock.ts` 查引用）：

- `mock/shared.ts`：`delay`、`randomDelay`、`defaultHarness` 及纯通用工具
- `mock/skills.ts`：`mockSkills`、`generatedSkillDisplayNames`、`generatedSkillIcons`、`formatSkillDisplayName`、`inferSkillLevel`、`inferExperiencePoints`、`createScenarioFlow`、`buildSkillDetailFromList`、`mockSkillDetails`
- `mock/workflows.ts`：`mockWorkflows`、`mockWorkflowDetails`、`mockFaultTrees`、`mockWorkflowExecutions`、`FTA_TREE_TARGET`
- `mock/rag.ts`：`mockCollections`、`mockCollectionDetails`、`mockDocuments`、`RAG_CORPORA`、`pickRagCorpora`
- `mock/ops.ts`：`mockTickets`、`mockPlatformStatus`、`mockAgentExecutions`、`mockAgentStatuses`、`EXEC_KEYWORDS`、`extractExecEntities`、`execAt`
- 1719 行之后、2689 行 `mockApi` 之前的其余顶层声明，按主引用域归入上述文件；确属跨域的放 `shared.ts`

每个新文件导出其承载的声明（`export const mockSkills ...`），并带上所需的类型 import（从 `mock.ts` 现有 import 头复制所需行）。

- [ ] **Step 2: 逆行号顺序搬迁（防行号漂移）**

从行号最大的声明开始搬（先 2689 行之前的最后一段，最后搬 60 行的 `delay`）。每搬完一个域：

Run: `cd web && pnpm build 2>&1 | tail -3`
Expected: 编译通过（tsc 会立刻暴露漏掉的 import/导出）。红了就修 import 再继续，**不许带着红色进入下一个域**。

- [ ] **Step 3: 全量验证**

Run: `cd web && pnpm build && pnpm lint && pnpm test 2>&1 | tail -8`
Expected: 全绿（`mockQuality.test.ts` 的 754 行断言是本次重构的安全网）

Run: `wc -l web/src/api/mock.ts web/src/api/mock/*.ts`
Expected: `mock.ts` 显著缩小（预计 <1200 行）；无空文件

- [ ] **Step 4: Commit**

```bash
git add web/src/api/
git commit -m "refactor(web): mock 数据按域拆分至 api/mock/，mock.ts 仅保留 mockApi 编排"
```

---

## Task 9: 全量验证收尾

- [ ] **Step 1: 三语言全量质量检查**

```bash
golangci-lint run ./... && go test ./... 2>&1 | grep -cE "^ok" 
cd python && uv run ruff check src/ tests/ && uv run pytest tests/ -q 2>&1 | tail -3 && cd ..
cd web && pnpm build && pnpm lint && pnpm test && cd ..
"$(go env GOPATH)/bin/actionlint" .github/workflows/*.yaml && echo ACTIONLINT_OK
```

Expected: 全部通过、e2e 与 docker workflow 无结构错误

- [ ] **Step 2: 端到端复跑 e2e（复用 Task 2 验证过的启动方式）**

Run: 按 Task 2 步骤重启 server+runtime 后 `go test ./test/e2e/... -v -tags e2e -count=1 -timeout 5m 2>&1 | tail -6`
Expected: 全 PASS，且 Task 5 改造后 404/409 语义保持

- [ ] **Step 2b: quality-gate.sh:80 coverage 管道 pipefail 加固（质量审查发现的同失败模式隐患）**

`COVERAGE=$(go tool cover ... | grep total | awk ... | sed 's/%//')` 在 pipefail 下若 go tool cover 非零退出或 grep 无匹配会直接杀死脚本。在 `sed 's/%//'` 后追加 `|| true`（line 81 的 `[ -n "$COVERAGE" ]` 已兜底空值）。单独提交：`fix(ci): quality-gate.sh coverage 管道补 || true，规避 pipefail 下 set -e 中断`。

- [ ] **Step 3: 汇报与移交**

向用户汇报：全部 commit 列表 + 建议 push 后观察 GitHub Actions 首次全绿运行（CI 修复只有 push 后才能在真实环境闭环验证）。提醒用户自行轮换 `.env` 中的 `XIAOMI_TOKEN_PLAN_API_KEY` 与 `EMBEDDING_API_KEY`（不进代码库，属用户账号操作）。

---

## 明确不做（deferred，含理由）

| 事项 | 理由 |
|---|---|
| `.env` 密钥轮换 | 用户账号操作，代码层无法代劳；文件未被 git 跟踪 |
| Python 179 处 `except Exception` 逐点收敛 | 需逐处行为分析，31K 行无差别改动风险大于收益，适合独立任务 |
| 5 个 >900 行 React 组件重构 | 无视觉回归基线，纯结构性重构放在演示冲刺期风险高 |
| web i18n | 产品决策而非缺陷 |
| docs/docs-site 内容合并 | 内容工程量大，且 README 链接已修，无运行时影响 |
| `skills/` 内 19 个 UI 设计类 skill | 属用户 AI 工具链资产，删除需用户确认 |
| 分支策略（feature/release branches） | 流程约定，与用户的工作方式相关，需用户决定 |
