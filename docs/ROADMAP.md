# Roadmap

This document outlines the high-level roadmap for the ResolveAgent project.

> **Note:** This roadmap is subject to change based on community feedback and
> project priorities. Check [GitHub Issues](https://github.com/ai-guru-global/resolve-agent/issues)
> for the most up-to-date status.

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

- [x] Database migration tooling (`scripts/migration/`)
- [x] Unified error handling across all services (`pkg/errors/`)
- [x] Structured logging with OpenTelemetry correlation (`pkg/logger/`)
- [x] Health check endpoints — liveness/readiness (`pkg/health/`)
- [x] Integration test suite (`test/integration/`)
- [x] Retry with exponential backoff (`pkg/retry/`)
- [ ] Load testing benchmarks

## v0.3.0 — Quality & Foundation (Current)

- [x] CI/CD workflow with GitHub Actions
- [x] Unified version management across all modules
- [x] Router refactoring (2160 lines → 15 domain-specific files)
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
- [x] Multi-language code analysis (Java, Go, Rust AST parsers)
- [x] LangGraph integration (ResolveAgent as Expert Node)
- [x] Dify plugin export (FTA diagnosis capability as custom tool)
- [ ] OpenAPI specification auto-generation
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
- [ ] Advanced RAG strategies (hybrid search, re-ranking)

## Long-term Vision

- [ ] Multi-cloud deployment support (AWS/Azure/GCP/Alibaba Cloud)
- [ ] Edge deployment for on-premise scenarios
- [ ] Visual workflow designer in WebUI (80% of Dify experience)
- [ ] AI-powered observability and self-healing
- [ ] ResolveAgent Expert Certification program
