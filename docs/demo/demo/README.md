# ResolveNet Intelligent Selector Demo

## 快速开始

### 一键部署

```bash
# 添加执行权限
chmod +x deploy.sh

# 运行部署脚本（批量测试模式）
./deploy.sh

# 交互模式
./deploy.sh --interactive

# 仅设置环境
./deploy.sh --setup-only
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
python main.py --interactive  # 交互模式
```

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
|------|---------|---------|
| Web 搜索 | "帮我搜索 Kubernetes 最佳实践" | skill:web-search |
| 日志分析 | "分析一下错误日志" | skill:log-analyzer |
| 知识库查询 | "502 错误怎么处理？" | rag:support-knowledge-base |
| 故障诊断 | "帮我诊断线上故障" | fta:incident-diagnosis |
| 简单对话 | "你好" | direct |

## 更多信息

详细文档请参阅: [intelligent-selector-demo.md](../intelligent-selector-demo.md)
