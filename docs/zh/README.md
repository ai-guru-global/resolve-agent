# ResolveAgent 产品使用文档

**ResolveAgent：终极智能体驱动的 AIOps 平台**

---

## 文档概览

欢迎使用 ResolveAgent！本文档将帮助您全面了解和使用 ResolveAgent 平台的各项功能。

### 快速导航

| 章节 | 说明 | 适合人群 |
|------|------|----------|
| [快速入门](./quickstart.md) | 5分钟内启动您的第一个智能Agent | 所有用户 |
| [架构设计](./architecture.md) | 深入了解系统架构与设计理念 | 架构师、开发者 |
| [数据库 Schema](./database-schema.md) | PostgreSQL 16 张表设计与迁移策略 | 开发者 |
| [智能选择器](./intelligent-selector.md) | 自适应工作流路由引擎详解 | 开发者 |
| [选择器适配器](./selector-adapters.md) | Hook/Skill 适配器与 SelectorProtocol | 开发者 |
| [FTA 工作流引擎](./fta-engine.md) | 故障树分析引擎 | 开发者、运维 |
| [AgentScope 与 Higress 集成](./agentscope-higress-integration.md) | 网关集成架构与代码分析管道 | 架构师、开发者 |
| [技能系统](./skill-system.md) | 构建和使用专家技能 | 开发者 |
| [RAG 管道](./rag-pipeline.md) | 检索增强生成系统 | 开发者 |
| [工单总结 Agent](./ticket-summary-agent.md) | 知识生产引擎设计哲学 | 架构师、开发者 |
| [工单总结集成分析](./ticket-summary-agent-integration-analysis.md) | 集成可行性与实施计划 | 架构师、开发者 |
| [CLI 参考](./cli-reference.md) | 命令行工具完整指南 | 运维、开发者 |
| [配置参考](./configuration.md) | 配置选项详细说明 | 运维、开发者 |
| [部署指南](./deployment.md) | 生产环境部署方案 | 运维 |
| [最佳实践](./best-practices.md) | AIOps 使用建议与优化技巧 | 所有用户 |

---

## 什么是 ResolveAgent？

ResolveAgent 是一个 **终极智能体驱动的 AIOps 平台** — CNCF 级别的开源解决方案，融合了四大核心技术为企业提供智能化、自主化的运维管理能力。

### 核心特性

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ResolveAgent 核心能力                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  🔬 高级静态分析 (Advanced Static Analysis)                             │
│     ├── 基于故障树分析（FTA）的智能故障检测                            │
│     ├── 支持 AND/OR/VOTING/INHIBIT/PRIORITY-AND 门                     │
│     └── 自动化异常检测与根因分析                                       │
│                                                                         │
│  📚 RAG - 检索增强生成 (Retrieval Augmented Generation)                 │
│     ├── 企业知识库与语义检索能力                                       │
│     ├── 支持 Milvus/Qdrant 向量数据库                                   │
│     └── 中文优化：BGE 嵌入模型，交叉编码器重排                          │
│                                                                         │
│  🔄 自适应工作流 (Adaptive Workflows)                                  │
│     ├── LLM 驱动的智能选择器，动态选择最佳执行路径                     │
│     ├── 支持规则、LLM、混合三种路由策略                               │
│     └── 意图分析 → 上下文增强 → 路由决策                              │
│                                                                         │
│  🎯 专家技能系统 (Expert Skills)                                       │
│     ├── 插件化架构，封装 AIOps 领域专家知识                            │
│     ├── 沙箱执行：资源限制、网络隔离                                   │
│     └── 预建技能：日志分析、指标关联、告警分类、故障解决                 │
│                                                                         │
│  🇨🇳 国产大模型支持                                                  │
│     ├── 通义千问 (Qwen): qwen-turbo, qwen-plus, qwen-max               │
│     ├── 文心一言 (ERNIE): ERNIE-4.0                                     │
│     ├── 智谱清言 (GLM): GLM-4                                           │
│     └── OpenAI 兼容扩展                                                 │
│                                                                         │
│  ☸️ 云原生部署                                                          │
│     ├── Kubernetes 原生，Helm Charts                                     │
│     ├── OpenTelemetry 可观测性                                           │
│     └── Docker Compose 开发环境                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 系统架构

```
                         客户端接口
    ┌──────────┐   ┌───────────┐   ┌────────────────┐
    │  CLI/TUI │   │   WebUI   │   │  External API  │
    │   (Go)   │   │(React+TS) │   │    Consumers   │
    └────┬─────┘   └─────┬─────┘   └───────┬────────┘
         │               │                 │
         ▼               ▼                 ▼
    ┌──────────────────────────────────────────────────┐
    │            HIGRESS AI/API 网关                   │
    │  认证 | 限流 | 模型路由 | 路由规则                │
    └──────────────────────┬───────────────────────────┘
                           │
                           ▼
    ┌──────────────────────────────────────────────────┐
    │     平台服务层 (Go - resolveagent-server)            │
    │  API Server | Agent 注册表 | 技能注册表          │
    │  工作流注册表 | 配置管理 | 事件总线              │
    └──────────────────────┬───────────────────────────┘
                           │ gRPC
                           ▼
    ┌──────────────────────────────────────────────────┐
    │   Agent 运行时 (Python - python/src/resolveagent/)  │
    │                                                  │
    │  ┌────────────────────────────────────────────┐  │
    │  │     智能选择器 (selector/) - 自适应工作流      │  │
    │  │  意图分析 → 上下文增强 → 路由决策              │  │
    │  └────────────────────────────────────────────┘  │
    │                                                  │
    │  ┌──────────────┐ ┌─────────────┐ ┌────────────┐ │
    │  │高级静态分析│ │ 专家技能系统│ │ RAG 管道   │ │
    │  │  (fta/)   │ │  (skills/)  │ │   (rag/)   │ │
    │  └──────────────┘ └─────────────┘ └────────────┘ │
    │                                                  │
    │  LLM 提供商抽象层 (llm/)                           │
    └──────────────────────────────────────────────────┘
```

---

## 项目结构

```
resolve-agent/
├── api/                    # API 定义
│   ├── jsonschema/         # JSON Schema 定义 (skill-manifest.schema.json)
│   └── proto/resolveagent/v1/ # Protocol Buffer 定义
├── cmd/                    # Go 入口程序
│   ├── resolveagent-cli/     # CLI 应用 (resolveagent 命令)
│   └── resolveagent-server/  # 平台服务器 (HTTP/gRPC)
├── pkg/                    # Go 公共库
│   ├── config/             # 配置管理
│   ├── event/              # 事件系统 (NATS 集成)
│   ├── gateway/            # Higress AI 网关集成
│   ├── registry/           # Agent/技能/工作流注册表
│   ├── server/             # HTTP/gRPC 服务器
│   ├── store/              # 数据库抽象 (PostgreSQL, Redis)
│   ├── telemetry/          # 可观测性 (logger, metrics, tracer)
│   └── version/            # 版本信息
├── internal/               # Go 内部包
│   ├── cli/                # CLI 命令实现 (agent, skill, workflow, rag)
│   └── tui/                # 终端 UI (Bubbletea 仪表板)
├── python/                 # Python AI/ML 组件
│   ├── src/resolveagent/
│   │   ├── agent/          # Agent 定义 (BaseAgent, MegaAgent)
│   │   ├── selector/       # 智能选择器 (自适应工作流)
│   │   ├── fta/            # FTA 引擎 (高级静态分析)
│   │   ├── skills/         # 专家技能系统
│   │   ├── rag/            # RAG 管道 (知识检索)
│   │   ├── llm/            # LLM 提供商抽象 (Qwen, ERNIE, GLM)
│   │   ├── docsync/        # 双语文档同步引擎
│   │   ├── runtime/        # 执行引擎
│   │   └── telemetry/      # Python 可观测性
│   └── tests/              # Python 单元测试
├── web/                    # React + TypeScript Web 管理界面
│   └── src/
│       ├── api/            # API 客户端
│       ├── components/     # 可复用 UI 组件
│       ├── pages/          # 页面视图 (Agent, Skill, Workflow, RAG)
│       ├── hooks/          # React hooks
│       ├── stores/         # 状态管理
│       └── types/          # TypeScript 类型定义
├── deploy/                 # 部署配置
│   ├── docker/             # Dockerfiles (platform, runtime, webui)
│   ├── docker-compose/     # Docker Compose 文件
│   ├── helm/resolveagent/    # Helm charts
│   └── k8s/                # Kustomize 配置
├── configs/                # 默认配置
│   ├── examples/           # 示例配置 (agent, skill, workflow)
│   ├── models.yaml         # LLM 模型注册表
│   ├── resolveagent.yaml     # 平台配置
│   └── runtime.yaml        # 运行时配置
├── skills/                 # 社区技能注册表
│   ├── examples/           # 示例技能 (hello-world)
│   └── registry.yaml       # 技能注册表清单
├── docs/                   # 文档
├── hack/                   # 开发脚本
├── test/e2e/               # 端到端测试
└── tools/buf/              # Protobuf 工具链
```

---

## 技术栈

| 组件 | 语言/框架 | 位置 | 说明 |
|------|-----------|------|------|
| 平台服务 | Go 1.22+ | `cmd/resolveagent-server/`, `pkg/` | REST/gRPC API、注册表、事件总线 |
| Agent 运行时 | Python 3.11+ | `python/src/resolveagent/` | Agent 执行、智能选择器、FTA/技能/RAG |
| CLI/TUI | Go + Bubbletea | `cmd/resolveagent-cli/`, `internal/` | 命令行界面与终端仪表板 |
| WebUI | React + TypeScript | `web/` | 管理控制台，工作流可视化编辑器 |
| 网关 | Higress | 外部服务 | AI 网关，认证、限流、模型路由 |
| 数据库 | PostgreSQL | `pkg/store/postgres/` | 持久化存储 |
| 缓存 | Redis | `pkg/store/redis/` | 会话管理、缓存 |
| 消息队列 | NATS | `pkg/event/` | 事件驱动通信 |
| 向量数据库 | Milvus/Qdrant | `python/src/resolveagent/rag/` | RAG 向量存储 |

---

## 版本信息

- **当前版本**: v0.1.0
- **许可证**: Apache License 2.0
- **仓库地址**: https://github.com/ai-guru-global/resolve-agent

---

## 获取帮助

- **问题反馈**: [GitHub Issues](https://github.com/ai-guru-global/resolve-agent/issues)
- **贡献指南**: [CONTRIBUTING.md](../../CONTRIBUTING.md)
- **安全问题**: [SECURITY.md](../../SECURITY.md)

---

> **下一步**: 前往 [快速入门](./quickstart.md) 开始您的 ResolveAgent 之旅！
