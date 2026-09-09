# ResolveAgent Quickstart Example

This example demonstrates how to run ResolveAgent locally with Docker Compose,
register an agent, and execute a simple workflow.

## Prerequisites

- Docker & Docker Compose
- `resolveagent` CLI (or `curl`)

## Steps

### 1. Start the stack

```bash
cd deploy/docker-compose
cp .env.example .env
docker compose -f docker-compose.deps.yaml up -d
docker compose -f docker-compose.yaml up -d
```

### 2. Register an agent

```bash
resolveagent agent create quickstart-agent -f examples/quickstart/agent.yaml
```

### 3. Run a workflow

```bash
# Create the workflow from its definition file
resolveagent workflow create quickstart-diagnosis -f examples/quickstart/workflow.yaml

# Run it using the ID printed by the create command
resolveagent workflow run <workflow-id>
```

## Files

- `agent.yaml` - Sample agent configuration
- `workflow.yaml` - Sample FTA workflow
