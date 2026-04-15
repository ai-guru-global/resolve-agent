# Intelligent Selector

The Intelligent Selector is the LLM-powered meta-router at the heart of ResolveAgent. It analyzes incoming requests through a sophisticated pipeline and determines the optimal processing path.

**Location**: `python/src/resolveagent/selector/`

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       INTELLIGENT SELECTOR                                │
│                                                                          │
│  Input ──▶ [Cache?] ──▶ Intent Analyzer ──▶ Context Enricher ──▶ Router │
│                ↑                                                    │    │
│                └──────────────── Cache Store ◀───────────────────────┘    │
│                                                                          │
│  ┌───────────┬───────────┬───────────┬───────────────────────────┐       │
│  │ Workflow  │  Skills   │    RAG    │    Code Analysis          │       │
│  │   (FTA)   │  (Tools)  │ (Search)  │   (Static/AST)            │       │
│  └───────────┴───────────┴───────────┴───────────────────────────┘       │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                       SELECTOR ADAPTERS                                   │
│                                                                          │
│  SelectorProtocol ◀──┬── IntelligentSelector  (default)                 │
│                       ├── HookSelectorAdapter  (hooks mode)              │
│                       └── SkillSelectorAdapter (skills mode)             │
└──────────────────────────────────────────────────────────────────────────┘
```

## Routing Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| **Rule-based** | Pattern matching with 18 pre-defined rules | High-frequency, well-defined requests |
| **LLM-based** | Uses a fast LLM for request classification | Ambiguous or novel requests |
| **Hybrid** (default) | 3-phase: fast rule path -> LLM fallback -> ensemble | Recommended for production |

The strategy is configurable per agent via the `selector_strategy` parameter:

```python
selector = IntelligentSelector(strategy="hybrid")
decision = await selector.route(
    "Analyze this pod crash in namespace kube-system",
    agent_id="agent-001",
)
print(f"Route: {decision.route_type}, Confidence: {decision.confidence:.2f}")
```

### RuleStrategy Details

`RuleStrategy` (`selector/strategies/rule_strategy.py`) uses 18 pre-compiled `IntentPattern` rules organized by route type:

| Category | Example Patterns | Route Type | Base Confidence |
|----------|------------------|------------|-----------------|
| Workflow triggers | `diagnose`, `troubleshoot`, `root cause`, `incident` | `workflow` | 0.85 |
| FTA-specific | `fault tree`, `failure analysis`, `cut set` | `workflow` | 0.90 |
| Skill invocations | `search`, `execute`, `run command`, `calculate` | `skill` | 0.85 |
| Web search | `search the web`, `find online`, `look up` | `skill` (web_search) | 0.90 |
| Code execution | `run this code`, `execute script`, `eval` | `skill` (code_exec) | 0.88 |
| RAG queries | `documentation`, `knowledge base`, `manual`, `runbook` | `rag` | 0.85 |
| Code analysis | `review code`, `security scan`, `analyze function` | `code_analysis` | 0.85 |
| Direct/chat | `hello`, `thanks`, `explain`, simple questions | `direct` | 0.80 |

Each rule is an `IntentPattern` with: `pattern` (compiled regex), `route_type`, `base_confidence`, and optional `target_hint`.

### LLMStrategy Details

`LLMStrategy` (`selector/strategies/llm_strategy.py`) uses a structured prompt to classify requests:

1. Builds a system prompt listing available skills, workflows, and RAG collections
2. Sends the user input to a fast LLM (e.g., qwen-turbo)
3. Parses JSON response into a `RouteDecision`
4. Falls back to simulation mode (regex-based) if LLM call fails or times out

### HybridStrategy 3-Phase Process

`HybridStrategy` (`selector/strategies/hybrid_strategy.py`) executes a 3-phase decision process:

```
Phase 1: Fast Rule Path
    │
    ├── Match found with confidence >= threshold (default 0.7)?
    │   └── YES → Return rule decision immediately (fast path)
    │
    └── NO → Continue to Phase 2
    │
Phase 2: LLM Fallback
    │
    ├── Call LLMStrategy.decide() with enriched context
    │   └── LLM returns decision with confidence
    │
    └── Continue to Phase 3
    │
Phase 3: Ensemble Combination
    │
    ├── Compare rule_decision vs llm_decision
    ├── Apply adaptive boosts (_apply_boosts):
    │   ├── Code complexity boost: +0.05 for "high" complexity
    │   ├── Conversation history boost: +0.03 when history > 3
    │   └── Per-route configurable boosts from HybridConfig
    │
    └── Return decision with highest boosted confidence
```

Configuration via `HybridConfig`:

```python
@dataclass
class HybridConfig:
    rule_confidence_threshold: float = 0.7   # Phase 1 fast-path threshold
    per_route_boosts: dict[str, float] = {}  # e.g., {"code_analysis": 0.05}
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

`RouteDecision` is a Pydantic `BaseModel`:

```python
class RouteDecision(BaseModel):
    route_type: str        # workflow | skill | rag | code_analysis | direct | multi
    route_target: str      # specific target (workflow ID, skill name, collection)
    confidence: float      # 0.0 - 1.0
    parameters: dict       # execution parameters
    reasoning: str         # human-readable explanation
    chain: list[dict]      # for multi routes: ordered sub-decisions
```

## Processing Pipeline

### Stage 1: Intent Analysis

The `IntentAnalyzer` (`selector/intent.py`) classifies user input into intent categories using a single-pass approach that consolidates keyword scoring, pattern matching, code detection, and question detection in one text traversal.

**IntentClassification** output:

```python
class IntentClassification(BaseModel):
    intent_type: IntentType   # WORKFLOW | SKILL | RAG | CODE_ANALYSIS | DIRECT | MULTI
    entities: list[str]       # extracted entities (service names, error codes)
    confidence: float         # 0.0 - 1.0
    sub_intents: list[str]    # secondary intent types
    scores: dict[str, float]  # per-type scores for debugging
```

**Scoring algorithm** (single-pass):

1. **Keyword matching**: Each `IntentPattern` has weighted keywords; accumulated scores per intent type
2. **Pattern matching**: Pre-compiled regex patterns with base confidence values
3. **Code detection**: `_code_block_re`, `_inline_code_re`, `_code_syntax_patterns` detect code content and boost `code_analysis` score
4. **Question detection**: `frozenset` of question words (what, how, why, etc.) for O(1) lookup; boosts `rag` or `direct` scores

**Multi-intent detection**: When the gap between top-2 intent scores is less than `split_threshold` (default 0.15), and the second score > 0.2, the classification is `MULTI` with both intents in `sub_intents`.

**Key optimizations**:
- Pre-compiled regex patterns created once in `__init__`
- `frozenset` for O(1) question word lookup
- Single-pass consolidated scoring replaces the previous 4-stage pipeline

### Stage 2: Context Enrichment

The `ContextEnricher` (`selector/context_enricher.py`) augments the classified intent with additional context:

- **Agent memory**: Previous conversation history and resolved issues
- **Available capabilities**: Currently registered skills and workflows (queried in parallel via `asyncio.gather`)
- **Code context**: Repository, file paths, language detection (for code-related requests)
- **Weighted skill ranking**: Skills sorted by relevance (capabilities, name, description matching) with top-10 cutoff

**EnrichedContext** output:

```python
class EnrichedContext(BaseModel):
    intent: IntentClassification
    available_skills: list[dict]       # ranked by relevance, top-10
    available_workflows: list[dict]
    available_rag_collections: list[dict]
    conversation_history: list[dict]   # last 10 entries
    code_context: CodeContext | None    # only for code-related requests
```

**CodeContext** analysis (for `code_analysis` route type):

```python
class CodeContext(BaseModel):
    repository: str           # repository identifier
    file_paths: list[str]     # relevant file paths
    language: str             # detected language (8 supported: Python, Go, JS, TS, Java, Rust, C/C++, Ruby)
    issue_type: str           # bug, security, performance, style
    complexity_hint: str      # low, medium, high
```

**Key optimizations**:
- Registry queries (skills, workflows, RAG collections) are executed in parallel using `asyncio.gather()` instead of sequentially
- `_score_skill_relevance()` computes a 0-1 relevance score for each skill based on capability overlap, name matching, and description matching

### Stage 3: Route Decision

The selected strategy produces a `RouteDecision` with:

- **route_type**: Which execution engine to use
- **route_target**: Specific target within that engine (e.g., workflow ID, skill name)
- **confidence**: Decision confidence score
- **reasoning**: Human-readable explanation of the routing decision
- **chain**: For `multi` routes, ordered sub-decisions

## Performance Optimizations

### Route Decision Cache

`RouteDecisionCache` (`selector/cache.py`) provides TTL-aware LRU caching for routing decisions:

```python
# Instance-scoped cache (per selector)
selector = IntelligentSelector(strategy="hybrid", cache_scope="instance")

# Global shared cache (module-level singleton)
selector = IntelligentSelector(strategy="hybrid", cache_scope="global")

# Bypass cache for a specific call
decision = await selector.route("input", bypass_cache=True)
```

Features:
- SHA-256 based deterministic cache keys from `(input_text, agent_id, strategy)`
- Configurable `max_size` (default: 1000) and `ttl_seconds` (default: 300)
- Thread-safe with `threading.Lock`
- TTL-aware eviction: expired entries are removed on access and during periodic cleanup
- `cache_stats()` returns hit/miss/hit_rate/size metrics

### Strategy Instance Caching

Strategy objects (RuleStrategy, LLMStrategy, HybridStrategy) are lazily created via `_get_strategy()` and cached in `_strategy_instances`. This avoids re-compiling regex patterns and re-initializing state on every `route()` call.

### Selector Instance Reuse in MegaAgent

`MegaAgent._get_selector()` creates the selector once and reuses it across all `reply()` invocations, replacing the previous pattern of creating a new `IntelligentSelector` per request.

## Key Components

| Component | File | Description |
|-----------|------|-------------|
| `IntelligentSelector` | `selector/selector.py` | Main orchestrator with strategy dispatch and caching |
| `RouteDecision` | `selector/selector.py` | Pydantic model for routing output (6 route types) |
| `SelectorProtocol` | `selector/protocol.py` | `runtime_checkable` Protocol for structural subtyping |
| `RouteDecisionCache` | `selector/cache.py` | TTL-aware LRU cache with instance/global scope |
| `IntentAnalyzer` | `selector/intent.py` | Single-pass intent classification with multi-intent detection |
| `IntentPattern` | `selector/intent.py` | Pattern definition: regex + route_type + confidence |
| `IntentClassification` | `selector/intent.py` | Classification result with scores and entities |
| `ContextEnricher` | `selector/context_enricher.py` | Parallel context augmentation with skill ranking |
| `EnrichedContext` | `selector/context_enricher.py` | Enriched context with capabilities and code analysis |
| `CodeContext` | `selector/context_enricher.py` | Code-specific context (language, complexity, issues) |
| `HybridStrategy` | `selector/strategies/hybrid_strategy.py` | 3-phase: fast rule + LLM fallback + ensemble with boosts |
| `HybridConfig` | `selector/strategies/hybrid_strategy.py` | Config: threshold + per-route boosts |
| `LLMStrategy` | `selector/strategies/llm_strategy.py` | Pure LLM classification with simulation fallback |
| `RuleStrategy` | `selector/strategies/rule_strategy.py` | 18 pre-compiled pattern-matching rules |
| `HookSelectorAdapter` | `selector/hook_selector.py` | Hook-based selector with pre/post pipeline |
| `SkillSelectorAdapter` | `selector/skill_selector.py` | Skill-based selector adapter |
| `InMemoryHookClient` | `hooks/memory_client.py` | In-memory hook store (no Go platform dependency) |

## SelectorProtocol

All selector implementations conform to `SelectorProtocol` (`selector/protocol.py`), a `runtime_checkable` Protocol that enables structural subtyping without inheritance:

```python
from resolveagent.selector.protocol import SelectorProtocol

@runtime_checkable
class SelectorProtocol(Protocol):
    async def route(
        self,
        input_text: str,
        agent_id: str = "",
        context: dict[str, Any] | None = None,
        enrich_context: bool = True,
    ) -> RouteDecision: ...

    def get_strategy_info(self) -> dict[str, Any]: ...
```

Three implementations satisfy this protocol:
- `IntelligentSelector` -- the default LLM-powered meta-router
- `HookSelectorAdapter` -- wraps the selector with pre/post hook execution
- `SkillSelectorAdapter` -- wraps the selector as a skill invocation

## Selector Adapters

### HookSelectorAdapter

Wraps `IntelligentSelector` with the hooks infrastructure, enabling external code to intercept and modify routing decisions via pre/post hooks.

```python
from resolveagent.selector.hook_selector import HookSelectorAdapter

adapter = HookSelectorAdapter(strategy="hybrid")
decision = await adapter.route("diagnose the error", agent_id="agent-1")
```

**Execution flow**: pre-hooks -> (short-circuit check) -> IntelligentSelector.route() -> post-hooks -> apply modifications

Built-in handlers:
- `intent_analysis_handler` -- Pre-hook that runs IntentAnalyzer and stores classification
- `decision_audit_handler` -- Post-hook that logs routing decisions for observability
- `confidence_override_handler` -- Post-hook that adjusts confidence based on metadata thresholds

Uses `InMemoryHookClient` by default (no Go platform dependency). Default hooks (`intent-pre-analysis`, `decision-audit`) are lazily installed on first `route()` call if no hooks exist.

### SkillSelectorAdapter

Wraps the routing logic as a skill invocation, calling the `intelligent-selector` skill function directly:

```python
from resolveagent.selector.skill_selector import SkillSelectorAdapter

adapter = SkillSelectorAdapter()
decision = await adapter.route("search the web", agent_id="agent-1")
```

The skill entry point is at `resolveagent.skills.builtin.selector_skill:run`, with an independent manifest at `python/skills/intelligent-selector/manifest.yaml`. On error, the adapter falls back to a `direct` route with low confidence.

## Integration with MegaAgent

The Intelligent Selector is owned by `MegaAgent`, the top-level orchestrator. MegaAgent supports three selector modes via the `selector_mode` parameter:

```python
# Default: IntelligentSelector
agent = MegaAgent(name="default-agent", selector_mode="selector")

# Hook-based: pre/post hooks around IntelligentSelector
agent = MegaAgent(name="hooks-agent", selector_mode="hooks")

# Skill-based: routes via the intelligent-selector skill
agent = MegaAgent(name="skills-agent", selector_mode="skills")
```

The `_get_selector()` factory method lazily creates and caches the appropriate selector:

```python
class MegaAgent(BaseAgent):
    def __init__(
        self,
        name: str,
        selector_strategy: str = "hybrid",
        selector_mode: SelectorMode = "selector",  # "selector" | "hooks" | "skills"
        **kwargs,
    ) -> None:
        ...

    def _get_selector(self) -> SelectorProtocol:
        """Lazily create and cache the selector based on selector_mode."""
        if self._selector_instance is not None:
            return self._selector_instance
        if self.selector_mode == "hooks":
            self._selector_instance = HookSelectorAdapter(strategy=self.selector_strategy)
        elif self.selector_mode == "skills":
            self._selector_instance = SkillSelectorAdapter()
        else:
            self._selector_instance = IntelligentSelector(strategy=self.selector_strategy)
        return self._selector_instance

    async def reply(self, message):
        selector = self._get_selector()
        decision = await selector.route(
            input_text=message.get("content", ""),
            agent_id=self.name,
        )
        # Execute based on decision.route_type ...
```

## Module Exports

```python
from resolveagent.selector import (
    # Core
    IntelligentSelector, RouteDecision,
    # Protocol & cache
    SelectorProtocol, RouteDecisionCache, get_global_cache,
    # Adapters (lazy-loaded)
    HookSelectorAdapter, SkillSelectorAdapter,
    # Intent analysis
    IntentAnalyzer, IntentClassification, IntentPattern, IntentType,
    # Context enrichment
    ContextEnricher, EnrichedContext, CodeContext,
)

from resolveagent.hooks import (
    HookContext, HookResult, HookRunner,
    # Lazy-loaded
    InMemoryHookClient,
    intent_analysis_handler,
    decision_audit_handler,
    confidence_override_handler,
)
```

Adapters and cache-related symbols use module-level `__getattr__` for lazy loading to avoid circular imports.

## Testing

Tests are located in `python/tests/unit/`:

| Test File | Coverage |
|-----------|----------|
| `test_selector.py` | IntentAnalyzer, ContextEnricher, strategies, IntelligentSelector, RouteDecision |
| `test_selector_cache.py` | Cache hit/miss, TTL expiry, LRU eviction, bypass, stats, global singleton |
| `test_hook_selector.py` | InMemoryHookClient CRUD, HookSelectorAdapter routing, short-circuit, protocol conformance |
| `test_skill_selector.py` | SkillSelectorAdapter routing, lazy loading, error fallback, protocol conformance |
| `test_mega_selector_modes.py` | MegaAgent selector_mode factory, instance reuse, strategy forwarding |

## See Also

- [Architecture Overview](overview.md) -- System-level architecture
- [Selector Adapters](selector-adapters.md) -- Detailed Hook/Skill adapter architecture
- [FTA Engine](fta-engine.md) -- Fault tree analysis workflow execution
- [Ticket Summary Agent](ticket-summary-agent.md) -- Reuses hybrid strategy pattern for knowledge classification
- [Demo: Intelligent Selector](../demo/intelligent-selector-demo.md) -- Full end-to-end demo
