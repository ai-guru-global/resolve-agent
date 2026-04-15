# Database Schema Architecture

ResolveAgent 数据库采用 PostgreSQL 作为持久化存储层，覆盖平台注册中心、生命周期 Hook、RAG 知识库、FTA 故障树分析、代码静态分析和 Agent 记忆六大领域，共计 **16 张表**，分属 **6 个功能分组**。

## Design Principles

| 原则 | 说明 |
|------|------|
| **UUID 主键** | 除 `audit_log`（BIGSERIAL）外，所有表使用 `uuid_generate_v4()` 生成主键，支持分布式环境 |
| **JSONB 灵活存储** | 配置、元数据、分析结果等半结构化数据统一使用 JSONB 列，无需频繁 DDL 变更 |
| **自动 updated_at** | 所有包含 `updated_at` 的表均绑定 `update_updated_at_column()` 触发器，自动维护时间戳 |
| **级联删除策略** | 父子关系使用 `ON DELETE CASCADE`（执行记录随主实体删除）；弱引用使用 `ON DELETE SET NULL`（如 `rag_ingestion_history.document_id`） |
| **Schema 隔离** | 所有表置于 `resolveagent` Schema 下，与其他应用隔离 |
| **幂等迁移** | 全部使用 `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`，支持重复执行 |
| **双层存储架构** | Go 平台层为 Single Source of Truth，Python Runtime 通过 HTTP Store Client 进行读写 |

## Table Group Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        ResolveAgent Database                            │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────┐  │
│  │   Core Registry     │  │  Hook Lifecycle     │  │ RAG Knowledge  │  │
│  │   (6 tables)        │  │  (2 tables)         │  │ (2 tables)     │  │
│  │   Migration: 001    │  │  Migration: 002     │  │ Migration: 003 │  │
│  └─────────────────────┘  └─────────────────────┘  └────────────────┘  │
│                                                                         │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────┐  │
│  │   FTA Fault Tree    │  │  Code Analysis      │  │ Memory System  │  │
│  │   (2 tables)        │  │  (2 tables)         │  │ (2 tables)     │  │
│  │   Migration: 004    │  │  Migration: 005     │  │ Migration: 006 │  │
│  └─────────────────────┘  └─────────────────────┘  └────────────────┘  │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Performance Indexes — Migration: 007                            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

## Entity Relationship Diagram

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

**Foreign Key Relationships:**

| FK 列 | 所属表 | 引用表 | 引用列 | 删除策略 |
|--------|--------|--------|--------|----------|
| `workflow_id` | `workflow_executions` | `workflows` | `id` | CASCADE |
| `hook_id` | `hook_executions` | `hooks` | `id` | CASCADE |
| `document_id` | `rag_ingestion_history` | `rag_documents` | `id` | SET NULL |
| `document_id` | `fta_analysis_results` | `fta_documents` | `id` | CASCADE |
| `analysis_id` | `code_analysis_findings` | `code_analyses` | `id` | CASCADE |

---

## Group 1: Core Registry (Migration 001)

核心注册中心，管理 Agent、Skill、Workflow、Model 和审计日志，是平台的基础元数据层。

### agents

Agent 实例的注册表，存储配置、元数据和运行状态。

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | NO | `uuid_generate_v4()` | 主键 |
| **name** | `VARCHAR(255)` UNIQUE | NO | - | Agent 唯一名称 |
| display_name | `VARCHAR(255)` | YES | - | 展示名称 |
| description | `TEXT` | YES | - | 描述信息 |
| version | `VARCHAR(50)` | NO | `'0.1.0'` | 版本号 |
| status | `VARCHAR(50)` | NO | `'inactive'` | 运行状态 (active/inactive/error) |
| config | `JSONB` | NO | `'{}'` | 配置信息 (model, max_tokens 等) |
| metadata | `JSONB` | NO | `'{}'` | 扩展元数据 |
| created_at | `TIMESTAMPTZ` | NO | `NOW()` | 创建时间 |
| updated_at | `TIMESTAMPTZ` | NO | `NOW()` | 更新时间 (trigger) |

**Indexes:** `idx_agents_name(name)`, `idx_agents_status(status)`

### skills

所有可用 Skill 的定义，包括版本和 Manifest 元数据。

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | NO | `uuid_generate_v4()` | 主键 |
| **name** | `VARCHAR(255)` UNIQUE | NO | - | Skill 唯一名称 |
| display_name | `VARCHAR(255)` | YES | - | 展示名称 |
| description | `TEXT` | YES | - | 描述信息 |
| version | `VARCHAR(50)` | NO | `'0.1.0'` | 版本号 |
| category | `VARCHAR(100)` | YES | - | 分类 (ops/analysis/...) |
| manifest | `JSONB` | NO | `'{}'` | Manifest 元数据 (entry_point 等) |
| status | `VARCHAR(50)` | NO | `'inactive'` | 状态 (inactive/installed/...) |
| created_at | `TIMESTAMPTZ` | NO | `NOW()` | 创建时间 |
| updated_at | `TIMESTAMPTZ` | NO | `NOW()` | 更新时间 (trigger) |

**Indexes:** `idx_skills_name(name)`, `idx_skills_category(category)`

### workflows

工作流定义表，主要用于 FTA 故障树场景。

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | NO | `uuid_generate_v4()` | 主键 |
| **name** | `VARCHAR(255)` UNIQUE | NO | - | 工作流唯一名称 |
| display_name | `VARCHAR(255)` | YES | - | 展示名称 |
| description | `TEXT` | YES | - | 描述信息 |
| version | `VARCHAR(50)` | NO | `'0.1.0'` | 版本号 |
| workflow_type | `VARCHAR(50)` | NO | `'fta'` | 类型 (fta/...) |
| definition | `JSONB` | NO | `'{}'` | 工作流定义 (top_event, gates, events) |
| status | `VARCHAR(50)` | NO | `'draft'` | 状态 (draft/active/archived) |
| created_at | `TIMESTAMPTZ` | NO | `NOW()` | 创建时间 |
| updated_at | `TIMESTAMPTZ` | NO | `NOW()` | 更新时间 (trigger) |

**Indexes:** `idx_workflows_name(name)`, `idx_workflows_type(workflow_type)`

### workflow_executions

工作流执行记录，通过 `workflow_id` FK 关联到 `workflows`。

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | NO | `uuid_generate_v4()` | 主键 |
| workflow_id | `UUID` FK | NO | - | 关联工作流 ID |
| status | `VARCHAR(50)` | NO | `'pending'` | 执行状态 (pending/running/completed/failed) |
| input | `JSONB` | NO | `'{}'` | 输入数据 |
| output | `JSONB` | YES | `'{}'` | 输出数据 |
| error | `TEXT` | YES | - | 错误信息 |
| started_at | `TIMESTAMPTZ` | YES | - | 开始时间 |
| completed_at | `TIMESTAMPTZ` | YES | - | 完成时间 |
| created_at | `TIMESTAMPTZ` | NO | `NOW()` | 创建时间 |

**Foreign Key:** `workflow_id → workflows(id) ON DELETE CASCADE`
**Indexes:** `idx_workflow_executions_workflow(workflow_id)`, `idx_workflow_executions_status(status)`

### models

LLM 模型注册表，存储提供商、参数限制和启用状态。

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | NO | `uuid_generate_v4()` | 主键 |
| **model_id** | `VARCHAR(255)` UNIQUE | NO | - | 模型唯一标识 (如 qwen-plus) |
| provider | `VARCHAR(100)` | NO | - | 模型提供商 |
| model_name | `VARCHAR(255)` | NO | - | 模型名称 |
| max_tokens | `INTEGER` | NO | `8192` | 最大 Token 数 |
| default_temp | `REAL` | YES | `0.7` | 默认温度 |
| enabled | `BOOLEAN` | NO | `true` | 是否启用 |
| config | `JSONB` | NO | `'{}'` | 扩展配置 |
| created_at | `TIMESTAMPTZ` | NO | `NOW()` | 创建时间 |
| updated_at | `TIMESTAMPTZ` | NO | `NOW()` | 更新时间 (trigger) |

**Indexes:** `idx_models_provider(provider)`

### audit_log

操作审计追踪表，记录所有实体的变更历史。唯一使用 `BIGSERIAL` 主键的表。

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **id** | `BIGSERIAL` PK | NO | auto-increment | 自增主键 |
| entity_type | `VARCHAR(50)` | NO | - | 实体类型 (agent/skill/workflow/...) |
| entity_id | `UUID` | NO | - | 实体 ID |
| action | `VARCHAR(50)` | NO | - | 操作类型 (create/update/delete/...) |
| actor | `VARCHAR(255)` | YES | - | 操作者 |
| details | `JSONB` | YES | `'{}'` | 变更详情 |
| created_at | `TIMESTAMPTZ` | NO | `NOW()` | 创建时间 |

**Indexes:** `idx_audit_log_entity(entity_type, entity_id)`, `idx_audit_log_created(created_at)`

---

## Group 2: Hook Lifecycle (Migration 002)

生命周期 Hook 管理，支持 pre/post 执行和错误处理等触发点，实现 Agent 执行链路的可扩展拦截。

### hooks

Hook 定义表，注册不同触发点的回调处理器。

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | NO | `uuid_generate_v4()` | 主键 |
| **name** | `VARCHAR(255)` UNIQUE | NO | - | Hook 唯一名称 |
| description | `TEXT` | YES | - | 描述信息 |
| hook_type | `VARCHAR(50)` | NO | - | Hook 类型 (pre/post/on_error) |
| trigger_point | `VARCHAR(100)` | NO | - | 触发点 (agent.execute, skill.invoke 等) |
| target_id | `VARCHAR(255)` | YES | - | 目标实体 ID (为空则全局生效) |
| execution_order | `INTEGER` | NO | `0` | 执行顺序 (升序) |
| handler_type | `VARCHAR(50)` | NO | - | 处理器类型 (log_trace, auto_retry 等) |
| config | `JSONB` | NO | `'{}'` | 配置信息 |
| enabled | `BOOLEAN` | NO | `true` | 是否启用 |
| labels | `JSONB` | YES | `'{}'` | 标签 |
| created_at | `TIMESTAMPTZ` | NO | `NOW()` | 创建时间 |
| updated_at | `TIMESTAMPTZ` | NO | `NOW()` | 更新时间 (trigger) |

**Indexes:** `idx_hooks_trigger(trigger_point)`, `idx_hooks_enabled(enabled) WHERE enabled = true`, `idx_hooks_target(target_id) WHERE target_id IS NOT NULL`

### hook_executions

Hook 执行记录，追踪每次 Hook 触发的输入输出和耗时。

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | NO | `uuid_generate_v4()` | 主键 |
| hook_id | `UUID` FK | NO | - | 关联 Hook ID |
| trigger_event | `VARCHAR(100)` | NO | - | 触发事件 |
| target_entity_id | `VARCHAR(255)` | YES | - | 目标实体 ID |
| status | `VARCHAR(50)` | NO | `'pending'` | 执行状态 |
| input_data | `JSONB` | YES | `'{}'` | 输入数据 |
| output_data | `JSONB` | YES | `'{}'` | 输出数据 |
| error | `TEXT` | YES | - | 错误信息 |
| duration_ms | `INTEGER` | YES | - | 执行耗时 (ms) |
| started_at | `TIMESTAMPTZ` | YES | - | 开始时间 |
| completed_at | `TIMESTAMPTZ` | YES | - | 完成时间 |
| created_at | `TIMESTAMPTZ` | NO | `NOW()` | 创建时间 |

**Foreign Key:** `hook_id → hooks(id) ON DELETE CASCADE`
**Indexes:** `idx_hook_exec_hook(hook_id)`, `idx_hook_exec_status(status)`

---

## Group 3: RAG Knowledge (Migration 003)

RAG 知识库文档元数据管理。向量数据由外部 Milvus/Qdrant 存储，本表仅管理文档注册和摄取追踪。

### rag_documents

RAG 文档元数据表，包含分块信息和向量引用。

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | NO | `uuid_generate_v4()` | 主键 |
| collection_id | `VARCHAR(255)` | NO | - | 所属集合 ID |
| title | `VARCHAR(512)` | YES | - | 文档标题 |
| source_uri | `VARCHAR(1024)` | YES | - | 来源 URI (S3/HTTP/...) |
| content_hash | `VARCHAR(128)` | YES | - | 内容哈希 (去重用) |
| content_type | `VARCHAR(100)` | YES | - | 内容类型 (MIME) |
| chunk_count | `INTEGER` | YES | `0` | 分块数量 |
| vector_ids | `TEXT[]` | YES | - | 关联向量 ID 列表 (外部向量库) |
| metadata | `JSONB` | NO | `'{}'` | 元数据 |
| status | `VARCHAR(50)` | NO | `'pending'` | 状态 (pending/indexing/indexed/error) |
| size_bytes | `BIGINT` | YES | `0` | 文件大小 (bytes) |
| created_at | `TIMESTAMPTZ` | NO | `NOW()` | 创建时间 |
| updated_at | `TIMESTAMPTZ` | NO | `NOW()` | 更新时间 (trigger) |

**Indexes:** `idx_rag_docs_collection(collection_id)`, `idx_rag_docs_hash(content_hash)`, `idx_rag_docs_status(status)`

### rag_ingestion_history

文档摄取过程的追踪记录。`document_id` 使用 SET NULL 策略，即使原文档被删除，摄取历史仍然保留。

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | NO | `uuid_generate_v4()` | 主键 |
| collection_id | `VARCHAR(255)` | NO | - | 集合 ID |
| document_id | `UUID` FK | YES | - | 关联文档 ID |
| action | `VARCHAR(50)` | NO | - | 操作类型 (ingest/re-ingest/delete) |
| status | `VARCHAR(50)` | NO | `'pending'` | 状态 |
| chunks_processed | `INTEGER` | YES | `0` | 已处理分块数 |
| vectors_created | `INTEGER` | YES | `0` | 已创建向量数 |
| error | `TEXT` | YES | - | 错误信息 |
| duration_ms | `INTEGER` | YES | - | 耗时 (ms) |
| metadata | `JSONB` | YES | `'{}'` | 元数据 (如 embedding_model) |
| created_at | `TIMESTAMPTZ` | NO | `NOW()` | 创建时间 |

**Foreign Key:** `document_id → rag_documents(id) ON DELETE SET NULL`
**Indexes:** `idx_rag_ingest_collection(collection_id)`

---

## Group 4: FTA Fault Tree (Migration 004)

故障树分析 (Fault Tree Analysis) 文档管理和分析结果持久化。

### fta_documents

故障树定义文档，以 JSONB 存储完整的故障树结构。

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | NO | `uuid_generate_v4()` | 主键 |
| workflow_id | `VARCHAR(64)` | YES | - | 关联工作流 ID |
| name | `VARCHAR(255)` | NO | - | 文档名称 |
| description | `TEXT` | YES | - | 描述信息 |
| fault_tree | `JSONB` | NO | `'{}'` | 故障树定义 (top_event, gates, events) |
| version | `INTEGER` | NO | `1` | 版本号 |
| status | `VARCHAR(50)` | NO | `'draft'` | 状态 (draft/published/archived) |
| metadata | `JSONB` | YES | `'{}'` | 元数据 |
| labels | `JSONB` | YES | `'{}'` | 标签 (domain: k8s/rds/...) |
| created_by | `VARCHAR(255)` | YES | - | 创建者 |
| created_at | `TIMESTAMPTZ` | NO | `NOW()` | 创建时间 |
| updated_at | `TIMESTAMPTZ` | NO | `NOW()` | 更新时间 (trigger) |

**Indexes:** `idx_fta_docs_workflow(workflow_id) WHERE workflow_id IS NOT NULL`, `idx_fta_docs_status(status)`

### fta_analysis_results

故障树分析执行结果，包含最小割集、基本事件概率和门逻辑结果。

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | NO | `uuid_generate_v4()` | 主键 |
| document_id | `UUID` FK | NO | - | 关联 FTA 文档 ID |
| execution_id | `UUID` | YES | - | 关联执行 ID |
| top_event_result | `BOOLEAN` | YES | - | 顶事件结果 |
| minimal_cut_sets | `JSONB` | YES | `'[]'` | 最小割集 |
| basic_event_probabilities | `JSONB` | YES | `'{}'` | 基本事件概率 |
| gate_results | `JSONB` | YES | `'{}'` | 门逻辑结果 |
| importance_measures | `JSONB` | YES | `'{}'` | 重要度指标 |
| status | `VARCHAR(50)` | NO | `'completed'` | 状态 |
| duration_ms | `INTEGER` | YES | - | 分析耗时 (ms) |
| context | `JSONB` | YES | `'{}'` | 上下文信息 |
| created_at | `TIMESTAMPTZ` | NO | `NOW()` | 创建时间 |

**Foreign Key:** `document_id → fta_documents(id) ON DELETE CASCADE`
**Indexes:** `idx_fta_results_doc(document_id)`

---

## Group 5: Code Analysis (Migration 005)

代码静态分析记录和发现项管理，支持多种分析器和 CI/CD 集成。

### code_analyses

代码分析任务记录表。

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | NO | `uuid_generate_v4()` | 主键 |
| name | `VARCHAR(255)` | NO | - | 分析名称 |
| repository_url | `VARCHAR(1024)` | YES | - | 仓库 URL |
| branch | `VARCHAR(255)` | YES | - | 分支 |
| commit_sha | `VARCHAR(64)` | YES | - | Commit SHA |
| language | `VARCHAR(50)` | YES | - | 编程语言 |
| analyzer_type | `VARCHAR(100)` | NO | - | 分析器类型 (golangci-lint, pylint, ...) |
| config | `JSONB` | NO | `'{}'` | 配置 |
| status | `VARCHAR(50)` | NO | `'pending'` | 状态 (pending/running/completed/failed) |
| summary | `JSONB` | YES | `'{}'` | 分析摘要 (total_findings, severity 统计) |
| duration_ms | `INTEGER` | YES | - | 耗时 (ms) |
| labels | `JSONB` | YES | `'{}'` | 标签 |
| triggered_by | `VARCHAR(255)` | YES | - | 触发者 (ci-pipeline/manual/...) |
| started_at | `TIMESTAMPTZ` | YES | - | 开始时间 |
| completed_at | `TIMESTAMPTZ` | YES | - | 完成时间 |
| created_at | `TIMESTAMPTZ` | NO | `NOW()` | 创建时间 |
| updated_at | `TIMESTAMPTZ` | NO | `NOW()` | 更新时间 (trigger) |

**Indexes:** `idx_code_analyses_status(status)`, `idx_code_analyses_repo(repository_url) WHERE repository_url IS NOT NULL`

### code_analysis_findings

单个代码分析发现条目，包含精确的文件位置和修复建议。

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | NO | `uuid_generate_v4()` | 主键 |
| analysis_id | `UUID` FK | NO | - | 关联分析 ID |
| rule_id | `VARCHAR(255)` | NO | - | 规则 ID (errcheck, govet, ...) |
| severity | `VARCHAR(50)` | NO | - | 严重程度 (critical/high/medium/low/info) |
| category | `VARCHAR(100)` | YES | - | 分类 (error-handling, correctness, ...) |
| message | `TEXT` | NO | - | 发现描述 |
| file_path | `VARCHAR(1024)` | YES | - | 文件路径 |
| line_start | `INTEGER` | YES | - | 起始行 |
| line_end | `INTEGER` | YES | - | 结束行 |
| column_start | `INTEGER` | YES | - | 起始列 |
| column_end | `INTEGER` | YES | - | 结束列 |
| snippet | `TEXT` | YES | - | 代码片段 |
| suggestion | `TEXT` | YES | - | 修复建议 |
| metadata | `JSONB` | YES | `'{}'` | 元数据 |
| created_at | `TIMESTAMPTZ` | NO | `NOW()` | 创建时间 |

**Foreign Key:** `analysis_id → code_analyses(id) ON DELETE CASCADE`
**Indexes:** `idx_code_findings_analysis(analysis_id)`, `idx_code_findings_severity(severity)`

---

## Group 6: Memory System (Migration 006)

Agent 记忆系统，分为短期记忆 (会话内对话历史) 和长期记忆 (跨会话知识) 两层。

### memory_short_term

会话级对话历史，按 `(conversation_id, sequence_num)` 唯一约束保证消息顺序。

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | NO | `uuid_generate_v4()` | 主键 |
| agent_id | `VARCHAR(255)` | NO | - | Agent ID |
| conversation_id | `VARCHAR(255)` | NO | - | 会话 ID |
| role | `VARCHAR(50)` | NO | - | 角色 (user/assistant/system) |
| content | `TEXT` | NO | - | 消息内容 |
| token_count | `INTEGER` | YES | `0` | Token 数量 |
| metadata | `JSONB` | YES | `'{}'` | 元数据 (model, latency 等) |
| sequence_num | `INTEGER` | NO | - | 序列号 |
| created_at | `TIMESTAMPTZ` | NO | `NOW()` | 创建时间 |

**Constraints:** `UNIQUE (conversation_id, sequence_num)`
**Indexes:** `idx_mem_short_conv(conversation_id, sequence_num)`, `idx_mem_short_agent(agent_id)`

### memory_long_term

跨会话的知识存储，支持重要度评分、访问计数、TTL 过期和外部嵌入向量关联。

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| **id** | `UUID` PK | NO | `uuid_generate_v4()` | 主键 |
| agent_id | `VARCHAR(255)` | NO | - | Agent ID |
| user_id | `VARCHAR(255)` | YES | - | 用户 ID |
| memory_type | `VARCHAR(50)` | NO | - | 记忆类型 (fact/summary/preference/...) |
| content | `TEXT` | NO | - | 记忆内容 |
| importance | `REAL` | YES | `0.5` | 重要度 (0.0-1.0) |
| access_count | `INTEGER` | YES | `0` | 访问次数 |
| source_conversations | `TEXT[]` | YES | - | 来源会话 ID 列表 |
| embedding_id | `VARCHAR(255)` | YES | - | 嵌入向量 ID (外部向量库) |
| metadata | `JSONB` | YES | `'{}'` | 元数据 |
| expires_at | `TIMESTAMPTZ` | YES | - | 过期时间 (null 表示永不过期) |
| last_accessed_at | `TIMESTAMPTZ` | YES | `NOW()` | 最后访问时间 |
| created_at | `TIMESTAMPTZ` | NO | `NOW()` | 创建时间 |
| updated_at | `TIMESTAMPTZ` | NO | `NOW()` | 更新时间 (trigger) |

**Indexes:** `idx_mem_long_agent(agent_id)`, `idx_mem_long_user(user_id) WHERE user_id IS NOT NULL`, `idx_mem_long_type(memory_type)`, `idx_mem_long_importance(importance DESC)`

---

## Migration Strategy

### Migration Files

| 序号 | 文件 | 内容 | 表数量 |
|------|------|------|--------|
| 001 | `001_init.up.sql` | Core Registry + Extensions + Triggers + Grants | 6 |
| 002 | `002_hooks.up.sql` | Hook 定义和执行记录 | 2 |
| 003 | `003_rag_documents.up.sql` | RAG 文档元数据和摄取历史 | 2 |
| 004 | `004_fta_documents.up.sql` | FTA 故障树文档和分析结果 | 2 |
| 005 | `005_code_analysis.up.sql` | 代码分析记录和发现 | 2 |
| 006 | `006_memory.up.sql` | 短期/长期记忆 | 2 |
| 007 | `007_indexes.up.sql` | 002-006 表的性能索引 | 0 (仅索引) |

### Inline Versioning (Dev Mode)

Go 平台层使用内联迁移系统进行开发环境的 Schema 版本管理：

- 迁移版本记录在 `schema_migrations` 表中
- 每个版本对应一组 DDL 操作 (v1-v13)
- `CREATE TABLE IF NOT EXISTS` 保证幂等性
- 应用启动时自动检查并执行未应用的迁移

### Production Migrations

生产环境使用 `scripts/migration/` 目录下的独立 SQL 文件：

- 每个迁移文件包含 `up.sql` (升级) 和 `down.sql` (回滚)
- 通过外部迁移工具 (如 golang-migrate) 按序执行
- 所有表创建在 `resolveagent` Schema 下
- `001_init.up.sql` 额外处理: Extensions (uuid-ossp, pg_trgm)、Schema 创建、Trigger 函数、权限授予

---

## Storage Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Go Platform Layer                              │
│                    (Single Source of Truth)                              │
│                                                                         │
│  ┌─────────────┐    ┌─────────────────┐    ┌──────────────────────┐    │
│  │  Registry    │    │ PostgreSQL Store │    │  Inline Migration    │    │
│  │  Interfaces  │───►│ Implementations │    │  System (v1-v13)     │    │
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
│                          Python Runtime                                 │
│                                                                         │
│  ┌─────────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │  Store Clients   │    │ Hook Runner  │    │ Memory Manager       │   │
│  │  (store/         │    │ (hooks/      │    │ (agent/memory.py)    │   │
│  │   *_client.py)   │    │  runner.py)  │    │                      │   │
│  └─────────────────┘    └──────────────┘    └──────────────────────┘   │
│                                                                         │
│  Clients: HookClient, RAGDocumentClient, FTADocumentClient,            │
│           CodeAnalysisClient, MemoryClient                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Registry Pattern

每个 Store 领域遵循统一的分层模式：

1. **Interface** (`pkg/registry/*.go`): 定义 CRUD + 领域特定操作
2. **InMemory** (`pkg/registry/inmemory_*.go`): 基于 `sync.RWMutex` 的内存实现，用于测试
3. **PostgreSQL** (`pkg/store/postgres/*_store.go`): 基于 `pgx/v5` 连接池的生产实现
4. **REST API** (`pkg/server/router.go`): HTTP 路由暴露 Registry 操作
5. **Python Client** (`python/src/resolveagent/store/*_client.py`): 基于 `httpx` 的异步 HTTP 客户端

---

## Index Strategy (Migration 007)

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

## Frontend Schema Integration

数据库 Schema 在前端以 TypeScript 类型化数据维护，供 WebUI 的 ER 关系图可视化组件使用：

- **数据源**: `web/src/data/dbSchema.ts` - 从迁移文件逐字段转录的完整 Schema 定义
- **可视化**: `web/src/pages/Database/RelationshipTab.tsx` - 基于 ReactFlow 的 ER 关系图
- **类型定义**: `ColumnDef`, `ForeignKeyDef`, `IndexDef`, `TableDef`, `TableGroup`
- **分组配色**: Core Registry (blue), Hook Lifecycle (purple), RAG Knowledge (emerald), FTA Fault Tree (amber), Code Analysis (cyan), Memory System (rose)
- **关系渲染**: CASCADE 外键显示为实线动画边, SET NULL 显示为虚线边

---

## See Also

- [Architecture Overview](overview.md) - 系统整体架构
- [FTA Engine](fta-engine.md) - 故障树分析引擎详细文档
- `scripts/migration/` - 生产环境 SQL 迁移文件
- `web/src/data/dbSchema.ts` - 前端 TypeScript Schema 定义
- `pkg/registry/` - Go Registry 接口定义
- `pkg/store/postgres/` - PostgreSQL 存储实现
