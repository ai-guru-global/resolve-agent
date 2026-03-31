# =============================================================================
# ResolveAgent Runtime - Python Agent Runtime Docker Build
# =============================================================================
# Python-based agent runtime providing AgentScope integration,
# FTA engine, intelligent selector, and skill execution.
# =============================================================================

FROM python:3.12-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc && \
    rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

WORKDIR /build

# Cache dependencies
COPY python/pyproject.toml python/uv.lock* ./
RUN uv venv /opt/venv && \
    . /opt/venv/bin/activate && \
    uv sync --no-dev 2>/dev/null || uv pip install -e "." 2>/dev/null || true

# ---------------------
# Runtime stage
# ---------------------
FROM python:3.12-slim

LABEL maintainer="AI Guru Global <dev@resolveagent.io>"
LABEL org.opencontainers.image.title="ResolveAgent Runtime"
LABEL org.opencontainers.image.description="ResolveAgent Agent Runtime"
LABEL org.opencontainers.image.source="https://github.com/ai-guru-global/resolve-agent"

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl && \
    rm -rf /var/lib/apt/lists/* && \
    useradd -m -u 1000 -s /bin/bash resolveagent && \
    mkdir -p /etc/resolveagent /data /app && \
    chown -R resolveagent:resolveagent /etc/resolveagent /data /app

# Install uv in runtime
RUN pip install --no-cache-dir uv

COPY --from=builder /opt/venv /opt/venv

WORKDIR /app
COPY python/pyproject.toml ./
COPY python/src/ ./src/
COPY configs/ /etc/resolveagent/

ENV PATH="/opt/venv/bin:$PATH"
ENV VIRTUAL_ENV="/opt/venv"
ENV PYTHONPATH="/app/src"
ENV PYTHONUNBUFFERED=1

USER resolveagent

EXPOSE 9091

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:9091/healthz || exit 1

CMD ["python", "-m", "resolveagent.runtime.server"]
