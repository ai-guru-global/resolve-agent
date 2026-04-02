# 本地开发环境搭建

本文档详细介绍如何搭建 ResolveAgent 的本地开发环境。

## 前置要求

### macOS

```bash
# 使用 Homebrew 安装依赖
brew install go python@3.12 node pnpm

# 安装 uv (Python 包管理器)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 安装 golangci-lint
brew install golangci-lint
```

### Linux (Ubuntu/Debian)

```bash
# Go
wget https://go.dev/dl/go1.22.5.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.22.5.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin

# Python 3.12
sudo apt update
sudo apt install python3.12 python3.12-venv python3.12-dev

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -

# uv
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Windows

使用 WSL2 或手动安装：

1. [Go](https://go.dev/dl/)
2. [Python 3.12](https://www.python.org/downloads/)
3. [Node.js 20](https://nodejs.org/)
4. `npm install -g pnpm`
5. `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`

## 项目设置

### 1. 克隆仓库

```bash
git clone https://github.com/ai-guru-global/resolve-agent.git
cd resolve-agent
```

### 2. 运行设置脚本

```bash
make setup-dev
```

这会执行以下操作：
- 安装 Go 依赖
- 安装 Python 依赖
- 安装 Node.js 依赖
- 设置 Git hooks
- 验证环境

### 3. 启动依赖服务

```bash
make compose-deps
```

这会启动：
- PostgreSQL (端口 5432)
- Redis (端口 6379)
- NATS (端口 4222)
- Milvus (端口 19530)

### 4. 验证安装

```bash
# 构建项目
make build

# 运行测试
make test

# 检查环境
which go python3 node pnpm
```

## IDE 配置

### VSCode 推荐扩展

创建 `.vscode/extensions.json`：

```json
{
  "recommendations": [
    "golang.Go",
    "ms-python.python",
    "charliermarsh.ruff",
    "ms-python.mypy-type-checker",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode"
  ]
}
```

### VSCode 设置

创建 `.vscode/settings.json`：

```json
{
  "go.toolsManagement.autoUpdate": true,
  "go.lintTool": "golangci-lint",
  "go.formatTool": "gofumpt",
  "python.defaultInterpreterPath": "${workspaceFolder}/python/.venv/bin/python",
  "python.linting.enabled": true,
  "python.linting.ruffEnabled": true,
  "python.formatting.provider": "ruff",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": true
  }
}
```

### GoLand 配置

1. **Go 设置**
   - Settings → Go → GOROOT: 选择 Go 1.22+
   - Settings → Tools → File Watchers: 添加 `gofumpt`

2. **Python 设置**
   - Settings → Project → Python Interpreter: 选择 `./python/.venv`
   - 启用 Ruff 和 Mypy

## 开发工作流

### 日常开发流程

```bash
# 1. 确保依赖服务运行
docker compose -f deploy/docker-compose/docker-compose.deps.yaml ps

# 2. 启动平台服务（终端 1）
make build-go
./bin/resolveagent-server

# 3. 启动 Agent 运行时（终端 2）
cd python && uv run resolveagent-runtime

# 4. 启动 WebUI（终端 3）
cd web && pnpm dev
```

### 访问点

| 服务 | 地址 | 说明 |
|------|------|------|
| Platform HTTP API | http://localhost:8080 | REST API |
| Platform gRPC | localhost:9090 | gRPC API |
| WebUI | http://localhost:3000 | 管理界面 |
| PostgreSQL | localhost:5432 | 数据库 |
| Redis | localhost:6379 | 缓存 |
| NATS | localhost:4222 | 消息队列 |

### 调试模式

```bash
# Go 调试模式
DEBUG=1 ./bin/resolveagent-server

# Python 调试模式
DEBUG=1 uv run resolveagent-runtime
```

## 常见问题

### Go 模块下载失败

```bash
# 设置 GOPROXY
export GOPROXY=https://goproxy.cn,direct

# 或
export GOPROXY=https://proxy.golang.org,direct
```

### Python 虚拟环境问题

```bash
# 重新创建虚拟环境
cd python
rm -rf .venv
uv sync --extra dev
```

### Node.js 依赖问题

```bash
cd web
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### 端口被占用

```bash
# 查找占用端口的进程
lsof -i :8080

# 停止 Docker 容器
make compose-down
```

## 下一步

- [代码贡献指南](./contributing.md)
- [测试编写规范](./testing.md)
- [调试技巧](./debugging.md)
