# P3 契约与数据闭环 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** solutionRegistry 落 Postgres（重启不丢数据）、OpenAPI 补全至与 router.go 95 条路由一致（契约测试把守）、README 撤下 proto/gRPC 业务面失实宣传。

**Architecture:** 契约以 `pkg/server/router.go` 的 95 条 `mux.HandleFunc` 注册为唯一事实源，新增源码扫描型 Go 测试做双向断言（router→OpenAPI 无缺漏、OpenAPI→router 无幻影）。Postgres 侧沿用既有 store 抽象（`pkg/store/postgres/workflow_store.go` 模式）与 `pkg/errors` sentinel 错误，迁移以内嵌 v16 追加到 `postgres.go` 的版本链；server.go 接线后内存实现保留为无 DB 默认。

**Tech Stack:** Go 1.25（CI 同源）、pgx/v5、gopkg.in/yaml.v3、Postgres 16（docker 本地验证 + CI e2e service）。

**工具链注意（继承 P2 结论）:** 本地跑 Go 测试/lint 用 `PATH="/Users/allengaller/go/bin:$PATH"`（golangci v1.64）；quality-gate.sh 自钉 `GOTOOLCHAIN=go1.25.6`。

---

### Task 1: OpenAPI 契约测试（TDD 先红）

**Files:**
- Create: `pkg/server/openapi_contract_test.go`
- 参考（不改）: `pkg/server/router.go`、`api/openapi/v1/resolveagent.yaml`

- [ ] **Step 1.1: 写契约测试**

```go
package server

import (
	"os"
	"regexp"
	"slices"
	"strings"
	"testing"

	"gopkg.in/yaml.v3"
)

// routeRe 从 router.go 源码提取 "METHOD /path" 注册项，作为 API 契约唯一事实源。
// 若 router.go 的注册写法变化（如改用 helper 函数），本测试会以 0 匹配失败，防止静默失守。
var routeRe = regexp.MustCompile(`mux\.HandleFunc\("([A-Z]+) (/[^"]*)"`)

func routerRoutes(t *testing.T) []string {
	t.Helper()
	src, err := os.ReadFile("router.go")
	if err != nil {
		t.Fatalf("read router.go: %v", err)
	}
	var routes []string
	for _, m := range routeRe.FindAllStringSubmatch(string(src), -1) {
		routes = append(routes, m[1]+" "+m[2])
	}
	if len(routes) == 0 {
		t.Fatal("no routes parsed from router.go — 注册写法变更需同步本测试")
	}
	return routes
}

func openapiOperations(t *testing.T) map[string]bool {
	t.Helper()
	data, err := os.ReadFile("../../api/openapi/v1/resolveagent.yaml")
	if err != nil {
		t.Fatalf("read openapi yaml: %v", err)
	}
	var doc struct {
		Paths map[string]map[string]yaml.Node `yaml:"paths"`
	}
	if err := yaml.Unmarshal(data, &doc); err != nil {
		t.Fatalf("parse openapi yaml: %v", err)
	}
	ops := map[string]bool{}
	for path, item := range doc.Paths {
		for method := range item {
			m := strings.ToUpper(method)
			switch m {
			case "GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS":
				ops[m+" "+path] = true
			}
		}
	}
	return ops
}

// TestOpenAPICoversAllRoutes: router 的每条注册都必须在 OpenAPI 中有对应操作。
func TestOpenAPICoversAllRoutes(t *testing.T) {
	ops := openapiOperations(t)
	for _, r := range routerRoutes(t) {
		if !ops[r] {
			t.Errorf("router 路由未进 OpenAPI: %s", r)
		}
	}
}

// TestOpenAPIHasNoPhantomOperations: OpenAPI 中不得存在 router 没有的幻影操作。
func TestOpenAPIHasNoPhantomOperations(t *testing.T) {
	routes := routerRoutes(t)
	for op := range openapiOperations(t) {
		if !slices.Contains(routes, op) {
			t.Errorf("OpenAPI 幻影操作（router 不存在）: %s", op)
		}
	}
}

// TestOpenAPIRouteCountParity: 钉住注册总数，正则失配或路由增删都会在此暴露。
func TestOpenAPIRouteCountParity(t *testing.T) {
	if got := len(routerRoutes(t)); got != 95 {
		t.Errorf("router 注册路由数应为 95，实测 %d", got)
	}
}
```

- [ ] **Step 1.2: 跑测试确认先红**

Run: `cd /Users/allengaller/Documents/GitHub/ai-guru-global/resolve-agent && go test ./pkg/server/ -run TestOpenAPI -v 2>&1 | tail -20`
Expected: FAIL——`TestOpenAPICoversAllRoutes` 报大量 "未进 OpenAPI"；`TestOpenAPIHasNoPhantomOperations` 报 `/readyz GET` 幻影与不匹配的 agents/{id}；`TestOpenAPIRouteCountParity` PASS（95）。

- [ ] **Step 1.3: Commit**

```bash
cd /Users/allengaller/Documents/GitHub/ai-guru-global/resolve-agent
git add pkg/server/openapi_contract_test.go
git commit -m "test(api): OpenAPI 契约测试先红——router.go 95 条注册为契约唯一事实源，双向断言防缺漏/防幻影"
```

---

### Task 2: 枚举脚本 + OpenAPI 补全至 95 条

**Files:**
- Create: `hack/openapi-routes.sh`
- Rewrite: `api/openapi/v1/resolveagent.yaml`

- [ ] **Step 2.1: 写枚举脚本（spec 要求的路由清单辅助核对工具）**

```bash
#!/usr/bin/env bash
# 枚举 router.go 注册的 REST 路由，辅助 OpenAPI 人工核对与补全。
# 真正的契约把关在 pkg/server/openapi_contract_test.go，本脚本只做人工核对辅助。
set -euo pipefail
grep -oE '"(GET|POST|PUT|DELETE|PATCH) /[^"]*"' pkg/server/router.go | tr -d '"' | sort
```

```bash
chmod +x hack/openapi-routes.sh
bash hack/openapi-routes.sh | wc -l   # 预期 95
```

- [ ] **Step 2.2: 重写 resolveagent.yaml**

结构规则（全部 95 条操作按同一模板产出）：
- 删除幻影 `/readyz`；`/healthz` 保留；`GET /api/v1/agents/{id}` 保留（这是真实路由）。
- `info.version` 保持 "0.3.0"；`tags` 补齐下表全部 17 个域。
- 每个操作块最小模板（无 path/query 参数的块省略 parameters）：

```yaml
  /api/v1/{resource}:
    get:
      tags: [{Tag}]
      summary: {Summary}
      operationId: {OperationId}
      responses:
        "200":
          description: {Description}
```

- 已含 $ref schema 的既有块（agents get/list）保持原样，其余按模板精简描述即可——契约测试只断言 METHOD+PATH 覆盖，schema 细节不阻断。
- 完整映射表（95 行 = 事实源转写自 router.go，按域分组）：

| # | METHOD | Path | Tag | Summary | operationId | Parameters |
|---|--------|------|-----|---------|-------------|------------|
| 1 | GET | /healthz | Health | Liveness probe | getLiveness | - |
| 2 | GET | /api/v1/health | Health | Health check | getHealth | - |
| 3 | GET | /api/v1/system/info | System | System information | getSystemInfo | - |
| 4 | GET | /api/v1/agents | Agents | List agents | listAgents | query: type,status,limit,offset |
| 5 | POST | /api/v1/agents | Agents | Create agent | createAgent | body: AgentDefinition |
| 6 | GET | /api/v1/agents/{id} | Agents | Get agent by ID | getAgent | path: id |
| 7 | PUT | /api/v1/agents/{id} | Agents | Update agent | updateAgent | path: id |
| 8 | DELETE | /api/v1/agents/{id} | Agents | Delete agent | deleteAgent | path: id |
| 9 | POST | /api/v1/agents/{id}/execute | Agents | Execute agent | executeAgent | path: id |
| 10 | GET | /api/v1/skills | Skills | List skills | listSkills | - |
| 11 | POST | /api/v1/skills | Skills | Register skill | registerSkill | body: SkillDefinition |
| 12 | GET | /api/v1/skills/{name} | Skills | Get skill by name | getSkill | path: name |
| 13 | DELETE | /api/v1/skills/{name} | Skills | Unregister skill | unregisterSkill | path: name |
| 14 | GET | /api/v1/workflows | Workflows | List workflows | listWorkflows | - |
| 15 | POST | /api/v1/workflows | Workflows | Create workflow | createWorkflow | body: WorkflowDefinition |
| 16 | GET | /api/v1/workflows/{id} | Workflows | Get workflow by ID | getWorkflow | path: id |
| 17 | PUT | /api/v1/workflows/{id} | Workflows | Update workflow | updateWorkflow | path: id |
| 18 | DELETE | /api/v1/workflows/{id} | Workflows | Delete workflow | deleteWorkflow | path: id |
| 19 | POST | /api/v1/workflows/{id}/validate | Workflows | Validate workflow | validateWorkflow | path: id |
| 20 | POST | /api/v1/workflows/{id}/execute | Workflows | Execute workflow | executeWorkflow | path: id |
| 21 | GET | /api/v1/rag/collections | RAG | List collections | listCollections | - |
| 22 | POST | /api/v1/rag/collections | RAG | Create collection | createCollection | body: Collection |
| 23 | DELETE | /api/v1/rag/collections/{id} | RAG | Delete collection | deleteCollection | path: id |
| 24 | POST | /api/v1/rag/collections/{id}/ingest | RAG | Ingest documents | ingestDocuments | path: id |
| 25 | POST | /api/v1/rag/collections/{id}/query | RAG | Query collection | queryCollection | path: id |
| 26 | GET | /api/v1/rag/collections/{id}/documents | RAG | List collection documents | listRAGDocuments | path: id |
| 27 | POST | /api/v1/rag/collections/{id}/documents | RAG | Create document | createRAGDocument | path: id |
| 28 | GET | /api/v1/rag/documents/{id} | RAG | Get document by ID | getRAGDocument | path: id |
| 29 | PUT | /api/v1/rag/documents/{id} | RAG | Update document | updateRAGDocument | path: id |
| 30 | DELETE | /api/v1/rag/documents/{id} | RAG | Delete document | deleteRAGDocument | path: id |
| 31 | GET | /api/v1/rag/collections/{id}/ingestions | RAG | List ingestion history | listRAGIngestions | path: id |
| 32 | GET | /api/v1/models | Models | List model routes | listModels | - |
| 33 | POST | /api/v1/models | Models | Add model route | addModel | body: ModelRoute |
| 34 | GET | /api/v1/config | Config | Get runtime config | getConfig | - |
| 35 | PUT | /api/v1/config | Config | Update runtime config | updateConfig | body: Config |
| 36 | GET | /api/v1/hooks | Hooks | List hooks | listHooks | - |
| 37 | POST | /api/v1/hooks | Hooks | Create hook | createHook | body: Hook |
| 38 | GET | /api/v1/hooks/{id} | Hooks | Get hook by ID | getHook | path: id |
| 39 | PUT | /api/v1/hooks/{id} | Hooks | Update hook | updateHook | path: id |
| 40 | DELETE | /api/v1/hooks/{id} | Hooks | Delete hook | deleteHook | path: id |
| 41 | GET | /api/v1/hooks/{id}/executions | Hooks | List hook executions | listHookExecutions | path: id |
| 42 | GET | /api/v1/fta/documents | FTA | List FTA documents | listFTADocuments | - |
| 43 | POST | /api/v1/fta/documents | FTA | Create FTA document | createFTADocument | body: FTADocument |
| 44 | GET | /api/v1/fta/documents/{id} | FTA | Get FTA document by ID | getFTADocument | path: id |
| 45 | PUT | /api/v1/fta/documents/{id} | FTA | Update FTA document | updateFTADocument | path: id |
| 46 | DELETE | /api/v1/fta/documents/{id} | FTA | Delete FTA document | deleteFTADocument | path: id |
| 47 | GET | /api/v1/fta/documents/{id}/results | FTA | List FTA analysis results | listFTAResults | path: id |
| 48 | POST | /api/v1/fta/documents/{id}/results | FTA | Create FTA analysis result | createFTAResult | path: id |
| 49 | GET | /api/v1/analyses | Code Analysis | List code analyses | listAnalyses | - |
| 50 | POST | /api/v1/analyses | Code Analysis | Create code analysis | createAnalysis | body: Analysis |
| 51 | GET | /api/v1/analyses/{id} | Code Analysis | Get analysis by ID | getAnalysis | path: id |
| 52 | PUT | /api/v1/analyses/{id} | Code Analysis | Update analysis | updateAnalysis | path: id |
| 53 | DELETE | /api/v1/analyses/{id} | Code Analysis | Delete analysis | deleteAnalysis | path: id |
| 54 | GET | /api/v1/analyses/{id}/findings | Code Analysis | List findings | listFindings | path: id |
| 55 | POST | /api/v1/analyses/{id}/findings | Code Analysis | Add findings | addFindings | path: id |
| 56 | POST | /api/v1/corpus/import | Corpus | Import corpus | importCorpus | body: ImportRequest |
| 57 | GET | /api/v1/memory/agents/{agent_id}/conversations | Memory | List agent conversations | listConversations | path: agent_id |
| 58 | GET | /api/v1/memory/conversations/{id} | Memory | Get conversation | getConversation | path: id |
| 59 | POST | /api/v1/memory/conversations/{id}/messages | Memory | Add message | addMessage | path: id |
| 60 | DELETE | /api/v1/memory/conversations/{id} | Memory | Delete conversation | deleteConversation | path: id |
| 61 | GET | /api/v1/memory/agents/{agent_id}/long-term | Memory | Search long-term memory | searchLongTermMemory | path: agent_id, query: query |
| 62 | POST | /api/v1/memory/long-term | Memory | Store long-term memory | storeLongTermMemory | body: LongTermMemory |
| 63 | GET | /api/v1/memory/long-term/{id} | Memory | Get long-term memory | getLongTermMemory | path: id |
| 64 | PUT | /api/v1/memory/long-term/{id} | Memory | Update long-term memory | updateLongTermMemory | path: id |
| 65 | DELETE | /api/v1/memory/long-term/{id} | Memory | Delete long-term memory | deleteLongTermMemory | path: id |
| 66 | POST | /api/v1/memory/prune | Memory | Prune memories | pruneMemories | body: PruneOptions |
| 67 | GET | /api/v1/solutions | Solutions | List solutions | listSolutions | query: domain,severity,status,limit,offset |
| 68 | POST | /api/v1/solutions | Solutions | Create solution | createSolution | body: TroubleshootingSolution |
| 69 | GET | /api/v1/solutions/{id} | Solutions | Get solution by ID | getSolution | path: id |
| 70 | PUT | /api/v1/solutions/{id} | Solutions | Update solution | updateSolution | path: id |
| 71 | DELETE | /api/v1/solutions/{id} | Solutions | Delete solution | deleteSolution | path: id |
| 72 | POST | /api/v1/solutions/search | Solutions | Search solutions | searchSolutions | body/query: domain,component,severity,status,tags,keyword |
| 73 | POST | /api/v1/solutions/bulk | Solutions | Bulk create solutions | bulkCreateSolutions | body: Solution[] |
| 74 | GET | /api/v1/solutions/{id}/executions | Solutions | List solution executions | listSolutionExecutions | path: id |
| 75 | POST | /api/v1/solutions/{id}/executions | Solutions | Record solution execution | recordSolutionExecution | path: id |
| 76 | GET | /api/v1/call-graphs | Call Graphs | List call graphs | listCallGraphs | - |
| 77 | POST | /api/v1/call-graphs | Call Graphs | Create call graph | createCallGraph | body: CallGraph |
| 78 | GET | /api/v1/call-graphs/{id} | Call Graphs | Get call graph by ID | getCallGraph | path: id |
| 79 | DELETE | /api/v1/call-graphs/{id} | Call Graphs | Delete call graph | deleteCallGraph | path: id |
| 80 | GET | /api/v1/call-graphs/{id}/nodes | Call Graphs | List graph nodes | listCallGraphNodes | path: id |
| 81 | GET | /api/v1/call-graphs/{id}/edges | Call Graphs | List graph edges | listCallGraphEdges | path: id |
| 82 | GET | /api/v1/call-graphs/{id}/subgraph | Call Graphs | Get subgraph | getCallGraphSubgraph | path: id |
| 83 | GET | /api/v1/traffic/captures | Traffic Captures | List traffic captures | listTrafficCaptures | - |
| 84 | POST | /api/v1/traffic/captures | Traffic Captures | Create traffic capture | createTrafficCapture | body: TrafficCapture |
| 85 | GET | /api/v1/traffic/captures/{id} | Traffic Captures | Get capture by ID | getTrafficCapture | path: id |
| 86 | PUT | /api/v1/traffic/captures/{id} | Traffic Captures | Update capture | updateTrafficCapture | path: id |
| 87 | DELETE | /api/v1/traffic/captures/{id} | Traffic Captures | Delete capture | deleteTrafficCapture | path: id |
| 88 | POST | /api/v1/traffic/captures/{id}/records | Traffic Captures | Add traffic records | addTrafficRecords | path: id |
| 89 | GET | /api/v1/traffic/captures/{id}/records | Traffic Captures | List traffic records | listTrafficRecords | path: id |
| 90 | GET | /api/v1/traffic/graphs | Traffic Graphs | List traffic graphs | listTrafficGraphs | - |
| 91 | POST | /api/v1/traffic/graphs | Traffic Graphs | Create traffic graph | createTrafficGraph | body: TrafficGraph |
| 92 | GET | /api/v1/traffic/graphs/{id} | Traffic Graphs | Get graph by ID | getTrafficGraph | path: id |
| 93 | PUT | /api/v1/traffic/graphs/{id} | Traffic Graphs | Update graph | updateTrafficGraph | path: id |
| 94 | DELETE | /api/v1/traffic/graphs/{id} | Traffic Graphs | Delete graph | deleteTrafficGraph | path: id |
| 95 | POST | /api/v1/traffic/graphs/{id}/analyze | Traffic Graphs | Analyze traffic graph | analyzeTrafficGraph | path: id |

tags 区块补齐（加在既有 tags 之后）：

```yaml
  - name: System
    description: System information
  - name: Config
    description: Runtime configuration
  - name: RAG
    description: Retrieval-augmented collections and documents
  - name: Hooks
    description: Lifecycle hooks and executions
  - name: FTA
    description: Fault tree analysis documents and results
  - name: Code Analysis
    description: Code analysis jobs and findings
  - name: Corpus
    description: Corpus import
  - name: Memory
    description: Conversation and long-term memory
  - name: Solutions
    description: Troubleshooting solutions and executions
  - name: Call Graphs
    description: Call graph capture and traversal
  - name: Traffic Captures
    description: Traffic capture management
  - name: Traffic Graphs
    description: Service dependency graphs
```

- [ ] **Step 2.3: 跑契约测试确认转绿**

Run: `go test ./pkg/server/ -run TestOpenAPI -v 2>&1 | tail -8`
Expected: 3 个测试全 PASS。若有 "未进 OpenAPI" 残留，逐条对照映射表补块。

- [ ] **Step 2.4: 核对脚本与表一致**

Run: `bash hack/openapi-routes.sh | sort > /tmp/routes.txt && diff <(grep -c . /tmp/routes.txt | cat) <(echo 95) && echo ROUTES_OK`
Expected: `ROUTES_OK`。

- [ ] **Step 2.5: Commit**

```bash
cd /Users/allengaller/Documents/GitHub/ai-guru-global/resolve-agent
git add api/openapi/v1/resolveagent.yaml hack/openapi-routes.sh
git commit -m "docs(api): OpenAPI 补全至 95 条操作与 router 一致——删 /readyz 幻影，17 域 tags 全覆盖，枚举脚本辅助人工核对"
```

---

### Task 3: README 撤下 proto/gRPC 业务面宣传

**Files:**
- Modify: `README.md:248,272,669,1010,1030`（保留 `api/proto/` 文件本体；1162 行为 v0.1.0 历史记录不改）

- [ ] **Step 3.1: 五处精确替换**

1. L248（ASCII 架构图连线标注，保持框宽）：
   - old: `│                                                      │ HTTP/SSE + gRPC    │`
   - new: `│                                                      │ HTTP/SSE           │`（"HTTP/SSE" 8 字符 + 11 空格 = 原 "HTTP/SSE + gRPC" 15 字符 + 4 空格，总宽不变）

2. L272：
   - old: `三者经 HTTP/SSE + gRPC 互联。`
   - new: `三者经 HTTP/SSE 互联。`

3. L669：
   - old: `| gRPC | localhost:9090 | Platform gRPC 接口 |`
   - new: `| gRPC | localhost:9090 | Platform gRPC 服务（仅健康检查与反射；业务 API 走 REST） |`

4. L1010（项目结构树，整行删除）：
   - old:
     ```
     │   ├── proto/resolveagent/v1/   # Protocol Buffers
     ```
   - new: （删除该行；`api/` 下保留 openapi 与 jsonschema 两行）

5. L1030：
   - old: `│   ├── server/                  # HTTP/gRPC 服务 + writeRegistryError 统一错误出口`
   - new: `│   ├── server/                  # HTTP 服务（gRPC 仅健康/反射）+ writeRegistryError 统一错误出口`

- [ ] **Step 3.2: 验证无失实宣传残留**

Run: `grep -n "proto\|gRPC" README.md`
Expected: 仅剩真实存在的引用——L669（已改述为健康/反射）、L1030（已改述）、L1162（v0.1.0 历史记录）、以及 MCP 等第三方链接里不含业务面宣传。`api/proto/` 目录保持原样（`ls api/proto/resolveagent` 有文件）。

- [ ] **Step 3.3: Commit**

```bash
cd /Users/allengaller/Documents/GitHub/ai-guru-global/resolve-agent
git add README.md
git commit -m "docs(readme): 撤下 proto/gRPC 业务面失实宣传——互联仅 HTTP/SSE，9090 为健康/反射，api/proto 文件保留待真实需求"
```

---

### Task 4: 迁移 v16——solutions 表

**Files:**
- Modify: `pkg/store/postgres/postgres.go`（migrations 切片末尾追加 version 16）

- [ ] **Step 4.1: 追加迁移块**

在最后一个 `},`（version 15 的闭括号）之后、切片闭括号 `}` 之前插入：

```go
		{
			version: 16,
			sql: `
				CREATE TABLE IF NOT EXISTS solutions (
					id VARCHAR(64) PRIMARY KEY,
					title VARCHAR(500) NOT NULL,
					problem_symptoms TEXT DEFAULT '',
					key_information TEXT DEFAULT '',
					troubleshooting_steps TEXT DEFAULT '',
					resolution_steps TEXT DEFAULT '',
					domain VARCHAR(100) DEFAULT '',
					component VARCHAR(255) DEFAULT '',
					severity VARCHAR(50) DEFAULT '',
					tags JSONB DEFAULT '[]',
					search_keywords TEXT DEFAULT '',
					version INTEGER DEFAULT 1,
					status VARCHAR(50) DEFAULT 'active',
					source_uri TEXT DEFAULT '',
					rag_collection_id VARCHAR(64) DEFAULT '',
					rag_document_id VARCHAR(64) DEFAULT '',
					related_skill_names JSONB DEFAULT '[]',
					related_workflow_ids JSONB DEFAULT '[]',
					metadata JSONB DEFAULT '{}',
					created_by VARCHAR(255) DEFAULT '',
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				);
				CREATE TABLE IF NOT EXISTS solution_executions (
					id VARCHAR(64) PRIMARY KEY,
					solution_id VARCHAR(64) NOT NULL,
					executor VARCHAR(255) DEFAULT '',
					trigger_context JSONB DEFAULT '{}',
					status VARCHAR(50) DEFAULT '',
					outcome_notes TEXT DEFAULT '',
					effectiveness_score DOUBLE PRECISION DEFAULT 0,
					duration_ms INTEGER DEFAULT 0,
					started_at TIMESTAMP,
					completed_at TIMESTAMP,
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				);
				CREATE INDEX IF NOT EXISTS idx_solutions_domain ON solutions(domain);
				CREATE INDEX IF NOT EXISTS idx_solutions_status ON solutions(status);
				CREATE INDEX IF NOT EXISTS idx_solutions_severity ON solutions(severity);
				CREATE INDEX IF NOT EXISTS idx_solution_executions_solution_id ON solution_executions(solution_id)
			`,
		},
```

- [ ] **Step 4.2: 编译验证**

Run: `go build ./pkg/store/... && go vet ./pkg/store/...`
Expected: 无输出（成功）。

- [ ] **Step 4.3: Commit**

```bash
cd /Users/allengaller/Documents/GitHub/ai-guru-global/resolve-agent
git add pkg/store/postgres/postgres.go
git commit -m "feat(store): 迁移 v16——solutions/solution_executions 表，为 solutionRegistry 落 Postgres 铺路"
```

---

### Task 5: solution store 实现（TDD）

**Files:**
- Create: `pkg/store/postgres/solution_store.go`
- Modify: `pkg/store/postgres/registry_test.go`（追加测试）
- 参考: `pkg/registry/solution.go`（接口与内存语义）、`pkg/store/postgres/workflow_store.go`（实现模式）

- [ ] **Step 5.1: 写失败测试**

在 `pkg/store/postgres/registry_test.go` 末尾追加（沿用 mustOpenStore 的 skip-无-DB 模式；"重启不丢数据" 用第二个独立 Store 连接验证）。

import 块需新增 `"fmt"` 与 `"time"`（`errors`/`os`/`slog` 等既有导入不动；registry_test.go 现以裸名导入 `pkg/errors`，`errors.Is` 即该包转发到 stdlib 的别名，与既有 sentinel 断言写法一致）：

```go
func TestPostgresSolutionRegistry(t *testing.T) {
	store := mustOpenStore(t)
	r := NewSolutionRegistry(store)
	ctx := context.Background()

	solution := &registry.TroubleshootingSolution{
		ID:                   "sol-1",
		Title:                "Pod CrashLoopBackOff 排查",
		ProblemSymptoms:      "Pod 反复重启，BackOff 事件",
		KeyInformation:       "kubectl describe pod",
		TroubleshootingSteps: "1. describe 2. logs",
		ResolutionSteps:      "修正镜像 tag",
		Domain:               "kubernetes",
		Component:            "pod",
		Severity:             "high",
		Tags:                 []string{"k8s", "crashloop"},
		SearchKeywords:       "crashloopbackoff restart",
		Status:               "active",
		SourceURI:            "https://k8s.io/docs",
		RelatedSkillNames:    []string{"k8s-log-analysis"},
		RelatedWorkflowIDs:   []string{"wf-1"},
		Metadata:             map[string]any{"origin": "test"},
		CreatedBy:            "tester",
	}

	// Create + 时间戳/版本由 store 兜底
	if err := r.Create(ctx, solution); err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if solution.CreatedAt.IsZero() || solution.UpdatedAt.IsZero() {
		t.Fatal("Create should stamp CreatedAt/UpdatedAt")
	}
	if solution.Version != 1 {
		t.Fatalf("expected Version 1, got %d", solution.Version)
	}

	// 重复 Create 拒绝（比对 sentinel 常量——AlreadyExists() 构造函数每次返回新实例，
	// errors.Is 只能沿 err 链匹配包装的 sentinel，不能用构造结果当 target）
	if err := r.Create(ctx, solution); !errors.Is(err, errors.ErrAlreadyExists) {
		t.Fatalf("duplicate Create should return ErrAlreadyExists, got %v", err)
	}

	// Get 回读全字段
	got, err := r.Get(ctx, "sol-1")
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if got.Title != solution.Title || got.Domain != "kubernetes" || got.Severity != "high" {
		t.Fatalf("Get roundtrip mismatch: %+v", got)
	}
	if len(got.Tags) != 2 || got.Tags[0] != "k8s" {
		t.Fatalf("Tags roundtrip mismatch: %v", got.Tags)
	}
	if len(got.RelatedSkillNames) != 1 || got.RelatedSkillNames[0] != "k8s-log-analysis" {
		t.Fatalf("RelatedSkillNames roundtrip mismatch: %v", got.RelatedSkillNames)
	}
	if got.Metadata["origin"] != "test" {
		t.Fatalf("Metadata roundtrip mismatch: %v", got.Metadata)
	}

	// NotFound（比对 sentinel 常量，理由同上）
	if _, err := r.Get(ctx, "sol-missing"); !errors.Is(err, errors.ErrNotFound) {
		t.Fatalf("Get missing should return ErrNotFound, got %v", err)
	}

	// List + status 过滤 + 分页
	for i := 2; i <= 4; i++ {
		s := &registry.TroubleshootingSolution{
			ID:              fmt.Sprintf("sol-%d", i),
			Title:           fmt.Sprintf("Solution %d", i),
			ProblemSymptoms: "symptom",
			Severity:        "low",
			Status:          "draft",
		}
		if err := r.Create(ctx, s); err != nil {
			t.Fatalf("Create sol-%d failed: %v", i, err)
		}
	}
	items, total, err := r.List(ctx, registry.ListOptions{Limit: 2, Offset: 0})
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if total != 4 || len(items) != 2 {
		t.Fatalf("List want total=4 len=2, got total=%d len=%d", total, len(items))
	}
	draftOnly, total, err := r.List(ctx, registry.ListOptions{Filter: map[string]string{"status": "draft"}})
	if err != nil {
		t.Fatalf("List filter failed: %v", err)
	}
	if total != 3 || len(draftOnly) != 3 {
		t.Fatalf("List status=draft want 3, got total=%d len=%d", total, len(draftOnly))
	}

	// Search：keyword + domain + severity 组合过滤
	found, total, err := r.Search(ctx, &registry.SolutionSearchOptions{
		Domain:  "kubernetes",
		Keyword: "CRASHLOOPBACKOFF", // 大写也要命中（大小写不敏感）
	})
	if err != nil {
		t.Fatalf("Search failed: %v", err)
	}
	if total != 1 || len(found) != 1 || found[0].ID != "sol-1" {
		t.Fatalf("Search want sol-1 only, got total=%d items=%v", total, found)
	}

	// Update
	solution.Title = "Pod CrashLoopBackOff 排查（修订）"
	if err := r.Update(ctx, solution); err != nil {
		t.Fatalf("Update failed: %v", err)
	}
	if got, _ := r.Get(ctx, "sol-1"); got.Title != solution.Title {
		t.Fatal("Update not persisted")
	}
	missing := &registry.TroubleshootingSolution{ID: "sol-none", Title: "x"}
	if err := r.Update(ctx, missing); !errors.Is(err, errors.ErrNotFound) {
		t.Fatalf("Update missing should ErrNotFound, got %v", err)
	}

	// RecordExecution + ListExecutions
	if err := r.RecordExecution(ctx, &registry.SolutionExecution{
		ID:         "exec-1",
		SolutionID: "sol-1",
		Status:     "completed",
		StartedAt:  time.Now(),
	}); err != nil {
		t.Fatalf("RecordExecution failed: %v", err)
	}
	execs, total, err := r.ListExecutions(ctx, "sol-1", registry.ListOptions{})
	if err != nil {
		t.Fatalf("ListExecutions failed: %v", err)
	}
	if total != 1 || len(execs) != 1 || execs[0].ID != "exec-1" {
		t.Fatalf("ListExecutions want exec-1, got total=%d items=%v", total, execs)
	}

	// Delete 级联清执行记录
	if err := r.Delete(ctx, "sol-1"); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}
	if _, total, _ := r.ListExecutions(ctx, "sol-1", registry.ListOptions{}); total != 0 {
		t.Fatal("Delete should cascade executions")
	}

	// BulkCreate：跳过已存在，返回新增数
	bulk := []*registry.TroubleshootingSolution{
		{ID: "sol-2", Title: "dup", ProblemSymptoms: "s"}, // 已存在
		{ID: "sol-5", Title: "new", ProblemSymptoms: "s"},
	}
	created, err := r.BulkCreate(ctx, bulk)
	if err != nil {
		t.Fatalf("BulkCreate failed: %v", err)
	}
	if created != 1 {
		t.Fatalf("BulkCreate want 1, got %d", created)
	}

	// 重启不丢数据：另开一个独立连接，数据仍然可读
	store2, err := New(dsnFromEnv(), testLogger())
	if err != nil {
		t.Fatalf("reopen store: %v", err)
	}
	defer func() { _ = store2.Close() }()
	if got, err := NewSolutionRegistry(store2).Get(ctx, "sol-5"); err != nil || got.Title != "new" {
		t.Fatalf("restart persistence broken: got=%+v err=%v", got, err)
	}
}
```

同时把 `mustOpenStore` 的 DSN 选择逻辑抽成两个小 helper（放在 registry_test.go 顶部，供重开连接复用）：

```go
func dsnFromEnv() string {
	if dsn := os.Getenv("RESOLVEAGENT_TEST_DSN"); dsn != "" {
		return dsn
	}
	return "postgres://resolveagent:resolveagent@localhost:5432/resolveagent_test?sslmode=disable"
}

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelWarn}))
}
```

并把 `mustOpenStore` 改为调用这两个 helper（行为不变）：

```go
func mustOpenStore(t *testing.T) *Store {
	t.Helper()
	store, err := New(dsnFromEnv(), testLogger())
	if err != nil {
		t.Skipf("PostgreSQL not available: %v", err)
	}
	if err := store.Migrate(context.Background()); err != nil {
		_ = store.Close()
		t.Fatalf("Failed to migrate: %v", err)
	}
	t.Cleanup(func() { _ = store.Close() })
	return store
}
```

- [ ] **Step 5.2: 编译失败确认（NewSolutionRegistry 未定义）**

Run: `go vet ./pkg/store/postgres/ 2>&1 | head -5`
Expected: `undefined: NewSolutionRegistry`。

- [ ] **Step 5.3: 实现 solution_store.go**

```go
package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	pkgerrors "github.com/ai-guru-global/resolve-agent/pkg/errors"
	"github.com/ai-guru-global/resolve-agent/pkg/registry"
	"github.com/jackc/pgx/v5"
)

// 编译期接口断言。
var _ registry.TroubleshootingSolutionRegistry = (*SolutionRegistry)(nil)

// SolutionRegistry implements registry.TroubleshootingSolutionRegistry using PostgreSQL.
type SolutionRegistry struct {
	store *Store
}

// NewSolutionRegistry creates a new PostgreSQL-backed solution registry.
func NewSolutionRegistry(store *Store) *SolutionRegistry {
	return &SolutionRegistry{store: store}
}

const solutionColumns = `id, title, problem_symptoms, key_information, troubleshooting_steps,
	resolution_steps, domain, component, severity, tags, search_keywords, version, status,
	source_uri, rag_collection_id, rag_document_id, related_skill_names, related_workflow_ids,
	metadata, created_by, created_at, updated_at`

func scanSolution(row pgx.Row) (*registry.TroubleshootingSolution, error) {
	var s registry.TroubleshootingSolution
	var tags, skills, workflows, metadata []byte
	var createdAt, updatedAt time.Time
	if err := row.Scan(
		&s.ID, &s.Title, &s.ProblemSymptoms, &s.KeyInformation,
		&s.TroubleshootingSteps, &s.ResolutionSteps, &s.Domain, &s.Component,
		&s.Severity, &tags, &s.SearchKeywords, &s.Version, &s.Status,
		&s.SourceURI, &s.RAGCollectionID, &s.RAGDocumentID,
		&skills, &workflows, &metadata, &s.CreatedBy, &createdAt, &updatedAt,
	); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(tags, &s.Tags); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(skills, &s.RelatedSkillNames); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(workflows, &s.RelatedWorkflowIDs); err != nil {
		return nil, err
	}
	if len(metadata) > 0 {
		if err := json.Unmarshal(metadata, &s.Metadata); err != nil {
			return nil, err
		}
	}
	s.CreatedAt = createdAt
	s.UpdatedAt = updatedAt
	return &s, nil
}

// Create inserts a solution row, stamping timestamps and defaulting version.
// Duplicate IDs surface as sentinel AlreadyExists.
func (r *SolutionRegistry) Create(ctx context.Context, solution *registry.TroubleshootingSolution) error {
	now := time.Now()
	solution.CreatedAt = now
	solution.UpdatedAt = now
	if solution.Version == 0 {
		solution.Version = 1
	}
	tags, _ := json.Marshal(orEmptySlice(solution.Tags))
	skills, _ := json.Marshal(orEmptySlice(solution.RelatedSkillNames))
	workflows, _ := json.Marshal(orEmptySlice(solution.RelatedWorkflowIDs))
	metadata, _ := json.Marshal(solution.Metadata)

	tag, err := r.store.pool.Exec(ctx, `
		INSERT INTO solutions (`+solutionColumns+`)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
		ON CONFLICT (id) DO NOTHING
	`,
		solution.ID, solution.Title, solution.ProblemSymptoms, solution.KeyInformation,
		solution.TroubleshootingSteps, solution.ResolutionSteps, solution.Domain, solution.Component,
		solution.Severity, tags, solution.SearchKeywords, solution.Version, solution.Status,
		solution.SourceURI, solution.RAGCollectionID, solution.RAGDocumentID,
		skills, workflows, metadata, solution.CreatedBy, solution.CreatedAt, solution.UpdatedAt,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pkgerrors.AlreadyExists("solution", solution.ID)
	}
	return nil
}

// Get returns the solution with the given ID or sentinel NotFound.
func (r *SolutionRegistry) Get(ctx context.Context, id string) (*registry.TroubleshootingSolution, error) {
	row := r.store.pool.QueryRow(ctx,
		`SELECT `+solutionColumns+` FROM solutions WHERE id = $1`, id)
	s, err := scanSolution(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pkgerrors.NotFound("solution", id)
		}
		return nil, err
	}
	return s, nil
}

// List returns solutions with optional status/domain/severity filter from
// ListOptions.Filter, paginated, with total count.
func (r *SolutionRegistry) List(ctx context.Context, opts registry.ListOptions) ([]*registry.TroubleshootingSolution, int, error) {
	status := opts.Filter["status"]
	domain := opts.Filter["domain"]
	severity := opts.Filter["severity"]
	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	where := ` WHERE ($1 = '' OR status = $1) AND ($2 = '' OR domain = $2) AND ($3 = '' OR severity = $3)`
	var total int
	if err := r.store.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM solutions"+where, status, domain, severity).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT `+solutionColumns+` FROM solutions`+where+`
		ORDER BY created_at DESC, id LIMIT $4 OFFSET $5`,
		status, domain, severity, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	out := []*registry.TroubleshootingSolution{}
	for rows.Next() {
		s, err := scanSolution(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, s)
	}
	return out, total, rows.Err()
}

// Update overwrites the solution row and refreshes updated_at.
func (r *SolutionRegistry) Update(ctx context.Context, solution *registry.TroubleshootingSolution) error {
	solution.UpdatedAt = time.Now()
	tags, _ := json.Marshal(orEmptySlice(solution.Tags))
	skills, _ := json.Marshal(orEmptySlice(solution.RelatedSkillNames))
	workflows, _ := json.Marshal(orEmptySlice(solution.RelatedWorkflowIDs))
	metadata, _ := json.Marshal(solution.Metadata)

	tag, err := r.store.pool.Exec(ctx, `
		UPDATE solutions SET title=$2, problem_symptoms=$3, key_information=$4,
			troubleshooting_steps=$5, resolution_steps=$6, domain=$7, component=$8,
			severity=$9, tags=$10, search_keywords=$11, version=$12, status=$13,
			source_uri=$14, rag_collection_id=$15, rag_document_id=$16,
			related_skill_names=$17, related_workflow_ids=$18, metadata=$19,
			created_by=$20, updated_at=$21
		WHERE id = $1
	`,
		solution.ID, solution.Title, solution.ProblemSymptoms, solution.KeyInformation,
		solution.TroubleshootingSteps, solution.ResolutionSteps, solution.Domain, solution.Component,
		solution.Severity, tags, solution.SearchKeywords, solution.Version, solution.Status,
		solution.SourceURI, solution.RAGCollectionID, solution.RAGDocumentID,
		skills, workflows, metadata, solution.CreatedBy, solution.UpdatedAt,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pkgerrors.NotFound("solution", solution.ID)
	}
	return nil
}

// Delete removes the solution row and cascades its execution records.
func (r *SolutionRegistry) Delete(ctx context.Context, id string) error {
	_, err := r.store.pool.Exec(ctx, "DELETE FROM solutions WHERE id = $1", id)
	return err
}

// Search filters by domain/component/severity/status, tag containment, and
// case-insensitive keyword over title+symptoms+keywords, paginated, with total.
func (r *SolutionRegistry) Search(ctx context.Context, opts *registry.SolutionSearchOptions) ([]*registry.TroubleshootingSolution, int, error) {
	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	tagsJSON, _ := json.Marshal(orEmptySlice(opts.Tags))

	where := ` WHERE ($1 = '' OR domain = $1)
		AND ($2 = '' OR component = $2)
		AND ($3 = '' OR severity = $3)
		AND ($4 = '' OR status = $4)
		AND ($5::jsonb = '[]'::jsonb OR tags @> $5::jsonb)
		AND ($6 = '' OR LOWER(title || ' ' || problem_symptoms || ' ' || search_keywords) LIKE '%' || LOWER($6) || '%')`
	args := []any{opts.Domain, opts.Component, opts.Severity, opts.Status, string(tagsJSON), opts.Keyword}

	var total int
	if err := r.store.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM solutions"+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT `+solutionColumns+` FROM solutions`+where+`
		ORDER BY created_at DESC, id LIMIT $7 OFFSET $8`,
		append(args, limit, opts.Offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	out := []*registry.TroubleshootingSolution{}
	for rows.Next() {
		s, err := scanSolution(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, s)
	}
	return out, total, rows.Err()
}

// BulkCreate inserts solutions whose IDs are absent, stamping timestamps, and
// returns how many rows were created.
func (r *SolutionRegistry) BulkCreate(ctx context.Context, solutions []*registry.TroubleshootingSolution) (int, error) {
	created := 0
	now := time.Now()
	for _, s := range solutions {
		s.CreatedAt = now
		s.UpdatedAt = now
		if s.Version == 0 {
			s.Version = 1
		}
		tags, _ := json.Marshal(orEmptySlice(s.Tags))
		skills, _ := json.Marshal(orEmptySlice(s.RelatedSkillNames))
		workflows, _ := json.Marshal(orEmptySlice(s.RelatedWorkflowIDs))
		metadata, _ := json.Marshal(s.Metadata)

		tag, err := r.store.pool.Exec(ctx, `
			INSERT INTO solutions (`+solutionColumns+`)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
			ON CONFLICT (id) DO NOTHING
		`,
			s.ID, s.Title, s.ProblemSymptoms, s.KeyInformation,
			s.TroubleshootingSteps, s.ResolutionSteps, s.Domain, s.Component,
			s.Severity, tags, s.SearchKeywords, s.Version, s.Status,
			s.SourceURI, s.RAGCollectionID, s.RAGDocumentID,
			skills, workflows, metadata, s.CreatedBy, s.CreatedAt, s.UpdatedAt,
		)
		if err != nil {
			return created, err
		}
		created += int(tag.RowsAffected())
	}
	return created, nil
}

// RecordExecution inserts a solution execution row, stamping created_at.
func (r *SolutionRegistry) RecordExecution(ctx context.Context, exec *registry.SolutionExecution) error {
	exec.CreatedAt = time.Now()
	triggerCtx, _ := json.Marshal(exec.TriggerContext)
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO solution_executions (id, solution_id, executor, trigger_context, status,
			outcome_notes, effectiveness_score, duration_ms, started_at, completed_at, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
	`,
		exec.ID, exec.SolutionID, exec.Executor, triggerCtx, exec.Status,
		exec.OutcomeNotes, exec.EffectivenessScore, exec.DurationMs,
		exec.StartedAt, exec.CompletedAt, exec.CreatedAt,
	)
	return err
}

// ListExecutions returns the execution rows of a solution, paginated, with total.
func (r *SolutionRegistry) ListExecutions(ctx context.Context, solutionID string, opts registry.ListOptions) ([]*registry.SolutionExecution, int, error) {
	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	var total int
	if err := r.store.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM solution_executions WHERE solution_id = $1", solutionID).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, solution_id, executor, trigger_context, status, outcome_notes,
			effectiveness_score, duration_ms, started_at, completed_at, created_at
		FROM solution_executions WHERE solution_id = $1
		ORDER BY created_at DESC, id LIMIT $2 OFFSET $3`,
		solutionID, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	out := []*registry.SolutionExecution{}
	for rows.Next() {
		var e registry.SolutionExecution
		var triggerCtx []byte
		if err := rows.Scan(
			&e.ID, &e.SolutionID, &e.Executor, &triggerCtx, &e.Status,
			&e.OutcomeNotes, &e.EffectivenessScore, &e.DurationMs,
			&e.StartedAt, &e.CompletedAt, &e.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		if len(triggerCtx) > 0 {
			if err := json.Unmarshal(triggerCtx, &e.TriggerContext); err != nil {
				return nil, 0, err
			}
		}
		out = append(out, &e)
	}
	return out, total, rows.Err()
}

// orEmptySlice normalizes nil slices to JSON-empty arrays so round-trips
// never yield null.
func orEmptySlice(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}
```

- [ ] **Step 5.4: 起本地 Postgres 并跑测试**

```bash
docker run --rm -d --name resolveagent-pg3-test -p 5432:5432 \
  -e POSTGRES_USER=resolveagent -e POSTGRES_PASSWORD=resolveagent \
  -e POSTGRES_DB=resolveagent_test postgres:16
sleep 3
go test ./pkg/store/postgres/ -run TestPostgresSolutionRegistry -v 2>&1 | tail -10
```
Expected: PASS（若 5432 被既有实例占用，改用 `-p 15432:5432` 并设 `RESOLVEAGENT_TEST_DSN=postgres://resolveagent:resolveagent@localhost:15432/resolveagent_test?sslmode=disable`）。

- [ ] **Step 5.5: 全量 store 回归**

Run: `go test ./pkg/store/... 2>&1 | tail -5`
Expected: 全 ok。

- [ ] **Step 5.6: Commit**

```bash
cd /Users/allengaller/Documents/GitHub/ai-guru-global/resolve-agent
git add pkg/store/postgres/solution_store.go pkg/store/postgres/registry_test.go
git commit -m "feat(store): solution registry postgres 实现——sentinel 错误同构、tags/metadata JSONB 回读、独立连接验证重启不丢数据"
```

---

### Task 6: server 接线 postgres 后端

**Files:**
- Modify: `pkg/server/server.go:77-78`

- [ ] **Step 6.1: 替换接线**

old:
```go
		// Solution registry remains in-memory until PostgreSQL implementation is added
		s.solutionRegistry = registry.NewInMemoryTroubleshootingSolutionRegistry()
```
new:
```go
		s.solutionRegistry = postgres.NewSolutionRegistry(pgStore)
```

- [ ] **Step 6.2: 编译 + 服务层回归**

Run: `go build ./... && go test ./pkg/server/ 2>&1 | tail -3`
Expected: 全绿。

- [ ] **Step 6.3: 确认内存实现仍是无 DB 默认**

Run: `grep -n "solutionRegistry = " pkg/server/server.go`
Expected: postgres 分支 1 行 `postgres.NewSolutionRegistry`；else 分支 1 行 `registry.NewInMemoryTroubleshootingSolutionRegistry()`。grep "remains in-memory" 无残留。

- [ ] **Step 6.4: Commit**

```bash
cd /Users/allengaller/Documents/GitHub/ai-guru-global/resolve-agent
git add pkg/server/server.go
git commit -m "feat(server): postgres 后端接线 solutionRegistry——内存实现保留为无 DB 默认"
```

---

### Task 7: 验收

- [ ] **Step 7.1: 契约验收**

Run: `go test ./pkg/server/ -run TestOpenAPI -v 2>&1 | tail -6`
Expected: 3 个契约测试 PASS（路径数与 router 一致的双向断言即 spec 验收标准第 1 条）。

- [ ] **Step 7.2: 持久化验收（spec 第 2 条）**

Run: `go test ./pkg/store/postgres/ -run TestPostgresSolutionRegistry -v 2>&1 | tail -4`
Expected: PASS，含独立连接重启持久化断言。测试后清理容器：`docker rm -f resolveagent-pg3-test`。

- [ ] **Step 7.3: README 验收（spec 第 3 条）**

Run: `grep -n "HTTP/SSE + gRPC\|Protocol Buffers" README.md; ls api/proto/resolveagent/v1/ | head -3`
Expected: grep 无输出（宣传已撤）；proto 文件仍在。

- [ ] **Step 7.4: 全量门禁**

Run: `PATH="/Users/allengaller/go/bin:$PATH" bash hack/quality-gate.sh`
Expected: 10/10 PASS exit 0（新增 solution_store.go 会自然纳入 go-lint/go-test/coverage 口径）。

- [ ] **Step 7.5: 计划勾销收尾**

全部步骤完成后勾销本计划复选框并提交：

```bash
sed -i '' 's/^- \[ \] \*\*Step/- [x] **Step/' docs/superpowers/plans/2026-09-11-p3-contract-data-loop.md
git add docs/superpowers/plans/2026-09-11-p3-contract-data-loop.md
git commit -m "docs(plan): P3 计划勾销收尾"
```
