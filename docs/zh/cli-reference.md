# CLI 命令参考

ResolveNet CLI 提供完整的命令行管理能力，涵盖 Agent、技能、工作流、RAG 和系统管理。

---

## 安装

CLI 工具随 ResolveNet 一起安装：

```bash
# 从源码构建
make build

# 验证安装
resolvenet version
```

### 全局选项

所有命令支持以下全局选项：

| 选项 | 说明 | 示例 |
|------|------|------|
| `--config, -c` | 配置文件路径 | `--config ~/.resolvenet/config.yaml` |
| `--server` | 服务器地址 | `--server localhost:8080` |
| `--output, -o` | 输出格式 (json/yaml/table) | `-o json` |
| `--verbose, -v` | 详细输出 | `-v` |
| `--quiet, -q` | 静默模式 | `-q` |
| `--help, -h` | 显示帮助 | `-h` |

---

## Agent 管理

### resolvenet agent create

创建新的 Agent。

```bash
resolvenet agent create <name> [flags]

# 示例
resolvenet agent create my-assistant \
  --type mega \
  --model qwen-plus \
  --description "我的智能助手"

# 从配置文件创建
resolvenet agent create -f agent.yaml
```

**选项**:

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--type, -t` | Agent 类型 (mega/skill/fta/rag) | mega |
| `--model, -m` | 使用的 LLM 模型 ID | - |
| `--description, -d` | Agent 描述 | - |
| `--skills` | 关联的技能列表 | - |
| `--workflow` | 关联的工作流 ID | - |
| `--rag-collection` | 关联的 RAG 知识库 | - |
| `-f, --file` | 从 YAML 文件创建 | - |

### resolvenet agent list

列出所有 Agent。

```bash
resolvenet agent list [flags]

# 示例
resolvenet agent list
resolvenet agent list --type mega
resolvenet agent list -o json
```

**选项**:

| 选项 | 说明 |
|------|------|
| `--type` | 按类型过滤 |
| `--status` | 按状态过滤 (active/inactive) |
| `--limit` | 限制返回数量 |

### resolvenet agent describe

查看 Agent 详细信息。

```bash
resolvenet agent describe <name>

# 示例
resolvenet agent describe my-assistant
```

### resolvenet agent run

交互式运行 Agent。

```bash
resolvenet agent run <name> [flags]

# 交互模式
resolvenet agent run my-assistant

# 单次执行
resolvenet agent run my-assistant --input "你好"

# 从文件读取输入
resolvenet agent run my-assistant --input-file query.txt
```

**选项**:

| 选项 | 说明 |
|------|------|
| `--input, -i` | 输入文本 |
| `--input-file` | 从文件读取输入 |
| `--conversation` | 会话 ID（续接对话） |
| `--stream` | 流式输出 |

### resolvenet agent update

更新 Agent 配置。

```bash
resolvenet agent update <name> [flags]

# 示例
resolvenet agent update my-assistant --model qwen-max
resolvenet agent update my-assistant -f updated-config.yaml
```

### resolvenet agent delete

删除 Agent。

```bash
resolvenet agent delete <name> [flags]

# 示例
resolvenet agent delete my-assistant
resolvenet agent delete my-assistant --force
```

### resolvenet agent logs

查看 Agent 执行日志。

```bash
resolvenet agent logs <name> [flags]

# 示例
resolvenet agent logs my-assistant
resolvenet agent logs my-assistant --follow
resolvenet agent logs my-assistant --since 1h
```

---

## 技能管理

### resolvenet skill list

列出所有技能。

```bash
resolvenet skill list [flags]

# 示例
resolvenet skill list
resolvenet skill list --source builtin
resolvenet skill list -o json
```

### resolvenet skill info

查看技能详细信息。

```bash
resolvenet skill info <name>

# 示例
resolvenet skill info web-search
```

### resolvenet skill install

安装技能。

```bash
resolvenet skill install <source> [flags]

# 从本地目录
resolvenet skill install ./my-skill

# 从 Git 仓库
resolvenet skill install github.com/user/skill

# 从 Git 指定版本
resolvenet skill install github.com/user/skill@v1.0.0

# 从 OCI 镜像
resolvenet skill install oci://ghcr.io/org/skill:latest

# 从社区注册表
resolvenet skill install registry://web-search
```

**选项**:

| 选项 | 说明 |
|------|------|
| `--name` | 安装后的名称（覆盖清单名称） |
| `--force` | 强制重新安装 |

### resolvenet skill test

测试技能执行。

```bash
resolvenet skill test <name> [flags]

# 示例
resolvenet skill test web-search --input query="ResolveNet"
resolvenet skill test web-search --input-file test-data.json
```

**选项**:

| 选项 | 说明 |
|------|------|
| `--input` | 输入参数 (key=value 格式) |
| `--input-file` | 从 JSON 文件读取输入 |
| `--timeout` | 执行超时 |

### resolvenet skill remove

移除技能。

```bash
resolvenet skill remove <name> [flags]

# 示例
resolvenet skill remove my-skill
resolvenet skill remove my-skill --force
```

### resolvenet skill init

初始化技能项目。

```bash
resolvenet skill init <name> [flags]

# 示例
resolvenet skill init my-skill
resolvenet skill init my-skill --template python
```

---

## 工作流管理

### resolvenet workflow create

创建工作流。

```bash
resolvenet workflow create <name> [flags]

# 从文件创建
resolvenet workflow create -f workflow.yaml

# 交互式创建
resolvenet workflow create --interactive
```

### resolvenet workflow list

列出所有工作流。

```bash
resolvenet workflow list [flags]

# 示例
resolvenet workflow list
resolvenet workflow list --status active
```

### resolvenet workflow describe

查看工作流详情。

```bash
resolvenet workflow describe <name>

# 示例
resolvenet workflow describe incident-diagnosis
```

### resolvenet workflow run

执行工作流。

```bash
resolvenet workflow run <name> [flags]

# 示例
resolvenet workflow run incident-diagnosis

# 带参数执行
resolvenet workflow run incident-diagnosis \
  --param log_source=/var/log/app \
  --param time_range=1h

# 从文件读取参数
resolvenet workflow run incident-diagnosis --param-file params.yaml
```

**选项**:

| 选项 | 说明 |
|------|------|
| `--param` | 执行参数 (key=value) |
| `--param-file` | 从文件读取参数 |
| `--async` | 异步执行 |
| `--wait` | 等待完成 |

### resolvenet workflow validate

验证工作流定义。

```bash
resolvenet workflow validate -f workflow.yaml

# 示例输出
✓ 工作流结构有效
✓ 所有事件引用正确
✓ 门逻辑完整
✓ 评估器配置正确
```

### resolvenet workflow visualize

可视化工作流（生成图形）。

```bash
resolvenet workflow visualize <name> [flags]

# 输出 ASCII 图
resolvenet workflow visualize incident-diagnosis

# 输出 Mermaid 图
resolvenet workflow visualize incident-diagnosis --format mermaid

# 输出到文件
resolvenet workflow visualize incident-diagnosis --format png -o workflow.png
```

### resolvenet workflow executions

查看工作流执行历史。

```bash
resolvenet workflow executions <name> [flags]

# 示例
resolvenet workflow executions incident-diagnosis
resolvenet workflow executions incident-diagnosis --limit 10
```

---

## RAG 管理

### resolvenet rag collection create

创建知识库集合。

```bash
resolvenet rag collection create <name> [flags]

# 示例
resolvenet rag collection create product-docs \
  --embedding-model bge-large-zh \
  --description "产品文档知识库"

# 从配置文件创建
resolvenet rag collection create -f collection.yaml
```

**选项**:

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--embedding-model` | 嵌入模型 | bge-large-zh |
| `--description` | 描述 | - |
| `--chunking-strategy` | 分块策略 | semantic |
| `--chunk-size` | 分块大小 | 512 |
| `-f, --file` | 配置文件 | - |

### resolvenet rag collection list

列出所有知识库。

```bash
resolvenet rag collection list [flags]

# 示例
resolvenet rag collection list
resolvenet rag collection list -o json
```

### resolvenet rag collection info

查看知识库详情。

```bash
resolvenet rag collection info <name>

# 示例
resolvenet rag collection info product-docs
```

### resolvenet rag collection delete

删除知识库。

```bash
resolvenet rag collection delete <name> [flags]

# 示例
resolvenet rag collection delete product-docs
resolvenet rag collection delete product-docs --force
```

### resolvenet rag ingest

摄取文档到知识库。

```bash
resolvenet rag ingest --collection <name> --path <path> [flags]

# 摄取单个文件
resolvenet rag ingest --collection product-docs --path ./guide.pdf

# 摄取目录
resolvenet rag ingest --collection product-docs --path ./documents/

# 递归摄取
resolvenet rag ingest --collection product-docs \
  --path ./docs/ \
  --recursive

# 指定文件类型
resolvenet rag ingest --collection product-docs \
  --path ./docs/ \
  --include "*.md,*.pdf"
```

**选项**:

| 选项 | 说明 |
|------|------|
| `--collection, -c` | 目标知识库 |
| `--path, -p` | 文件或目录路径 |
| `--recursive, -r` | 递归处理子目录 |
| `--include` | 包含的文件模式 |
| `--exclude` | 排除的文件模式 |
| `--batch-size` | 批处理大小 |
| `--metadata` | 文档元数据 (JSON) |

### resolvenet rag query

查询知识库。

```bash
resolvenet rag query --collection <name> --query <query> [flags]

# 示例
resolvenet rag query --collection product-docs \
  --query "如何配置认证"

# 带选项查询
resolvenet rag query --collection product-docs \
  --query "部署配置" \
  --top-k 10 \
  --score-threshold 0.7 \
  --rerank
```

**选项**:

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--collection, -c` | 目标知识库 | - |
| `--query, -q` | 查询文本 | - |
| `--top-k, -k` | 返回数量 | 5 |
| `--score-threshold` | 最低分数 | 0.0 |
| `--filter` | 元数据过滤 (JSON) | - |
| `--rerank` | 启用重排序 | false |

---

## 系统管理

### resolvenet serve

启动服务。

```bash
resolvenet serve [flags]

# 启动平台服务
resolvenet serve

# 指定配置
resolvenet serve --config /path/to/config.yaml

# 指定端口
resolvenet serve --http-addr :8080 --grpc-addr :9090
```

### resolvenet dashboard

启动 TUI 仪表板。

```bash
resolvenet dashboard [flags]

# 示例
resolvenet dashboard
resolvenet dashboard --refresh 5s
```

### resolvenet health

检查系统健康状态。

```bash
resolvenet health [flags]

# 示例
resolvenet health
resolvenet health -o json

# 输出示例
STATUS: HEALTHY

Components:
  ✓ Platform API      healthy
  ✓ Agent Runtime     healthy
  ✓ PostgreSQL        healthy
  ✓ Redis             healthy
  ✓ NATS              healthy
```

### resolvenet config

管理配置。

```bash
# 查看当前配置
resolvenet config get

# 查看特定配置
resolvenet config get server.http_addr

# 设置配置
resolvenet config set server.http_addr ":8888"
```

### resolvenet version

显示版本信息。

```bash
resolvenet version

# 输出
ResolveNet CLI v0.1.0
  Commit:     abc1234
  Build Date: 2024-01-15
  Go Version: go1.22.0
  Platform:   darwin/arm64
```

---

## 自动补全

### Bash

```bash
# 生成补全脚本
resolvenet completion bash > /etc/bash_completion.d/resolvenet

# 或临时启用
source <(resolvenet completion bash)
```

### Zsh

```bash
# 生成补全脚本
resolvenet completion zsh > "${fpath[1]}/_resolvenet"

# 或添加到 .zshrc
echo 'source <(resolvenet completion zsh)' >> ~/.zshrc
```

### Fish

```bash
resolvenet completion fish > ~/.config/fish/completions/resolvenet.fish
```

### PowerShell

```powershell
resolvenet completion powershell | Out-String | Invoke-Expression
```

---

## 环境变量

以下环境变量可以覆盖配置：

| 变量 | 说明 | 示例 |
|------|------|------|
| `RESOLVENET_SERVER` | 服务器地址 | `localhost:8080` |
| `RESOLVENET_CONFIG` | 配置文件路径 | `~/.resolvenet/config.yaml` |
| `RESOLVENET_OUTPUT` | 默认输出格式 | `json` |
| `RESOLVENET_VERBOSE` | 详细输出 | `true` |
| `LOG_LEVEL` | 日志级别 | `debug` |

---

## 使用示例

### 完整工作流程

```bash
# 1. 检查系统状态
resolvenet health

# 2. 安装技能
resolvenet skill install github.com/user/web-search

# 3. 创建知识库
resolvenet rag collection create product-docs --embedding-model bge-large-zh

# 4. 摄取文档
resolvenet rag ingest --collection product-docs --path ./docs/ --recursive

# 5. 创建工作流
resolvenet workflow create -f workflow.yaml

# 6. 创建 Agent
resolvenet agent create my-assistant \
  --type mega \
  --model qwen-plus \
  --skills web-search \
  --rag-collection product-docs

# 7. 运行 Agent
resolvenet agent run my-assistant

# 8. 查看日志
resolvenet agent logs my-assistant --follow
```

### 批量操作

```bash
# 批量导入技能
for skill in ./skills/*; do
  resolvenet skill install "$skill"
done

# 批量摄取文档
find ./docs -name "*.md" | xargs -I {} \
  resolvenet rag ingest --collection docs --path {}
```

---

## 相关文档

- [快速入门](./quickstart.md) - CLI 快速开始
- [配置参考](./configuration.md) - 配置选项详解
- [部署指南](./deployment.md) - 生产环境部署
