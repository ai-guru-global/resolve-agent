# Architecture Overview

ResolveAgent is the ultimate Agent-driven AIOps platform, combining Advanced Static Analysis, RAG, Adaptive Workflows, and Expert Skills to deliver intelligent, autonomous operations management.

## Core Capabilities

ResolveAgent integrates four key technologies to provide comprehensive AIOps capabilities:

| Capability | Description | Implementation |
|------------|-------------|----------------|
| **Advanced Static Analysis** | Intelligent fault detection and root cause analysis using FTA | `python/src/resolveagent/fta/` |
| **RAG** | Semantic knowledge retrieval from operations documentation | `python/src/resolveagent/rag/` |
| **Adaptive Workflows** | Dynamic, context-aware routing and orchestration | `python/src/resolveagent/selector/` |
| **Expert Skills** | Pluggable domain expertise for AIOps scenarios | `python/src/resolveagent/skills/` |
| **Ticket Summary** | Knowledge production engine for organizational capability increments | `python/src/resolveagent/summary/` |

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                             │
│  CLI/TUI (Go)  |  WebUI (React+TS)  |  External API Consumers     │
└───────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                     HIGRESS AI/API GATEWAY                        │
│    Authentication | Rate Limiting | Model Routing | Route Sync    │
└───────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│               PLATFORM SERVICES (Go)                              │
│  Location: cmd/resolveagent-server/, pkg/                           │
│                                                                    │
│  • API Server (HTTP :8080 / gRPC :9090)                           │
│  • 9 Registries (Agent, Skill, Workflow, RAG, RAGDocument,        │
│    FTADocument, Hook, CodeAnalysis, Memory)                        │
│  • RuntimeClient (HTTP+SSE → Python :9091)                        │
│  • Configuration (Viper + YAML + env)  • Event Bus (NATS)         │
│  • Telemetry (OpenTelemetry)                                      │
└───────────────────────────────┬──────────────────────────────────┘
                               │ HTTP + SSE
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│           AGENT RUNTIME (Python / AgentScope)                     │
│  Location: python/src/resolveagent/                                  │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  INTELLIGENT SELECTOR (selector/) - Adaptive Workflows        │  │
│  │  Intent Analysis → Context Enrichment → Route Decision        │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                    │
│  ┌──────────────────┐ ┌───────────────┐ ┌─────────────────────┐  │
│  │  Advanced Static │ │ Expert Skills │ │    RAG Pipeline       │  │
│  │  Analysis (fta/) │ │  (skills/)    │ │       (rag/)          │  │
│  └──────────────────┘ └───────────────┘ └─────────────────────┘  │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐  │
│  │ Corpus Import│  │    Hooks     │  │ LLM PROVIDER ABSTRACTION │  │
│  │  (corpus/)   │  │  (hooks/)    │  │ Qwen|Wenxin|Zhipu|OpenAI │  │
│  └──────────────┘  └──────────────┘  └────────────────────────┘  │
└───────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                       DATA LAYER                                  │
│  PostgreSQL (Storage) | Redis (Cache) | NATS (Messaging)         │
│  Milvus/Qdrant (Vector Store)                                     │
└──────────────────────────────────────────────────────────────────┘
```

## Components

### Platform Services (Go)

**Location**: `cmd/resolveagent-server/`, `pkg/`

The Go-based platform layer provides:

- **API Server** (`pkg/server/`): Dual HTTP (:8080) and gRPC (:9090) endpoints for all operations
- **Registries** (`pkg/registry/`): 9 in-memory registries as Single Source of Truth
  - Core: Agent, Skill, Workflow
  - Knowledge: RAG, RAGDocument, FTADocument
  - Infrastructure: Hook, CodeAnalysis, Memory
  - Consistent CRUD interface with `ListOptions` (pagination, filtering, sorting)
- **Gateway Integration** (`pkg/gateway/`): Higress AI gateway client with route sync (every 30s), model routing, and route configuration
- **Runtime Client** (`pkg/runtime/`): HTTP client bridging Go platform to Python runtime on port 9091; supports SSE streaming for long-running operations (120s timeout)
- **Event Bus** (`pkg/event/`): NATS-based event-driven communication
- **Telemetry** (`pkg/telemetry/`): OpenTelemetry-based observability
- **Configuration** (`pkg/config/`): Viper-based YAML config with env var overrides (`RESOLVEAGENT_*` prefix); per-registry backend selection (memory/postgres)
- **Authentication** (`pkg/server/middleware/`): Unified auth middleware working with Higress

### Agent Runtime (Python)

**Location**: `python/src/resolveagent/`

The Python runtime powered by AgentScope provides:

- **Agent Definitions** (`agent/`): BaseAgent, MegaAgent with `selector_mode` support
- **Intelligent Selector** (`selector/`): Adaptive workflow routing with caching, protocol-based dispatch, and Hook/Skill adapters
- **FTA Engine** (`fta/`): Advanced static analysis with fault tree logic (AND/OR/NOT/VOTING/INHIBIT/PRIORITY_AND gates), minimal cut sets, Monte Carlo simulation, Fussell-Vesely importance
- **Skills System** (`skills/`): Expert skills with sandboxed execution (10s CPU, 512MB RAM limits); built-in: WebSearch (Bing/Google/Searx/DDG), CodeExecution (Python/Bash/JS), FileOps (path traversal protection)
- **RAG Pipeline** (`rag/`): Knowledge ingestion (MD/HTML/PDF/DOCX/JSON parsing, 5 chunking strategies, BGE embeddings via Dashscope), indexing (Milvus IVF_FLAT / Qdrant), retrieval with 3-tier reranking (cross-encoder / LLM / Jaccard+MMR fallback)
- **Corpus Import** (`corpus/`): Batch import from kudig-database Git repositories with FTA/Skill/RAG parsing, SSE progress streaming, and per-directory strategy mapping
- **Hooks** (`hooks/`): Lifecycle hooks with InMemoryHookClient for standalone operation
- **LLM Abstraction** (`llm/`): Multi-provider LLM support via Higress gateway
- **Doc Sync** (`docsync/`): Bilingual document synchronization
- **Registry Client** (`runtime/registry_client.py`): HTTP client to query Go Registry

### CLI/TUI (Go)

**Location**: `cmd/resolveagent-cli/`, `internal/cli/`, `internal/tui/`

- Command-line interface for all platform operations (Cobra-based with subcommands: agent, skill, workflow, rag, corpus, config)
- Bubbletea-based terminal dashboard
- Commands for agent, skill, workflow, and RAG management

### WebUI (React + TypeScript)

**Location**: `web/`

- React-based management console
- Visual workflow editor using React Flow
- Pages for Agent, Skill, Workflow, RAG, and Settings management

## Key Design Principles

1. **Agent-Driven**: All operations are orchestrated by intelligent agents
2. **Adaptive**: Workflows dynamically adjust based on context and outcomes
3. **Pluggable**: Skills and capabilities can be extended without core changes
4. **Observable**: Full telemetry with OpenTelemetry integration
5. **Cloud Native**: Kubernetes-first deployment with Helm and Kustomize
6. **Single Source of Truth**: Go Registry manages all service registrations, synced to Higress
7. **Unified Gateway**: All external traffic (including LLM calls) flows through Higress

## Go-Python Communication Bridge

The Go platform and Python runtime communicate via an HTTP bridge with SSE streaming:

```
┌─────────────────────┐                    ┌─────────────────────┐
│  Go Platform Server │   HTTP + SSE       │  Python Runtime     │
│  (port 8080/9090)   │ ──────────────────▶│  (FastAPI :9091)    │
│                     │                    │                     │
│  RuntimeClient      │   POST /execute    │  ExecutionEngine    │
│  - executeAgent()   │ ─────────────────▶ │  - run_agent()      │
│  - executeWorkflow()│   SSE streaming    │  - run_workflow()   │
│  - importCorpus()   │ ◀───────────────── │  - import_corpus()  │
│  - 120s timeout     │   text/event-stream│                     │
└─────────────────────┘                    └─────────────────────┘
```

Key characteristics:
- **SSE Streaming**: Long-running operations (agent execution, corpus import) stream progress events back to Go
- **RuntimeClient**: Go-side HTTP client with configurable timeouts (default 120s)
- **ExecutionEngine**: Python-side FastAPI endpoint dispatcher
- **RegistryClient**: Python-side HTTP client that queries Go registries for skills, workflows, and RAG collections

## Registry System

The Go platform maintains 9 in-memory registries with a consistent interface:

| Registry | Resource | Purpose |
|----------|----------|---------|
| **AgentRegistry** | Agent definitions | Agent lifecycle, configuration, status |
| **SkillRegistry** | Skill manifests | Skill discovery, version management |
| **WorkflowRegistry** | FTA workflows | Workflow definitions, tree structures |
| **RAGRegistry** | RAG collections | Collection metadata, embedding config |
| **RAGDocumentRegistry** | RAG documents | Individual document tracking |
| **FTADocumentRegistry** | FTA documents | Fault tree document management |
| **HookRegistry** | Hook definitions | Lifecycle hook configuration |
| **CodeAnalysisRegistry** | Analysis results | Static analysis result storage |
| **MemoryRegistry** | Agent memory | Conversation history, resolved issues |

All registries implement a consistent CRUD interface:

```go
type Registry[T any] interface {
    Create(ctx context.Context, item T) (T, error)
    Get(ctx context.Context, id string) (T, error)
    Update(ctx context.Context, id string, item T) (T, error)
    Delete(ctx context.Context, id string) error
    List(ctx context.Context, opts ListOptions) ([]T, error)
}

type ListOptions struct {
    Page     int
    PageSize int
    Filter   map[string]string
    Sort     string
}
```

Backend selection (memory or postgres) is configurable per-registry via `StoreConfig`.

## Higress Gateway Integration

Higress serves as the unified AI/API gateway with three core functions:

1. **Authentication & Rate Limiting**: JWT/API key validation, token-based and request-count rate limiting
2. **LLM Model Routing**: Routes LLM requests to different providers (Qwen/Wenxin/Zhipu/OpenAI-compatible) based on model ID
3. **Route Synchronization**: Go platform's `RouteSync` periodically (every 30s) pushes registered routes to Higress, ensuring the gateway always reflects current service topology

```
┌──────────────┐   route sync (30s)   ┌──────────────────┐
│  Go Registry │ ────────────────────▶ │  Higress Gateway │
│  (9 stores)  │                      │  - Auth           │
└──────────────┘                      │  - Rate Limit     │
                                      │  - Model Router   │
┌──────────────┐   LLM requests       │  - Load Balance   │
│  Python LLM  │ ────────────────────▶│                    │
│  Abstraction │                      └──────────────────┘
└──────────────┘                             │
                                             ▼
                                      ┌──────────────────┐
                                      │  LLM Providers   │
                                      │  Qwen / Wenxin / │
                                      │  Zhipu / OpenAI  │
                                      └──────────────────┘
```

## FTA / Skills / RAG Coordination

The three execution subsystems coordinate through the Intelligent Selector:

```
                    User Request
                         │
                         ▼
                ┌─────────────────┐
                │   MegaAgent     │
                │  (Orchestrator) │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │   Intelligent   │ ── Cache (SHA-256 key, TTL-LRU)
                │    Selector     │
                └────────┬────────┘
                         │ RouteDecision
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
   ┌───────────┐  ┌───────────┐  ┌───────────┐
   │ FTA Engine│  │  Skills   │  │    RAG    │
   │           │  │  System   │  │  Pipeline │
   └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
         │              │              │
         ▼              ▼              ▼
   Fault Tree     Sandboxed      Vector Search
   Analysis       Execution      + Reranking
```

- **FTA Engine**: Executes fault tree workflows for complex multi-step diagnostics. Supports AND/OR/NOT/VOTING/INHIBIT/PRIORITY_AND gate types, minimal cut set computation, and Monte Carlo simulation for probability analysis.
- **Skills System**: Executes atomic tool operations in sandboxed environments with resource limits (10s CPU, 512MB RAM). Built-in skills include web search (4 providers), code execution (3 languages), and file operations (with path traversal protection).
- **RAG Pipeline**: Retrieves and reranks knowledge from vector stores. Full pipeline: Parse (6 formats) -> Chunk (5 strategies including by_h2/by_h3/by_section) -> Embed (BGE via Dashscope) -> Index (Milvus IVF_FLAT) -> Search -> Rerank (3-tier: cross-encoder / LLM / Jaccard+MMR fallback).
- **Multi-route**: The selector can produce `route_type=multi` decisions that chain multiple subsystems in sequence (e.g., RAG retrieval followed by skill execution).

## Corpus Import Pipeline

The corpus import system enables batch ingestion from kudig-database Git repositories:

```
Git Clone ──▶ Directory Scan ──▶ Strategy Mapping ──▶ Parse ──▶ Index
                                      │
                    ┌─────────────────┼─────────────────┐
                    ▼                 ▼                 ▼
              FTA Documents     Skill Documents    RAG Documents
              (Mermaid+JSON)   (YAML front matter) (Heading-based)
                    │                 │                 │
                    ▼                 ▼                 ▼
              FaultTree +       AdaptedSkill +     Chunks +
              Base Events       Manifest           Embeddings
```

- **CorpusConfig**: Maps directory patterns to parsing strategies (e.g., `topic-fta/*` -> FTA parser, `domain-*` -> RAG with by_h2 chunking)
- **FTA Parser**: Extracts Mermaid diagrams and JSON metadata blocks from Markdown, producing FaultTree structures with events, gates, and base event parameters
- **Skill Adapter**: Converts kudig-format skills (YAML front matter + Markdown body) into AdaptedSkill objects with manifests and runbook sections
- **Progress Streaming**: Import progress is streamed via SSE events back to the Go platform

## See Also

- [Database Schema Architecture](database-schema.md) - Complete database design with 16 tables across 6 groups
- [AgentScope & Higress Integration](agentscope-higress-integration.md) - Deep integration architecture
- [Intelligent Selector](intelligent-selector.md) - Adaptive workflow routing engine
- [Selector Adapters](selector-adapters.md) - Hook/Skill adapter architecture and SelectorProtocol
- [FTA Engine](fta-engine.md) - Advanced static analysis capabilities
- [Ticket Summary Agent](ticket-summary-agent.md) - Knowledge production engine for ticket summarization
- [Ticket Summary Agent Integration](ticket-summary-agent-integration-analysis.md) - Integration feasibility and implementation plan
