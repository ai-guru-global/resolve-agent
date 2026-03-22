# Middleware Architecture

<cite>
**Referenced Files in This Document**
- [auth.go](file://pkg/server/middleware/auth.go)
- [logging.go](file://pkg/server/middleware/logging.go)
- [tracing.go](file://pkg/server/middleware/tracing.go)
- [router.go](file://pkg/server/router.go)
- [server.go](file://pkg/server/server.go)
- [logger.go](file://pkg/telemetry/logger.go)
- [tracer.go](file://pkg/telemetry/tracer.go)
- [metrics.go](file://pkg/telemetry/metrics.go)
- [main.go](file://cmd/resolvenet-server/main.go)
- [resolvenet.yaml](file://configs/resolvenet.yaml)
- [config.go](file://pkg/config/config.go)
- [types.go](file://pkg/config/types.go)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document explains the middleware architecture supporting authentication, logging, and tracing in the platform’s HTTP server. It covers the middleware chain implementation, request/response processing, error handling patterns, and the current state of each middleware component. It also documents how these middlewares relate to the overall request lifecycle, outlines security considerations, and provides guidance for extending the middleware stack with custom implementations.

## Project Structure
The middleware and telemetry components are organized under the server and telemetry packages, with configuration managed via Viper and YAML. The HTTP server registers REST endpoints and composes middleware around the request handler chain.

```mermaid
graph TB
subgraph "Server"
S["Server (server.go)"]
R["HTTP ServeMux (router.go)"]
M_AUTH["Auth Middleware (auth.go)"]
M_LOG["Logging Middleware (logging.go)"]
M_TRACE["Tracing Middleware (tracing.go)"]
end
subgraph "Telemetry"
T_LOGGER["Logger Factory (logger.go)"]
T_TRACER["Tracer Init (tracer.go)"]
T_METRICS["Metrics Init (metrics.go)"]
end
subgraph "Config"
C_MAIN["Config Loader (config.go)"]
C_TYPES["Config Types (types.go)"]
C_FILE["YAML Config (resolvenet.yaml)"]
end
subgraph "Entry Point"
E_MAIN["Main (main.go)"]
end
E_MAIN --> S
S --> R
R --> M_AUTH --> M_LOG --> M_TRACE --> R
S --> T_TRACER
S --> T_METRICS
E_MAIN --> T_LOGGER
E_MAIN --> C_MAIN
C_MAIN --> C_TYPES
C_MAIN --> C_FILE
```

**Diagram sources**
- [server.go:44-49](file://pkg/server/server.go#L44-L49)
- [router.go:11-55](file://pkg/server/router.go#L11-L55)
- [auth.go:8-17](file://pkg/server/middleware/auth.go#L8-L17)
- [logging.go:19-37](file://pkg/server/middleware/logging.go#L19-L37)
- [tracing.go:7-18](file://pkg/server/middleware/tracing.go#L7-L18)
- [logger.go:8-35](file://pkg/telemetry/logger.go#L8-L35)
- [tracer.go:8-21](file://pkg/telemetry/tracer.go#L8-L21)
- [metrics.go:7-12](file://pkg/telemetry/metrics.go#L7-L12)
- [main.go:16-34](file://cmd/resolvenet-server/main.go#L16-L34)
- [config.go:10-62](file://pkg/config/config.go#L10-L62)
- [types.go:4-69](file://pkg/config/types.go#L4-L69)
- [resolvenet.yaml:1-34](file://configs/resolvenet.yaml#L1-L34)

**Section sources**
- [server.go:44-49](file://pkg/server/server.go#L44-L49)
- [router.go:11-55](file://pkg/server/router.go#L11-L55)
- [main.go:16-34](file://cmd/resolvenet-server/main.go#L16-L34)
- [config.go:10-62](file://pkg/config/config.go#L10-L62)
- [types.go:4-69](file://pkg/config/types.go#L4-L69)
- [resolvenet.yaml:1-34](file://configs/resolvenet.yaml#L1-L34)

## Core Components
- Authentication middleware: Validates authentication tokens and enforces role-based access control. Current implementation is a placeholder and passes through all requests.
- Logging middleware: Wraps the response writer to capture status codes, logs structured request metadata, and measures duration.
- Tracing middleware: Creates OpenTelemetry spans for distributed tracing. Current implementation is a placeholder and does not attach spans to the request context.

These middlewares are designed to be composed around the HTTP handler chain to provide cross-cutting concerns consistently across all endpoints.

**Section sources**
- [auth.go:8-17](file://pkg/server/middleware/auth.go#L8-L17)
- [logging.go:9-37](file://pkg/server/middleware/logging.go#L9-L37)
- [tracing.go:7-18](file://pkg/server/middleware/tracing.go#L7-L18)

## Architecture Overview
The HTTP server initializes a ServeMux and registers REST endpoints. The middleware chain is applied around the handler chain so that each request flows through authentication, logging, and tracing before reaching the endpoint handler. Telemetry initialization is performed during server startup.

```mermaid
sequenceDiagram
participant Client as "Client"
participant HTTP as "HTTP Server"
participant Auth as "Auth Middleware"
participant Log as "Logging Middleware"
participant Trace as "Tracing Middleware"
participant Handler as "Endpoint Handler"
Client->>HTTP : "HTTP Request"
HTTP->>Auth : "Wrap with Auth"
Auth->>Log : "Wrap with Logging"
Log->>Trace : "Wrap with Tracing"
Trace->>Handler : "Invoke Handler"
Handler-->>Trace : "Response"
Trace-->>Log : "Response"
Log-->>Auth : "Response"
Auth-->>HTTP : "Response"
HTTP-->>Client : "HTTP Response"
```

**Diagram sources**
- [server.go:44-49](file://pkg/server/server.go#L44-L49)
- [router.go:11-55](file://pkg/server/router.go#L11-L55)
- [auth.go:8-17](file://pkg/server/middleware/auth.go#L8-L17)
- [logging.go:19-37](file://pkg/server/middleware/logging.go#L19-L37)
- [tracing.go:7-18](file://pkg/server/middleware/tracing.go#L7-L18)

## Detailed Component Analysis

### Authentication Middleware
Purpose:
- Enforce authentication and authorization policies.
- Extract identity and roles from tokens.
- Support role-based access control (RBAC) decisions.

Current state:
- Placeholder implementation that forwards all requests without validation.

Design pattern:
- Returns a higher-order function that wraps the next handler, enabling chaining.

Security considerations:
- Token validation must be implemented with secure parsing and signature verification.
- Prefer short-lived access tokens with refresh token rotation.
- Apply least privilege and enforce RBAC at the handler boundary.

Extensibility:
- Add token extraction from Authorization headers.
- Integrate with a token issuer (e.g., JWT) and validate claims.
- Implement RBAC checks against user roles and resource permissions.

```mermaid
flowchart TD
Start(["Incoming Request"]) --> CheckToken["Extract and Parse Token"]
CheckToken --> ValidToken{"Token Valid?"}
ValidToken --> |No| Deny["Return 401 Unauthorized"]
ValidToken --> |Yes| ExtractClaims["Extract Claims<br/>and Roles"]
ExtractClaims --> RBAC{"RBAC Allowed?"}
RBAC --> |No| Forbidden["Return 403 Forbidden"]
RBAC --> |Yes| Next["Call Next Handler"]
Deny --> End(["Exit"])
Forbidden --> End
Next --> End
```

**Diagram sources**
- [auth.go:8-17](file://pkg/server/middleware/auth.go#L8-L17)

**Section sources**
- [auth.go:8-17](file://pkg/server/middleware/auth.go#L8-L17)

### Logging Middleware
Purpose:
- Provide structured logging for every HTTP request.
- Capture method, path, status code, duration, and remote address.
- Wrap the response writer to record status code after handler execution.

Design pattern:
- ResponseWriter wrapper captures WriteHeader invocations.
- Logs after invoking the next handler to reflect final status code.

Audit trail:
- Structured logs enable downstream aggregation and filtering.
- Include request correlation identifiers (trace ID) when integrated with tracing.

```mermaid
flowchart TD
Enter(["Request Enters Logging Middleware"]) --> StartTimer["Record Start Time"]
StartTimer --> WrapRW["Wrap ResponseWriter"]
WrapRW --> CallNext["Call Next Handler"]
CallNext --> AfterHandler["After Handler Execution"]
AfterHandler --> CalcDuration["Calculate Duration"]
CalcDuration --> LogEvent["Log Structured Event<br/>with Method, Path,<br/>Status, Duration, RemoteAddr"]
LogEvent --> Exit(["Exit"])
```

**Diagram sources**
- [logging.go:9-37](file://pkg/server/middleware/logging.go#L9-L37)

**Section sources**
- [logging.go:9-37](file://pkg/server/middleware/logging.go#L9-L37)

### Tracing Middleware
Purpose:
- Create OpenTelemetry spans per request for distributed tracing.
- Propagate context to downstream services.

Current state:
- Placeholder implementation that does not create or attach spans.

Integration points:
- Initialize OpenTelemetry tracer and meter providers during server startup.
- Use the request context to create spans and set attributes.

```mermaid
flowchart TD
Start(["Request Enters Tracing Middleware"]) --> CreateSpan["Create Span from Context"]
CreateSpan --> AttachCtx["Attach Span Context to Request"]
AttachCtx --> CallNext["Call Next Handler"]
CallNext --> EndSpan["End Span on Completion"]
EndSpan --> Exit(["Exit"])
```

**Diagram sources**
- [tracing.go:7-18](file://pkg/server/middleware/tracing.go#L7-L18)
- [tracer.go:8-21](file://pkg/telemetry/tracer.go#L8-L21)

**Section sources**
- [tracing.go:7-18](file://pkg/server/middleware/tracing.go#L7-L18)
- [tracer.go:8-21](file://pkg/telemetry/tracer.go#L8-L21)

### Request Lifecycle and Middleware Chain
The request lifecycle begins at the HTTP server, which delegates to the ServeMux. The middleware chain wraps the handler in the order: Auth → Logging → Tracing. Each middleware may modify or inspect the request/response and then call the next component. The final handler writes the response back through the chain.

```mermaid
sequenceDiagram
participant Client as "Client"
participant HTTP as "HTTP Server"
participant M1 as "Auth"
participant M2 as "Logging"
participant M3 as "Tracing"
participant H as "Handler"
Client->>HTTP : "HTTP Request"
HTTP->>M1 : "Invoke Auth"
M1->>M2 : "Invoke Logging"
M2->>M3 : "Invoke Tracing"
M3->>H : "Invoke Handler"
H-->>M3 : "Response"
M3-->>M2 : "Response"
M2-->>M1 : "Response"
M1-->>HTTP : "Response"
HTTP-->>Client : "HTTP Response"
```

**Diagram sources**
- [server.go:44-49](file://pkg/server/server.go#L44-L49)
- [router.go:11-55](file://pkg/server/router.go#L11-L55)
- [auth.go:8-17](file://pkg/server/middleware/auth.go#L8-L17)
- [logging.go:19-37](file://pkg/server/middleware/logging.go#L19-L37)
- [tracing.go:7-18](file://pkg/server/middleware/tracing.go#L7-L18)

**Section sources**
- [server.go:44-49](file://pkg/server/server.go#L44-L49)
- [router.go:11-55](file://pkg/server/router.go#L11-L55)

## Dependency Analysis
The server composes the middleware chain around the ServeMux. Telemetry initialization is invoked during server construction. Configuration drives server addresses and telemetry toggles.

```mermaid
graph LR
CFG["Config (config.go)"] --> SRV["Server (server.go)"]
SRV --> MUX["ServeMux (router.go)"]
MUX --> AUTH["Auth (auth.go)"]
AUTH --> LOG["Logging (logging.go)"]
LOG --> TRACE["Tracing (tracing.go)"]
SRV --> T_INIT["Telemetry Init (tracer.go, metrics.go)"]
MAIN["Main (main.go)"] --> SRV
MAIN --> LOGF["Logger Factory (logger.go)"]
CFG_FILE["resolvenet.yaml"] --> CFG
```

**Diagram sources**
- [server.go:44-49](file://pkg/server/server.go#L44-L49)
- [router.go:11-55](file://pkg/server/router.go#L11-L55)
- [auth.go:8-17](file://pkg/server/middleware/auth.go#L8-L17)
- [logging.go:19-37](file://pkg/server/middleware/logging.go#L19-L37)
- [tracing.go:7-18](file://pkg/server/middleware/tracing.go#L7-L18)
- [tracer.go:8-21](file://pkg/telemetry/tracer.go#L8-L21)
- [metrics.go:7-12](file://pkg/telemetry/metrics.go#L7-L12)
- [main.go:16-34](file://cmd/resolvenet-server/main.go#L16-L34)
- [logger.go:8-35](file://pkg/telemetry/logger.go#L8-L35)
- [config.go:10-62](file://pkg/config/config.go#L10-L62)
- [resolvenet.yaml:1-34](file://configs/resolvenet.yaml#L1-L34)

**Section sources**
- [server.go:44-49](file://pkg/server/server.go#L44-L49)
- [config.go:10-62](file://pkg/config/config.go#L10-L62)
- [resolvenet.yaml:1-34](file://configs/resolvenet.yaml#L1-L34)

## Performance Considerations
- Middleware overhead: Each middleware adds CPU and memory overhead. Keep middleware logic efficient and avoid heavy synchronous work inside the request path.
- Logging cost: Structured logging is generally lightweight but can become expensive under high throughput. Consider sampling or asynchronous logging.
- Tracing cost: Creating spans introduces overhead. Enable tracing selectively in production and tune export batching.
- ResponseWriter wrapping: Minimal overhead; ensure no unnecessary allocations in hot paths.
- Concurrency: The server runs HTTP and gRPC concurrently; middleware should be safe for concurrent use.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and remedies:
- Authentication middleware not enforcing policies: Verify the placeholder is replaced with token validation and RBAC checks.
- Missing request correlation in logs: Integrate tracing middleware to populate trace IDs and propagate them to logs.
- Tracing not exporting: Ensure telemetry initialization is enabled and configured with a valid OTLP endpoint.
- Configuration not applied: Confirm environment variable prefixes and YAML paths match the configuration loader defaults and keys.

Operational checks:
- Validate server addresses and ports in configuration.
- Confirm telemetry settings (enabled, endpoint, service name).
- Review structured logs for errors and durations.

**Section sources**
- [resolvenet.yaml:29-34](file://configs/resolvenet.yaml#L29-L34)
- [config.go:10-62](file://pkg/config/config.go#L10-L62)
- [logger.go:8-35](file://pkg/telemetry/logger.go#L8-L35)
- [tracer.go:8-21](file://pkg/telemetry/tracer.go#L8-L21)

## Conclusion
The middleware architecture provides a clean separation of concerns for authentication, logging, and tracing. While the current implementation includes placeholders for token validation and tracing, the design supports straightforward extension to meet production-grade security and observability needs. Proper configuration and careful performance tuning will ensure reliable operation under real-world loads.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Middleware Configuration Examples
- Authentication: Configure token issuer, signing keys, and RBAC policy mappings.
- Logging: Choose JSON or text format and set minimum log level.
- Tracing: Enable telemetry, configure OTLP endpoint, and set service name.

**Section sources**
- [resolvenet.yaml:29-34](file://configs/resolvenet.yaml#L29-L34)
- [logger.go:8-35](file://pkg/telemetry/logger.go#L8-L35)
- [tracer.go:8-21](file://pkg/telemetry/tracer.go#L8-L21)

### Custom Middleware Development
Patterns:
- Higher-order function returning a handler that wraps the next handler.
- Preserve request context and headers.
- Minimize allocations and avoid blocking operations.
- Use structured logging for diagnostics.

Integration:
- Compose middleware around the ServeMux in the desired order.
- Initialize telemetry providers early in the server lifecycle.

**Section sources**
- [auth.go:8-17](file://pkg/server/middleware/auth.go#L8-L17)
- [logging.go:19-37](file://pkg/server/middleware/logging.go#L19-L37)
- [tracing.go:7-18](file://pkg/server/middleware/tracing.go#L7-L18)
- [server.go:44-49](file://pkg/server/server.go#L44-L49)