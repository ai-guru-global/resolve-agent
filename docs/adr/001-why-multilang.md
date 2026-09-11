# ADR-001: 为什么选择多语言架构

## 状态

- **日期**: 2024-01-15
- **状态**: 已接受
- **作者**: AI Guru Team

## 背景

ResolveAgent 需要实现：
1. 高性能的平台服务（注册中心、API 网关）
2. 灵活的 Agent 运行时（AI/ML 能力）
3. 现代化的 Web 界面

单一语言难以在所有维度都达到最优。

## 决策

采用多语言架构：

| 层级 | 语言 | 原因 |
|------|------|------|
| 平台服务 | Go | 高并发、低延迟、云原生生态成熟 |
| Agent 运行时 | Python | AI/ML 生态丰富、AgentScope 框架 |
| WebUI | TypeScript/React | 现代化前端、React Flow 可视化 |

## 考量因素

### Go 的优势

- 编译型语言，性能优异
- 原生并发支持（goroutines）
- 云原生生态（Kubernetes、etcd 等）
- 静态类型，易于维护

### Python 的优势

- AI/ML 库丰富（PyTorch、Transformers 等）
- AgentScope 框架基于 Python
- 快速原型开发
- 数据科学生态

### TypeScript 的优势

- 类型安全
- React 生态成熟
- React Flow 支持工作流可视化

## 权衡

### 优点

- 每个层级使用最适合的语言
- 可以充分利用各领域最佳工具
- 团队可以使用擅长的技术栈

### 缺点

- 需要维护多份构建配置
- 跨语言通信复杂性（使用 gRPC 缓解）
- 团队成员需要了解多种语言

## 缓解措施

1. **标准化通信**: 使用 gRPC 和 Protocol Buffers
2. **统一构建**: Makefile 封装多语言构建
3. **容器化**: Docker 统一运行环境
4. **CI/CD**: GitHub Actions 自动化测试和构建

## 结论

多语言架构虽然增加了复杂性，但使每个组件都能使用最适合的技术，整体收益大于成本。
