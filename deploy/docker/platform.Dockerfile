# =============================================================================
# ResolveAgent Platform Service - Multi-stage Docker Build
# =============================================================================
# Go-based platform service providing HTTP/gRPC APIs, registry management,
# gateway integration, and orchestration capabilities.
# =============================================================================

# ---------------------
# Stage 1: Build
# ---------------------
FROM golang:1.26-alpine AS builder

ARG VERSION
ARG TARGETARCH
# .git is excluded from the build context, so the commit comes from a build
# arg (compose passes GIT_COMMIT) instead of git rev-parse.
ARG GIT_COMMIT=unknown

RUN apk add --no-cache git make ca-certificates tzdata

WORKDIR /build

# Cache dependencies
COPY go.mod go.sum ./
# proxy.golang.org is unreachable from some networks; goproxy.cn mirrors it
# (including the checksum database). Harmless where the default works.
ENV GOPROXY=https://goproxy.cn,direct
RUN go mod download && go mod verify

# Build binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=${TARGETARCH:-amd64} \
    go build \
    -ldflags "-s -w \
      -X github.com/ai-guru-global/resolve-agent/pkg/version.Version=${VERSION:-dev} \
      -X github.com/ai-guru-global/resolve-agent/pkg/version.Commit=${GIT_COMMIT} \
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
