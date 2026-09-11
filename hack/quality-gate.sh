#!/usr/bin/env bash
# =============================================================================
# ResolveAgent Quality Gate — Loop Engineering Checkpoint
# =============================================================================
# Validates code quality before merging. Aggregates lint, test, and coverage
# results into a single pass/fail verdict with actionable feedback.
# Usage: bash hack/quality-gate.sh
# =============================================================================

set -euo pipefail

# Go 工具链钉在与 CI（GO_VERSION=1.25）一致的版本：覆盖率插桩粒度随 Go 小版本变化
# （go1.25 对多行签名函数会漏插桩，go1.27 已修复），基线数字必须与度量工具链同源。
export GOTOOLCHAIN=go1.25.6

BASELINE_FILE="test/fixtures/baseline/coverage-baseline.json"

baseline_value() {
    python3 -c "import json; print(json.load(open('$BASELINE_FILE'))['loop_engineering']['$1'])"
}

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
        PASS=$((PASS+1))
    else
        echo -e "${RED}FAIL${NC}"
        FAIL=$((FAIL+1))
    fi
}

warn() {
    local name="$1"
    shift
    echo -n "  [$name] "
    if "$@" > /dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        PASS=$((PASS+1))
    else
        echo -e "${YELLOW}WARN${NC}"
        WARN=$((WARN+1))
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
    WARN=$((WARN+1))
fi

# Go test with coverage
echo -n "  [go-test] "
if go test -race -count=1 ./... > /tmp/gotest.out 2>&1; then
    echo -e "${GREEN}PASS${NC}"
    PASS=$((PASS+1))
else
    echo -e "${RED}FAIL${NC}"
    cat /tmp/gotest.out
    FAIL=$((FAIL+1))
fi

# Go coverage threshold (blocking, baseline-driven: test/fixtures/baseline/coverage-baseline.json)
GO_MIN=$(baseline_value "minimum_go_coverage")
echo -n "  [go-coverage>=${GO_MIN}%] "
if go test -count=1 -coverprofile=/tmp/gocover.out ./... > /dev/null 2>&1; then
    COVERAGE=$(go tool cover -func=/tmp/gocover.out 2>/dev/null | grep total | awk '{print $3}' | sed 's/%//')
    if [ -n "$COVERAGE" ] \
        && python3 -c "import sys; sys.exit(0 if float('$COVERAGE') >= float('$GO_MIN') else 1)"; then
        echo -e "${GREEN}${COVERAGE}%${NC}"
        PASS=$((PASS+1))
    else
        echo -e "${RED}FAIL (coverage ${COVERAGE:-N/A}% < threshold ${GO_MIN}%)${NC}"
        FAIL=$((FAIL+1))
    fi
else
    echo -e "${RED}FAIL (go test failed)${NC}"
    FAIL=$((FAIL+1))
fi

echo ""

# --- Stage 2: Python ---
echo "==> Python Quality Checks"
PYTHON_DIR="python"
if [ -d "$PYTHON_DIR" ]; then
    if command -v uv &> /dev/null; then
        check "py-ruff" bash -c "cd $PYTHON_DIR && uv run ruff check src/ tests/"
        check "py-format" bash -c "cd $PYTHON_DIR && uv run ruff format --check src/ tests/"

        # 覆盖率口径 = tests/unit：全量套件（tests/ 含集成类）已由 CI test-python 阶段把关，
        # 门禁追求快而确定。阈值来自 coverage-baseline.json，只升不降。
        PY_MIN=$(baseline_value "minimum_python_coverage")
        echo -n "  [py-test+coverage>=${PY_MIN}%] "
        PY_OUT=$(cd "$PYTHON_DIR" && uv run pytest tests/unit -q --tb=short --cov=resolveagent --cov-report=term 2>&1)
        PY_COV=$(echo "$PY_OUT" | grep -E "^TOTAL" | awk '{print $NF}' | sed 's/%//')
        if echo "$PY_OUT" | grep -qE "^[0-9]+ passed" \
            && [ -n "$PY_COV" ] \
            && python3 -c "import sys; sys.exit(0 if float('$PY_COV') >= float('$PY_MIN') else 1)"; then
            echo -e "${GREEN}${PY_COV}%${NC}"
            PASS=$((PASS+1))
        else
            echo -e "${RED}FAIL (coverage ${PY_COV:-N/A}% < threshold ${PY_MIN}% or tests failed)${NC}"
            echo "$PY_OUT" | grep -E "FAILED|ERROR" | head -5
            FAIL=$((FAIL+1))
        fi
    else
        echo -e "  ${YELLOW}SKIP${NC} (uv not installed)"
        WARN=$((WARN+1))
    fi
else
    echo -e "  ${YELLOW}SKIP${NC} (python/ not found)"
fi

echo ""

# --- Stage 3: Web ---
echo "==> Web Quality Checks"
WEB_DIR="web"
if [ -d "$WEB_DIR" ] && [ -d "$WEB_DIR/node_modules" ]; then
    check "web-lint" bash -c "cd $WEB_DIR && pnpm lint"
    check "web-test" bash -c "cd $WEB_DIR && pnpm test --passWithNoTests"
else
    echo -e "  ${YELLOW}SKIP${NC} (web dependencies not installed)"
    WARN=$((WARN+1))
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
