# ResolveAgent 项目全面评估报告

> 评估日期: 2026-05-19
> 评估工具: Hermes Agent Project Evaluation Framework
> 项目版本: v0.3.0

---

## 一、项目概况

ResolveAgent 是面向问题解决的 AIOps 智能体平台 (v0.3.0)，基于 2026 Agent Engineering 最佳实践构建。平台通过 Intelligent Selector 智能路由、Hybrid Planner 混合规划、Hierarchical Memory 三层记忆等核心模块，实现故障诊断、代码分析、RAG 知识检索等 AIOps 场景。

### Tech stack

- Python 3.11+ (Agent Runtime): FastAPI, Pydantic, gRPC, httpx
- Go 1.22+ (Platform Services): slog, net/http, gRPC, PostgreSQL
- React 18 + TypeScript (WebUI): Vite, Tailwind, Zustand, Radix UI
- Infrastructure: PostgreSQL 16, Redis 7, NATS JetStream, Milvus/Qdrant

### Code scale

| 维度 | 数量 |
|------|------|
| Python src | ~29,630 LOC (100+ files) |
| Go | ~17,859 LOC (30+ files) |
| WebUI | ~29,239 LOC (95 tsx/ts files) |
| Total | ~76,700+ LOC |
| Tests | Python 4,615 LOC (22 files), Go 33 test files, WebUI 6 test files |

### Git maturity

23 commits, main branch, no CI/CD pipeline

---

## 二、架构评估 — 评分：7.5/10

### 优点

- [+] 清晰的三语言分层架构：Go Platform -> Python Runtime -> React WebUI
- [+] Intelligent Selector 采用三层路由 (Intent -> Context -> Decision)，支持 rule/llm/hybrid 三种策略，设计成熟
- [+] Hierarchical Memory 三层记忆架构 (Working/Episodic/Long-term) 符合 2026 年 Agent Memory 最佳实践
- [+] Resilience 模块实现 CircuitBreaker + FallbackCascade，降级路径清晰 (MCP -> Native -> LLM -> Cached)
- [+] Go 端 registry 模式支持 in-memory 和 PostgreSQL 双后端，便于开发和生产切换
- [+] REST API 路由覆盖完整 (136 行 router.go)，资源粒度合理

### 问题

- [-] Python HTTP Server (http_server.py) 中每次请求都创建新的 RAGPipeline/SkillExecutor 实例，无连接池或单例管理
- [-] memory.py 中 WorkingMemory.max_size 在 __init__ 中设为 20，但 deque 的 maxlen 也是硬编码 20，两处重复定义
- [-] Go server.go 中 SolutionRegistry 仍使用 in-memory 实现 (line 77)，与其他 registry 的 PostgreSQL 实现不一致
- [-] AgentMessageBus (message_bus.py) 使用内存 pub/sub，未与 Docker Compose 中的 NATS JetStream 集成
- [-] Planner 的 _simple_decompose_plan 使用关键词匹配分解目标，过于简单

---

## 三、代码质量 — 评分：7/10

### 优点

- [+] Python 代码现代、一致：全程 type hints, Pydantic v2, dataclass, async/await，ruff + mypy 配置完善
- [+] Go 代码使用 slog 结构化日志，error wrapping (%w)，context.Context 传播
- [+] Selector 模块设计优秀：策略模式 + 缓存 + 审计日志
- [+] pre-commit 配置覆盖 Go/Python/ESLint/Protobuf 全栈

### 问题

- [-] README 第 19 行声称 "Go-1.22" 且有 CI Status badge，但仓库中无 .github/workflows/ 目录，badge 链接失效
- [-] Python mypy strict=false，且对 rag/index 和 ast_parser 设置了 ignore_errors=true
- [-] memory.py 第 128 行 redis_url 参数默认值截断：`"redis://localhost:***"` — 语法错误
- [-] toolhub.py CapabilityMap 的 _kw/_cap 变量未使用 (line 97-100)
- [-] WebUI tsconfig.json 中 strict 模式待确认

---

## 四、测试覆盖 — 评分：5.5/10

### 优点

- [+] Python 测试覆盖较广：selector (504 行), intent, context enricher, rule/llm/hybrid strategy 均有独立测试类
- [+] Go 有 33 个测试文件覆盖 server, config, registry, middleware, e2e, CLI, TUI 等层
- [+] 测试质量好：async 测试、fixture 使用、边界条件测试

### 问题

- [-] WebUI 仅 6 个测试文件，95 个组件/页面几乎无测试覆盖
- [-] Python http_server.py (646 行 FastAPI 应用) 无任何测试
- [-] Python runtime/engine.py、planning.py、memory.py 的核心逻辑无单元测试
- [-] Go 测试中 server_test.go 仅测试构造函数，无 HTTP handler 测试
- [-] 无 E2E 测试实际运行的证据

**测试比:** Python 4,615/29,630 = 15.6% | Go + WebUI 更低

---

## 五、安全性 — 评分：5/10

### 优点

- [+] Go 端有完善的 AuthMiddleware：支持 JWT + API Key + Gateway Header 三种认证方式，使用 constant-time 比较防时序攻击
- [+] ToolHub 有 SecurityPolicy (PUBLIC/SENSITIVE/RESTRICTED) 和审计日志
- [+] pre-commit 包含 detect-private-key 钩子

### 问题

- [-] docker-compose.yaml 硬编码默认密码：POSTGRES_PASSWORD: resolveagent，无 .env.example 文件提醒用户修改
- [-] Python http_server.py 所有异常都返回 str(e) 给客户端，可能泄露内部堆栈信息
- [-] Python Runtime HTTP 端点无认证中间件，任何人可调用 /v1/agents/{id}/execute 等敏感操作
- [-] Go Auth 默认 Enabled: false，生产环境如未显式启用则无认证保护
- [-] 无 CORS 配置、无 Rate Limiting、无 CSP Headers
- [-] LLM API Key 通过环境变量传递但无加密存储机制

---

## 六、性能 — 评分：6.5/10

### 优点

- [+] Selector 有 RouteDecisionCache (LRU + TTL) 避免重复路由计算
- [+] CircuitBreaker 防止级联故障，快速失败
- [+] WebUI 使用 Vite 构建，有 code splitting 基础设施

### 问题

- [-] WebUI 无 React.lazy 路由级 code splitting
- [-] Python http_server.py 每次请求 new RAGPipeline()，无连接复用
- [-] memory.py WorkingMemory.add() 是同步方法但 add_async() 才加锁，并发场景可能数据竞争
- [-] Go server.go 未配置 HTTP 超时 (ReadTimeout/WriteTimeout)

---

## 七、开发体验 — 评分：7.5/10

### 优点

- [+] Makefile 极其完善：26 个 target 覆盖 build/test/lint/docker/helm/migrate/fmt/docs
- [+] 文档丰富：README 有架构图和 API 示例，docs/zh/ 有 15+ 篇技术文档
- [+] pyproject.toml 现代化配置 (hatchling build, ruff, mypy)
- [+] Docker Compose 配置完整：4 个 Dockerfile + 3 个 compose 文件 + Helm Chart
- [+] 预置 skill manifests 和 demo configs

### 问题

- [-] 无 CI/CD pipeline (.github/workflows/)
- [-] 无 .env.example 文件
- [-] 无 CONTRIBUTING.md
- [-] Git 提交信息质量低："major update" (x4), "update" (x3)

---

## 总评：6.5/10

ResolveAgent 展示了扎实的架构设计能力和对 2026 年 Agent Engineering 趋势的深入理解。Intelligent Selector 的三层路由 + 策略模式、Hierarchical Memory 的 Working/Episodic/Long-term 分层、以及 Resilience 的 CircuitBreaker + FallbackCascade 组合，都是生产级的设计模式。Go Platform 和 Python Runtime 的分离清晰，Makefile 和文档质量远超同阶段项目。

然而，项目在"从架构到生产"的过渡中存在明显短板：安全配置形同虚设 (认证默认关闭、无 CORS/Rate Limiting、密码硬编码)、测试覆盖不均 (Selector 测试优秀但 HTTP 层和 WebUI 几乎无测试)、CI/CD 完全缺失。

### 最突出的优势

1. Intelligent Selector 架构设计 — 策略模式 + 缓存 + 审计完整
2. 全栈 Makefile — 26 个 target 覆盖完整开发生命周期
3. Go Auth Middleware — JWT + API Key + Gateway 三认证模式

### 最需要改进的方面 (按优先级)

1. **[P0 安全]** 移除硬编码密码，添加 CORS/Rate Limiting，HTTP 端点加认证
2. **[P0 安全]** Python HTTP Server 错误消息脱敏
3. **[P1 质量]** 添加 CI/CD pipeline (.github/workflows/ci.yaml)
4. **[P1 质量]** Python HTTP Server + Runtime Engine 单元测试
5. **[P2 体验]** 添加 .env.example + CONTRIBUTING.md
