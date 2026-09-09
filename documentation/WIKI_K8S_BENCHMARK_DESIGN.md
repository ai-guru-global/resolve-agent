# wiki-k8s Benchmark 设计、原理与实现报告

- **版本**:v1.0(首轮完整实验 2026-09-05 完成)
- **代码位置**:`benchmarks/wiki-k8s/`
- **结论速览**:同一基座模型(MiniMax-M2.7)下,ResolveAgent 通路在**准确度**(judge 9.11 vs 8.70,key_point 覆盖 84.1% vs 76.1%)与**幂等性**(分数波动 ±0.349 vs ±0.837,结论翻转 4 vs 10,路由决策 100% 确定)上全面优于裸基模直连。

---

## 1. 背景与目标

产品的核心主张:ResolveAgent 不是"又一个 LLM 包装",而是在基座模型之上提供**路由、检索增强、缓存、弹性**等工程化能力的 agent 平台。这个主张需要一个**可复现、可量化、可归因**的实验证明。

要回答的问题:

1. **准确度**:面对细粒度 Kubernetes 知识(默认值、字段名、数字限制),带 RAG 的 agent 通路是否比基模的参数化记忆更准?
2. **幂等性**:同一问题重复执行,agent 通路的答案是否更稳定、更确定?(工程系统要求"同样的输入 → 同样的结果",裸 LLM 受采样随机性影响天然不满足)
3. 顺带压力测试产品的真实部署形态(docker 全栈)。

## 2. 设计思路

### 2.1 第一原则:控制变量,差异归因于 agent 层

两条被测通路**共用同一个基座模型**(MiniMax token plan `MiniMax-M2.7`),唯一差异是 agent 层:

```
base  通路:  问题 ──→ MiniMax /v1/chat/completions(一个通用 system prompt)
agent 通路:  问题 ──→ ResolveAgent runtime :9091
                        ├─ Intelligent Selector(hybrid: rule + LLM)路由
                        ├─ 命中知识类问题 → RAG 通路(Milvus 检索 K8s 语料 → 增强 prompt)
                        ├─ 决策缓存(SHA-256 key,LRU 1000 条,TTL 300s)
                        └─ 弹性重试 / 降级链
```

这样任何指标差异都可以**唯一归因**于产品层,而不是模型差异。这是整个 benchmark 最重要的设计决策。

### 2.2 为什么选 K8s 问答作为题材

- 知识密集、事实精确:默认值(`maxSurge=25%`)、限制(ConfigMap 1MiB)、字段名(`ingressClassName`)——这类问题基模容易"记错/记不全",RAG 检索增强的优势可测量
- 语料公开权威(Kubernetes 官方文档),ground truth 无争议
- 与产品 AIOps 定位天然契合

### 2.3 数据集设计:客观可校验优先

30 道题(6 类 × 5:concepts / workload / network / storage / scheduling / troubleshoot),每题带:

- `reference_answer`:参考答案(供 LLM judge 对照)
- `key_points`:2-8 个**客观可校验的短串**(术语/默认值/数字),按规范化子串匹配自动判分——不依赖 judge 的客观锚点
- 难度分布 easy 8 / medium 13 / hard 9,其中 19 题考细粒度数字/默认值

配套语料库 52 个知识块(200-450 字/块,官方文档风格),**全部 200 个 key_points 在语料中逐字可检索**——保证"agent 答对"确实来自检索命中而非运气。所有事实经 WebSearch 对照官方文档核对(HPA 稳定窗口 300s、etcd 配额 2GB、EndpointSlice 每片 100 等)。

### 2.4 幂等性的可操作定义

"幂等"在 agent 语境下拆解为四个可测量指标(每题每通路重复 3 次):

| 指标 | 定义 | 直觉 |
|---|---|---|
| 答案相似度 | 重复答案两两 char 3-gram Jaccard + difflib ratio | 输出文本稳不稳 |
| 分数波动 | 同一题 judge 分数的标准差 | 质量稳不稳 |
| 结论翻转数 | judge 分数跨过 8 分合格线方向不一致的题数 | 结论可不可依赖 |
| 路由确定性 | `/v1/selector/route` 同一输入重复 N 次的路由类型一致性 + 缓存命中延迟 | 决策层是否幂等 |

## 3. 原理(被测机制与测量方法)

### 3.1 agent 通路的准确度来源:RAG 检索增强

1. 摄入:`POST /v1/rag/ingest` → chunker 切块 → **embedding**(经 shim 转 MiniMax embo-01,1536 维)→ Milvus(COSINE,IVF_FLAT)
2. 运行时:selector 判定"知识查询" → 路由 rag → `Embedder.embed_query` 向量化 → Milvus top-k(召回 2k 后 Reranker 重排)→ 检索结果注入 prompt → LLM 生成
3. collection 解析:`decision.parameters["collection"]` 缺省 `"default"`;LLM 策略可能指名 `product-docs`/`runbooks`,故语料灌入全部三个集合

**embedding 协议适配**:runtime 的 `Embedder` 说 OpenAI 格式(`{"input":[...]}` → `data[].embedding`),MiniMax embo-01 说原生格式(`{"texts":[...],"type":"db|query"}` → `vectors[]`)。由 `shim/`(stdlib 零依赖 HTTP 服务)做双向转换;并按批次大小区分 `db`(摄入,16 条/批)与 `query`(检索,单条),匹配 embo-01 的双向量空间设计。

### 3.2 幂等性的产品机制:决策缓存

`selector/cache.py`:key = SHA-256(input + agent_id + strategy),LRU 1000 条,TTL 300s。命中即跳过一次 LLM 路由分类调用。`routecheck` 子命令实测:5 个探针 × 3 轮,路由类型 100% 一致,命中缓存后路由延迟 **~9.5s → 0.05ms**(约 5 个数量级)。

### 3.3 测量实现

- **key_point 命中**:规范化(小写、去空白/标点)后子串匹配。为防止"写法差一个字符就漏判",数据集自检要求 key_point 在参考答案与语料中以**相同字符形态**出现(两种规范化各验一遍,200/200 通过)
- **LLM judge**:同基模 `temperature=0`,rubric 明确扣分规则(漏得分点 -1~2,事实错误 -2),输出 JSON `{score, kp_hits, errors}`;解析失败**不计分**(重试 1 次),避免脏数据污染均值
- **一致性**:per-question 跨 repeat 聚合,arms 间同题同分布对比
- **延迟/成功率**:全量记录,报 p50/p95

## 4. 开发实现

### 4.1 组件清单

| 组件 | 文件 | 说明 |
|---|---|---|
| 数据集 | `dataset/k8s_qa.jsonl` | 30 题 × (question, reference_answer, key_points, difficulty) |
| 语料库 | `corpus/k8s_docs.jsonl` | 52 块 × (content, metadata.topic/source) |
| 实验执行器 | `bench.py` | 子命令:`ingest`(灌语料+检索冒烟)、`run`(双通路执行,SSE 解析、`<think>` 剥离、每次新 conversation_id 防历史污染)、`judge`、`routecheck`(路由幂等专项)、`report`(Markdown 报告) |
| embedding shim | `shim/app.py` + `shim/Dockerfile` | OpenAI ↔ MiniMax embo-01 协议转换 |
| 部署接线 | `docker-compose.bench.yaml` | override:runtime 指向 MiniMax、milvus/etcd、shim、限流放宽(默认 60rpm 会卡死实验) |

关键实现细节:

- **agent 通路 SSE 解析**:拼接 `content_chunk`,捕获 `selector.completed` 事件的 `route_type` 计入记录(归因分析用)
- **公平性保护**:base 通路用通用 system prompt,不带任何检索结果;agent 通路不预注册 agent(runtime 即席创建),对话每次新 `conversation_id`(避免记忆累积污染)
- **judge 稳定性**:thinking 模型(M2.7 输出内嵌 `<think>`)会吃 token 预算导致 JSON 截断——max_tokens 2500 + 解析重试 + 失败置 None(首轮实验曾因此把 62 条记录误判 0 分,修复后重跑评分)

### 4.2 开发生态反馈(意外收获)

benchmark 开发过程本身成了产品的**实测压力测试**,直接暴露并推动修复了 10+ 个真实 bug(runtime Dockerfile CMD 错误、Milvus host 硬编码、迁移冲突、compose 变量名错配等,详见 `BUG_AUDIT_AND_FIX_REPORT_2026-09-07.md`),并抓到一个产品缺陷:**fta/workflow 路由只回模板话不返回真实答案**(q28 三次确定性复现)。该缺陷已在第二轮修复:workflow 无可用定义或产出空内容时降级为真实 LLM 直答并标记 `degraded=true`(`agent/mega.py`)。

## 5. 功能实现情况与实验结果

### 5.1 首轮完整实验(run-20260905-174105)

180 次执行(30 题 × 2 通路 × 3 重复),成功率 90/90 × 2,judge 180 条全有效:

| 维度 | 指标 | ResolveAgent | 裸基模 | 差值 |
|---|---|---|---|---|
| **准确度** | judge 均分 (0-10) | **9.11** | 8.70 | +0.41 |
| | key_point 覆盖率(客观) | **84.1%** | 76.1% | **+8pp** |
| **幂等性** | 答案一致度 (difflib) | **0.367** | 0.271 | +35% |
| | judge 分数波动 (stdev) | **±0.349** | ±0.837 | 稳定 **2.4×** |
| | 结论翻转数 (8 分线) | **4** | 10 | **-60%** |
| **路由幂等** | 决策一致性(5 探针×3 轮) | **100%** | n/a | 缓存命中 9.5s→0.05ms |
| 延迟 | p50 / p95 | 24.4s / 43.4s | 15.3s / 23.6s | agent 多一次检索+路由,可接受 |

分类别:agent 在 network/storage/workload/concepts 全面领先;troubleshoot 类落后(q28 触发上述 fta 模板化缺陷拉低,已立案)。基模典型错误(judge 摘录):漏 EndpointSlice 100 上限、漏 `ingressClassName`、ConfigMap 命令行引用方式错误等——正是语料覆盖的细粒度点。

agent 路由分布:87 次 rag + 3 次 fta,selector 意图分类符合预期。

### 5.2 功能完成度

| 功能 | 状态 |
|---|---|
| 双通路执行(base/agent)、SSE 解析、`<think>` 剥离 | ✅ 完成 |
| 客观 key_point 判分 + LLM judge(rubric + 重试 + 失败置 None) | ✅ 完成 |
| 幂等性四指标(相似度/波动/翻转/路由确定性) | ✅ 完成 |
| embedding shim(db/query 双空间)、compose override 一键起栈 | ✅ 完成 |
| 报告生成(REPORT.md + summary.json) | ✅ 完成 |
| 统计显著性检验(bootstrap/Wilcoxon) | ⬜ 未实现(repeats=3 样本量小,后续可扩 repeats 后加) |
| 多模型矩阵(不同基模批量对比) | ⬜ 未实现(`BENCH_MODEL` 已参数化,换 env 即可跑) |
| CI 集成 / 回归基线 | ⬜ 未实现(可挂 `test/fixtures/baseline/`) |

### 5.3 已知局限

- 样本量 30 题 × 3 重复,一致性指标读数偏粗;扩大 repeats 可提高置信
- judge 与被测同基模,存在同偏风险;有条件可引入异源 judge
- troubleshoot 类的首轮结果受 fta 模板化缺陷影响(q28);该缺陷已修复(降级直答),修复后应复测该类别,预期 agent 分数回升
- 结论适用于"知识密集型问答"场景;编排/工具执行类能力需另设 benchmark

## 6. 复现

```bash
cd deploy/docker-compose
docker compose -f docker-compose.yaml -f ../../benchmarks/wiki-k8s/docker-compose.bench.yaml up -d --build
cd ../.. && export MINIMAX_API_KEY=<key>
python/.venv/bin/python benchmarks/wiki-k8s/bench.py ingest
python/.venv/bin/python benchmarks/wiki-k8s/bench.py run --repeats 3
python/.venv/bin/python benchmarks/wiki-k8s/bench.py judge results/run-<ts>.jsonl
python/.venv/bin/python benchmarks/wiki-k8s/bench.py routecheck
python/.venv/bin/python benchmarks/wiki-k8s/bench.py report results/run-<ts>.judged.jsonl
```

详见 `benchmarks/wiki-k8s/README.md`;环境变量(`BENCH_MODEL`/`RUNTIME_URL`/`BENCH_COLLECTIONS` 等)见其中表格。
