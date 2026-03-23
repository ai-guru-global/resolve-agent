# ResolveAgent Intelligent Selector Demo

🧠 **智能路由决策引擎演示** - 展示 Intelligent Selector 如何智能地将用户请求路由到最合适的执行子系统。

## 快速开始

### 一键部署与运行

```bash
# 添加执行权限
chmod +x deploy.sh

# 运行部署脚本（批量测试模式）
./deploy.sh

# 交互模式（推荐 - 可以自由输入测试）
./deploy.sh --interactive

# 仅设置环境，不运行
./deploy.sh --setup-only

# 清理演示资源
./deploy.sh cleanup
```

### 手动运行

```bash
# 1. 创建虚拟环境
python3 -m venv .venv
source .venv/bin/activate

# 2. 安装依赖
pip install pyyaml

# 3. 运行 Demo
python main.py                # 批量测试
python main.py --interactive  # 交互模式（推荐）
```

## 路由类型说明

Intelligent Selector 支持以下路由类型：

| 图标 | 路由类型 | 名称 | 描述 |
|------|----------|------|------|
| 🔧 | `skill` | 技能执行器 | 执行特定功能的技能模块（搜索、日志分析、指标检查等） |
| 📚 | `rag` | 知识检索 | 检索增强生成 - 知识库查询 |
| 🌳 | `fta` | 故障树分析 | FTA 工作流 - 复杂诊断分析 |
| 💻 | `code_analysis` | 代码分析 | 静态代码分析 - AST/LSP |
| 💬 | `direct` | 直接对话 | 直接 LLM 对话回复 |

## 目录结构

```
demo/
├── deploy.sh              # 一键部署脚本
├── main.py                # Demo 主入口
├── README.md              # 本文件
│
├── agents/                # Agent 配置
│   └── support-agent.yaml
│
├── skills/                # Skills 实现
│   ├── web-search/
│   ├── log-analyzer/
│   └── metrics-checker/
│
├── workflows/             # Workflow 定义
│   └── incident-diagnosis.yaml
│
└── rag/                   # RAG 配置和文档
    ├── config.yaml
    └── documents/
```

## 测试场景

| 场景 | 输入示例 | 预期路由 |
|------|---------|--------|
| 🔍 Web 搜索 | "帮我搜索 Kubernetes 最佳实践" | skill:web-search |
| 📝 日志分析 | "分析一下 /var/log/app 的错误日志" | skill:log-analyzer |
| 📊 指标检查 | "检查一下服务器的 CPU 和内存" | skill:metrics-checker |
| 📚 知识库查询 | "502 错误怎么处理？" | rag:support-knowledge-base |
| 🌳 故障诊断 | "线上服务响应变慢，帮我诊断" | fta:incident-diagnosis |
| 💻 代码分析 | "帮我分析这段代码有没有 bug" | code_analysis:static-analyzer |
| 💬 简单对话 | "你好，你是谁？" | direct |

## 交互模式路由决策展示

在交互模式下，您可以输入任意问题并观察智能路由决策：

```
You: 帮我搜索 Docker 教程

┌──────────────────────────────────────────────────────────┐
│  🧠 INTELLIGENT SELECTOR 路由决策                       │
├──────────────────────────────────────────────────────────┤
│  路由类型: 🔧  技能执行器                               │
│  路由目标: web-search                                   │
│  置信度:   [████████████████████████░░░░░░] 88%        │
│  意图类别: task_execution                               │
│  匹配关键词: 搜索                                           │
└──────────────────────────────────────────────────────────┘

Assistant: 已调用 web-search 技能处理您的请求。
```

## 更多信息

详细文档请参阅: [intelligent-selector-demo.md](../intelligent-selector-demo.md)
