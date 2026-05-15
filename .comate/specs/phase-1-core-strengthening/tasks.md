# Phase 1 核心能力强化任务计划

- [x] 任务 1: FTA 引擎性能优化
    - 1.1: 分析现有 `python/src/resolveagent/fta/evaluator.py` 性能瓶颈
    - 1.2: 实现故障树分解为独立子树的算法
    - 1.3: 实现并行子树评估（asyncio.gather）
    - 1.4: 添加 LRU 缓存避免重复计算
    - 1.5: 实现概率阈值剪枝优化
    - 1.6: 编写性能基准测试（1000 节点 < 2 秒）

- [x] 任务 2: 多语言代码分析
    - 2.1: 调研 tree-sitter 多语言绑定方案
    - 2.2: 重构 `python/src/resolveagent/code_analysis/ast_parser.py` 为多语言接口
    - 2.3: 实现 Java AST Parser（基于 tree-sitter-java）
    - 2.4: 实现 Go AST Parser（基于 tree-sitter-go）
    - 2.5: 实现 Rust AST Parser（基于 tree-sitter-rust）
    - 2.6: 编写多语言代码分析单元测试

- [ ] 任务 3: LangGraph 集成
    - 3.1: 创建 `python/src/resolveagent/integrations/langgraph/` 模块
    - 3.2: 实现 `ResolveAgentNode` 类（LangGraph Node 接口）
    - 3.3: 编写 LangGraph 集成示例（多 Agent 诊断工作流）
    - 3.4: 编写集成测试

- [ ] 任务 4: Dify 插件导出
    - 4.1: 创建 `integrations/dify/` 目录和插件配置
    - 4.2: 实现 FTA 诊断工具 API（封装为 HTTP endpoint）
    - 4.3: 编写 Dify 插件 manifest 和工具定义
    - 4.4: 编写插件使用文档

- [ ] 任务 5: 验证与文档
    - 5.1: 运行全量 Python 测试确保无回归
    - 5.2: 运行 mypy 和 ruff 检查
    - 5.3: 更新 `docs/ROADMAP.md` 标记 Phase 1 完成项
    - 5.4: 更新 `docs/competitive-analysis-2026.md` 进展追踪
