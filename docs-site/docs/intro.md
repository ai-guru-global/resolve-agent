# ResolveAgent 文档

欢迎使用 ResolveAgent 文档！

## 什么是 ResolveAgent？

**ResolveAgent** 是一个**面向问题解决的 AIOps 智能体** — 一个 **CNCF 级别的开源解决方案**，通过四大核心能力协同工作解决真实运维问题：

- **🔧 专家技能** — 通过可插拔技能模块提供领域专业知识
- **🌳 FTA 工作流** — 故障树分析用于系统性问题诊断
- **📚 RAG 知识库** — 检索增强生成提供知识支撑
- **💻 代码分析** — 静态代码分析作为底层技术保障

基于 [AgentScope](https://github.com/modelscope/agentscope) 构建 Agent 编排能力，基于 [Higress](https://github.com/alibaba/higress) 构建 AI 网关能力。

## 快速导航

| 我是... | 从这里开始 |
|---------|-----------|
| **新用户** | [快速开始指南](/docs/user-guide/quickstart) |
| **开发者** | [本地开发指南](/docs/dev-guide/local-dev) |
| **运维工程师** | [部署手册](/docs/ops/deployment) |
| **架构师** | [架构概览](/docs/zh/architecture) |
| **API 用户** | [API 参考](/docs/api/index) |

## 功能特性

### 🧠 智能选择器

核心 AI 大脑，智能地将请求路由到最优处理路径。

```mermaid
flowchart TB
    subgraph SELECTOR["<b>🧠 INTELLIGENT SELECTOR</b>"]
        direction TB
        INPUT["📝 User Input"]
        INTENT["🔍 Intent Analyzer"]
        CONTEXT["📊 Context Enricher"]
        DECIDER["🎯 Route Decider"]
        
        INPUT --> INTENT --> CONTEXT --> DECIDER
    end
    
    subgraph ROUTES["路由目标"]
        direction LR
        WORKFLOW["🌳 Workflow"]
        SKILLS["🔧 Skills"]
        RAG["📚 RAG"]
        CODE["💻 Code Analysis"]
    end
    
    DECIDER --> WORKFLOW
    DECIDER --> SKILLS
    DECIDER --> RAG
    DECIDER --> CODE
```

### 🔬 高级静态分析 (FTA)

支持多种故障树分析门类型：

| 门类型 | 描述 |
|--------|------|
| **AND Gate** | 所有输入必须为真 |
| **OR Gate** | 任一输入为真即可 |
| **VOTING (k-of-n)** | 至少 k 个输入为真 |
| **INHIBIT** | 条件门控 |
| **PRIORITY-AND** | 有序与门 |

### 📚 RAG 管道

端到端的知识检索增强生成：

```mermaid
flowchart LR
    subgraph INGEST["📥 摄取"]
        DOC["📄 文档"]
        CHUNK["✂️ 分块"]
        DOC --> CHUNK
    end
    
    subgraph INDEX["📊 索引"]
        EMBED["🧠 Embedding<br/>BGE-large-zh"]
        STORE[("🔮 Vector Store<br/>Milvus")]
        CHUNK --> EMBED --> STORE
    end
    
    subgraph RETRIEVE["🔍 检索"]
        QUERY["❓ 查询"]
        SEARCH["🎯 相似性搜索"]
        RERANK["📊 重排序"]
        RESULT["📝 结果"]
        QUERY --> SEARCH
        STORE --> SEARCH
        SEARCH --> RERANK --> RESULT
    end
```

## 系统架构

```mermaid
flowchart TB
    subgraph CLIENTS["📱 客户端"]
        direction LR
        CLI["🖥️ CLI/TUI<br/>Go"]
        WEBUI["🌐 WebUI<br/>React+TS"]
        API["🔌 External API"]
    end
    
    subgraph GATEWAY["🛡️ HIGRESS AI/API 网关"]
        direction LR
        GW_FUNC["认证 | 限流 | 模型路由 | 路由规则"]
    end
    
    subgraph PLATFORM["⚙️ 平台服务 - Go"]
        direction TB
        subgraph REG["注册中心"]
            APISVR["API Server<br/>HTTP/gRPC"]
            AGENT_REG["Agent Registry"]
            SKILL_REG["Skill Registry"]
            WF_REG["Workflow Registry"]
        end
        subgraph INFRA["基础设施"]
            SYNC["路由同步<br/>Go→Higress"]
            EVENT["事件总线<br/>NATS"]
            ROUTER["模型路由器"]
            TELE["遥测"]
        end
    end
    
    subgraph RUNTIME["🐍 Agent 运行时 - Python"]
        direction TB
        subgraph SELECTOR2["🧠 智能选择器"]
            INTENT2["意图分析器"]
            CTX["上下文增强器"]
            DECIDE2["路由决策器"]
            INTENT2 --> CTX --> DECIDE2
        end
        subgraph ENGINES["执行引擎"]
            FTA["🌳 FTA 引擎"]
            SKILLS2["🔧 专家技能"]
            RAGP["📚 RAG 管道"]
        end
        subgraph LLM["🤖 LLM via Higress"]
            QWEN["通义千问"]
            WENXIN["文心一言"]
            ZHIPU["智谱清言"]
            OPENAI["OpenAI"]
        end
        DECIDE2 --> FTA & SKILLS2 & RAGP
    end
    
    subgraph DATA["🗄️ 数据层"]
        direction LR
        PG[("🐘 PostgreSQL")]
        REDIS[("⚡ Redis")]
        NATS[("📨 NATS")]
        VECTOR[("🔮 Milvus")]
    end
    
    CLIENTS --> GATEWAY
    GATEWAY --> PLATFORM
    PLATFORM -->|gRPC| RUNTIME
    RUNTIME --> DATA
```

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/ai-guru-global/resolve-agent.git
cd resolve-agent

# 一键设置开发环境
make setup-dev

# 启动依赖服务
make compose-deps

# 构建并启动
make build
make compose-up

# 访问 WebUI
open http://localhost:3000
```

## 参与贡献

我们欢迎各种形式的贡献！请查看：

- [贡献指南](/docs/dev-guide/contributing)
- [开发环境搭建](/docs/dev-guide/local-dev)
- [GitHub Issues](https://github.com/ai-guru-global/resolve-agent/issues)

## 许可证

本项目采用 Apache 2.0 许可证。详见 [LICENSE](https://github.com/ai-guru-global/resolve-agent/blob/main/LICENSE) 文件。
