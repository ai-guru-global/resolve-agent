# ResolveAgent 开发计划

**版本**: v0.1.0-alpha → v0.2.0-beta  
**时间**: 4 周迭代  
**目标**: 实现核心功能，提升测试覆盖率至 60%

---

## 📅 迭代计划

### Week 1: 基础设施（高优先级）
**目标**: 完成存储层和 LLM Provider

| 天数 | 任务 | 文件 | 验收标准 |
|------|------|------|----------|
| Day 1 | PostgreSQL 连接池 | `pkg/store/postgres/postgres.go` | 可连接、查询、迁移 |
| Day 2 | Redis 客户端 | `pkg/store/redis/redis.go` | 可连接、Get/Set/Del |
| Day 3 | NATS JetStream | `pkg/event/nats.go` | 可发布、订阅 |
| Day 4 | 百度文心一言 | `python/src/resolveagent/llm/wenxin.py` | 可调用 API |
| Day 5 | 智谱清言 | `python/src/resolveagent/llm/zhipu.py` | 可调用 API |
| Day 6 | OpenAI 兼容层 | `python/src/resolveagent/llm/openai_compat.py` | 支持 vLLM/Ollama |
| Day 7 | 测试 & 集成 | - | 所有测试通过 |

### Week 2: CLI 工具（中优先级）
**目标**: 完成 18 个 CLI 命令

| 天数 | 任务 | 数量 | 说明 |
|------|------|------|------|
| Day 1 | Agent CLI | 5 | list, create, delete, run, logs |
| Day 2 | Skill CLI | 5 | list, info, install, remove, test |
| Day 3 | Workflow CLI | 5 | list, create, validate, visualize, run |
| Day 4 | RAG CLI | 3 | collection, ingest, query |
| Day 5 | 其他 CLI | 3 | config, serve, dashboard |
| Day 6 | CLI 集成测试 | - | 端到端测试 |
| Day 7 | 文档 & 修复 | - | CLI 使用文档 |

### Week 3: FTA 引擎 & RAG 增强（中优先级）
**目标**: 完善 FTA 和 RAG 核心功能

| 天数 | 任务 | 文件 | 说明 |
|------|------|------|------|
| Day 1 | 割集计算 | `python/src/resolveagent/fta/cut_sets.py` | MOCUS 算法 |
| Day 2 | FTA 求值器 | `python/src/resolveagent/fta/evaluator.py` | 集成技能/RAG/LLM |
| Day 3 | RAG 重排序 | `python/src/resolveagent/rag/retrieve/reranker.py` | BGE-Reranker |
| Day 4 | RAG Server | `pkg/server/router.go` | 集合/摄取/查询 API |
| Day 5 | 运行时引擎 | `python/src/resolveagent/runtime/engine.py` | 完整执行流程 |
| Day 6 | 技能执行器 | `python/src/resolveagent/skills/executor.py` | 沙箱集成 |
| Day 7 | 集成测试 | - | FTA + RAG 端到端 |

### Week 4: 可观测性 & 优化（低优先级）
**目标**: 生产就绪功能

| 天数 | 任务 | 文件 | 说明 |
|------|------|------|------|
| Day 1 | OpenTelemetry Tracing | `pkg/telemetry/tracer.go` | 分布式追踪 |
| Day 2 | OpenTelemetry Metrics | `pkg/telemetry/metrics.go` | Prometheus 导出 |
| Day 3 | WebUI API | `web/src/pages/*` | Agent 创建/执行 |
| Day 4 | 性能优化 | - | 连接池、缓存优化 |
| Day 5 | 安全加固 | - | 输入验证、权限检查 |
| Day 6 | 测试覆盖 | - | 目标 60% |
| Day 7 | 发布准备 | - | CHANGELOG, Tag |

---

## 📋 详细任务清单

### Week 1 任务

#### Day 1: PostgreSQL 存储层
```go
// 需要实现:
- [ ] pgxpool 连接池初始化
- [ ] Health() 健康检查
- [ ] Close() 连接关闭
- [ ] Migrate() 数据库迁移
- [ ] Query/Exec 基本操作
```

#### Day 2: Redis 客户端
```go
// 需要实现:
- [ ] go-redis 客户端初始化
- [ ] Health() PING 检查
- [ ] Close() 连接关闭
- [ ] Get/Set/Delete 缓存操作
- [ ] TTL 支持
```

#### Day 3: NATS JetStream
```go
// 需要实现:
- [ ] nats.Connect() 连接
- [ ] js.AddStream() 创建流
- [ ] js.Publish() 发布消息
- [ ] js.Subscribe() 订阅消息
- [ ] 消息持久化和 ACK
```

#### Day 4-6: LLM Providers
```python
# 需要实现:
- [ ] Wenxin: 千帆 API 调用
- [ ] Zhipu: GLM API 调用
- [ ] OpenAICompat: 通用 OpenAI API
- [ ] 流式响应支持
- [ ] 错误处理和重试
```

---

## ✅ 每日检查清单

### 开始工作前
- [ ] 查看昨日任务完成情况
- [ ] 更新 TODO 列表
- [ ] 明确今日目标

### 完成任务后
- [ ] 代码通过 `go test` / `pytest`
- [ ] 代码通过 linter (`golangci-lint` / `ruff`)
- [ ] 添加单元测试
- [ ] 更新 CHANGELOG
- [ ] 标记任务完成

---

## 📊 进度跟踪

### Week 1 进度
| 日期 | 任务 | 状态 | 备注 |
|------|------|------|------|
| Day 1 | PostgreSQL | ✅ Done | pgx 连接池、迁移 |
| Day 2 | Redis | ✅ Done | go-redis、缓存操作 |
| Day 3 | NATS | ✅ Done | JetStream、发布订阅 |
| Day 4 | Wenxin | ✅ Done | 千帆 API、JWT |
| Day 5 | Zhipu | ✅ Done | GLM API、流式 |
| Day 6 | OpenAI | ✅ Done | vLLM/Ollama 支持 |
| Day 7 | 集成测试 | ✅ Done | 全部编译通过 |

### Week 2 进度
| 日期 | 任务 | 状态 | 备注 |
|------|------|------|------|
| Day 1 | Agent CLI | ✅ Done | 5 个命令 (create, list, delete, run, logs) |
| Day 2 | Skill CLI | 🔄 In Progress | 5 个命令 |
| Day 3 | Workflow CLI | ⬜ Not Started | 5 个命令 |
| Day 4 | RAG CLI | ⬜ Not Started | 3 个命令 |
| Day 5 | 其他 CLI | ⬜ Not Started | 3 个命令 |
| Day 6 | 集成测试 | ⬜ Not Started | - |
| Day 7 | 文档 | ⬜ Not Started | - |

---

## 🎯 里程碑

### v0.1.0-alpha → v0.1.1-alpha (Week 1)
- [ ] 存储层可用（PostgreSQL + Redis + NATS）
- [ ] 多 LLM 支持（Qwen + Wenxin + Zhipu + OpenAI）

### v0.1.1-alpha → v0.1.2-alpha (Week 2)
- [ ] CLI 工具完整可用
- [ ] 所有 API 可通过 CLI 访问

### v0.1.2-alpha → v0.2.0-beta (Week 3-4)
- [ ] FTA 引擎完整功能
- [ ] RAG 端到端可用
- [ ] 可观测性数据可收集
- [ ] 测试覆盖率 ≥ 60%

---

## 📝 开发日志

### 2026-04-01
- 创建了开发计划
- 完成了中优先级功能实现（7项功能）
- 完成 Week 1 高优先级功能：
  - PostgreSQL 存储层（pgx连接池、迁移）
  - Redis 客户端（go-redis、缓存）
  - NATS JetStream（流、发布订阅）
  - 百度文心一言 LLM Provider
  - 智谱清言 LLM Provider
  - OpenAI 兼容层（vLLM/Ollama）

### 2026-04-02
- 完成 Week 2 Day 1 - Agent CLI：
  - `agent create` - 创建 Agent
  - `agent list` - 列出所有 Agent
  - `agent delete` - 删除 Agent
  - `agent run` - 运行 Agent
  - `agent logs` - 查看 Agent 日志
- 更新 Client 包添加 ExecuteAgent 和 GetAgentLogs 方法

---

## 📞 协作

- **GitHub Issues**: 用于 Bug 报告和任务跟踪
- **Pull Requests**: 代码审查和合并
- **每日同步**: 更新进度和阻塞问题

---

**最后更新**: 2026-04-01
