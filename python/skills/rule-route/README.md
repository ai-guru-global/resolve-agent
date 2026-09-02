# rule-route Skill

零依赖可移植规则路由器，将 ResolveAgent `RuleStrategy` 的路由能力外置给**没有安装 `resolveagent` 包**的外部 Agent 使用。

## 工作原理

`rule_route.py` 是一个纯 Python 标准库实现（仅依赖 `json`、`re`、`sys`），内嵌 11 组中英双语正则规则表，与 `RuleStrategy` 保持逐字段一致（由 parity test 守护）。可通过两个通道使用：

| 通道 | 场景 | 支持策略 |
|---|---|---|
| `POST /v1/selector/route` | 有网络访问的外部 Agent | `rule` / `llm` / `hybrid` |
| `rule_route.py` 单文件 | 离线 / 零依赖环境 | `rule` only |

---

## 场景一：HTTP 调用（推荐）

适合能访问 ResolveAgent 运行时服务的 Agent。

```bash
# 基础用法
curl -s -X POST http://localhost:9091/v1/selector/route \
  -H "Content-Type: application/json" \
  -d '{"input": "服务频繁超时，如何快速定位根因？", "strategy": "hybrid"}'
```

**响应示例：**
```json
{
  "decision": {
    "route_type": "skill",
    "route_target": "web-search",
    "confidence": 0.85,
    "parameters": {"strategy": "hybrid"},
    "reasoning": "Matched patterns: 超时, 根因, 定位",
    "chain": []
  },
  "strategy": "hybrid",
  "degraded": false,
  "fallback_reason": "",
  "latency_ms": 12.4
}
```

当 `degraded: true` 时，表示 LLM/hybrid 策略调用失败，服务已自动降级到 `rule` 策略返回结果，`fallback_reason` 字段说明原因。此时结果仍然可用，不会抛错。

**指定使用纯规则路由（最快，无需 LLM key）：**
```bash
curl -s -X POST http://localhost:9091/v1/selector/route \
  -H "Content-Type: application/json" \
  -d '{"input": "分析这段 Python 代码的性能瓶颈", "strategy": "rule"}'
```

---

## 场景二：完全离线单文件执行

无任何外部依赖，直接复制 `rule_route.py` 到目标环境运行。

```bash
# 方式 1：--input-json 参数
python rule_route.py --input-json '{"input_text": "诊断服务故障根因"}'

# 方式 2：stdin JSON
echo '{"query": "数据库连接池耗尽怎么处理"}' | python rule_route.py

# 方式 3：空输入（返回 direct 路由）
python rule_route.py
```

**输出（stdout 单行 JSON）：**
```json
{"route_type": "skill", "route_target": "web-search", "confidence": 0.75, "parameters": {"strategy": "rule", "portable": true, "matched_patterns": ["根因", "故障", "诊断"]}, "reasoning": "Rule strategy matched: fault_analysis (score=0.68)", "chain": []}
```

输出到 `sys.stderr` 的调试信息可忽略，只需解析 stdout 最后一个有效 JSON 行。

---

## 场景三：两层路由（本地快路径 + 远端增强）

本地先跑规则路由，高置信度直接执行；低置信度再调 HTTP 端点走 hybrid 策略。

```python
import json
import subprocess
import urllib.request

def route(input_text: str) -> dict:
    # 第一层：本地零依赖规则路由
    proc = subprocess.run(
        ["python", "/path/to/rule_route.py", "--input-json",
         json.dumps({"input_text": input_text})],
        capture_output=True, text=True, timeout=5
    )
    local = json.loads(proc.stdout.strip())

    # 高置信度直接采用本地结果
    if local["confidence"] >= 0.7:
        return local

    # 第二层：低置信度走远端 hybrid 策略
    payload = json.dumps({"input": input_text, "strategy": "hybrid"}).encode()
    req = urllib.request.Request(
        "http://localhost:9091/v1/selector/route",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        remote = json.loads(resp.read())
    return remote["decision"]
```

---

## 场景四：通过 Hook 拦截请求

在外部 Agent 里注册 `selector.route` pre-hook，拦截路由请求、Shell out 到 `rule_route.py`，在不安装 `resolveagent` 的前提下复刻 selector 行为。

```python
import json
import subprocess
from resolveagent.hooks.base import HookResult  # 仅需基础 hook 类型

async def rule_route_hook(hook_ctx: dict) -> HookResult:
    """selector.route pre-hook：用本地规则路由短路 LLM 调用。"""
    input_text = hook_ctx.get("input_text", hook_ctx.get("query", ""))
    if not input_text:
        return HookResult()  # 不干预，走默认路径

    proc = subprocess.run(
        ["python", "/opt/skills/rule_route.py", "--input-json",
         json.dumps({"input_text": input_text})],
        capture_output=True, text=True, timeout=5
    )
    decision = json.loads(proc.stdout.strip())

    # 高置信度时短路后续 hook 链，直接返回本地决策
    if decision["confidence"] >= 0.65:
        return HookResult(
            modified_data={"route_decision": decision},
            skip_remaining=True
        )
    return HookResult()

# 注册到 Agent（在 selector_mode="hooks" 时生效）
agent = MegaAgent(
    ...,
    selector_mode="hooks"
)
agent.register_hook("selector.route", "pre", rule_route_hook)
```

---

## 输出字段说明

| 字段 | 类型 | 说明 |
|---|---|---|
| `route_type` | string | `skill` / `agent` / `workflow` / `fta` / `code_analysis` / `direct` |
| `route_target` | string | 目标名称，如 `web-search`、`static-analysis` |
| `confidence` | float | 路由置信度 `[0.0, 1.0]`，`>= 0.6` 为有效决策 |
| `parameters` | object | 附加参数；本地路由包含 `"strategy": "rule"` 和 `"portable": true` |
| `reasoning` | string | 决策依据描述 |
| `chain` | array | 调用链（规则路由恒为 `[]`） |

## 规则表覆盖的路由类型

| `route_type` | `route_target` | 典型查询示例 |
|---|---|---|
| `skill` | `web-search` | 故障诊断、根因分析、性能排查 |
| `skill` | `static-analysis` | 代码审查、安全漏洞扫描 |
| `agent` | `code-review-agent` | 代码审查请求 |
| `agent` | `deployment-agent` | 部署、发布、上线操作 |
| `agent` | `monitoring-agent` | 监控告警、指标查看 |
| `workflow` | `incident-response` | 生产事故、P0 故障响应 |
| `workflow` | `change-management` | 变更管理、配置变更 |
| `fta` | `fault-tree-analysis` | 故障树分析、FTA |
| `code_analysis` | `static-analysis` | 代码块内容（兜底规则） |
| `direct` | — | 不匹配任何规则时的默认路由 |

## Parity 保证

`rule_route.py::ROUTING_RULES` 与 `RuleStrategy.ROUTING_RULES` 由单元测试 `test_portable_rule_route.py::test_rule_table_matches_rule_strategy` 和 `test_decision_parity` 守护。任何对 `RuleStrategy` 规则表的修改都需同步更新 `rule_route.py`，否则测试失败。
