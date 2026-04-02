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
│           Authentication | Rate Limiting | Model Routing          │
└───────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│               PLATFORM SERVICES (Go)                              │
│  Location: cmd/resolveagent-server/, pkg/                           │
│                                                                    │
│  • API Server (HTTP/gRPC)    • Agent Registry                     │
│  • Skill Registry            • Workflow Registry                  │
│  • Configuration Management  • Event Bus (NATS)                   │
│  • Telemetry (OpenTelemetry)                                      │
└───────────────────────────────┬──────────────────────────────────┘
                               │ gRPC
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
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  LLM PROVIDER ABSTRACTION (llm/)                              │  │
│  │  Qwen | Wenxin | Zhipu | OpenAI Compatible                   │  │
│  └────────────────────────────────────────────────────────────┘  │
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

- **API Server** (`pkg/server/`): HTTP and gRPC endpoints for all operations
- **Registries** (`pkg/registry/`): Agent, Skill, and Workflow management (Single Source of Truth)
- **Gateway Integration** (`pkg/gateway/`): Higress AI gateway client, route sync, model routing
- **Event Bus** (`pkg/event/`): NATS-based event-driven communication
- **Telemetry** (`pkg/telemetry/`): OpenTelemetry-based observability
- **Authentication** (`pkg/server/middleware/`): Unified auth middleware working with Higress

### Agent Runtime (Python)

**Location**: `python/src/resolveagent/`

The Python runtime powered by AgentScope provides:

- **Agent Definitions** (`agent/`): BaseAgent, MegaAgent implementations
- **Intelligent Selector** (`selector/`): Adaptive workflow routing (internal only)
- **FTA Engine** (`fta/`): Advanced static analysis with fault tree logic
- **Skills System** (`skills/`): Expert skills with sandboxed execution
- **RAG Pipeline** (`rag/`): Knowledge ingestion, indexing, and retrieval
- **LLM Abstraction** (`llm/`): Multi-provider LLM support via Higress gateway
- **Doc Sync** (`docsync/`): Bilingual document synchronization
- **Registry Client** (`runtime/registry_client.py`): gRPC client to query Go Registry

### CLI/TUI (Go)

**Location**: `cmd/resolveagent-cli/`, `internal/cli/`, `internal/tui/`

- Command-line interface for all platform operations
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

## See Also

- [AgentScope & Higress Integration](agentscope-higress-integration.md) - Deep integration architecture
- [Intelligent Selector](intelligent-selector.md) - Adaptive workflow routing engine
- [FTA Engine](fta-engine.md) - Advanced static analysis capabilities
- [Ticket Summary Agent](ticket-summary-agent.md) - Knowledge production engine for ticket summarization
- [Ticket Summary Agent Integration](ticket-summary-agent-integration-analysis.md) - Integration feasibility and implementation plan
