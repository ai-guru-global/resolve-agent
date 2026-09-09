# ResolveAgent 设计文档蒸馏计划

> 生成方式：code-up ｜ 源码基线 commit：`21fdb74` ｜ 风格基准：ai-guru-database《Document_Templates.md》
> 状态：**待用户批准（硬门禁）**

---

## 目标

把「设计思路」（为什么这么设计、出了问题怎么查）从源码中蒸馏为一组带 `file:line` 锚点的中文 Markdown 文档，输出到 `docs/design/`。每条结论可回读源码验证；与现有 `docs/zh/`（使用向文档）互补，不改写后者。

## 风格规范（参考 ai-guru-database + code-up 契约）

- **frontmatter**：`title / category / tags / summary(一句话理解) / created / updated / depth / component_score / generated: code-up / source_commit`
- **开头**：`# 标题 (English Title)` + `> **一句话理解**` 引用块
- **正文**：设计原理（为什么）→ 关键决策 → 依赖 → 暴露接口 → 数据流（mermaid）→ 排查指南 → 已知坑（core 必填）
- **锚点**：`[file.py:42](python/src/resolveagent/.../file.py#L42)`，每个非平凡论断至少一个；无锚点结论标 `> [!NOTE] 推测：…依据：…`
- **排版**：导航用表格（文档｜内容｜适用读者）、mermaid 首选 flowchart、中英文混排加空格、文末 `*Last updated*`
- 深度档位章节要求按 `references/depth-guide.md` 速查表执行

## 文档清单（16 篇 + INDEX）

| # | 文档 | 覆盖模块 (LOC) | 档位 | 篇幅估 | 内容要点 |
|---|------|---------------|------|--------|---------|
| 1 | 00-overview.md | 全局 | core | ~260 | 三语言分层动因、SSOT、事件驱动、能力可组合四层、请求生命周期全景 |
| 2 | 01-selector.md | selector/ (3880) | core | ~300 | 三阶段路由、规则/LLM/混合策略、Resilient Selector 反馈自适应、决策审计 |
| 3 | 02-runtime.md | runtime/ (2609) | core | ~240 | MegaAgent 编排引擎：会话管理、路由调用、流式输出、子系统集成 |
| 4 | 03-fta.md | fta/ (1955) | standard | ~180 | 六门类型语义、最小割集、蒙特卡洛仿真、与 zh 版 fta-engine.md 分工 |
| 5 | 04-rag-corpus.md | rag/ (2653) + corpus/ (3727) | core | ~280 | 摄取→嵌入→Milvus→重排链路、三级重排回退、语料双写沉淀 |
| 6 | 05-skills-hooks.md | skills/ (2735) + hooks/ (529) | core | ~250 | 技能清单/沙箱（CPU/内存限额）/生命周期、Hook 前后置机制 |
| 7 | 06-memory-planner-toolhub.md | memory.py (583) + planning.py (666) + toolhub.py (624) | standard | ~200 | 三层记忆（TTL+LRU）、REACTIVE+DELIBERATIVE 双模式规划、工具注册与审计 |
| 8 | 07-code-analysis.md | code_analysis/ (2525) + traffic/ (1000) | standard | ~200 | 静态 AST 调用图 + 动态流量采集、服务依赖图、方案生成 |
| 9 | 08-mcp-llm.md | mcp/ (909) + llm/ (1680) | standard | ~170 | MCP 适配器、Provider 抽象与多模型路由 |
| 10 | 09-go-platform.md | pkg/server (4284) + internal/platform + cmd | core | ~280 | REST/gRPC 门面、中间件（JWT/错误映射）、agent/skill/workflow 领域服务 |
| 11 | 10-registry-store.md | pkg/registry (3002) + pkg/store (3435) | core | ~260 | 注册表 SSOT、16 张表分组、迁移策略、与 database-schema.md 对照 |
| 12 | 11-gateway-config.md | pkg/gateway (1378) + pkg/config (510) + configs/*.yaml | standard | ~170 | Higress 路由同步、三件套配置（resolveagent/models/runtime.yaml） |
| 13 | 12-resilience-feedback.md | resilience.py (295) + pkg/circuitbreaker (378) + pkg/retry (220) + pkg/feedback (1138) | standard | ~180 | 三态熔断、多级降级、反馈闭环（OODA） |
| 14 | 13-eventbus-observability.md | message_bus.py (442) + pkg/event (260) + pkg/telemetry (587) + pkg/health (295) | standard | ~160 | Pub/Sub + Req/Resp 总线、OTel 三支柱、健康探针 |
| 15 | 14-docsync-integrations.md | docsync/ (1414) + integrations/ (733) | shallow | ~100 | 职责 + 接口 + 排查入口（首行声明浅度） |
| 16 | 15-web-frontend.md | web/src (33070) | standard | ~190 | stores/pages/hooks 分层、API client、实时事件订阅 |
| — | INDEX.md | — | — | ~60 | ai-guru-database 式导航：按读者角色/按子系统双维表格 |

合计 ≈ 3,330 行。

## 深度定档依据（分量评分五维度：代码量/被引用/变更频率/入口性/复杂度）

assess_components.py 已运行，但其 refs 维度对 Go 包全部计 0（仅解析 TS import），Go 组件分数系统性偏低（实测 registry≈0.66、store 0.31、gateway 0.35）。按 depth-guide「蒸馏者可升档但须在文档中写明理由」执行人工修正：

- **core（7 篇）**：selector（全仓引用中枢、复杂度最高）、runtime（编排入口）、pkg/server（HTTP 入口）、pkg/registry+store（SSOT，升档理由：refs 维度失真，实际被所有 handler 依赖）、rag+corpus、skills（沙箱安全关键，升档理由：安全边界）、overview（跨切面总纲）
- **standard（8 篇）**：fta、memory/planner/toolhub、code-analysis、mcp-llm、gateway-config、resilience-feedback、eventbus、web
- **shallow（2 篇）**：docsync-integrations、INDEX

## 执行顺序

00 → 09 → 10 → 01 → 02 → 05 → 04 → 03 → 06 → 07 → 08 → 11 → 12 → 13 → 15 → 14 → INDEX（先骨架后外围，core 优先）

## 验证与门禁（每篇 + 全局）

1. `verify_citations.py --mode existence` → `--mode extract-lines`（failure_count=0 才过）
2. `validate_mermaid.py docs/design/`（mmdc 缺失则记 skipped）
3. `gate.py --config code-up.yaml`（error=0 才过）
4. 人工复查 5 项：蒸馏非复述 / 深度与档位一致 / 跳过项有理由 / 抽查 3-5 锚点无幻觉 / 评分合理

## 不做的事

- 不改写 `docs/zh/` 既有 25 篇（只在 INDEX 增加互链）
- 不覆盖 Quick Start / 部署操作类内容（已有 quickstart.md、deployment.md）
- 不碰用户未提交改动（deploy/*、python/milvus.py、benchmarks/ 等）
- 文档内禁用绝对路径

## 风险与说明

- 锚点行号绑定 commit `21fdb74`，后续代码演进需按 frontmatter 的 source_commit 还原
- web/src 体量大但分层规整，standard 档只读入口 + stores + api client，不做组件级蒸馏

---

## 补遗（第二轮查漏补缺 · 2026-09-05）

首轮 16 篇交付后做 LOC 全量审计，发现三个未覆盖模块，按同一规范补齐：

| 新增文档 | 覆盖模块 | LOC | depth | 补充理由 |
|---|---|---|---|---|
| 16-corpus-import.md | python/src/resolveagent/corpus/ | 3,727 | standard | 全仓第二大 Python 模块，首轮计划误将其归入 04 篇范围 |
| 17-cli.md | internal/cli/ | 2,811 | standard | 第三大 Go 包、CLI 进程入口，首轮 source.paths 未单列 |
| 18-traffic-analysis.md | python/src/resolveagent/traffic/ | 1,000 | standard | 首轮组件清单完全遗漏；有 runtime HTTP 入口，定 standard 非 shallow |

审计后判定无需独立成文的模块：agent/（898 行，MegaAgent，02 篇已深挖双路由陷阱）、python store/（1,364 行，HTTP 客户端薄层，属于 10 篇数据面）、pkg/service/（299 行，10 篇同步链路提及）、internal/tui/（253 行，17 篇 dashboard 一节覆盖）、python telemetry/（129 行，13 篇覆盖）。
