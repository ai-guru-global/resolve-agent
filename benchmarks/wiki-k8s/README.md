# wiki-k8s benchmark

用 Kubernetes 官方文档风格的问答集,对比 **裸基模(MiniMax-M2.7 直连)** 与
**ResolveAgent(selector 路由 + RAG 检索增强 + 决策缓存 + 弹性重试)** 的:

- **准确度** —— key_point 客观命中率 + LLM judge 0-10 分
- **幂等性/一致性** —— 同一问题重复 N 次:答案相似度、分数波动、结论翻转率、路由决策稳定性
- **工程指标** —— 成功率、p50/p95 延迟

两条通路使用**同一个基座模型**(MiniMax token plan 的 `MiniMax-M2.7`),
差异完全来自 agent 层,保证对比公平。

## 目录

```
benchmarks/wiki-k8s/
├── bench.py                    # 一体化 harness:ingest / run / judge / routecheck / report
├── dataset/k8s_qa.jsonl        # 30 道 K8s 问答题(6 类 × 5),带参考答案和可校验得分点
├── corpus/k8s_docs.jsonl       # K8s 官方文档风格知识块,摄入 RAG 的语料
├── shim/                       # OpenAI embeddings 格式 -> MiniMax embo-01 的转换 shim
├── docker-compose.bench.yaml   # benchmark 专用 compose override(MiniMax/Milvus/shim 接线)
└── results/                    # 运行产物(run-*.jsonl、*.judged.jsonl、*-REPORT.md)
```

## 复现步骤

```bash
# 0. 准备密钥(deploy/docker-compose/.env,需 MINIMAX_API_KEY 和 RESOLVEAGENT_DATABASE_PASSWORD)
cd deploy/docker-compose

# 1. 启动全栈(platform + runtime + webui + postgres/redis/nats + milvus/etcd + embedding-shim)
docker compose -f docker-compose.yaml \
  -f ../../benchmarks/wiki-k8s/docker-compose.bench.yaml up -d --build

# 2. 回到仓库根目录,摄入 K8s 语料到 RAG(含检索冒烟测试)
cd ../..
export MINIMAX_API_KEY=<your-key>
python/.venv/bin/python benchmarks/wiki-k8s/bench.py ingest

# 3. 跑双通路实验(每题每通路重复 3 次)
python/.venv/bin/python benchmarks/wiki-k8s/bench.py run --repeats 3

# 4. 评分(key_point 命中 + LLM judge)
python/.venv/bin/python benchmarks/wiki-k8s/bench.py judge results/run-<ts>.jsonl

# 5. 路由幂等性专项(同一输入反复路由,验证决策缓存确定性)
python/.venv/bin/python benchmarks/wiki-k8s/bench.py routecheck

# 6. 生成报告
python/.venv/bin/python benchmarks/wiki-k8s/bench.py report results/run-<ts>.judged.jsonl
```

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `MINIMAX_API_KEY` | (必填) | MiniMax token plan key |
| `MINIMAX_BASE_URL` | `https://api.minimaxi.com/v1` | chat 端点 |
| `BENCH_MODEL` | `MiniMax-M2.7` | 被测基模(两条通路共用) |
| `BENCH_JUDGE_MODEL` | 同 `BENCH_MODEL` | judge 模型 |
| `RUNTIME_URL` | `http://localhost:9091` | ResolveAgent runtime |
| `BENCH_COLLECTIONS` | `default,product-docs,runbooks` | RAG 摄入目标集合 |

## 设计说明

- **公平性**:两条通路同一基模;base 通路只带一个通用 system prompt;agent 通路由
  runtime 自行决策(selector hybrid 策略:rule + LLM),命中文档类问题时走 RAG,
  检索 `default` 等 collection 的 K8s 语料增强回答。
- **幂等性定义**:对同一输入的重复执行应产生一致的结果。指标:重复间答案
  3-gram Jaccard 相似度 / difflib 一致度、judge 分数标准差、结论翻转数
  (跨过 8 分合格线的方向不一致次数)。agent 通路的 selector 决策缓存(SHA-256 key,
  LRU+TTL 300s)使路由决策在重复执行间保持确定。
- **判分**:key_point 命中是规范化后的子串匹配(大小写/空白/标点不敏感);
  judge 使用 temperature=0 的同基模,按 rubric 打分并列出事实错误。
