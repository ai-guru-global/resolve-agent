#!/usr/bin/env bash
# =============================================================================
# ResolveAgent Coverage Report — Loop Engineering Test Feedback
# =============================================================================
# Generates a unified coverage report across Go and Python, tracking
# trends over time to close the "test -> analyze -> improve" loop.
# Usage: bash hack/coverage-report.sh
# =============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REPORT_DIR="$ROOT_DIR/test/fixtures/baseline"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

mkdir -p "$REPORT_DIR"

echo "=== ResolveAgent Coverage Report ==="
echo "Timestamp: $TIMESTAMP"
echo ""

# --- Go Coverage ---
echo "==> Go Coverage"
cd "$ROOT_DIR"
if go test -coverprofile=/tmp/coverage-go.out ./... > /dev/null 2>&1; then
    GO_COVERAGE=$(go tool cover -func=/tmp/coverage-go.out 2>/dev/null | grep total | awk '{print $3}' | sed 's/%//')
    echo "  Total: ${GO_COVERAGE:-N/A}%"

    # Generate HTML report
    go tool cover -html=/tmp/coverage-go.out -o /tmp/coverage-go.html 2>/dev/null || true
    echo "  HTML report: /tmp/coverage-go.html"
else
    GO_COVERAGE="0"
    echo "  ERROR: Go tests failed"
fi

echo ""

# --- Python Coverage ---
echo "==> Python Coverage"
cd "$ROOT_DIR/python"
PY_COVERAGE="0"
if command -v uv &> /dev/null; then
    if uv run pytest tests/ -q --cov=resolveagent --cov-report=term-missing 2>/dev/null | tail -1; then
        PY_COVERAGE=$(uv run pytest tests/ -q --cov=resolveagent 2>/dev/null | grep -oP '\d+%' | tail -1 | sed 's/%//' || echo "0")
    fi
    echo "  Total: ${PY_COVERAGE:-N/A}%"
else
    echo "  SKIP: uv not installed"
fi

echo ""

# --- Write baseline snapshot ---
echo "==> Writing Baseline Snapshot"
cat > "$REPORT_DIR/coverage-baseline.json" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "go_coverage_percent": ${GO_COVERAGE:-0},
  "python_coverage_percent": ${PY_COVERAGE:-0},
  "loop_engineering": {
    "description": "Coverage baseline for the test-analyze-improve feedback loop",
    "minimum_go_coverage": 50,
    "minimum_python_coverage": 60,
    "trend_tracking": true
  }
}
EOF

echo "  Baseline saved to: $REPORT_DIR/coverage-baseline.json"
echo ""
echo "=== Coverage Report Complete ==="
