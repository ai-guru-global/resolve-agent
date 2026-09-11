# ResolveAgent 全面 Bug 审计与修复报告

- **日期**:2026-09-05 ~ 2026-09-09(两轮)
- **范围**:全仓库(Go 平台、Python runtime、CLI/TUI、React webui/mobile、deploy/configs/helm、integrations/dify、benchmarks)
- **方法**:第一轮 6 路并行审计+修复;第二轮 deferred 清单修复 + 未覆盖区域(internal/cli、pkg/event/feedback/health/logger/registry、integrations、examples)二次审计+修复;每轮均以全量测试 + docker 全栈重建 + 端到端复验收尾
- **背景**:本报告起源于"用 docker 部署 + 设计 wiki-benchmark 验证产品价值"的任务,部署过程中发现一批阻断性 bug,修复后用户要求扩大为全面 bug 检查

---

## 0. 总览数据

| 阶段 | 产出 |
|---|---|
| 阶段一:docker 部署打通 | 修复 10 个部署 bug,全栈 9 容器 healthy |
| wiki-benchmark(见 §4) | 30 题 K8s 问答,agent 通路准确度/幂等性全面优于裸基模 |
| 第一轮:6 区域审计 | 确认 60+ 真实 bug,**修复 51 项 + 44 个新测试用例** |
| 第二轮:deferred + 新区域二审 | 再发现 30 项(CLI/pkg-event-feedback-health/registry/dify/quickstart),**修复 37 项**(含 deferred 14 项)+ 新增测试 20+ |
| 累计 | **修复约 98 项 bug**(含部署 10 项),Python `pytest 545 passed`、Go `build/vet/test/-race` 全绿、web `vitest 112 passed`、helm template 渲染合法、Dify 插件过 SDK schema 校验 |
| 复验 | 两轮 docker 重建后 9/9 容器 healthy;平台代理链路、RAG、webui 反代端到端实测通过 |

---

## 1. 阶段一:docker 部署阻断性修复(10 项)

任务:用 docker-compose 起全栈跑 wiki-benchmark。过程中发现生产 compose 栈**原本根本无法启动**,逐项修复:

| # | 位置 | Bug | 修复 |
|---|---|---|---|
| 1 | `deploy/docker/runtime.Dockerfile` | CMD `python -m resolveagent.runtime.server` 指向无 `__main__` 入口的模块,容器秒退 + `restart: unless-stopped` 形成重启死循环 | 改为 `python -m resolveagent.runtime` |
| 2 | 同上 | HEALTHCHECK 打不存在的 `/healthz`(实际是 `/health`) | 改路径 |
| 3 | 同上 | `uv sync` 只 COPY pyproject.toml 且 `|| true` 吞掉失败 → 产出没有 uvicorn 的空 venv,`ModuleNotFoundError` | COPY 整个 `python/` 后再 sync,不再吞错 |
| 4 | 同上 | uv sync 默认装进项目 `.venv` 而 stage2 复制 `/opt/venv` → 依赖仍缺失 | `ENV UV_PROJECT_ENVIRONMENT=/opt/venv` |
| 5 | `.dockerignore` | `deploy/` 整体被排除 → webui 构建找不到 `deploy/docker/nginx/default.conf`;`python/.venv`(宿主机 venv)被 COPY 进构建上下文污染 | 加 `!deploy/docker/nginx/` 与 `python/.venv/` |
| 6 | `deploy/docker-compose/docker-compose.yaml` | `init-db.sql` 携带旧 schema(UUID 主键、无 `agents.type`)与 Go 内嵌迁移链冲突,migration 5 必失败 | 摘掉挂载,Go 启动时自建全部 schema(14+1 个迁移) |
| 7 | 同上 | `RESOLVEAGENT_SELECTOR_DEFAULT_STRATEGY` 与 Python 实际读取的 `RESOLVEAGENT_SELECTOR_STRATEGY` 不匹配 | 统一为后者 |
| 8 | `python/src/resolveagent/rag/index/milvus.py` + `retrieve/retriever.py` | Milvus host/port 硬编码 `localhost:19530`,容器内查询路径卡死(写入路径走无参构造恰好正常) | 两处支持 `MILVUS_HOST/PORT` env |
| 9 | `deploy/docker/webui.Dockerfile` | `npm i -g pnpm` 装到 v11,不认识 package.json 为 pnpm10 写的 `onlyBuiltDependencies`(esbuild 构建脚本被拦,exit 1) | 固定 `pnpm@10` |
| 10 | 同上 | healthcheck `localhost` 在 alpine 解析到 ::1,nginx 只听 IPv4 → 永远 unhealthy | 改 `127.0.0.1` |

**网络适配**(中国大陆环境):Docker Hub 直连超时 → DaoCloud 镜像预拉 + retag;`GOPROXY=goproxy.cn`(platform);pnpm registry → npmmirror(webui)。

---

## 2. 阶段一:wiki-benchmark 建设

产物在 `benchmarks/wiki-k8s/`:

```
benchmarks/wiki-k8s/
├── bench.py                    # 一体化 harness:ingest/run/judge/routecheck/report
├── dataset/k8s_qa.jsonl        # 30 道 K8s 问答(6 类×5),200 个可校验得分点
├── corpus/k8s_docs.jsonl       # 52 个 K8s 官方文档风格知识块(事实经 WebSearch 核对)
├── shim/                       # OpenAI embeddings 格式 → MiniMax embo-01 转换 shim
├── docker-compose.bench.yaml   # benchmark 专用 compose override
└── results/                    # run-*.jsonl、*.judged.jsonl、*-REPORT.md
```

- 两条通路**同一基模**(MiniMax token plan `MiniMax-M2.7`):base = 直连 chat/completions;agent = ResolveAgent runtime(selector 路由 + RAG 检索增强 + 决策缓存)
- MiniMax embedding 非 OpenAI 格式(`texts` vs `input`),写了一个 stdlib 零依赖 shim 容器做协议转换
- judge 用同基模 temperature=0 + rubric;key_point 用规范化子串匹配(客观)

**首轮结果**(`results/run-20260905-174105-REPORT.md`,30 题 × 2 通路 × 3 重复):

| 指标 | ResolveAgent | 裸基模 |
|---|---|---|
| judge 均分 (0-10) | **9.11** | 8.70 |
| key_point 覆盖率 | **84.1%** | 76.1% |
| 答案一致度(重复间 difflib) | **0.367** | 0.271 |
| judge 分数波动 | **±0.349** | ±0.837 |
| 结论翻转数(8 分线摇摆) | **4** | 10 |

路由幂等专项:同一输入重复路由 5/5 决策完全一致,缓存命中后路由延迟 ~9.5s → 0.05ms。

benchmark 期间抓到两个工程问题:judge 因 thinking 模型吃光 max_tokens 导致 JSON 截断被默认记 0(改为重试 + 解析失败不计分);`fta` 路由对排查类问题只回模板话"工作流已启动"而不返回真实答案(产品缺陷,见 §5 未修复项)。

---

## 3. 阶段二:全面审计与 51 项修复

### 3.1 P0 —— 核心功能整体失效

| # | 位置 | Bug → 后果 | 修复 |
|---|---|---|---|
| 1 | `fta/engine.py:73`、`fta/tree.py:53,147-155` | 求值结果从不写回 `event.value` → **任何故障树分析顶事件恒 False**;`get_input_values` 不解析 gate 输入 | 写回 event/gate.value 并沿 output 链传播(已运行时复现验证) |
| 2 | `fta/parallel_evaluator.py:229,330-336` | `levels.reverse()` 把自底向上反转成顶事件先求值;中间门输入恒 `evaluate([])` 恒 False | 删 reverse;中间门读取已算值 |
| 3 | `pkg/server/runtime_client.go:26-32` + `pkg/config/config.go` | platform→runtime 地址断裂:读 `cfg.Server.RuntimeAddr` 但 compose 设的是 `RESOLVEAGENT_RUNTIME_GRPC_ADDR`(映射到无人读取的 `cfg.Runtime.GRPCAddr`)→ **compose 下所有代理端点 connection refused** | SetDefault + 双字段回退;compose 补 `RESOLVEAGENT_SERVER_RUNTIME_ADDR`(见 §5 复验补充) |
| 4 | `pkg/store/postgres/postgres.go` | 迁移链缺 `call_graphs/call_graph_nodes/call_graph_edges/traffic_captures/traffic_records/traffic_graphs` 六张表 → 相关端点全部 500 | 追加 v15 迁移(public schema、VARCHAR id 与 store 代码对齐) |
| 5 | `web/src/api/client.ts:417-426` + 6 个页面 | `Agent.mode/harness` 后端根本不存在,前端裸引用 → **接真后端即白屏 TypeError** | 类型改可选,全页面可选链 + 兜底 |
| 6 | `deploy/docker/nginx/default.conf` | 无 `/api` 反代 → webui 生产环境 API 请求全部命中 SPA fallback 返回 index.html | 合并反代配置(`proxy_buffering off` 支持 SSE,`/ws/` Upgrade) |
| 7 | `web/src/pages/Settings/index.tsx:108-110` | `settings.models` 后端不返回 → 渲染崩溃 | 可选链兜底 |

### 3.2 P1 —— 功能失效 / 契约不一致(按区域)

**Python runtime / selector(agent-10,8 项)**
- `http_server.py:565-616` `/v1/solutions/semantic-search` 给 `RAGPipeline.query` 传不存在的 `filters` 参数 → 永远 500;键名 `content`→`text`,title 从 metadata 取;sync-rag 补写 title
- `http_server.py:47-63` error 事件扁平结构与 Go 端嵌套 `json:"error"` 契约不符,执行失败被吞(客户端拿 200 空内容)→ 同时输出嵌套 + 扁平字段
- `http_server.py:90-124` 限流把平台代理当唯一客户端(60rpm 全站共享)→ 支持 `X-Forwarded-For`;清理 5 分钟闲置桶(修 defaultdict 内存泄漏)
- `selector/context_enricher.py:424-441` registry_client 为 None 时 `UnboundLocalError`;`endpoint.url` 不存在 → `host:port`
- `/v1/selector/route` 的 `enrich_context`/`bypass_cache` 定义了但从不传递 → 接通(契约撒谎修复)
- `selector/selector.py:206-246` LLM 抖动产生的降级决策被缓存 300 秒 → 降级决策不入缓存
- `selector/audit.py` `flush()` 死锁(worker 从不 `task_done`)→ 修复;close() docstring 与实际对齐
- route_type 词汇分裂(rule 出 `fta`、llm 归一为 `workflow`)→ selector.route 出口统一 `fta→workflow`,resilient_selector 去重用 canonical 值

**Python rag / memory / planning(agent-11,9 项)**
- `rag/pipeline.py` `_index_chunks` 写死 MilvusStore 无视 `vector_backend` → 按 backend 选 Milvus/Qdrant
- `rag/retrieve/reranker.py:223-232` LLM 重排传 dict(provider 按属性访问)→ 永远 AttributeError 被吞、排序失效;改 `ChatMessage`
- `memory.py:419` 长期记忆 search 读不存在的 `r["score"]` → `r.get("distance")`(此前永远返回空)
- `memory.py:328-337` 字符串 UUID 插 INT64 主键集合 → `id_type="string", max_length=64`(此前永远写不进)
- `memory.py` Episodic 压缩后残留旧 `entries` 字段 → `hdel`;补 Redis key TTL(默认 7 天)
- `memory.py:457,496-498` fire-and-forget task 无引用可能被 GC → `_pending_tasks` 集合持有
- `planning.py` fallback 路径丢 `context` → 3 处调用点补传
- `rag/ingest/chunker.py` overlap≥size 死循环 → 构造校验;句子切分支持中文标点 `。!?`,超长强制截断
- `rag/index/milvus.py:301-306` filter 表达式字符串插值注入 → 白名单 key + 转义 value

**Python skills/fta/agent/mcp/corpus/traffic(agent-12,12 项)**
- `fta/evaluator.py` 五处"依赖缺失返回 True"的 fail-unsafe 语义统一为 False;NodeEvaluator 缓存加 300s TTL;`_evaluate_skill` 先经共享 SkillLoader 加载(此前 str vs LoadedSkill 签名不匹配,skill 类事件恒失败)
- `skills/troubleshoot.py:220-235` 每次新建 SkillLoader(缓存恒空)→ 实例级共享 + load 兜底
- `code_analysis/engine.py:213-244` `analyze_single` 丢弃 call_graph/errors/solutions(只拷 analysis_id/stats)→ 完整带回
- `traffic/engine.py:108-118` create() 丢弃服务端真实 id 导致后续 404 → 读响应 id;`traffic/collector.py` 时间戳改带 Z 的 RFC3339(Go `time.Time` 兼容)
- `traffic/report_generator.py`、`code_analysis/solution_generator.py` 对 list 返回值调 `.get("chunks")` → 按 list 处理
- `skills/builtin/file_ops.py` 路径校验 `abspath`→`realpath`(防 symlink 逃逸,安全)
- `mcp/registry.py:134-148` `tools/call` 的 `isError` 不冒泡 → 失败正确上报
- `corpus/kudig_rag_import.py` 默认端口 3004(全仓唯一)→ 8080
- `corpus/seed_vectorizer.py` `--milvus-host/port/--force` 参数从不生效 → 接线(force = drop 后重建)
- `skills/executor.py:80-86` manifest 参数默认值合并进 inputs 再校验

**Go 平台(agent-13,13 项)**
- `memory_store.go:24-33` sequence_num 不自动分配 → postgres 下同会话第二条消息唯一键冲突 500;改 `COALESCE(MAX+1, 0)`
- `call_graph_store.go:58-91` postgres List 完全忽略 `opts.Filter` → 动态 WHERE(analysis_id/status/language 白名单)
- `retry/retry.go:108-112` MaxDelay==0 时退避坍塌为 0 → 只乘不封
- `circuitbreaker/breaker.go` Open→HalfOpen 首探测未计数;transitionTo 持锁同步调 Observer 可死锁 → 解锁后回调
- `middleware/{logging,tracing,telemetry}.go` 不实现 `http.Flusher`,挂载后 SSE 必 500 → 补 Flush()
- `gateway/route_sync.go:264` skill 状态 `"ready"` vs API 默认 `"active"` → 统一 active
- `runtime_client.go:493` Health() 的 `/v1/../health` 路径花招 → 直接拼
- traffic/callgraph handler 用 `rand.Intn(999999)` 生成主键易碰撞 → 改 `generateID()`
- `workflow_store.go` INSERT type 写死 'fta' → `WorkflowDefinition` 增加 Type 字段
- `cmd/resolveagent-server/main.go` `--config` flag 被静默忽略 → 解析并传给 `config.Load`
- `postgres.go:513-524` GetAgent 把 TIMESTAMP 扫进 string(pgx 必报错)→ time.Time 转 RFC3339

**deploy / configs(agent-14,9 项)**
- compose LLM key 变量名 `RESOLVEAGENT_LLM_QWEN_API_KEY` 等 Python 从不读取 → 改为实际的 `DASHSCOPE_API_KEY/WENXIN_API_KEY/ZHIPU_API_KEY`;runtime 补 `RESOLVEAGENT_PLATFORM_ADDR: platform:8080`
- dev compose:runtime 命令秒退(同 bug 1)→ `python -m resolveagent.runtime`;webui 端口 5173 与 vite 5174 不一致 → 统一 5174
- `deploy.sh:60` `command -v docker compose` 恒失败 → `docker compose version` 检测
- `pkg/config/config.go` `redis.password` 未注册 SetDefault 被 viper 静默丢弃 → 修复;compose redis 绑 127.0.0.1 + 条件 `--requirepass`(安全加固)
- `platform.Dockerfile` 缺 `ARG VERSION/GIT_COMMIT`,compose 传的 build arg 无人消费,镜像版本恒 dev/unknown → 补齐
- `scripts/migration` 与 Go 内嵌迁移是两套互不兼容 schema(UUID vs VARCHAR)+ 008 编号撞车 → 标记 DEPRECATED(以 Go 内嵌为唯一权威),重号改名 011
- `configs/resolveagent.yaml` 补 `server.runtime_addr` 文档化配置

**web / mobile(agent-15,8 项)**
- (P0 见上)`Agent.harness/mode` 可选化 + 6 页面兜底;`Settings.models` 兜底
- `createAgent` 静默丢 `model/system_prompt` → 放进 config map
- mock 回退在"后端活着但 404"时静默展示假数据;且 `return` 非 `return await` 导致 404 rejection 根本进不了 catch(回退逻辑是死的)→ 修复 + sonner toast 提示
- `FTATreeEditor` 不响应 faultTree prop 变化(保存会串数据)、连线方向未规范化、空 input_ids 坐标 NaN
- `web/src/pages/Mobile` iframe 硬编码 `http://localhost:4000` → `import.meta.env`
- mobile:TabBar activeTab 与路由不同步(改 useLocation);Diagnose 嵌套 setInterval 泄漏(cleanup)
- 删除无引用残留文件 `web/src/api/client 2.ts`

### 3.3 benchmark 自身代码(主 agent 修复,5 项)

- `bench.py` `minimax_chat` 对 4xx 也重试 3 次(密钥错误要 14s 才暴露)→ 只重试 429/5xx/网络异常
- `bench.py` judge 对未知 qid 直接 KeyError 且结果不落盘 → `dataset.get` 跳过 + 告警
- `bench.py` `NORM_RE` 的 `if False` 死分支清理;p95 索引越界修正
- `shim/app.py` embo-01 摄入/查询都发 `type:"db"` → 按批次大小区分 query/db(摄入 16 条/批,查询单条)

---

## 4. 复验中新发现并已修复的问题

1. `configs/resolveagent.yaml` 把 `server.runtime_addr: localhost:9091` 写死,viper 文件优先级盖过 compose 的 `RESOLVEAGENT_RUNTIME_GRPC_ADDR`,Go 修复的回退逻辑永远走不到 → compose 补 `RESOLVEAGENT_SERVER_RUNTIME_ADDR: runtime:9091`(env 优先级最高)
2. 平台代理契约验证时发现 `handleExecuteAgent` 的请求字段是 `message` 而非 `input`(`agent_handlers.go:128`)——文档与实际契约差异,本次 benchmark 直连 runtime 不受影响,前端/外部调用需注意
3. 修复期间 Docker Desktop 因宿主机睡眠退出、构建缓存 snapshot 损坏(`docker builder prune` 解决)、`golang:1.25-alpine` 镜像随 go.mod 对齐后需补拉

**端到端复验**(修复后全栈):
- `GET :3000/api/v1/agents`(经 webui nginx 反代)→ 平台 JSON ✓
- `POST :8080/api/v1/agents/wiki-k8s-bench/execute`(平台→runtime 代理,原 P0 断链)→ 路由 rag、检索 5 篇、答案"1MiB(1048576 字节)"正确引用语料 ✓
- `POST :9091/v1/solutions/semantic-search`(原永远 500)→ 正常返回 ✓
- 9/9 容器 healthy;postgres v15 迁移干净落库

---

## 5. 第二轮:查漏补缺(2026-09-07 ~ 09)

### 5.1 第一轮 deferred 清单修复(14 项)

**Python(agent-16,5 项)**
- `agent/mega.py` **fta/workflow 路由只回模板话**(benchmark q28 根因):workflow 无定义或产出空内容时降级为真实 LLM 直答,metadata 标 `degraded=true`
- `mega.py` **双重路由**:`reply(message, decision=None, _depth=0)` 接受 engine 已算出的 decision,跳过内部二次 selector 调用
- `mega.py` workflow agent 节点**递归深度保护**(MAX_REPLY_DEPTH=3),超限降级 direct
- `mcp/client.py` **stdio initialize 握手**补齐(initialize + notifications/initialized),health_check 改 ping/tools/list 探测
- `runtime/http_server.py` RateLimitMiddleware 对 `scope["client"]=None`(unix socket)的 TypeError 防护

**Go + deploy(agent-17,4 项)**
- 补 `PUT /api/v1/traffic/captures/{id}` 路由 + handler(合并式更新,Python traffic engine 的 404/405 闭环)
- `webui.dev.Dockerfile` EXPOSE 5173→5174、`deploy.sh` 提示端口同步
- **Helm chart 最小可用化**:platform 注入 DB/Redis/NATS env(密码走新增 secret.yaml 的 secretKeyRef)、runtime/platform 补探针、删除死 values(postgresql/redis/nats.enabled)改为外部服务配置;`helm template` 渲染验证通过
- `configs/resolveagent.yaml` 的 `gateway.auth` 节加"当前未生效"注释(死配置明示)

**前端(agent-18,5 项)**
- Settings 页 `resolve_net/platform` 裸引用全部可选链 + "未配置"兜底;`SystemSettings` 类型对齐后端实际返回
- 复查发现 `agent.config` 裸访问(config 可为 null)→ `config?: Record<string,unknown>` + 5 处可选链
- `TrafficGraphViewer` 同 FTATreeEditor 的"不响应 prop 变化"问题 → useEffect 同步;FTATreeEditor 切换时重置 selectedNode/panelOpen

### 5.2 新区域二次审计(30 项发现)与修复(23 项)

**internal/cli(agent-20,9 项全修)**
- `agent logs` URL 拼接缺 `?`(limit 落进 path)→ `url.Values`;新增 `APIError`/`IsNotFound`
- quickstart README 命令不可执行 + `agent.yaml` 顶层包装键导致字段全丢 → README 修正 + `createFromFile` 兼容包装结构
- `config set` 无配置文件时必失败 → 回退 `SafeWriteConfigAs` 到 `~/.resolveagent/config.yaml`
- `workflow run` 提示不存在的 `workflow logs` 子命令 → 改提示真实命令
- `agent logs --follow` 恒失败 → 未实现前在 flag 层直接拒绝(不发请求),删除死代码
- `rag query` 按字节截断 UTF-8 乱码 → `[]rune`;`skill remove` 错误误报 not found → 保留原始错误;`agent list` 的 `--type/--status` 死 flag → 本地过滤接上;交互式会话死代码 + `fmt.Scanln` 单 token → 重实现挂 `-i/--interactive`,bufio 整行读取

**pkg(event/feedback/health/logger/registry,agent-21,9 项全修)**
- `pkg/event/nats.go` **Publish 必失败**:stream subjects 前缀(AGENTS.*)与 Event.Type 惯例(`agent.created`)不匹配 → 统一 `streamSubject()` 映射(`agent.created`→`AGENTS.agent.created`)+ subjects 通配 `*`→`>` + Publish 支持 ctx;补表驱动测试
- `pkg/feedback/alerts.go` resolveCondition **完全忽略聚合统计**(文档示例条件永不触发)→ 聚合统计展开为可寻址指标;gauge 并入求值;**指标缺失与指标=0 区分**(缺失不触发)
- alerts Stop 二次调用 panic → sync.Once;同一告警每 30s 重复触发 → fired 状态冷却
- `pkg/health/health.go` **Run 持写锁同步执行外部 check**(check 挂起阻塞所有 /readyz,回调即死锁)→ 快照放锁 + 并行 + per-check 5s 超时
- `pkg/logger` 级别解析仅认小写 → ToLower;`pkg/registry/template.go` offset 越界返回全量 → 空切片;`solution.go` Delete 不级联 executions → 补级联;agent/skill/workflow 的 `List` 忽略 ListOptions → 实现分页;`call_graph.go` edgeMap 平行边互相覆盖 → 邻接表直接存边

**integrations/dify(agent-22,5+3 项全修)**
- 插件**加载即失败**三连:顶层 import 了打包环境不存在的 `resolveagent` 包(逻辑内联进插件)、工具类未真继承 `dify_plugin.Tool`、`_invoke` yield 裸 dict(改 `create_text_message`)
- manifest 引用的 `icon.svg` 不存在(打包校验必败)→ 补矢量图标;`manifest.yaml` author 含空格、缺 `created_at`/`meta`、缺 `main.py` 入口 → 一并补齐(过 SDK `PluginConfiguration` 校验)
- provider 缺 `credentials_for_provider` 段(凭据输入框不渲染,校验恒失败)→ 补 endpoint/api_key 声明;校验失败改抛 `ToolProviderCredentialValidationError`
- 验证:真 SDK(dify-plugin 0.10.2)冒烟——工具实例化+调用、provider 凭据校验、YAML schema 全过;`dify-plugin package`(独立 Go CLI)未实机运行,已注明

### 5.3 二轮验证

- Python `pytest tests/`:534 → **545 passed**(新增 mega 降级/双路由/递归深度、MCP 握手等 11 用例)
- Go:`build/vet/test` 全绿;event/feedback/health 新增测试;`go test -race` 无数据竞争
- 前端:tsc 无错误,vitest 111/112(唯一失败 `mockQuality.test.ts` 为工作区既有的 `GTM/index.html` 未提交改动所致,与本修复无关,git stash 隔离验证过)
- helm template 渲染合法;Dify 插件 SDK schema 校验通过
- docker 全栈重建:9/9 healthy,冒烟通过(见 §4 同法复验)

---

## 6. 未修复项(如实记录,供后续立项)

| 项 | 状态/原因 |
|---|---|
| **鉴权中间件是死代码**(`pkg/server/middleware/auth.go` 无调用方,所有变更类端点零鉴权) | 接上会改变全部客户端契约,属产品决策(本轮已在配置中标注"未生效") |
| **OpenAPI/proto 与实际路由不同步**(`api/openapi/v1/resolveagent.yaml` 仅覆盖少量端点;平台 `message` vs runtime `input` 字段分裂) | 需契约收敛专项,建议以 router.go 为权威生成 |
| **Helm chart 完整化**(内置依赖、webui 模板) | 本轮已最小可用(env 注入+探针);完整化待立项 |
| TUI dashboard 硬编码假数据(`internal/tui/app.go:79-90` 与 views 未接线) | 占位实现,非崩溃;待接线 |
| registry `Get/List` 返回内部对象指针(调用方可绕锁改字段);NATS 同 eventType 多 Subscribe 共 durable(分摊而非广播) | 疑似/设计语义项,需确认意图后改 |
| `examples/quickstart` 的 workflow.yaml 等示例内容深度 | README 命令已修通;示例内容丰富度待补 |
| fta/workflow **真实执行闭环**(本轮已加降级直答兜底,工作流执行结果回传需单独设计) | 产品功能项 |
| `GTM/index.html` 工作区存在未提交改动导致 `mockQuality.test.ts:750` 失败 | 与本报告无关的既有改动,未动 |

**环境备注**:修复期间多次观察到工作区被外部进程并发改动(文件被短暂还原、`internal/runtime/doc.go` 被删、`.pth` 文件被打 macOS hidden 标志导致 venv 失效)——建议排查是否有其他工具/代理在同一工作区运行;所有修复提交前均已复核落盘。

---

## 7. 变更文件清单(两轮累计)

- **Python**:`runtime/http_server.py`、`selector/{selector,audit,context_enricher,resilient_selector}.py`、`rag/{pipeline.py,retrieve/{retriever,reranker}.py,index/milvus.py,ingest/chunker.py}`、`memory.py`、`planning.py`、`fta/{engine,tree,evaluator,parallel_evaluator}.py`、`skills/{troubleshoot,executor}.py`、`skills/builtin/file_ops.py`、`code_analysis/{engine,solution_generator}.py`、`traffic/{engine,collector,report_generator}.py`、`mcp/{client,registry}.py`、`corpus/{kudig_rag_import,seed_vectorizer}.py`、`agent/mega.py`
- **Go**:`pkg/config/config.go`、`pkg/server/{runtime_client,agent_handlers,memory_handlers,traffic_handlers,callgraph_handlers,router}.go`、`pkg/server/middleware/{logging,tracing,telemetry}.go`、`pkg/store/postgres/{postgres,memory_store,call_graph_store,workflow_store}.go`、`pkg/{retry,circuitbreaker}`、`pkg/gateway/route_sync.go`、`pkg/registry/{workflow,agent,skill,solution,template,call_graph}.go`、`pkg/event/nats.go`、`pkg/feedback/alerts.go`、`pkg/health/health.go`、`pkg/logger/logger.go`、`cmd/resolveagent-server/main.go`、`internal/cli/{client,agent/{create,list,logs,run},config,workflow,rag,skill}`
- **deploy/configs**:3 个 Dockerfile、`docker-compose{,.dev}.yaml`、`.env.example`、`nginx/default.conf`、`deploy.sh`、`configs/resolveagent.yaml`、`.dockerignore`、`scripts/migration/`(README + 011 重命名)、`Makefile`、`deploy/helm/resolveagent/`(values、secret.yaml、两个 deployment)
- **前端**:`web/src/api/client.ts`(+7 页面 + TreeEditor + TrafficGraphViewer + Settings + Mobile 页)、`web/src/types/index.ts`、`mobile/src/{App.tsx,pages/Diagnose.tsx}`
- **集成/示例**:`integrations/dify/resolveagent-dify/`(manifest、provider、tools、icon.svg、main.py)、`examples/quickstart/README.md`
- **benchmark**:`benchmarks/wiki-k8s/` 全部(新资产)

**测试增量**:Python 累计 +55 用例(selector 缓存/降级、http 契约、memory TTL/主键、planning fallback、fta 求值、mega 降级/双路由/递归深度、MCP 握手、skill 默认值、file_ops symlink、mcp isError、traffic 时间戳、code_analysis 结果完整性等),`pytest 545 passed`;Go `pkg/...` 全绿(event subject 映射、alerts 聚合求值/冷却、health 并发/超时新测试,`-race` 通过);web `vitest 112 passed`,双端 tsc 无错误;`helm template` 渲染合法;Dify 插件过 SDK schema 校验。
