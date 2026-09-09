# Gotchas

## 2026-09-05 · code-up

- README 与前端（web/src/pages/FTAEngine/index.tsx）宣称 FTA 有"六种门 + NOT + 蒙特卡洛仿真"，但 `python/src/resolveagent/fta/` 实际只有 5 种门、无 NOT、无 monte_carlo 实现；蒸馏与写代码都以源码为准。
- `memory.py` 内没有任何 TTL 常量；全仓 TTL 语义在 `selector/cache.py`（300s）与 `runtime/registry_client.py`（60s）。找"记忆过期"别在 memory.py 里找。
- `pkg/feedback`、`pkg/circuitbreaker` 均诞生于单次批量提交（git log 仅 `5e2bf90 update`），做三处证据交叉验证时 git 维度常缺位，需靠注释与测试补齐。
- `toolhub.py` 的 `execute` 固定以 `["user"]` 角色鉴权，SENSITIVE/RESTRICTED 工具永远调不通；这是行为不是配置问题。
- `docs/design/` 的 gate.py 全量报告含其他批次文档（00/02/04/07/09 等）的历史 error，与 03/06/12 三篇无关；核对归属时按报告里的 file 字段过滤。
- `web/vite.config.ts` 行号陷阱：`port: 5174` 在 L29，L15 是 vendor chunk 判断逻辑；写前端锚点前先 grep 再落笔。
- gate.py 的引用格式检查对 `> [!NOTE]` 推测标注和表格单元格里的纯文本 `file:NN` 同样判 error；推测标注里的证据也必须写成 `[file:NN](path#LNN)` 链接。
- `configs/runtime.yaml`、`configs/models.yaml`、types.go 的 `RuntimeConfig` 均无消费方（全仓 grep `cfg.Runtime` 无命中）；蒸馏时别把它们当运行时行为的事实来源。
- `rag/index/milvus.py` 与 `rag/retrieve/retriever.py` 存在用户未提交的工作区修改（MILVUS_HOST/PORT 等 env 支持）；04 篇的行号以工作区为基准，按 `source_commit: 21fdb74` 回溯这两处需先 `git diff`。
- `skills/manifest.py` 的 permissions 默认值（256MB/30s/60s）与 `sandbox.py` 实际默认（512MB/10s CPU/30s）是两套数字，executor 全文不读 permissions——调沙箱限额要改 SandboxConfig，改 manifest 无效。
- 钩子失败语义两套并存：`hooks/runner.py`（钩子失败继续）与 `hooks/patterns.py` 的 HookChain（pre 失败中止主流程）答案相反；接入前先确认用哪套。
- RAG 无 API key 时嵌入返回零向量照常入库，且空 embedding 建集合按 1024 兜底而 text-embedding-v2 实际 1536 维——配好 key 后必须重灌数据。
- `toolhub.py` 的 `discover_from_mcp`（L366）把 `MCPTool` 对象当 dict 调 `.get("name")`，MCP 工具永远进不了 ToolHub 能力索引；engine 的 `execution_mode: mcp` 直达 adapter 才是可用路径。
- `pkg/telemetry/metrics.go` 的 `InitMetrics` 建 MeterProvider 后 `_ = meterProvider` 丢弃（L94）：OTel 指标是死路，能被 Prometheus 抓到的只有 promauto 直注 registry 的那批。
- Go `/healthz` 与 `/api/v1/health` 挂的是静态 handler（pkg/server/system_handlers.go），`health.Checker`/`ReadinessHandler` 无路由；「服务挂了探针还绿」先查路由没接真实检查。
- `message_bus.py` docstring 声称支持通配符频道（L200），实现是精确字典匹配（L143）且全仓零 import；三套事件总线（message_bus / pkg/event / pkg/feedback）均未接线，当前唯一真实事件通路是 runtime SSE。
- `configs/models.yaml` 注释自认未接线（L3-5）、`ModelRegistry` 全仓零 import；模型路由事实源是环境变量 + `create_llm_provider` 工厂（tp- 密钥按 base_url 分流，daec347 修复）。
- code_analysis 的 engine 链路对非 Python 语言用正则解析、提不出 calls；真解析器在 parsers/（tree-sitter）但未接入 engine——分析非 Python 仓库时调用图基本只剩 phantom 节点。

## 2026-09-06 · code-up

- Go↔Python 的 gRPC `RegistryService` 是死代码：proto（api/proto/v1）与 Go 实现（pkg/service/registry_service.go）齐备，但全仓 grep 无任何 `RegisterRegistryServiceServer` 注册点；Python 实际经 store/ 的 REST 客户端（BaseStoreClient → http://localhost:8080）消费事实源，gRPC 只用于 Go→Python 反方向的 AgentExecutionService。动 Go↔Python 契约前先 grep 注册点，别按 README/文档宣称的 gRPC 链路理解系统；若未来接线，docs/design/10 篇「Python 侧消费面」结论需回改。
