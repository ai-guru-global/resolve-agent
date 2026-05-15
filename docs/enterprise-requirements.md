# ResolveAgent 企业功能需求文档

> 基于竞品分析结论，企业级功能是 ResolveAgent 进入中腰部市场的"门票"。本文档定义多租户、RBAC、审计日志等核心企业功能的详细需求。

---

## 1. 多租户支持 (Multi-Tenancy)

### 1.1 概述

支持多个组织（租户）共享同一个 ResolveAgent 实例，每个租户的数据和资源完全隔离。

### 1.2 需求详情

| 需求 ID | 需求描述 | 优先级 | 验收标准 |
|---------|---------|--------|---------|
| MT-001 | 租户注册与生命周期管理 | P0 | 支持创建、激活、暂停、删除租户 |
| MT-002 | 数据隔离 | P0 | 每个租户拥有独立的数据库 schema 或命名空间 |
| MT-003 | 资源配额 | P0 | 可配置每个租户的 agent 数量、skill 数量、存储上限 |
| MT-004 | 租户级别配置 | P1 | 每个租户可自定义 LLM 模型、网关配置 |
| MT-005 | 租户间数据共享 | P2 | 支持跨租户共享公共 skill 和 runbook |

### 1.3 技术方案

```
┌─────────────────────────────────────────────────────────────┐
│                    ResolveAgent Platform                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Tenant A   │  │  Tenant B   │  │     Tenant C        │ │
│  │  (Schema A) │  │  (Schema B) │  │    (Schema C)       │ │
│  │             │  │             │  │                     │ │
│  │ • Agents    │  │ • Agents    │  │ • Agents            │ │
│  │ • Skills    │  │ • Skills    │  │ • Skills            │ │
│  │ • Workflows │  │ • Workflows │  │ • Workflows         │ │
│  │ • RAG Docs  │  │ • RAG Docs  │  │ • RAG Docs          │ │
│  │ • Memory    │  │ • Memory    │  │ • Memory            │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                              │
│  Shared: Platform Config, Gateway, LLM Providers             │
└─────────────────────────────────────────────────────────────┘
```

**实现策略：**
- **数据库层**：PostgreSQL schema-per-tenant 或 row-level security (RLS)
- **API 层**：中间件从请求头提取 `X-Tenant-ID`，注入到上下文
- **存储层**：对象存储路径前缀按租户隔离

### 1.4 API 变更

新增租户管理 API：

```go
// pkg/server/tenant_handlers.go
mux.HandleFunc("GET /api/v1/tenants", s.handleListTenants)
mux.HandleFunc("POST /api/v1/tenants", s.handleCreateTenant)
mux.HandleFunc("GET /api/v1/tenants/{id}", s.handleGetTenant)
mux.HandleFunc("PUT /api/v1/tenants/{id}", s.handleUpdateTenant)
mux.HandleFunc("DELETE /api/v1/tenants/{id}", s.handleDeleteTenant)
mux.HandleFunc("GET /api/v1/tenants/{id}/quotas", s.handleGetTenantQuotas)
mux.HandleFunc("PUT /api/v1/tenants/{id}/quotas", s.handleUpdateTenantQuotas)
```

---

## 2. RBAC (Role-Based Access Control)

### 2.1 概述

基于角色的访问控制，支持细粒度的权限管理。

### 2.2 角色定义

| 角色 | 说明 | 权限范围 |
|------|------|---------|
| **Platform Admin** | 平台管理员 | 所有租户的所有资源 |
| **Tenant Admin** | 租户管理员 | 所属租户的所有资源 |
| **Tenant Editor** | 租户编辑者 | 所属租户的读写权限（不含删除） |
| **Tenant Viewer** | 租户查看者 | 所属租户只读权限 |
| **Agent Operator** | Agent 操作员 | 仅能执行 agent，不能修改配置 |

### 2.3 权限矩阵

| 资源/操作 | 创建 | 读取 | 更新 | 删除 | 执行 |
|-----------|------|------|------|------|------|
| Agent | ✓ | ✓ | ✓ | ✓ | ✓ |
| Skill | ✓ | ✓ | ✓ | ✓ | - |
| Workflow | ✓ | ✓ | ✓ | ✓ | ✓ |
| RAG Collection | ✓ | ✓ | ✓ | ✓ | - |
| Hook | ✓ | ✓ | ✓ | ✓ | - |
| User (tenant内) | - | ✓ | - | - | - |
| System Config | - | - | - | - | - |

### 2.4 技术方案

```go
// pkg/auth/rbac.go
type Permission struct {
    Resource string // agent, skill, workflow, etc.
    Action   string // create, read, update, delete, execute
}

type Role struct {
    Name        string
    Permissions []Permission
    Scope       string // platform | tenant
}

type RBACMiddleware struct {
    enforcer *casbin.Enforcer // 或自研实现
}

func (m *RBACMiddleware) Authorize(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        user := GetUserFromContext(r.Context())
        resource := GetResourceFromPath(r.URL.Path)
        action := GetActionFromMethod(r.Method)
        
        if !m.enforcer.Enforce(user.Role, resource, action) {
            writeError(w, http.StatusForbidden, "insufficient permissions")
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

**推荐方案**：使用 Casbin（支持 Go/Python 多语言，策略可持久化到 PostgreSQL）

---

## 3. 审计日志 (Audit Logging)

### 3.1 概述

记录所有用户操作、API 调用和数据访问，支持合规审计和安全追溯。

### 3.2 审计事件类型

| 事件类别 | 事件示例 | 记录内容 |
|---------|---------|---------|
| **认证** | 登录、登出、令牌刷新 | 用户、IP、时间、结果 |
| **授权** | 权限变更、角色分配 | 操作者、被操作者、变更内容 |
| **数据访问** | Agent 创建、Skill 删除 | 操作者、资源、变更前后快照 |
| **执行** | Agent 执行、Workflow 运行 | 输入、输出、耗时、错误 |
| **配置** | 系统配置变更 | 配置项、旧值、新值 |
| **安全** | 密码修改、密钥轮换 | 操作者、时间、影响范围 |

### 3.3 日志格式

```json
{
  "timestamp": "2026-05-14T10:30:00Z",
  "event_id": "evt_123456",
  "event_type": "agent.execute",
  "severity": "info",
  "actor": {
    "type": "user",
    "id": "user_abc",
    "name": "admin@example.com",
    "role": "tenant_admin",
    "tenant_id": "tenant_123"
  },
  "target": {
    "resource_type": "agent",
    "resource_id": "agent_456",
    "resource_name": "k8s-diagnosis"
  },
  "action": {
    "type": "execute",
    "method": "POST",
    "path": "/api/v1/agents/agent_456/execute"
  },
  "context": {
    "ip": "192.168.1.100",
    "user_agent": "Mozilla/5.0...",
    "request_id": "req_xyz",
    "trace_id": "trace_abc"
  },
  "result": {
    "status": "success",
    "duration_ms": 1250,
    "output_summary": "Diagnosed 3 issues"
  },
  "before": null,
  "after": null
}
```

### 3.4 存储与保留策略

| 存储层 | 保留期 | 用途 |
|--------|--------|------|
| **热存储** (PostgreSQL) | 30 天 | 实时查询、告警 |
| **温存储** (对象存储) | 1 年 | 批量导出、月度报告 |
| **冷存储** (归档) | 7 年 | 合规审计、法律追溯 |

### 3.5 审计日志 API

```go
// pkg/server/audit_handlers.go
mux.HandleFunc("GET /api/v1/audit/logs", s.handleListAuditLogs)           // 查询审计日志
mux.HandleFunc("GET /api/v1/audit/logs/{id}", s.handleGetAuditLog)        // 获取单条日志
mux.HandleFunc("GET /api/v1/audit/stats", s.handleGetAuditStats)          // 审计统计
mux.HandleFunc("POST /api/v1/audit/export", s.handleExportAuditLogs)      // 导出审计日志
mux.HandleFunc("GET /api/v1/audit/alerts", s.handleListAuditAlerts)       // 安全告警
```

---

## 4. SSO 集成

### 4.1 概述

支持企业单点登录，降低用户管理成本。

### 4.2 支持的协议

| 协议 | 优先级 | 说明 |
|------|--------|------|
| **OIDC** | P0 | OpenID Connect，现代标准 |
| **SAML 2.0** | P1 | 企业传统 IdP（ADFS、Okta） |
| **LDAP** | P2 | Active Directory 直接集成 |

### 4.3 配置示例

```yaml
auth:
  mode: "sso"  # local | sso | hybrid
  
  oidc:
    enabled: true
    issuer_url: "https://accounts.google.com"
    client_id: "${OIDC_CLIENT_ID}"
    client_secret: "${OIDC_CLIENT_SECRET}"
    redirect_url: "https://resolveagent.example.com/auth/callback"
    scopes: ["openid", "email", "profile"]
    
  saml:
    enabled: false
    idp_metadata_url: "https://idp.example.com/metadata.xml"
    sp_entity_id: "resolveagent"
    
  ldap:
    enabled: false
    url: "ldap://ldap.example.com:389"
    base_dn: "dc=example,dc=com"
    bind_dn: "cn=admin,dc=example,dc=com"
```

---

## 5. 数据安全

### 5.1 加密要求

| 数据类型 | 加密方式 | 说明 |
|---------|---------|------|
| **传输中** | TLS 1.3 | 所有 API 和 gRPC 流量 |
| **静态数据** | AES-256-GCM | 数据库敏感字段 |
| **密钥** | HashiCorp Vault / AWS KMS | 外部密钥管理服务 |
| **备份** | 客户端加密 | 加密后上传对象存储 |

### 5.2 敏感字段清单

```go
// pkg/config/sensitive_fields.go
var SensitiveFields = []string{
    "database.password",
    "redis.password",
    "gateway.auth.jwt_secret",
    "mcp.servers.*.headers.Authorization",
    "auth.oidc.client_secret",
    "auth.saml.private_key",
}
```

---

## 6. 合规报告

### 6.1 支持的合规标准

| 标准 | 优先级 | 自动报告 |
|------|--------|---------|
| **SOC 2 Type II** | P1 | 控制有效性报告 |
| **GDPR** | P1 | 数据处理活动记录 |
| **等保 2.0 三级** | P0 (国内) | 安全审计报告 |
| **ISO 27001** | P2 | 信息安全管理报告 |

### 6.2 报告模板

```yaml
compliance:
  reports:
    - name: "soc2_type2"
      schedule: "monthly"
      sections:
        - access_controls
        - audit_logging
        - data_encryption
        - incident_response
    - name: "gdpr_dpa"
      schedule: "quarterly"
      sections:
        - data_processing_activities
        - subject_access_requests
        - data_retention
```

---

## 7. 实施优先级

```
Phase 1 (v0.5.0 - 3个月)
├── MT-001, MT-002, MT-003  (多租户基础)
├── RBAC 基础框架 (Casbin 集成)
├── 审计日志基础 (API + PostgreSQL 存储)
└── OIDC SSO

Phase 2 (v0.5.1 - 2个月)
├── MT-004, MT-005  (高级多租户)
├── RBAC 细粒度权限
├── 审计日志高级 (告警、导出)
└── SAML SSO

Phase 3 (v0.5.2 - 2个月)
├── 数据加密增强
├── 合规报告自动化
├── LDAP 集成
└── 安全渗透测试
```

---

## 8. 与现有架构的集成点

| 功能 | 集成文件 | 影响范围 |
|------|---------|---------|
| 多租户 | `pkg/server/server.go`, `pkg/config/config.go` | 所有 handler 需注入 tenant context |
| RBAC | `pkg/server/router.go` (middleware) | 所有 API 路由 |
| 审计日志 | `pkg/server/response.go` | 所有 writeJSON/writeError 调用 |
| SSO | 新增 `pkg/auth/sso.go` | 登录流程 |
| 加密 | `pkg/store/postgres/postgres.go` | 数据库连接 |
