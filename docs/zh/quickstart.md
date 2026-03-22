# 快速入门

本指南将帮助您在 **5分钟内** 启动 ResolveNet 并运行您的第一个智能 Agent。

---

## 环境要求

在开始之前，请确保您的系统满足以下要求：

| 依赖项 | 最低版本 | 说明 |
|--------|----------|------|
| Go | 1.22+ | 平台服务和 CLI 构建 |
| Python | 3.11+ | Agent 运行时 |
| Node.js | 20+ | WebUI 构建（可选） |
| Docker | 20.10+ | 容器运行时 |
| Docker Compose | 2.0+ | 本地开发环境编排 |

### 推荐工具

- **uv**: Python 依赖管理 - https://github.com/astral-sh/uv
- **pnpm**: Node.js 包管理 - https://pnpm.io/

---

## 安装步骤

### 1. 克隆仓库

```bash
git clone https://github.com/ai-guru-global/resolve-net.git
cd resolve-net
```

### 2. 初始化开发环境

```bash
# 一键设置开发环境（安装 Go、Python、Node 依赖）
make setup-dev
```

此命令将执行以下操作：
- 安装 Go 模块依赖
- 创建 Python 虚拟环境并安装依赖
- 安装 Node.js 依赖
- 生成 Protocol Buffers 代码

### 3. 启动基础设施服务

```bash
# 启动 PostgreSQL、Redis、NATS
make compose-deps
```

等待服务完全启动后，您可以检查服务状态：

```bash
docker compose -f deploy/docker-compose/docker-compose.deps.yaml ps
```

### 4. 构建项目

```bash
# 构建所有组件
make build
```

构建产物：
- `bin/resolvenet-server`: 平台服务器
- `bin/resolvenet-cli`: 命令行工具

### 5. 运行测试

```bash
# 运行单元测试
make test

# 运行端到端测试（需要基础设施服务运行）
make test-e2e
```

---

## 启动服务

### 方式一：使用 Docker Compose（推荐）

```bash
# 启动完整环境（包含所有服务）
make compose-up

# 或使用开发模式（启用热重载）
make compose-dev
```

### 方式二：手动启动

```bash
# 终端 1：启动平台服务
./bin/resolvenet-server

# 终端 2：启动 Agent 运行时
cd python
uv run python -m resolvenet.runtime.server
```

服务启动后：
- **平台 HTTP API**: http://localhost:8080
- **平台 gRPC**: localhost:9090
- **Agent 运行时 gRPC**: localhost:9091

---

## 配置大模型

ResolveNet 支持多种国产大模型。编辑配置文件设置您的 API 密钥：

### 创建配置文件

```bash
mkdir -p ~/.resolvenet
cp configs/models.yaml ~/.resolvenet/models.yaml
```

### 配置 API 密钥

编辑 `~/.resolvenet/models.yaml`：

```yaml
models:
  # 通义千问
  - id: qwen-plus
    provider: qwen
    model_name: qwen-plus
    max_tokens: 32768
    api_key: "your-qwen-api-key"  # 从 dashscope.aliyun.com 获取

  # 文心一言
  - id: ernie-4
    provider: wenxin
    model_name: ernie-4.0-8k
    max_tokens: 8192
    api_key: "your-wenxin-api-key"  # 从 cloud.baidu.com 获取

  # 智谱清言
  - id: glm-4
    provider: zhipu
    model_name: glm-4
    max_tokens: 8192
    api_key: "your-zhipu-api-key"  # 从 open.bigmodel.cn 获取
```

也可以使用环境变量：

```bash
export QWEN_API_KEY="your-qwen-api-key"
export WENXIN_API_KEY="your-wenxin-api-key"
export ZHIPU_API_KEY="your-zhipu-api-key"
```

---

## 第一个 Agent

### 使用 CLI 创建 Agent

```bash
# 创建一个 Mega Agent
resolvenet agent create my-assistant \
  --type mega \
  --model qwen-plus \
  --description "我的第一个智能助手"
```

### 查看 Agent 列表

```bash
resolvenet agent list
```

输出示例：
```
NAME            TYPE    MODEL       STATUS    CREATED
my-assistant    mega    qwen-plus   active    2024-01-15 10:30:00
```

### 与 Agent 交互

```bash
# 启动交互式对话
resolvenet agent run my-assistant
```

交互示例：
```
ResolveNet Agent Shell - my-assistant
Type 'exit' to quit, 'help' for commands

> 你好，请介绍一下你自己
[my-assistant] 你好！我是 my-assistant，一个基于 ResolveNet 平台的智能助手。
我可以帮助您：
- 搜索网络信息
- 分析文档
- 执行工作流程
- ...

> 帮我搜索一下最新的 AI 新闻
[执行技能: web-search]
[路由决策: skill -> web-search, 置信度: 0.92]
正在搜索最新 AI 新闻...
```

---

## 使用 TUI 仪表板

ResolveNet 提供终端用户界面（TUI）用于监控和管理：

```bash
resolvenet dashboard
```

TUI 功能：
- 实时查看 Agent 状态
- 监控工作流执行
- 查看系统日志
- 管理技能和配置

快捷键：
- `Tab`: 切换面板
- `j/k`: 上下移动
- `Enter`: 选择/执行
- `q`: 退出

---

## 下一步

恭喜！您已经成功启动了 ResolveNet 并运行了第一个 Agent。

### 深入学习

- **[架构设计](./architecture.md)** - 了解系统内部工作原理
- **[智能选择器](./intelligent-selector.md)** - 掌握路由机制
- **[技能系统](./skill-system.md)** - 开发自定义技能

### 实践练习

1. **创建自定义技能**：按照 [技能开发指南](./skill-system.md#开发自定义技能) 创建一个简单技能
2. **配置 RAG**：按照 [RAG 管道](./rag-pipeline.md) 导入您的文档
3. **构建工作流**：使用 [FTA 工作流引擎](./fta-engine.md) 创建自动化流程

---

## 常见问题

### Q: 无法连接到服务

**A**: 检查服务是否正常运行：
```bash
# 检查健康状态
resolvenet health

# 查看服务日志
docker compose -f deploy/docker-compose/docker-compose.deps.yaml logs
```

### Q: Agent 创建失败

**A**: 确保已配置正确的模型和 API 密钥：
```bash
# 验证配置
resolvenet config get

# 检查模型可用性
resolvenet config get models
```

### Q: 如何查看详细日志？

**A**: 设置日志级别：
```bash
# 启用调试日志
export LOG_LEVEL=debug
resolvenet agent run my-assistant
```

---

> **提示**: 如果遇到问题，请查阅 [常见问题](./faq.md) 或在 [GitHub Issues](https://github.com/ai-guru-global/resolve-net/issues) 提交问题。
