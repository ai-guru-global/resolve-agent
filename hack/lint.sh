#!/usr/bin/env bash
set -euo pipefail

echo "==> Running all linters..."

cd "$(git rev-parse --show-toplevel)"

echo "--- Go ---"
golangci-lint run ./...

echo "--- Python ---"
cd python
uv run ruff check src/ tests/
uv run ruff format --check src/ tests/
cd ..

echo "--- Proto ---"
buf lint --config tools/buf/buf.yaml api/proto

echo "==> All linters passed."
