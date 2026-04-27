# =============================================================================
# ResolveAgent Platform Service - Multi-stage Docker Build
# =============================================================================
# Go-based platform service providing HTTP/gRPC APIs, registry management,
# gateway integration, and orchestration capabilities.
# =============================================================================

# ---------------------
# Stage 1: Build
# ---------------------
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git make ca-certificates tzdata

WORKDIR /build

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Build binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH:-amd64} \
    go build \
    -ldflags "-s -w \
      -X github.com/ai-guru-global/resolve-agent/pkg/version.Version=${VERSION:-dev} \
      -X github.com/ai-guru-global/resolve-agent/pkg/version.Commit=$(git rev-parse --short HEAD 2>/dev/null || echo unknown) \
      -X github.com/ai-guru-global/resolve-agent/pkg/version.BuildDate=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    -o /bin/resolveagent-server \
    ./cmd/resolveagent-server

# ---------------------
# Stage 2: Runtime
# ---------------------
FROM alpine:3.23

LABEL maintainer="AI Guru Global <dev@resolveagent.io>"
LABEL org.opencontainers.image.title="ResolveAgent Platform"
LABEL org.opencontainers.image.description="ResolveAgent Platform Service"
LABEL org.opencontainers.image.source="https://github.com/ai-guru-global/resolve-agent"

RUN apk add --no-cache ca-certificates tzdata curl && \
    addgroup -g 1000 resolveagent && \
    adduser -D -u 1000 -G resolveagent resolveagent && \
    mkdir -p /etc/resolveagent /data && \
    chown -R resolveagent:resolveagent /etc/resolveagent /data

COPY --from=builder /bin/resolveagent-server /usr/local/bin/resolveagent-server
COPY configs/ /etc/resolveagent/

USER resolveagent
WORKDIR /data

EXPOSE 8080 9090

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/healthz || exit 1

ENTRYPOINT ["resolveagent-server"]
CMD ["--config", "/etc/resolveagent/resolveagent.yaml"]
