#!/usr/bin/env bash
set -euo pipefail

echo "==> Setting up ResolveNet development environment..."

cd "$(git rev-parse --show-toplevel)"

# Check prerequisites
echo "Checking prerequisites..."

command -v go &> /dev/null || { echo "Error: Go is required (>= 1.22)"; exit 1; }
command -v python3 &> /dev/null || { echo "Error: Python 3 is required (>= 3.11)"; exit 1; }
command -v node &> /dev/null || { echo "Error: Node.js is required (>= 20)"; exit 1; }

echo "Go: $(go version)"
echo "Python: $(python3 --version)"
echo "Node: $(node --version)"

# Install Go dependencies
echo "Installing Go dependencies..."
go mod download

# Set up Python environment
echo "Setting up Python environment..."
cd python
if command -v uv &> /dev/null; then
  uv sync --extra dev
else
  echo "Installing uv..."
  pip install uv
  uv sync --extra dev
fi
cd ..

# Set up WebUI
echo "Setting up WebUI..."
cd web
if command -v pnpm &> /dev/null; then
  pnpm install
else
  npm install -g pnpm
  pnpm install
fi
cd ..

# Create local config
if [ ! -f "$HOME/.resolvenet/config.yaml" ]; then
  mkdir -p "$HOME/.resolvenet"
  cp configs/resolvenet.yaml "$HOME/.resolvenet/config.yaml"
  echo "Created default config at ~/.resolvenet/config.yaml"
fi

echo ""
echo "==> Development environment ready!"
echo ""
echo "Quick start:"
echo "  make compose-deps  # Start dependencies (PostgreSQL, Redis, NATS)"
echo "  make build          # Build all components"
echo "  make test           # Run all tests"
echo "  make lint           # Run all linters"
