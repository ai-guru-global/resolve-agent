# Security Architecture

## Overview

ResolveAgent implements a defense-in-depth security model across four layers:
network transport, authentication, execution sandboxing, and data protection.

## 1. Authentication

### Go Platform Layer (`pkg/server/middleware/auth.go`)

| Method | Implementation | Notes |
|--------|---------------|-------|
| **JWT** | HS256 signing, issuer validation, configurable secret | `Authorization: Bearer <token>` |
| **API Key** | In-memory store with expiry, constant-time comparison (`subtle.ConstantTimeCompare`) | `X-API-Key` header |
| **Gateway Passthrough** | `X-Auth-User` and `X-Auth-Roles` headers from Higress | Delegated auth mode |

Skip paths are configurable for health (`/health`), readiness (`/ready`), and metrics (`/metrics`) endpoints.

### Role-Based Access (RBAC)

The `HasRole(ctx, role)` helper extracts roles from the authenticated context.
Currently the function is defined but not enforced at the handler level — this is
a documented gap that should be addressed in the next release.

**Recommendation**: Add RBAC middleware that checks required roles per route
before delegating to handlers.

## 2. Transport Security

### Python Runtime (`python/src/resolveagent/runtime/http_server.py`)

| Mechanism | Configuration | Default |
|-----------|--------------|---------|
| **CORS** | `RESOLVEAGENT_CORS_ORIGINS` env var | `http://localhost:5173` (Vite dev) |
| **Credentials** | Auto-disabled when origins include `*` | `true` for explicit origins |
| **Security Headers** | `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy` | Always enabled |
| **Rate Limiting** | In-memory sliding window, configurable RPM | 60 req/min per IP |

### Gateway Layer

Higress gateway integration supports:
- TLS termination
- Request rate limiting (configurable per-route)
- Retry policies with backoff

## 3. Skill Sandbox Isolation (`python/src/resolveagent/skills/sandbox.py`)

Each skill execution runs in a subprocess with strict resource limits:

| Resource | Limit | Mechanism |
|----------|-------|-----------|
| CPU Time | 10 seconds | `resource.setrlimit(RLIMIT_CPU)` |
| Memory | 512 MB | `resource.setrlimit(RLIMIT_AS)` |
| Stack | 8 MB | `resource.setrlimit(RLIMIT_STACK)` |
| File Size | 10 MB | `resource.setrlimit(RLIMIT_FSIZE)` |
| Open Files | 64 | `resource.setrlimit(RLIMIT_NOFILE)` |
| Core Dumps | Disabled | `resource.setrlimit(RLIMIT_CORE, (0, 0))` |
| PATH | Minimal | `/usr/local/bin:/usr/bin:/bin` only |
| Network | Optional | `allow_network: bool = False` default |
| Timeout | Configurable | `asyncio.wait_for` wrapper |

Skill manifests declare permissions in `SkillPermissions` proto message:
`network_access`, `file_system_read`, `file_system_write`, `allowed_hosts`,
`max_memory_mb`, `max_cpu_seconds`, `timeout_seconds`.

## 4. Cross-Language Error Tracing

Structured error events propagate from Python to Go via SSE:

```json
{
  "type": "error",
  "error_code": "INVALID_ARGUMENT",
  "category": "validation",
  "message": "field 'query' is required",
  "trace_id": "00-abc123..."
}
```

Go translates Python error codes to native `errors.Code` via `mapPythonErrorCode()`.
W3C `traceparent` headers are injected into outgoing requests for span correlation.

## 5. Identified Gaps & Recommendations

| Gap | Severity | Status |
|-----|----------|--------|
| CORS defaulted to `*` | HIGH | **Fixed** — now defaults to `localhost:5173` |
| RBAC not enforced at handler level | HIGH | Open — `HasRole()` defined but unused |
| No JWT audience/claim validation beyond issuer | MEDIUM | Open |
| No centralized input validation | MEDIUM | Open — see [input-validation.md](input-validation.md) |
| Rate limiting is in-memory (not distributed) | MEDIUM | Open — acceptable for single-instance |
| No API key rotation mechanism | LOW | Open |
| No audit logging for auth events | MEDIUM | Open — DecisionAuditLogger covers routing only |
| `sslmode: disable` in default config | MEDIUM | Open — should be `require` for production |
