# API 参考

ResolveAgent 提供多层次的 API 接口：

- **REST API** - 用于 WebUI 和外部集成
- **gRPC API** - 用于内部服务通信
- **Python SDK** - 用于 Agent 运行时编程

## API 版本策略

| 版本 | 状态 | 说明 |
|------|------|------|
| v1 | Alpha | 当前开发版本，可能有不兼容变更 |

## 认证

所有 API 请求都需要认证。支持以下方式：

### API Key

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.resolveagent.io/v1/agents
```

### JWT Token

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://api.resolveagent.io/v1/agents
```

## 错误处理

API 使用标准 HTTP 状态码：

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

错误响应格式：

```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "The 'name' field is required",
    "details": {
      "field": "name",
      "constraint": "required"
    }
  }
}
```

## 速率限制

API 有速率限制：

| 端点类型 | 限制 |
|----------|------|
| 读取 | 1000/分钟 |
| 写入 | 100/分钟 |
| LLM 调用 | 60/分钟 |

响应头包含限制信息：

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## 文档导航

- [REST API 参考](./rest.md)
- [gRPC API 参考](./grpc.md)
- [Python SDK 参考](./python-sdk.md)
