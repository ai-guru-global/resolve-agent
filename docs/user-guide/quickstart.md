# Quick Start Guide

This guide will help you get ResolveNet up and running in **5 minutes**.

---

## Prerequisites

Before you begin, ensure you have the following installed:

| Dependency | Version | Purpose | Installation |
|------------|---------|---------|--------------|
| **Go** | >= 1.22 | Platform services, CLI | [go.dev](https://go.dev/dl/) |
| **Python** | >= 3.11 | Agent runtime | [python.org](https://python.org/) |
| **Node.js** | >= 20 | WebUI (optional) | [nodejs.org](https://nodejs.org/) |
| **Docker** | >= 20.10 | Container runtime | [docker.com](https://docker.com/) |
| **Docker Compose** | >= 2.0 | Local development | Included with Docker Desktop |

### Recommended Tools

- **[uv](https://github.com/astral-sh/uv)**: Fast Python package manager
- **[pnpm](https://pnpm.io/)**: Fast Node.js package manager

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ai-guru-global/resolve-net.git
cd resolve-net
```

### 2. Set Up Development Environment

```bash
# One-command setup (installs Go, Python, Node dependencies)
make setup-dev
```

This command will:
- Install Go module dependencies
- Create Python virtual environment and install dependencies
- Install Node.js dependencies
- Generate Protocol Buffers code

### 3. Start Infrastructure Services

```bash
# Start PostgreSQL, Redis, NATS
make compose-deps
```

Wait for services to be ready, then verify:

```bash
docker compose -f deploy/docker-compose/docker-compose.deps.yaml ps
```

### 4. Build the Project

```bash
# Build all components
make build
```

Build artifacts:
- `bin/resolvenet-server`: Platform server
- `bin/resolvenet-cli`: Command-line tool

### 5. Run Tests

```bash
# Run unit tests
make test

# Run end-to-end tests (requires infrastructure services)
make test-e2e
```

---

## Configuration

### Configure LLM API Keys

ResolveNet supports multiple Chinese LLM providers. Configure your API keys:

#### Option 1: Environment Variables

```bash
# Qwen (通义千问) - Get from dashscope.aliyun.com
export QWEN_API_KEY="your-qwen-api-key"

# Wenxin (文心一言) - Get from cloud.baidu.com
export WENXIN_API_KEY="your-wenxin-api-key"

# Zhipu (智谱清言) - Get from open.bigmodel.cn
export ZHIPU_API_KEY="your-zhipu-api-key"
```

#### Option 2: Configuration File

Create `~/.resolvenet/models.yaml`:

```yaml
models:
  - id: qwen-plus
    provider: qwen
    model_name: qwen-plus
    max_tokens: 32768
    api_key: "your-qwen-api-key"
```

---

## Start Services

### Option 1: Docker Compose (Recommended)

```bash
# Start all services
make compose-up

# Or start in development mode (with hot reload)
make compose-dev
```

### Option 2: Manual Start

```bash
# Terminal 1: Start platform services
./bin/resolvenet-server

# Terminal 2: Start agent runtime
cd python
uv run python -m resolvenet.runtime.server
```

### Access Points

| Service | URL |
|---------|-----|
| Platform HTTP API | http://localhost:8080 |
| Platform gRPC | localhost:9090 |
| Agent Runtime gRPC | localhost:9091 |
| WebUI | http://localhost:3000 |

---

## Your First Agent

### Step 1: Create an Agent

```bash
resolvenet agent create my-assistant \
  --type mega \
  --model qwen-plus \
  --description "My first intelligent assistant"
```

### Step 2: Verify the Agent

```bash
resolvenet agent list
```

Expected output:
```
NAME            TYPE    MODEL       STATUS    CREATED
my-assistant    mega    qwen-plus   active    2024-01-15 10:30:00
```

### Step 3: Run the Agent

```bash
resolvenet agent run my-assistant
```

Example interaction:
```
ResolveNet Agent Shell - my-assistant
Type 'exit' to quit, 'help' for commands

> Hello, what can you do?
[my-assistant] Hello! I'm my-assistant, an intelligent assistant powered by ResolveNet.
I can help you with:
- Searching the web for information
- Analyzing documents
- Running diagnostic workflows
- Answering questions from knowledge bases

> Search for the latest AI news
[Route Decision: skill -> web-search, confidence: 0.92]
[Executing skill: web-search]
Searching for latest AI news...
```

---

## TUI Dashboard

ResolveNet provides a terminal user interface (TUI) for monitoring and management:

```bash
resolvenet dashboard
```

### Dashboard Features

- Real-time agent status
- Workflow execution monitoring
- System logs viewer
- Skill and configuration management

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Switch panels |
| `j/k` | Navigate up/down |
| `Enter` | Select/Execute |
| `q` | Quit |

---

## Next Steps

Now that you have ResolveNet running, explore these features:

### Learn the Concepts

- **[Architecture Overview](../architecture/overview.md)**: Understand how ResolveNet works
- **[Intelligent Selector](../architecture/intelligent-selector.md)**: Learn about the routing mechanism
- **[FTA Engine](../architecture/fta-engine.md)**: Build diagnostic workflows

### Hands-on Practice

1. **Create a Custom Skill**: Follow the [Skill Development Guide](../zh/skill-system.md)
2. **Set Up RAG**: Import your documents with the [RAG Pipeline Guide](../zh/rag-pipeline.md)
3. **Build a Workflow**: Create automation with the [FTA Workflow Guide](../zh/fta-engine.md)

### Production Deployment

- **[Deployment Guide](../zh/deployment.md)**: Deploy to Kubernetes
- **[Configuration Reference](../zh/configuration.md)**: Full configuration options
- **[Best Practices](../zh/best-practices.md)**: Optimization tips

---

## Troubleshooting

### Cannot connect to services

```bash
# Check health status
resolvenet health

# View service logs
docker compose -f deploy/docker-compose/docker-compose.deps.yaml logs
```

### Agent creation fails

```bash
# Verify configuration
resolvenet config get

# Check model availability
resolvenet config get models
```

### Enable debug logging

```bash
export LOG_LEVEL=debug
resolvenet agent run my-assistant
```

---

## Getting Help

- **Documentation**: Check the [docs/zh/](../zh/) directory for comprehensive Chinese documentation
- **Issues**: Report bugs on [GitHub Issues](https://github.com/ai-guru-global/resolve-net/issues)
- **Discussions**: Ask questions on [GitHub Discussions](https://github.com/ai-guru-global/resolve-net/discussions)
