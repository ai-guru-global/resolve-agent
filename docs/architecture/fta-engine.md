# FTA Workflow Engine

The Fault Tree Analysis (FTA) engine executes structured decision trees for systematic root cause diagnosis. It is the core diagnostic engine in ResolveAgent, enabling automated fault isolation through hierarchical event decomposition.

**Location**: `python/src/resolveagent/fta/`

## Concepts

### Fault Tree

A **Directed Acyclic Graph (DAG)** of events connected by logical gates. The tree starts from a top-level event (e.g., "Service Unavailable") and breaks down into increasingly specific conditions.

### Basic Events (Leaf Nodes)

Leaf nodes are evaluated by pluggable backends:

| Backend | Use Case | Example |
|---------|----------|----------|
| **Skills** | Execute diagnostic tools | Run `kubectl describe pod`, check log patterns |
| **RAG** | Query knowledge base | Search runbooks for known failure modes |
| **LLM** | Reason about ambiguous evidence | Analyze log snippets for anomaly patterns |
| **Metrics** | Check monitoring data | Evaluate Prometheus query thresholds |

### Gate Types

| Gate | Logic | Description |
|------|-------|-------------|
| **AND** | All inputs must be true | All conditions required (e.g., both high CPU AND high memory) |
| **OR** | Any input can be true | Any condition sufficient (e.g., disk full OR inode exhaustion) |
| **VOTING (k-of-n)** | At least k of n inputs | Quorum-based decision (e.g., 2 of 3 health checks fail) |
| **INHIBIT** | Conditional gate | True only if condition is met AND inhibit condition is absent |
| **PRIORITY-AND** | Ordered AND gate | Inputs must be true in specified order (sequential failure chain) |

### Cut Sets

Minimal combinations of basic events that cause the top event. Used for:

- **Risk Assessment**: Identifying single points of failure
- **Prioritization**: Ranking diagnostic paths by likelihood
- **Optimization**: Pruning low-probability branches early

## Evaluation Process

```
                         ┌───────────────┐
                         │  Top Event    │
                         │  (Root Cause) │
                         └───────┬───────┘
                                │
                         ┌─────┴─────┐
                         │  AND Gate   │
                         └──┬─────┬──┘
                            │         │
                    ┌─────┴───┐  ┌─┴───────┐
                    │ Condition │  │ OR Gate  │
                    │  (Skill)  │  └─┬────┬──┘
                    └──────────┘    │      │
                              ┌───┴───┐ ┌┴──────┐
                              │ Check │ │ Query  │
                              │ (RAG) │ │ (LLM)  │
                              └───────┘ └───────┘
```

1. **Parse tree definition** — Load YAML/JSON tree structure
2. **Identify leaf events** — Discover all basic events to evaluate
3. **Evaluate leaves** — Invoke Skills, RAG queries, or LLM calls per leaf
4. **Propagate through gates bottom-up** — Apply gate logic from leaves to root
5. **Compute top event result** — Determine if the fault condition is met
6. **Generate diagnosis report** — Trace active path and contributing events

## Tree Definition Format

Fault trees are defined in YAML:

```yaml
tree:
  id: service-unavailable
  name: "Service Unavailable Diagnosis"
  top_event: service_down
  events:
    - id: service_down
      gate: AND
      inputs: [network_issue, app_crash]
    - id: network_issue
      gate: OR
      inputs: [dns_failure, lb_unhealthy]
    - id: dns_failure
      type: basic
      evaluator: skill
      skill_name: dns-check
    - id: lb_unhealthy
      type: basic
      evaluator: rag
      collection: runbooks
      query: "load balancer health check failures"
    - id: app_crash
      type: basic
      evaluator: skill
      skill_name: pod-status-check
```

## Key Components

| Component | File | Description |
|-----------|------|-------------|
| `FaultTree` | `fta/tree.py` | Tree data structure and parsing |
| `FTAEvaluator` | `fta/evaluator.py` | Bottom-up evaluation engine |
| `GateLogic` | `fta/gates.py` | Gate type implementations (AND/OR/VOTING/etc.) |
| `CutSetAnalyzer` | `fta/analysis.py` | Minimal cut set computation |
| `TreeBuilder` | `fta/builder.py` | Programmatic tree construction |
| `FTAReport` | `fta/report.py` | Diagnosis report generation |

## Integration Points

- **Intelligent Selector**: Routes `workflow` type decisions to the FTA engine
- **Skill Executor**: FTA leaf nodes can invoke registered skills
- **RAG Pipeline**: FTA leaf nodes can query knowledge collections
- **Event Bus**: FTA completion events published to NATS for monitoring

## See Also

- [Architecture Overview](overview.md) — System-level architecture
- [Intelligent Selector](intelligent-selector.md) — Routes requests to FTA engine
- [Ticket Summary Agent](ticket-summary-agent.md) — Summarizes FTA diagnostic results
- [Chinese Guide](../zh/fta-engine.md) — Comprehensive Chinese documentation
