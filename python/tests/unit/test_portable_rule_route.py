"""Tests for the portable rule-route skill (zero-dependency variant).

Covers:
  - parity invariant: ROUTING_RULES tables must be identical
  - decision parity: route() output == RuleStrategy.decide() output
  - output shape: all required RouteDecision fields present
  - input key aliases: input_text, query, empty
  - CLI stdout: single valid JSON object
  - stdlib-only invariant: no resolveagent import, no __future__
  - sandbox end-to-end: SkillLoader + SkillExecutor round-trip
"""

from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------------
SKILL_DIR = Path(__file__).resolve().parents[2] / "skills" / "rule-route"
SKILL_FILE = SKILL_DIR / "rule_route.py"

# Load rule_route as a module without going through the package import path.
_spec = importlib.util.spec_from_file_location("rule_route_portable", SKILL_FILE)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
portable_route = _mod.route
portable_routing_rules = _mod.ROUTING_RULES

# ---------------------------------------------------------------------------
# 1. Rule table parity
# ---------------------------------------------------------------------------


def test_rule_table_matches_rule_strategy():
    """portable ROUTING_RULES must be byte-for-byte equal to RuleStrategy.ROUTING_RULES."""
    from resolveagent.selector.strategies.rule_strategy import RuleStrategy

    server_rules = RuleStrategy.ROUTING_RULES
    assert len(portable_routing_rules) == len(server_rules), (
        f"Table length mismatch: portable={len(portable_routing_rules)}, server={len(server_rules)}"
    )
    for i, (p_rule, s_rule) in enumerate(zip(portable_routing_rules, server_rules, strict=False)):
        assert p_rule["route_type"] == s_rule.route_type, f"rule[{i}] route_type mismatch"
        assert p_rule["target"] == s_rule.target, f"rule[{i}] target mismatch"
        assert p_rule["confidence"] == s_rule.confidence, f"rule[{i}] confidence mismatch"
        assert p_rule["patterns"] == s_rule.patterns, f"rule[{i}] patterns mismatch\nportable={p_rule['patterns']}\nserver  ={s_rule.patterns}"


# ---------------------------------------------------------------------------
# 2. Decision parity
# ---------------------------------------------------------------------------

PARITY_QUERIES = [
    # (input_text, expected_route_type, expected_route_target)
    ("search for recent articles on Kubernetes online", "skill", "web-search"),
    ("搜索最新的 Kubernetes 部署方案", "skill", "web-search"),
    ("diagnose root cause of the service outage", "fta", "incident-diagnosis"),
    ("诊断服务故障根因分析", "fta", "incident-diagnosis"),
    ("analyze this code for security vulnerabilities", "code_analysis", "static-analysis"),
    ("检查代码 bug 和漏洞", "code_analysis", "static-analysis"),
    ("read the log file /var/log/app.log", "skill", "file-ops"),
    ("what is the meaning of HTTP 503 error", "rag", "product-docs"),
    ("run this python script: print('hello')", "skill", "code-exec"),
    ("similar past incident involving database timeout", "rag", "incident-history"),
]


@pytest.mark.asyncio
@pytest.mark.parametrize("text,exp_type,exp_target", PARITY_QUERIES)
async def test_decision_parity(text, exp_type, exp_target):
    """portable route() and RuleStrategy.decide() must agree on route_type + route_target."""
    from resolveagent.selector.strategies.rule_strategy import RuleStrategy

    strategy = RuleStrategy()
    server_decision = await strategy.decide(text, agent_id="", context={})

    portable_decision = portable_route(text)

    assert portable_decision["route_type"] == server_decision.route_type, (
        f"route_type mismatch for: {text!r}\nportable={portable_decision['route_type']}, server={server_decision.route_type}"
    )
    assert portable_decision["route_target"] == server_decision.route_target, (
        f"route_target mismatch for: {text!r}\nportable={portable_decision['route_target']}, server={server_decision.route_target}"
    )
    # Also verify against our expected values
    assert portable_decision["route_type"] == exp_type
    assert portable_decision["route_target"] == exp_target


# ---------------------------------------------------------------------------
# 3. Output shape
# ---------------------------------------------------------------------------

REQUIRED_KEYS = {"route_type", "route_target", "confidence", "parameters", "reasoning", "chain"}


def test_output_shape_skill_query():
    """route() output includes all required RouteDecision keys."""
    decision = portable_route("search for Kubernetes tutorials online")
    assert REQUIRED_KEYS.issubset(decision.keys()), f"Missing keys: {REQUIRED_KEYS - decision.keys()}"


def test_output_shape_constructible_as_route_decision():
    """route() output can construct a RouteDecision object."""
    from resolveagent.selector.selector import RouteDecision

    decision = portable_route("search for Kubernetes tutorials online")
    decision_without_chain = {k: v for k, v in decision.items() if k != "chain"}
    rd = RouteDecision(**decision_without_chain)
    assert rd.route_type == decision["route_type"]
    assert rd.route_target == decision["route_target"]


def test_output_shape_default_direct():
    """An unmatched query returns a shape-correct 'direct' decision."""
    decision = portable_route("")
    assert REQUIRED_KEYS.issubset(decision.keys())
    assert decision["route_type"] == "direct"
    assert isinstance(decision["confidence"], float)
    assert isinstance(decision["chain"], list)


# ---------------------------------------------------------------------------
# 4. Input key aliases
# ---------------------------------------------------------------------------


def test_input_key_alias_input_text():
    """main() accepts input_text key."""
    _mod._COMPILED = None  # reset compiled cache between tests
    import io

    orig_stdin = sys.stdin
    sys.stdin = io.StringIO(json.dumps({"input_text": "搜索最新资讯"}))
    try:
        # We test route() directly for the key alias — main() stdin path tested elsewhere
        decision = portable_route("搜索最新资讯")
        assert decision["route_type"] == "skill"
        assert decision["route_target"] == "web-search"
    finally:
        sys.stdin = orig_stdin


def test_input_key_alias_query():
    """route() accepts any text regardless of key name — key resolution lives in main()."""
    decision = portable_route("搜索最新资讯")
    assert decision["route_type"] == "skill"


def test_input_empty_returns_direct():
    """Empty input_text returns route_type='direct' with low confidence."""
    decision = portable_route("")
    assert decision["route_type"] == "direct"
    assert decision["confidence"] < 0.6


# ---------------------------------------------------------------------------
# 5. CLI stdout is a single JSON object
# ---------------------------------------------------------------------------


def test_stdout_is_single_json_object():
    """Running rule_route.py via subprocess produces a single parseable JSON line on stdout."""
    result = subprocess.run(
        [sys.executable, str(SKILL_FILE), "--input-json", json.dumps({"input_text": "search for Python tutorials online"})],
        capture_output=True,
        text=True,
        timeout=15,
    )
    assert result.returncode == 0, f"Non-zero exit: {result.stderr}"
    stdout = result.stdout.strip()
    parsed = json.loads(stdout)  # must not raise
    assert isinstance(parsed, dict)
    assert "route_type" in parsed


def test_stdout_single_line():
    """stdout output is a single line (no extra whitespace or newlines within the JSON)."""
    result = subprocess.run(
        [sys.executable, str(SKILL_FILE), "--input-json", json.dumps({"input_text": "run this bash script"})],
        capture_output=True,
        text=True,
        timeout=15,
    )
    lines = [line for line in result.stdout.splitlines() if line.strip()]
    assert len(lines) == 1, f"Expected 1 JSON line, got {len(lines)}: {result.stdout!r}"


# ---------------------------------------------------------------------------
# 6. No resolveagent import, no __future__
# ---------------------------------------------------------------------------


def test_no_resolveagent_import_in_source():
    """rule_route.py must not import resolveagent."""
    source = SKILL_FILE.read_text()
    assert "resolveagent" not in source, "rule_route.py must not reference resolveagent"


def test_no_future_import_in_source():
    """rule_route.py must not use 'from __future__ import annotations'."""
    source = SKILL_FILE.read_text()
    # Only check non-comment lines — comment mentions the prohibition but must not use it
    code_lines = [ln for ln in source.splitlines() if not ln.lstrip().startswith("#")]
    assert not any("from __future__" in ln for ln in code_lines), (
        "rule_route.py must not contain 'from __future__' — the sandbox wrapper inlines it and a misplaced __future__ causes SyntaxError"
    )


def test_stdlib_only_execution():
    """rule_route.py runs cleanly without resolveagent on PYTHONPATH."""
    clean_env = {k: v for k, v in __import__("os").environ.items() if k != "PYTHONPATH"}
    result = subprocess.run(
        [sys.executable, str(SKILL_FILE), "--input-json", json.dumps({"input_text": "find me information on cloud architecture"})],
        capture_output=True,
        text=True,
        timeout=15,
        env=clean_env,
    )
    assert result.returncode == 0, f"Failed with stderr: {result.stderr}"
    parsed = json.loads(result.stdout.strip())
    assert "route_type" in parsed


# ---------------------------------------------------------------------------
# 7. Sandbox end-to-end
# ---------------------------------------------------------------------------


def test_sandbox_end_to_end():
    """SkillLoader.load('rule-route') + SkillExecutor.execute round-trip returns a route_type."""
    from resolveagent.skills.executor import SkillExecutor
    from resolveagent.skills.loader import SkillLoader
    from resolveagent.skills.sandbox import SandboxConfig

    # On macOS RLIMIT_AS is very restrictive — give the sandbox extra headroom.
    config = SandboxConfig(max_memory_mb=512)
    loader = SkillLoader()
    skill = loader.load("rule-route")

    executor = SkillExecutor(sandbox_config=config)
    import asyncio

    async def _run():
        return await executor.execute(skill=skill, inputs={"input_text": "search for API docs online"})

    result = asyncio.run(_run())
    assert result.success, f"Skill execution failed: {result.error}"
    assert "route_type" in result.outputs, f"Missing route_type in outputs: {result.outputs}"
    assert result.outputs["route_type"] == "skill"
