# Resilient Selector 实现总结

> 日期: 2026-05-19
> 模块: selector/resilient_selector.py
> 状态: 实现完成

---

## 概述

将 Intelligent Selector 从一次性路由升级为反馈驱动的自适应路由引擎。
每次路由失败后，系统自动回到上下文丰富器注入失败信息，重新路由决策，
直到问题解决或所有路由耗尽。

## 架构

```
用户输入 → 意图分析 → 上下文丰富 → 路由决策 → 执行
              ↑                          |
              └──── 失败反馈 (重丰富) ←──┘
                       ↓
              最终兜底: Code Analysis
                       ↓
              成功返回 / 真正失败退出
```

降级路径: Skill → RAG → FTA/Workflow → Code Analysis

三层嵌套弹性:
  - ResilientSelector (route-level): 跨子系统降级
  - FallbackCascade (tool-level): 子系统内部工具降级
  - HybridPlanner.replan (step-level): 工作流步骤重规划

## 新增文件

| 文件 | 行数 | 说明 |
|------|------|------|
| `python/src/resolveagent/selector/resilient_selector.py` | 483 | 核心模块 |
| `python/tests/test_resilient_selector.py` | 512 | 33 个测试函数 |

## 核心类

### ResilientSelector
- `route_and_execute()`: 主入口，执行路由重试循环
- `_execute_route()`: 执行单次路由，捕获结果
- `_force_alternative_route()`: 强制选择未尝试的路由
- 配置: `ResilientConfig` (max_retries=3, timeout=30s, route_priority)

### ReEnricher
- `re_enrich()`: 增量上下文重丰富
- 添加 attempted_routes、last_failure、route_preferences
- 根据失败类型生成路由偏好建议
- 自动降低 enrichment_confidence

### 数据模型
- `RouteAttempt`: 单次路由尝试记录
- `RoutingSession`: 完整路由会话 (含多次尝试)
- `ResilientConfig`: 行为配置

## 测试覆盖 (33 个测试)

| 类别 | 测试数 | 覆盖内容 |
|------|--------|---------|
| 数据模型 | 5 | RouteAttempt/RoutingSession 创建、序列化 |
| ReEnricher | 8 | 路由追踪、失败记录、置信度降级、偏好推断 |
| 主流程 | 8 | 首次成功、重试成功、重试耗尽、兜底、超时、排除 |
| 路由强制 | 6 | 优先级、跳过已试、偏好应用、全试返回原值 |
| 配置 | 2 | 默认值、自定义值 |
| 边界 | 4 | dict 结果、None 结果、统计信息 |

## 集成点

### 已完成
- [x] selector/__init__.py 导出 5 个新类
- [x] README.md 添加为第 9 大架构特性
- [x] 论文添加 Section 5.5 + 摘要 + 贡献 + 结论

### 待集成 (后续迭代)
- [ ] RuntimeHTTPServer 使用 ResilientSelector 替代直接调用
- [ ] 与 CircuitBreaker 的实际连接 (当前为独立模块)
- [ ] 生产环境调优 (retry 次数、超时、降级顺序)

## 使用示例

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
    print(session.to_dict())
```
