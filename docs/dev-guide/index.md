# 开发者指南

欢迎使用 ResolveAgent 开发者指南！本文档将帮助你快速搭建开发环境并参与项目贡献。

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/ai-guru-global/resolve-agent.git
cd resolve-agent

# 2. 一键设置开发环境
make setup-dev

# 3. 验证环境
make test
```

## 开发环境要求

| 依赖 | 版本 | 用途 |
|------|------|------|
| Go | >= 1.22 | 平台服务、CLI |
| Python | >= 3.11 | Agent 运行时 |
| Node.js | >= 20 | WebUI |
| Docker | >= 20.10 | 容器运行时 |
| Docker Compose | >= 2.0 | 本地开发 |
| uv | latest | Python 包管理 |
| pnpm | >= 9 | Node.js 包管理 |

## 项目结构

```
resolve-agent/
├── cmd/                    # Go 可执行程序入口
│   ├── resolveagent-cli/   # CLI 入口
│   └── resolveagent-server/# 服务端入口
├── pkg/                    # Go 公开库
├── internal/               # Go 内部包
├── python/                 # Python Agent 运行时
│   └── src/resolveagent/
├── web/                    # React WebUI
├── docs/                   # 文档源文件
├── docs-site/              # Docusaurus 文档站点
└── deploy/                 # 部署配置
```

## 开发工作流

### 1. 创建功能分支

```bash
git checkout -b feature/your-feature-name
```

### 2. 开发 Go 代码

```bash
# 运行 Go 测试
make test-go

# 运行 Go Linter
make lint-go

# 格式化代码
make fmt
```

### 3. 开发 Python 代码

```bash
cd python

# 同步依赖
uv sync --extra dev

# 运行测试
uv run pytest tests/ -v

# 运行 Linter
uv run ruff check src/ tests/
uv run ruff format src/ tests/

# 类型检查
uv run mypy src/resolveagent/
```

### 4. 开发 WebUI

```bash
cd web

# 安装依赖
pnpm install

# 开发服务器
pnpm dev

# 运行测试
pnpm test

# 构建
pnpm build
```

### 5. 提交代码

```bash
# 预提交检查（自动运行）
git add .
git commit -m "feat: your feature description"

# 推送到远程
git push origin feature/your-feature-name
```

## 调试技巧

### Go 调试

```bash
# 使用 delve 调试
dlv debug ./cmd/resolveagent-server

# 或直接使用 GoLand/VSCode 调试配置
```

### Python 调试

```bash
# 使用 ipdb
cd python
uv run python -m ipdb -c continue your_script.py

# 在代码中插入断点
import ipdb; ipdb.set_trace()
```

### 查看日志

```bash
# Docker Compose 日志
make compose-logs

# 特定服务日志
docker logs -f resolveagent-platform
```

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

类型说明：

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 代码重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具链 |

示例：

```
feat(selector): add hybrid routing strategy

Implement hybrid strategy that combines rule-based
and LLM-based routing for better accuracy.

Closes #123
```

## 代码审查清单

提交 PR 前，请确保：

- [ ] 代码通过所有测试 (`make test`)
- [ ] 代码通过 Linter (`make lint`)
- [ ] 新增功能有对应的测试
- [ ] 文档已更新
- [ ] 提交信息符合规范

## 获取帮助

- [GitHub Discussions](https://github.com/ai-guru-global/resolve-agent/discussions) - 一般讨论
- [GitHub Issues](https://github.com/ai-guru-global/resolve-agent/issues) - Bug 报告和功能请求

## 下一步

- [本地开发环境搭建](./local-dev.md)
- [代码贡献指南](./contributing.md)
- [测试编写规范](./testing.md)
- [调试技巧](./debugging.md)
