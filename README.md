<p align="center">
  <img src="docs/assets/logo.png" alt="ResolveNet Logo" width="200">
</p>

<h1 align="center">ResolveNet</h1>

<p align="center">
  <strong>The Ultimate Mega Agent Platform | 终极 Mega Agent 平台</strong>
</p>

<p align="center">
  <a href="https://github.com/ai-guru-global/resolve-net/releases"><img src="https://img.shields.io/github/v/release/ai-guru-global/resolve-net?style=flat-square" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square" alt="License"></a>
  <a href="https://github.com/ai-guru-global/resolve-net/actions"><img src="https://img.shields.io/github/actions/workflow/status/ai-guru-global/resolve-net/ci.yaml?branch=main&style=flat-square" alt="CI Status"></a>
  <a href="https://goreportcard.com/report/github.com/ai-guru-global/resolve-net"><img src="https://goreportcard.com/badge/github.com/ai-guru-global/resolve-net?style=flat-square" alt="Go Report Card"></a>
  <a href="https://codecov.io/gh/ai-guru-global/resolve-net"><img src="https://img.shields.io/codecov/c/github/ai-guru-global/resolve-net?style=flat-square" alt="Coverage"></a>
</p>

<p align="center">
  <a href="https://go.dev/"><img src="https://img.shields.io/badge/Go-1.22+-00ADD8.svg?style=flat-square&logo=go" alt="Go"></a>
  <a href="https://python.org/"><img src="https://img.shields.io/badge/Python-3.11+-3776AB.svg?style=flat-square&logo=python" alt="Python"></a>
  <a href="https://typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.6+-3178C6.svg?style=flat-square&logo=typescript" alt="TypeScript"></a>
  <a href="https://kubernetes.io/"><img src="https://img.shields.io/badge/Kubernetes-1.25+-326CE5.svg?style=flat-square&logo=kubernetes" alt="Kubernetes"></a>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-documentation">Documentation</a> •
  <a href="#-community">Community</a>
</p>

<p align="center">
  <a href="#-快速开始">快速开始</a> •
  <a href="#-核心特性">核心特性</a> •
  <a href="#-系统架构">系统架构</a> •
  <a href="#-中文文档">中文文档</a> •
  <a href="#-社区">社区</a>
</p>

---

## 🌟 Overview | 概述

**English:**

ResolveNet is a **CNCF-grade open-source Mega Agent platform** that unifies **Agent Skills**, **Fault Tree Analysis (FTA) Workflows**, and **Retrieval-Augmented Generation (RAG)** under a single intelligent routing layer. Built on [AgentScope](https://github.com/modelscope/agentscope) for agent orchestration and [Higress](https://github.com/alibaba/higress) for AI gateway capabilities.

**中文：**

ResolveNet 是一个 **CNCF 级别的开源 Mega Agent 平台**，将 **Agent 技能（Skills）**、**故障树分析（FTA）工作流** 和 **检索增强生成（RAG）** 统一在单一的智能路由层下。基于 [AgentScope](https://github.com/modelscope/agentscope) 构建 Agent 编排能力，基于 [Higress](https://github.com/alibaba/higress) 构建 AI 网关能力。

### 💡 Why ResolveNet? | 为什么选择 ResolveNet？

| Challenge | Traditional Solution | ResolveNet Solution |
|-----------|---------------------|---------------------|
| **Fixed Processing Pipelines** | Hard-coded workflows | Dynamic intelligent routing |
| **Scattered AI Capabilities** | Multiple disconnected tools | Unified platform with Skills, FTA, RAG |
| **Complex Decision Flows** | Manual orchestration | Visual FTA workflow builder |
| **Knowledge Management** | Separate RAG systems | Integrated semantic retrieval |
| **LLM Vendor Lock-in** | Single provider dependency | Multi-provider support (Qwen, ERNIE, GLM) |

| 挑战 | 传统方案 | ResolveNet 方案 |
|------|----------|-----------------|
| **固定处理流程** | 硬编码工作流 | 动态智能路由 |
| **AI 能力分散** | 多个独立工具 | 统一平台：技能、FTA、RAG |
| **复杂决策流程** | 手动编排 | 可视化 FTA 工作流构建器 |
| **知识管理** | 独立 RAG 系统 | 集成语义检索 |
| **LLM 供应商锁定** | 单一供应商依赖 | 多供应商支持（通义、文心、智谱）|

---

## ✨ Features | 核心特性

### 🧠 Intelligent Selector | 智能选择器

LLM-powered meta-router that dynamically routes requests based on intent analysis.

基于 LLM 的元路由器，根据意图分析动态路由请求。

- **Three Routing Strategies**: Rule-based, LLM-based, Hybrid (default)
- **Intent Analysis → Context Enrichment → Route Decision**
- **Supports**: FTA workflows, Skills, RAG, Direct LLM, Multi-step chains

### 🔧 FTA Workflow Engine | FTA 工作流引擎

Fault Tree Analysis with visual editing and flexible evaluators.

支持可视化编辑和灵活评估器的故障树分析。

- **Gate Types**: AND, OR, VOTING (k-of-n), INHIBIT, PRIORITY-AND
- **Evaluators**: Skills, RAG queries, LLM judgments
- **Visual Editor**: React Flow based workflow designer

### 🎯 Agent Skill System | Agent 技能系统

Plugin architecture with sandboxed execution and community registry.

插件化架构，支持沙箱执行和社区注册表。

- **Manifest-based**: Declarative inputs, outputs, permissions
- **Sandboxed Execution**: Resource limits, network isolation
- **Multiple Sources**: Local, Git, OCI, Registry

### 📚 RAG Pipeline | RAG 管道

Document ingestion, vector indexing, and semantic retrieval.

文档摄取、向量索引和语义检索。

- **Vector Stores**: Milvus, Qdrant
- **Chunking Strategies**: Fixed, Sentence, Semantic
- **Chinese Optimized**: BGE embedding models, cross-encoder reranking

### 🇨🇳 Chinese LLM Support | 国产大模型支持

First-class support for Chinese LLM providers.

国产大模型优先支持。

- **Qwen (通义千问)**: qwen-turbo, qwen-plus, qwen-max
- **Wenxin (文心一言)**: ERNIE-4.0
- **Zhipu (智谱清言)**: GLM-4
- **OpenAI Compatible**: Extensible to any OpenAI-compatible API

### ☸️ Cloud Native | 云原生

Kubernetes-native deployment with comprehensive observability.

Kubernetes 原生部署，完善的可观测性。

- **Deployment**: Helm charts, Kustomize, Docker Compose
- **Observability**: OpenTelemetry (Metrics, Logs, Traces)
- **Gateway**: Higress for auth, rate limiting, model routing

---

## 🏗️ Architecture | 系统架构

```
                              ┌─────────────────────────────────────────────────────────────┐
                              │                        CLIENTS                              │
                              │  ┌──────────┐   ┌───────────┐   ┌────────────────────────┐ │
                              │  │  CLI/TUI │   │   WebUI   │   │    External API        │ │
                              │  │   (Go)   │   │(React+TS) │   │      Consumers         │ │
                              │  └────┬─────┘   └─────┬─────┘   └───────────┬────────────┘ │
                              └───────┼───────────────┼─────────────────────┼──────────────┘
                                      │               │                     │
                                      ▼               ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    HIGRESS AI/API GATEWAY                                           │
│                        Authentication | Rate Limiting | Model Routing | Route Rules                 │
└─────────────────────────────────────────────────────────┬───────────────────────────────────────────┘
                                                          │
                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    PLATFORM SERVICES (Go)                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────┐│
│  │   API Server    │  │ Agent Registry  │  │ Skill Registry  │  │       Workflow Registry         ││
│  │  (HTTP/gRPC)    │  │                 │  │                 │  │                                 ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────────────────────┘│
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────┐│
│  │   Config Mgmt   │  │   Event Bus     │  │  Health Check   │  │       Telemetry                 ││
│  │                 │  │    (NATS)       │  │                 │  │    (OpenTelemetry)              ││
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────────────────────┘│
└─────────────────────────────────────────────────────────┬───────────────────────────────────────────┘
                                                          │ gRPC
                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              AGENT RUNTIME (Python / AgentScope)                                    │
│                                                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                              INTELLIGENT SELECTOR                                              │ │
│  │   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────────────────────┐   │ │
│  │   │ Intent Analyzer │ →→ │Context Enricher │ →→ │             Route Decider               │   │ │
│  │   │                 │    │                 │    │    (FTA | Skills | RAG | Direct)        │   │ │
│  │   └─────────────────┘    └─────────────────┘    └─────────────────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                     │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────────────────┐ │
│  │      FTA Engine         │  │    Skill Executor       │  │          RAG Pipeline               │ │
│  │  (Fault Tree Analysis)  │  │  (Sandboxed Execution)  │  │  (Ingest → Index → Retrieve)       │ │
│  └─────────────────────────┘  └─────────────────────────┘  └─────────────────────────────────────┘ │
│                                                                                                     │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                               LLM PROVIDER ABSTRACTION                                         │ │
│  │   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────────────┐   │ │
│  │   │    Qwen     │   │   Wenxin    │   │    Zhipu    │   │       OpenAI Compatible         │   │ │
│  │   │   (通义)    │   │   (文心)    │   │   (智谱)    │   │                                 │   │ │
│  │   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                          │
                                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       DATA LAYER                                                    │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────────┐│
│   │   PostgreSQL    │   │     Redis       │   │      NATS       │   │    Milvus / Qdrant         ││
│   │    (Storage)    │   │    (Cache)      │   │   (Messaging)   │   │    (Vector Store)          ││
│   └─────────────────┘   └─────────────────┘   └─────────────────┘   └─────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Component Overview | 组件概览

| Component | Language | Description | 描述 |
|-----------|----------|-------------|------|
| **Platform Services** | Go | REST/gRPC API, registries, event bus | REST/gRPC API、注册表、事件总线 |
| **Agent Runtime** | Python | Agent execution, Intelligent Selector, FTA/Skills/RAG | Agent 执行、智能选择器、FTA/技能/RAG |
| **CLI/TUI** | Go | Command-line interface with terminal dashboard | 命令行界面与终端仪表板 |
| **WebUI** | React+TS | Management console with FTA visual editor | 管理控制台与 FTA 可视化编辑器 |
| **Gateway** | Higress | AI gateway for auth, rate limiting, model routing | AI 网关：认证、限流、模型路由 |

---

## 🚀 Quick Start | 快速开始

### Prerequisites | 前置条件

| Dependency | Version | Purpose |
|------------|---------|---------|
| Go | >= 1.22 | Platform services, CLI |
| Python | >= 3.11 | Agent runtime |
| Node.js | >= 20 | WebUI (optional) |
| Docker | >= 20.10 | Container runtime |
| Docker Compose | >= 2.0 | Local development |

**Recommended tools | 推荐工具:**
- [uv](https://github.com/astral-sh/uv) - Fast Python package manager
- [pnpm](https://pnpm.io/) - Fast Node.js package manager

### Installation | 安装

```bash
# Clone the repository | 克隆仓库
git clone https://github.com/ai-guru-global/resolve-net.git
cd resolve-net

# Set up development environment | 设置开发环境
make setup-dev

# Start dependencies (PostgreSQL, Redis, NATS) | 启动依赖服务
make compose-deps

# Build all components | 构建所有组件
make build

# Run tests | 运行测试
make test
```

### Configuration | 配置

1. **Copy and edit the environment file | 复制并编辑环境配置文件:**

```bash
cp deploy/docker-compose/.env.example deploy/docker-compose/.env
```

2. **Configure LLM API keys | 配置大模型 API 密钥:**

```bash
# Edit .env or export environment variables
export QWEN_API_KEY="your-qwen-api-key"      # 从 dashscope.aliyun.com 获取
export WENXIN_API_KEY="your-wenxin-api-key"  # 从 cloud.baidu.com 获取
export ZHIPU_API_KEY="your-zhipu-api-key"    # 从 open.bigmodel.cn 获取
```

3. **Configuration file locations | 配置文件位置:**

```bash
./resolvenet.yaml                    # Current directory (highest priority)
$HOME/.resolvenet/config.yaml        # User directory
/etc/resolvenet/resolvenet.yaml      # System directory
```

### Start Services | 启动服务

```bash
# Start all services with Docker Compose | 使用 Docker Compose 启动所有服务
make compose-up

# Or start in development mode | 或以开发模式启动
make compose-dev

# Access points | 访问地址:
# - Platform HTTP API: http://localhost:8080
# - Platform gRPC:     localhost:9090
# - WebUI:             http://localhost:3000
```

---

## 📖 Usage Examples | 使用示例

### Agent Management | Agent 管理

```bash
# Create a Mega Agent | 创建 Mega Agent
resolvenet agent create my-assistant \
  --type mega \
  --model qwen-plus \
  --description "My intelligent assistant"

# List agents | 列出 Agent
resolvenet agent list

# Run agent interactively | 交互式运行 Agent
resolvenet agent run my-assistant

# View agent details | 查看 Agent 详情
resolvenet agent describe my-assistant
```

### Skill Management | 技能管理

```bash
# List available skills | 列出可用技能
resolvenet skill list

# Install a skill from local directory | 从本地目录安装技能
resolvenet skill install ./my-skill

# Install from Git repository | 从 Git 仓库安装
resolvenet skill install github.com/user/skill@v1.0.0

# Test a skill | 测试技能
resolvenet skill test web-search --input query="ResolveNet"
```

### FTA Workflow Management | FTA 工作流管理

```bash
# Create workflow from YAML | 从 YAML 创建工作流
resolvenet workflow create -f configs/examples/workflow-fta-example.yaml

# List workflows | 列出工作流
resolvenet workflow list

# Run a workflow | 运行工作流
resolvenet workflow run incident-diagnosis

# Validate workflow definition | 验证工作流定义
resolvenet workflow validate -f workflow.yaml

# Visualize workflow | 可视化工作流
resolvenet workflow visualize incident-diagnosis --format mermaid
```

### RAG Operations | RAG 操作

```bash
# Create a knowledge collection | 创建知识库
resolvenet rag collection create product-docs \
  --embedding-model bge-large-zh \
  --description "Product documentation"

# Ingest documents | 摄取文档
resolvenet rag ingest --collection product-docs --path ./documents/ --recursive

# Query the collection | 查询知识库
resolvenet rag query --collection product-docs --query "How to configure authentication"
```

### TUI Dashboard | TUI 仪表板

```bash
# Launch the terminal dashboard | 启动终端仪表板
resolvenet dashboard
```

---

## 📁 Project Structure | 项目结构

```
resolve-net/
├── api/proto/           # Protocol Buffer definitions | Proto 定义
│   └── resolvenet/v1/   # API v1 definitions
├── cmd/                 # Go entry points | Go 入口
│   ├── resolvenet-cli/  # CLI application
│   └── resolvenet-server/ # Platform server
├── pkg/                 # Go shared libraries (public API) | 公共 Go 库
│   ├── config/          # Configuration management
│   ├── gateway/         # Higress integration
│   ├── registry/        # Agent/Skill/Workflow registries
│   ├── server/          # HTTP/gRPC server
│   ├── store/           # Database abstraction
│   └── telemetry/       # Observability
├── internal/            # Go internal packages | 内部 Go 包
│   ├── cli/             # CLI commands
│   └── tui/             # Terminal UI
├── python/              # Python agent runtime | Python 运行时
│   └── src/resolvenet/
│       ├── agent/       # Agent definitions (BaseAgent, MegaAgent)
│       ├── selector/    # Intelligent Selector
│       ├── fta/         # FTA Workflow Engine
│       ├── skills/      # Skill System
│       ├── rag/         # RAG Pipeline
│       ├── llm/         # LLM provider abstraction
│       └── runtime/     # Execution engine
├── web/                 # React + TypeScript WebUI | Web 界面
├── deploy/              # Deployment configurations | 部署配置
│   ├── docker/          # Dockerfiles
│   ├── docker-compose/  # Docker Compose files
│   ├── helm/            # Helm charts
│   └── k8s/             # Kustomize configurations
├── configs/             # Default configurations | 默认配置
│   └── examples/        # Example configurations
├── skills/              # Community skill registry | 社区技能注册表
├── docs/                # Documentation | 文档
│   ├── zh/              # Chinese documentation | 中文文档
│   ├── architecture/    # Architecture docs
│   └── user-guide/      # User guides
├── hack/                # Development scripts | 开发脚本
└── test/                # End-to-end tests | 端到端测试
```

---

## 📚 Documentation | 文档

### English Documentation

- [Architecture Overview](docs/architecture/overview.md)
- [Intelligent Selector](docs/architecture/intelligent-selector.md)
- [FTA Engine](docs/architecture/fta-engine.md)
- [Quick Start Guide](docs/user-guide/quickstart.md)

### 中文文档

完整的中文文档位于 [`docs/zh/`](docs/zh/) 目录：

| 文档 | 说明 |
|------|------|
| [README.md](docs/zh/README.md) | 文档索引 |
| [快速入门](docs/zh/quickstart.md) | 5分钟上手指南 |
| [架构设计](docs/zh/architecture.md) | 系统架构详解 |
| [智能选择器](docs/zh/intelligent-selector.md) | 路由引擎详解 |
| [FTA 工作流引擎](docs/zh/fta-engine.md) | 故障树分析详解 |
| [技能系统](docs/zh/skill-system.md) | 技能开发指南 |
| [RAG 管道](docs/zh/rag-pipeline.md) | 知识检索系统 |
| [CLI 参考](docs/zh/cli-reference.md) | 命令行完整参考 |
| [配置参考](docs/zh/configuration.md) | 配置选项详解 |
| [部署指南](docs/zh/deployment.md) | 生产环境部署 |
| [最佳实践](docs/zh/best-practices.md) | 使用建议与技巧 |

---

## 🔧 Configuration Reference | 配置参考

### Environment Variables | 环境变量

| Variable | Description | Default |
|----------|-------------|---------|
| `RESOLVENET_SERVER_HTTP_ADDR` | HTTP API address | `:8080` |
| `RESOLVENET_SERVER_GRPC_ADDR` | gRPC API address | `:9090` |
| `RESOLVENET_DATABASE_HOST` | PostgreSQL host | `localhost` |
| `RESOLVENET_REDIS_ADDR` | Redis address | `localhost:6379` |
| `RESOLVENET_NATS_URL` | NATS URL | `nats://localhost:4222` |
| `QWEN_API_KEY` | Qwen API key | - |
| `WENXIN_API_KEY` | Wenxin API key | - |
| `ZHIPU_API_KEY` | Zhipu API key | - |

### Configuration Files | 配置文件

See [`configs/`](configs/) for example configurations:
- `resolvenet.yaml` - Platform services configuration
- `runtime.yaml` - Agent runtime configuration
- `models.yaml` - LLM model registry

---

## 🤝 Community | 社区

### Contributing | 贡献指南

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

我们欢迎贡献！请参阅 [CONTRIBUTING.md](CONTRIBUTING.md) 了解贡献指南。

**Quick contribution steps | 快速贡献步骤:**

```bash
# 1. Fork and clone | Fork 并克隆
git clone https://github.com/YOUR_USERNAME/resolve-net.git

# 2. Create a branch | 创建分支
git checkout -b feature/your-feature

# 3. Make changes and test | 修改并测试
make test
make lint

# 4. Submit PR | 提交 PR
```

### Code of Conduct | 行为准则

This project follows the [CNCF Code of Conduct](https://github.com/cncf/foundation/blob/main/code-of-conduct.md). Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

本项目遵循 [CNCF 行为准则](https://github.com/cncf/foundation/blob/main/code-of-conduct.md)。请阅读 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。

### Governance | 治理

See [GOVERNANCE.md](GOVERNANCE.md) for the project governance model.

项目治理模型请参阅 [GOVERNANCE.md](GOVERNANCE.md)。

### Maintainers | 维护者

| Name | GitHub | Role |
|------|--------|------|
| Allen Galler | [@allengaller](https://github.com/allengaller) | Lead Maintainer |

See [MAINTAINERS.md](MAINTAINERS.md) for the full list.

### Communication | 沟通渠道

- **GitHub Issues**: Bug reports and feature requests | 问题反馈和功能请求
- **GitHub Discussions**: General discussions and Q&A | 一般讨论和问答
- **Slack**: [Join our Slack workspace](#) (coming soon)

---

## 📊 Project Status | 项目状态

| Aspect | Status |
|--------|--------|
| **Development Stage** | Alpha |
| **API Stability** | Unstable (breaking changes expected) |
| **Production Readiness** | Not recommended for production |

### Version Compatibility | 版本兼容性

| ResolveNet | Go | Python | Kubernetes |
|------------|-----|--------|------------|
| v0.1.x | 1.22+ | 3.11+ | 1.25+ |

### Roadmap | 路线图

- [x] Core platform services
- [x] Intelligent Selector with three strategies
- [x] FTA Workflow Engine
- [x] Agent Skill System
- [x] RAG Pipeline
- [x] Chinese LLM support (Qwen, Wenxin, Zhipu)
- [ ] WebUI visual FTA editor
- [ ] Multi-agent collaboration
- [ ] Skill marketplace
- [ ] Enterprise features

---

## 📜 License | 许可证

ResolveNet is licensed under the [Apache License 2.0](LICENSE).

```
Copyright 2024 AI Guru Global

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

## 🔒 Security | 安全

Please see [SECURITY.md](SECURITY.md) for reporting security vulnerabilities.

安全漏洞报告请参阅 [SECURITY.md](SECURITY.md)。

---

## 🙏 Acknowledgements | 致谢

ResolveNet is built upon the shoulders of giants:

- [AgentScope](https://github.com/modelscope/agentscope) - Agent orchestration framework
- [Higress](https://github.com/alibaba/higress) - Cloud-native AI gateway
- [Milvus](https://milvus.io/) - Vector database
- [NATS](https://nats.io/) - Messaging system
- [Bubbletea](https://github.com/charmbracelet/bubbletea) - TUI framework
- [React Flow](https://reactflow.dev/) - Workflow visualization

---

<p align="center">
  <strong>⭐ Star us on GitHub — it motivates us a lot!</strong>
</p>

<p align="center">
  <strong>⭐ 在 GitHub 上给我们点个 Star — 这是对我们最大的鼓励！</strong>
</p>

<p align="center">
  Made with ❤️ by the <a href="https://github.com/ai-guru-global">AI Guru Global</a> team
</p>
