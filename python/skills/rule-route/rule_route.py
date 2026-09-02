# Portable rule-based router — zero dependencies (stdlib only).
# IMPORTANT: Do NOT add "from __future__ import annotations".
# The sandbox wrapper inlines this file body after its own import block;
# a __future__ import would then appear after other statements and raise SyntaxError.
import json
import re
import sys

# ---------------------------------------------------------------------------
# Rule table — verbatim port of RuleStrategy.ROUTING_RULES.
# Must stay in sync with selector/strategies/rule_strategy.py:44-192.
# The parity test (test_portable_rule_route.py::test_rule_table_matches_rule_strategy)
# will fail loudly if the two tables diverge.
# ---------------------------------------------------------------------------
ROUTING_RULES = [
    # ========== Code Analysis Rules (High Priority) ==========
    {
        "route_type": "code_analysis",
        "patterns": [
            r"```[\s\S]*```",
            r"\b(analyze|review|check|inspect)\b.*\b(code|function|class|method)\b",
            r"\b(find|detect|identify)\b.*\b(bug|issue|vulnerability|error|problem)\b",
            r"\b(static analysis|code review|security scan|lint|linting)\b",
            r"\b(refactor|optimize|improve)\b.*\b(code|function|performance)\b",
            r"\b(ast|syntax tree|parse tree|call graph|dependency graph)\b",
            r"\b(code quality|code smell|technical debt|complexity)\b",
            r"\b(security|vulnerable|cve|injection|xss|csrf)\b.*\b(code|scan|check)\b",
            r"(分析|审查|检查).*(代码|bug|漏洞|安全)",
            r"(代码|bug|漏洞).*(分析|审查|检查|review)",
            r"review.*(function|代码|这段)",
        ],
        "target": "static-analysis",
        "confidence": 0.85,
        "description": "Code analysis and review requests",
    },
    {
        "route_type": "code_analysis",
        "patterns": [
            r"\bdef\s+\w+\s*\(",
            r"\bclass\s+\w+.*:",
            r"\bfunction\s+\w+\s*\(",
            r"\bfunc\s+\w+\s*\(",
            r"\bpublic\s+class\s+\w+",
        ],
        "target": "code-exec",
        "confidence": 0.75,
        "description": "Code snippet execution or analysis",
    },
    # ========== Workflow/FTA Rules ==========
    {
        "route_type": "fta",
        "patterns": [
            r"\b(diagnose|troubleshoot|investigate)\b.*\b(issue|problem|failure|error)\b",
            r"\b(diagnose|troubleshoot|investigate)\b.*\b(root cause|outage|incident|degradation)\b",
            r"\b(root cause|rca)\b.*\b(analysis|find|determine|of)\b",
            r"\bfault tree\b.*\b(analysis|build|create)\b",
            r"\b(decision tree|workflow)\b.*\b(run|execute|start)\b",
            r"\b(incident|outage|degradation)\s+(analysis|investigation|triage)\b",
            r"\b(why|how).*\b(failed|broken|not working|crashed|down)\b",
            r"\b(step.?by.?step|multi.?step|complex)\s+(process|diagnosis|analysis)\b",
            r"\broot cause of\b",
            r"(诊断|排查|分析).*(故障|根因|原因|问题)",
            r"(故障|根因|原因).*(诊断|排查|分析)",
        ],
        "target": "incident-diagnosis",
        "confidence": 0.85,
        "description": "Complex diagnostic workflows",
    },
    # ========== Skill Rules ==========
    {
        "route_type": "skill",
        "patterns": [
            r"\b(search|find|look up)\b.*\b(web|internet|online|google)\b",
            r"\b(search for|find me|look for)\b.*\b(information|results|articles)\b",
            r"(搜索|查找|检索)",
        ],
        "target": "web-search",
        "confidence": 0.9,
        "description": "Web search requests",
    },
    {
        "route_type": "skill",
        "patterns": [
            r"\b(run|execute|eval|evaluate)\b.*\b(code|script|command|program)\b",
            r"\b(python|javascript|bash|shell)\b.*\b(run|execute)\b",
            r"(运行|执行).*(代码|脚本|程序)",
        ],
        "target": "code-exec",
        "confidence": 0.85,
        "description": "Code execution requests",
    },
    {
        "route_type": "skill",
        "patterns": [
            r"\b(read|open|view|show|display)\b.*\b(file|document|content)\b",
            r"\b(write|save|create|append)\b.*\b(file|document)\b",
            r"\b(delete|remove)\b.*\b(file|folder|directory)\b",
            r"(读取|查看|打开).*(文件|日志)",
        ],
        "target": "file-ops",
        "confidence": 0.85,
        "description": "File system operations",
    },
    {
        "route_type": "skill",
        "patterns": [
            r"\b(send|post|get|fetch|call)\b.*\b(api|request|endpoint|http)\b",
            r"\b(curl|wget|http|https)\b.*\b(request|call)\b",
        ],
        "target": "api-call",
        "confidence": 0.85,
        "description": "API call requests",
    },
    {
        "route_type": "skill",
        "patterns": [
            r"\b(calculate|compute|math|sum|average)\b",
            r"\b(convert|transform|format)\b.*\b(data|json|xml|csv)\b",
        ],
        "target": "calculator",
        "confidence": 0.75,
        "description": "Calculation and conversion",
    },
    # ========== RAG Rules ==========
    {
        "route_type": "rag",
        "patterns": [
            r"\b(what is|what are|what's)\b.*\b(definition|meaning)\b",
            r"\b(explain|describe|tell me about)\b.*\b(concept|topic|term)\b",
            r"\b(how (do|does|to)|what's the)\b.*\b(work|function|operate)\b",
            r"\b(documentation|docs|manual|guide)\b.*\b(for|about|on)\b",
            r"\b(find|search)\b.*\b(documentation|docs|info|information)\b",
            r"\b(according to|based on|per|as per)\b.*\b(docs|documentation|manual)\b",
            r"(什么是|如何|怎么|怎样|查看文档)",
            r"(文档|手册|指南|部署|配置).*(查看|查询|搜索)",
        ],
        "target": "product-docs",
        "confidence": 0.7,
        "description": "Documentation and knowledge lookup",
    },
    {
        "route_type": "rag",
        "patterns": [
            r"\b(how to|steps to|procedure for)\b.*\b(deploy|configure|setup|install)\b",
            r"\b(runbook|playbook|sop)\b.*\b(for|about)\b",
            r"\b(standard|procedure|process)\b.*\b(for|to)\b.*\b(handling|responding)\b",
        ],
        "target": "runbooks",
        "confidence": 0.75,
        "description": "Operations runbooks lookup",
    },
    {
        "route_type": "rag",
        "patterns": [
            r"\b(similar|past|previous|historical)\b.*\b(incident|issue|problem)\b",
            r"\b(has (this|it)|did (we|anyone))\b.*\b(happen|occur|see)\b.*\bbefore\b",
            r"\b(incident|issue)\s+#?\d+\b",
        ],
        "target": "incident-history",
        "confidence": 0.8,
        "description": "Historical incident lookup",
    },
]

# ---------------------------------------------------------------------------
# Compiled patterns cache (module-level, populated lazily on first call)
# ---------------------------------------------------------------------------
_COMPILED = None


def _compiled():
    global _COMPILED
    if _COMPILED is None:
        _COMPILED = []
        for rule in ROUTING_RULES:
            patterns = [re.compile(p, re.IGNORECASE | re.MULTILINE) for p in rule["patterns"]]
            _COMPILED.append((rule, patterns))
    return _COMPILED


# ---------------------------------------------------------------------------
# Core routing logic — mirrors RuleStrategy.decide exactly
# ---------------------------------------------------------------------------
def _contains_code_block(text):
    if re.search(r"```[\s\S]*?```", text):
        return True
    code_lines = 0
    for line in text.split("\n"):
        if re.match(r"^\s*(def|class|function|import|from|var|let|const|func|package)\b", line):
            code_lines += 1
    return code_lines >= 2


def route(input_text):
    """Route input_text using rule-based pattern matching.

    Returns a dict shaped like RouteDecision with an extra 'chain' key.
    Additional parameters mark the decision as coming from the portable path.
    """
    best_match = None
    best_score = 0.0
    all_matches = []

    for rule, patterns in _compiled():
        match_count = 0
        matched_patterns = []

        for pattern in patterns:
            if pattern.search(input_text):
                match_count += 1
                matched_patterns.append(pattern.pattern[:50])

        if match_count > 0:
            score = rule["confidence"] * (0.7 + 0.3 * min(match_count / max(len(patterns), 1), 1.0))
            all_matches.append((rule["route_type"], score, rule["target"]))

            if score > best_score:
                best_score = score
                best_match = {
                    "route_type": rule["route_type"],
                    "route_target": rule["target"],
                    "confidence": min(score + 0.1, 1.0),
                    "reasoning": "Rule match: {} (patterns: {})".format(rule["description"], matched_patterns),
                    "parameters": {
                        "matched_patterns": matched_patterns,
                        "strategy": "rule",
                        "portable": True,
                    },
                    "chain": [],
                }

    if best_match and best_match["confidence"] >= 0.6:
        return best_match

    if _contains_code_block(input_text):
        return {
            "route_type": "code_analysis",
            "route_target": "static-analysis",
            "confidence": 0.75,
            "reasoning": "Code block detected in input",
            "parameters": {"detection_method": "code_block", "strategy": "rule", "portable": True},
            "chain": [],
        }

    return {
        "route_type": "direct",
        "route_target": "",
        "confidence": 0.3,
        "reasoning": "No rule matched with sufficient confidence",
        "parameters": {
            "attempted_matches": [m[0] for m in all_matches[:3]],
            "strategy": "rule",
            "portable": True,
        },
        "chain": [],
    }


# ---------------------------------------------------------------------------
# Entrypoint — resolves inputs from sandbox injection, argv, stdin, or {}
# ---------------------------------------------------------------------------
def main():
    try:
        inputs = globals().get("_inputs")

        if inputs is None:
            if len(sys.argv) >= 3 and sys.argv[1] == "--input-json":
                inputs = json.loads(sys.argv[2])
            else:
                raw = sys.stdin.read().strip()
                inputs = json.loads(raw) if raw else {}

        text = inputs.get("input_text") or inputs.get("query") or inputs.get("input") or ""
        decision = route(text)
        print(json.dumps(decision, ensure_ascii=False))
    except Exception as exc:
        fallback = {
            "route_type": "direct",
            "route_target": "",
            "confidence": 0.0,
            "reasoning": "portable rule route failed: {}".format(str(exc)[:200]),
            "parameters": {"error": str(exc)[:200], "strategy": "rule", "portable": True},
            "chain": [],
        }
        print(json.dumps(fallback, ensure_ascii=False))
        sys.exit(0)


if __name__ == "__main__":
    main()
