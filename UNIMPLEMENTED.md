# 未实现功能清单

**生成日期**: 2026-04-01  
**版本**: v0.1.0-alpha

---

## 📊 概览

| 类别 | 数量 | 优先级 |
|------|------|--------|
| Go 存储层 | 3 | 🔴 高 |
| LLM Provider | 3 | 🔴 高 |
| CLI 命令 | 18 | 🟡 中 |
| FTA 引擎 | 4 | 🟡 中 |
| 可观测性 | 4 | 🟢 低 |
| RAG 增强 | 3 | 🟢 低 |
| 技能系统 | 2 | 🟢 低 |
| **总计** | **37** | - |

---

## 🔴 高优先级（影响核心功能）

### 1. Go 存储层实现

#### 1.1 PostgreSQL 连接池
**文件**: `pkg/store/postgres/postgres.go`  
**状态**: 仅框架，无实际连接  
**TODO**:
- [ ] 初始化 pgx 连接池
- [ ] 实现健康检查
- [ ] 实现数据库迁移（golang-migrate 或 atlas）
- [ ] 实现基本 CRUD 操作

**依赖**: `github.com/jackc/pgx/v5/pgxpool`

#### 1.2 Redis 客户端
**文件**: `pkg/store/redis/redis.go`  
**状态**: 仅框架，无实际连接  
**TODO**:
- [ ] 初始化 go-redis 客户端
- [ ] 实现健康检查（PING）
- [ ] 实现缓存操作（Get/Set/Delete）

**依赖**: `github.com/redis/go-redis/v9`

#### 1.3 NATS JetStream
**文件**: `pkg/event/nats.go`  
**状态**: 仅框架，无实际连接  
**TODO**:
- [ ] 连接 NATS 服务器
- [ ] 初始化 JetStream
- [ ] 实现 Publish
- [ ] 实现 Subscribe
- [ ] 支持持久化和 ACK

**依赖**: `github.com/nats-io/nats.go`

### 2. LLM Provider 实现

#### 2.1 百度文心一言 (Wenxin)
**文件**: `python/src/resolveagent/llm/wenxin.py`  
**状态**: 返回 placeholder  
**TODO**:
- [ ] 实现 `chat()` 调用百度千帆 API
- [ ] 实现 `chat_stream()` 流式响应
- [ ] API 认证（API Key + Secret Key）

**参考**: https://cloud.baidu.com/doc/WENXINWORKSHOP/index.html

#### 2.2 智谱清言 (Zhipu)
**文件**: `python/src/resolveagent/llm/zhipu.py`  
**状态**: 返回 placeholder  
**TODO**:
- [ ] 实现 `chat()` 调用智谱 API
- [ ] 实现 `chat_stream()` 流式响应
- [ ] 支持 GLM-4、GLM-4-Flash、GLM-3-Turbo

**参考**: https://open.bigmodel.cn/dev/api

#### 2.3 OpenAI 兼容层
**文件**: `python/src/resolveagent/llm/openai_compat.py`  
**状态**: 返回 placeholder  
**TODO**:
- [ ] 实现 `chat()` 调用 OpenAI 兼容 API
- [ ] 实现 `chat_stream()` 流式响应
- [ ] 支持自定义 base_url

**用途**: 支持 vLLM、Ollama、LM Studio 等本地部署

---

## 🟡 中优先级（影响功能完整性）

### 3. CLI 命令实现（18个）

所有 CLI 命令目前都是 stub，需要实现：

| 命令 | 文件 | 功能 |
|------|------|------|
| `agent list` | `internal/cli/agent/list.go` | 列出所有 Agent |
| `agent create` | `internal/cli/agent/create.go` | 创建 Agent |
| `agent delete` | `internal/cli/agent/delete.go` | 删除 Agent |
| `agent run` | `internal/cli/agent/run.go` | 运行 Agent（交互式） |
| `agent logs` | `internal/cli/agent/logs.go` | 查看 Agent 日志 |
| `skill list` | `internal/cli/skill/list.go` | 列出所有技能 |
| `skill info` | `internal/cli/skill/info.go` | 查看技能详情 |
| `skill install` | `internal/cli/skill/install.go` | 安装技能 |
| `skill remove` | `internal/cli/skill/remove.go` | 卸载技能 |
| `skill test` | `internal/cli/skill/test.go` | 测试技能 |
| `workflow list` | `internal/cli/workflow/list.go` | 列出所有工作流 |
| `workflow create` | `internal/cli/workflow/create.go` | 创建工作流 |
| `workflow validate` | `internal/cli/workflow/validate.go` | 验证工作流 |
| `workflow visualize` | `internal/cli/workflow/visualize.go` | 可视化工作流 |
| `workflow run` | `internal/cli/workflow/run.go` | 执行工作流 |
| `rag collection` | `internal/cli/rag/collection.go` | 管理 RAG 集合 |
| `rag ingest` | `internal/cli/rag/ingest.go` | 摄取文档 |
| `rag query` | `internal/cli/rag/query.go` | 查询集合 |

### 4. FTA 引擎完善

#### 4.1 割集计算
**文件**: `python/src/resolveagent/fta/cut_sets.py`  
**状态**: 返回空列表  
**TODO**:
- [ ] 实现 MOCUS 算法
- [ ] 或实现 BDD-based 计算

#### 4.2 节点求值器
**文件**: `python/src/resolveagent/fta/evaluator.py`  
**状态**: 部分 TODO  
**TODO**:
- [ ] 通过 SkillExecutor 调用技能
- [ ] 查询 RAG 集合
- [ ] 调用 LLM 进行分类

#### 4.3 树排序
**文件**: `python/src/resolveagent/fta/tree.py`  
**状态**: 简单实现  
**TODO**:
- [ ] 实现拓扑排序确保正确顺序

#### 4.4 Server 工作流执行
**文件**: `pkg/server/router.go`  
**状态**: 返回 placeholder  
**TODO**:
- [ ] 将工作流转发给 Python 运行时执行
- [ ] 实现工作流验证逻辑

---

## 🟢 低优先级（增强功能）

### 5. 可观测性（4项）

#### 5.1 OpenTelemetry Tracing
**文件**: 
- `pkg/telemetry/tracer.go`
- `python/src/resolveagent/telemetry/tracing.py`
- `pkg/server/middleware/tracing.go`

**TODO**:
- [ ] 初始化 OTLP exporter
- [ ] 配置 tracer provider
- [ ] 实现 HTTP 请求 tracing
- [ ] 传递 trace context

#### 5.2 OpenTelemetry Metrics
**文件**: `pkg/telemetry/metrics.go`  
**TODO**:
- [ ] 初始化 metrics exporter
- [ ] 定义关键指标
- [ ] Prometheus 导出

### 6. RAG 增强（3项）

#### 6.1 向量存储索引
**文件**: `python/src/resolveagent/rag/pipeline.py`  
**状态**: 注释说明是 placeholder  
**TODO**:
- [ ] 实现实际的 Milvus 索引
- [ ] 集成到 pipeline

#### 6.2 重排序器
**文件**: `python/src/resolveagent/rag/retrieve/reranker.py`  
**状态**: 返回未排序结果  
**TODO**:
- [ ] 集成 BGE-Reranker 模型
- [ ] 实现交叉编码器重排序

#### 6.3 RAG Server Handler
**文件**: `pkg/server/router.go`  
**状态**: 返回 NotImplemented  
**TODO**:
- [ ] 实现集合 CRUD
- [ ] 实现文档摄取
- [ ] 实现查询接口

### 7. 技能系统完善（2项）

#### 7.1 技能执行器集成
**文件**: `python/src/resolveagent/skills/executor.py`  
**TODO**:
- [ ] 输入验证（JSON Schema）
- [ ] 设置沙箱环境
- [ ] 在子进程中执行实现隔离

#### 7.2 文件操作技能
**文件**: `python/src/resolveagent/skills/builtin/file_ops.py`  
**TODO**:
- [ ] 实现文件读写
- [ ] 权限检查
- [ ] 路径安全验证

### 8. WebUI 完善（2项）

#### 8.1 Agent 创建页面
**文件**: `web/src/pages/Agents/AgentCreate.tsx`  
**TODO**:
- [ ] 调用 API 创建 Agent

#### 8.2 Playground 页面
**文件**: `web/src/pages/Playground/index.tsx`  
**TODO**:
- [ ] 调用 Agent 执行 API

### 9. 其他优化（多处 TODO）

#### 9.1 上下文增强器
**文件**: `python/src/resolveagent/selector/context_enricher.py`  
**TODO**:
- [ ] 查询实际技能注册表
- [ ] 查询实际工作流注册表
- [ ] 查询实际 RAG 注册表
- [ ] 查询实际内存管理器
- [ ] 实现偏好推断

#### 9.2 Agent 基础类
**文件**: `python/src/resolveagent/agent/base.py`  
**TODO**:
- [ ] 集成 AgentScope 的 reply 机制
- [ ] 通过 provider 抽象调用 LLM

#### 9.3 Mega Agent 优化
**文件**: `python/src/resolveagent/agent/mega.py`  
**TODO**:
- [ ] 从注册表加载工作流定义
- [ ] 实现实际代码分析（静态分析工具）

#### 9.4 运行时引擎
**文件**: `python/src/resolveagent/runtime/engine.py`  
**TODO**:
- [ ] 从池/注册表加载 Agent
- [ ] 运行智能选择器确定路由
- [ ] 基于路由决策执行 FTA/技能/RAG
- [ ] 流式返回结果

#### 9.5 运行时服务器
**文件**: `python/src/resolveagent/runtime/server.py`  
**TODO**:
- [ ] 使用生成的 service stubs 初始化 gRPC 服务器

#### 9.6 选择器策略
**文件**: `python/src/resolveagent/selector/strategies/llm_strategy.py`  
**TODO**:
- [ ] 集成实际 LLM provider

#### 9.7 内存使用追踪
**文件**: `python/src/resolveagent/skills/sandbox.py`  
**TODO**:
- [ ] 追踪实际内存使用

---

## 📋 依赖安装

```bash
# Go 依赖
go get github.com/jackc/pgx/v5/pgxpool
go get github.com/redis/go-redis/v9
go get github.com/nats-io/nats.go

# Python 依赖（已安装）
pip install qdrant-client beautifulsoup4 pdfplumber pymilvus

# 可选依赖
pip install duckduckgo-search python-docx
```

---

## 🎯 建议实现顺序

### 第 1 周（高优先级）
1. PostgreSQL 存储层
2. Redis 缓存层
3. NATS 消息队列
4. Wenxin/Zhipu LLM Provider

### 第 2-3 周（中优先级）
5. CLI 命令实现（每天 3-4 个）
6. FTA 割集计算
7. FTA 求值器完善

### 第 4 周（低优先级）
8. 可观测性（Tracing/Metrics）
9. RAG 增强（重排序器、索引）
10. WebUI API 集成

---

## ✅ 验收标准

### 高优先级
- [ ] PostgreSQL 可存储和查询 Agent/Skill/Workflow
- [ ] Redis 可缓存和读取数据
- [ ] NATS 可发布和订阅事件
- [ ] Wenxin/Zhipu 可正常调用 API

### 中优先级
- [ ] CLI 可完成所有 CRUD 操作
- [ ] FTA 割集计算正确
- [ ] 工作流可执行并通过 FTA 求值

### 低优先级
- [ ] 可观测性数据可收集和查看
- [ ] RAG 重排序提升准确率
- [ ] WebUI 可创建和运行 Agent

---

## 📞 反馈

如有问题或建议，请通过以下渠道反馈：

- [GitHub Issues](https://github.com/ai-guru-global/resolve-agent/issues)
- [GitHub Discussions](https://github.com/ai-guru-global/resolve-agent/discussions)

---

**最后更新**: 2026-04-01
