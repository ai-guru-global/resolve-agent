FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential && \
    rm -rf /var/lib/apt/lists/*

RUN pip install uv

WORKDIR /app
COPY python/pyproject.toml python/uv.lock* ./
RUN uv sync --no-dev || uv pip install -e "."

COPY python/src/ ./src/
COPY configs/ /etc/resolveagent/

RUN useradd -m -u 1000 resolveagent
USER resolveagent

EXPOSE 9091

CMD ["uv", "run", "python", "-m", "resolveagent.runtime.server"]
