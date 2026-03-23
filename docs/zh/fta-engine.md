# FTA 工作流引擎

故障树分析（Fault Tree Analysis, FTA）工作流引擎是 ResolveAgent 的核心组件之一，支持构建和执行复杂的多步骤决策流程。

---

## 概述

### 什么是 FTA？

故障树分析是一种**自顶向下的演绎分析方法**，通过逻辑门将顶级事件分解为基本事件，形成树状结构。在 ResolveAgent 中，我们扩展了传统 FTA 的概念，使其能够：

- 使用**技能（Skills）**作为叶节点评估器
- 使用**RAG 管道**进行知识检索
- 使用**LLM**进行智能判断
- 支持**异步流式执行**

### 应用场景

| 场景 | 描述 | 示例 |
|------|------|------|
| **故障诊断** | 生产环境问题根因分析 | API 响应延迟诊断 |
| **决策支持** | 多条件复杂决策 | 订单风控审核 |
| **流程自动化** | 条件驱动的自动化流程 | 发布前检查清单 |
| **知识推理** | 基于规则的推理系统 | 技术问答路由 |

---

## 核心概念

### 故障树结构

```
                    ┌─────────────────────┐
                    │     顶级事件        │  Top Event
                    │  (Root Cause Found) │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │       OR 门         │  Gate
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
    ┌───────────┐       ┌───────────┐       ┌───────────┐
    │ 日志分析  │       │ 指标异常  │       │ 知识检索  │  Basic Events
    │ (Skill)   │       │ (Skill)   │       │  (RAG)    │
    └───────────┘       └───────────┘       └───────────┘
```

### 事件类型

| 类型 | 说明 | 符号 |
|------|------|------|
| **Top** | 顶级事件，分析的最终目标 | 🔴 |
| **Intermediate** | 中间事件，由门逻辑组合 | 🟡 |
| **Basic** | 基本事件，叶节点，需要评估 | 🟢 |
| **Undeveloped** | 未展开事件，待后续分析 | 💎 |
| **Conditioning** | 条件事件，用于 INHIBIT 门 | ⚪ |

### 门类型

| 门类型 | 逻辑 | 说明 |
|--------|------|------|
| **AND** | 全部为真 | 所有输入都必须为真 |
| **OR** | 任一为真 | 任一输入为真即可 |
| **VOTING** | K-of-N | N 个输入中至少 K 个为真 |
| **INHIBIT** | 条件与 | AND 门带条件约束 |
| **PRIORITY-AND** | 顺序与 | AND 门，输入有顺序依赖 |

---

## 工作流定义

### YAML 格式

```yaml
# workflow.yaml
tree:
  id: incident-diagnosis
  name: "生产故障诊断工作流"
  description: "自动化诊断生产环境故障的根本原因"
  top_event_id: root-cause-found
  
  events:
    # 顶级事件
    - id: root-cause-found
      name: "根本原因已定位"
      type: top
      
    # 中间事件
    - id: evidence-collected
      name: "已收集充分证据"
      type: intermediate
      
    # 基本事件 - 使用技能评估
    - id: check-error-logs
      name: "检查错误日志"
      type: basic
      evaluator: "skill:log-analyzer"
      parameters:
        log_source: "/var/log/app"
        severity: "error"
        time_range: "1h"
        
    - id: check-metrics
      name: "检查系统指标"
      type: basic
      evaluator: "skill:metrics-checker"
      parameters:
        metrics:
          - cpu_usage
          - memory_usage
          - disk_io
        threshold: 90
        
    # 基本事件 - 使用 RAG 评估
    - id: consult-runbook
      name: "查阅运维手册"
      type: basic
      evaluator: "rag:runbook-collection"
      parameters:
        query: "故障排查步骤"
        top_k: 3
        
    # 基本事件 - 使用 LLM 评估
    - id: ai-analysis
      name: "AI 综合分析"
      type: basic
      evaluator: "llm:qwen-plus"
      parameters:
        prompt: "根据以下信息分析可能的故障原因..."
        
  gates:
    # OR 门：任一证据即可
    - id: gate-evidence
      name: "证据收集门"
      type: or
      inputs:
        - check-error-logs
        - check-metrics
        - consult-runbook
      output: evidence-collected
      
    # AND 门：需要证据和 AI 分析
    - id: gate-final
      name: "最终诊断门"
      type: and
      inputs:
        - evidence-collected
        - ai-analysis
      output: root-cause-found
```

### 评估器类型

#### 1. 技能评估器 (skill:)

```yaml
evaluator: "skill:log-analyzer"
parameters:
  log_source: "/var/log/app"
  severity: "error"
```

执行指定技能，返回布尔结果（成功/失败）。

#### 2. RAG 评估器 (rag:)

```yaml
evaluator: "rag:knowledge-base"
parameters:
  query: "如何处理数据库连接超时"
  top_k: 5
  score_threshold: 0.7
```

从知识库检索相关信息，根据检索质量返回结果。

#### 3. LLM 评估器 (llm:)

```yaml
evaluator: "llm:qwen-plus"
parameters:
  prompt: |
    根据以下上下文，判断是否存在问题：
    {context}
    
    回答 "是" 或 "否"
```

调用 LLM 进行判断，解析响应为布尔值。

---

## 执行流程

### 执行过程

```
┌────────────────────────────────────────────────────────────────────┐
│                      FTA 执行流程                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  1. 解析树结构                                                     │
│     │                                                              │
│     ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 2. 识别所有基本（叶）事件                                   │  │
│  │    [check-error-logs, check-metrics, consult-runbook, ...]  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│     │                                                              │
│     ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 3. 并行评估叶节点                                           │  │
│  │    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │    │ skill:log-   │  │ skill:metrics│  │ rag:runbook  │    │  │
│  │    │   analyzer   │  │   -checker   │  │              │    │  │
│  │    │   = true     │  │   = false    │  │   = true     │    │  │
│  │    └──────────────┘  └──────────────┘  └──────────────┘    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│     │                                                              │
│     ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 4. 自底向上传播门逻辑                                       │  │
│  │                                                              │  │
│  │    OR 门 (evidence-collected):                              │  │
│  │    inputs: [true, false, true] → any() → true               │  │
│  │                                                              │  │
│  │    AND 门 (root-cause-found):                               │  │
│  │    inputs: [true, true] → all() → true                      │  │
│  └─────────────────────────────────────────────────────────────┘  │
│     │                                                              │
│     ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 5. 返回顶级事件结果                                         │  │
│  │    root-cause-found = true                                  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 事件流

FTA 引擎执行时会发出流式事件：

```python
async for event in fta_engine.execute(tree, context):
    print(event)
```

事件类型：

```python
# 工作流开始
{"type": "workflow.started", "message": "Starting FTA workflow: incident-diagnosis"}

# 节点评估中
{"type": "node.evaluating", "node_id": "check-error-logs", "message": "Evaluating: 检查错误日志"}

# 节点评估完成
{"type": "node.completed", "node_id": "check-error-logs", "data": {"result": true}}

# 门评估中
{"type": "gate.evaluating", "node_id": "gate-evidence", "message": "Evaluating gate: OR"}

# 门评估完成
{"type": "gate.completed", "node_id": "gate-evidence", "data": {"result": true}}

# 工作流完成
{"type": "workflow.completed", "message": "FTA workflow completed", "data": {"result": true}}
```

---

## 门逻辑详解

### AND 门

```yaml
- id: gate-and
  type: and
  inputs: [event-a, event-b, event-c]
  output: result
```

**逻辑表**：

| event-a | event-b | event-c | result |
|---------|---------|---------|--------|
| true | true | true | **true** |
| true | true | false | false |
| true | false | false | false |
| false | false | false | false |

**应用场景**：所有条件都必须满足

### OR 门

```yaml
- id: gate-or
  type: or
  inputs: [event-a, event-b, event-c]
  output: result
```

**逻辑表**：

| event-a | event-b | event-c | result |
|---------|---------|---------|--------|
| true | true | true | **true** |
| true | false | false | **true** |
| false | true | false | **true** |
| false | false | false | false |

**应用场景**：任一条件满足即可

### VOTING 门 (K-of-N)

```yaml
- id: gate-voting
  type: voting
  k_value: 2  # 至少 2 个为真
  inputs: [event-a, event-b, event-c]  # 共 3 个输入
  output: result
```

**逻辑表** (2-of-3)：

| event-a | event-b | event-c | true_count | result |
|---------|---------|---------|------------|--------|
| true | true | true | 3 | **true** |
| true | true | false | 2 | **true** |
| true | false | true | 2 | **true** |
| true | false | false | 1 | false |
| false | false | false | 0 | false |

**应用场景**：投票表决、多数认可

### INHIBIT 门

```yaml
- id: gate-inhibit
  type: inhibit
  inputs: 
    - main-event       # 主要事件
    - condition-event  # 条件事件（抑制条件）
  output: result
```

**逻辑**：主要事件为真 AND 条件事件为假 → 结果为真

**应用场景**：带条件约束的判断，如"网络正常但服务不可用"

### PRIORITY-AND 门

```yaml
- id: gate-priority-and
  type: priority_and
  inputs: [event-1, event-2, event-3]  # 按顺序依赖
  output: result
```

**逻辑**：AND 门，但输入有顺序依赖，按序评估

**应用场景**：有先后关系的检查流程

---

## 使用指南

### 创建工作流

#### CLI 方式

```bash
# 从 YAML 文件创建
resolveagent workflow create -f workflow.yaml

# 交互式创建
resolveagent workflow create --interactive
```

#### API 方式

```python
from resolveagent import WorkflowClient

client = WorkflowClient()

# 创建工作流
workflow = client.create_workflow({
    "tree": {
        "id": "my-workflow",
        "name": "我的工作流",
        "top_event_id": "top",
        "events": [...],
        "gates": [...]
    }
})
```

### 执行工作流

#### CLI 方式

```bash
# 执行工作流
resolveagent workflow run incident-diagnosis

# 带参数执行
resolveagent workflow run incident-diagnosis \
  --param "log_source=/var/log/myapp" \
  --param "time_range=2h"

# 查看执行详情
resolveagent workflow executions incident-diagnosis
```

#### API 方式

```python
from resolveagent import WorkflowClient

client = WorkflowClient()

# 执行工作流
async for event in client.execute_workflow(
    workflow_id="incident-diagnosis",
    context={"log_source": "/var/log/myapp"}
):
    if event["type"] == "node.completed":
        print(f"节点 {event['node_id']} 完成: {event['data']['result']}")
    elif event["type"] == "workflow.completed":
        print(f"工作流结果: {event['data']['result']}")
```

### 验证工作流

```bash
# 验证工作流定义
resolveagent workflow validate -f workflow.yaml
```

验证内容：
- 树结构完整性
- 事件/门引用有效性
- 评估器配置正确性
- 循环依赖检测

---

## 可视化编辑器

ResolveAgent WebUI 提供可视化的 FTA 工作流编辑器（基于 React Flow）。

### 功能特性

- **拖拽式编辑**：直观的节点拖放操作
- **实时验证**：编辑时即时验证
- **执行可视化**：执行过程中节点状态实时更新
- **导入导出**：YAML 格式导入导出

### 访问方式

```bash
# 启动 WebUI
make compose-up

# 访问
http://localhost:3000/workflows
```

---

## 高级特性

### 1. 动态参数注入

在执行时动态注入参数：

```python
# 定义时使用占位符
evaluator: "skill:log-analyzer"
parameters:
  log_source: "${log_path}"
  time_range: "${time_range}"

# 执行时注入
client.execute_workflow(
    workflow_id="incident-diagnosis",
    context={
        "log_path": "/var/log/production/api",
        "time_range": "30m"
    }
)
```

### 2. 条件跳过

根据条件跳过特定节点：

```yaml
- id: check-database
  name: "检查数据库"
  type: basic
  evaluator: "skill:db-checker"
  skip_condition: "context.skip_db_check == true"
```

### 3. 超时控制

```yaml
- id: slow-check
  name: "慢速检查"
  type: basic
  evaluator: "skill:heavy-analysis"
  timeout_seconds: 300  # 5分钟超时
```

### 4. 重试策略

```yaml
- id: flaky-check
  name: "不稳定检查"
  type: basic
  evaluator: "skill:external-api-check"
  retry:
    max_attempts: 3
    backoff_seconds: 5
```

---

## 监控与调试

### 执行日志

```bash
# 查看工作流执行历史
resolveagent workflow executions my-workflow

# 查看特定执行详情
resolveagent workflow execution <execution-id>
```

### 指标

```prometheus
# 工作流执行总数
resolveagent_workflow_executions_total{workflow_id="incident-diagnosis"} 100

# 执行耗时
resolveagent_workflow_execution_duration_seconds{workflow_id="incident-diagnosis"} 

# 节点评估耗时
resolveagent_workflow_node_evaluation_seconds{node_id="check-error-logs"}

# 门评估结果
resolveagent_workflow_gate_results_total{gate_id="gate-evidence", result="true"} 85
```

---

## 最佳实践

### 1. 工作流设计原则

- **单一职责**：每个基本事件只做一件事
- **合理分层**：使用中间事件组织复杂逻辑
- **超时保护**：为所有外部调用设置超时
- **幂等设计**：确保重复执行不会产生副作用

### 2. 评估器选择

| 评估类型 | 推荐评估器 | 说明 |
|----------|------------|------|
| 数据检查 | skill | 快速、可靠 |
| 知识查询 | rag | 基于文档 |
| 复杂判断 | llm | 需要推理 |
| API 调用 | skill | 封装外部调用 |

### 3. 性能优化

```yaml
# 使用 OR 门减少不必要评估
# OR 门会在第一个 true 后短路
- id: quick-check-gate
  type: or
  inputs:
    - fast-check     # 先评估快速检查
    - medium-check
    - slow-check     # 慢速检查最后
```

---

## API 参考

### gRPC API

```protobuf
service WorkflowService {
  rpc CreateWorkflow(CreateWorkflowRequest) returns (Workflow);
  rpc GetWorkflow(GetWorkflowRequest) returns (Workflow);
  rpc ListWorkflows(ListWorkflowsRequest) returns (ListWorkflowsResponse);
  rpc UpdateWorkflow(UpdateWorkflowRequest) returns (Workflow);
  rpc DeleteWorkflow(DeleteWorkflowRequest) returns (DeleteWorkflowResponse);
  rpc ValidateWorkflow(ValidateWorkflowRequest) returns (ValidateWorkflowResponse);
  rpc ExecuteWorkflow(ExecuteWorkflowRequest) returns (stream WorkflowEvent);
}
```

### Python SDK

```python
from resolveagent.fta import FTAEngine, FaultTree

# 创建引擎
engine = FTAEngine()

# 加载工作流
tree = FaultTree.from_yaml("workflow.yaml")

# 执行
async for event in engine.execute(tree, context={}):
    print(event)
```

---

## 相关文档

- [智能选择器](./intelligent-selector.md) - 了解路由到 FTA 的决策过程
- [技能系统](./skill-system.md) - 创建 FTA 叶节点使用的技能
- [RAG 管道](./rag-pipeline.md) - RAG 评估器详解
- [CLI 参考](./cli-reference.md) - 工作流管理命令
