# Feature Status | 功能状态

> **v0.4.0** | 核心组件经全面修复与测试加固（Python 480+ 单元测试项 + 8 套集成测试 + Web 113 项，CI 门禁全绿）
> 状态标记：🟢 Ready（已接线可用）／🟡 库就绪（实现+单测齐备，待接入生产调用链）／🔵 示例（独立原型）

## 核心引擎

| 引擎 | 状态 | 说明 |
|------|------|------|
| Intelligent Selector | 🟢 Ready | 三阶段元路由 + rule/llm/hybrid 策略 |
| Resilient Selector | 🟢 Ready | 失败重试 + 错误分类路由偏好 + 自适应权重 |
| Hierarchical Memory | 🟡 库就绪 | 三层记忆（Working/Episodic/Long-term）实现+单测齐备，**待接入生产调用链** |
| Hybrid Planner | 🟢 Ready | 双模式 + LLM 分解 + JSON 容错解析 |
| FTA Engine | 🟢 Ready | 五门类型（含时序语义）+ 最小割集 + 蒙特卡洛仿真 |
| RAG Pipeline | 🟢 Ready | Milvus / Qdrant 双后端向量检索 |
| Skill System | 🟢 Ready | 技能注册 + 沙箱执行（bash/python/js）+ 场景排查引擎 |
| ToolHub | 🟡 库就绪 | 工具发现/注册/安全策略实现+单测齐备，**待接入生产调用链** |
| Resilience | 🟢 Ready | CircuitBreaker + FallbackCascade |
| Loop Engineering | 🟢 Ready | Go 反馈闭环 + Python 工作流反馈 |
| LLM Providers | 🟢 Ready | Qwen / 文心 / 智谱 / Higress / OpenAI 兼容（Kimi、MiMo Token Plan） |
| MCP Adapter | 🟢 Ready | Model Context Protocol |

## 基础设施

| 组件 | 状态 | 说明 |
|------|------|------|
| Go Platform | 🟢 Ready | Registry / Auth / Route / Store / Feedback + sentinel 错误链防泄漏 |
| Python Runtime | 🟢 Ready | HTTP + SSE 流式服务（`python -m resolveagent.runtime`） |
| CLI & TUI | 🟢 Ready | agent/skill/workflow/rag/corpus 子命令 + TUI 控制台 |
| WebUI | 🟢 Ready | 23 个功能页面（React + Vite + Tailwind）+ 演示模式徽标 |
| Mobile Web | 🔵 示例 | `examples/mobile-demo/` 移动端示例（独立原型，不随产品演进） |
| CI/CD | 🟢 Ready | 单一流水线（Go 1.25），覆盖 lint / test / e2e / mobile / docker 阶段 |
| 部署 | 🟢 Ready | Docker Compose（deps 含外部 etcd）+ Helm chart |

## 已知待办（截至 2026-10-05，经代码实测裁定）

| 待办 | 类型 | 说明 |
|------|------|------|
| Memory / ToolHub / AgentMessageBus 生产接线 | 架构 | 三模块实现+单测齐备（能力库），但 `MegaAgent` / `ContextEnricher` / Skill 执行链中无调用点，运行时不生效 |
| `watch_registry` 实时变更流 | 架构 | 需 Go 服务端先提供 WebSocket/SSE 变更端点（尚不存在），客户端单侧实现无意义 |
| workflow 按注册定义执行 | 架构 | registry 存 FTA 故障树（`Tree`），与执行引擎的 nodes/edges 图不同构；树→图转换未实现前，执行流会如实披露 `definition_pending` 后走开发回退 |
| `resolveagent.api` 包 | 功能 | 21 行空壳，待 REST 客户端能力落地 |
| Web code-analysis 6 方法接真实后端 | 功能 | 前端目前永远走 mock 数据 |
| `pkg/event/nats.go` / `AgentExecutionServer` 接线 | 架构 | NATS JetStream 总线可用但零调用方；后者指向不存在的服务（刻意保留待 v0.6.0 分布式阶段） |
| RAG collection 删除联动向量库 | 功能 | Go 平台删除 collection 时仅清 registry 记录，Python 向量库侧的 gRPC 清理调用未接线 |
| Milvus delete-by-filter 端到端验证 | 验证 | 代码已落地并有单测（fake client），对真实 Milvus 实例的集成验证待环境 |
| Go 覆盖率阈值重标定 | 流程 | 阈值 17.0% 对实测 17.1% 仅 0.1pt 余量，且随 Go 工具链版本剧变（go1.25→17.5%，go1.27→32.2%）；**任何 Go minor 升级必须重标基线** |

> 已关闭项（2026-10-04/05 四轮修复）：ReAct/troubleshoot/BaseAgent/Milvus-delete 四处占位真实接线、engine 诚实门、零测试模块补测（382→480）、CI 三根因、脚本执行位、action 版本漂移、vitest 2→5 对齐 vite 8。
