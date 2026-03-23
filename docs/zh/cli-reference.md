# CLI 命令参考

ResolveAgent CLI 提供完整的命令行管理能力，涵盖 Agent、技能、工作流、RAG 和系统管理。

---

## 安装

CLI 工具随 ResolveAgent 一起安装：

```bash
# 从源码构建
make build

# 验证安装
resolveagent version
```

### 全局选项

所有命令支持以下全局选项：

| 选项 | 说明 | 示例 |
|------|------|------|
| `--config, -c` | 配置文件路径 | `--config ~/.resolveagent/config.yaml` |
| `--server` | 服务器地址 | `--server localhost:8080` |
| `--output, -o` | 输出格式 (json/yaml/table) | `-o json` |
| `--verbose, -v` | 详细输出 | `-v` |
| `--quiet, -q` | 静默模式 | `-q` |
| `--help, -h` | 显示帮助 | `-h` |

---

## Agent 管理

### resolveagent agent create

创建新的 Agent。

```bash
resolveagent agent create <name> [flags]

# 示例
resolveagent agent create my-assistant \
  --type mega \
  --model qwen-plus \
  --description "我的智能助手"

# 从配置文件创建
resolveagent agent create -f agent.yaml
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

### resolveagent agent list

列出所有 Agent。

```bash
resolveagent agent list [flags]

# 示例
resolveagent agent list
resolveagent agent list --type mega
resolveagent agent list -o json
```

**选项**:

| 选项 | 说明 |
|------|------|
| `--type` | 按类型过滤 |
| `--status` | 按状态过滤 (active/inactive) |
| `--limit` | 限制返回数量 |

### resolveagent agent describe

查看 Agent 详细信息。

```bash
resolveagent agent describe <name>

# 示例
resolveagent agent describe my-assistant
```

### resolveagent agent run

交互式运行 Agent。

```bash
resolveagent agent run <name> [flags]

# 交互模式
resolveagent agent run my-assistant

# 单次执行
resolveagent agent run my-assistant --input "你好"

# 从文件读取输入
resolveagent agent run my-assistant --input-file query.txt
```

**选项**:

| 选项 | 说明 |
|------|------|
| `--input, -i` | 输入文本 |
| `--input-file` | 从文件读取输入 |
| `--conversation` | 会话 ID（续接对话） |
| `--stream` | 流式输出 |

### resolveagent agent update

更新 Agent 配置。

```bash
resolveagent agent update <name> [flags]

# 示例
resolveagent agent update my-assistant --model qwen-max
resolveagent agent update my-assistant -f updated-config.yaml
```

### resolveagent agent delete

删除 Agent。

```bash
resolveagent agent delete <name> [flags]

# 示例
resolveagent agent delete my-assistant
resolveagent agent delete my-assistant --force
```

### resolveagent agent logs

查看 Agent 执行日志。

```bash
resolveagent agent logs <name> [flags]

# 示例
resolveagent agent logs my-assistant
resolveagent agent logs my-assistant --follow
resolveagent agent logs my-assistant --since 1h
```

---

## 技能管理

### resolveagent skill list

列出所有技能。

```bash
resolveagent skill list [flags]

# 示例
resolveagent skill list
resolveagent skill list --source builtin
resolveagent skill list -o json
```

### resolveagent skill info

查看技能详细信息。

```bash
resolveagent skill info <name>

# 示例
resolveagent skill info web-search
```

### resolveagent skill install

安装技能。

```bash
resolveagent skill install <source> [flags]

# 从本地目录
resolveagent skill install ./my-skill

# 从 Git 仓库
resolveagent skill install github.com/user/skill

# 从 Git 指定版本
resolveagent skill install github.com/user/skill@v1.0.0

# 从 OCI 镜像
resolveagent skill install oci://ghcr.io/org/skill:latest

# 从社区注册表
resolveagent skill install registry://web-search
```

**选项**:

| 选项 | 说明 |
|------|------|
| `--name` | 安装后的名称（覆盖清单名称） |
| `--force` | 强制重新安装 |

### resolveagent skill test

测试技能执行。

```bash
resolveagent skill test <name> [flags]

# 示例
resolveagent skill test web-search --input query="ResolveAgent"
resolveagent skill test web-search --input-file test-data.json
```

**选项**:

| 选项 | 说明 |
|------|------|
| `--input` | 输入参数 (key=value 格式) |
| `--input-file` | 从 JSON 文件读取输入 |
| `--timeout` | 执行超时 |

### resolveagent skill remove

移除技能。

```bash
resolveagent skill remove <name> [flags]

# 示例
resolveagent skill remove my-skill
resolveagent skill remove my-skill --force
```

### resolveagent skill init

初始化技能项目。

```bash
resolveagent skill init <name> [flags]

# 示例
resolveagent skill init my-skill
resolveagent skill init my-skill --template python
```

---

## 工作流管理

### resolveagent workflow create

创建工作流。

```bash
resolveagent workflow create <name> [flags]

# 从文件创建
resolveagent workflow create -f workflow.yaml

# 交互式创建
resolveagent workflow create --interactive
```

### resolveagent workflow list

列出所有工作流。

```bash
resolveagent workflow list [flags]

# 示例
resolveagent workflow list
resolveagent workflow list --status active
```

### resolveagent workflow describe

查看工作流详情。

```bash
resolveagent workflow describe <name>

# 示例
resolveagent workflow describe incident-diagnosis
```

### resolveagent workflow run

执行工作流。

```bash
resolveagent workflow run <name> [flags]

# 示例
resolveagent workflow run incident-diagnosis

# 带参数执行
resolveagent workflow run incident-diagnosis \
  --param log_source=/var/log/app \
  --param time_range=1h

# 从文件读取参数
resolveagent workflow run incident-diagnosis --param-file params.yaml
```

**选项**:

| 选项 | 说明 |
|------|------|
| `--param` | 执行参数 (key=value) |
| `--param-file` | 从文件读取参数 |
| `--async` | 异步执行 |
| `--wait` | 等待完成 |

### resolveagent workflow validate

验证工作流定义。

```bash
resolveagent workflow validate -f workflow.yaml

# 示例输出
✓ 工作流结构有效
✓ 所有事件引用正确
✓ 门逻辑完整
✓ 评估器配置正确
```

### resolveagent workflow visualize

可视化工作流（生成图形）。

```bash
resolveagent workflow visualize <name> [flags]

# 输出 ASCII 图
resolveagent workflow visualize incident-diagnosis

# 输出 Mermaid 图
resolveagent workflow visualize incident-diagnosis --format mermaid

# 输出到文件
resolveagent workflow visualize incident-diagnosis --format png -o workflow.png
```

### resolveagent workflow executions

查看工作流执行历史。

```bash
resolveagent workflow executions <name> [flags]

# 示例
resolveagent workflow executions incident-diagnosis
resolveagent workflow executions incident-diagnosis --limit 10
```

---

## RAG 管理

### resolveagent rag collection create

创建知识库集合。

```bash
resolveagent rag collection create <name> [flags]

# 示例
resolveagent rag collection create product-docs \
  --embedding-model bge-large-zh \
  --description "产品文档知识库"

# 从配置文件创建
resolveagent rag collection create -f collection.yaml
```

**选项**:

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `--embedding-model` | 嵌入模型 | bge-large-zh |
| `--description` | 描述 | - |
| `--chunking-strategy` | 分块策略 | semantic |
| `--chunk-size` | 分块大小 | 512 |
| `-f, --file` | 配置文件 | - |

### resolveagent rag collection list

列出所有知识库。

```bash
resolveagent rag collection list [flags]

# 示例
resolveagent rag collection list
resolveagent rag collection list -o json
```

### resolveagent rag collection info

查看知识库详情。

```bash
resolveagent rag collection info <name>

# 示例
resolveagent rag collection info product-docs
```

### resolveagent rag collection delete

删除知识库。

```bash
resolveagent rag collection delete <name> [flags]

# 示例
resolveagent rag collection delete product-docs
resolveagent rag collection delete product-docs --force
```

### resolveagent rag ingest

摄取文档到知识库。

```bash
resolveagent rag ingest --collection <name> --path <path> [flags]

# 摄取单个文件
resolveagent rag ingest --collection product-docs --path ./guide.pdf

# 摄取目录
resolveagent rag ingest --collection product-docs --path ./documents/

# 递归摄取
resolveagent rag ingest --collection product-docs \
  --path ./docs/ \
  --recursive

# 指定文件类型
resolveagent rag ingest --collection product-docs \
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

### resolveagent rag query

查询知识库。

```bash
resolveagent rag query --collection <name> --query <query> [flags]

# 示例
resolveagent rag query --collection product-docs \
  --query "如何配置认证"

# 带选项查询
resolveagent rag query --collection product-docs \
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

### resolveagent serve

启动服务。

```bash
resolveagent serve [flags]

# 启动平台服务
resolveagent serve

# 指定配置
resolveagent serve --config /path/to/config.yaml

# 指定端口
resolveagent serve --http-addr :8080 --grpc-addr :9090
```

### resolveagent dashboard

启动 TUI 仪表板。

```bash
resolveagent dashboard [flags]

# 示例
resolveagent dashboard
resolveagent dashboard --refresh 5s
```

### resolveagent health

检查系统健康状态。

```bash
resolveagent health [flags]

# 示例
resolveagent health
resolveagent health -o json

# 输出示例
STATUS: HEALTHY

Components:
  ✓ Platform API      healthy
  ✓ Agent Runtime     healthy
  ✓ PostgreSQL        healthy
  ✓ Redis             healthy
  ✓ NATS              healthy
```

### resolveagent config

管理配置。

```bash
# 查看当前配置
resolveagent config get

# 查看特定配置
resolveagent config get server.http_addr

# 设置配置
resolveagent config set server.http_addr ":8888"
```

### resolveagent version

显示版本信息。

```bash
resolveagent version

# 输出
ResolveAgent CLI v0.1.0
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
resolveagent completion bash > /etc/bash_completion.d/resolveagent

# 或临时启用
source <(resolveagent completion bash)
```

### Zsh

```bash
# 生成补全脚本
resolveagent completion zsh > "${fpath[1]}/_resolveagent"

# 或添加到 .zshrc
echo 'source <(resolveagent completion zsh)' >> ~/.zshrc
```

### Fish

```bash
resolveagent completion fish > ~/.config/fish/completions/resolveagent.fish
```

### PowerShell

```powershell
resolveagent completion powershell | Out-String | Invoke-Expression
```

---

## 环境变量

以下环境变量可以覆盖配置：

| 变量 | 说明 | 示例 |
|------|------|------|
| `RESOLVEAGENT_SERVER` | 服务器地址 | `localhost:8080` |
| `RESOLVEAGENT_CONFIG` | 配置文件路径 | `~/.resolveagent/config.yaml` |
| `RESOLVEAGENT_OUTPUT` | 默认输出格式 | `json` |
| `RESOLVEAGENT_VERBOSE` | 详细输出 | `true` |
| `LOG_LEVEL` | 日志级别 | `debug` |

---

## 使用示例

### 完整工作流程

```bash
# 1. 检查系统状态
resolveagent health

# 2. 安装技能
resolveagent skill install github.com/user/web-search

# 3. 创建知识库
resolveagent rag collection create product-docs --embedding-model bge-large-zh

# 4. 摄取文档
resolveagent rag ingest --collection product-docs --path ./docs/ --recursive

# 5. 创建工作流
resolveagent workflow create -f workflow.yaml

# 6. 创建 Agent
resolveagent agent create my-assistant \
  --type mega \
  --model qwen-plus \
  --skills web-search \
  --rag-collection product-docs

# 7. 运行 Agent
resolveagent agent run my-assistant

# 8. 查看日志
resolveagent agent logs my-assistant --follow
```

### 批量操作

```bash
# 批量导入技能
for skill in ./skills/*; do
  resolveagent skill install "$skill"
done

# 批量摄取文档
find ./docs -name "*.md" | xargs -I {} \
  resolveagent rag ingest --collection docs --path {}
```

---

## 相关文档

- [快速入门](./quickstart.md) - CLI 快速开始
- [配置参考](./configuration.md) - 配置选项详解
- [部署指南](./deployment.md) - 生产环境部署
