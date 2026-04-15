# 选择器适配器

选择器适配器系统提供了符合统一 `SelectorProtocol` 接口的多种路由实现。这使得智能选择器可以在不同运行模式下部署，而无需更改下游代码。

**代码位置**: `python/src/resolveagent/selector/`

## 概述

```
                          SelectorProtocol
                               │
               ┌───────────────┼───────────────┐
               │               │               │
     IntelligentSelector  HookSelector    SkillSelector
       (默认)            Adapter          Adapter
               │               │               │
               │         ┌─────┴─────┐         │
               │         │ pre-hooks │         │
               │         │     ↓     │         │
               └────────▶│ selector  │◀────────┘
                         │     ↓     │     (直接调用 run())
                         │ post-hooks│
                         └───────────┘
```

三种实现均满足 `SelectorProtocol`，要求实现：
- `async def route(input_text, agent_id, context, enrich_context) -> RouteDecision`
- `def get_strategy_info() -> dict[str, Any]`

---

## SelectorProtocol

定义在 `selector/protocol.py` 中，作为 `runtime_checkable` 的 Protocol，支持结构子类型化：

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

**类型检查用法**：

```python
from resolveagent.selector.protocol import SelectorProtocol

def configure_agent(selector: SelectorProtocol) -> None:
    """接受任意选择器实现"""
    info = selector.get_strategy_info()
    print(f"使用策略: {info['strategy']}")
```

**运行时检查**：

```python
assert isinstance(IntelligentSelector(), SelectorProtocol)
assert isinstance(HookSelectorAdapter(), SelectorProtocol)
assert isinstance(SkillSelectorAdapter(), SelectorProtocol)
```

---

## HookSelectorAdapter

**文件**: `selector/hook_selector.py`

通过现有的 Hooks 基础设施（`HookRunner`）包装 `IntelligentSelector`，允许外部代码在定义好的扩展点拦截和修改路由决策。

### 架构

```
route() 调用
    │
    ▼
┌─────────────────────────────┐
│  _ensure_default_hooks()    │  (惰性加载，仅首次调用)
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  前置 Hook (PRE-HOOKS)      │
│  触发点: "selector.route"   │
│  类型: "pre"                │
│                             │
│  • intent_analysis_handler  │  → 运行 IntentAnalyzer，存储到 modified_data
│  • (自定义 pre-hooks)       │
│                             │
│  短路检查:                  │
│  如果 modified_data 包含    │
│  "route_decision" 且        │
│  skip_remaining 为 True     │
│  → 跳过核心路由             │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  核心路由                   │
│  IntelligentSelector.route()│
│  (短路时跳过)               │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  后置 Hook (POST-HOOKS)     │
│  触发点: "selector.route"   │
│  类型: "post"               │
│                             │
│  • decision_audit_handler   │  → 记录决策日志用于可观测性
│  • confidence_override      │  → 从元数据调整置信度
│  • (自定义 post-hooks)      │
│                             │
│  如果存在 modified          │
│  route_decision 则应用      │
└──────────────┬──────────────┘
               │
               ▼
          RouteDecision
```

### 使用方式

```python
from resolveagent.selector.hook_selector import HookSelectorAdapter

# 默认：创建 InMemoryHookClient + 安装默认 hooks
adapter = HookSelectorAdapter(strategy="hybrid")
decision = await adapter.route("诊断这个错误", agent_id="agent-1")

# 自定义 hook 客户端
from resolveagent.hooks.memory_client import InMemoryHookClient
client = InMemoryHookClient()
adapter = HookSelectorAdapter(hook_client=client, strategy="rule")
```

### 内置处理器

三个处理器注册在 `hooks/selector_handlers.py` 中：

| 处理器 | 类型 | 说明 |
|---------|------|-------------|
| `intent_analysis_handler` | 前置 | 运行 `IntentAnalyzer`，将分类结果存入 `modified_data` |
| `decision_audit_handler` | 后置 | 记录路由类型、目标、置信度和时间戳 |
| `confidence_override_handler` | 后置 | 基于 `metadata["confidence_overrides"]` 映射调整置信度 |

### 自定义 Hook

注册自定义处理器并创建 Hook 定义：

```python
from resolveagent.hooks.models import HookContext, HookResult

# 1. 定义处理器
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
                    "reasoning": "已限流",
                },
            },
        )
    return HookResult(success=True)

# 2. 注册处理器
adapter._runner.register_handler("rate_limit", rate_limit_handler)

# 3. 创建 Hook 定义
await adapter._client.create({
    "name": "rate-limiter",
    "hook_type": "pre",
    "trigger_point": "selector.route",
    "handler_type": "rate_limit",
    "execution_order": -1,  # 在其他 pre-hooks 之前执行
    "enabled": True,
})
```

### 默认 Hook 自动安装

首次 `route()` 调用时，如果 Hook 存储为空，会惰性创建两个默认 Hook：

| Hook 名称 | 类型 | 处理器 | 用途 |
|-----------|------|---------|---------|
| `intent-pre-analysis` | `pre` | `intent_analysis` | 路由前预分析意图 |
| `decision-audit` | `post` | `decision_audit` | 记录所有路由决策 |

---

## InMemoryHookClient

**文件**: `hooks/memory_client.py`

平台 `HookClient` 的内存替代实现，将 Hook 定义存储在 Python `dict` 中而非查询 Go REST API。适用于开发、测试和独立部署场景。

```python
from resolveagent.hooks.memory_client import InMemoryHookClient

client = InMemoryHookClient()

# CRUD 操作（与 HookClient 接口一致）
result = await client.create({"name": "my-hook", "hook_type": "pre", ...})
hook = await client.get(result["id"])
hooks = await client.list()
await client.update(result["id"], {"enabled": False})
await client.delete(result["id"])
executions = await client.list_executions(result["id"])
```

---

## SkillSelectorAdapter

**文件**: `selector/skill_selector.py`

将路由逻辑包装为技能调用，把智能选择器视为技能基础设施中的标准技能。

### 架构

```
route() 调用
    │
    ▼
┌─────────────────────────┐
│  _get_callable()        │  (首次调用时惰性加载)
│  导入 selector_skill    │
│  :run                   │
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
│  出错时:                │
│  → direct, conf=0.3    │
└─────────────────────────┘
```

### 使用方式

```python
from resolveagent.selector.skill_selector import SkillSelectorAdapter

adapter = SkillSelectorAdapter()
decision = await adapter.route("搜索网络信息", agent_id="agent-1")
```

### 技能入口点

技能函数位于 `resolveagent.skills.builtin.selector_skill:run`：

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

独立技能清单位于 `python/skills/intelligent-selector/manifest.yaml`。

### 错误处理

发生任何异常时，适配器返回兜底决策：

```python
RouteDecision(
    route_type="direct",
    confidence=0.3,
    reasoning=f"技能选择器兜底: {error}",
)
```

---

## MegaAgent 集成

`MegaAgent` 通过 `selector_mode` 参数选择适配器：

| 模式 | 适配器 | 说明 |
|------|---------|-------------|
| `"selector"` (默认) | `IntelligentSelector` | 直接 LLM 驱动的路由 |
| `"hooks"` | `HookSelectorAdapter` | 带前/后置 Hook 的路由 |
| `"skills"` | `SkillSelectorAdapter` | 通过技能调用进行路由 |

```python
from resolveagent.agent.mega import MegaAgent

# 每种模式惰性创建对应的适配器
agent = MegaAgent(
    name="my-agent",
    selector_strategy="hybrid",
    selector_mode="hooks",  # 或 "selector", "skills"
)
```

选择器实例由 `_get_selector()` 创建一次，并在所有 `reply()` 调用中复用。

---

## 测试

| 测试文件 | 测试内容 |
|-----------|-------|
| `test_hook_selector.py` | InMemoryHookClient CRUD (9 个测试)、HookSelectorAdapter 路由/短路/协议 (7 个测试) |
| `test_skill_selector.py` | SkillSelectorAdapter 路由/加载/兜底/协议 (7 个测试) |
| `test_mega_selector_modes.py` | MegaAgent 工厂/复用/策略转发 (12 个测试) |

---

## 相关文档

- [智能选择器](./intelligent-selector.md) — 核心选择器架构和处理管道
- [架构设计](./architecture.md) — 系统级架构概览
