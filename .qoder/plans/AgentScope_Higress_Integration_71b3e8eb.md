# ResolveNet 到 ResolveAgent 全面重命名计划

## 概述

将项目中所有 "ResolveNet" / "resolvenet" / "resolve-net" 名称替换为 "ResolveAgent" / "resolveagent" / "resolve-agent"，确保命名一致性和品牌统一。

---

## Task 1: Go 模块路径重命名

**涉及文件**:
- `go.mod` - 模块声明 `github.com/ai-guru-global/resolve-net` -> `github.com/ai-guru-global/resolve-agent`
- 所有 `.go` 文件中的 import 语句

**具体修改**:
```
# go.mod
github.com/ai-guru-global/resolve-net -> github.com/ai-guru-global/resolve-agent

# 所有 Go 文件 import
"github.com/ai-guru-global/resolve-net/pkg/*" -> "github.com/ai-guru-global/resolve-agent/pkg/*"
```

**受影响文件**:
- `pkg/server/router.go`
- `pkg/server/server.go`
- `cmd/resolvenet-server/main.go`
- `cmd/resolvenet-cli/main.go`
- `internal/cli/root.go`
- `internal/cli/version.go`

---

## Task 2: Go 配置和 CLI 命名

**涉及修改**:

1. `pkg/config/config.go`:
   - `resolvenet` -> `resolveagent` (数据库名、用户名、密码、服务名)
   - `/etc/resolvenet` -> `/etc/resolveagent`
   - `$HOME/.resolvenet` -> `$HOME/.resolveagent`
   - `resolvenet-platform` -> `resolveagent-platform`

2. `internal/cli/root.go`:
   - CLI 名称 `Use: "resolvenet"` -> `Use: "resolveagent"`
   - 配置路径 `.resolvenet` -> `.resolveagent`

3. `internal/cli/serve.go`:
   - `resolvenet-server` -> `resolveagent-server`

4. `pkg/server/middleware/tracing.go`:
   - tracer 名称 `resolvenet` -> `resolveagent`

---

## Task 3: 命令行工具目录重命名

**目录变更**:
```
cmd/resolvenet-server/ -> cmd/resolveagent-server/
cmd/resolvenet-cli/ -> cmd/resolveagent-cli/
```

**注意**: 目录重命名后需要更新相关引用

---

## Task 4: Python 包重命名

**目录变更**:
```
python/src/resolvenet/ -> python/src/resolveagent/
```

**受影响的 import 语句** (所有 Python 文件):
```python
from resolvenet.* -> from resolveagent.*
import resolvenet.* -> import resolveagent.*
```

**pyproject.toml 修改**:
```toml
name = "resolvenet" -> name = "resolveagent"
description 中的 "ResolveNet" -> "ResolveAgent"
packages = ["src/resolvenet"] -> packages = ["src/resolveagent"]
email = "dev@resolvenet.io" -> "dev@resolveagent.io"
```

---

## Task 5: Protocol Buffers 重命名

**目录变更**:
```
api/proto/resolvenet/ -> api/proto/resolveagent/
```

**Proto 文件修改**:
```protobuf
package resolvenet.v1 -> package resolveagent.v1
option go_package = "github.com/ai-guru-global/resolve-net/pkg/api/resolvenet/v1;resolvenetv1"
    -> "github.com/ai-guru-global/resolve-agent/pkg/api/resolveagent/v1;resolveagentv1"
import "resolvenet/v1/*.proto" -> import "resolveagent/v1/*.proto"
```

**受影响文件**:
- `api/proto/resolvenet/v1/agent.proto`
- `api/proto/resolvenet/v1/common.proto`
- `api/proto/resolvenet/v1/platform.proto`
- `api/proto/resolvenet/v1/rag.proto`
- `api/proto/resolvenet/v1/selector.proto`
- `api/proto/resolvenet/v1/skill.proto`
- `api/proto/resolvenet/v1/workflow.proto`

**Buf 配置**:
- `tools/buf/buf.yaml`: `buf.build/ai-guru-global/resolvenet` -> `buf.build/ai-guru-global/resolveagent`

---

## Task 6: 配置文件重命名

**文件变更**:
```
configs/resolvenet.yaml -> configs/resolveagent.yaml
```

**文件内容更新** (`configs/resolveagent.yaml`):
- 数据库配置: user/password/dbname: `resolvenet` -> `resolveagent`
- 服务名: `resolvenet-platform` -> `resolveagent-platform`

---

## Task 7: Docker 和容器配置

**Dockerfile 修改**:

1. `deploy/docker/platform.Dockerfile`:
   - `/bin/resolvenet-server` -> `/bin/resolveagent-server`
   - `/etc/resolvenet/` -> `/etc/resolveagent/`
   - 用户名 `resolvenet` -> `resolveagent`
   - `./cmd/resolvenet-server` -> `./cmd/resolveagent-server`

2. `deploy/docker/runtime.Dockerfile`:
   - `/etc/resolvenet/` -> `/etc/resolveagent/`
   - 用户名 `resolvenet` -> `resolveagent`
   - `resolvenet.runtime.server` -> `resolveagent.runtime.server`

---

## Task 8: Docker Compose 配置

**修改文件**:
- `deploy/docker-compose/docker-compose.yaml`
- `deploy/docker-compose/docker-compose.dev.yaml`
- `deploy/docker-compose/docker-compose.deps.yaml`

**变更内容**:
- `POSTGRES_USER: resolvenet` -> `POSTGRES_USER: resolveagent`
- `POSTGRES_PASSWORD: resolvenet` -> `POSTGRES_PASSWORD: resolveagent`
- `POSTGRES_DB: resolvenet` -> `POSTGRES_DB: resolveagent`
- `./cmd/resolvenet-server` -> `./cmd/resolveagent-server`
- `resolvenet.runtime.server` -> `resolveagent.runtime.server`

---

## Task 9: Helm Charts 重命名

**目录变更**:
```
deploy/helm/resolvenet/ -> deploy/helm/resolveagent/
```

**模板函数重命名** (`_helpers.tpl`):
```
resolvenet.name -> resolveagent.name
resolvenet.chart -> resolveagent.chart
resolvenet.labels -> resolveagent.labels
resolvenet.platform.selectorLabels -> resolveagent.platform.selectorLabels
resolvenet.runtime.selectorLabels -> resolveagent.runtime.selectorLabels
app.kubernetes.io/part-of: resolvenet -> resolveagent
```

**其他 YAML 模板** (platform-*.yaml, runtime-*.yaml):
- 所有 `include "resolvenet.*"` -> `include "resolveagent.*"`

---

## Task 10: Skill 和 Workflow 配置

**修改文件**:
- `skills/registry.yaml`: 注释中的 `ResolveNet` -> `ResolveAgent`
- `skills/examples/hello-world/manifest.yaml`: author `ResolveNet` -> `ResolveAgent`
- `docs/demo/demo/skills/*/manifest.yaml`: author `ResolveNet Team` -> `ResolveAgent Team`
- `docs/demo/demo/agents/support-agent.yaml`: 中文描述中的 `ResolveNet` -> `ResolveAgent`
- `docs/demo/demo/workflows/incident-diagnosis.yaml`: author

---

## Task 11: Shell 脚本

**修改文件** (`hack/setup-dev.sh`):
```bash
$HOME/.resolvenet -> $HOME/.resolveagent
configs/resolvenet.yaml -> configs/resolveagent.yaml
~/.resolvenet/config.yaml -> ~/.resolveagent/config.yaml
```

---

## Task 12: 文档更新

**修改文件**:
- `README.md`
- `docs/zh/README.md`
- `docs/architecture/overview.md`
- 其他 `docs/` 目录下的文档

**替换内容**:
- `resolvenet-server` -> `resolveagent-server`
- `resolvenet-cli` -> `resolveagent-cli`
- `python/src/resolvenet/` -> `python/src/resolveagent/`
- `proto/resolvenet/` -> `proto/resolveagent/`
- `helm/resolvenet/` -> `helm/resolveagent/`
- `.resolvenet/` -> `.resolveagent/`
- `resolvenet.yaml` -> `resolveagent.yaml`
- CLI 命令示例: `resolvenet agent` -> `resolveagent agent`

---

## 执行顺序

1. Task 4: Python 包目录重命名 (最底层依赖)
2. Task 5: Proto 文件目录重命名
3. Task 3: Go cmd 目录重命名
4. Task 9: Helm charts 目录重命名
5. Task 6: 配置文件重命名
6. Task 1-2: Go 代码中的字符串替换
7. Task 4 (续): Python import 语句替换
8. Task 5 (续): Proto 文件内容替换
9. Task 7-8: Docker 配置替换
10. Task 9 (续): Helm 模板内容替换
11. Task 10-11: Skills/Scripts 替换
12. Task 12: 文档替换

---

## 命名规范总结

| 场景 | 旧名称 | 新名称 |
|------|--------|--------|
| Go 模块 | `github.com/ai-guru-global/resolve-net` | `github.com/ai-guru-global/resolve-agent` |
| Python 包 | `resolvenet` | `resolveagent` |
| Proto 包 | `resolvenet.v1` | `resolveagent.v1` |
| CLI 命令 | `resolvenet` | `resolveagent` |
| 服务器二进制 | `resolvenet-server` | `resolveagent-server` |
| 配置文件 | `resolvenet.yaml` | `resolveagent.yaml` |
| 数据库名 | `resolvenet` | `resolveagent` |
| 服务名 | `resolvenet-platform` | `resolveagent-platform` |
| Helm Chart | `resolvenet` | `resolveagent` |
| Docker 用户 | `resolvenet` | `resolveagent` |
| 品牌名 | `ResolveNet` | `ResolveAgent` |