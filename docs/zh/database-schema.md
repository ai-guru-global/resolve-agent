# 数据库 Schema 架构

ResolveAgent 数据库采用 PostgreSQL 作为持久化存储层，覆盖平台注册中心、生命周期 Hook、RAG 知识库、FTA 故障树分析、代码静态分析和 Agent 记忆六大领域，共计 **16 张表**，分属 **6 个功能分组**。

## 设计原则

| 原则 | 说明 |
|------|------|
| **UUID 主键** | 除 `audit_log`（BIGSERIAL）外，所有表使用 `uuid_generate_v4()` 生成主键，支持分布式环境 |
| **JSONB 灵活存储** | 配置、元数据、分析结果等半结构化数据统一使用 JSONB 列，无需频繁 DDL 变更 |
| **自动 updated_at** | 所有包含 `updated_at` 的表均绑定 `update_updated_at_column()` 触发器，自动维护时间戳 |
| **级联删除策略** | 父子关系使用 `ON DELETE CASCADE`（执行记录随主实体删除）；弱引用使用 `ON DELETE SET NULL`（如 `rag_ingestion_history.document_id`） |
| **Schema 隔离** | 所有表置于 `resolveagent` Schema 下，与其他应用隔离 |
| **幂等迁移** | 全部使用 `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`，支持重复执行 |
| **双层存储架构** | Go 平台层为单一真相源（Single Source of Truth），Python Runtime 通过 HTTP Store Client 进行读写 |

## 表分组概览

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        ResolveAgent Database                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────┐  │
│  │   核心注册表        │  │  Hook 生命周期      │  │ RAG 知识库     │  │
│  │   (6 张表)          │  │  (2 张表)           │  │ (2 张表)       │  │
│  │   迁移: 001         │  │  迁移: 002          │  │ 迁移: 003      │  │
│  └─────────────────────┘  └─────────────────────┘  └────────────────┘  │
│                                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────┐  │
│  │   FTA 故障树        │  │  代码分析           │  │ 记忆系统       │  │
│  │   (2 张表)          │  │  (2 张表)           │  │ (2 张表)       │  │
│  │   迁移: 004         │  │  迁移: 005          │  │ 迁移: 006      │  │
│  └─────────────────────┘  └─────────────────────┘  └────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  性能索引 — 迁移: 007                                           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

## 实体关系图

```
                     ┌──────────┐
                     │ agents   │
                     └──────────┘

 ┌──────────┐        ┌──────────┐        ┌──────────┐
 │ skills   │        │workflows │        │ models   │
 └──────────┘        └────┬─────┘        └──────────┘
                          │ 1:N
                          ▼
                 ┌──────────────────┐
                 │workflow_executions│
                 └──────────────────┘

 ┌──────────┐            ┌──────────────┐
 │  hooks   ├─── 1:N ──►│hook_executions│
 └──────────┘            └──────────────┘

 ┌──────────────┐            ┌────────────────────┐
 │rag_documents ├─── 1:N ──►│rag_ingestion_history│  (SET NULL)
 └──────────────┘            └────────────────────┘

 ┌──────────────┐            ┌────────────────────┐
 │fta_documents ├─── 1:N ──►│fta_analysis_results │  (CASCADE)
 └──────────────┘            └────────────────────┘

 ┌──────────────┐            ┌────────────────────────┐
 │code_analyses ├─── 1:N ──►│code_analysis_findings   │  (CASCADE)
 └──────────────┘            └────────────────────────┘

 ┌──────────────────┐        ┌─────────────────┐
 │memory_short_term │        │memory_long_term  │
 └──────────────────┘        └─────────────────┘

                 ┌──────────┐
                 │audit_log │  (独立表，无外键)
                 └──────────┘
```

**外键关系：**

| FK 列 | 所属表 | 引用表 | 引用列 | 删除策略 |
|--------|--------|--------|--------|----------|
| `workflow_id` | `workflow_executions` | `workflows` | `id` | CASCADE |
| `hook_id` | `hook_executions` | `hooks` | `id` | CASCADE |
| `document_id` | `rag_ingestion_history` | `rag_documents` | `id` | SET NULL |
| `document_id` | `fta_analysis_results` | `fta_documents` | `id` | CASCADE |
| `analysis_id` | `code_analysis_findings` | `code_analyses` | `id` | CASCADE |

---

## 分组 1：核心注册表（迁移 001）

核心注册中心，管理 Agent、Skill、Workflow、Model 和审计日志，是平台的基础元数据层。

### agents

Agent 实例的注册表，存储配置、元数据和运行状态。

| 列名 | 类型 | 可空 | 默认值 | 说明 |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | 否 | `uuid_generate_v4()` | 主键 |
| **name** | `VARCHAR(255)` UNIQUE | 否 | - | Agent 唯一名称 |
| display_name | `VARCHAR(255)` | 是 | - | 展示名称 |
| description | `TEXT` | 是 | - | 描述信息 |
| version | `VARCHAR(50)` | 否 | `'0.1.0'` | 版本号 |
| status | `VARCHAR(50)` | 否 | `'inactive'` | 运行状态 (active/inactive/error) |
| config | `JSONB` | 否 | `'{}'` | 配置信息 (model, max_tokens 等) |
| metadata | `JSONB` | 否 | `'{}'` | 扩展元数据 |
| created_at | `TIMESTAMPTZ` | 否 | `NOW()` | 创建时间 |
| updated_at | `TIMESTAMPTZ` | 否 | `NOW()` | 更新时间 (trigger) |

**索引：** `idx_agents_name(name)`, `idx_agents_status(status)`

### skills

所有可用 Skill 的定义，包括版本和 Manifest 元数据。

| 列名 | 类型 | 可空 | 默认值 | 说明 |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | 否 | `uuid_generate_v4()` | 主键 |
| **name** | `VARCHAR(255)` UNIQUE | 否 | - | Skill 唯一名称 |
| display_name | `VARCHAR(255)` | 是 | - | 展示名称 |
| description | `TEXT` | 是 | - | 描述信息 |
| version | `VARCHAR(50)` | 否 | `'0.1.0'` | 版本号 |
| category | `VARCHAR(100)` | 是 | - | 分类 (ops/analysis/...) |
| manifest | `JSONB` | 否 | `'{}'` | Manifest 元数据 (entry_point 等) |
| status | `VARCHAR(50)` | 否 | `'inactive'` | 状态 (inactive/installed/...) |
| created_at | `TIMESTAMPTZ` | 否 | `NOW()` | 创建时间 |
| updated_at | `TIMESTAMPTZ` | 否 | `NOW()` | 更新时间 (trigger) |

**索引：** `idx_skills_name(name)`, `idx_skills_category(category)`

### workflows

工作流定义表，主要用于 FTA 故障树场景。

| 列名 | 类型 | 可空 | 默认值 | 说明 |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | 否 | `uuid_generate_v4()` | 主键 |
| **name** | `VARCHAR(255)` UNIQUE | 否 | - | 工作流唯一名称 |
| display_name | `VARCHAR(255)` | 是 | - | 展示名称 |
| description | `TEXT` | 是 | - | 描述信息 |
| version | `VARCHAR(50)` | 否 | `'0.1.0'` | 版本号 |
| workflow_type | `VARCHAR(50)` | 否 | `'fta'` | 类型 (fta/...) |
| definition | `JSONB` | 否 | `'{}'` | 工作流定义 (top_event, gates, events) |
| status | `VARCHAR(50)` | 否 | `'draft'` | 状态 (draft/active/archived) |
| created_at | `TIMESTAMPTZ` | 否 | `NOW()` | 创建时间 |
| updated_at | `TIMESTAMPTZ` | 否 | `NOW()` | 更新时间 (trigger) |

**索引：** `idx_workflows_name(name)`, `idx_workflows_type(workflow_type)`

### workflow_executions

工作流执行记录，通过 `workflow_id` FK 关联到 `workflows`。

| 列名 | 类型 | 可空 | 默认值 | 说明 |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | 否 | `uuid_generate_v4()` | 主键 |
| workflow_id | `UUID` FK | 否 | - | 关联工作流 ID |
| status | `VARCHAR(50)` | 否 | `'pending'` | 执行状态 (pending/running/completed/failed) |
| input | `JSONB` | 否 | `'{}'` | 输入数据 |
| output | `JSONB` | 是 | `'{}'` | 输出数据 |
| error | `TEXT` | 是 | - | 错误信息 |
| started_at | `TIMESTAMPTZ` | 是 | - | 开始时间 |
| completed_at | `TIMESTAMPTZ` | 是 | - | 完成时间 |
| created_at | `TIMESTAMPTZ` | 否 | `NOW()` | 创建时间 |

**外键：** `workflow_id → workflows(id) ON DELETE CASCADE`
**索引：** `idx_workflow_executions_workflow(workflow_id)`, `idx_workflow_executions_status(status)`

### models

LLM 模型注册表，存储提供商、参数限制和启用状态。

| 列名 | 类型 | 可空 | 默认值 | 说明 |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | 否 | `uuid_generate_v4()` | 主键 |
| **model_id** | `VARCHAR(255)` UNIQUE | 否 | - | 模型唯一标识 (如 qwen-plus) |
| provider | `VARCHAR(100)` | 否 | - | 模型提供商 |
| model_name | `VARCHAR(255)` | 否 | - | 模型名称 |
| max_tokens | `INTEGER` | 否 | `8192` | 最大 Token 数 |
| default_temp | `REAL` | 是 | `0.7` | 默认温度 |
| enabled | `BOOLEAN` | 否 | `true` | 是否启用 |
| config | `JSONB` | 否 | `'{}'` | 扩展配置 |
| created_at | `TIMESTAMPTZ` | 否 | `NOW()` | 创建时间 |
| updated_at | `TIMESTAMPTZ` | 否 | `NOW()` | 更新时间 (trigger) |

**索引：** `idx_models_provider(provider)`

### audit_log

操作审计追踪表，记录所有实体的变更历史。唯一使用 `BIGSERIAL` 主键的表。

| 列名 | 类型 | 可空 | 默认值 | 说明 |
|--------|------|----------|---------|-------------|
| **id** | `BIGSERIAL` PK | 否 | auto-increment | 自增主键 |
| entity_type | `VARCHAR(50)` | 否 | - | 实体类型 (agent/skill/workflow/...) |
| entity_id | `UUID` | 否 | - | 实体 ID |
| action | `VARCHAR(50)` | 否 | - | 操作类型 (create/update/delete/...) |
| actor | `VARCHAR(255)` | 是 | - | 操作者 |
| details | `JSONB` | 是 | `'{}'` | 变更详情 |
| created_at | `TIMESTAMPTZ` | 否 | `NOW()` | 创建时间 |

**索引：** `idx_audit_log_entity(entity_type, entity_id)`, `idx_audit_log_created(created_at)`

---

## 分组 2：Hook 生命周期（迁移 002）

生命周期 Hook 管理，支持 pre/post 执行和错误处理等触发点，实现 Agent 执行链路的可扩展拦截。

### hooks

Hook 定义表，注册不同触发点的回调处理器。

| 列名 | 类型 | 可空 | 默认值 | 说明 |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | 否 | `uuid_generate_v4()` | 主键 |
| **name** | `VARCHAR(255)` UNIQUE | 否 | - | Hook 唯一名称 |
| description | `TEXT` | 是 | - | 描述信息 |
| hook_type | `VARCHAR(50)` | 否 | - | Hook 类型 (pre/post/on_error) |
| trigger_point | `VARCHAR(100)` | 否 | - | 触发点 (agent.execute, skill.invoke 等) |
| target_id | `VARCHAR(255)` | 是 | - | 目标实体 ID (为空则全局生效) |
| execution_order | `INTEGER` | 否 | `0` | 执行顺序 (升序) |
| handler_type | `VARCHAR(50)` | 否 | - | 处理器类型 (log_trace, auto_retry 等) |
| config | `JSONB` | 否 | `'{}'` | 配置信息 |
| enabled | `BOOLEAN` | 否 | `true` | 是否启用 |
| labels | `JSONB` | 是 | `'{}'` | 标签 |
| created_at | `TIMESTAMPTZ` | 否 | `NOW()` | 创建时间 |
| updated_at | `TIMESTAMPTZ` | 否 | `NOW()` | 更新时间 (trigger) |

**索引：** `idx_hooks_trigger(trigger_point)`, `idx_hooks_enabled(enabled) WHERE enabled = true`, `idx_hooks_target(target_id) WHERE target_id IS NOT NULL`

### hook_executions

Hook 执行记录，追踪每次 Hook 触发的输入输出和耗时。

| 列名 | 类型 | 可空 | 默认值 | 说明 |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | 否 | `uuid_generate_v4()` | 主键 |
| hook_id | `UUID` FK | 否 | - | 关联 Hook ID |
| trigger_event | `VARCHAR(100)` | 否 | - | 触发事件 |
| target_entity_id | `VARCHAR(255)` | 是 | - | 目标实体 ID |
| status | `VARCHAR(50)` | 否 | `'pending'` | 执行状态 |
| input_data | `JSONB` | 是 | `'{}'` | 输入数据 |
| output_data | `JSONB` | 是 | `'{}'` | 输出数据 |
| error | `TEXT` | 是 | - | 错误信息 |
| duration_ms | `INTEGER` | 是 | - | 执行耗时 (ms) |
| started_at | `TIMESTAMPTZ` | 是 | - | 开始时间 |
| completed_at | `TIMESTAMPTZ` | 是 | - | 完成时间 |
| created_at | `TIMESTAMPTZ` | 否 | `NOW()` | 创建时间 |

**外键：** `hook_id → hooks(id) ON DELETE CASCADE`
**索引：** `idx_hook_exec_hook(hook_id)`, `idx_hook_exec_status(status)`

---

## 分组 3：RAG 知识库（迁移 003）

RAG 知识库文档元数据管理。向量数据由外部 Milvus/Qdrant 存储，本表仅管理文档注册和摄取追踪。

### rag_documents

RAG 文档元数据表，包含分块信息和向量引用。

| 列名 | 类型 | 可空 | 默认值 | 说明 |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | 否 | `uuid_generate_v4()` | 主键 |
| collection_id | `VARCHAR(255)` | 否 | - | 所属集合 ID |
| title | `VARCHAR(512)` | 是 | - | 文档标题 |
| source_uri | `VARCHAR(1024)` | 是 | - | 来源 URI (S3/HTTP/...) |
| content_hash | `VARCHAR(128)` | 是 | - | 内容哈希 (去重用) |
| content_type | `VARCHAR(100)` | 是 | - | 内容类型 (MIME) |
| chunk_count | `INTEGER` | 是 | `0` | 分块数量 |
| vector_ids | `TEXT[]` | 是 | - | 关联向量 ID 列表 (外部向量库) |
| metadata | `JSONB` | 否 | `'{}'` | 元数据 |
| status | `VARCHAR(50)` | 否 | `'pending'` | 状态 (pending/indexing/indexed/error) |
| size_bytes | `BIGINT` | 是 | `0` | 文件大小 (bytes) |
| created_at | `TIMESTAMPTZ` | 否 | `NOW()` | 创建时间 |
| updated_at | `TIMESTAMPTZ` | 否 | `NOW()` | 更新时间 (trigger) |

**索引：** `idx_rag_docs_collection(collection_id)`, `idx_rag_docs_hash(content_hash)`, `idx_rag_docs_status(status)`

### rag_ingestion_history

文档摄取过程的追踪记录。`document_id` 使用 SET NULL 策略，即使原文档被删除，摄取历史仍然保留。

| 列名 | 类型 | 可空 | 默认值 | 说明 |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | 否 | `uuid_generate_v4()` | 主键 |
| collection_id | `VARCHAR(255)` | 否 | - | 集合 ID |
| document_id | `UUID` FK | 是 | - | 关联文档 ID |
| action | `VARCHAR(50)` | 否 | - | 操作类型 (ingest/re-ingest/delete) |
| status | `VARCHAR(50)` | 否 | `'pending'` | 状态 |
| chunks_processed | `INTEGER` | 是 | `0` | 已处理分块数 |
| vectors_created | `INTEGER` | 是 | `0` | 已创建向量数 |
| error | `TEXT` | 是 | - | 错误信息 |
| duration_ms | `INTEGER` | 是 | - | 耗时 (ms) |
| metadata | `JSONB` | 是 | `'{}'` | 元数据 (如 embedding_model) |
| created_at | `TIMESTAMPTZ` | 否 | `NOW()` | 创建时间 |

**外键：** `document_id → rag_documents(id) ON DELETE SET NULL`
**索引：** `idx_rag_ingest_collection(collection_id)`

---

## 分组 4：FTA 故障树（迁移 004）

故障树分析 (Fault Tree Analysis) 文档管理和分析结果持久化。

### fta_documents

故障树定义文档，以 JSONB 存储完整的故障树结构。

| 列名 | 类型 | 可空 | 默认值 | 说明 |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | 否 | `uuid_generate_v4()` | 主键 |
| workflow_id | `VARCHAR(64)` | 是 | - | 关联工作流 ID |
| name | `VARCHAR(255)` | 否 | - | 文档名称 |
| description | `TEXT` | 是 | - | 描述信息 |
| fault_tree | `JSONB` | 否 | `'{}'` | 故障树定义 (top_event, gates, events) |
| version | `INTEGER` | 否 | `1` | 版本号 |
| status | `VARCHAR(50)` | 否 | `'draft'` | 状态 (draft/published/archived) |
| metadata | `JSONB` | 是 | `'{}'` | 元数据 |
| labels | `JSONB` | 是 | `'{}'` | 标签 (domain: k8s/rds/...) |
| created_by | `VARCHAR(255)` | 是 | - | 创建者 |
| created_at | `TIMESTAMPTZ` | 否 | `NOW()` | 创建时间 |
| updated_at | `TIMESTAMPTZ` | 否 | `NOW()` | 更新时间 (trigger) |

**索引：** `idx_fta_docs_workflow(workflow_id) WHERE workflow_id IS NOT NULL`, `idx_fta_docs_status(status)`

### fta_analysis_results

故障树分析执行结果，包含最小割集、基本事件概率和门逻辑结果。

| 列名 | 类型 | 可空 | 默认值 | 说明 |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | 否 | `uuid_generate_v4()` | 主键 |
| document_id | `UUID` FK | 否 | - | 关联 FTA 文档 ID |
| execution_id | `UUID` | 是 | - | 关联执行 ID |
| top_event_result | `BOOLEAN` | 是 | - | 顶事件结果 |
| minimal_cut_sets | `JSONB` | 是 | `'[]'` | 最小割集 |
| basic_event_probabilities | `JSONB` | 是 | `'{}'` | 基本事件概率 |
| gate_results | `JSONB` | 是 | `'{}'` | 门逻辑结果 |
| importance_measures | `JSONB` | 是 | `'{}'` | 重要度指标 |
| status | `VARCHAR(50)` | 否 | `'completed'` | 状态 |
| duration_ms | `INTEGER` | 是 | - | 分析耗时 (ms) |
| context | `JSONB` | 是 | `'{}'` | 上下文信息 |
| created_at | `TIMESTAMPTZ` | 否 | `NOW()` | 创建时间 |

**外键：** `document_id → fta_documents(id) ON DELETE CASCADE`
**索引：** `idx_fta_results_doc(document_id)`

---

## 分组 5：代码分析（迁移 005）

代码静态分析记录和发现项管理，支持多种分析器和 CI/CD 集成。

### code_analyses

代码分析任务记录表。

| 列名 | 类型 | 可空 | 默认值 | 说明 |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | 否 | `uuid_generate_v4()` | 主键 |
| name | `VARCHAR(255)` | 否 | - | 分析名称 |
| repository_url | `VARCHAR(1024)` | 是 | - | 仓库 URL |
| branch | `VARCHAR(255)` | 是 | - | 分支 |
| commit_sha | `VARCHAR(64)` | 是 | - | Commit SHA |
| language | `VARCHAR(50)` | 是 | - | 编程语言 |
| analyzer_type | `VARCHAR(100)` | 否 | - | 分析器类型 (golangci-lint, pylint, ...) |
| config | `JSONB` | 否 | `'{}'` | 配置 |
| status | `VARCHAR(50)` | 否 | `'pending'` | 状态 (pending/running/completed/failed) |
| summary | `JSONB` | 是 | `'{}'` | 分析摘要 (total_findings, severity 统计) |
| duration_ms | `INTEGER` | 是 | - | 耗时 (ms) |
| labels | `JSONB` | 是 | `'{}'` | 标签 |
| triggered_by | `VARCHAR(255)` | 是 | - | 触发者 (ci-pipeline/manual/...) |
| started_at | `TIMESTAMPTZ` | 是 | - | 开始时间 |
| completed_at | `TIMESTAMPTZ` | 是 | - | 完成时间 |
| created_at | `TIMESTAMPTZ` | 否 | `NOW()` | 创建时间 |
| updated_at | `TIMESTAMPTZ` | 否 | `NOW()` | 更新时间 (trigger) |

**索引：** `idx_code_analyses_status(status)`, `idx_code_analyses_repo(repository_url) WHERE repository_url IS NOT NULL`

### code_analysis_findings

单个代码分析发现条目，包含精确的文件位置和修复建议。

| 列名 | 类型 | 可空 | 默认值 | 说明 |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | 否 | `uuid_generate_v4()` | 主键 |
| analysis_id | `UUID` FK | 否 | - | 关联分析 ID |
| rule_id | `VARCHAR(255)` | 否 | - | 规则 ID (errcheck, govet, ...) |
| severity | `VARCHAR(50)` | 否 | - | 严重程度 (critical/high/medium/low/info) |
| category | `VARCHAR(100)` | 是 | - | 分类 (error-handling, correctness, ...) |
| message | `TEXT` | 否 | - | 发现描述 |
| file_path | `VARCHAR(1024)` | 是 | - | 文件路径 |
| line_start | `INTEGER` | 是 | - | 起始行 |
| line_end | `INTEGER` | 是 | - | 结束行 |
| column_start | `INTEGER` | 是 | - | 起始列 |
| column_end | `INTEGER` | 是 | - | 结束列 |
| snippet | `TEXT` | 是 | - | 代码片段 |
| suggestion | `TEXT` | 是 | - | 修复建议 |
| metadata | `JSONB` | 是 | `'{}'` | 元数据 |
| created_at | `TIMESTAMPTZ` | 否 | `NOW()` | 创建时间 |

**外键：** `analysis_id → code_analyses(id) ON DELETE CASCADE`
**索引：** `idx_code_findings_analysis(analysis_id)`, `idx_code_findings_severity(severity)`

---

## 分组 6：记忆系统（迁移 006）

Agent 记忆系统，分为短期记忆 (会话内对话历史) 和长期记忆 (跨会话知识) 两层。

### memory_short_term

会话级对话历史，按 `(conversation_id, sequence_num)` 唯一约束保证消息顺序。

| 列名 | 类型 | 可空 | 默认值 | 说明 |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | 否 | `uuid_generate_v4()` | 主键 |
| agent_id | `VARCHAR(255)` | 否 | - | Agent ID |
| conversation_id | `VARCHAR(255)` | 否 | - | 会话 ID |
| role | `VARCHAR(50)` | 否 | - | 角色 (user/assistant/system) |
| content | `TEXT` | 否 | - | 消息内容 |
| token_count | `INTEGER` | 是 | `0` | Token 数量 |
| metadata | `JSONB` | 是 | `'{}'` | 元数据 (model, latency 等) |
| sequence_num | `INTEGER` | 否 | - | 序列号 |
| created_at | `TIMESTAMPTZ` | 否 | `NOW()` | 创建时间 |

**约束：** `UNIQUE (conversation_id, sequence_num)`
**索引：** `idx_mem_short_conv(conversation_id, sequence_num)`, `idx_mem_short_agent(agent_id)`

### memory_long_term

跨会话的知识存储，支持重要度评分、访问计数、TTL 过期和外部嵌入向量关联。

| 列名 | 类型 | 可空 | 默认值 | 说明 |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | 否 | `uuid_generate_v4()` | 主键 |
| agent_id | `VARCHAR(255)` | 否 | - | Agent ID |
| user_id | `VARCHAR(255)` | 是 | - | 用户 ID |
| memory_type | `VARCHAR(50)` | 否 | - | 记忆类型 (fact/summary/preference/...) |
| content | `TEXT` | 否 | - | 记忆内容 |
| importance | `REAL` | 是 | `0.5` | 重要度 (0.0-1.0) |
| access_count | `INTEGER` | 是 | `0` | 访问次数 |
| source_conversations | `TEXT[]` | 是 | - | 来源会话 ID 列表 |
| embedding_id | `VARCHAR(255)` | 是 | - | 嵌入向量 ID (外部向量库) |
| metadata | `JSONB` | 是 | `'{}'` | 元数据 |
| expires_at | `TIMESTAMPTZ` | 是 | - | 过期时间 (null 表示永不过期) |
| last_accessed_at | `TIMESTAMPTZ` | 是 | `NOW()` | 最后访问时间 |
| created_at | `TIMESTAMPTZ` | 否 | `NOW()` | 创建时间 |
| updated_at | `TIMESTAMPTZ` | 否 | `NOW()` | 更新时间 (trigger) |

**索引：** `idx_mem_long_agent(agent_id)`, `idx_mem_long_user(user_id) WHERE user_id IS NOT NULL`, `idx_mem_long_type(memory_type)`, `idx_mem_long_importance(importance DESC)`

---

## 迁移策略

### 迁移文件

| 序号 | 文件 | 内容 | 表数量 |
|------|------|------|--------|
| 001 | `001_init.up.sql` | 核心注册表 + Extensions + Triggers + Grants | 6 |
| 002 | `002_hooks.up.sql` | Hook 定义和执行记录 | 2 |
| 003 | `003_rag_documents.up.sql` | RAG 文档元数据和摄取历史 | 2 |
| 004 | `004_fta_documents.up.sql` | FTA 故障树文档和分析结果 | 2 |
| 005 | `005_code_analysis.up.sql` | 代码分析记录和发现 | 2 |
| 006 | `006_memory.up.sql` | 短期/长期记忆 | 2 |
| 007 | `007_indexes.up.sql` | 002-006 表的性能索引 | 0 (仅索引) |

### 内联版本管理（开发模式）

Go 平台层使用内联迁移系统进行开发环境的 Schema 版本管理：

- 迁移版本记录在 `schema_migrations` 表中
- 每个版本对应一组 DDL 操作 (v1-v13)
- `CREATE TABLE IF NOT EXISTS` 保证幂等性
- 应用启动时自动检查并执行未应用的迁移

### 生产环境迁移

生产环境使用 `scripts/migration/` 目录下的独立 SQL 文件：

- 每个迁移文件包含 `up.sql` (升级) 和 `down.sql` (回滚)
- 通过外部迁移工具 (如 golang-migrate) 按序执行
- 所有表创建在 `resolveagent` Schema 下
- `001_init.up.sql` 额外处理: Extensions (uuid-ossp, pg_trgm)、Schema 创建、Trigger 函数、权限授予

---

## 存储架构

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Go 平台层                                      │
│                    (单一真相源)                                          │
│                                                                         │
│  ┌─────────────┐    ┌─────────────────┐    ┌──────────────────────┐    │
│  │  Registry    │    │ PostgreSQL Store │    │  内联迁移系统        │    │
│  │  接口层      │───►│ 实现层           │    │  (v1-v13)           │    │
│  │  (pkg/       │    │ (pkg/store/     │    │  (pkg/store/         │    │
│  │   registry/) │    │  postgres/)     │    │   postgres/store.go) │    │
│  └─────────────┘    └────────┬────────┘    └──────────────────────┘    │
│                              │                                          │
│                   ┌──────────▼──────────┐                              │
│                   │   HTTP REST API     │                              │
│                   │   (pkg/server/      │                              │
│                   │    router.go)       │                              │
│                   └──────────┬──────────┘                              │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │ HTTP
┌──────────────────────────────┼──────────────────────────────────────────┐
│                          Python 运行时                                  │
│                                                                         │
│  ┌─────────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │  Store 客户端    │    │ Hook 执行器  │    │ 记忆管理器           │   │
│  │  (store/         │    │ (hooks/      │    │ (agent/memory.py)    │   │
│  │   *_client.py)   │    │  runner.py)  │    │                      │   │
│  └─────────────────┘    └──────────────┘    └──────────────────────┘   │
│                                                                         │
│  客户端: HookClient, RAGDocumentClient, FTADocumentClient,             │
│          CodeAnalysisClient, MemoryClient                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Registry 分层模式

每个 Store 领域遵循统一的分层模式：

1. **接口层** (`pkg/registry/*.go`): 定义 CRUD + 领域特定操作
2. **内存实现** (`pkg/registry/inmemory_*.go`): 基于 `sync.RWMutex` 的内存实现，用于测试
3. **PostgreSQL 实现** (`pkg/store/postgres/*_store.go`): 基于 `pgx/v5` 连接池的生产实现
4. **REST API** (`pkg/server/router.go`): HTTP 路由暴露 Registry 操作
5. **Python 客户端** (`python/src/resolveagent/store/*_client.py`): 基于 `httpx` 的异步 HTTP 客户端

---

## 索引策略（迁移 007）

专门的索引迁移文件，为 002-006 的所有表创建性能优化索引：

| 表 | 索引名 | 列 | 条件过滤 |
|----|--------|----| ---------|
| hooks | idx_hooks_trigger | trigger_point | - |
| hooks | idx_hooks_enabled | enabled | `WHERE enabled = true` |
| hooks | idx_hooks_target | target_id | `WHERE target_id IS NOT NULL` |
| hook_executions | idx_hook_exec_hook | hook_id | - |
| hook_executions | idx_hook_exec_status | status | - |
| rag_documents | idx_rag_docs_collection | collection_id | - |
| rag_documents | idx_rag_docs_hash | content_hash | - |
| rag_documents | idx_rag_docs_status | status | - |
| rag_ingestion_history | idx_rag_ingest_collection | collection_id | - |
| fta_documents | idx_fta_docs_workflow | workflow_id | `WHERE workflow_id IS NOT NULL` |
| fta_documents | idx_fta_docs_status | status | - |
| fta_analysis_results | idx_fta_results_doc | document_id | - |
| code_analyses | idx_code_analyses_status | status | - |
| code_analyses | idx_code_analyses_repo | repository_url | `WHERE repository_url IS NOT NULL` |
| code_analysis_findings | idx_code_findings_analysis | analysis_id | - |
| code_analysis_findings | idx_code_findings_severity | severity | - |
| memory_short_term | idx_mem_short_conv | conversation_id, sequence_num | - |
| memory_short_term | idx_mem_short_agent | agent_id | - |
| memory_long_term | idx_mem_long_agent | agent_id | - |
| memory_long_term | idx_mem_long_user | user_id | `WHERE user_id IS NOT NULL` |
| memory_long_term | idx_mem_long_type | memory_type | - |
| memory_long_term | idx_mem_long_importance | importance DESC | - |

部分索引使用 `WHERE` 条件过滤，避免为 NULL 值或无效行建立索引，减少存储开销。

---

## 前端 Schema 集成

数据库 Schema 在前端以 TypeScript 类型化数据维护，供 WebUI 的 ER 关系图可视化组件使用：

- **数据源**: `web/src/data/dbSchema.ts` - 从迁移文件逐字段转录的完整 Schema 定义
- **可视化**: `web/src/pages/Database/RelationshipTab.tsx` - 基于 ReactFlow 的 ER 关系图
- **类型定义**: `ColumnDef`, `ForeignKeyDef`, `IndexDef`, `TableDef`, `TableGroup`
- **分组配色**: 核心注册表 (蓝色), Hook 生命周期 (紫色), RAG 知识库 (翠绿), FTA 故障树 (琥珀), 代码分析 (青色), 记忆系统 (玫瑰)
- **关系渲染**: CASCADE 外键显示为实线动画边, SET NULL 显示为虚线边

---

## 相关文档

- [架构设计](./architecture.md) — 系统整体架构
- [FTA 工作流引擎](./fta-engine.md) — 故障树分析引擎详细文档
- `scripts/migration/` — 生产环境 SQL 迁移文件
- `web/src/data/dbSchema.ts` — 前端 TypeScript Schema 定义
- `pkg/registry/` — Go Registry 接口定义
- `pkg/store/postgres/` — PostgreSQL 存储实现
