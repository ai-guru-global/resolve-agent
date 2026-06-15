# Multi-Tenant Design

## Overview

This document describes the proposed multi-tenancy architecture for ResolveAgent.
The current implementation uses flat key-value registries with no tenant isolation.
This design proposes a **shared database, shared schema, row-level filtering** approach.

## 1. Tenant Context

### Extraction

Tenant identity is extracted from one of two sources (in priority order):

1. **JWT Claims**: The `tenant_id` claim in the JWT token payload
2. **Header**: `X-Tenant-ID` header (for service-to-service calls or API key auth)

### Go Middleware

A new `TenantMiddleware` should be added to the Go platform server, mirroring the
existing `AuthMiddleware` pattern in `pkg/server/middleware/auth.go`:

```go
// TenantContext holds tenant-scoped identity.
type TenantContext struct {
    TenantID string
}

type tenantContextKey struct{}

func TenantFromContext(ctx context.Context) *TenantContext {
    if tc, ok := ctx.Value(tenantContextKey{}).(*TenantContext); ok {
        return tc
    }
    return &TenantContext{TenantID: "default"}
}

func TenantMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        tenantID := r.Header.Get("X-Tenant-ID")
        if tenantID == "" {
            // Fall back to JWT claim (extracted by AuthMiddleware)
            if ac := AuthFromContext(r.Context()); ac != nil {
                tenantID = ac.Claims["tenant_id"]
            }
        }
        if tenantID == "" {
            tenantID = "default"
        }
        ctx := context.WithValue(r.Context(), tenantContextKey{}, &TenantContext{TenantID: tenantID})
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

## 2. Data Isolation Model

### Schema Changes

All registry tables gain a `tenant_id` column:

```sql
ALTER TABLE agents ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE skills ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE workflows ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE solutions ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';

-- Indexes for efficient tenant-scoped queries
CREATE INDEX idx_agents_tenant ON agents(tenant_id, id);
CREATE INDEX idx_skills_tenant ON skills(tenant_id, name);
CREATE INDEX idx_workflows_tenant ON workflows(tenant_id, id);
```

### Query Filtering

All SELECT, UPDATE, and DELETE queries add `WHERE tenant_id = $1`:

```go
func (s *AgentStore) Get(ctx context.Context, id string) (*Agent, error) {
    tc := TenantFromContext(ctx)
    return s.db.QueryRow(ctx,
        "SELECT id, name, config FROM agents WHERE id = $1 AND tenant_id = $2",
        id, tc.TenantID,
    ).Scan(...)
}
```

### Row-Level Security (Optional)

For PostgreSQL deployments with stricter isolation:

```sql
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON agents
    USING (tenant_id = current_setting('app.tenant_id'));
```

## 3. Python Tenant Propagation

The Python runtime's `BaseStoreClient` should forward tenant context in HTTP headers:

```python
class BaseStoreClient:
    def __init__(self, address: str, tenant_id: str = "default"):
        self._tenant_id = tenant_id

    def _headers(self) -> dict[str, str]:
        return {"X-Tenant-ID": self._tenant_id}
```

## 4. RAG Collection Isolation

RAG collections are scoped by tenant via metadata filters:

```python
filters = {"tenant_id": self._tenant_id}
results = await pipeline.query(
    collection_id=collection_id,
    query=query,
    filters=filters,
)
```

## 5. Migration Strategy

### Phase 1: Add Column (Non-Breaking)

- Add `tenant_id` column with default `"default"` to all tables
- No enforcement — existing queries continue to work

### Phase 2: Backfill & Tag

- Backfill existing rows with `tenant_id = "default"`
- New writes include `tenant_id` from context
- List endpoints optionally filter by `X-Tenant-ID` header

### Phase 3: Enforce Filtering

- All queries include `WHERE tenant_id = $1`
- Middleware rejects requests without valid tenant context
- Existing `"default"` tenant continues to function

## 6. API Changes

### New Endpoints

- `POST /v1/tenants` — Create tenant (admin only)
- `GET /v1/tenants` — List tenants (admin only)

### Modified Headers

All authenticated requests should include `X-Tenant-ID` or have `tenant_id` in JWT claims.
