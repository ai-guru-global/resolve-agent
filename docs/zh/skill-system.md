# Agent 技能系统

技能系统是 ResolveAgent 的核心扩展机制，提供插件化的功能扩展能力。

---

## 概述

### 什么是技能（Skill）？

技能是 **封装了特定功能的可复用模块**，具有以下特点：

- **声明式配置**：通过 YAML 清单定义输入输出和权限
- **沙箱执行**：隔离环境中运行，安全可控
- **即插即用**：无需修改核心代码即可扩展功能
- **可组合**：可在 FTA 工作流中组合使用

### 技能来源

| 来源 | 说明 | 示例 |
|------|------|------|
| **内置** | 随 ResolveAgent 安装的技能 | web-search, file-ops |
| **本地** | 从本地目录加载 | ./my-skill |
| **Git** | 从 Git 仓库安装 | github.com/user/skill |
| **OCI** | 从容器镜像安装 | ghcr.io/org/skill:v1 |
| **注册表** | 从社区注册表安装 | registry.resolveagent.io/skill |

---

## 技能结构

### 目录结构

```
my-skill/
├── manifest.yaml      # 技能清单（必需）
├── skill.py           # 技能入口（Python）
├── requirements.txt   # Python 依赖（可选）
├── tests/             # 测试用例（可选）
│   └── test_skill.py
└── README.md          # 说明文档（可选）
```

### 清单文件 (manifest.yaml)

清单文件是技能的核心配置，定义了技能的元数据、接口和权限。

```yaml
# manifest.yaml
skill:
  # 基本信息
  name: web-search
  version: "1.0.0"
  description: "搜索互联网获取信息"
  author: "ResolveAgent Team"
  license: "Apache-2.0"
  
  # 入口点配置
  entry_point: "skill:run"  # 模块路径:函数名
  
  # 输入参数定义
  inputs:
    - name: query
      type: string
      required: true
      description: "搜索关键词"
      
    - name: num_results
      type: integer
      required: false
      default: 5
      description: "返回结果数量"
      
    - name: language
      type: string
      required: false
      default: "zh-CN"
      description: "搜索语言"
      enum: ["zh-CN", "en-US", "ja-JP"]
      
  # 输出参数定义
  outputs:
    - name: results
      type: array
      description: "搜索结果列表"
      
    - name: total_count
      type: integer
      description: "总结果数"
      
  # 依赖配置
  dependencies:
    - requests>=2.28.0
    - beautifulsoup4>=4.11.0
    
  # 权限配置
  permissions:
    network_access: true
    file_system_read: false
    file_system_write: false
    allowed_hosts:
      - "*.google.com"
      - "*.bing.com"
      - "*.baidu.com"
    max_memory_mb: 256
    max_cpu_seconds: 30
    timeout_seconds: 60
```

### 入口函数

```python
# skill.py
from typing import Any

def run(
    query: str,
    num_results: int = 5,
    language: str = "zh-CN"
) -> dict[str, Any]:
    """
    执行网络搜索
    
    Args:
        query: 搜索关键词
        num_results: 返回结果数量
        language: 搜索语言
        
    Returns:
        dict: 包含 results 和 total_count
    """
    # 实现搜索逻辑
    results = perform_search(query, num_results, language)
    
    return {
        "results": results,
        "total_count": len(results)
    }


def perform_search(query: str, num_results: int, language: str) -> list:
    """实际的搜索实现"""
    import requests
    
    # 调用搜索 API
    response = requests.get(
        "https://api.search.example.com/search",
        params={
            "q": query,
            "num": num_results,
            "lang": language
        },
        timeout=30
    )
    
    return response.json().get("results", [])
```

---

## 权限系统

### 权限类型

| 权限 | 说明 | 风险等级 |
|------|------|----------|
| `network_access` | 网络访问权限 | 中 |
| `file_system_read` | 文件系统读取 | 中 |
| `file_system_write` | 文件系统写入 | 高 |
| `allowed_hosts` | 允许访问的主机列表 | - |
| `max_memory_mb` | 最大内存使用 | - |
| `max_cpu_seconds` | 最大 CPU 时间 | - |
| `timeout_seconds` | 执行超时时间 | - |

### 权限审核

安装技能时会显示权限请求：

```
$ resolveagent skill install ./my-skill

技能: my-skill v1.0.0
作者: Example Author

请求的权限:
  ✓ 网络访问 (允许主机: *.example.com)
  ✓ 文件系统读取
  ✗ 文件系统写入

是否安装? [y/N] y
```

### 沙箱执行

技能在沙箱环境中执行，确保安全隔离：

```
┌─────────────────────────────────────────────────────┐
│                   沙箱环境                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │              技能进程                        │   │
│  ├─────────────────────────────────────────────┤   │
│  │  - 隔离的 Python 虚拟环境                   │   │
│  │  - 受限的系统调用                           │   │
│  │  - 网络访问白名单                           │   │
│  │  - 文件系统访问控制                         │   │
│  │  - 资源限制 (内存/CPU/时间)                 │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  监控:                                              │
│  - 资源使用追踪                                     │
│  - 执行日志记录                                     │
│  - 异常捕获                                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 技能管理

### 安装技能

```bash
# 从本地目录安装
resolveagent skill install ./my-skill

# 从 Git 仓库安装
resolveagent skill install github.com/user/my-skill

# 从 Git 安装指定版本
resolveagent skill install github.com/user/my-skill@v1.2.0

# 从 OCI 镜像安装
resolveagent skill install oci://ghcr.io/org/my-skill:latest

# 从社区注册表安装
resolveagent skill install registry://web-search
```

### 列出技能

```bash
# 列出已安装的技能
resolveagent skill list

输出:
NAME           VERSION   SOURCE    STATUS    DESCRIPTION
web-search     1.0.0     builtin   active    搜索互联网获取信息
log-analyzer   2.1.0     local     active    分析日志文件
my-skill       0.1.0     git       active    自定义技能
```

### 查看技能详情

```bash
resolveagent skill info web-search

输出:
名称: web-search
版本: 1.0.0
来源: builtin
状态: active
描述: 搜索互联网获取信息

输入参数:
  query (string, required): 搜索关键词
  num_results (integer, optional, default=5): 返回结果数量
  language (string, optional, default=zh-CN): 搜索语言

输出参数:
  results (array): 搜索结果列表
  total_count (integer): 总结果数

权限:
  网络访问: 是
  允许主机: *.google.com, *.bing.com
  文件读取: 否
  文件写入: 否
```

### 测试技能

```bash
# 测试技能执行
resolveagent skill test web-search \
  --input query="ResolveAgent" \
  --input num_results=3

输出:
执行时间: 1.23s
状态: 成功

输出:
{
  "results": [
    {"title": "ResolveAgent Official", "url": "..."},
    {"title": "ResolveAgent GitHub", "url": "..."},
    {"title": "ResolveAgent Docs", "url": "..."}
  ],
  "total_count": 3
}
```

### 移除技能

```bash
# 移除技能
resolveagent skill remove my-skill

# 强制移除（跳过确认）
resolveagent skill remove my-skill --force
```

---

## 开发指南

### 快速开始

#### 1. 创建技能骨架

```bash
# 使用模板创建
resolveagent skill init my-skill

cd my-skill
```

生成的结构：
```
my-skill/
├── manifest.yaml
├── skill.py
├── requirements.txt
└── tests/
    └── test_skill.py
```

#### 2. 编写清单文件

```yaml
# manifest.yaml
skill:
  name: my-skill
  version: "0.1.0"
  description: "我的第一个技能"
  author: "Your Name"
  
  entry_point: "skill:run"
  
  inputs:
    - name: message
      type: string
      required: true
      description: "输入消息"
      
  outputs:
    - name: response
      type: string
      description: "响应消息"
      
  permissions:
    network_access: false
```

#### 3. 实现入口函数

```python
# skill.py
def run(message: str) -> dict:
    """
    处理输入消息并返回响应
    """
    response = f"收到消息: {message}"
    
    return {
        "response": response
    }
```

#### 4. 编写测试

```python
# tests/test_skill.py
import pytest
from skill import run

def test_run_basic():
    result = run(message="Hello")
    assert "response" in result
    assert "Hello" in result["response"]

def test_run_empty():
    result = run(message="")
    assert "response" in result
```

#### 5. 本地测试

```bash
# 运行单元测试
cd my-skill
pytest tests/

# 使用 CLI 测试
resolveagent skill test ./my-skill --input message="测试"
```

#### 6. 安装使用

```bash
# 安装到 ResolveAgent
resolveagent skill install ./my-skill

# 在 Agent 中使用
resolveagent agent create my-agent --skills my-skill
```

### 高级开发

#### 异步技能

```python
# skill.py
import asyncio

async def run(urls: list[str]) -> dict:
    """异步批量请求"""
    import aiohttp
    
    async with aiohttp.ClientSession() as session:
        tasks = [fetch(session, url) for url in urls]
        results = await asyncio.gather(*tasks)
        
    return {"results": results}

async def fetch(session, url):
    async with session.get(url) as response:
        return await response.text()
```

#### 带上下文的技能

```python
# skill.py
from typing import Any

def run(
    query: str,
    context: dict[str, Any] = None  # 执行上下文
) -> dict:
    """
    可以访问执行上下文的技能
    
    context 包含:
    - execution_id: 执行 ID
    - agent_id: Agent ID
    - conversation_id: 会话 ID
    - memory: Agent 记忆
    """
    agent_id = context.get("agent_id", "unknown")
    
    return {
        "response": f"Agent {agent_id} 执行查询: {query}"
    }
```

#### 流式输出

```python
# skill.py
from typing import Generator

def run(text: str) -> Generator[dict, None, None]:
    """流式输出技能"""
    words = text.split()
    
    for i, word in enumerate(words):
        yield {
            "type": "progress",
            "current": i + 1,
            "total": len(words),
            "word": word
        }
    
    yield {
        "type": "complete",
        "result": f"处理了 {len(words)} 个词"
    }
```

#### 错误处理

```python
# skill.py
class SkillError(Exception):
    """技能执行错误"""
    pass

def run(data: dict) -> dict:
    """带错误处理的技能"""
    try:
        # 输入验证
        if not data.get("required_field"):
            raise SkillError("缺少必需字段: required_field")
        
        # 业务逻辑
        result = process_data(data)
        
        return {"result": result, "success": True}
        
    except SkillError as e:
        # 业务错误
        return {"error": str(e), "success": False}
    except Exception as e:
        # 系统错误
        raise RuntimeError(f"技能执行失败: {e}")
```

---

## 内置技能

ResolveAgent 提供以下内置技能：

### web-search

网络搜索技能。

```yaml
inputs:
  - query: string (required)
  - num_results: integer (default: 5)
  - language: string (default: "zh-CN")

outputs:
  - results: array
  - total_count: integer
```

### file-ops

文件操作技能。

```yaml
inputs:
  - operation: string (required) # read, write, list, delete
  - path: string (required)
  - content: string (optional)

outputs:
  - result: any
  - success: boolean
```

### code-runner

代码执行技能。

```yaml
inputs:
  - language: string (required) # python, javascript, shell
  - code: string (required)
  - timeout: integer (default: 30)

outputs:
  - stdout: string
  - stderr: string
  - exit_code: integer
```

### http-request

HTTP 请求技能。

```yaml
inputs:
  - method: string (default: "GET")
  - url: string (required)
  - headers: object (optional)
  - body: any (optional)

outputs:
  - status_code: integer
  - headers: object
  - body: any
```

---

## API 参考

### gRPC API

```protobuf
service SkillService {
  // 注册技能
  rpc RegisterSkill(RegisterSkillRequest) returns (Skill);
  
  // 获取技能信息
  rpc GetSkill(GetSkillRequest) returns (Skill);
  
  // 列出技能
  rpc ListSkills(ListSkillsRequest) returns (ListSkillsResponse);
  
  // 移除技能
  rpc UnregisterSkill(UnregisterSkillRequest) returns (UnregisterSkillResponse);
  
  // 测试技能
  rpc TestSkill(TestSkillRequest) returns (TestSkillResponse);
}
```

### Python SDK

```python
from resolveagent.skills import SkillLoader, SkillExecutor

# 加载技能
loader = SkillLoader()
skill = loader.load_from_directory("./my-skill")

# 执行技能
executor = SkillExecutor()
result = await executor.execute(
    skill=skill,
    inputs={"query": "ResolveAgent"}
)

print(result.outputs)
print(f"执行时间: {result.duration_ms}ms")
print(f"成功: {result.success}")
```

---

## 最佳实践

### 1. 设计原则

- **单一职责**：每个技能只做一件事
- **幂等性**：重复调用产生相同结果
- **明确接口**：清晰定义输入输出
- **最小权限**：只请求必要的权限

### 2. 安全建议

```yaml
# ✅ 好的实践：最小权限
permissions:
  network_access: true
  allowed_hosts:
    - "api.example.com"  # 只允许必要的主机
  file_system_read: false
  file_system_write: false

# ❌ 避免：过度权限
permissions:
  network_access: true
  allowed_hosts: ["*"]  # 危险：允许所有主机
  file_system_write: true
```

### 3. 性能优化

```python
# ✅ 使用缓存
from functools import lru_cache

@lru_cache(maxsize=100)
def expensive_computation(input_data):
    # 缓存计算结果
    pass

# ✅ 使用连接池
import requests
from requests.adapters import HTTPAdapter

session = requests.Session()
session.mount('https://', HTTPAdapter(pool_connections=10))
```

### 4. 测试建议

```python
# 单元测试
def test_run_with_valid_input():
    result = run(query="test")
    assert result["success"] is True

# 边界测试
def test_run_with_empty_input():
    result = run(query="")
    assert "error" in result

# 超时测试
def test_run_timeout():
    with pytest.raises(TimeoutError):
        run(query="slow_query", timeout=1)
```

---

## 相关文档

- [FTA 工作流引擎](./fta-engine.md) - 在工作流中使用技能
- [智能选择器](./intelligent-selector.md) - 技能路由机制
- [CLI 参考](./cli-reference.md) - 技能管理命令
- [配置参考](./configuration.md) - 技能相关配置
