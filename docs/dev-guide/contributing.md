# 代码贡献指南

感谢你对 ResolveAgent 的贡献！本文档将指导你如何参与项目开发。

## 贡献类型

我们欢迎以下类型的贡献：

- 🐛 **Bug 修复** - 修复代码中的问题
- ✨ **新功能** - 添加新功能或改进现有功能
- 📝 **文档** - 改进文档、教程或示例
- 🧪 **测试** - 添加测试用例或提高覆盖率
- 🎨 **UI/UX** - 改进 WebUI 设计
- 🔧 **工具链** - 改进构建、CI/CD 或开发工具

## 贡献流程

### 1. 查找或创建 Issue

在提交 PR 前，请先查找是否已有相关 Issue：

- 如果是新功能，创建 Feature Request
- 如果是 Bug，创建 Bug Report
- 如果是文档改进，可以直接提交 PR

### 2. Fork 仓库

```bash
# Fork 仓库到个人账户
# 然后克隆

git clone https://github.com/YOUR_USERNAME/resolve-agent.git
cd resolve-agent

# 添加上游仓库
git remote add upstream https://github.com/ai-guru-global/resolve-agent.git
```

### 3. 创建分支

```bash
# 从 main 分支创建功能分支
git checkout main
git pull upstream main

git checkout -b feature/your-feature-name
# 或
git checkout -b fix/issue-description
```

分支命名规范：

| 类型 | 命名示例 |
|------|----------|
| 功能 | `feature/selector-hybrid-strategy` |
| 修复 | `fix/rag-pipeline-chunking` |
| 文档 | `docs/api-reference` |
| 重构 | `refactor/config-loading` |

### 4. 开发和提交

```bash
# 开发代码
# ...

# 运行测试
make test

# 运行 Linter
make lint

# 提交代码
git add .
git commit -m "feat: add hybrid routing strategy

Implement hybrid strategy that combines rule-based
and LLM-based routing for better accuracy.

Closes #123"
```

### 5. 保持同步

```bash
# 在推送前同步上游更改
git fetch upstream
git rebase upstream/main

# 如果有冲突，解决后
git add .
git rebase --continue
```

### 6. 推送并创建 PR

```bash
# 推送到你的 Fork
git push origin feature/your-feature-name

# 然后在 GitHub 上创建 Pull Request
```

## 代码规范

### Go 代码规范

遵循 [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments) 和 [Effective Go](https://go.dev/doc/effective_go)。

```go
// Good: 清晰的命名
func (s *Server) HandleAgentRequest(ctx context.Context, req *AgentRequest) (*AgentResponse, error) {
    // ...
}

// Good: 文档注释
// RouteDecision represents the output of the Intelligent Selector.
type RouteDecision struct {
    // RouteType is the selected routing target.
    RouteType string
    // Confidence is the confidence score (0.0 to 1.0).
    Confidence float64
}
```

### Python 代码规范

遵循 [PEP 8](https://peps.python.org/pep-0008/) 和 [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)。

```python
# Good: 类型注解
from typing import Optional

async def route(
    self,
    input_text: str,
    agent_id: str = "",
    context: Optional[dict] = None,
) -> RouteDecision:
    """Route a request to the appropriate subsystem.
    
    Args:
        input_text: The user input to route.
        agent_id: The agent processing this request.
        context: Additional context for routing.
        
    Returns:
        A RouteDecision indicating where and how to route.
    """
    # ...
```

### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

示例：

```
feat(selector): add confidence threshold configuration

Add configurable confidence threshold to the Intelligent Selector.
Default threshold is 0.7, can be overridden per agent.

- Add ConfidenceThreshold field to SelectorConfig
- Update route decision logic
- Add tests for threshold behavior

Closes #234
```

## PR 审查流程

### 创建 PR 时

1. 填写 PR 模板
2. 关联相关 Issue (`Closes #123`)
3. 添加适当的标签
4. 请求审查

### 审查标准

审查者会检查：

- [ ] 代码质量
- [ ] 测试覆盖
- [ ] 文档更新
- [ ] 性能影响
- [ ] 向后兼容性

### 合并要求

- 至少 1 个审查批准
- 所有 CI 检查通过
- 无冲突
- 提交历史清晰

## 开发区域

### 平台服务 (Go)

适合贡献者：
- 熟悉 Go 和云原生技术
- 了解 gRPC/REST API 设计
- 有 Kubernetes/Docker 经验

主要目录：
- `pkg/server/` - API 实现
- `pkg/registry/` - 注册中心
- `pkg/gateway/` - Higress 集成

### Agent 运行时 (Python)

适合贡献者：
- 熟悉 Python 异步编程
- 了解 LLM 和 Agent 框架
- 有 RAG/向量数据库经验

主要目录：
- `python/src/resolveagent/selector/` - 智能选择器
- `python/src/resolveagent/rag/` - RAG 管道
- `python/src/resolveagent/fta/` - FTA 引擎

### WebUI (React/TypeScript)

适合贡献者：
- 熟悉 React 和现代前端
- 了解 TypeScript
- 有可视化/图表经验

主要目录：
- `web/src/components/` - UI 组件
- `web/src/pages/` - 页面

## 社区

- [GitHub Discussions](https://github.com/ai-guru-global/resolve-agent/discussions) - 讨论和问答
- [GitHub Issues](https://github.com/ai-guru-global/resolve-agent/issues) - Bug 和功能请求

## 许可证

通过贡献代码，你同意将你的贡献在 Apache 2.0 许可证下发布。
