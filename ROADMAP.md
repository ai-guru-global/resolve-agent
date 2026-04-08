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

## v0.3.0 — WebUI & DevEx (Current)

- [x] WebUI mock data system with backend auto-detection
- [x] Project directory cleanup and consolidation
- [x] Deployment config unification (`deploy/`)
- [x] Root-level project scaffolding (`examples/`, `scripts/`, `third_party/`)
- [ ] OpenAPI specification auto-generation

## v0.4.0 — Ecosystem

- [ ] Skill marketplace / registry
- [ ] Plugin SDK for third-party skill development
- [ ] Multi-tenant support
- [ ] RBAC (Role-Based Access Control)
- [ ] Audit logging dashboard

## v0.5.0 — Scale

- [ ] Horizontal scaling for agent runtime
- [ ] Distributed workflow execution
- [ ] Event-driven architecture (NATS JetStream)
- [ ] Advanced RAG strategies (hybrid search, re-ranking)

## Long-term Vision

- [ ] Multi-cloud deployment support
- [ ] Edge deployment for on-premise scenarios
- [ ] Visual workflow designer in WebUI
- [ ] AI-powered observability and self-healing
