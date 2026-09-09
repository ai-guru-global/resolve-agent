# DESIGN — ResolveAgent GTM 白皮书

<!-- design-sidecar 2 · surface: GTM/index.html · hallmark rebuild 2026-09-07 · genre: editorial · macrostructure: Long Document · theme: Editorial · nav: N6 masthead · footer: Ft4 colophon -->

记录已构建页面（ground truth），非意图。世界：**编辑部白皮书**（暖纸 + 墨 + 朱砂）× 结构 **Long Document**（报头 → 封面 → 图版 → 账本 → 时刻表 → 封底 → 版权栏）。原「调度总图 / 白昼调度台」暗浅色仪器世界已整体退役，被 Hallmark redesign 全量替换；产品事实、文案意图、外链与演示数据全部沿用。

**Register（当前事实）**：纸页就是纸页——无 glow、无阴影、无渐变、无滚动 reveal；强调只靠 weight / 字号 / 朱砂；所有演示数据带「示意 / 演示 / 规划示意」标签；无任何虚构声明（无客户案例 / 基准 / 证言）。终端窗与径迹版保留深色，是纸页上仅有的两块「影印仪器」。四线路色只出现在图版与账本数据内，不进入版式语言。

## World

把 GTM 页做成一份可引用的白皮书。访客读封面主张 → 图 1—5 看懂机制与闭环 → 数据账本对账 → 读 GTM 战略时刻表 → 封底预约演示。五张机制演示全部制成印刷图版（`figure.plate-fig` + `figcaption`，图 N 朱砂图号，`plate-note` 声明示意）。首屏 = N6 报头（期号行「第 1 号 · 市场进入策略（GTM）白皮书 · 二〇二六年九月」+ 刊名 ResolveAgent + 两侧 wing 语 + 1px/3px double 双细线导航）之下是居中封面：题眉、三行大标题、导语、署名行；随后 图 1 活字发车板作为第一张图版。

## Palette（OKLCH token，无内联色值 · gate 48）

所有颜色与字体一律引用 `:root` token（`GTM/tokens.css` 为同块导出）。禁止在规则内书写 hex / oklch 字面量；散点色经 CSS 自定义属性类下发（`.lc-*` 注入 `--lc`、`.rt-*` 路由名、`.tag-*` SVG 铭牌、`.t-*` 深版径迹、`.ln-*` 线路描边）。

| Token | 值 | 用途 |
|---|---|---|
| `--paper` / `--paper-2` / `--paper-3` | oklch 97% / 94% / 90.5%（暖纸） | 页底 / 面板底 / 翻牌与条底 |
| `--rule` / `--rule-2` | oklch 85% / 68% | 细线 / 深线（表头、double 线、焦点描边基线） |
| `--ink` / `--ink-2` / `--ink-3` | oklch 21% / 38% / 52% | 正文三级 |
| `--accent` | oklch 52% .17 35（朱砂） | ≤5%：题眉 / 图号 / `.em-ink`「根因」/ 预约演示 CTA / `.pos mark` / `.dchip b` / `::selection` / skip / `:focus-visible` / 飞轮中心 +6/班 |
| `--line-fta / -rag / -skill / -code` | 57% .19 40 / 52% .11 175 / 47% .21 285 / 49% .12 80 | 四线路色（仅图版内 + 账本占比条 + ICP 站点圆） |
| `--lchip-*`（四线加深） | 36% .14 46 / 29% .083 143 / 36% .155 323 / 30% .09 74 | 发车板线路 chip 实底（白字 ≥4.5:1，实测 4.7–4.9；经 40–41 校准，与线路描边分离成对 token） |
| `--tag-*`（四线加深） | 各线路 L−10~16% | 总图站名铭牌 tag、账本路由名 `.rt-*` |
| `--ok-ink` / `--ok-bg` | oklch 42% .11 155 / 93% .035 155 | 「系统运行正常」/ `.stat.go` 已发车牌 |
| `--plate-*` | 16%~92% 低彩蓝灰 | 深色仪器（终端 / 径迹版）八件套：bg、bar、rule、ink、dim、o、ok、hl |

favicon 为品牌资产例外（data-URI 内联 hex ≈ 朱砂/墨）。

## Type（2+1：Fraunces + Newsreader 双衬线 × JetBrains Mono 机器数据）

- Display：`--font-display` Fraunces 900（+ Noto Serif SC 兜底）——h1（clamp 40–72px，三行硬换行）、h2、刊名、nsrow 大数、CTA、飞轮节点题。
- Body：`--font-body` Newsreader 17px/1.75（+ Noto Serif SC）——导语、署名行、图注、icprow、timetable。
- Mono：`--font-mono` JetBrains Mono——时刻 / 事件号 / 文件路径 / 指标 / logtable / colophon / 期号行 / mast wing / `.tk▸`。
- 中文统一 Noto Serif SC；标题一律 roman（无 italic 表头，gate 38a）；Google Fonts `media=print onload` 异步 + noscript 回退。

## Components

- **N6 报头 `header.nav-mast`**：期号行（mono 居中，≤560 缩字号收字距，≤400 letter-spacing 0 保单行）→ `mast-mid`（wing「多路径智能路由」/ 刊名 Fraunces 900 / wing「排查知识自沉淀闭环」，≤960 wing 隐藏）→ `mast-rule` 1px → `mast-nav` 8 项 ul（6 页内锚 + 产品页外链 + `.mast-cta` 预约演示朱砂下边线，≤960 隐藏）→ `mast-rule.double` 3px double。
- **封面 `#cover`**：`.kicker` 朱砂 mono 题眉；h1 三行「告警进站，/四线分岔，/终点站是根因。」（`.em-ink` 只染「根因」）；`.standfirst` 导语居中 ≤58ch；`.byline` 上下细线夹 mono 署名行（含演示窗口与示意声明）。
- **图版 `figure.plate-fig`**：细边 + 图体 + `figcaption.plate-cap`（上方 1px 分隔线；`.fig-no` 朱砂「图 N」）+ `.plate-note`（mono 11px 示意声明）。五图共用此骨架。
- **图 1 发车板 `.board`**：`role=table` + aria-label（含「示意数据」）。板头 = 呼吸 LED + 「发车板 · 实时进站」+ 绿点「系统运行正常」（≤560 只留绿点）+ mono 时钟；`.board-scroll`（overflow-x:auto，≤960 min-width 560 平移）内 `.flapgrid` 4 列（时刻 / 事件编号 / 告警摘要 / 分发线路，`aria-live=off`）；`.ftile` 暖纸翻牌（`::after` 中线仅数字牌，`.wide` 不画中线），`.fchip` 实色 `--lc` 线路块；noscript 静态单行回退。
- **图 2 调度总图**：svg viewBox `0 0 1440 740`，`.fig-scroll`（min-width 920 平移）。枢纽居下（720,646 双环 + 铃铛 + 「告警入口 / 实时进站」），四线向上放射（FTA 实线 w10，RAG w9 / SKILL w8 / CODE w7 虚线 16 12），白底站名铭牌 `.plate`（`tag-*` + 机制名 + mono 调用计数），顶部四座终点站，`#train` 纸底线路色描边圆。
- **意图模拟器 `.simrow/.chip`**：4 枚告警胶囊（Pod NotReady 默认 `.on`），选中朱砂实底白字。
- **叙述 ticker `.ticker`**：mono，`.tk▸` 朱砂，`aria-live=polite`。
- **图 3 审计终端 `.termwin`（深色仪器一）**：`--plate-bar` 栏头 + 绿 LED + 「resolve · 调度会话审计」；`.termbody` 7 行 mono（route → classify 0.94 → dispatch → 最小割集 → crosscheck → corpus.write +4 篇 → ✓ 根因已确认 2m 07s），每行右缘毫秒时间戳 08:42:11.204 → 08:44:18.660，逐行 `linein` 显现，末行 `.cur` 光标闪烁。
- **图 4 事件回放 `.scope`（深色仪器二）**：同心环 + 刻度 + 幽灵虚线环（竞争假设）；四径迹 `.track.t-*`（FTA 弯曲 / RAG 直线 / SKILL、CODE 弧）+ 端点圆；mono 注记 INC-20260828-001 · 置信度 0.89。`.iso` 隔离态未选径迹 opacity .14。
- **径迹列表 `.trk`**：`14px minmax(0,1fr)` 两行网格——`.dot` 线路色 + `.nm` 名称与 `.md` mono 路径同行（各占 grid-column 2，`.md{overflow-wrap:anywhere}`）；`.on` 线路色描边；dblclick scope 复位 FTA。
- **图 5 语料飞轮**：svg viewBox `0 0 648 420`，四段弧箭头循环（排查执行 → 语料生成 → 检索增强 → 更准路由），`.fly-cn`/`.fly-mono` 带 `paint-order:stroke` 纸色描边光晕防弧线穿字；中心「曝光量 +6 / 班」朱砂；`.docchips` 两行 mono（六类文档 + 双写集合 code-analysis / kudig-rag）。
- **数据账本 `#ledger`**：`5fr/7fr` 两栏。左 `.ledger` 六行 `.lrow`（mono 键 + Fraunces 大数：48 执行 / 95.7% 闭环 / 14 决策 / 30 工单 / 45⁄102 集合·文档 / 7×26×42 底座）。右 `.sh-panel`：占比 `.share`（`--lc` 条 + mono 值，FTA/技能/RAG 21%、链式/代码 14%、直达 7%）+ 留痕表 `.logtable`（min-width 552，`.tscroll` 平移；`rt-*` 线路色路由名，tr-4821…tr-4698 五条 2.3s–16.8s，完整输入标题 ellipsis）。
- **GTM 战略 `#strategy`**：h2「开通时刻表。规划示意，非承诺」；`blockquote.pos` 左 3px 朱砂边定位主张（`.pos mark` 朱砂「多路径智能路由 + 排查知识自沉淀闭环」）；`.strat-grid`：左 ICP 3 `.icprow`（`lc-*` 站点圆）+ 渠道 3 `.icprow`（`.stat.go` 已发车 / `.stat` 筹备中 / 规划中），右 `.timetable`（M1 2026 Q3 / M2 2026 Q4 / M3 2027 Q1）+ `.ns` 北极星 4 行（`3px double` 上边；−40% MTTR / ≥0.90 / +120每周 / 300每周，基线→目标 mono 副行）+ `.datanote` 规划目标示意。
- **封底 `#close`**：Fraunces 大标题两行「让每一次告警，/都有终点站。」；`.cta-row`：`.cta` 预约演示（3px 朱砂下边线，→ GitHub Issues 参数化标题）+ 两枚 `.cta-ghost`（GitHub 仓库 / 产品文档）。
- **版权栏 `.colophon`（Ft4）**：`3px double` 上边，三行居中 mono（署名·期号·示意声明 / 三外链 / 图版声明 + 演示窗口）。

## Motion（3 个原语，无 reveal）

签名时刻 = 翻牌进站 + 列车行驶 + 终端逐行。发车板：`FEED` 12 条队列；`mkEv` 以真实时钟合成 `HH:MM:SS` + `YYYYMMDD-HHMMSS`；初始 4 条错峰 9/7/5/3 分钟落各自线路；每 6s 自动进站（逐位 30ms stagger，`.flip` rotateX 420ms `--ease-out`）。chip 点击 → `setLine`（选中实线余虚线）+ `runTrain`（`getPointAtLength` 2600ms easeOutCubic；四步 NARRATIVE ticker 按进度 0/.22/.55/1 切换，四线置信 0.94/0.91/0.89/0.96；700ms 后淡出）。终端 IO threshold .3 逐行 260ms stagger + `.cur` 1.1s steps。时钟 1s。`prefers-reduced-motion`：全部动画压至 150ms 一次性、`flip`/`.cur` 关、JS `RM` 跳过翻牌与列车并给静态 ticker 文案。

## Browser surfaces

`::selection` 朱砂白字、`:focus-visible` 2px 朱砂环、`html{scroll-behavior:smooth}`（RM 下 auto）、lrow/nsrow/时钟 tabular-nums、细滚动条（track `--paper-2` / thumb 纸深）、skip link 朱砂底。`html,body{overflow-x:clip}`（gate 34）。

## Responsive（已实测 320/375/390/414/768/1440 全 0 横向溢出）

- ≤960：四 grid 收 `minmax(0,1fr)` 单列；mast-wing / mast-nav 隐藏；flapgrid 收 3 列 min-width 560（事件编号列隐藏）板块平移；section padding 收 64。
- ≤560：wrap padding 20；ttrow flex-wrap（M 码 + 时间 + 状态牌一行，说明第二行）；lrow / nsrow 收两列 minmax(96px,140px)；termbody 收 padding；mast-line / board-head 缩排（sysok 只留绿点、时钟 margin-left:auto）。
- ≤400：mast-line letter-spacing 0 保单行。
- 平移容器：`.board-scroll`（发车板）、`.fig-scroll`（总图 svg min-width 920）、`.tscroll`（logtable min-width 552）、`.termbody`。
- 防溢出：grid 全用 `minmax(0,Xfr)`（mobile 单列同为 minmax(0,1fr)——1fr 裸写会让 logtable min-width 撑破轨道，已修）；h1/h2 `overflow-wrap:anywhere`；CTA 与导航链接 nowrap 不折行。

## A11y

skip link；发车板 `role=table` + aria-label（内嵌示意声明）；三张 svg `role=img` + aria-label；模拟器 / 径迹列表 `role=group`；chips / trk 原生 button 键盘可达；ticker `aria-live=polite`、翻牌区 `aria-live=off`；`:focus-visible` 朱砂环；`prefers-reduced-motion` 全关；对比度：ink 三级 on 暖纸、`--plate-*` 深版、ok/status 牌均达标。

## 外链 / 对接（沿用）

- 预约演示：mast-nav `.mast-cta` → `#close`；封底 `.cta` → GitHub Issues（`?title=ResolveAgent%20演示预约`）；外链均 `target="_blank" rel="noopener noreferrer"`。
- 外链：产品页 `https://vxxzrdpyfrl6.meoo.fun`（mast-nav / colophon）、GitHub 仓库、产品文档（`…/tree/main/docs`）。
- 页内锚：#mechanism / #audit / #replay / #flywheel / #ledger / #strategy / #cover / #close。
- 置信度：终端 0.94、回放 0.89、NARRATIVE 0.94/0.91/0.89/0.96（同一套演示口径）。

## 未决 / 待实测

- 调用计数（总图 plate「次」数）、线宽热度、里程碑状态、北极星、账本与占比均为演示窗口（2026-08-25 — 08-31）或规划示意，发布前需以实测替换。
- 无真实客户案例 / 基准 / 公开证言；发车板事件号与时间为真实时钟合成的示意数据（每次访问变化）；INC-20260828-001 为演示用合成事件号。
