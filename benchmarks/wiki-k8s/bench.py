#!/usr/bin/env python3
"""wiki-k8s benchmark: ResolveAgent vs 裸基模(MiniMax-M2.7)。

两条通路:
  base  —— 直接调 MiniMax chat/completions(无检索、无路由、无缓存)
  agent —— 走 ResolveAgent runtime 的 POST /v1/agents/{id}/execute
           (selector 路由 + RAG 检索增强 + 决策缓存 + 弹性重试)

度量:
  准确度   —— key_point 命中率(客观子串匹配) + LLM judge 0-10 分
  幂等性   —— 同一问题重复 N 次的答案一致性(char 3-gram Jaccard)、
              judge 分数波动、结论翻转率、agent 路由决策稳定性
  其他     —— 延迟、错误率

子命令:
  ingest      把 corpus/k8s_docs.jsonl 摄入 RAG(default 等 collection)
  run         跑双通路实验,写 results/run-*.jsonl
  judge       对 run 结果打分(key_point 命中 + LLM judge)
  routecheck  路由决策幂等性专项:同一输入重复路由,验证缓存确定性
  report      汇总成 results/REPORT.md

用法(在仓库根目录):
  python/.venv/bin/python benchmarks/wiki-k8s/bench.py ingest
  python/.venv/bin/python benchmarks/wiki-k8s/bench.py run --repeats 3
  python/.venv/bin/python benchmarks/wiki-k8s/bench.py judge results/run-XXX.jsonl
  python/.venv/bin/python benchmarks/wiki-k8s/bench.py report results/run-XXX.judged.jsonl
"""

from __future__ import annotations

import argparse
import asyncio
import difflib
import json
import os
import re
import statistics
import sys
import time
import uuid
from pathlib import Path

import httpx

HERE = Path(__file__).resolve().parent
DATASET = HERE / "dataset" / "k8s_qa.jsonl"
CORPUS = HERE / "corpus" / "k8s_docs.jsonl"
RESULTS = HERE / "results"

MINIMAX_BASE = os.getenv("MINIMAX_BASE_URL", "https://api.minimaxi.com/v1").rstrip("/")
API_KEY = os.environ.get("MINIMAX_API_KEY", "")
MODEL = os.getenv("BENCH_MODEL", "MiniMax-M2.7")
JUDGE_MODEL = os.getenv("BENCH_JUDGE_MODEL", MODEL)
RUNTIME_URL = os.getenv("RUNTIME_URL", "http://localhost:9091").rstrip("/")
AGENT_ID = os.getenv("BENCH_AGENT_ID", "wiki-k8s-bench")
# LLM 路由策略可能把 rag 指到这些 collection,都灌上同一份语料
COLLECTIONS = os.getenv("BENCH_COLLECTIONS", "default,product-docs,runbooks").split(",")

THINK_RE = re.compile(r"<think>.*?</think>", re.DOTALL)
NORM_RE = re.compile(r"[\s　，。、；：？！·—\-（）()\[\]【】《》<>\"'“”‘’.,;:?!\-_/]+")

BASE_SYSTEM = (
    "你是 Kubernetes 领域专家。请基于你自己的知识,准确、简洁地回答用户的问题。"
    "涉及默认值、字段名、数字时给出精确答案。"
)


# ---------------------------------------------------------------- 通用工具

def norm(s: str) -> str:
    return NORM_RE.sub("", s.lower())


def strip_think(text: str) -> str:
    text = THINK_RE.sub("", text)
    # 流式截断导致的未闭合 <think>
    if "<think>" in text:
        text = text.split("<think>", 1)[0] if not text.startswith("<think>") else ""
    return text.strip()


def trigrams(s: str) -> set[str]:
    s = norm(s)
    return {s[i : i + 3] for i in range(max(len(s) - 2, 1))}


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def seq_ratio(a: str, b: str) -> float:
    return difflib.SequenceMatcher(None, norm(a), norm(b)).ratio()


def kp_hit(answer: str, kp: str) -> bool:
    return norm(kp) in norm(answer)


def load_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


async def minimax_chat(client: httpx.AsyncClient, messages: list[dict], *,
                       model: str = MODEL, max_tokens: int = 1200,
                       temperature: float | None = None, retries: int = 3) -> str:
    body: dict = {"model": model, "messages": messages, "max_tokens": max_tokens}
    if temperature is not None:
        body["temperature"] = temperature
    for attempt in range(retries):
        try:
            r = await client.post(f"{MINIMAX_BASE}/chat/completions", json=body, timeout=120)
            # 4xx(鉴权/参数错误)不可重试,直接抛出;429/5xx/网络异常才退避重试
            r.raise_for_status()
            data = r.json()
            return strip_think(data["choices"][0]["message"]["content"] or "")
        except httpx.HTTPStatusError as e:
            if e.response.status_code not in (429, 500, 502, 503, 504):
                raise
            if attempt == retries - 1:
                raise
            await asyncio.sleep(2 ** attempt * 2)
        except Exception:
            if attempt == retries - 1:
                raise
            await asyncio.sleep(2 ** attempt * 2)
    return ""


# ---------------------------------------------------------------- ingest

async def cmd_ingest() -> None:
    docs = load_jsonl(CORPUS)
    print(f"corpus: {len(docs)} chunks -> collections {COLLECTIONS}")
    limits = httpx.Limits(max_connections=4)
    async with httpx.AsyncClient(limits=limits) as client:
        for col in COLLECTIONS:
            t0 = time.time()
            total = 0
            for i in range(0, len(docs), 16):
                batch = [
                    {"id": d["id"], "content": d["content"], "metadata": d.get("metadata", {})}
                    for d in docs[i : i + 16]
                ]
                r = await client.post(
                    f"{RUNTIME_URL}/v1/rag/ingest",
                    json={"collection_id": col, "documents": batch},
                    timeout=180,
                )
                r.raise_for_status()
                total += r.json().get("ingested_count", 0)
            print(f"  [{col}] ingested={total} in {time.time() - t0:.1f}s")
        # 检索冒烟测试
        for probe in ["Pod 的默认重启策略", "Deployment maxSurge 默认值"]:
            r = await client.post(
                f"{RUNTIME_URL}/v1/rag/query",
                json={"collection_id": "default", "query": probe, "top_k": 3},
                timeout=60,
            )
            r.raise_for_status()
            hits = r.json().get("results", [])
            print(f"  smoke query {probe!r}: {len(hits)} hits"
                  + (f", top={hits[0]['text'][:60]!r} score={hits[0]['score']:.3f}" if hits else ""))


# ---------------------------------------------------------------- run

async def run_base(client: httpx.AsyncClient, question: str) -> dict:
    t0 = time.time()
    try:
        answer = await minimax_chat(client, [
            {"role": "system", "content": BASE_SYSTEM},
            {"role": "user", "content": question},
        ])
        return {"answer": answer, "latency_ms": int((time.time() - t0) * 1000), "error": None}
    except Exception as e:
        return {"answer": "", "latency_ms": int((time.time() - t0) * 1000), "error": str(e)[:300]}


async def run_agent(client: httpx.AsyncClient, question: str) -> dict:
    """POST /v1/agents/{id}/execute,解析 SSE,拼接 content_chunk。"""
    t0 = time.time()
    chunks: list[str] = []
    fallback: list[str] = []
    route_type = None
    error = None
    try:
        async with client.stream(
            "POST",
            f"{RUNTIME_URL}/v1/agents/{AGENT_ID}/execute",
            json={"input": question, "conversation_id": str(uuid.uuid4())},
            timeout=180,
        ) as r:
            if r.status_code != 200:
                error = f"HTTP {r.status_code}: {(await r.aread())[:200]!r}"
            else:
                async for line in r.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    payload = line[5:].strip()
                    if payload == "[DONE]":
                        break
                    try:
                        evt = json.loads(payload)
                    except json.JSONDecodeError:
                        continue
                    etype = evt.get("type")
                    if etype == "content_chunk":
                        chunks.append(evt.get("content", ""))
                    elif etype == "content":
                        fallback.append(evt.get("content", ""))
                    elif etype == "error":
                        error = f"{evt.get('error_code')}: {evt.get('message')}"
                    elif etype == "event":
                        ev = evt.get("event", {})
                        if ev.get("type") == "selector.completed":
                            route_type = ev.get("data", {}).get("route_type")
                        elif ev.get("type") == "execution.failed":
                            error = ev.get("message")
    except Exception as e:
        error = str(e)[:300]
    answer = strip_think("".join(chunks) or "".join(fallback))
    if answer.startswith("执行失败"):
        error, answer = answer, ""
    return {
        "answer": answer,
        "latency_ms": int((time.time() - t0) * 1000),
        "route_type": route_type,
        "error": error,
    }


async def cmd_run(repeats: int, concurrency: int, only_arm: str | None) -> Path:
    dataset = load_jsonl(DATASET)
    RESULTS.mkdir(exist_ok=True)
    out = RESULTS / f"run-{time.strftime('%Y%m%d-%H%M%S')}.jsonl"
    sem = asyncio.Semaphore(concurrency)
    headers = {"Authorization": f"Bearer {API_KEY}"}
    limits = httpx.Limits(max_connections=concurrency * 2)
    done = 0
    total = len(dataset) * repeats * (2 if not only_arm else 1)

    async with httpx.AsyncClient(headers=headers, limits=limits) as client:
        with out.open("w", encoding="utf-8") as fh:
            async def one(item: dict, arm: str, rep: int) -> None:
                nonlocal done
                async with sem:
                    res = await (run_base(client, item["question"]) if arm == "base"
                                 else run_agent(client, item["question"]))
                rec = {
                    "qid": item["id"], "category": item["category"], "arm": arm, "repeat": rep,
                    "question": item["question"], **res,
                }
                fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
                fh.flush()
                done += 1
                tag = f"route={res.get('route_type')}" if arm == "agent" else ""
                print(f"  [{done}/{total}] {item['id']} {arm} r{rep} "
                      f"{res['latency_ms']}ms {'ERR ' + str(res['error'])[:80] if res['error'] else tag}")

            tasks = [
                one(item, arm, rep)
                for item in dataset
                for arm in ([only_arm] if only_arm else ["base", "agent"])
                for rep in range(repeats)
            ]
            await asyncio.gather(*tasks)
    print(f"wrote {out}")
    return out


# ---------------------------------------------------------------- judge

JUDGE_PROMPT = """你是严格的 Kubernetes 知识评审。请根据【参考答案】和【得分点】评估【候选答案】。

【问题】{question}
【参考答案】{reference}
【得分点】{key_points}
【候选答案】{answer}

评分规则:
- score 0-10:10 = 事实完全正确且覆盖所有得分点;每漏一个得分点扣 1-2 分;出现事实性错误(错误的默认值/字段名/数字)每个扣 2 分;答非所问 0-2 分。
- 简洁与否不影响分数,只看事实正确性和得分点覆盖。

只输出 JSON: {{"score": <int>, "kp_hits": [<命中的得分点原文>], "errors": ["<事实错误简述>"], "reason": "<一句话>"}}"""


async def judge_one(client: httpx.AsyncClient, item: dict, answer: str) -> dict:
    kps = item["key_points"]
    kp_auto = [kp for kp in kps if kp_hit(answer, kp)]
    res: dict = {"kp_total": len(kps), "kp_hit_auto": len(kp_auto),
                 "kp_missing_auto": [k for k in kps if k not in kp_auto]}
    if not answer.strip():
        res.update({"judge_score": 0, "judge_reason": "empty answer", "judge_errors": []})
        return res
    prompt = JUDGE_PROMPT.format(
        question=item["question"], reference=item["reference_answer"],
        key_points="、".join(kps), answer=answer[:4000])
    for _ in range(2):  # thinking 模型可能吃掉 token 预算导致 JSON 截断,重试一次
        try:
            raw = await minimax_chat(client, [{"role": "user", "content": prompt}],
                                     model=JUDGE_MODEL, max_tokens=2500, temperature=0.0)
            m = re.search(r"\{.*\}", raw, re.DOTALL)
            if not m:
                continue
            data = json.loads(m.group(0))
            if "score" not in data:
                continue
            res.update({
                "judge_score": int(data["score"]),
                "judge_reason": str(data.get("reason", ""))[:200],
                "judge_errors": [str(x)[:100] for x in data.get("errors", [])][:5],
            })
            return res
        except Exception:
            continue
    res.update({"judge_score": None, "judge_reason": "judge parse failed", "judge_errors": []})
    return res


async def cmd_judge(run_path: Path, concurrency: int) -> Path:
    dataset = {d["id"]: d for d in load_jsonl(DATASET)}
    records = load_jsonl(run_path)
    out = run_path.with_suffix(".judged.jsonl")
    sem = asyncio.Semaphore(concurrency)
    headers = {"Authorization": f"Bearer {API_KEY}"}
    done = 0

    async with httpx.AsyncClient(headers=headers) as client:
        with out.open("w", encoding="utf-8") as fh:
            async def one(rec: dict) -> dict | None:
                nonlocal done
                item = dataset.get(rec["qid"])
                if item is None:
                    print(f"  [skip] 未知 qid {rec['qid']}(数据集版本与 run 文件不一致)")
                    return None
                async with sem:
                    j = await judge_one(client, item, rec.get("answer", ""))
                done += 1
                print(f"  [{done}/{len(records)}] {rec['qid']} {rec['arm']} r{rec['repeat']} "
                      f"score={j.get('judge_score')} kp={j['kp_hit_auto']}/{j['kp_total']}")
                return {**rec, **j}

            judged = await asyncio.gather(*[one(r) for r in records])
            for rec in judged:
                if rec is not None:
                    fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"wrote {out}")
    return out


# ---------------------------------------------------------------- routecheck

async def cmd_routecheck(rounds: int) -> None:
    """路由决策幂等性:同一输入反复路由,验证决策稳定 + 缓存生效(延迟下降)。"""
    probes = [
        "什么是 Kubernetes 的 Pod?",
        "如何配置 Deployment 的滚动更新策略?",
        "Pod 一直处于 CrashLoopBackOff 怎么排查?",
        "帮我写一段计算斐波那契数列的代码",
        "分析一下昨天的线上故障时间线",
    ]
    async with httpx.AsyncClient() as client:
        for probe in probes:
            routes, latencies = [], []
            for _ in range(rounds):
                r = await client.post(f"{RUNTIME_URL}/v1/selector/route",
                                      json={"input": probe, "agent_id": AGENT_ID}, timeout=60)
                r.raise_for_status()
                d = r.json()
                routes.append(d.get("route_type"))
                latencies.append(d.get("latency_ms", 0))
            stable = len(set(routes)) == 1
            print(f"  {probe[:24]!r}: routes={routes} stable={stable} "
                  f"latency={latencies[0]}ms -> {latencies[-1]}ms"
                  + (" (cache 生效)" if latencies[-1] < max(latencies[0] * 0.5, 1) else ""))


# ---------------------------------------------------------------- report

def mean(xs: list[float]) -> float:
    return statistics.mean(xs) if xs else 0.0


def cmd_report(judged_path: Path) -> None:
    records = load_jsonl(judged_path)
    dataset = {d["id"]: d for d in load_jsonl(DATASET)}
    arms = sorted({r["arm"] for r in records})
    lines: list[str] = []
    w = lines.append

    w("# wiki-k8s benchmark 报告")
    w("")
    w(f"- 数据: `{judged_path.name}` ({len(records)} 条记录)")
    w(f"- 基模: `{MODEL}` (MiniMax token plan, 直连)")
    w(f"- agent 通路: ResolveAgent runtime `{RUNTIME_URL}` (selector + RAG + 决策缓存)")
    w("")

    summary: dict = {}
    for arm in arms:
        rs = [r for r in records if r["arm"] == arm]
        ok = [r for r in rs if not r.get("error") and r.get("answer")]
        scores = [r["judge_score"] for r in ok if r.get("judge_score") is not None]
        kp_rates = [r["kp_hit_auto"] / max(r["kp_total"], 1) for r in ok]
        lats = sorted(r["latency_ms"] for r in ok)
        summary[arm] = {
            "n": len(rs), "success": len(ok),
            "judge_mean": round(mean(scores), 2),
            "kp_coverage": round(mean(kp_rates), 3),
            "p50_ms": lats[len(lats) // 2] if lats else 0,
            "p95_ms": lats[min(int(len(lats) * 0.95), len(lats) - 1)] if lats else 0,
            "errors": len(rs) - len(ok),
        }

    w("## 准确度(越高越好)")
    w("")
    w("| 通路 | 样本 | 成功率 | judge 均分 (0-10) | key_point 覆盖率 | p50 延迟 | p95 延迟 |")
    w("|---|---|---|---|---|---|---|")
    for arm, s in summary.items():
        w(f"| {arm} | {s['n']} | {s['success']}/{s['n']} | {s['judge_mean']} | "
          f"{s['kp_coverage']:.1%} | {s['p50_ms']}ms | {s['p95_ms']}ms |")
    w("")

    # 幂等性/一致性:按 (arm, qid) 分组跨 repeat 比较
    w("## 幂等性与一致性(同一问题重复多次)")
    w("")
    w("| 通路 | 平均答案相似度 (3-gram Jaccard) | 平均文本一致度 (difflib) | judge 分数平均波动 | 结论翻转数 |")
    w("|---|---|---|---|---|")
    PASS = 8
    consist: dict = {}
    for arm in arms:
        jac, seq, stdevs, flips = [], [], [], 0
        qids = {r["qid"] for r in records if r["arm"] == arm}
        for qid in sorted(qids):
            group = [r for r in records if r["arm"] == arm and r["qid"] == qid and r.get("answer")]
            if len(group) < 2:
                continue
            answers = [g["answer"] for g in group]
            pairs = [(answers[i], answers[j]) for i in range(len(answers)) for j in range(i + 1, len(answers))]
            jac.append(mean([jaccard(trigrams(a), trigrams(b)) for a, b in pairs]))
            seq.append(mean([seq_ratio(a, b) for a, b in pairs]))
            sc = [g["judge_score"] for g in group if g.get("judge_score") is not None]
            if len(sc) >= 2:
                stdevs.append(statistics.stdev(sc))
                passes = [s >= PASS for s in sc]
                if any(passes) and not all(passes):
                    flips += 1
        consist[arm] = {
            "jaccard": round(mean(jac), 3), "seq": round(mean(seq), 3),
            "score_stdev": round(mean(stdevs), 3), "flips": flips,
        }
        w(f"| {arm} | {consist[arm]['jaccard']} | {consist[arm]['seq']} | "
          f"±{consist[arm]['score_stdev']} | {flips} |")
    w("")
    w(f"> 结论翻转 = 同一题多次作答中 judge 分数跨过 {PASS} 分线方向不一致(合格/不合格摇摆)的次数,越少越幂等。")
    w("")

    # 路由稳定性(agent)
    agent_rs = [r for r in records if r["arm"] == "agent" and r.get("route_type")]
    if agent_rs:
        w("## agent 路由分布")
        w("")
        dist: dict[str, int] = {}
        for r in agent_rs:
            dist[r["route_type"]] = dist.get(r["route_type"], 0) + 1
        for rt, n in sorted(dist.items(), key=lambda x: -x[1]):
            w(f"- `{rt}`: {n} 次")
        w("")

    # 分类别对比
    cats = sorted({d["category"] for d in dataset.values()})
    w("## 分类别 judge 均分")
    w("")
    w("| 类别 | " + " | ".join(arms) + " |")
    w("|---|" + "---|" * len(arms))
    for cat in cats:
        row = [cat]
        for arm in arms:
            sc = [r["judge_score"] for r in records
                  if r["arm"] == arm and r["category"] == cat and r.get("judge_score") is not None]
            row.append(f"{mean(sc):.2f}")
        w("| " + " | ".join(row) + " |")
    w("")

    # 逐题明细
    w("## 逐题明细(均分 / kp 覆盖)")
    w("")
    w("| 题 | 类别 | " + " | ".join(f"{a} 分 | {a} kp" for a in arms) + " |")
    w("|---|" + "---|" * (1 + len(arms) * 2))
    for qid, item in sorted(dataset.items()):
        row = [qid, item["category"]]
        for arm in arms:
            group = [r for r in records if r["arm"] == arm and r["qid"] == qid]
            sc = [g["judge_score"] for g in group if g.get("judge_score") is not None]
            kp = [g["kp_hit_auto"] / max(g["kp_total"], 1) for g in group]
            row += [f"{mean(sc):.1f}", f"{mean(kp):.0%}"]
        w("| " + " | ".join(row) + " |")
    w("")

    # 典型错误
    base_errs = [e for r in records if r["arm"] == "base" for e in (r.get("judge_errors") or [])]
    if base_errs:
        w("## 基模典型事实错误(judge 摘录)")
        w("")
        for e in list(dict.fromkeys(base_errs))[:10]:
            w(f"- {e}")
        w("")

    report_path = judged_path.with_suffix("").with_name(judged_path.stem.replace(".judged", "") + "-REPORT.md")
    report_path.write_text("\n".join(lines), encoding="utf-8")
    summary_path = judged_path.with_suffix(".summary.json")
    summary_path.write_text(json.dumps({"accuracy": summary, "consistency": consist},
                                       ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {report_path}\nwrote {summary_path}")
    # 终端速览
    print("\n===== 速览 =====")
    for arm in arms:
        s, c = summary[arm], consist[arm]
        print(f"{arm:6s} judge={s['judge_mean']:<5} kp={s['kp_coverage']:.1%} "
              f"一致度={c['seq']:<5} 分数波动=±{c['score_stdev']:<4} 翻转={c['flips']}")


# ---------------------------------------------------------------- main

def main() -> None:
    ap = argparse.ArgumentParser(description="wiki-k8s benchmark")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("ingest")
    p_run = sub.add_parser("run")
    p_run.add_argument("--repeats", type=int, default=3)
    p_run.add_argument("--concurrency", type=int, default=3)
    p_run.add_argument("--arm", choices=["base", "agent"], default=None)
    p_judge = sub.add_parser("judge")
    p_judge.add_argument("run_file", type=Path)
    p_judge.add_argument("--concurrency", type=int, default=4)
    p_rc = sub.add_parser("routecheck")
    p_rc.add_argument("--rounds", type=int, default=3)
    p_rep = sub.add_parser("report")
    p_rep.add_argument("judged_file", type=Path)
    args = ap.parse_args()

    if args.cmd in ("run", "judge") and not API_KEY:
        sys.exit("MINIMAX_API_KEY not set")

    if args.cmd == "ingest":
        asyncio.run(cmd_ingest())
    elif args.cmd == "run":
        asyncio.run(cmd_run(args.repeats, args.concurrency, args.arm))
    elif args.cmd == "judge":
        asyncio.run(cmd_judge(args.run_file, args.concurrency))
    elif args.cmd == "routecheck":
        asyncio.run(cmd_routecheck(args.rounds))
    elif args.cmd == "report":
        cmd_report(args.judged_file)


if __name__ == "__main__":
    main()
