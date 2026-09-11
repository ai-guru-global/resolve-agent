# 测试编写规范

## 测试策略

ResolveAgent 采用多层次测试策略：

| 类型 | 范围 | 目标 |
|------|------|------|
| 单元测试 | 函数/方法 | 覆盖率 > 70% |
| 集成测试 | 模块间交互 | 关键路径覆盖 |
| E2E 测试 | 完整流程 | 核心场景覆盖 |

## Go 测试

### 运行测试

```bash
# 所有测试
make test-go

# 带覆盖率
make test-go COVERAGE=1

# 特定包
go test ./pkg/selector/...
```

### 测试示例

```go
func TestIntelligentSelector_Route(t *testing.T) {
    tests := []struct {
        name     string
        input    string
        expected string
    }{
        {
            name:     "code analysis request",
            input:    "分析这段代码的 bug",
            expected: "code_analysis",
        },
        {
            name:     "rag request",
            input:    "502 错误怎么处理",
            expected: "rag",
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            selector := NewIntelligentSelector()
            decision, err := selector.Route(tt.input)
            require.NoError(t, err)
            assert.Equal(t, tt.expected, decision.RouteType)
        })
    }
}
```

## Python 测试

### 运行测试

```bash
cd python

# 所有测试
uv run pytest tests/ -v

# 带覆盖率
uv run pytest tests/ -v --cov=resolveagent

# 特定测试
uv run pytest tests/unit/test_selector.py -v
```

### 测试示例

```python
import pytest
from resolveagent.selector import IntelligentSelector

@pytest.mark.asyncio
async def test_selector_route_code_analysis():
    selector = IntelligentSelector(strategy="rule")
    decision = await selector.route("分析这段代码的 bug")
    
    assert decision.route_type == "code_analysis"
    assert decision.confidence > 0.7
```

### Fixtures

```python
@pytest.fixture
async def selector():
    return IntelligentSelector(strategy="hybrid")

@pytest.fixture
def mock_llm_response():
    return {
        "route_type": "skill",
        "route_target": "web-search",
        "confidence": 0.85,
    }
```

## E2E 测试

```bash
# 运行 E2E 测试
make test-e2e

# 或
go test -tags=e2e -v ./test/e2e/...
```

## 测试最佳实践

1. **独立性**: 每个测试应该独立运行
2. **可重复性**: 测试结果应该稳定
3. **快速性**: 单元测试应该快速执行
4. **清晰性**: 测试名称应该说明测试目的
