# Intelligent Selector

The Intelligent Selector is the LLM-powered meta-router at the heart of ResolveAgent. It analyzes incoming requests through a sophisticated pipeline and determines the optimal processing path.

**Location**: `python/src/resolveagent/selector/`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    INTELLIGENT SELECTOR                      │
│                                                             │
│   Input ──▶ Intent Analyzer ──▶ Context Enricher ──▶ Router  │
│                                                             │
│   ┌───────────┬───────────┬───────────┬───────────────┐ │
│   │ Workflow  │  Skills   │    RAG    │ Code Analysis │ │
│   │   (FTA)   │  (Tools)  │ (Search)  │  (Static/AST)  │ │
│   └───────────┴───────────┴───────────┴───────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Routing Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| **Rule-based** | Pattern matching for known request types | High-frequency, well-defined requests |
| **LLM-based** | Uses a fast LLM for request classification | Ambiguous or novel requests |
| **Hybrid** (default) | Rules first, LLM fallback for low-confidence cases | Recommended for production |

The strategy is configurable per agent via `SelectorConfig` in the agent proto definition:

```python
selector = IntelligentSelector(strategy="hybrid")
decision = await selector.route(
    "Analyze this pod crash in namespace kube-system",
    agent_id="agent-001",
)
print(f"Route: {decision.route_type}, Confidence: {decision.confidence:.2f}")
```

## Route Types

| Route Type | Target | Description |
|------------|--------|-------------|
| `workflow` (FTA) | Fault Tree workflows | Complex multi-step diagnostic processes |
| `skill` | Registered skills | Specific tool execution (search, code exec, file ops) |
| `rag` | Knowledge collections | Retrieval-Augmented Generation from documents |
| `code_analysis` | Static analysis tools | Code review, security scanning, AST analysis |
| `direct` | LLM | Simple direct response without tool use |
| `multi` | Chained routes | Multiple routes composed in sequence |

## Processing Pipeline

### Stage 1: Intent Analysis

The `IntentAnalyzer` classifies user input into intent categories:

- **Intent Type**: diagnostic, knowledge_query, tool_execution, code_review, general
- **Entities**: Extracted key entities (service names, error codes, resource types)
- **Confidence**: Classification confidence score (0.0 - 1.0)
- **Sub-intents**: Secondary intent classifications for complex requests

### Stage 2: Context Enrichment

The `ContextEnricher` augments the classified intent with additional context:

- **Agent memory**: Previous conversation history and resolved issues
- **Available capabilities**: Currently registered skills and workflows
- **Code context**: Repository, file paths, language detection (for code-related requests)
- **Infrastructure context**: Kubernetes cluster, namespace, deployment information

### Stage 3: Route Decision

The selected strategy produces a `RouteDecision` with:

- **route_type**: Which execution engine to use
- **route_target**: Specific target within that engine (e.g., workflow ID, skill name)
- **confidence**: Decision confidence score
- **reasoning**: Human-readable explanation of the routing decision
- **chain**: For `multi` routes, ordered sub-decisions

## Key Components

| Component | File | Description |
|-----------|------|-------------|
| `IntelligentSelector` | `selector/selector.py` | Main orchestrator with strategy dispatch |
| `RouteDecision` | `selector/selector.py` | Pydantic model for routing output |
| `IntentAnalyzer` | `selector/intent.py` | NLP-powered intent classification |
| `ContextEnricher` | `selector/context_enricher.py` | Context augmentation pipeline |
| `HybridStrategy` | `selector/strategies/hybrid_strategy.py` | Rules + LLM fallback strategy |
| `LLMStrategy` | `selector/strategies/llm_strategy.py` | Pure LLM classification |
| `RuleStrategy` | `selector/strategies/rule_strategy.py` | Pattern-matching rules |

## Integration with MegaAgent

The Intelligent Selector is owned by `MegaAgent`, the top-level orchestrator:

```python
class MegaAgent(BaseAgent):
    async def reply(self, message):
        selector = IntelligentSelector(strategy=self.selector_strategy)
        decision = await selector.route(
            input_text=message.get("content", ""),
            agent_id=self.name,
        )
        # Execute based on decision.route_type
        # FTA -> FTA Engine
        # Skill -> Skill Executor
        # RAG -> RAG Pipeline
        # Direct -> LLM call
```

## See Also

- [Architecture Overview](overview.md) — System-level architecture
- [FTA Engine](fta-engine.md) — Fault tree analysis workflow execution
- [Ticket Summary Agent](ticket-summary-agent.md) — Reuses hybrid strategy pattern for knowledge classification
- [Demo: Intelligent Selector](../demo/intelligent-selector-demo.md) — Full end-to-end demo
