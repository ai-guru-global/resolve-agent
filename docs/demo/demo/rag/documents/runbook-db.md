# 数据库连接问题处理手册

## 概述

数据库连接问题是常见的生产故障，可能导致服务无法正常响应。

## 常见问题

### 1. 连接池耗尽
**症状**: 无法获取新连接，请求超时
**日志特征**: `Cannot acquire connection from pool`

**排查步骤**:
1. 检查当前连接数
   ```sql
   -- MySQL
   SHOW STATUS LIKE 'Threads_connected';
   
   -- PostgreSQL
   SELECT count(*) FROM pg_stat_activity;
   ```
2. 查看等待连接的请求
3. 分析连接使用情况

**解决方案**:
- 增加连接池大小
- 减少连接租借时间
- 检查连接泄漏
- 优化慢查询

### 2. 连接超时
**症状**: 建立连接时超时
**日志特征**: `Connection timed out`

**排查步骤**:
1. 检查网络连通性
2. 验证数据库服务状态
3. 检查防火墙/安全组

**解决方案**:
- 修复网络问题
- 重启数据库服务
- 调整超时配置

### 3. 认证失败
**症状**: 连接时认证错误
**日志特征**: `Access denied` 或 `authentication failed`

**排查步骤**:
1. 验证用户名密码
2. 检查用户权限
3. 确认连接主机白名单

**解决方案**:
- 更新凭据配置
- 授权用户权限
- 添加主机白名单

## 连接池配置建议

```yaml
# HikariCP 推荐配置
hikari:
  maximum-pool-size: 20
  minimum-idle: 5
  connection-timeout: 30000
  idle-timeout: 600000
  max-lifetime: 1800000
  leak-detection-threshold: 60000
```

## 监控指标

- 活跃连接数
- 等待连接数
- 连接获取时间
- 连接使用时长
- 连接错误率
