# P2 交付与安全 实施计划（Delivery & Security Hardening）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让安全扫描进入 CI、覆盖率门禁真实阻断、发布流水线归一、e2e 工作流修复废弃调用、WebUI 镜像构建严格化且 nginx 非 root。

**Architecture:** 全部改动集中在 CI 配置（`.github/workflows/`）、门禁脚本（`hack/quality-gate.sh`）、基线文件（`test/fixtures/baseline/coverage-baseline.json`）、Python 项目配置（`python/pyproject.toml`）与交付文件（`deploy/docker/webui.Dockerfile` 等）。不改任何业务代码。

**Tech Stack:** GitHub Actions（gitleaks-action v2、CodeQL v3、trivy-action）、bash、uv 0.12+（本地实测 0.12.7）、Go 1.25、pytest-cov、nginx-unprivileged。

**规划期实测数据（2026-09-11，本计划据此定基线）：**
- Go 覆盖率：`go test -coverprofile` 全仓 `./...` → **32.2%**
- Python 覆盖率：`pytest tests/unit --cov=resolveagent` → TOTAL 12260 语句 miss 6996 → **42.9%**
- 两者均低于目标（Go 50 / Python 60），按规格"阈值取实测基线值、只升不降"，基线取 **Go 32.0 / Python 42.0**（向下取整留浮点余量；达标后抬到目标值）。

**规划期发现的前置事实（任务中处理）：**
- pytest/pytest-cov 挂在 `python/pyproject.toml` 的 `[project.optional-dependencies].dev`，而 CI 用 `uv sync`（只装 `[dependency-groups]`）→ CI 根本装不上 pytest。需迁到 `[dependency-groups].dev`。
- pyproject 无 `pythonpath = ["src"]` → `uv run pytest` 直接报 `ModuleNotFoundError: resolveagent`。需补一行。
- 本地 `.venv` 曾处于半损坏状态（pytest 模块缺失、`uv sync --all-groups` 修复）——执行前先 `uv sync` 确认环境健康。
- 全量 `pytest tests/` 本地实测 >5 分钟（顶层集成类测试有网络等待）；门禁覆盖率口径定为 `tests/unit`（全量套件已由 CI test-python 阶段把关，门禁追求快而确定）。

---

### Task 1: 填真覆盖率基线 coverage-baseline.json

**Files:**
- Modify: `test/fixtures/baseline/coverage-baseline.json`

- [x] **Step 1.1: 确认环境健康（uv sync + 基线回归）**

```bash
cd python && uv sync --all-groups
uv run pytest tests/unit -q
```

Expected: `371 passed`（若少于 371，停下排查——不得在红基线上推进）。

- [x] **Step 1.2: 复测两个覆盖率数值（记录到执行日志）**

```bash
cd /Users/allengaller/Documents/GitHub/ai-guru-global/resolve-agent
go test -coverprofile=/tmp/gocover-p2.out ./... && go tool cover -func=/tmp/gocover-p2.out | tail -1
cd python && uv run pytest tests/unit -q --cov=resolveagent --cov-report=term | grep -E "^TOTAL|passed"
```

Expected: Go `total: 32.2%`；Python `TOTAL ... 43%` / `371 passed`。若与规划期实测偏差 >2 个百分点，以新值向下取整更新 Step 1.3 中的阈值。

- [x] **Step 1.3: 写入真实基线**

将 `test/fixtures/baseline/coverage-baseline.json` 整体替换为：

```json
{
  "timestamp": "2026-09-11T00:00:00Z",
  "go_coverage_percent": 32.2,
  "python_coverage_percent": 42.9,
  "loop_engineering": {
    "description": "Coverage baseline for the test-analyze-improve feedback loop",
    "minimum_go_coverage": 32.0,
    "minimum_python_coverage": 42.0,
    "trend_tracking": true
  }
}
```

（`go_coverage_percent`/`python_coverage_percent` 为实测快照；`minimum_*` 为门禁阈值。若 Step 1.2 复测偏差大，四个数同步更新：快照用实测值，阈值向下取整。）

- [x] **Step 1.4: 验证 JSON 可解析且键可读**

```bash
python3 -c "import json; d=json.load(open('test/fixtures/baseline/coverage-baseline.json'))['loop_engineering']; print(d['minimum_go_coverage'], d['minimum_python_coverage'])"
```

Expected: `32.0 42.0`

- [x] **Step 1.5: Commit**

```bash
cd /Users/allengaller/Documents/GitHub/ai-guru-global/resolve-agent
git add test/fixtures/baseline/coverage-baseline.json
git commit -m "chore(ci): 覆盖率基线填真实测值——Go 32.2%/Python 42.9%，门禁阈值 32/42 只升不降"
```

---

### Task 2: quality-gate.sh 门禁真生效 + Python 测试依赖修复

**Files:**
- Modify: `hack/quality-gate.sh`
- Modify: `python/pyproject.toml`
- Modify: `.github/workflows/ci.yaml`（quality-gate job 补运行时依赖）

- [x] **Step 2.1: pyproject 补 pythonpath + 迁移 dev 测试依赖到 dependency-groups**

`python/pyproject.toml` 三处改动：

(1) `[tool.pytest.ini_options]` 改为：

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
pythonpath = ["src"]
```

(2) `[project.optional-dependencies]` 删除整个 `dev = [...]` 块（`rag` 块保留）：

```toml
[project.optional-dependencies]
rag = [
    "pymilvus>=2.4.0",
    "qdrant-client>=1.12.0",
]
```

(3) 文件末尾 `[dependency-groups]` 改为：

```toml
[dependency-groups]
dev = [
    "pytest>=9.0.3",
    "pytest-asyncio>=0.24.0",
    "pytest-cov>=6.0.0",
    "ruff>=0.8.0",
    "mypy>=1.20.0",
    "types-pyyaml>=6.0.12.20260408",
]
```

- [x] **Step 2.2: 验证 uv run pytest 不再需要 PYTHONPATH**

```bash
cd python && uv sync --all-groups && uv run pytest tests/unit -q
```

Expected: `371 passed`（无 ModuleNotFoundError）。

- [x] **Step 2.3: quality-gate.sh 加基线读取助手**

`hack/quality-gate.sh` 在 `set -euo pipefail` 之后、颜色定义之前插入：

```bash
BASELINE_FILE="test/fixtures/baseline/coverage-baseline.json"

baseline_value() {
    python3 -c "import json; print(json.load(open('$BASELINE_FILE'))['loop_engineering']['$1'])"
}
```

（键在 `loop_engineering` 层级下，保留既有文件结构。）

- [x] **Step 2.4: Go 覆盖率从 informational 改为阻断**

将 `# --- Stage 1: Go ---` 中如下整块（原 77-90 行）：

```bash
# Go coverage threshold (non-blocking, informational)
echo -n "  [go-coverage] "
if go test -coverprofile=/tmp/gocover.out ./... > /dev/null 2>&1; then
    COVERAGE=$(go tool cover -func=/tmp/gocover.out 2>/dev/null | grep total | awk '{print $3}' | sed 's/%//')
    if [ -n "$COVERAGE" ]; then
        echo -e "${GREEN}${COVERAGE}%${NC}"
    else
        echo -e "${YELLOW}N/A${NC}"
        WARN=$((WARN+1))
    fi
else
    echo -e "${YELLOW}SKIP${NC}"
    WARN=$((WARN+1))
fi
```

替换为：

```bash
# Go coverage threshold (blocking, baseline-driven: test/fixtures/baseline/coverage-baseline.json)
GO_MIN=$(baseline_value "minimum_go_coverage")
echo -n "  [go-coverage>=${GO_MIN}%] "
if go test -count=1 -coverprofile=/tmp/gocover.out ./... > /dev/null 2>&1; then
    COVERAGE=$(go tool cover -func=/tmp/gocover.out 2>/dev/null | grep total | awk '{print $3}' | sed 's/%//')
    if [ -n "$COVERAGE" ] \
        && python3 -c "import sys; sys.exit(0 if float('$COVERAGE') >= float('$GO_MIN') else 1)"; then
        echo -e "${GREEN}${COVERAGE}%${NC}"
        PASS=$((PASS+1))
    else
        echo -e "${RED}FAIL (coverage ${COVERAGE:-N/A}% < threshold ${GO_MIN}%)${NC}"
        FAIL=$((FAIL+1))
    fi
else
    echo -e "${RED}FAIL (go test failed)${NC}"
    FAIL=$((FAIL+1))
fi
```

- [x] **Step 2.5: Python 阶段 warn() 改阻断 + 新增覆盖率门禁**

将 `# --- Stage 2: Python ---` 中 `if command -v uv &> /dev/null; then` 到对应 `fi` 的内部整块（原 99-101 行三个检查）：

```bash
        check "py-ruff" bash -c "cd $PYTHON_DIR && uv run ruff check src/ tests/"
        check "py-format" bash -c "cd $PYTHON_DIR && uv run ruff format --check src/ tests/"
        warn "py-test" bash -c "cd $PYTHON_DIR && uv run pytest tests/ -q --tb=short"
```

替换为：

```bash
        check "py-ruff" bash -c "cd $PYTHON_DIR && uv run ruff check src/ tests/"
        check "py-format" bash -c "cd $PYTHON_DIR && uv run ruff format --check src/ tests/"

        # 覆盖率口径 = tests/unit：全量套件（tests/ 含集成类）已由 CI test-python 阶段把关，
        # 门禁追求快而确定。阈值来自 coverage-baseline.json，只升不降。
        PY_MIN=$(baseline_value "minimum_python_coverage")
        echo -n "  [py-test+coverage>=${PY_MIN}%] "
        PY_OUT=$(cd "$PYTHON_DIR" && uv run pytest tests/unit -q --tb=short --cov=resolveagent --cov-report=term 2>&1)
        PY_COV=$(echo "$PY_OUT" | grep -E "^TOTAL" | awk '{print $NF}' | sed 's/%//')
        if echo "$PY_OUT" | grep -qE "^[0-9]+ passed" \
            && [ -n "$PY_COV" ] \
            && python3 -c "import sys; sys.exit(0 if float('$PY_COV') >= float('$PY_MIN') else 1)"; then
            echo -e "${GREEN}${PY_COV}%${NC}"
            PASS=$((PASS+1))
        else
            echo -e "${RED}FAIL (coverage ${PY_COV:-N/A}% < threshold ${PY_MIN}% or tests failed)${NC}"
            echo "$PY_OUT" | grep -E "FAILED|ERROR" | head -5
            FAIL=$((FAIL+1))
        fi
```

- [x] **Step 2.6: Web 阶段 warn() 改 check()**

将 `# --- Stage 3: Web ---` 中的：

```bash
    warn "web-lint" bash -c "cd $WEB_DIR && pnpm lint"
    warn "web-test" bash -c "cd $WEB_DIR && pnpm test --passWithNoTests"
```

替换为：

```bash
    check "web-lint" bash -c "cd $WEB_DIR && pnpm lint"
    check "web-test" bash -c "cd $WEB_DIR && pnpm test --passWithNoTests"
```

- [x] **Step 2.7: ci.yaml quality-gate job 补 Python/Web 运行时**

`.github/workflows/ci.yaml` 的 `quality-gate:` job，`- uses: actions/setup-go@v5` 及其 `with` 之后、`- name: Run quality gate` 之前插入：

```yaml
      - uses: actions/setup-python@v6
        with:
          python-version: ${{ env.PYTHON_VERSION }}
      - uses: astral-sh/setup-uv@v3
      - name: Install Python dependencies
        working-directory: python
        run: uv sync --all-groups
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v6
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
          cache-dependency-path: web/pnpm-lock.yaml
      - name: Install Web dependencies
        working-directory: web
        run: pnpm install --frozen-lockfile
```

- [x] **Step 2.8: 本地全量跑门禁**

```bash
cd /Users/allengaller/Documents/GitHub/ai-guru-global/resolve-agent && bash hack/quality-gate.sh
```

Expected: 末尾 `QUALITY GATE PASSED`、`exit 0`；go-coverage 显示 ≥32% 绿、py-test+coverage 显示 ≥42% 绿。（本地 web node_modules 存在，web-lint/web-test 会真实执行；若本地 pnpm 环境异常导致这两项 FAIL，先修 web 环境再继续，不得放宽门禁。）

- [x] **Step 2.9: 注入坏样本验证阻断（验收要求）**

```bash
python3 - <<'EOF'
import json
p = 'test/fixtures/baseline/coverage-baseline.json'
d = json.load(open(p))
d['minimum_go_coverage'] = 99.0
d['minimum_python_coverage'] = 99.0
json.dump(d, open(p, 'w'), indent=2)
EOF
bash hack/quality-gate.sh; echo "GATE_EXIT=$?"
```

Expected: 输出含 `FAIL (coverage ...% < threshold 99.0%)`（go 与 py 各一条），`GATE_EXIT=1`。记录此输出作为验收证据，然后还原：

```bash
git checkout -- test/fixtures/baseline/coverage-baseline.json
```

- [x] **Step 2.10: Commit**

```bash
git add hack/quality-gate.sh python/pyproject.toml .github/workflows/ci.yaml python/uv.lock
git commit -m "feat(ci): 质量门禁真实阻断——Go/Python 覆盖率基线驱动 fail()，Python/Web 检查由 warn 升为阻断；pytest 依赖迁入 dependency-groups 并补 pythonpath"
```

（`python/uv.lock` 若被 `uv sync` 更新一并提交；未变更则从 add 列表去掉。）

---

### Task 3: CI 安全扫描——gitleaks + CodeQL

**Files:**
- Modify: `.github/workflows/ci.yaml`
- Create: `.github/workflows/codeql.yml`

- [x] **Step 3.1: ci.yaml 增加 secrets 扫描 job**

在 `jobs:` 下 `lint-go:` 之前插入（Stage 0，无 needs，最先跑）：

```yaml
  # ===========================================================================
  # Stage 0: Security — secret leak scan (full history)
  # ===========================================================================
  security-secrets:
    name: Secret Scan (gitleaks)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [x] **Step 3.2: 新建 codeql.yml**

创建 `.github/workflows/codeql.yml`：

```yaml
# =============================================================================
# ResolveAgent CodeQL Security Analysis — go + python
# =============================================================================

name: CodeQL

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 3 * * 1"

jobs:
  analyze:
    name: Analyze (${{ matrix.language }})
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
    strategy:
      fail-fast: false
      matrix:
        language: [go, python]
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3
        with:
          category: "/language:${{ matrix.language }}"
```

- [x] **Step 3.3: actionlint 校验全部 workflow**

```bash
cd /Users/allengaller/Documents/GitHub/ai-guru-global/resolve-agent
go run github.com/rhysd/actionlint/cmd/actionlint@latest .github/workflows/ci.yaml .github/workflows/codeql.yml
```

Expected: 无输出、exit 0（首次运行会下载模块）。若网络受限改用 `docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest -color`。

- [x] **Step 3.4: Commit**

```bash
git add .github/workflows/ci.yaml .github/workflows/codeql.yml
git commit -m "feat(ci): 安全扫描进 CI——gitleaks 全历史泄漏扫描 + CodeQL(go/python) 静态分析"
```

---

### Task 4: 发布流水线合并 + Trivy 镜像扫描

**Files:**
- Modify: `.github/workflows/release.yaml`
- Delete: `.github/workflows/docker-publish.yaml`

**背景事实：** compose 与 helm 早已使用 `resolveagent-*` 镜像名；release.yaml 却推 `ghcr.io/<owner>/<repo>-*`（即 `resolve-agent-*`，与消费端脱节），docker-publish.yaml 推的才是 `resolveagent-*` 但与 release 重复触发（同为 tag v*）。合并后以 `resolveagent-*` 为唯一镜像名。

- [x] **Step 4.1: release.yaml 统一镜像名**

`env:` 块改 `IMAGE_PREFIX`：

```yaml
env:
  GO_VERSION: "1.25"
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ghcr.io/${{ github.repository_owner }}/resolveagent
```

- [x] **Step 4.2: build-push-action 升 v7 并加 Trivy 扫描**

将 release job 的 build-push 步骤替换为（在 `Extract tag` 步骤之后）：

```yaml
      - name: Build and push ${{ matrix.component }}
        uses: docker/build-push-action@v7
        with:
          context: .
          file: deploy/docker/${{ matrix.component }}.Dockerfile
          push: true
          tags: |
            ${{ env.IMAGE_PREFIX }}-${{ matrix.component }}:${{ steps.tag.outputs.version }}
            ${{ env.IMAGE_PREFIX }}-${{ matrix.component }}:latest

      - name: Trivy scan ${{ matrix.component }}
        uses: aquasecurity/trivy-action@0.28.0
        with:
          image-ref: ${{ env.IMAGE_PREFIX }}-${{ matrix.component }}:${{ steps.tag.outputs.version }}
          format: table
          exit-code: "1"
          ignore-unfixed: true
          severity: CRITICAL,HIGH
```

（`ignore-unfixed: true` + `exit-code: "1"`：只有存在可修复的 CRITICAL/HIGH 才阻断发布。）

- [x] **Step 4.3: 删除 docker-publish.yaml**

```bash
git rm .github/workflows/docker-publish.yaml
```

- [x] **Step 4.4: 验证无旧镜像名残留**

```bash
grep -rn "resolve-agent-platform\|resolve-agent-runtime\|resolve-agent-webui" \
  .github deploy configs README.md docs/zh docs-site 2>/dev/null
```

Expected: 无输出（docs/archive 中的历史记录不在扫描范围，刻意不改写）。

- [x] **Step 4.5: actionlint + Commit**

```bash
go run github.com/rhysd/actionlint/cmd/actionlint@latest .github/workflows/release.yaml
git add .github/workflows/release.yaml
git commit -m "feat(release): 发布流水线归一——镜像名统一 resolveagent-*（与 compose/helm 对齐），构建后 Trivy 扫描阻断可修复危漏；移除重复的 docker-publish 工作流"
```

---

### Task 5: e2e.yaml 修复——移除废弃迁移调用 + 健康探针等待

**Files:**
- Modify: `.github/workflows/e2e.yaml`

**背景事实：** Makefile 明确警告 `scripts/migration` 已废弃且 SQL 与平台内嵌迁移（`pkg/store/postgres`，平台启动时自动执行）不兼容（UUID vs VARCHAR）——e2e.yaml 的 `make migrate-up` + `make seed` 在污染数据库；`sleep 5` 是竞态等待。

- [x] **Step 5.1: 删除两个迁移/种子步骤**

删除 `- name: Apply migrations`（含 env 与 `run: make migrate-up`）和 `- name: Load seed data`（含 env 与 `run: make seed`）两个完整 step 块。

- [x] **Step 5.2: 服务启动改为 pid 文件 + 健康探针循环**

将 `- name: Start platform server` 步骤：

```yaml
      - name: Start platform server
        env:
          RESOLVEAGENT_DATABASE_PASSWORD: testpassword
        run: |
          ./bin/resolveagent-server &
          sleep 5
```

替换为：

```yaml
      - name: Start platform server
        env:
          RESOLVEAGENT_DATABASE_PASSWORD: testpassword
        run: |
          ./bin/resolveagent-server > /tmp/server.log 2>&1 &
          echo $! > /tmp/server.pid

      - name: Wait for platform server
        run: |
          for i in $(seq 1 30); do
            if curl -sf http://localhost:8080/healthz > /dev/null; then
              echo "platform server ready"; break
            fi
            kill -0 "$(cat /tmp/server.pid)" 2>/dev/null || { echo "server process died:"; cat /tmp/server.log; exit 1; }
            sleep 2
          done
          curl -sf http://localhost:8080/healthz > /dev/null || { echo "platform server failed:"; cat /tmp/server.log; exit 1; }
```

（`/healthz` 已在 `pkg/server/router.go:9` 注册；等待循环与 ci.yaml e2e 阶段同构。）

- [x] **Step 5.3: 验证废弃调用清零 + actionlint**

```bash
grep -n "migrate-up\|make seed\|sleep 5" .github/workflows/e2e.yaml
go run github.com/rhysd/actionlint/cmd/actionlint@latest .github/workflows/e2e.yaml
```

Expected: grep 无输出；actionlint 无输出。

- [x] **Step 5.4: Commit**

```bash
git add .github/workflows/e2e.yaml
git commit -m "fix(ci): e2e 工作流修复——移除污染库的废弃 migrate-up/seed 调用（平台自迁移），sleep 5 改健康探针等待循环"
```

---

### Task 6: webui.Dockerfile 严格化 + nginx 非 root

**Files:**
- Modify: `deploy/docker/webui.Dockerfile`
- Modify: `deploy/docker/nginx/default.conf`
- Modify: `deploy/docker-compose/docker-compose.yaml`（webui 端口映射）

- [x] **Step 6.1: 去掉 pnpm install 掩盖回退**

`deploy/docker/webui.Dockerfile` 第 18 行：

```dockerfile
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install
```

改为：

```dockerfile
RUN pnpm install --frozen-lockfile
```

- [x] **Step 6.2: nginx 基础镜像换非 root 特权端口版**

Stage 2 的 `FROM nginx:1.29-alpine` 改为：

```dockerfile
FROM nginxinc/nginx-unprivileged:1.29-alpine
```

同文件 `EXPOSE 80` 改为 `EXPOSE 8080`；HEALTHCHECK 中 `http://127.0.0.1:80/` 改为 `http://127.0.0.1:8080/`。

- [x] **Step 6.3: nginx 配置监听端口同步**

`deploy/docker/nginx/default.conf` 第 7 行 `listen 80;` 改为：

```nginx
    listen 8080;
```

- [x] **Step 6.4: compose 端口映射同步**

`deploy/docker-compose/docker-compose.yaml` webui 服务第 130 行：

```yaml
      - "127.0.0.1:${WEBUI_PORT:-3000}:80"
```

改为：

```yaml
      - "127.0.0.1:${WEBUI_PORT:-3000}:8080"
```

- [x] **Step 6.5: 验证（有 docker 则真实构建）**

```bash
docker info > /dev/null 2>&1 && docker build -f deploy/docker/webui.Dockerfile -t resolveagent-webui:p2-check . \
  || echo "docker 不可用，静态校验代替"
grep -rn "|| pnpm install" deploy/docker/
grep -n "listen" deploy/docker/nginx/default.conf
```

Expected: grep 回退语句无输出；listen 为 8080。docker 可用时构建成功即通过（构建日志不得出现 lockfile 回退告警）。

- [x] **Step 6.6: Commit**

```bash
git add deploy/docker/webui.Dockerfile deploy/docker/nginx/default.conf deploy/docker-compose/docker-compose.yaml
git commit -m "fix(deploy): WebUI 镜像严格化——pnpm install 移除掩盖回退，nginx 换 nginx-unprivileged 非 root 运行并统一 8080 端口"
```

---

### Task 7: P2 验收

**Files:** 无新改动（只验证 + 记录）

- [x] **Step 7.1: 全部 workflow 语法校验**

```bash
go run github.com/rhysd/actionlint/cmd/actionlint@latest .github/workflows/*.yaml .github/workflows/*.yml
```

Expected: exit 0 无输出。

- [x] **Step 7.2: 门禁全量绿（阻断模式）**

```bash
bash hack/quality-gate.sh && echo "GATE_OK"
```

Expected: `QUALITY GATE PASSED` + `GATE_OK`。

- [x] **Step 7.3: 注入验证证据齐备（复核 Step 2.9 已留记录）**

确认执行日志中有：低阈值注入 → `GATE_EXIT=1` → 还原 → `GATE_OK` 的完整链路。

- [x] **Step 7.4: 残留扫描**

```bash
grep -rn "|| pnpm install" deploy/docker/ ; grep -n "make migrate-up\|make seed\|sleep 5" .github/workflows/e2e.yaml ; \
grep -rn "resolve-agent-platform\|resolve-agent-runtime\|resolve-agent-webui" .github deploy configs README.md docs/zh docs-site 2>/dev/null ; \
git status --short
```

Expected: 三条 grep 均无输出；git status 干净（仅 `README 2.md` 未跟踪项，历史遗留，不属于本阶段）。

- [x] **Step 7.5: 向用户报告**

报告内容必须包含：各任务提交哈希、注入验证证据（GATE_EXIT=1）、已知边界——**CI 全绿与 Trivy/CodeQL 实际运行无法本地证明（用户约束不推送），actionlint 已保证语法与结构正确，推送后首跑即验证**；`docker-publish.yaml` 删除后 tag 推送只触发 release.yaml 一条流水线。

---

## Self-Review 记录（已执行）

- 规格覆盖：4.2 节 5 项 → Task 2（覆盖率门禁）、Task 3（gitleaks+CodeQL）、Task 4（Trivy+流水线合并）、Task 5（e2e）、Task 6（webui）；验收（注入验证）→ Task 2.9 + Task 7.3。无遗漏。
- 占位符扫描：所有代码块为完整可粘贴内容；唯一数据依赖（覆盖率数值）在规划期已实测填入（32.2/42.9/32.0/42.0），Step 1.2 提供偏差处理规则。
- 类型/命名一致性：`baseline_value` 函数名、JSON 键 `minimum_go_coverage`/`minimum_python_coverage`、`PY_COV`/`GO_MIN`/`PY_MIN` 变量在 Task 1/2/7 间一致；镜像名 `resolveagent-*` 与 compose/helm 既有值一致（已 grep 证实）。
- 执行顺序依赖：Task 2 依赖 Task 1 的基线键；Task 7 依赖全部。Task 3-6 相互独立。
