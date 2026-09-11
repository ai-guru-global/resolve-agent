#!/usr/bin/env bash
# 枚举 router.go 注册的 REST 路由，辅助 OpenAPI 人工核对与补全。
# 真正的契约把关在 pkg/server/openapi_contract_test.go，本脚本只做人工核对辅助。
set -euo pipefail
grep -oE '"(GET|POST|PUT|DELETE|PATCH) /[^"]*"' pkg/server/router.go | tr -d '"' | sort
