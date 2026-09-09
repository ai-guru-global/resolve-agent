# P0 基线收尾 + P1 失实项补齐 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收尾工作区全部未提交变更形成干净基线（P0），随后补齐三处"宣传与代码不符"——FTA 蒙特卡洛仿真、INHIBIT/PRIORITY_AND 门语义、AdaptiveWeightAdjuster 接线——并让 README 与代码一致（P1）。

**Architecture:** P0 是纯 git 分组提交，不改内容。P1 全部在 Python 运行时：`FTAEvent` 加概率字段 → `FaultTree.validate()` 门语义校验 → 新建 `fta/monte_carlo.py` 仿真器 → `FTAEngine` 集成（execute 注入仿真 + analyze 组合割集）→ `ResilientSelector` 接线权重调整器 → README/docs 同步。静态布尔求值路径完全不动。

**Tech Stack:** Python 3.11+（pytest asyncio auto 模式、ruff）、Markdown 文档。

**设计文档:** `docs/superpowers/specs/2026-09-09-production-hardening-design.md`

**关键事实（执行者必读）:**
- 仓库根：`/Users/allengaller/Documents/GitHub/ai-guru-global/resolve-agent`
- Python 测试命令：`cd python && PYTHONPATH=src .venv/bin/python -m pytest tests/unit/<file> -v`（asyncio auto 模式，`async def test_` 无需标记）
- venv 不存在时先跑 `./scripts/start-local.sh runtime`（见 Task 0 预检）
- 弹性选择器配置类真名是 `ResilientConfig`（spec 中写的 ResilientSelectorConfig 即它），位于 `python/src/resolveagent/selector/resilient_selector.py:94`
- 基础事件可用 `evaluator="static:true"` / `"static:false"` 做确定性求值（`fta/evaluator.py:346`）
- `GateType` 实际只有 5 值：AND/OR/VOTING/INHIBIT/PRIORITY_AND（`fta/tree.py:20-27`）
- 割集 API：`from resolveagent.fta.cut_sets import compute_minimal_cut_sets`，返回 `list[set[str]]`
- 所有提交信息用中文 Conventional Commits；直接提交到 main；不 push；不用 `--no-verify`

---

## P0 基线收尾

### Task 0: 预检环境

**Files:** 无修改。

- [ ] **Step 0.1: 确认 venv 存在**

Run: `test -x python/.venv/bin/python && echo "venv ok" || echo "MISSING"`
Expected: `venv ok`。若 MISSING：运行 `./scripts/start-local.sh runtime`（耗时数分钟属正常），完成后复验。

- [ ] **Step 0.2: 确认当前基线状态**

Run: `git status --short | wc -l && git log --oneline -3`
Expected: 约 172 行变更（文档归档第一部分已在 b1f930b 提交）、最近提交含 `docs(spec): 生产化推进四阶段设计…`。

### Task 1: P0-1 文档与集成目录收尾提交

**Files:**
- Modify: `README.md`、`docs/zh/INDEX.md`、`docs-site/sidebars.ts`、`examples/quickstart/README.md`、`gotchas.md`
- Delete: `docs/adr/.gitkeep`、`CODE_QUALITY_REPORT_2026-04-20.md`、`PLAN.md`、`PROJECT_STATUS_EVALUATION.md`、`documentation/` 下 6 个已跟踪报告
- Add: `docs/design/`（19 篇设计蒸馏文档）、`documentation/BUG_AUDIT_AND_FIX_REPORT_2026-09-07.md`、`documentation/WIKI_K8S_BENCHMARK_DESIGN.md`、`integrations/dify/`（新图标/main.py 等）

- [ ] **Step 1.1: 处理疑似垃圾文件 `README 2.md`**

Run: `diff -q README.md "README 2.md"; echo "exit=$?"`
Expected: `Files README.md and README 2.md differ` 或 `exit=0`（完全相同）。
- 若 exit=0（纯重复副本）：`rm "README 2.md"`
- 若不同：保留不动，在最终报告中向用户说明，不纳入提交。

- [ ] **Step 1.2: 分组暂存并核对**

```bash
git add README.md docs/zh/INDEX.md docs-site/sidebars.ts \
  docs/adr/.gitkeep CODE_QUALITY_REPORT_2026-04-20.md PLAN.md \
  PROJECT_STATUS_EVALUATION.md documentation/ \
  examples/quickstart/README.md integrations/ docs/design/ gotchas.md
git diff --cached --stat | tail -5
```
Expected: 暂存统计以删除的 6 份 documentation 报告、docs/design/ 新增结尾，无意外文件混入。

- [ ] **Step 1.3: 提交**

```bash
git commit -m "docs: 归档重组收尾（第二部分）——设计蒸馏文档、gotchas、Dify 集成与示例 README"
```

- [ ] **Step 1.4: 验证**

Run: `git status --short | grep -c '^ M\|^ D\|^??' || true`
Expected: 计数明显减少（约剩 120 项）。

### Task 2: P0-2 Go 代码与迁移脚本收尾提交

**Files:**
- Modify: `internal/cli/**`、`pkg/event/nats.go`、`pkg/feedback/alerts.go`、`pkg/health/*`、`pkg/logger/logger.go`、`pkg/registry/*.go`、`pkg/server/router.go`、`pkg/server/traffic_handlers.go`
- Delete: `internal/runtime/doc.go`、`scripts/migration/008_troubleshooting_solutions.*.sql`
- Add: `pkg/event/nats_test.go`、`pkg/feedback/alerts_test.go`、`scripts/migration/011_troubleshooting_solutions.*.sql`、`scripts/migration/README.md`

- [ ] **Step 2.1: 暂存并核对**

```bash
git add internal/ pkg/ scripts/migration/
git diff --cached --stat | tail -5
```
Expected: 暂存覆盖 internal/pkg 全部 Go 改动与迁移脚本 008→011 重编号，无 web/python 文件混入。

- [ ] **Step 2.2: 提交**

```bash
git commit -m "chore(go): 收尾未提交改动——CLI/registry/server 调整、迁移 008→011、新增 nats/alerts 测试"
```

### Task 3: P0-3 Python 运行时收尾提交

**Files:**
- Modify: `python/src/resolveagent/**`（agent/code_analysis/corpus/fta/mcp/memory/planning/rag/runtime/selector/skills/traffic 等）、`python/tests/**` 已跟踪测试
- Add: `python/tests/unit/test_code_analysis_engine.py`、`test_file_ops.py`、`test_fta_evaluator.py`、`test_mcp_registry.py`、`test_mega_workflow_degrade.py`、`test_skill_executor_defaults.py`、`test_traffic.py`

- [ ] **Step 3.1: 暂存并核对**

```bash
git add python/
git diff --cached --stat | tail -5
```
Expected: 仅 python/ 下文件。

- [ ] **Step 3.2: 提交**

```bash
git commit -m "chore(python): 收尾未提交改动与新增单元测试"
```

- [ ] **Step 3.3: 提交后回归（确保基线是绿的）**

Run: `cd python && PYTHONPATH=src .venv/bin/python -m pytest tests/unit -q 2>&1 | tail -3`
Expected: 全部通过（如出现失败，先修复再进入 P1——基线必须绿）。

### Task 4: P0-4 前端/移动端/GTM/部署配置收尾提交

**Files:**
- Modify: `web/**`、`mobile/src/**`、`GTM/DESIGN.md`、`GTM/index.html`、`deploy/**`、`configs/resolveagent.yaml`、`Makefile`、`.dockerignore`
- Delete: `web/package-lock.json`、`vibe_images/*.png`（5 张，已迁至 GTM/assets）
- Add: `GTM/tokens.css`、`deploy/helm/resolveagent/templates/secret.yaml`、`web/src/assets/`、`benchmarks/`、`code-up.yaml`

- [ ] **Step 4.1: 暂存并核对**

```bash
git add web/ mobile/ GTM/ deploy/ configs/resolveagent.yaml Makefile \
  .dockerignore benchmarks/ code-up.yaml vibe_images/
git diff --cached --stat | tail -5
```
Expected: vibe_images 5 张删除 + GTM 资源新增成对出现；无 docs/python 文件混入。

- [ ] **Step 4.2: 提交**

```bash
git commit -m "chore: 前端/移动端/GTM/部署与构建配置收尾（vibe_images 并入 GTM/assets）"
```

### Task 5: P0-5 本地工具产物治理

**Files:**
- Modify: `.gitignore`（已含用户改动，追加两行）、`.impeccable/mocks/decision/payload.json`
- Add: `.impeccable/mocks/decision/comp-*.png|*.prompt.txt`（6 个）

- [ ] **Step 5.1: 追加 .gitignore 忽略规则**

在 `.gitignore` 末尾追加（保留已有内容不动）：

```gitignore

# 本地工具会话产物（review 截图/问答状态/hallmark）
.impeccable/review/
.impeccable/questions/
.hallmark/
```

- [ ] **Step 5.2: 暂存并提交**

```bash
git add .gitignore .impeccable/mocks/ .qoder/settings.local.json
git diff --cached --stat
git commit -m "chore: 忽略本地工具会话产物，收尾已跟踪工具配置"
```

- [ ] **Step 5.3: P0 验收**

Run: `git status --short`
Expected: 输出为空（基线干净）。若 `.impeccable/review/` 等仍显示，确认 Step 5.1 的规则已写入。

---

## P1 失实项补齐

### Task 6: FTAEvent 增加 probability 字段

**Files:**
- Modify: `python/src/resolveagent/fta/tree.py`（`FTAEvent`，约 line 30-40）
- Test: `python/tests/unit/test_fta_monte_carlo.py`（新建）

- [ ] **Step 6.1: 写失败测试**

创建 `python/tests/unit/test_fta_monte_carlo.py`：

```python
"""Unit tests for FTA probability model and Monte Carlo simulation."""

import pytest

from resolveagent.fta.monte_carlo import MonteCarloSimulator
from resolveagent.fta.tree import EventType, FaultTree, FTAEvent, FTAGate, GateType


def test_fta_event_probability_defaults_to_none():
    event = FTAEvent(id="a", name="A")
    assert event.probability is None


def test_fta_event_probability_accepts_value():
    event = FTAEvent(id="a", name="A", probability=0.3)
    assert event.probability == 0.3
```

- [ ] **Step 6.2: 运行确认失败**

Run: `cd python && PYTHONPATH=src .venv/bin/python -m pytest tests/unit/test_fta_monte_carlo.py -v`
Expected: FAIL/ERROR — `ImportError: cannot import name 'MonteCarloSimulator'`（模块尚不存在）。

- [ ] **Step 6.3: 最小实现**

`python/src/resolveagent/fta/tree.py` 的 `FTAEvent` 中，在 `value: bool | None = None` 之后加一行：

```python
    value: bool | None = None
    probability: float | None = None  # 蒙特卡洛仿真用；None 表示不参与概率仿真
```

同时创建空仿真器占位模块 `python/src/resolveagent/fta/monte_carlo.py`：

```python
"""Monte Carlo simulation for fault trees."""

from __future__ import annotations


class MonteCarloSimulator:
    """Monte Carlo estimator for the top-event probability of a fault tree."""
```

- [ ] **Step 6.4: 运行确认通过**

Run: `cd python && PYTHONPATH=src .venv/bin/python -m pytest tests/unit/test_fta_monte_carlo.py -v`
Expected: 2 passed。

- [ ] **Step 6.5: 提交**

```bash
git add python/src/resolveagent/fta/tree.py python/src/resolveagent/fta/monte_carlo.py python/tests/unit/test_fta_monte_carlo.py
git commit -m "feat(fta): FTAEvent 增加 probability 概率字段"
```

### Task 7: FaultTree.validate() 门语义校验

**Files:**
- Modify: `python/src/resolveagent/fta/tree.py`（`FaultTree` 类末尾，约 line 138 后）
- Test: `python/tests/unit/test_fta_monte_carlo.py`（追加）

- [ ] **Step 7.1: 写失败测试（追加到 test_fta_monte_carlo.py）**

```python
def _tree_with_inhibit(conditioning: bool) -> FaultTree:
    events = [
        FTAEvent(id="top", name="Top", event_type=EventType.TOP),
        FTAEvent(id="a", name="A", event_type=EventType.BASIC),
    ]
    gate_inputs = ["a"]
    if conditioning:
        events.append(FTAEvent(id="cond", name="Cond", event_type=EventType.CONDITIONING))
        gate_inputs.append("cond")
    return FaultTree(
        id="t",
        name="t",
        top_event_id="top",
        events=events,
        gates=[
            FTAGate(id="g1", name="INH", gate_type=GateType.INHIBIT, input_ids=gate_inputs, output_id="top")
        ],
    )


def test_validate_inhibit_with_conditioning_event_has_no_warning():
    assert _tree_with_inhibit(conditioning=True).validate() == []


def test_validate_inhibit_without_conditioning_event_warns():
    warnings = _tree_with_inhibit(conditioning=False).validate()
    assert len(warnings) == 1
    assert "g1" in warnings[0]
```

- [ ] **Step 7.2: 运行确认失败**

Run: `cd python && PYTHONPATH=src .venv/bin/python -m pytest tests/unit/test_fta_monte_carlo.py -v -k validate`
Expected: FAIL — `AttributeError: 'FaultTree' object has no attribute 'validate'`。

- [ ] **Step 7.3: 实现**

`python/src/resolveagent/fta/tree.py` 的 `FaultTree` 类内、`get_input_values` 方法之后追加：

```python
    def validate(self) -> list[str]:
        """Return semantic warnings for gate misuse.

        Currently checks: INHIBIT gates must have a CONDITIONING event input;
        otherwise they silently behave as a plain AND gate.
        """
        warnings: list[str] = []
        for gate in self.gates:
            if gate.gate_type != GateType.INHIBIT:
                continue
            has_conditioning = False
            for input_id in gate.input_ids:
                event = self.get_event(input_id)
                if event is not None and event.event_type == EventType.CONDITIONING:
                    has_conditioning = True
                    break
            if not has_conditioning:
                warnings.append(
                    f"INHIBIT gate '{gate.id}' has no CONDITIONING event input; "
                    "treating it as a plain AND gate"
                )
        return warnings
```

- [ ] **Step 7.4: 运行确认通过**

Run: `cd python && PYTHONPATH=src .venv/bin/python -m pytest tests/unit/test_fta_monte_carlo.py -v`
Expected: 4 passed。

- [ ] **Step 7.5: 提交**

```bash
git add python/src/resolveagent/fta/tree.py python/tests/unit/test_fta_monte_carlo.py
git commit -m "feat(fta): FaultTree.validate 校验 INHIBIT 缺失 conditioning 输入"
```

### Task 8: MonteCarloSimulator 蒙特卡洛仿真器

**Files:**
- Modify: `python/src/resolveagent/fta/monte_carlo.py`（替换 Task 6 的占位）
- Test: `python/tests/unit/test_fta_monte_carlo.py`（追加）

- [ ] **Step 8.1: 写失败测试（追加）**

```python
def _two_input_tree(gate_type: GateType, p_a: float, p_b: float, **gate_kwargs) -> FaultTree:
    return FaultTree(
        id="t",
        name="t",
        top_event_id="top",
        events=[
            FTAEvent(id="top", name="Top", event_type=EventType.TOP),
            FTAEvent(id="a", name="A", event_type=EventType.BASIC, probability=p_a),
            FTAEvent(id="b", name="B", event_type=EventType.BASIC, probability=p_b),
        ],
        gates=[
            FTAGate(
                id="g1",
                name="g1",
                gate_type=gate_type,
                input_ids=["a", "b"],
                output_id="top",
                **gate_kwargs,
            )
        ],
    )


def test_or_gate_matches_analytic_solution():
    result = MonteCarloSimulator().simulate(_two_input_tree(GateType.OR, 0.5, 0.5), runs=50_000, seed=42)
    assert abs(result.failure_probability - 0.75) < 0.02


def test_and_gate_matches_analytic_solution():
    result = MonteCarloSimulator().simulate(_two_input_tree(GateType.AND, 0.3, 0.4), runs=50_000, seed=42)
    assert abs(result.failure_probability - 0.12) < 0.02


def test_voting_gate_matches_analytic_solution():
    tree = _two_input_tree(GateType.VOTING, 0.5, 0.5, k_value=2)
    tree.events.append(FTAEvent(id="c", name="C", event_type=EventType.BASIC, probability=0.5))
    tree.gates[0].input_ids = ["a", "b", "c"]
    # P(≥2 of 3 fail, p=0.5) = 0.5
    result = MonteCarloSimulator().simulate(tree, runs=50_000, seed=42)
    assert abs(result.failure_probability - 0.5) < 0.02


def test_same_seed_is_reproducible():
    sim = MonteCarloSimulator()
    r1 = sim.simulate(_two_input_tree(GateType.OR, 0.5, 0.5), runs=5_000, seed=7)
    r2 = sim.simulate(_two_input_tree(GateType.OR, 0.5, 0.5), runs=5_000, seed=7)
    assert r1.failure_probability == r2.failure_probability
    assert r1.confidence_interval == r2.confidence_interval


def test_priority_and_requires_input_order():
    # p=1.0 双输入：两事件必然都失效，失效顺序随机 → 恰好一半试验满足 input_ids 顺序
    result = MonteCarloSimulator().simulate(
        _two_input_tree(GateType.PRIORITY_AND, 1.0, 1.0), runs=50_000, seed=42
    )
    assert abs(result.failure_probability - 0.5) < 0.03


def test_priority_and_asymmetric_probability():
    # P(双失效)=0.5 × P(顺序命中)=0.5 → 0.25
    result = MonteCarloSimulator().simulate(
        _two_input_tree(GateType.PRIORITY_AND, 1.0, 0.5), runs=50_000, seed=42
    )
    assert abs(result.failure_probability - 0.25) < 0.03


def test_confidence_interval_brackets_estimate():
    result = MonteCarloSimulator().simulate(_two_input_tree(GateType.OR, 0.5, 0.5), runs=10_000, seed=1)
    low, high = result.confidence_interval
    assert 0.0 <= low <= result.failure_probability <= high <= 1.0


def test_missing_probability_raises():
    tree = _two_input_tree(GateType.OR, 0.5, 0.5)
    tree.events[1].probability = None
    with pytest.raises(ValueError, match="missing probability"):
        MonteCarloSimulator().simulate(tree)


def test_out_of_range_probability_raises():
    with pytest.raises(ValueError, match="out of range"):
        MonteCarloSimulator().simulate(_two_input_tree(GateType.OR, 1.5, 0.5))
```

- [ ] **Step 8.2: 运行确认失败**

Run: `cd python && PYTHONPATH=src .venv/bin/python -m pytest tests/unit/test_fta_monte_carlo.py -v -k "analytic or reproducible or priority or confidence or raises"`
Expected: FAIL/ERROR — `simulate` 不存在。

- [ ] **Step 8.3: 完整实现（替换 monte_carlo.py 全部内容）**

```python
"""Monte Carlo simulation for fault trees.

Samples basic-event failures Bernoulli-style over many trials and propagates
them through gates bottom-up to estimate the top-event failure probability.

PRIORITY_AND gates use dynamic ordering semantics: each trial assigns a random
failure rank to every basic event, and the gate fires only when all inputs fail
in the order given by ``input_ids``. Ordering applies to BASIC inputs; gate
outputs as inputs are not rank-constrained (documented simplification).
"""

from __future__ import annotations

import logging
import math
import random
from dataclasses import dataclass

from resolveagent.fta.tree import FaultTree, GateType

logger = logging.getLogger(__name__)


@dataclass
class MonteCarloResult:
    """Aggregated outcome of a Monte Carlo simulation."""

    failure_probability: float
    confidence_interval: tuple[float, float]
    runs: int
    seed: int | None
    top_event_id: str


class MonteCarloSimulator:
    """Monte Carlo estimator for the top-event probability of a fault tree."""

    def __init__(self, default_runs: int = 10_000) -> None:
        self._default_runs = default_runs

    def simulate(
        self,
        tree: FaultTree,
        runs: int | None = None,
        seed: int | None = None,
    ) -> MonteCarloResult:
        """Simulate trials and estimate the top-event failure probability.

        Args:
            tree: Fault tree whose BASIC events carry ``probability`` in [0, 1].
            runs: Number of trials (defaults to ``default_runs``).
            seed: Optional RNG seed for reproducible results.

        Returns:
            MonteCarloResult with the estimate and a Wilson confidence interval.

        Raises:
            ValueError: If any BASIC event lacks a probability, a probability is
                out of [0, 1], or ``runs`` is not positive.
        """
        trials = runs if runs is not None else self._default_runs
        if trials <= 0:
            raise ValueError(f"runs must be positive, got {trials}")

        basics = tree.get_basic_events()
        if not basics:
            raise ValueError("fault tree has no basic events to simulate")

        missing = [e.id for e in basics if e.probability is None]
        if missing:
            raise ValueError(f"basic events missing probability: {', '.join(missing)}")

        for event in basics:
            if event.probability is not None and not 0.0 <= event.probability <= 1.0:
                raise ValueError(
                    f"probability for '{event.id}' out of range [0, 1]: {event.probability}"
                )

        rng = random.Random(seed)
        failures = 0
        for _ in range(trials):
            if self._sample_trial(tree, rng):
                failures += 1

        estimate = failures / trials
        logger.info(
            "Monte Carlo simulation complete",
            extra={
                "tree_id": tree.id,
                "runs": trials,
                "failures": failures,
                "failure_probability": estimate,
            },
        )
        return MonteCarloResult(
            failure_probability=estimate,
            confidence_interval=self._wilson_interval(failures, trials),
            runs=trials,
            seed=seed,
            top_event_id=tree.top_event_id,
        )

    def _sample_trial(self, tree: FaultTree, rng: random.Random) -> bool:
        """Run one trial: sample basic events, propagate gates, read the last gate result."""
        values: dict[str, bool] = {}
        ranks: dict[str, float] = {}
        for event in tree.get_basic_events():
            values[event.id] = rng.random() < (event.probability or 0.0)
            ranks[event.id] = rng.random()

        gate_by_output = {g.output_id: g for g in tree.gates if g.output_id}
        gate_values: dict[str, bool] = {}
        top_result = False

        for gate in tree.get_gates_bottom_up():
            inputs = [self._resolve_input(i, values, gate_by_output, gate_values) for i in gate.input_ids]
            result = self._evaluate_gate(gate.gate_type, inputs, gate.k_value)
            if result and gate.gate_type == GateType.PRIORITY_AND:
                result = self._priority_order_ok(gate.input_ids, ranks)
            gate_values[gate.id] = result
            top_result = result

        return top_result

    @staticmethod
    def _resolve_input(
        node_id: str,
        values: dict[str, bool],
        gate_by_output: dict[str, "object"],
        gate_values: dict[str, bool],
    ) -> bool:
        """Resolve an input id to its sampled value (basic event or gate output)."""
        if node_id in values:
            return values[node_id]
        gate = gate_by_output.get(node_id)
        if gate is not None:
            return gate_values.get(gate.id, False)
        return False

    @staticmethod
    def _evaluate_gate(gate_type: GateType, inputs: list[bool], k_value: int) -> bool:
        if not inputs:
            return False
        if gate_type == GateType.AND:
            return all(inputs)
        if gate_type == GateType.OR:
            return any(inputs)
        if gate_type == GateType.VOTING:
            return sum(inputs) >= k_value
        if gate_type in (GateType.INHIBIT, GateType.PRIORITY_AND):
            return all(inputs)
        return False

    @staticmethod
    def _priority_order_ok(input_ids: list[str], ranks: dict[str, float]) -> bool:
        """True when ranked inputs failed in input_ids order (strictly increasing)."""
        seq = [ranks[i] for i in input_ids if i in ranks]
        return all(seq[i] < seq[i + 1] for i in range(len(seq) - 1))

    @staticmethod
    def _wilson_interval(successes: int, n: int, z: float = 1.96) -> tuple[float, float]:
        if n == 0:
            return (0.0, 1.0)
        p = successes / n
        denom = 1.0 + z * z / n
        center = (p + z * z / (2 * n)) / denom
        margin = z * math.sqrt(p * (1.0 - p) / n + z * z / (4.0 * n * n)) / denom
        return (max(0.0, center - margin), min(1.0, center + margin))
```

注意 `_resolve_input` 的 `gate_by_output` 参数类型注解写成 `dict[str, object]` 会过不了 mypy 语义，直接写 `dict[str, "FTAGate"]`：文件顶部加 `from typing import TYPE_CHECKING` + `if TYPE_CHECKING: from resolveagent.fta.tree import FTAGate`，注解用 `dict[str, "FTAGate"]`。

- [ ] **Step 8.4: 运行确认通过**

Run: `cd python && PYTHONPATH=src .venv/bin/python -m pytest tests/unit/test_fta_monte_carlo.py -v`
Expected: 13 passed。

- [ ] **Step 8.5: lint**

Run: `cd python && ruff check src/resolveagent/fta/monte_carlo.py tests/unit/test_fta_monte_carlo.py`
Expected: 无告警。

- [ ] **Step 8.6: 提交**

```bash
git add python/src/resolveagent/fta/monte_carlo.py python/tests/unit/test_fta_monte_carlo.py
git commit -m "feat(fta): 蒙特卡洛仿真器——Bernoulli 采样、动态门传播（PRIORITY_AND 时序语义）、Wilson 置信区间"
```

### Task 9: FTAEngine 集成（execute 注入仿真 + analyze 组合割集）

**Files:**
- Modify: `python/src/resolveagent/fta/engine.py`
- Test: `python/tests/unit/test_fta_engine.py`（追加）

- [ ] **Step 9.1: 写失败测试（追加到 test_fta_engine.py）**

文件顶部 import 区补充：

```python
from resolveagent.fta.engine import FTAEngine
```
（已有，无需改。）追加测试：

```python
def _probabilistic_or_tree() -> FaultTree:
    return FaultTree(
        id="t",
        name="t",
        top_event_id="top",
        events=[
            FTAEvent(id="top", name="Top", event_type=EventType.TOP),
            FTAEvent(id="a", name="A", event_type=EventType.BASIC, evaluator="static:false", probability=0.5),
            FTAEvent(id="b", name="B", event_type=EventType.BASIC, evaluator="static:false", probability=0.5),
        ],
        gates=[
            FTAGate(id="g1", name="OR", gate_type=GateType.OR, input_ids=["a", "b"], output_id="top")
        ],
    )


async def test_engine_includes_simulation_when_probabilities_present():
    tree = _probabilistic_or_tree()
    events = [event async for event in FTAEngine().execute(tree, {})]
    completed = next(e for e in events if e["type"] == "workflow.completed")
    sim = completed["data"]["simulation"]
    assert abs(sim["failure_probability"] - 0.75) < 0.05
    assert sim["runs"] == 10_000


async def test_engine_omits_simulation_without_probabilities():
    tree = FaultTree(
        id="t",
        name="t",
        top_event_id="top",
        events=[
            FTAEvent(id="top", name="Top", event_type=EventType.TOP),
            FTAEvent(id="a", name="A", event_type=EventType.BASIC, evaluator="static:true"),
            FTAEvent(id="b", name="B", event_type=EventType.BASIC, evaluator="static:false"),
        ],
        gates=[
            FTAGate(id="g1", name="OR", gate_type=GateType.OR, input_ids=["a", "b"], output_id="top")
        ],
    )
    events = [event async for event in FTAEngine().execute(tree, {})]
    completed = next(e for e in events if e["type"] == "workflow.completed")
    assert "simulation" not in completed["data"]


async def test_analyze_returns_cut_sets_and_simulation():
    result = await FTAEngine().analyze(_probabilistic_or_tree(), runs=5_000, seed=42)
    assert sorted(sorted(cs) for cs in result.cut_sets) == [["a"], ["b"]]
    assert result.simulation is not None
    assert abs(result.failure_probability - 0.75) < 0.05


async def test_analyze_without_probabilities_skips_simulation():
    tree = FaultTree(
        id="t",
        name="t",
        top_event_id="top",
        events=[
            FTAEvent(id="top", name="Top", event_type=EventType.TOP),
            FTAEvent(id="a", name="A", event_type=EventType.BASIC),
            FTAEvent(id="b", name="B", event_type=EventType.BASIC),
        ],
        gates=[
            FTAGate(id="g1", name="OR", gate_type=GateType.OR, input_ids=["a", "b"], output_id="top")
        ],
    )
    result = await FTAEngine().analyze(tree)
    assert result.cut_sets
    assert result.simulation is None
    assert result.failure_probability is None
```

- [ ] **Step 9.2: 运行确认失败**

Run: `cd python && PYTHONPATH=src .venv/bin/python -m pytest tests/unit/test_fta_engine.py -v`
Expected: 新增 4 个测试 FAIL/ERROR（`analyze` 不存在、`simulation` 键不存在）。

- [ ] **Step 9.3: 实现 engine.py**

1) import 区（`from typing import ...` 之前）加：

```python
from dataclasses import dataclass
```

并在 `from resolveagent.fta.evaluator import NodeEvaluator` 之后加：

```python
from resolveagent.fta.cut_sets import compute_minimal_cut_sets
from resolveagent.fta.monte_carlo import MonteCarloResult, MonteCarloSimulator
```

2) `class FTAEngine` 之前加：

```python
@dataclass
class FTAAnalysisResult:
    """Result of a full FTA analysis: minimal cut sets + optional probability simulation."""

    tree_id: str
    top_event_id: str
    cut_sets: list[set[str]]
    simulation: MonteCarloResult | None = None

    @property
    def failure_probability(self) -> float | None:
        return self.simulation.failure_probability if self.simulation else None
```

3) `__init__` 中 `self.evaluator = NodeEvaluator()` 之后加：

```python
        self._simulator = MonteCarloSimulator()
```

4) `execute()` 中，`yield {"type": "workflow.started", ...}` 之前加校验告警：

```python
        for warning in tree.validate():
            logger.warning("FTA tree validation: %s", warning)
```

5) `execute()` 中，门求值循环结束后（`duration_ms = ...` 之前）加：

```python
        # Probability simulation: only when every basic event carries a probability
        basics = tree.get_basic_events()
        simulation_payload: dict[str, Any] | None = None
        if basics and all(e.probability is not None for e in basics):
            sim = self._simulator.simulate(tree)
            simulation_payload = {
                "failure_probability": sim.failure_probability,
                "confidence_interval": list(sim.confidence_interval),
                "runs": sim.runs,
                "top_event_id": sim.top_event_id,
            }
```

6) 持久化 payload 中 `"gate_results": gate_results,` 之后加：

```python
                        "simulation": simulation_payload,
```

7) 最终 yield 的 `data` 字典中，`"duration_ms": duration_ms,` 之后加：

```python
                "simulation": simulation_payload,
```

8) 类末尾新增 `analyze`：

```python
    async def analyze(
        self,
        tree: FaultTree,
        runs: int | None = None,
        seed: int | None = None,
    ) -> FTAAnalysisResult:
        """Analyze a fault tree: minimal cut sets (MOCUS) + Monte Carlo simulation.

        Simulation runs only when every basic event has a probability set.
        """
        cut_sets = compute_minimal_cut_sets(tree)
        simulation: MonteCarloResult | None = None
        basics = tree.get_basic_events()
        if basics and all(e.probability is not None for e in basics):
            simulation = self._simulator.simulate(tree, runs=runs, seed=seed)
        return FTAAnalysisResult(
            tree_id=tree.id,
            top_event_id=tree.top_event_id,
            cut_sets=cut_sets,
            simulation=simulation,
        )
```

注意：engine.py 中 `FaultTree` 目前在 `TYPE_CHECKING` 下导入；`analyze` 仅做类型注解使用，保持 TYPE_CHECKING 导入即可，无需改为运行时导入。

- [ ] **Step 9.4: 运行确认通过（含既有测试无回归）**

Run: `cd python && PYTHONPATH=src .venv/bin/python -m pytest tests/unit/test_fta_engine.py tests/unit/test_fta_monte_carlo.py tests/unit/test_fta_parser.py -v`
Expected: 全部通过。

- [ ] **Step 9.5: lint**

Run: `cd python && ruff check src/resolveagent/fta/engine.py`
Expected: 无告警。

- [ ] **Step 9.6: 提交**

```bash
git add python/src/resolveagent/fta/engine.py python/tests/unit/test_fta_engine.py
git commit -m "feat(fta): FTAEngine 集成蒙特卡洛——execute 注入 simulation 数据 + analyze 组合 MOCUS 割集与仿真"
```

### Task 10: 接线 AdaptiveWeightAdjuster

**Files:**
- Modify: `python/src/resolveagent/selector/resilient_selector.py`（`ResilientConfig` line ~94、`__init__` line ~310、`_route_and_execute_core` line ~449/488/495、`_force_alternative_route` line ~642、`get_session_stats` line ~680）
- Test: `python/tests/unit/test_resilient_selector_adaptive.py`（新建）

- [ ] **Step 10.1: 写失败测试（新建文件）**

```python
"""Unit tests for AdaptiveWeightAdjuster wiring in ResilientSelector."""

from typing import Any

from resolveagent.selector.resilient_selector import (
    ResilientConfig,
    ResilientSelector,
)
from resolveagent.selector.selector import RouteDecision


class StubSelector:
    """Returns a canned route decision on every call."""

    def __init__(self, route_type: str = "skill") -> None:
        self.route_type = route_type

    async def route(
        self,
        input_text: str,
        agent_id: str,
        context: dict[str, Any] | None = None,
        bypass_cache: bool = False,
    ) -> RouteDecision:
        return RouteDecision(
            route_type=self.route_type,
            route_target="stub",
            confidence=0.9,
            reasoning="stub",
        )


def _ok_executor():
    async def _run(_decision: RouteDecision) -> dict[str, Any]:
        return {"success": True, "output": "done"}

    return _run


def _fail_executor():
    async def _run(_decision: RouteDecision) -> dict[str, Any]:
        return {"success": False, "error": "boom"}

    return _run


async def test_successful_route_increases_weight():
    selector = ResilientSelector(selector=StubSelector("skill"))
    await selector.route_and_execute("hello", "agent-1", _ok_executor())
    assert selector._weight_adjuster.get_weight("skill") > 1.0


async def test_failed_route_decreases_weight():
    config = ResilientConfig(max_retries=0, fallback_to_code_analysis=False)
    selector = ResilientSelector(selector=StubSelector("skill"), config=config)
    await selector.route_and_execute("hello", "agent-1", _fail_executor())
    assert selector._weight_adjuster.get_weight("skill") < 1.0


async def test_disabled_flag_skips_recording():
    config = ResilientConfig(
        adaptive_weights_enabled=False, max_retries=0, fallback_to_code_analysis=False
    )
    selector = ResilientSelector(selector=StubSelector("skill"), config=config)
    await selector.route_and_execute("hello", "agent-1", _fail_executor())
    assert selector._weight_adjuster.get_all_weights() == {}
    assert "adaptive_weights" not in selector.get_session_stats()


def test_weight_ordering_influences_alternative_route():
    selector = ResilientSelector(
        selector=StubSelector(),
        config=ResilientConfig(route_priority=["skill", "rag", "fta", "code_analysis"]),
    )
    for _ in range(10):
        selector._weight_adjuster.record_outcome("code_analysis", True)
        selector._weight_adjuster.record_outcome("fta", False)
    original = RouteDecision(route_type="skill", route_target="x", confidence=0.9, reasoning="orig")
    alternative = selector._force_alternative_route(original, tried={"skill", "rag"}, context={})
    assert alternative.route_type == "code_analysis"


def test_disabled_keeps_priority_order():
    selector = ResilientSelector(
        selector=StubSelector(),
        config=ResilientConfig(
            route_priority=["skill", "rag", "fta", "code_analysis"],
            adaptive_weights_enabled=False,
        ),
    )
    for _ in range(10):
        selector._weight_adjuster.record_outcome("code_analysis", True)
    original = RouteDecision(route_type="skill", route_target="x", confidence=0.9, reasoning="orig")
    alternative = selector._force_alternative_route(original, tried={"skill", "rag"}, context={})
    assert alternative.route_type == "fta"


async def test_session_stats_expose_weights():
    selector = ResilientSelector(selector=StubSelector("skill"))
    await selector.route_and_execute("hello", "agent-1", _ok_executor())
    stats = selector.get_session_stats()
    assert stats["adaptive_weights"]["weights"]["skill"] > 1.0
```

- [ ] **Step 10.2: 运行确认失败**

Run: `cd python && PYTHONPATH=src .venv/bin/python -m pytest tests/unit/test_resilient_selector_adaptive.py -v`
Expected: FAIL — `TypeError: ResilientConfig.__init__() got an unexpected keyword argument 'adaptive_weights_enabled'`（及 `_weight_adjuster` 属性不存在）。

- [ ] **Step 10.3: 实现**

1) `ResilientConfig`（line ~94）追加字段：

```python
    fallback_to_code_analysis: bool = True
    adaptive_weights_enabled: bool = True
```

2) `ResilientSelector.__init__` 中 `self._re_enricher = ReEnricher()` 之后加：

```python
        self._weight_adjuster = AdaptiveWeightAdjuster()
```

3) `_route_and_execute_core` 中 `session.attempts.append(attempt_record)` 之后加：

```python
            if self._config.adaptive_weights_enabled:
                self._weight_adjuster.record_outcome(
                    _canonical_route_type(decision.route_type), attempt_record.success
                )
```

4) fallback 块中 `session.attempts.append(fallback_record)` 之后加：

```python
            if self._config.adaptive_weights_enabled:
                self._weight_adjuster.record_outcome("code_analysis", fallback_record.success)
```

5) `session.total_latency_ms = (time.monotonic() - start_time) * 1000` 之前加：

```python
        if self._config.adaptive_weights_enabled:
            self._weight_adjuster.apply_decay()
```

6) `_force_alternative_route` 中 `available = [r for r in self._config.route_priority if r not in tried]` 之后加：

```python
        if self._config.adaptive_weights_enabled:
            # 稳定排序：同权重保持 route_priority 原顺序
            available = sorted(available, key=lambda r: -self._weight_adjuster.get_weight(r))
```

7) `get_session_stats` 改为：

```python
    def get_session_stats(self) -> dict[str, Any]:
        """Get statistics about all routing sessions."""
        stats: dict[str, Any] = {
            "total_sessions": self._session_counter,
            "config": {
                "max_retries": self._config.max_retries,
                "total_timeout": self._config.total_timeout_seconds,
                "route_priority": self._config.route_priority,
            },
        }
        if self._config.adaptive_weights_enabled:
            stats["adaptive_weights"] = self._weight_adjuster.get_stats()
        return stats
```

- [ ] **Step 10.4: 运行确认通过（含既有 selector 测试无回归）**

Run: `cd python && PYTHONPATH=src .venv/bin/python -m pytest tests/unit/test_resilient_selector_adaptive.py tests/unit/test_selector.py tests/unit/test_selector_complete.py tests/unit/test_mega_selector_modes.py -v`
Expected: 全部通过。

- [ ] **Step 10.5: lint**

Run: `cd python && ruff check src/resolveagent/selector/resilient_selector.py tests/unit/test_resilient_selector_adaptive.py`
Expected: 无告警。

- [ ] **Step 10.6: 提交**

```bash
git add python/src/resolveagent/selector/resilient_selector.py python/tests/unit/test_resilient_selector_adaptive.py
git commit -m "feat(selector): 接线 AdaptiveWeightAdjuster——会话级 record_outcome/decay + 权重排序备选路由"
```

### Task 11: README 与中文文档同步成真

**Files:**
- Modify: `README.md`（4 处）、`docs/zh/` 下含失实表述的文档

- [ ] **Step 11.1: 修正 README 差异化表格（约 line 87）**

把：
```
| **Formal fault-tree reasoning** | FTA engine with six gate types, minimal cut sets, and Monte-Carlo simulation for rigorous root-cause analysis. |
```
改为：
```
| **Formal fault-tree reasoning** | FTA engine with five gate types (AND/OR/VOTING/INHIBIT/PRIORITY_AND), minimal cut sets, and Monte-Carlo simulation with dynamic ordering semantics for PRIORITY_AND. |
```

- [ ] **Step 11.2: 修正"十二大亮点"表第 8 行（约 line 194）**

把：
```
| 8 | **FTA Engine** | `fta/` | 故障树分析：六种门类型 + 最小割集 + 蒙特卡洛仿真 |
```
改为：
```
| 8 | **FTA Engine** | `fta/` | 故障树分析：五种门类型（PRIORITY_AND 带动态时序语义）+ 最小割集 + 蒙特卡洛仿真 |
```

- [ ] **Step 11.3: 修正 FTA 深潜代码示例（约 line 360-370）**

把代码块：
```python
class FTAEngine:
    """六种门类型 + 最小割集 + 蒙特卡洛仿真"""

    gates = [AND, OR, NOT, VOTING, INHIBIT, PRIORITY_AND]

    async def analyze(self, tree: FaultTree) -> FTAAnalysisResult:
        cut_sets = await self._compute_minimal_cut_sets(tree)   # 最小割集
        prob = await self._monte_carlo_simulation(tree)         # 蒙特卡洛仿真
        return FTAAnalysisResult(cut_sets=cut_sets, failure_probability=prob)
```
改为：
```python
# fta/engine.py
class FTAEngine:
    """五种门类型（AND/OR/VOTING/INHIBIT/PRIORITY_AND）+ 最小割集 + 蒙特卡洛仿真"""

# 实际用法：
result = await engine.analyze(tree)   # MOCUS 最小割集 + 蒙特卡洛仿真
# result.cut_sets → list[set[str]] 最小割集
# result.failure_probability → top 事件失效概率（基础事件需设置 probability）
```

- [ ] **Step 11.4: 修正"Adaptive Selector"节示例（约 line 525-541）**

把示例代码：
```python
adjuster = AdaptiveWeightAdjuster(default_weight=1.0)

# 每次执行后记录结果
adjuster.record_outcome("skill", success=True, latency_ms=120)
adjuster.record_outcome("rag", success=False, latency_ms=3500)

# 时间衰减：权重向中性值 1.0 回归
adjuster.apply_decay(decay_factor=0.95)

# 获取当前权重
weights = adjuster.get_weights()
# → {"skill": 1.15, "rag": 0.85, "fta": 1.02, "code_analysis": 0.98}
```
改为：
```python
# selector/resilient_selector.py — 已接线，无需手工实例化
selector = ResilientSelector()  # 内置 AdaptiveWeightAdjuster（adaptive_weights_enabled=True）

# 每次路由尝试后自动 record_outcome(route_type, success)，会话结束 apply_decay()
session = await selector.route_and_execute("诊断 503", "ops-agent", executor)

# 备选路由按权重降序稳定排序（同权重保持 route_priority 顺序）
stats = selector.get_session_stats()
weights = stats["adaptive_weights"]["weights"]
# → {"skill": 1.05, "rag": 0.95, ...}
```

- [ ] **Step 11.5: 更新 Metrics 表（约 line 933）**

把：
```
| `resolveagent_adaptive_selector_weights` | 🔄 自适应选择器权重 (by route_type) |
```
改为：
```
| `resolveagent_adaptive_selector_weights` | 🔄 自适应选择器权重（经 ResilientSelector.get_session_stats 暴露，by route_type） |
```

- [ ] **Step 11.6: 更新 Feature Status 测试计数（约 line 702）**

Run: `cd python && PYTHONPATH=src .venv/bin/python -m pytest tests/unit --collect-only -q | tail -1`
用输出中的真实用例数替换 `> **v0.3.0** | 核心组件经全面修复与测试加固（Python 测试 432+ 用例全绿）` 中的 `432+`（改为新计数取整，如 `560+`）。

- [ ] **Step 11.7: 排查并修正中文文档同源失实表述**

Run: `grep -rn "六种门\|蒙特卡洛" docs/zh/ docs/design/ --include="*.md" | head -20`
对每处命中：
- "六种门类型" → 改为"五种门类型（AND/OR/VOTING/INHIBIT/PRIORITY_AND）"
- 声称"蒙特卡洛仿真"处 → 核对与 `fta/monte_carlo.py` 实现一致（Bernoulli 采样 + PRIORITY_AND 时序 + Wilson 区间）；若该文档此前描述了不存在的 API（如 `gates = [AND, OR, NOT, ...]`），同步修正为实际 API。
设计蒸馏文档（docs/design/）frontmatter 带 source_commit 锚点，修正后在文末追加一行 `> 2026-09-09: 门类型与蒙特卡洛表述已对齐 fta/monte_carlo.py 实现。`

- [ ] **Step 11.8: 验证无残留失实表述**

Run: `grep -rn "六种门" README.md docs/ | wc -l`
Expected: `0`。

- [ ] **Step 11.9: 提交**

```bash
git add README.md docs/
git commit -m "docs: README/中文文档与 FTA 蒙特卡洛、门语义、自适应权重实现对齐"
```

### Task 12: P1 全量验收

- [ ] **Step 12.1: Python 全量单测**

Run: `cd python && PYTHONPATH=src .venv/bin/python -m pytest tests/unit -q 2>&1 | tail -3`
Expected: 全部通过。

- [ ] **Step 12.2: Python lint**

Run: `cd python && ruff check .`
Expected: 无告警。

- [ ] **Step 12.3: Go 侧无回归抽查（P1 未触碰 Go，快速确认）**

Run: `go build ./... && go test ./pkg/... 2>&1 | tail -5`
Expected: 编译通过、测试通过。

- [ ] **Step 12.4: 对照 spec 验收清单核对**

打开 `docs/superpowers/specs/2026-09-09-production-hardening-design.md` 第 4.1–4.6 节逐条核对：
- FTAEvent.probability 存在 ✓（Task 6）
- MonteCarloSimulator 含 Wilson 区间与种子复现 ✓（Task 8）
- INHIBIT 校验 + PRIORITY_AND 静态近似注释 ✓（Task 7 + Task 8 docstring）
- execute 注入 simulation + analyze 组合 ✓（Task 9）
- 权重接线含开关、稳定排序、get_session_stats ✓（Task 10）
- README/docs 一致 ✓（Task 11）

- [ ] **Step 12.5: 收尾提交（如有零星修正）**

Run: `git status --short`
若有未提交文件，归入相应提交；预期为空。P1 完成，可进入 P2（另行出计划）。
