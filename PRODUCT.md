# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: 独立静态 HTML 单文件（GTM/index.html，零依赖、内联 CSS/JS，可直接浏览器打开便于分享演示）。GTM/ 为全新文件夹，与现有 web/ React 应用独立。

## Users

- **主要用户**: SRE / 平台工程 / 运维团队，在生产 Kubernetes 集群上做故障排查与根因分析（RCA）的工程师。
- **决策者**: 平台工程负责人、运维总监、CTO——评估 AI 运维工具采购的人。
- **场景**: 告警响起 → 快速定位根因 → 恢复服务；事后沉淀排查知识。时间压力大，凭证据说话。

## Product Purpose

ResolveAgent 是一个面向 Kubernetes 故障排查的 Mega Agent 平台：通过智能路由（Intelligent Selector）把一个故障问题分发给最合适的处理路径——FTA 故障树推理、RAG 检索增强问答（kudig-rag / code-analysis 语料库）、技能（skills，如 k8s-pod-crash 排查技能）、静态代码分析（AST → 调用链 → 解决方案文档）。核心价值：把"告警到根因"的链路从人工数小时压缩到分钟级，并把每次排查沉淀为可复用的语料与技能。

## Positioning

唯一机制：**多路径智能路由 + 排查知识自沉淀闭环**。不是单一路径的 AI 问答（那是相邻产品都能做的），而是"意图识别 → 路由分发（FTA/技能/RAG/代码分析）→ 执行 → 结果回流为语料/技能"的闭环飞轮——平台用得越多，排查知识库越厚，回答越准。相邻产品无法真实复制的点：FTA 形式化故障树推理 + 调用链语料自动生成 RAG 文档的完整引擎链。

## Operating Context

- 现有 Web 控制台（React + shadcn/ui，中文界面）：Agent 管理、FTA 树编辑器、RAG 文档/集合、代码分析（调用链图谱、K8s 源码语料）、评测、监控。
- 语料来源：kudig-database（RAG/FTA/技能/代码分析四类导入）、Kubernetes v1.35 源码调用链分析。
- 技术栈事实：Go 平台服务 + Python 运行时（agentscope）+ React 前端；向量库 Milvus/Qdrant；LLM 网关（Higress）。

## Capabilities and Constraints

- 已确认能力：意图分类与路由、FTA 故障树引擎与编辑器、RAG 摄入/检索/重排、技能注册与执行、静态代码分析（AST/调用图/错误解析/方案生成）、语料导入管线（SSE 进度）、调用链→RAG 语料生成（前后端双实现）。
- 未确认/开放事实（不得捏造）：正式产品名对外叫法、客户名单、定价、SLA、部署形态（SaaS/私有化）的承诺、融资/团队规模。

## Brand Commitments

- 名称：ResolveAgent（仓库事实名），中文语境可作"ResolveAgent 平台"。
- 现有控制台视觉：shadcn/ui 体系、浅/深双模式——仅作产品事实参考，不约束 GTM 页面新世界。

## Evidence on Hand

- 可演示界面：/agents、/workflows、/rag/documents、/code-analysis（调用链图谱 + K8s 语料）、/evaluation、/monitoring 等页面（web/ 目录，mock 数据驱动）。
- 排查技能样例：skills/examples/k8s-pod-crash（Pod CrashLoopBackOff / OOMKilled 场景）。
- K8s 调用链语料：web/src/data/k8sCorpus.ts（Pod NotReady、kubeadm init 两条完整链路）。
- 无真实客户、基准数据或证言——GTM 页面不得虚构，示例数据须标注"示意"。

## Product Principles

1. **证据先行**：排查结论必须可追溯到证据（日志、调用链、故障树节点），营销叙事同样以可演示机制为先。
2. **闭环飞轮**：每次使用让平台更聪明——这是定位主张的核心，所有内容服务于讲清这个闭环。
3. **工程师语言**：面向懂 K8s 的人，用真实故障场景说话，不用空泛 AI 话术。

## Accessibility & Inclusion

- 控制台已有浅/深双模式；GTM 页面为单页演示，至少保证 WCAG AA 对比度、键盘可达、响应式（桌面+移动）。
