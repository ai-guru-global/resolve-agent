# ResolveAgent 全量工作记录

> 日期: 2026-05-19
> 工作范围: 项目评估 → 安全修复 → 架构设计 → Resilient Selector 实施 → 文档沉淀

---

## 一、项目评估

对 ResolveAgent v0.3.0 进行了 7 维度全面评估。

### 项目概况

- **定位**: 面向问题解决的 AIOps 智能体平台
- **技术栈**: Go 1.22+ (Platform) + Python 3.11+ (Runtime) + React 18 (WebUI)
- **代码规模**: ~76,700+ LOC (Python 29,630 / Go 17,859 / Web 29,239)
- **Git 成熟度**: 23 commits, main branch

### 评分

| 维度 | 评分 | 主要问题 |
|------|------|---------|
| 架构 | 7.5/10 | HTTP Server 无连接池, AgentMessageBus 未集成 NATS |
| 代码质量 | 7.0/10 | CI badge 失效, mypy strict=false, memory.py 截断 |
| 测试覆盖 | 5.5/10 | WebUI 仅 6 测试, http_server 0 测试 |
| 安全性 | 5.0/10 | 硬编码密码, 错误泄露, 无 CORS/Rate Limiting |
| 性能 | 6.5/10 | 无 lazy loading, 无连接复用 |
| 开发体验 | 7.5/10 | 无 CI/CD, 无 .env.example, 无 CONTRIBUTING |
| **总评** | **6.5/10** | |

评估报告: `documentation/EVALUATION_REPORT.md`

---

## 二、安全修复 + 质量提升

### P0 安全加固 (5 项) — 全部完成

1. **docker-compose 移除硬编码密码** — `${VAR:?required}` 强制校验
2. **创建 .env.example** — 30+ 配置项, 8 分组
3. **Python 错误消息脱敏** — 17 处 `str(e)` → `"Internal server error"`
4. **Python 安全中间件** — CORS + Rate Limiting (60 RPM) + Security Headers
5. **Go 安全加固** — HTTP 超时 (30s/10s/60s/120s) + Auth 默认启用

### P1 质量提升 (4 项) — 全部完成

6. **CI/CD Pipeline** — `.github/workflows/ci.yaml`, 4 Job 并行
7. **Python 测试** — `test_http_server.py`, 16 个测试函数
8. **Go 测试** — `server_test.go` 扩展, +9 个 handler 测试
9. **代码清理** — toolhub.py 死代码移除

### P2 开发体验 (1 项) — 全部完成

10. **CONTRIBUTING.md** — 12 章节全流程指南

### 评分变化

| 维度 | 修复前 | 修复后 | 变化 |
|------|--------|--------|------|
| 安全性 | 5.0 | 7.5 | +2.5 |
| 测试覆盖 | 5.5 | 6.5 | +1.0 |
| 代码质量 | 7.0 | 7.5 | +0.5 |
| 开发体验 | 7.5 | 8.0 | +0.5 |
| **总评** | **6.5** | **7.5** | **+1.0** |

修复总结: `documentation/FIX_SUMMARY.md`

---

## 三、Resilient Selector 架构评估

### 用户提出的思路

```
用户输入 → 意图分析 → 上下文丰富 → 路由决策 → 执行
              ↑                          |
              └──── 失败反馈 (重丰富) ←──┘
                       ↓
              最终兜底: Code Analysis
                       ↓
              成功返回 / 真正失败退出
```

核心理念: **每一次失败都不是浪费，而是为下一次路由决策提供更丰富的上下文。**

### 评估结论: 强烈推荐实施

**优势分析:**

1. **大幅提升覆盖率** — RAG 查不到 → 自动尝试 Workflow 推理 → 再尝试 Code Analysis
2. **失败信息是极好的路由信号** — "RAG 无结果" → 下次决策自然避开 RAG
3. **与现有架构完美嵌套** — 不需要推翻任何现有模块
4. **AIOps 场景刚需** — 运维问题很少一次路由就能解决

**风险与对策:**

| 风险 | 对策 |
|------|------|
| 无限循环 | MAX_RETRIES=3, 总超时 30s |
| 延迟累积 | 增量重丰富, 不重跑完整管道 |
| 重复路由 | 记录 tried_routes, 决策时排除 |
| "失败"定义模糊 | 先用简单定义 (异常+空结果+超时) |
| 重丰富质量 | 根据失败类型生成路由偏好建议 |

**三层嵌套弹性架构:**

```
ResilientSelector (route-level)  — 跨子系统降级
  → FallbackCascade (tool-level) — 子系统内部工具降级
    → HybridPlanner (step-level) — 工作流步骤重规划
```

架构评估: `docs/zh/resilient-selector-evaluation.md`

---

## 四、Resilient Selector 实施

### 新增文件

| 文件 | 行数 | 说明 |
|------|------|------|
| `python/src/resolveagent/selector/resilient_selector.py` | 483 | 核心模块 |
| `python/tests/test_resilient_selector.py` | 512 | 33 个测试函数 |

### 核心类

**ResilientSelector** — 反馈驱动自适应路由器
- `route_and_execute()`: 主入口，执行路由重试循环
- `_execute_route()`: 执行单次路由，捕获结果
- `_force_alternative_route()`: 强制选择未尝试的路由
- 配置: `ResilientConfig` (max_retries=3, timeout=30s, route_priority)

**ReEnricher** — 增量上下文重丰富器
- `re_enrich()`: 增量添加失败信息到上下文
- 追踪 attempted_routes、last_failure、route_preferences
- 根据失败类型生成路由偏好 (RAG 失败→偏好推理, Skill 失败→偏好知识)
- 自动降低 enrichment_confidence

**数据模型**
- `RouteAttempt`: 单次路由尝试记录
- `RoutingSession`: 完整路由会话 (含多次尝试 + 最终结果)
- `ResilientConfig`: 行为配置

### 降级路径

```
Skill (快速精确, 0-1s)
  ↓ 失败
RAG (知识检索, 1-3s)
  ↓ 失败
FTA/Workflow (LLM 推理, 3-10s)
  ↓ 失败
Code Analysis (深度兜底, 5-15s)
  ↓ 失败
真正的失败退出
```

### 测试覆盖 (33 个测试)

| 类别 | 测试数 | 覆盖内容 |
|------|--------|---------|
| 数据模型 | 5 | RouteAttempt/RoutingSession 创建、序列化 |
| ReEnricher | 8 | 路由追踪、失败记录、置信度降级、偏好推断 |
| 主流程 | 8 | 首次成功、重试成功、重试耗尽、兜底、超时、排除 |
| 路由强制 | 6 | 优先级、跳过已试、偏好应用、全试返回原值 |
| 配置 | 2 | 默认值、自定义值 |
| 边界 | 4 | dict 结果、None 结果、统计信息 |

### 使用示例

```python
from resolveagent.selector import ResilientSelector, ResilientConfig

config = ResilientConfig(
    max_retries=3,
    total_timeout_seconds=30.0,
    route_priority=["skill", "rag", "fta", "code_analysis"],
)
selector = ResilientSelector(config=config)

session = await selector.route_and_execute(
    input_text="diagnose the 503 error in payment service",
    agent_id="ops-agent",
    executor=my_executor,
)

if session.success:
    print(f"Solved via {session.final_route} in {session.attempt_count} attempts")
else:
    print(f"Failed after {session.attempt_count} attempts")
```

实现总结: `documentation/RESILIENT_SELECTOR_IMPLEMENTATION.md`

---

## 五、文档沉淀

### 更新的文档

| 文档 | 变更内容 |
|------|---------|
| `README.md` | 新增第 9 大架构特性 "Resilient Selector"，含代码示例和降级路径 |
| `docs/papers/resolveagent-unified-aiops-platform-zh.md` | 摘要 + 贡献列表 + 架构图 + Section 5.5 + 结论全部更新 |
| `selector/__init__.py` | 导出 5 个新类 |

### 论文更新细节

1. **摘要**: 添加第 7 项机制 "反馈驱动自适应路由与渐进降级机制"
2. **贡献列表**: 第 1 项追加 Resilient Selector 描述
3. **架构图**: 新增 `subgraph RS[弹性自适应路由]` 含反馈环路
4. **Section 5.5**: 新增完整方法论，含形式化定义 (路由会话、增量重丰富公式、降级路径)
5. **结论**: 新增 Resilient Selector 段落

---

## 六、全量文件变更清单

### 新建文件 (11)

| 文件 | 类型 | 说明 |
|------|------|------|
| `.env.example` | 配置 | 环境变量模板 |
| `.github/workflows/ci.yaml` | CI/CD | 4 Job 并行 pipeline |
| `CONTRIBUTING.md` | 文档 | 贡献指南 |
| `deploy/docker-compose/.env.example` | 配置 | Docker 环境变量模板 |
| `documentation/EVALUATION_REPORT.md` | 报告 | 7 维度评估报告 |
| `documentation/FIX_SUMMARY.md` | 报告 | 安全修复总结 |
| `documentation/SESSION_PROGRESS.md` | 报告 | 进展记录 |
| `documentation/RESILIENT_SELECTOR_IMPLEMENTATION.md` | 报告 | Resilient Selector 实现总结 |
| `docs/zh/resilient-selector-evaluation.md` | 文档 | 架构评估 |
| `python/src/resolveagent/selector/resilient_selector.py` | 代码 | Resilient Selector 核心 (483 行) |
| `python/tests/test_resilient_selector.py` | 测试 | 33 个测试 (512 行) |
| `python/tests/test_http_server.py` | 测试 | 16 个 HTTP 测试 |

### 修改文件 (8)

| 文件 | 变更 |
|------|------|
| `deploy/docker-compose/docker-compose.yaml` | 硬编码密码 → 强制环境变量 |
| `pkg/server/server.go` | HTTP 超时配置 |
| `pkg/server/server_test.go` | +9 handler 测试 |
| `pkg/server/middleware/auth.go` | Auth 默认启用 + SkipPaths 扩展 |
| `python/src/resolveagent/runtime/http_server.py` | 错误脱敏 + CORS + Rate Limiting + Security Headers |
| `python/src/resolveagent/selector/__init__.py` | 导出 ResilientSelector 等 5 个类 |
| `python/src/resolveagent/toolhub.py` | 移除死代码 |
| `README.md` | 第 9 大架构特性 |
| `docs/papers/resolveagent-unified-aiops-platform-zh.md` | 论文 5 处更新 |

---

## 七、后续建议

### 短期 (1-2 周)

1. **RuntimeHTTPServer 集成 ResilientSelector** — 替代直接调用 IntelligentSelector
2. **CircuitBreaker 实际连接** — 当 RAG/Skill 服务不可用时快速跳过
3. **WebUI 路由级 Code Splitting** — React.lazy 优化首屏加载

### 中期 (1-2 月)

4. **WebUI 测试补全** — 为 AgentList, SkillList, WorkflowList 添加组件测试
5. **Go PostgreSQL SolutionRegistry** — 替代当前 in-memory 实现
6. **NATS 集成** — AgentMessageBus 与 Docker Compose 中的 NATS JetStream 对接
7. **Python http_server 连接复用** — RAGPipeline/SkillExecutor 改为单例或连接池

### 长期 (3-6 月)

8. **自适应重校准** — 根据历史成功率动态调整路由优先级
9. **跨组织泛化** — 在不同运维团队和领域中验证 Resilient Selector
10. **生产监控** — 添加 ResilientSelector 的 Prometheus 指标
