#!/usr/bin/env bash
# =============================================================================
# ResolveAgent Quality Gate — Loop Engineering Checkpoint
# =============================================================================
# Validates code quality before merging. Aggregates lint, test, and coverage
# results into a single pass/fail verdict with actionable feedback.
# Usage: bash hack/quality-gate.sh
# =============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check() {
    local name="$1"
    shift
    echo -n "  [$name] "
    if "$@" > /dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        ((PASS++))
    else
        echo -e "${RED}FAIL${NC}"
        ((FAIL++))
    fi
}

warn() {
    local name="$1"
    shift
    echo -n "  [$name] "
    if "$@" > /dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        ((PASS++))
    else
        echo -e "${YELLOW}WARN${NC}"
        ((WARN++))
    fi
}

echo "============================================="
echo " ResolveAgent Quality Gate"
echo " Loop Engineering Feedback Checkpoint"
echo "============================================="
echo ""

# --- Stage 1: Go ---
echo "==> Go Quality Checks"
check "go-vet" go vet ./...
check "go-build" go build ./...

# Check if golangci-lint is available
if command -v golangci-lint &> /dev/null; then
    check "go-lint" golangci-lint run ./...
else
    echo -e "  [go-lint] ${YELLOW}SKIP${NC} (golangci-lint not installed)"
    ((WARN++))
fi

# Go test with coverage
echo -n "  [go-test] "
if go test -race -count=1 ./... > /tmp/gotest.out 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    ((PASS++))
else
    echo -e "${RED}FAIL${NC}"
    cat /tmp/gotest.out
    ((FAIL++))
fi

# Go coverage threshold (non-blocking, informational)
echo -n "  [go-coverage] "
if go test -coverprofile=/tmp/gocover.out ./... > /dev/null 2>&1; then
    COVERAGE=$(go tool cover -func=/tmp/gocover.out 2>/dev/null | grep total | awk '{print $3}' | sed 's/%//')
    if [ -n "$COVERAGE" ]; then
        echo -e "${GREEN}${COVERAGE}%${NC}"
    else
        echo -e "${YELLOW}N/A${NC}"
        ((WARN++))
    fi
else
    echo -e "${YELLOW}SKIP${NC}"
    ((WARN++))
fi

echo ""

# --- Stage 2: Python ---
echo "==> Python Quality Checks"
PYTHON_DIR="python"
if [ -d "$PYTHON_DIR" ]; then
    if command -v uv &> /dev/null; then
        check "py-ruff" bash -c "cd $PYTHON_DIR && uv run ruff check src/ tests/"
        check "py-format" bash -c "cd $PYTHON_DIR && uv run ruff format --check src/ tests/"
        warn "py-test" bash -c "cd $PYTHON_DIR && uv run pytest tests/ -q --tb=short"
    else
        echo -e "  ${YELLOW}SKIP${NC} (uv not installed)"
        ((WARN++))
    fi
else
    echo -e "  ${YELLOW}SKIP${NC} (python/ not found)"
fi

echo ""

# --- Stage 3: Web ---
echo "==> Web Quality Checks"
WEB_DIR="web"
if [ -d "$WEB_DIR" ] && [ -d "$WEB_DIR/node_modules" ]; then
    warn "web-lint" bash -c "cd $WEB_DIR && pnpm lint"
    warn "web-test" bash -c "cd $WEB_DIR && pnpm test --passWithNoTests"
else
    echo -e "  ${YELLOW}SKIP${NC} (web dependencies not installed)"
    ((WARN++))
fi

echo ""

# --- Summary ---
echo "============================================="
echo " Quality Gate Summary"
echo "============================================="
echo -e "  Passed: ${GREEN}${PASS}${NC}"
echo -e "  Failed: ${RED}${FAIL}${NC}"
echo -e "  Warnings: ${YELLOW}${WARN}${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
    echo -e "${RED}QUALITY GATE FAILED${NC}"
    echo "  Fix the failing checks above before merging."
    exit 1
else
    echo -e "${GREEN}QUALITY GATE PASSED${NC}"
    echo "  All critical checks passed. Ready to merge."
    exit 0
fi
