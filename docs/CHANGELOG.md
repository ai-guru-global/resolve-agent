# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-04-07

### Added

- **WebUI Mock Data System** (`web/src/api/mock.ts`)
  - 7 realistic AIOps agents covering mega/fta/rag/skill/custom types
  - 6 operational skills (ticket-handler, log-analyzer, metric-alerter, etc.)
  - 5 FTA workflows (K8s NotReady, RDS replication lag, SLB health check, etc.)
  - 5 RAG knowledge base collections with real document/vector counts
  - Context-aware agent execution responses per agent type
  - Auto-detect backend availability with transparent mock fallback

### Changed

- **Unified deploy directory** — merged `deployment/docker/` (production configs) into `deploy/docker/`, eliminating duplicate deployment configurations
- **Cleaned root directory** — removed 6 process documents (DEVELOPMENT_PLAN, PROJECT_COMPLETION, QUALITY_REPORT, UNIMPLEMENTED, WEEK5_FIXES, WEEK6_FIXES), 2 committed binaries, and consolidated community governance files into `.github/`
- **Updated .gitignore** — added root-level binary exclusions, fixed stale `resolvenet` references to `resolveagent`

### Fixed

- **AgentList.tsx** — added missing `AgentStatus` type import, fixed default-to-named import for `api`, corrected `listAgents()` return value destructuring
- **DataTable.tsx** — removed trailing redundant `}` braces causing Babel parse errors
- **Playground** — fixed `listAgents()` response handling and `executeAgent()` content field access

## [0.2.0-beta] - 2026-04-02

### Added - Complete Feature Implementation

#### Week 5: Critical Gap Fixes
- **Go ↔ Python HTTP Bridge** (`pkg/server/runtime_client.go`, `python/src/resolveagent/runtime/http_server.py`)
  - HTTP + SSE streaming as gRPC alternative
  - Full Agent/Workflow/RAG/Skill forwarding from Go platform to Python runtime

- **RAG Vector Store** (`python/src/resolveagent/rag/pipeline.py`)
  - Real vector database queries replacing placeholder responses
  - Milvus index integration

- **Selector Registry Queries** (`python/src/resolveagent/selector/context_enricher.py`)
  - Real registry lookups replacing mock data

- **Built-in Skills** (`python/src/resolveagent/skills/builtin/file_ops.py`)
  - Complete file operations implementation (read, write, list, search)

#### Week 6: Final Polish (100% Feature Completion)
- Workflow validation logic in `pkg/server/router.go`
- LLM Strategy integration in selector
- OpenTelemetry span creation (Go) and OTLP exporter init (Python)
- Agent config loading and workflow registry loading
- E2E tests (3 test cases added)

#### Week 1-4: Core Implementation
- **PostgreSQL Storage Layer** (`pkg/store/postgres/`)
  - pgx connection pool with health checks
  - Automatic database migrations (5 schemas)
  - Full CRUD operations for agents, skills, workflows
  - Connection pool optimization (max 25 conns)

- **Redis Cache Layer** (`pkg/store/redis/`)
  - go-redis client with connection pooling
  - Get/Set/Delete operations with TTL support
  - JSON serialization helpers
  - Health check via PING

- **NATS JetStream** (`pkg/event/nats.go`)
  - Full NATS connection management
  - JetStream initialization with 4 streams
  - Publish/Subscribe with message persistence
  - Automatic ACK handling

- **LLM Providers** (`python/src/resolveagent/llm/`)
  - Qwen (通义千问) via DashScope API
  - Wenxin (文心一言) via Baidu Qianfan API with JWT auth
  - Zhipu (智谱清言) via GLM API with streaming
  - OpenAI-compatible layer for vLLM/Ollama

#### Week 2: CLI Tools (18 Commands)
- **Agent CLI** (`internal/cli/agent/`)
  - `agent create` - Create agents with YAML/config
  - `agent list` - List all agents with filters
  - `agent delete` - Delete with confirmation
  - `agent run` - Execute agents interactively
  - `agent logs` - View execution logs

- **Skill CLI** (`internal/cli/skill/`)
  - `skill list` - List installed skills
  - `skill info` - Show skill details
  - `skill install` - Install from local/git/registry
  - `skill remove` - Uninstall skills
  - `skill test` - Test skills with input

- **Workflow CLI** (`internal/cli/workflow/`)
  - `workflow create` - Create from YAML
  - `workflow list` - List all workflows
  - `workflow validate` - Validate definitions
  - `workflow visualize` - ASCII tree rendering
  - `workflow run` - Execute workflows

- **RAG CLI** (`internal/cli/rag/`)
  - `rag collection create/list/delete` - Manage collections
  - `rag ingest` - Document ingestion with chunking
  - `rag query` - Vector search queries

- **Config CLI** (`internal/cli/config/`)
  - `config init` - Initialize configuration
  - `config set/get/view` - Manage settings

#### Week 3: Core Engine Features
- **FTA Engine** (`python/src/resolveagent/fta/`)
  - MOCUS algorithm for minimal cut sets
  - Support for AND/OR/VOTING/INHIBIT/PRIORITY_AND gates
  - Cut set probability calculation
  - Importance ranking

- **FTA Evaluator** (`python/src/resolveagent/fta/evaluator.py`)
  - Skill execution integration
  - RAG query integration
  - LLM classification support
  - Static value and context evaluation

- **RAG Reranker** (`python/src/resolveagent/rag/retrieve/reranker.py`)
  - BGE-Reranker cross-encoder support
  - LLM-based reranking fallback
  - Frequency-based scoring fallback
  - MMR (Maximal Marginal Relevance) diversity selection

- **RAG Server API** (`pkg/server/router.go`)
  - Collection CRUD endpoints
  - Document ingestion API
  - Vector search queries
  - RAG Registry implementation

- **Execution Engine** (`python/src/resolveagent/runtime/engine.py`)
  - Full execution flow with streaming
  - Conversation history management
  - Intelligent Selector integration
  - Agent pool management

- **Skill Executor** (`python/src/resolveagent/skills/executor.py`)
  - Input/output validation (manifest schema)
  - Sandbox execution integration
  - Subprocess isolation
  - Execution history tracking

#### Week 4: Observability & WebUI
- **OpenTelemetry Tracing** (`pkg/telemetry/tracer.go`)
  - OTLP gRPC exporter
  - Distributed tracing support
  - Span management and event recording
  - Trace context propagation

- **OpenTelemetry Metrics** (`pkg/telemetry/metrics.go`)
  - Prometheus HTTP exporter
  - Runtime metrics (goroutines, memory)
  - Business metrics (requests, latency, agent executions)

- **Telemetry Middleware** (`pkg/server/middleware/telemetry.go`)
  - HTTP request tracing
  - Metrics collection
  - Response status capture

- **WebUI API Integration**
  - AgentCreate with API integration
  - AgentList with real-time data
  - Playground with agent execution

### Testing
- Unit tests for registry package (54.4% coverage)
- Unit tests for CLI client (30% coverage)
- Unit tests for telemetry package
- Go build and vet validation
- Python syntax validation

## [0.1.0-alpha] - 2026-03-22

### Added - Initial Release
- Project scaffolding with Go + Python + TypeScript
- Protocol Buffer API definitions
- Go platform services skeleton
- Go CLI with cobra/viper
- Go TUI with bubbletea
- Python agent runtime with AgentScope integration
- Intelligent Selector routing framework
- FTA Workflow Engine skeleton
- Skill System with manifest support
- RAG Pipeline framework
- React + TypeScript WebUI skeleton
- Docker Compose deployment
- Kubernetes/Helm charts
- CI/CD pipelines

## Migration Guide

### From 0.1.0-alpha to 0.2.0-beta

All APIs remain backward compatible. New features are additive only.

**Required Actions:**
1. Update dependencies: `make setup-dev`
2. Run database migrations: `resolveagent-server migrate`
3. Update LLM provider configurations if using Wenxin/Zhipu

**New Environment Variables:**
```bash
# OpenTelemetry
export OTEL_EXPORTER_OTLP_ENDPOINT="localhost:4317"
export OTEL_ENVIRONMENT="production"

# Prometheus Metrics
export PROMETHEUS_PORT="9090"
```
