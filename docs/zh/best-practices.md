# 最佳实践

本文档汇总 ResolveAgent 的使用建议与优化技巧。

---

## Agent 设计

### 1. 选择合适的 Agent 类型

| Agent 类型 | 适用场景 | 示例 |
|------------|----------|------|
| **Mega** | 通用智能助手，需要多能力路由 | 客服助手、运维助手 |
| **Skill** | 单一功能，快速响应 | 代码生成、数据查询 |
| **FTA** | 复杂决策流程 | 故障诊断、审批流程 |
| **RAG** | 知识问答，文档检索 | FAQ 机器人、文档助手 |

### 2. 系统提示词设计

```yaml
system_prompt: |
  # 角色定义
  你是一个专业的技术支持助手，服务于 ResolveAgent 用户。
  
  # 能力说明
  你可以：
  - 回答产品使用问题
  - 搜索相关文档
  - 执行诊断工作流
  
  # 行为准则
  - 使用简洁、专业的语言
  - 不确定时主动承认并建议查阅文档
  - 涉及敏感操作时请求确认
  
  # 输出格式
  - 代码使用 Markdown 代码块
  - 步骤使用有序列表
```

### 3. 技能组合原则

```yaml
# 好的实践：按功能领域组合
skill_names:
  - web-search      # 信息获取
  - doc-reader      # 文档解析
  - code-runner     # 代码执行

# 避免：技能功能重叠
skill_names:
  - google-search   # ❌ 功能重复
  - bing-search     # ❌ 功能重复
  - baidu-search    # ❌ 功能重复
```

---

## 智能选择器优化

### 1. 路由策略选择

| 场景 | 推荐策略 | 配置 |
|------|----------|------|
| 明确的请求类型 | `rule` | 预定义规则快速匹配 |
| 多变的用户输入 | `llm` | LLM 语义理解 |
| 生产环境 | `hybrid` | 平衡速度与准确性 |

### 2. 规则设计技巧

```yaml
rules:
  # ✅ 好的规则：具体、无歧义
  - pattern: "查看.*日志|检查.*错误|分析.*异常"
    route_type: skill
    target: log-analyzer
    confidence: 0.9
    
  # ✅ 使用否定模式避免误匹配
  - pattern: "搜索(?!日志|本地).*"
    route_type: skill
    target: web-search
    confidence: 0.85
    
  # ❌ 避免：过于宽泛
  - pattern: ".*"
    route_type: direct
    confidence: 0.5
```

### 3. 置信度阈值调优

```yaml
# 生产环境推荐
confidence_threshold: 0.75

# 调试时观察
# - 阈值过高 (>0.85)：LLM 回退频繁，延迟增加
# - 阈值过低 (<0.6)：规则误匹配增加，准确率下降
```

---

## FTA 工作流设计

### 1. 结构设计原则

```
✅ 好的设计：浅而宽
    TOP
     │
   ┌─┴─┐
   OR  OR
  ┌┴┐ ┌┴┐
  A B C D

❌ 避免：深而窄
    TOP
     │
    AND
     │
    AND
     │
    AND
     │
     A
```

### 2. 评估器选择

| 评估类型 | 推荐评估器 | 原因 |
|----------|------------|------|
| 数据检查 | `skill:` | 快速、确定性高 |
| 知识查询 | `rag:` | 可解释、可追溯 |
| 复杂判断 | `llm:` | 语义理解能力 |

### 3. 超时与重试

```yaml
events:
  - id: external-check
    evaluator: "skill:external-api"
    timeout_seconds: 60
    retry:
      max_attempts: 3
      backoff_seconds: 2
```

---

## RAG 优化

### 1. 分块策略选择

| 文档类型 | 推荐策略 | 参数 |
|----------|----------|------|
| 技术文档 | `semantic` | chunk_size: 1024 |
| FAQ | `sentence` | chunk_size: 256 |
| 日志/代码 | `fixed` | chunk_size: 512 |

### 2. 检索优化

```python
# 使用元数据过滤缩小范围
results = await pipeline.query(
    collection_id="docs",
    query="配置说明",
    filter={"category": "configuration"},
    top_k=10
)

# 复杂查询使用重排序
results = await pipeline.query(
    collection_id="docs",
    query="如何解决连接超时问题",
    top_k=20,        # 初始多取
    rerank=True,
    final_top_k=5    # 精选返回
)
```

### 3. 定期维护

```bash
# 定期重建索引（大量更新后）
resolveagent rag collection rebuild product-docs

# 清理过期文档
resolveagent rag collection cleanup product-docs --older-than 90d
```

---

## 技能开发

### 1. 设计原则

- **单一职责**：每个技能只做一件事
- **幂等性**：重复调用产生相同结果
- **最小权限**：只请求必要的权限
- **超时保护**：所有外部调用设置超时

### 2. 错误处理

```python
def run(params: dict) -> dict:
    try:
        result = do_work(params)
        return {"success": True, "data": result}
    except ValidationError as e:
        return {"success": False, "error": f"参数错误: {e}"}
    except TimeoutError as e:
        return {"success": False, "error": "请求超时"}
    except Exception as e:
        # 记录日志，返回通用错误
        logger.exception("技能执行失败")
        return {"success": False, "error": "内部错误"}
```

### 3. 测试覆盖

```python
# tests/test_skill.py
def test_normal_case():
    """正常情况"""
    result = run({"query": "test"})
    assert result["success"] is True

def test_empty_input():
    """空输入"""
    result = run({"query": ""})
    assert "error" in result

def test_timeout():
    """超时处理"""
    with mock.patch("requests.get", side_effect=Timeout):
        result = run({"query": "slow"})
        assert result["success"] is False

def test_invalid_params():
    """无效参数"""
    result = run({})  # 缺少必需参数
    assert result["success"] is False
```

---

## 性能优化

### 1. 缓存策略

```yaml
# 选择器缓存
selector:
  cache:
    enabled: true
    ttl: 300s        # 相同输入的路由决策缓存
    max_size: 1000

# RAG 查询缓存
rag:
  query_cache:
    enabled: true
    ttl: 600s
```

### 2. 并发控制

```yaml
# Agent 池配置
agent_pool:
  max_size: 100       # 最大实例数
  eviction_policy: lru

# 技能并发
skill_executor:
  max_concurrent: 20  # 最大并发执行
```

### 3. 资源限制

```yaml
# 技能资源限制
skill_executor:
  resources:
    default_memory_mb: 256
    default_timeout_seconds: 60
    max_memory_mb: 1024
    max_timeout_seconds: 300
```

---

## 安全建议

### 1. API 密钥管理

```bash
# ✅ 使用环境变量
export QWEN_API_KEY="sk-xxx"

# ✅ 使用密钥管理服务
# Kubernetes Secret / Vault / AWS Secrets Manager

# ❌ 避免：硬编码在配置文件
api_key: "sk-xxx-hardcoded"  # 危险！
```

### 2. 技能权限审查

```yaml
# 安装前检查权限
permissions:
  network_access: true
  allowed_hosts:
    - "api.example.com"  # ✅ 明确的主机
  file_system_write: false  # ✅ 禁用不需要的权限
```

### 3. 输入验证

```python
# 技能入口验证
def run(query: str, limit: int = 10) -> dict:
    # 参数验证
    if not query or len(query) > 1000:
        raise ValueError("Invalid query")
    if limit < 1 or limit > 100:
        limit = 10
    
    # 输入清理
    query = sanitize_input(query)
    
    return do_search(query, limit)
```

---

## 监控告警

### 1. 关键指标

| 指标 | 告警阈值 | 说明 |
|------|----------|------|
| 请求延迟 P99 | > 5s | 性能问题 |
| 错误率 | > 1% | 系统异常 |
| Agent 池使用率 | > 80% | 需要扩容 |
| 选择器 LLM 回退率 | > 30% | 规则覆盖不足 |

### 2. 告警配置示例

```yaml
# Prometheus AlertManager 规则
groups:
  - name: resolveagent
    rules:
      - alert: HighErrorRate
        expr: rate(resolveagent_errors_total[5m]) > 0.01
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "错误率过高"
          
      - alert: SlowResponse
        expr: histogram_quantile(0.99, resolveagent_request_duration_seconds) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "响应延迟过高"
```

---

## 故障排查清单

### Agent 执行失败

1. 检查 Agent 配置是否正确
2. 检查关联的模型、技能、工作流是否可用
3. 查看执行日志定位具体错误
4. 验证 API 密钥是否有效

### 选择器路由异常

1. 检查路由策略配置
2. 验证规则模式是否正确
3. 调整置信度阈值
4. 检查 LLM 可用性

### RAG 检索质量差

1. 检查文档分块策略
2. 验证嵌入模型是否适合
3. 调整检索参数 (top_k, threshold)
4. 考虑启用重排序

### 技能执行超时

1. 检查网络连接
2. 增加超时时间
3. 优化技能实现
4. 检查资源限制

---

## Loop Engineering 循环工程

### 1. 反馈循环配置

**生产环境建议**:

```yaml
# resolveagent.yaml - 推荐配置
feedback:
  enabled: true
  ring_buffer_size: 2000        # 生产环境建议更大的缓冲区
  aggregation_window: "5m"      # 5 分钟滑动窗口
  dispatch:
    log:
      enabled: true
      level: "info"
    webhook:
      enabled: true             # 启用 Webhook 对接外部监控系统
      url: "https://monitor.example.com/webhook/feedback"
```

**调优建议**:
- `ring_buffer_size`: 开发 500, 生产 2000-5000
- `aggregation_window`: 高频场景 1-3m, 常规 5m
- Webhook 分发器建议配置重试和超时

### 2. 熔断器最佳实践

| 参数 | 开发环境 | 生产环境 | 说明 |
|------|----------|----------|------|
| `failure_threshold` | 3 | 5-10 | 快速失败 vs 容忍瞬态故障 |
| `recovery_timeout` | 10s | 30-60s | 快速恢复 vs 避免惊群 |
| `half_open_max_calls` | 1 | 3-5 | 保守探测 vs 快速验证 |

**关键原则**:
- 每个下游服务使用独立的熔断器实例
- 配置 `StateObserver` 接入反馈子系统
- 监控 `circuit_breaker_state` 指标，OPEN 状态持续 > 5m 应告警

### 3. 自适应选择器调优

```yaml
adaptive:
  selector_weight_update: true
  skill_confidence_decay: 0.95    # 0.9 = 快速响应, 0.99 = 平滑过渡
  auto_fallback_enabled: true
```

- **新系统启动**: 使用默认权重 (decay=0.95)，让系统自然学习
- **高负载场景**: 降低 decay (0.85-0.90)，加快权重调整速度
- **稳定系统**: 提高 decay (0.97-0.99)，避免过度反应

### 4. Hook 链模式使用

所有自定义扩展都应遵循 `pre_hook → execute → post_hook → feedback` 模式：

```python
from resolveagent.hooks.patterns import HookChain, HookContext, HookResult

chain = HookChain(
    pre_hooks=[validate_input, enrich_context],
    post_hooks=[log_result, update_metrics],
    feedback_callback=send_to_collector,  # 闭合反馈循环
)

result = chain.run(execute_fn, HookContext(request_id="req-123"))
```

### 5. 监控告警配置

**核心监控指标**:

| 指标 | 告警阈值 | 动作 |
|------|----------|------|
| `workflow_success_rate` | < 0.7 | notify |
| `retry_exhausted_total` | > 50 / 1m | circuit_break |
| `circuit_breaker_state` | OPEN > 5m | notify |
| `feedback_loop_duration_seconds` P99 | > 100ms | notify |

---

## 相关文档

- [快速入门](./quickstart.md) - 开始使用
- [架构设计](./architecture.md) - 系统架构
- [Loop Engineering](./loop-engineering.md) - 循环工程完整文档
- [配置参考](./configuration.md) - 配置选项
- [部署指南](./deployment.md) - 部署方案
