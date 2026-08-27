---
kind: frontend_style
name: 前端样式体系：Tailwind + shadcn/ui 原子化设计系统（Web/Mobile/Docs 三端）
category: frontend_style
scope:
    - '**'
source_files:
    - web/tailwind.config.ts
    - web/postcss.config.js
    - web/src/index.css
    - web/src/lib/utils.ts
    - web/src/components/ui/button.tsx
    - web/src/components/ui/card.tsx
    - web/src/components/ui/badge.tsx
    - mobile/tailwind.config.js
    - mobile/src/index.css
    - docs-site/src/css/custom.css
---

## 1. 采用的样式体系与工具链

仓库包含三个独立的前端应用，各自维护一套样式系统，但整体遵循一致的原子化 CSS 理念：

- **Web 管理控制台** (`web/`)：基于 Vite + React + TypeScript，使用 **Tailwind CSS v3** 作为核心样式框架，通过 `postcss.config.js` 启用 `tailwindcss` 与 `autoprefixer`。主题变量采用 HSL 语义色（`--background`、`--primary`、`--destructive` 等），由 `web/src/index.css` 的 `:root` 与 `.dark` 两套 CSS 变量定义，配合 Tailwind 的 `darkMode: 'class'` 实现明暗主题切换。
- **移动端 Web 应用** (`mobile/`)：同样基于 Vite + React，使用独立的 `tailwind.config.js`，自定义了品牌色 `brand.*`、运维状态色 `ops.*` 以及一套移动端字号阶梯（micro/caption/label/title/display）。全局样式集中在 `mobile/src/index.css`，使用 OKLCH 色彩空间定义深色主题语义色板，并内置 fade-up、scale-in、pulse-glow、progress-stripe 等动画 keyframes。
- **文档站点** (`docs-site/`)：基于 Docusaurus 3，通过 `docs-site/src/css/custom.css` 覆盖 Infima 默认主题变量（`--ifm-color-primary*`），提供蓝色主色调与 dark 模式适配，并自定义 hero、表格、代码块、告警提示等页面级样式。

## 2. 关键文件与包

| 位置 | 作用 |
|---|---|
| `web/tailwind.config.ts` | Web 端 Tailwind 配置：容器宽度、扩展色板（含 Argo CD 风格 status 色）、字体族（Source Sans 3 / Manrope / JetBrains Mono）、动画 keyframes、`tailwindcss-animate` 插件 |
| `web/postcss.config.js` | PostCSS 管线（tailwindcss + autoprefixer） |
| `web/src/index.css` | 全局 CSS 变量（light/dark 双主题）、基础层样式、业务动画（flow-dash、data-pulse、shimmer、scan-line 等） |
| `web/src/lib/utils.ts` | `cn()` 工具函数，组合 `clsx` + `tailwind-merge` 实现 className 合并去重 |
| `web/src/components/ui/*` | 基于 **shadcn/ui** 风格的原子组件库（button、card、badge、dialog、tabs、select、input、tooltip、skeleton、sonner 等），全部使用 `class-variance-authority` (cva) 声明变体 |
| `mobile/tailwind.config.js` | 移动端 Tailwind 配置：品牌色、运维色、移动端字号阶梯 |
| `mobile/src/index.css` | 移动端全局样式：OKLCH 深色主题、字体（Syne + Noto Sans SC）、滚动条、focus-visible、prefers-reduced-motion 无障碍支持 |
| `docs-site/src/css/custom.css` | Docusaurus 文档站主题覆盖（Infima 变量、hero、表格、代码块、告警） |

## 3. 架构与设计约定

### 3.1 设计令牌（Design Tokens）
- Web 端：所有颜色以 HSL 三元组形式定义在 CSS 变量中（如 `--primary: 220 14% 10%`），Tailwind 通过 `hsl(var(--primary))` 引用，从而天然支持明暗主题切换。
- Mobile 端：使用 OKLCH 色彩空间（如 `oklch(55% 0.18 245)`）定义更感知均匀的颜色，同时暴露 `--color-*` 语义变量供组件复用。
- 文档站：直接覆盖 Infima 的 `--ifm-color-*` 变量，保持文档与产品视觉一致。

### 3.2 组件样式方法论
- 所有 UI 组件位于 `web/src/components/ui/`，每个组件用 `cva` 声明 `variants`（如 button 的 `default/secondary/outline/ghost/link` 与 `sm/lg/icon/default` size），并通过 `cn(...)` 合并外部传入 className。
- 布局组件（Card、Badge、Button）仅负责结构语义与默认样式，业务页面通过 props 组合变体，避免在页面中散落样式逻辑。
- 组件间共享 `@/lib/utils.ts` 的 `cn` 工具，确保 Tailwind 类名冲突可被 `tailwind-merge` 自动解决。

### 3.3 响应式策略
- Web 端：Tailwind 断点 + `container.center` 居中布局，最大宽度 `2xl: 1400px`。
- Mobile 端：自定义字号阶梯（micro→display）适配小屏阅读；`html { font-size: 13px }` 统一基准字号。
- 文档站：依赖 Docusaurus 内置响应式，仅做局部覆盖。

### 3.4 动效规范
- Web 端：集中定义于 `index.css` 的 keyframes（slide-up-fade、flow-dash、data-pulse、subtle-breathe、shimmer-line、node-pulse、confidence-fill、scan-line），并通过 `.animate-*` 类暴露。
- Mobile 端：fade-up、fade-in、scale-in、spin-slow、pulse-glow、progress-stripe，配合 `stagger-children` 实现子元素交错入场。
- 两者均尊重 `prefers-reduced-motion: reduce`，将动画时长降至 0.01ms。

## 4. 约定与约束

- **禁止在页面组件中直接写内联 style**：所有样式应通过 Tailwind 原子类或 `components/ui` 中的受控组件变体表达。
- **主题色必须走 CSS 变量**：新增颜色需先在 `:root` / `.dark` 中声明语义变量，再在 Tailwind config 的 `extend.colors` 中映射，不得硬编码十六进制值到业务组件。
- **组件变体优先使用 cva**：新增 UI 组件应仿照 `button.tsx` / `badge.tsx` 的模式，用 `cva` 声明 variant/size 等维度，并通过 `forwardRef` 暴露 ref。
- **className 合并必须经 `cn()`**：组件接收的 `className` 必须通过 `cn(...)` 合并，以保证 Tailwind 类名优先级正确。
- **暗色模式开关为 class 模式**：需在根节点切换 `.dark` 类名，而非依赖媒体查询。
- **移动端字号使用预设阶梯**：新增文本层级应复用 micro/caption/label/title/display，避免随意设定像素字号。
- **文档站样式仅覆盖 Infima 变量**：不在 `custom.css` 中编写复杂业务样式，保持文档内容可读性优先。

## 5. 适用性说明

本仓库存在三个独立的前端工程（Web 控制台、Mobile Web、Docusaurus 文档站），均采用 Tailwind 原子化 CSS 作为样式基础设施，并通过 CSS 变量 + 组件库的方式实现跨页面一致的视觉语言。因此该类别完全适用。