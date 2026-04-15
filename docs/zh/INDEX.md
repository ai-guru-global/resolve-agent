# ResolveAgent 文档索引

> 所有架构设计与使用文档统一维护于 `docs/zh/` 目录，仅保留中文版本。

---

## 入门与运维

| 文档 | 说明 |
|------|------|
| [快速入门](./quickstart.md) | 5 分钟内启动第一个智能 Agent，包括环境准备、依赖启动、服务构建 |
| [配置参考](./configuration.md) | 平台服务、Agent 运行时、模型注册表的完整配置选项 |
| [部署指南](./deployment.md) | Docker Compose / Kubernetes / Helm 生产环境部署方案 |
| [CLI 参考](./cli-reference.md) | `resolveagent` 命令行工具完整指南（agent / skill / workflow / rag 子命令） |
| [最佳实践](./best-practices.md) | AIOps 使用建议、性能调优与运维优化技巧 |

---

## 架构设计

| 文档 | 说明 |
|------|------|
| [架构概览](./architecture.md) | 系统整体架构：三语言分层（Go 平台 + Python 运行时 + React 前端）、数据流、核心子系统关系 |
| [数据库 Schema](./database-schema.md) | PostgreSQL 16 张表设计，6 大功能分组（核心注册 / Hook 生命周期 / RAG 知识库 / FTA 故障树 / 代码分析 / 记忆系统），迁移策略与索引方案 |
| [AgentScope 与 Higress 集成](./agentscope-higress-integration.md) | 基于 AgentScope 的 Agent 编排 + Higress AI 网关能力的集成架构与代码分析管道 |

---

## 核心引擎

| 文档 | 说明 |
|------|------|
| [智能选择器](./intelligent-selector.md) | 自适应工作流路由引擎：意图分析 → 上下文增强 → 路由决策，支持规则 / LLM / 混合三种策略 |
| [选择器适配器](./selector-adapters.md) | SelectorProtocol 协议、HookSelectorAdapter（前后置 Hook）、SkillSelectorAdapter、InMemoryHookClient 与 MegaAgent 集成 |
| [FTA 工作流引擎](./fta-engine.md) | 故障树分析引擎：AND / OR / VOTING / INHIBIT / PRIORITY-AND 门类型，自动化根因分析 |
| [技能系统](./skill-system.md) | 插件化专家技能架构：技能注册、沙箱执行、生命周期管理，预建技能（日志分析 / 指标关联 / 告警分类） |
| [RAG 管道](./rag-pipeline.md) | 检索增强生成端到端流程：文档摄取 → BGE 嵌入 → Milvus 向量存储 → 相似性搜索 → 重排序 |

---

## 工单总结 Agent

| 文档 | 说明 |
|------|------|
| [工单总结 Agent](./ticket-summary-agent.md) | 知识生产引擎设计哲学：七大设计原则，三类产出（处置型 / 预防型 / 维护型），零入侵集成 |
| [工单总结集成分析](./ticket-summary-agent-integration-analysis.md) | 集成可行性报告：四层架构对齐、组件映射、数据模型（Pydantic）、触发机制（post-execution hook）、4 阶段实施计划 |

---

## 文档维护说明

- 所有文档统一使用中文编写
- 原 `docs/architecture/` 英文文档已全部合并至本目录
- 导航总览见 [README.md](./README.md)
