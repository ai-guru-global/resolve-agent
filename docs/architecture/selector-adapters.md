# Selector Adapters

The Selector Adapter system provides alternative routing implementations that conform to the same `SelectorProtocol` interface. This enables the Intelligent Selector to be deployed in different operational modes without changing downstream code.

**Location**: `python/src/resolveagent/selector/`

## Overview

```
                          SelectorProtocol
                               │
               ┌───────────────┼───────────────┐
               │               │               │
     IntelligentSelector  HookSelector    SkillSelector
       (default)          Adapter          Adapter
               │               │               │
               │         ┌─────┴─────┐         │
               │         │ pre-hooks │         │
               │         │     ↓     │         │
               └────────▶│ selector  │◀────────┘
                         │     ↓     │     (calls run()
                         │ post-hooks│      directly)
                         └───────────┘
```

All three implementations satisfy `SelectorProtocol`, which requires:
- `async def route(input_text, agent_id, context, enrich_context) -> RouteDecision`
- `def get_strategy_info() -> dict[str, Any]`

## SelectorProtocol

Defined in `selector/protocol.py` as a `runtime_checkable` Protocol for structural subtyping:

```python
from typing import Any, Protocol, runtime_checkable
from resolveagent.selector.selector import RouteDecision

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

Usage for type checking:

```python
from resolveagent.selector.protocol import SelectorProtocol

def configure_agent(selector: SelectorProtocol) -> None:
    """Accepts any selector implementation."""
    info = selector.get_strategy_info()
    print(f"Using strategy: {info['strategy']}")
```

Runtime checks:

```python
assert isinstance(IntelligentSelector(), SelectorProtocol)
assert isinstance(HookSelectorAdapter(), SelectorProtocol)
assert isinstance(SkillSelectorAdapter(), SelectorProtocol)
```

## HookSelectorAdapter

**File**: `selector/hook_selector.py`

Wraps `IntelligentSelector` with the existing hooks infrastructure (`HookRunner`), enabling external code to intercept and modify routing decisions at well-defined extension points.

### Architecture

```
route() called
    │
    ▼
┌─────────────────────────────┐
│  _ensure_default_hooks()    │  (lazy, first-call only)
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  PRE-HOOKS                  │
│  trigger: "selector.route"  │
│  type: "pre"                │
│                             │
│  • intent_analysis_handler  │  → Runs IntentAnalyzer, stores in modified_data
│  • (custom pre-hooks)       │
│                             │
│  Short-circuit check:       │
│  If modified_data contains  │
│  "route_decision" and       │
│  skip_remaining is True     │
│  → Skip core routing        │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  CORE ROUTING               │
│  IntelligentSelector.route()│
│  (skipped if short-circuit) │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  POST-HOOKS                 │
│  trigger: "selector.route"  │
│  type: "post"               │
│                             │
│  • decision_audit_handler   │  → Logs decision for observability
│  • confidence_override      │  → Adjusts confidence from metadata
│  • (custom post-hooks)      │
│                             │
│  Applies modified           │
│  route_decision if present  │
└──────────────┬──────────────┘
               │
               ▼
          RouteDecision
```

### Usage

```python
from resolveagent.selector.hook_selector import HookSelectorAdapter

# Default: creates InMemoryHookClient + installs default hooks
adapter = HookSelectorAdapter(strategy="hybrid")
decision = await adapter.route("diagnose the error", agent_id="agent-1")

# Custom hook client
from resolveagent.hooks.memory_client import InMemoryHookClient
client = InMemoryHookClient()
adapter = HookSelectorAdapter(hook_client=client, strategy="rule")
```

### Built-in Handlers

Three handlers are registered in `hooks/selector_handlers.py`:

| Handler | Type | Description |
|---------|------|-------------|
| `intent_analysis_handler` | Pre | Runs `IntentAnalyzer`, stores classification in `modified_data` |
| `decision_audit_handler` | Post | Logs route type, target, confidence, and timestamp |
| `confidence_override_handler` | Post | Adjusts confidence based on `metadata["confidence_overrides"]` map |

### Custom Hooks

Register custom handlers and create hook definitions:

```python
from resolveagent.hooks.models import HookContext, HookResult

# 1. Define a handler
async def rate_limit_handler(ctx: HookContext) -> HookResult:
    agent_id = ctx.target_id
    if is_rate_limited(agent_id):
        return HookResult(
            success=True,
            skip_remaining=True,
            modified_data={
                "route_decision": {
                    "route_type": "direct",
                    "confidence": 1.0,
                    "reasoning": "Rate limited",
                },
            },
        )
    return HookResult(success=True)

# 2. Register the handler
adapter._runner.register_handler("rate_limit", rate_limit_handler)

# 3. Create a hook definition
await adapter._client.create({
    "name": "rate-limiter",
    "hook_type": "pre",
    "trigger_point": "selector.route",
    "handler_type": "rate_limit",
    "execution_order": -1,  # Run before other pre-hooks
    "enabled": True,
})
```

### Default Hook Auto-Installation

On the first `route()` call, if the hook store is empty, two default hooks are lazily created:

| Hook Name | Type | Handler | Purpose |
|-----------|------|---------|---------|
| `intent-pre-analysis` | `pre` | `intent_analysis` | Pre-analyze intent before routing |
| `decision-audit` | `post` | `decision_audit` | Log all routing decisions |

## InMemoryHookClient

**File**: `hooks/memory_client.py`

Drop-in replacement for the platform `HookClient` that stores hook definitions in a Python `dict` instead of querying the Go REST API. Designed for development, testing, and standalone deployments.

```python
from resolveagent.hooks.memory_client import InMemoryHookClient

client = InMemoryHookClient()

# CRUD operations (same interface as HookClient)
result = await client.create({"name": "my-hook", "hook_type": "pre", ...})
hook = await client.get(result["id"])
hooks = await client.list()
await client.update(result["id"], {"enabled": False})
await client.delete(result["id"])
executions = await client.list_executions(result["id"])
```

## SkillSelectorAdapter

**File**: `selector/skill_selector.py`

Wraps the routing logic as a skill invocation, treating the Intelligent Selector as a standard skill in the skills infrastructure.

### Architecture

```
route() called
    │
    ▼
┌─────────────────────────┐
│  _get_callable()        │  (lazy load on first call)
│  imports selector_skill │
│  :run directly          │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  await run(             │
│    input_text=...,      │
│    agent_id=...,        │
│    context=...,         │
│    strategy="hybrid",   │
│    enrich_context=...,  │
│  )                      │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  RouteDecision(**result)│
│                         │
│  On error:              │
│  → direct, conf=0.3    │
└─────────────────────────┘
```

### Usage

```python
from resolveagent.selector.skill_selector import SkillSelectorAdapter

adapter = SkillSelectorAdapter()
decision = await adapter.route("search the web", agent_id="agent-1")
```

### Skill Entry Point

The skill function is at `resolveagent.skills.builtin.selector_skill:run`:

```python
async def run(
    input_text: str,
    agent_id: str = "",
    context: dict[str, Any] | None = None,
    strategy: str = "hybrid",
    enrich_context: bool = True,
) -> dict[str, Any]:
    selector = IntelligentSelector(strategy=strategy)
    decision = await selector.route(...)
    return decision.model_dump()
```

An independent skill manifest is located at `python/skills/intelligent-selector/manifest.yaml`.

### Error Handling

On any exception, the adapter returns a fallback decision:

```python
RouteDecision(
    route_type="direct",
    confidence=0.3,
    reasoning=f"Skill selector fallback: {error}",
)
```

## MegaAgent Integration

`MegaAgent` selects the adapter via the `selector_mode` parameter:

| Mode | Adapter | Description |
|------|---------|-------------|
| `"selector"` (default) | `IntelligentSelector` | Direct LLM-powered routing |
| `"hooks"` | `HookSelectorAdapter` | Pre/post hooks around routing |
| `"skills"` | `SkillSelectorAdapter` | Routes via skill invocation |

```python
from resolveagent.agent.mega import MegaAgent

# Each mode creates the corresponding adapter lazily
agent = MegaAgent(
    name="my-agent",
    selector_strategy="hybrid",
    selector_mode="hooks",  # or "selector", "skills"
)
```

The selector instance is created once by `_get_selector()` and reused across all `reply()` calls.

## Testing

| Test File | Tests |
|-----------|-------|
| `test_hook_selector.py` | InMemoryHookClient CRUD (9 tests), HookSelectorAdapter routing/short-circuit/protocol (7 tests) |
| `test_skill_selector.py` | SkillSelectorAdapter routing/loading/fallback/protocol (7 tests) |
| `test_mega_selector_modes.py` | MegaAgent factory/reuse/strategy forwarding (12 tests) |

## See Also

- [Intelligent Selector](intelligent-selector.md) -- Core selector architecture and pipeline
- [Architecture Overview](overview.md) -- System-level architecture
