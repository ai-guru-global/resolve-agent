# Phase 1 核心能力强化规格文档

> 基于竞品分析结论，Phase 1 聚焦 "FTA + 代码诊断" 双核心能力建设，同时通过生态集成扩大影响力。

---

## 1. 需求背景

竞品分析指出 ResolveAgent 必须：
1. **放弃"大而全"，聚焦"FTA + 代码诊断"双核心**
2. **拥抱生态，而非对抗** — 与 LangChain/LangGraph 集成，输出为 Dify 插件
3. **保持技术领先** — FTA 引擎性能和代码分析语言覆盖是护城河

---

## 2. 任务清单

### 2.1 FTA 引擎性能优化

**现状问题**：大规模故障树（1000+ 节点）的实时计算性能不足，复杂 FTA 工作流执行耗时超过 10 秒。

**优化目标**：
- 1000 节点故障树计算 < 2 秒
- 支持并行门计算（AND/OR 门的子节点并行求值）
- 引入缓存机制避免重复计算

**技术方案**：
```python
# python/src/resolveagent/fta/evaluator.py

class ParallelFTAEvaluator:
    """并行故障树评估器"""
    
    async def evaluate(self, tree: FaultTree) -> EvaluationResult:
        # 1. 拓扑排序识别独立子树
        subtrees = self._decompose(tree)
        
        # 2. 并行评估独立子树
        results = await asyncio.gather(*[
            self._evaluate_subtree(st) for st in subtrees
        ])
        
        # 3. 合并结果
        return self._merge_results(results)
    
    def _decompose(self, tree: FaultTree) -> list[SubTree]:
        """将故障树分解为可并行计算的独立子树"""
        ...
```

**关键优化点**：
- 并行评估：使用 `asyncio.gather()` 并行计算独立子树
- 结果缓存：LRU 缓存中间计算结果
- 剪枝优化：概率低于阈值的子树提前终止

### 2.2 多语言代码分析

**现状问题**：仅支持 Python AST 分析，无法诊断 Java/Go/Rust 代码问题。

**扩展目标**：
- Java：基于 `javaparser` 或 tree-sitter-java
- Go：基于 `tree-sitter-go`
- Rust：基于 `tree-sitter-rust`

**技术方案**：
```python
# python/src/resolveagent/code_analysis/parsers/

class CodeAnalyzer:
    """多语言代码分析器"""
    
    PARSERS = {
        "python": PythonASTParser(),      # 现有
        "java": TreeSitterParser("java"), # 新增
        "go": TreeSitterParser("go"),     # 新增
        "rust": TreeSitterParser("rust"), # 新增
    }
    
    async def analyze(self, code: str, language: str) -> AnalysisResult:
        parser = self.PARSERS.get(language)
        if not parser:
            raise UnsupportedLanguageError(language)
        
        ast = parser.parse(code)
        issues = await self._detect_issues(ast, language)
        call_graph = parser.extract_call_graph(ast)
        
        return AnalysisResult(issues=issues, call_graph=call_graph)
```

### 2.3 LangGraph 集成

**目标**：让 ResolveAgent 作为 LangGraph 的 Expert Node，在复杂多 Agent 工作流中提供诊断能力。

**集成方式**：
```python
# python/src/resolveagent/integrations/langgraph/

from langgraph.graph import StateGraph
from resolveagent.integrations.langgraph.node import ResolveAgentNode

# 在 LangGraph 中使用 ResolveAgent
builder = StateGraph(State)
builder.add_node("planner", planner_node)
builder.add_node("resolveagent", ResolveAgentNode(
    agent_id="k8s-diagnosis",
    selector_strategy="hybrid",
))
builder.add_node("reporter", reporter_node)

builder.add_edge("planner", "resolveagent")
builder.add_edge("resolveagent", "reporter")
```

### 2.4 Dify 插件导出

**目标**：将 FTA 诊断能力输出为 Dify 的自定义工具，让 Dify 用户无需部署 ResolveAgent 即可获得诊断能力。

**插件格式**：
```yaml
# dify-plugin/resolveagent-tool.yaml
version: 0.0.1
type: plugin
author: ResolveAgent Team
name: resolveagent-diagnosis
label:
  en_US: ResolveAgent Diagnosis
  zh_Hans: ResolveAgent 故障诊断
description:
  en_US: Fault tree analysis and code diagnosis powered by ResolveAgent
  zh_Hans: 基于 ResolveAgent 的故障树分析和代码诊断
tools:
  - name: fta_diagnose
    label:
      en_US: FTA Diagnose
      zh_Hans: FTA 故障诊断
    description:
      en_US: Run fault tree analysis on system logs
      zh_Hans: 对系统日志执行故障树分析
    parameters:
      - name: logs
        type: string
        required: true
        label:
          en_US: System Logs
          zh_Hans: 系统日志
```

---

## 3. 边界条件与异常处理

| 边界条件 | 处理策略 |
|---------|---------|
| FTA 树存在循环依赖 | 拓扑排序时检测并抛出 CycleDetectedError |
| 代码语言不支持 | 返回明确错误，建议用户提交 Issue 或贡献 Parser |
| LangGraph 版本不兼容 | 支持 LangGraph >= 0.2，版本检测后给出兼容性提示 |
| Dify API 变更 | 插件版本锁定 Dify API 版本，变更时发布新插件版本 |

---

## 4. 预期成果

1. FTA 引擎性能提升 5x（1000 节点 < 2 秒）
2. 支持 Java/Go/Rust 代码分析
3. LangGraph 集成示例和文档
4. Dify 插件上架到 Dify Marketplace
5. 所有新增代码通过 mypy + ruff + pytest
