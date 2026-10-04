# Roadmap

This document outlines the high-level roadmap for the ResolveAgent project.

> **Note:** This roadmap is subject to change based on community feedback and
> project priorities. Check [GitHub Issues](https://github.com/ai-guru-global/resolve-agent/issues)
> for the most up-to-date status.
>
> **单一来源**：本文件是路线图唯一权威副本。原 `docs/ROADMAP.md` 已合并至此并删除，
> 避免两份文件对 `v0.3.0 (Current)` 给出互相矛盾的定义。
> 勾选状态以代码为准；与实现有出入的条目在括号内注明实际情况。

## v0.1.0 — Foundation

- [x] Go platform services (gRPC + REST)
- [x] Python agent runtime with AgentScope
- [x] FTA (Fault Tree Analysis) workflow engine
- [x] Intelligent Selector for skill/model routing
- [x] RAG pipeline integration
- [x] WebUI dashboard
- [x] CLI tooling with TUI dashboard
- [x] Docker Compose deployment
- [x] Helm chart for Kubernetes

## v0.2.0 — Hardening

- [x] Database migration tooling（权威迁移链内嵌于 Go 平台 `pkg/store/postgres/postgres.go`，
      启动时自动执行，version 1~16；早期的 `scripts/migration/` SQL 已废弃并保留为参考）
- [x] Unified error handling across all services (`pkg/errors/`)
- [x] Structured logging with OpenTelemetry correlation (`pkg/logger/`)
- [x] Health check endpoints — liveness/readiness (`pkg/health/`)
- [x] Integration test suite (`test/integration/`)
- [x] Retry with exponential backoff (`pkg/retry/`)
- [ ] Load testing benchmarks（`test/load/` 尚未建立）

## v0.3.0 — Quality & Foundation (Current)

- [x] CI/CD workflow with GitHub Actions
- [x] Unified version management across all modules
- [x] Router refactoring (2160 lines → 15 domain-specific files)
      （`pkg/server/router.go` 现 137 行 + 15 个 `*_handlers.go`）
- [x] Web route lazy loading optimization
- [x] MyPy type checking tightening
- [x] Web & Python test infrastructure
- [x] Health check endpoint consistency
- [x] Security hardening (remove hardcoded passwords)
- [x] PostgreSQL Registry persistence layer
- [x] MCP (Model Context Protocol) adapter

## v0.4.0 — Core Capability Strengthening (Phase 1)

**Focus: FTA + Code Diagnosis dual core, ecosystem integration**

- [x] FTA engine performance optimization (large-scale fault tree real-time computation)
      （`python/src/resolveagent/fta/parallel_evaluator.py`）
- [x] Multi-language code analysis (Java, Go, Rust AST parsers)
      （`code_analysis/parsers/treesitter_parser.py`，经 `parsers/factory.py` 注册）
- [x] LangGraph integration (ResolveAgent as Expert Node)
- [x] Dify plugin export (FTA diagnosis capability as custom tool)
- [ ] OpenAPI specification auto-generation
      （现状：`api/openapi/v1/resolveagent.yaml` 人工维护，由
      `pkg/server/openapi_contract_test.go` 做契约守护，`hack/openapi-routes.sh` 辅助人工核对；尚无生成器）
- [ ] Load testing benchmarks

## v0.5.0 — Enterprise Readiness (Phase 2)

**Focus: Multi-tenant, audit, RBAC — enterprise procurement "ticket items"**

- [ ] Multi-tenant support (namespace isolation, resource quotas)
- [ ] RBAC (Role-Based Access Control) with fine-grained permissions
- [ ] Comprehensive audit logging (user actions, API calls, data access)
- [ ] SSO integration (OIDC/SAML support)
- [ ] Data encryption at rest and in transit
- [ ] Compliance reporting (GDPR, SOC2 templates)

## v0.6.0 — Ecosystem & Scale (Phase 3)

**Focus: Data flywheel, community, horizontal scaling**

- [ ] Skill marketplace / registry with MCP tool discovery
- [ ] Fault case community (anonymized fault tree template library)
- [ ] Plugin SDK for third-party skill development
- [ ] Horizontal scaling for agent runtime
- [ ] Distributed workflow execution
- [ ] Event-driven architecture (NATS JetStream)
      （`pkg/event/nats.go` 已实现 JetStream bus 并通过单测，但目前**没有任何调用方**，
      尚未接入平台服务或 Agent 运行时）
- [ ] Advanced RAG strategies (hybrid search, re-ranking)

## Long-term Vision

- [ ] Multi-cloud deployment support (AWS/Azure/GCP/Alibaba Cloud)
- [ ] Edge deployment for on-premise scenarios
- [ ] Visual workflow designer in WebUI (80% of Dify experience)
- [ ] AI-powered observability and self-healing
- [ ] ResolveAgent Expert Certification program
