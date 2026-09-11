# P4 治理收尾 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收尾生产化设计（docs/superpowers/specs/2026-09-09-production-hardening-design.md §4.4）：文档归一到 docs/ 唯一内容源、mobile 降级为示例、根目录运行期产物移出版本控制。

**Architecture:** 纯文件搬移 + 引用修正，无业务代码改动。docs/ 成为唯一内容源；docs-site/ 只留站点壳与薄引导页（stub 链接回 docs/）；mobile/ 整体 `git mv` 至 examples/mobile-demo/ 并同步 CI 与文档路径；`.pids/*.pid`/`coverage.out` 移出版本控制（.gitignore 规则已存在，无需改动）。

**Tech Stack:** git mv/rm、Markdown、TypeScript（Docusaurus 配置）、GitHub Actions YAML。验证以 `git ls-files`、引用 grep、`hack/quality-gate.sh` 全量门禁为准（Docusaurus 构建为可选 best-effort）。

**约束（沿用全项目）：** 直接在 main 提交；中文 Conventional Commits；不 push；不用 `--no-verify`；只 add 指定文件，禁止 `git add -A`。

---

### Task 1: 根目录卫生——运行期产物移出版本控制

**Files:**
- Modify (untrack): `.pids/platform.pid`, `.pids/runtime.pid`, `.pids/webui.pid`（git rm --cached）
- Delete (untracked 磁盘残留): `coverage.out`（2026-04-20 陈旧产物，270136 字节，未被跟踪）
- Delete (untracked 空目录): `docs/archive/session-reports 2`（0 个条目）

- [x] **Step 1: 确认 .gitignore 规则已覆盖三类产物（只验证，不改动）**

Run:
```bash
grep -n "^\.DS_Store$\|^coverage\.out$\|^\.pids/$" .gitignore
```
Expected: 三行都命中（实测 L77 `.DS_Store`、L118 `coverage.out`、L122 `.pids/`）。任何一行缺失则补进 `.gitignore` 后再继续。

- [x] **Step 2: 从版本控制移除 .pids/*.pid（保留磁盘文件）**

```bash
git rm --cached .pids/platform.pid .pids/runtime.pid .pids/webui.pid
```
Expected: 3 个文件 "unstage/removed from index"，磁盘上仍在（本机开发需要）。

- [x] **Step 3: 清理磁盘上的陈旧产物与会话残留目录**

```bash
rm coverage.out
rmdir "docs/archive/session-reports 2"
```
Expected: 无输出。`coverage.out` 是未跟踪的 4 月陈旧构建产物（删除即重建可得，安全）；"session-reports 2" 是空的未跟踪目录（`ls -A` 计数为 0）。

- [x] **Step 4: 验证**

```bash
git ls-files .pids/ coverage.out; git status --porcelain | grep -E "pids|coverage"
```
Expected: 第一条无输出；status 只显示 3 个 deleted 的 pid 文件（staged）。

- [x] **Step 5: Commit**

```bash
git add .gitignore 2>/dev/null; git reset .gitignore 2>/dev/null
git commit -m "$(cat <<'EOF'
chore(repo): .pids 运行期 pid 移出版本控制，清理陈旧 coverage.out 磁盘残留

.gitignore 已有规则但三个 pid 文件先于规则被跟踪，此次 git rm --cached 解除跟踪；
coverage.out 为未跟踪的 4 月陈旧产物直接删除；空目录 "session-reports 2" 一并清理。
EOF
)"
```
注：前两条 add/reset 仅在 Step 1 需要补 .gitignore 时有意义，正常路径下跳过这两条，直接 commit staged 的 3 个删除。

### Task 2: documentation/ 并入 docs/archive/（收尾设计项①）

**Files:**
- Move: `documentation/BUG_AUDIT_AND_FIX_REPORT_2026-09-07.md` → `docs/archive/BUG_AUDIT_AND_FIX_REPORT_2026-09-07.md`
- Move: `documentation/WIKI_K8S_BENCHMARK_DESIGN.md` → `docs/archive/WIKI_K8S_BENCHMARK_DESIGN.md`
- Delete: 空目录 `documentation/`

- [x] **Step 1: 搬移两个文件**

```bash
git mv documentation/BUG_AUDIT_AND_FIX_REPORT_2026-09-07.md docs/archive/BUG_AUDIT_AND_FIX_REPORT_2026-09-07.md
git mv documentation/WIKI_K8S_BENCHMARK_DESIGN.md docs/archive/WIKI_K8S_BENCHMARK_DESIGN.md
```

- [x] **Step 2: 删除空目录并验证**

```bash
rmdir documentation
git ls-files documentation/
```
Expected: 第一条无输出；第二条无输出（documentation/ 下再无跟踪文件）。

- [x] **Step 3: 引用核对**

```bash
git grep -n "documentation/" -- README.md docs/design docs/zh INDEX.md docs/INDEX.md
```
Expected: 无命中。已知命中仅存在于 docs/archive/session-reports/*（历史会话记录自述的当时路径，属归档原文不改）。若 README/design/zh 出现命中则逐处改为 `docs/archive/` 再进 Step 4。

- [x] **Step 4: Commit**

```bash
git commit -m "docs(archive): documentation/ 并入 docs/archive/——文档目录归一收尾"
```

### Task 3: docs-site 归一——内容搬入 docs/，站点壳薄化

**Files:**
- Move: 9 个内容文件（映射见 Step 1）
- Modify: `docs-site/sidebars.ts`（重写为仅 10 个真实 id）
- Modify: `docs-site/docusaurus.config.ts`（blog: false、footer/navbar 修正、editUrl 指向 docs/）
- Create: 9 个 stub 页（原路径，链接回 docs/ 源）
- Modify: `docs/design/00-overview.md`、`docs/design/09-go-platform.md`、`docs/design/11-gateway-config.md`（ADR 链接前缀 docs-site/docs/ → docs/）
- Modify: `README.md`（L900 docs-site 描述、L1055 树注释）
- Delete: 空目录 `docs-site/docs/user-guide/`、`docs-site/docs/architecture/`、`docs-site/blog/`

- [x] **Step 1: 搬移 9 个内容文件到 docs/（目标目录先建）**

```bash
mkdir -p docs/adr docs/blog
git mv docs-site/docs/intro.md docs/intro.md
git mv docs-site/docs/adr/001-why-multilang.md docs/adr/001-why-multilang.md
git mv docs-site/docs/adr/002-gateway-choice.md docs/adr/002-gateway-choice.md
git mv docs-site/docs/api/index.md docs/api/index.md
git mv docs-site/docs/dev-guide/index.md docs/dev-guide/index.md
git mv docs-site/docs/dev-guide/local-dev.md docs/dev-guide/local-dev.md
git mv docs-site/docs/dev-guide/contributing.md docs/dev-guide/contributing.md
git mv docs-site/docs/dev-guide/testing.md docs/dev-guide/testing.md
git mv docs-site/docs/ops/index.md docs/ops/index.md
git mv docs-site/blog/2024-01-15-hello-resolveagent.md docs/blog/2024-01-15-hello-resolveagent.md
```

- [x] **Step 2: 在原路径写 9 个 stub 页（Docusaurus id 不变，仅引导到唯一源）**

写入以下 9 个文件，正文只放标题与指引链接（绝对 GitHub 链接，规避 onBrokenLinks/onBrokenMarkdownLinks 检查）：

`docs-site/docs/intro.md`:
```markdown
# ResolveAgent 文档

本文档已归一至仓库唯一内容源：[docs/intro.md](https://github.com/ai-guru-global/resolve-agent/blob/main/docs/intro.md)。
```

`docs-site/docs/adr/001-why-multilang.md`:
```markdown
# ADR-001: 为什么选择多语言架构

本文档已归一至仓库唯一内容源：[docs/adr/001-why-multilang.md](https://github.com/ai-guru-global/resolve-agent/blob/main/docs/adr/001-why-multilang.md)。
```

`docs-site/docs/adr/002-gateway-choice.md`:
```markdown
# ADR-002: 为什么选择 Higress 作为 AI 网关

本文档已归一至仓库唯一内容源：[docs/adr/002-gateway-choice.md](https://github.com/ai-guru-global/resolve-agent/blob/main/docs/adr/002-gateway-choice.md)。
```

`docs-site/docs/api/index.md`:
```markdown
# API 参考

本文档已归一至仓库唯一内容源：[docs/api/index.md](https://github.com/ai-guru-global/resolve-agent/blob/main/docs/api/index.md)。
```

`docs-site/docs/dev-guide/index.md`:
```markdown
# 开发者指南

本文档已归一至仓库唯一内容源：[docs/dev-guide/index.md](https://github.com/ai-guru-global/resolve-agent/blob/main/docs/dev-guide/index.md)。
```

`docs-site/docs/dev-guide/local-dev.md`:
```markdown
# 本地开发环境搭建

本文档已归一至仓库唯一内容源：[docs/dev-guide/local-dev.md](https://github.com/ai-guru-global/resolve-agent/blob/main/docs/dev-guide/local-dev.md)。
```

`docs-site/docs/dev-guide/contributing.md`:
```markdown
# 代码贡献指南

本文档已归一至仓库唯一内容源：[docs/dev-guide/contributing.md](https://github.com/ai-guru-global/resolve-agent/blob/main/docs/dev-guide/contributing.md)。
```

`docs-site/docs/dev-guide/testing.md`:
```markdown
# 测试编写规范

本文档已归一至仓库唯一内容源：[docs/dev-guide/testing.md](https://github.com/ai-guru-global/resolve-agent/blob/main/docs/dev-guide/testing.md)。
```

`docs-site/docs/ops/index.md`:
```markdown
# 运维手册

本文档已归一至仓库唯一内容源：[docs/ops/index.md](https://github.com/ai-guru-global/resolve-agent/blob/main/docs/ops/index.md)。
```

- [x] **Step 3: 重写 docs-site/sidebars.ts（原配置引用 19 个 id，其中 9 个从未存在导致站点不可构建；改为仅 10 个真实 id）**

完整替换 `docs-site/sidebars.ts` 内容为：

```ts
import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// 内容唯一源在仓库根 docs/；本目录只保留引导 stub，新增内容请写进 docs/。
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {type: 'doc', label: '文档首页', id: 'intro'},
    {
      type: 'category',
      label: 'API 参考',
      items: ['api/index'],
    },
    {
      type: 'category',
      label: '开发者指南',
      items: [
        'dev-guide/index',
        'dev-guide/local-dev',
        'dev-guide/contributing',
        'dev-guide/testing',
      ],
    },
    {
      type: 'category',
      label: '运维手册',
      items: ['ops/index'],
    },
    {
      type: 'category',
      label: '架构决策',
      items: [
        'adr/001-why-multilang',
        'adr/002-gateway-choice',
      ],
    },
  ],
};

export default sidebars;
```

- [x] **Step 4: 修正 docs-site/docusaurus.config.ts（五处）**

1. preset `classic` 选项内，docs 的 `editUrl` 由 `.../tree/main/docs-site/` 改为 `.../tree/main/docs/`；删除整个 `blog: {showReadingTime: true, editUrl: ...}` 块，改为 `blog: false`：

```ts
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/ai-guru-global/resolve-agent/tree/main/docs/',
        },
        blog: false,
```

2. navbar items 中删除博客项：
```ts
        {to: '/blog', label: '博客', position: 'left'},
```

3. footer「文档」组：`快速开始` 的 `to: '/docs/user-guide/quickstart'` 改为 `to: '/docs/intro'`；`架构设计` 的 `to: '/docs/architecture/overview'` 改为外链：
```ts
            {
              label: '快速开始',
              to: '/docs/intro',
            },
            {
              label: '架构设计',
              href: 'https://github.com/ai-guru-global/resolve-agent/blob/main/docs/design/INDEX.md',
            },
```

4. footer「更多」组删除博客项：
```ts
            {
              label: '博客',
              to: '/blog',
            },
```

5. navbar 保留 `docId: 'api/index'` 与 `docId: 'dev-guide/index'`（stub 仍在，id 有效，无需改动）。

- [x] **Step 5: 清理 docs-site 残留空目录**

```bash
rmdir docs-site/docs/user-guide docs-site/docs/architecture docs-site/blog
```
Expected: 无输出（三个目录均为空/搬空）。

- [x] **Step 6: 修正 docs/design 三篇的 ADR 链接前缀**

```bash
sed -i '' 's|docs-site/docs/adr/|docs/adr/|g' docs/design/00-overview.md docs/design/09-go-platform.md docs/design/11-gateway-config.md
git grep -n "docs-site/docs/adr" -- docs/ README.md
```
Expected: sed 后 grep 无命中（覆盖 00-overview.md L29/33/57/169、09-go-platform.md L93/116/118/120、11-gateway-config.md L64 的 9 处 `[docs-site/docs/adr/…](docs-site/docs/adr/…)` 链接文本与 URL）。

- [x] **Step 7: README 两处改述**

L900（Documentation Site 节）旧：
```markdown
Online documentation site (Docusaurus): [`docs-site/`](docs-site/) —— 涵盖架构（architecture）、API、ADR、运维（ops）、开发指南（dev-guide）与用户指南（user-guide）。
```
新：
```markdown
Online documentation site (Docusaurus): [`docs-site/`](docs-site/) —— 仅站点壳与导航；内容唯一源在 [`docs/`](docs/)（设计蒸馏、中文文档、ADR、API、开发与运维指南）。
```

L1055 树注释旧：
```markdown
├── docs-site/                   # 📚 Docusaurus 文档站点
```
新：
```markdown
├── docs-site/                   # 📚 Docusaurus 站点壳（内容引用 docs/）
```

- [x] **Step 8: id↔文件一致性验证**

```bash
cd docs-site
ids="intro api/index dev-guide/index dev-guide/local-dev dev-guide/contributing dev-guide/testing ops/index adr/001-why-multilang adr/002-gateway-choice"
for id in $ids; do test -f "docs/$id.md" || echo "MISSING $id"; done
grep -oE "'(intro|api/index|dev-guide/index|dev-guide/local-dev|dev-guide/contributing|dev-guide/testing|ops/index|adr/001-why-multilang|adr/002-gateway-choice)'" sidebars.ts | sort -u | wc -l
```
Expected: 第一个循环无 MISSING；计数 = 9（sidebars 引用的每个 id 都有文件，且文件与 id 一一对应）。再抽查 `head -3 docs/intro.md` 应为 stub 文本、`head -3 ../docs/intro.md` 应为原正文（# ResolveAgent 文档…）。

- [x] **Step 9: （可选 best-effort）Docusaurus 构建验证**

```bash
cd docs-site && npm ci --no-audit --no-fund && npm run build
```
Expected: build 成功退出 0（重写后首次可构建）。若网络/时长不可行（安装约数百 MB），跳过并在验收报告注明「一致性脚本已过、站点构建待 CI/本地网络验证」。任何因 stub 缺 id、footer 死链报错都必须修复后再收尾本任务。

> 实际执行结果（2026-09-11）：docs-site 无任何锁文件（package-lock/pnpm-lock/yarn 均无），`npm ci` 无法执行，按上述跳过路径处理；改以静态兜底验证（Step 8 一致性 + src/static 无 /blog 与幻影文档路径引用）替代，完整构建留待补锁文件后进行。

- [x] **Step 10: Commit**

```bash
git add docs/intro.md docs/adr docs/api docs/dev-guide docs/ops docs/blog \
  docs-site/sidebars.ts docs-site/docusaurus.config.ts \
  docs-site/docs/intro.md docs-site/docs/adr/001-why-multilang.md docs-site/docs/adr/002-gateway-choice.md \
  docs-site/docs/api/index.md docs-site/docs/dev-guide/index.md docs-site/docs/dev-guide/local-dev.md \
  docs-site/docs/dev-guide/contributing.md docs-site/docs/dev-guide/testing.md docs-site/docs/ops/index.md \
  docs/design/00-overview.md docs/design/09-go-platform.md docs/design/11-gateway-config.md README.md
git commit -m "docs(site): docs-site 内容归一至 docs/ 唯一源——站点壳薄化为引导页，sidebars 修复 9 个幻影 id"
```

### Task 4: mobile 降级为示例 examples/mobile-demo/

**Files:**
- Move: `mobile/` → `examples/mobile-demo/`（17 个跟踪文件整体 `git mv`）
- Modify: `.github/workflows/ci.yaml`（test-mobile job：cache-dependency-path + 3 处 working-directory）
- Modify: `README.md`（L999 功能状态行、L1053 树行、L1076 examples 树注释）
- Modify: `docs/design/15-web-frontend.md`（L160 标题、L162 正文与 file:line 锚点路径）

- [x] **Step 1: 整体搬移**

```bash
git mv mobile examples/mobile-demo
git ls-files examples/mobile-demo | wc -l
```
Expected: 计数 = 17，`git ls-files mobile/` 无输出。

- [x] **Step 2: 修正 ci.yaml test-mobile job**

L178 旧：
```yaml
          cache-dependency-path: mobile/package-lock.json
```
新：
```yaml
          cache-dependency-path: examples/mobile-demo/package-lock.json
```
L180/L183/L186 三处旧：
```yaml
        working-directory: mobile
```
新（三处相同，逐一替换）：
```yaml
        working-directory: examples/mobile-demo
```
L167-168 注释与 L275 `needs: [build, test-mobile]` 不动。

- [x] **Step 3: README 三处改述**

L999 旧：
```markdown
| Mobile Web | 🟢 Ready | `mobile/` 移动端适配 |
```
新：
```markdown
| Mobile Web | 🟢 示例 | `examples/mobile-demo/` 移动端示例（独立原型，不随产品演进） |
```

L1053 旧：
```markdown
├── mobile/                      # 📱 移动端 Web 应用
```
新：整行删除（examples/ 已在 L1076 有树行，避免重复）。

L1076 旧：
```markdown
├── examples/                    # 示例 (quickstart / integrations)
```
新：
```markdown
├── examples/                    # 示例 (quickstart / integrations / mobile-demo)
```

- [x] **Step 4: 修正 docs/design/15-web-frontend.md**

L160 旧：
```markdown
### mobile/ 与 web 的关系
```
新：
```markdown
### examples/mobile-demo/ 与 web 的关系
```

L162 旧：
```markdown
mobile/ 是第二个独立的 Vite + React SPA（包名 mobile-ai-ops，react-router 6，仅 5 个 tab 页，无 api 层与状态库）[mobile/package.json:1-9](mobile/package.json#L1-L9)、[mobile/src/App.tsx:1-6](mobile/src/App.tsx#L1-L6)，与 web/ 不共享代码；web 内另有一个 /mobile 路由页是展示用页面，两者不是一套东西。
```
新：
```markdown
examples/mobile-demo/（原 mobile/，2026-09 治理收尾时降级为示例）是第二个独立的 Vite + React SPA（包名 mobile-ai-ops，react-router 6，仅 5 个 tab 页，无 api 层与状态库）[examples/mobile-demo/package.json:1-9](examples/mobile-demo/package.json#L1-L9)、[examples/mobile-demo/src/App.tsx:1-6](examples/mobile-demo/src/App.tsx#L1-L6)，与 web/ 不共享代码；web 内另有一个 /mobile 路由页是展示用页面，两者不是一套东西。
```

- [x] **Step 5: 残留引用核对**

```bash
git grep -n "mobile/" -- README.md docs/design docs/zh GTM .github Makefile deploy configs scripts | grep -v "examples/mobile-demo" | grep -v "/mobile "
```
Expected: 无命中。已知允许保留：`web/src/pages/Mobile/`（WebUI 内 /mobile 展示路由页，属 web 代码非路径引用）、README L800 `- **Mobile** — 移动端预览`（WebUI 页面导航项）、README L1000 CI/CD 行 `mobile 阶段`（CI job 名仍叫 test-mobile）、docs/archive 与 docs/superpowers 下的历史记录、.agents/.qoder 本地缓存（未跟踪）。若 README L246 架构图 `│  │ Mobile   │` 因指 WebUI 页面而保留，无需改动。

- [x] **Step 6: Commit**

```bash
git add examples/mobile-demo .github/workflows/ci.yaml README.md docs/design/15-web-frontend.md
git commit -m "refactor(examples): mobile 原型降级为 examples/mobile-demo 示例——CI 与文档路径同步"
```
（`git mv` 已自动暂存搬移；add 覆盖其余三个修改文件。）

### Task 5: 验收——git ls-files 无运行期产物、全量门禁绿、计划勾账

**Files:**
- Modify: 本计划文件（勾选全部 checkbox）

- [x] **Step 1: 版本控制清单验收（设计 §4.4 验收标准）**

```bash
git ls-files .pids/ coverage.out documentation/ mobile/ && echo FAILED || echo CLEAN
git ls-files | grep -c "\.pid$"
```
Expected: 第一条输出 CLEAN（四类路径均无跟踪文件）；第二条输出 0。

- [x] **Step 2: 文档单一来源陈述验收**

```bash
git ls-files docs/ | wc -l; git ls-files documentation/; git grep -c "docs-site/docs/adr" -- docs/ README.md; git grep -ln "唯一内容源" -- docs-site
```
Expected: docs/ 跟踪文件数 ≥ 123（原 114 + 搬入 10 - 搬出至 archive 前值）；documentation/ 无输出；第三条输出 0（grep -c 无匹配时退出码 1，属预期，命令用 `;` 串联继续）；第四条列出 9 个 stub 文件。

- [x] **Step 3: 全量质量门禁**

```bash
./hack/quality-gate.sh
echo GATE_EXIT=$?
```
Expected: PASS 全部阶段（go-lint / go-test / python / web 等 10/10），GATE_EXIT=0。注意用命令内 echo 捕获真实退出码，勿信包装进程退出码。门禁内 lint 需 `GOTOOLCHAIN` 由脚本内部钉住；如本地直跑 lint 出现 nats/yaml 类型检查噪音，加 `PATH="/Users/allengaller/go/bin:$PATH"` 与 `GOTOOLCHAIN=go1.25.6`。

- [x] **Step 4: 勾选本计划全部 checkbox 并提交**

```bash
sed -i '' 's/^- \[ \]/- [x]/' docs/superpowers/plans/2026-09-11-p4-governance-cleanup.md
git add docs/superpowers/plans/2026-09-11-p4-governance-cleanup.md
git commit -m "docs(plan): P4 治理收尾计划勾账完成"
```

---

## Self-Review 记录

- **Spec 覆盖**：设计 §4.4 三项——①文档归一 → Task 2（documentation/ 收尾）+ Task 3（docs-site 归一）；②mobile 降级 → Task 4；③根目录卫生 → Task 1；验收标准（单一来源陈述、git ls-files 无运行期产物、全量测试绿）→ Task 5。无遗漏。
- **占位符扫描**：所有步骤含完整命令/完整文件内容/精确行号，无 TBD。
- **一致性**：sidebars.ts 10 个 id 与 9 个 stub 文件 + blog 移除方案自洽；ci.yaml 三处 working-directory 与 cache 路径同步；README/设计文档改述与搬移路径一致。
- **已知边界**：docs/archive、docs/superpowers 内的历史路径引用不改（归档原文）；.agents/.qoder 本地缓存引用不处理（未跟踪）；README 2.md 为用户自有内容（与 README.md 不同），不在本次范围，验收报告单列。
