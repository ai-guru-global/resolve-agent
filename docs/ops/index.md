# 运维手册

本手册面向运维工程师，提供 ResolveAgent 的生产环境部署和运维指南。

## 快速导航

| 主题 | 说明 |
|------|------|
| [部署指南](./deployment.md) | Kubernetes/Docker 部署步骤 |
| [监控告警](./monitoring.md) | Prometheus/Grafana 配置 |
| [故障排查](./troubleshooting.md) | 常见问题解决方法 |

## 生产环境检查清单

在将 ResolveAgent 部署到生产环境前，请确认以下事项：

### 基础设施

- [ ] PostgreSQL 集群已配置高可用
- [ ] Redis 集群已配置（推荐 Sentinel 模式）
- [ ] NATS 集群已配置（推荐 JetStream 启用）
- [ ] Milvus 集群已配置高可用
- [ ] Higress 网关已配置并测试

### 安全配置

- [ ] 所有 API 密钥已存储在 Secret 中
- [ ] TLS 证书已配置
- [ ] 网络策略已配置
- [ ] RBAC 权限已配置

### 监控告警

- [ ] Prometheus 已配置抓取
- [ ] Grafana 仪表板已导入
- [ ] 关键告警规则已配置
- [ ] 日志聚合已配置

### 备份策略

- [ ] PostgreSQL 定期备份
- [ ] Redis 持久化配置
- [ ] 配置文件版本控制

## 系统要求

### 最小配置

| 组件 | CPU | 内存 | 存储 |
|------|-----|------|------|
| Platform | 0.5 核 | 512Mi | 1Gi |
| Runtime | 1 核 | 2Gi | 5Gi |
| PostgreSQL | 1 核 | 2Gi | 20Gi |
| Redis | 0.5 核 | 1Gi | 5Gi |
| Milvus | 2 核 | 4Gi | 50Gi |

### 推荐配置

| 组件 | CPU | 内存 | 存储 | 副本数 |
|------|-----|------|------|--------|
| Platform | 2 核 | 4Gi | 10Gi | 3 |
| Runtime | 4 核 | 8Gi | 20Gi | 5 |
| PostgreSQL | 4 核 | 8Gi | 100Gi | 3 |
| Redis | 2 核 | 4Gi | 20Gi | 3 |
| Milvus | 8 核 | 16Gi | 500Gi | 3 |

## 健康检查

### Platform 服务

```bash
# HTTP 健康检查
curl http://localhost:8080/healthz

# gRPC 健康检查
grpcurl -plaintext localhost:9090 grpc.health.v1.Health/Check
```

### Runtime 服务

```bash
# 健康检查端点
curl http://localhost:9091/healthz
```

## 常见问题

### 服务无法启动

1. 检查依赖服务是否就绪
2. 查看日志 `kubectl logs -f deployment/resolveagent-platform`
3. 验证配置 `resolveagent config validate`

### 性能问题

1. 检查资源使用率 `kubectl top pods`
2. 查看慢查询日志
3. 调整连接池配置

### LLM 调用失败

1. 验证 API 密钥 `kubectl get secret llm-api-keys -o yaml`
2. 检查 Higress 网关状态
3. 查看网关日志

## 获取帮助

- [GitHub Issues](https://github.com/ai-guru-global/resolve-agent/issues)
- [故障排查指南](./troubleshooting.md)
