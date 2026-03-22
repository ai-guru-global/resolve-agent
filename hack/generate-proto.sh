#!/usr/bin/env bash
set -euo pipefail

echo "==> Generating protobuf code..."

# Check for buf
if ! command -v buf &> /dev/null; then
  echo "Error: buf CLI is required. Install from https://buf.build/docs/installation"
  exit 1
fi

cd "$(git rev-parse --show-toplevel)"

buf generate --config tools/buf/buf.yaml --template tools/buf/buf.gen.yaml api/proto

echo "==> Protobuf generation complete."
