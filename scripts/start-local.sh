#!/usr/bin/env bash
# =============================================================================
# ResolveAgent - 本地一键启动脚本
# =============================================================================
# 用法:
#   ./scripts/start-local.sh              # 启动全部服务
#   ./scripts/start-local.sh deps         # 仅启动依赖服务
#   ./scripts/start-local.sh web          # 仅启动 WebUI 开发服务器
#   ./scripts/start-local.sh platform     # 仅启动 Go 平台服务
#   ./scripts/start-local.sh runtime      # 仅启动 Python Agent 运行时
#   ./scripts/start-local.sh status       # 查看服务状态
#   ./scripts/start-local.sh stop         # 停止全部服务
#   ./scripts/start-local.sh logs         # 查看依赖服务日志
# =============================================================================

set -euo pipefail

# ── 颜色与符号 ──────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

ok()   { echo -e "${GREEN}✔${NC} $*"; }
info() { echo -e "${BLUE}▸${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
fail() { echo -e "${RED}✘${NC} $*"; exit 1; }

# ── 项目根目录 ──────────────────────────────────────────────────────────────
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

BIN_DIR="$ROOT_DIR/bin"
PYTHON_DIR="$ROOT_DIR/python"
WEB_DIR="$ROOT_DIR/web"
DEPLOY_DIR="$ROOT_DIR/deploy"
COMPOSE_DEPS="$DEPLOY_DIR/docker-compose/docker-compose.deps.yaml"
COMPOSE_FULL="$DEPLOY_DIR/docker-compose/docker-compose.yaml"
PID_DIR="$ROOT_DIR/.pids"

# =============================================================================
# 工具函数
# =============================================================================

banner() {
  echo ""
  echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}${BOLD}║       ResolveAgent  Local  Launcher          ║${NC}"
  echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
  echo ""
}

ensure_env() {
  if [ ! -f "$ROOT_DIR/.env" ]; then
    info "未检测到 .env 文件，从 .env.example 复制..."
    cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    ok "已创建 .env — 请按需修改 LLM API Key 等配置"
  fi
  # shellcheck disable=SC2046
  set -a && source "$ROOT_DIR/.env" && set +a
}

check_docker() {
  if ! command -v docker &>/dev/null; then
    fail "未找到 docker 命令，请先安装 Docker Desktop"
  fi
  if ! docker info &>/dev/null 2>&1; then
    warn "Docker 守护进程未运行，正在尝试启动 Docker Desktop..."
    open -a Docker 2>/dev/null || true
    local retries=0
    while ! docker info &>/dev/null 2>&1; do
      retries=$((retries + 1))
      if [ $retries -ge 30 ]; then
        fail "等待 Docker 启动超时（60s），请手动启动 Docker Desktop 后重试"
      fi
      sleep 2
    done
    ok "Docker Desktop 已启动"
  fi
}

check_prereqs() {
  local missing=0
  command -v go   &>/dev/null || { warn "未找到 Go (需要 >= 1.22)";   missing=1; }
  command -v node &>/dev/null || { warn "未找到 Node.js (需要 >= 20)"; missing=1; }
  [ $missing -eq 1 ] && warn "部分工具缺失，某些服务可能无法启动"
}

mkdir_pids() {
  mkdir -p "$PID_DIR"
}

save_pid() {
  local name=$1 pid=$2
  echo "$pid" > "$PID_DIR/$name.pid"
}

read_pid() {
  local name=$1
  local pidfile="$PID_DIR/$name.pid"
  if [ -f "$pidfile" ]; then
    cat "$pidfile"
  fi
}

is_running() {
  local pid=$1
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

# =============================================================================
# 子命令实现
# =============================================================================

# ── 启动依赖服务 (PostgreSQL / Redis / NATS / Milvus) ──
start_deps() {
  info "启动基础依赖服务..."
  check_docker
  docker compose -f "$COMPOSE_DEPS" up -d
  ok "依赖服务已启动"
  echo ""
  echo "  PostgreSQL  → localhost:5432"
  echo "  Redis       → localhost:6379"
  echo "  NATS        → localhost:4222 (monitor: 8222)"
  echo "  Milvus      → localhost:19530"
  echo ""
}

# ── 等待依赖就绪 ──
wait_deps() {
  info "等待 PostgreSQL 就绪..."
  local retries=0
  while ! docker compose -f "$COMPOSE_DEPS" exec -T postgres pg_isready -U resolveagent &>/dev/null 2>&1; do
    retries=$((retries + 1))
    if [ $retries -ge 15 ]; then
      warn "PostgreSQL 未在 30s 内就绪，继续启动（服务可能暂时不可用）"
      return
    fi
    sleep 2
  done
  ok "PostgreSQL 已就绪"

  info "等待 Redis 就绪..."
  retries=0
  while ! docker compose -f "$COMPOSE_DEPS" exec -T redis redis-cli ping &>/dev/null 2>&1; do
    retries=$((retries + 1))
    if [ $retries -ge 10 ]; then
      warn "Redis 未在 20s 内就绪"
      return
    fi
    sleep 2
  done
  ok "Redis 已就绪"
}

# ── 构建 Go 平台服务 ──
build_platform() {
  info "编译 Go 平台服务..."
  local VERSION
  VERSION=$(git describe --tags --always --dirty 2>/dev/null || cat VERSION 2>/dev/null || echo "dev")
  local COMMIT
  COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  local BUILD_DATE
  BUILD_DATE=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
  local MODULE="github.com/ai-guru-global/resolve-agent"

  mkdir -p "$BIN_DIR"
  go build \
    -ldflags "-X ${MODULE}/pkg/version.Version=${VERSION} -X ${MODULE}/pkg/version.Commit=${COMMIT} -X ${MODULE}/pkg/version.BuildDate=${BUILD_DATE}" \
    -o "$BIN_DIR/resolveagent-server" \
    ./cmd/resolveagent-server
  ok "平台服务编译完成 → $BIN_DIR/resolveagent-server"
}

# ── 启动 Go 平台服务 ──
start_platform() {
  mkdir_pids
  local existing_pid
  existing_pid=$(read_pid platform)
  if is_running "$existing_pid"; then
    warn "平台服务已在运行 (PID: $existing_pid)"
    return
  fi

  build_platform
  info "启动平台服务..."
  "$BIN_DIR/resolveagent-server" > "$ROOT_DIR/.pids/platform.log" 2>&1 &
  local pid=$!
  save_pid platform "$pid"
  ok "平台服务已启动 (PID: $pid)"
  echo "  HTTP → http://localhost:${RESOLVEAGENT_HTTP_ADDR:-8080}"
  echo "  gRPC → localhost:${RESOLVEAGENT_GRPC_ADDR:-9090}"
  echo "  日志 → $PID_DIR/platform.log"
  echo ""
}

# ── 启动 Python Agent 运行时 ──
start_runtime() {
  mkdir_pids
  local existing_pid
  existing_pid=$(read_pid runtime)
  if is_running "$existing_pid"; then
    warn "Agent 运行时已在运行 (PID: $existing_pid)"
    return
  fi

  info "启动 Python Agent 运行时..."
  cd "$PYTHON_DIR"
  if command -v uv &>/dev/null; then
    uv run python -m resolveagent.runtime > "$PID_DIR/runtime.log" 2>&1 &
  else
    python3 -m resolveagent.runtime > "$PID_DIR/runtime.log" 2>&1 &
  fi
  local pid=$!
  save_pid runtime "$pid"
  cd "$ROOT_DIR"
  ok "Agent 运行时已启动 (PID: $pid)"
  echo "  gRPC → localhost:${RESOLVEAGENT_RUNTIME_GRPC_ADDR:-9091}"
  echo "  日志 → $PID_DIR/runtime.log"
  echo ""
}

# ── 启动 WebUI 开发服务器 ──
start_web() {
  mkdir_pids
  local existing_pid
  existing_pid=$(read_pid webui)
  if is_running "$existing_pid"; then
    warn "WebUI 开发服务器已在运行 (PID: $existing_pid)"
    return
  fi

  info "启动 WebUI 开发服务器..."
  cd "$WEB_DIR"
  if [ ! -d "node_modules" ]; then
    info "安装前端依赖..."
    pnpm install
  fi
  pnpm dev > "$PID_DIR/webui.log" 2>&1 &
  local pid=$!
  save_pid webui "$pid"
  cd "$ROOT_DIR"
  ok "WebUI 开发服务器已启动 (PID: $pid)"
  echo "  URL  → http://localhost:3000"
  echo "  日志 → $PID_DIR/webui.log"
  echo ""
}

# ── 启动全部服务 ──
start_all() {
  banner
  ensure_env
  check_prereqs

  echo -e "${BOLD}[1/5] 启动依赖服务${NC}"
  start_deps

  echo -e "${BOLD}[2/5] 等待依赖就绪${NC}"
  wait_deps

  echo -e "${BOLD}[3/5] 启动平台服务${NC}"
  start_platform

  echo -e "${BOLD}[4/5] 启动 Agent 运行时${NC}"
  start_runtime

  echo -e "${BOLD}[5/5] 启动 WebUI${NC}"
  start_web

  echo -e "${GREEN}${BOLD}══════════════════════════════════════════════${NC}"
  echo -e "${GREEN}${BOLD}  全部服务已启动！${NC}"
  echo -e "${GREEN}${BOLD}══════════════════════════════════════════════${NC}"
  echo ""
  echo "  WebUI      → http://localhost:3000"
  echo "  Platform   → http://localhost:8080"
  echo "  gRPC       → localhost:9090"
  echo "  Runtime    → localhost:9091"
  echo "  PostgreSQL → localhost:5432"
  echo "  Redis      → localhost:6379"
  echo "  NATS       → localhost:4222"
  echo ""
  echo "  停止服务:  ./scripts/start-local.sh stop"
  echo "  查看状态:  ./scripts/start-local.sh status"
  echo "  查看日志:  ./scripts/start-local.sh logs"
  echo ""
}

# ── 停止全部服务 ──
stop_all() {
  info "停止全部服务..."

  # 停止本地进程
  for svc in platform runtime webui; do
    local pid
    pid=$(read_pid "$svc")
    if is_running "$pid"; then
      kill "$pid" 2>/dev/null && ok "已停止 $svc (PID: $pid)" || warn "停止 $svc 失败"
      rm -f "$PID_DIR/$svc.pid"
    else
      rm -f "$PID_DIR/$svc.pid"
    fi
  done

  # 停止 Docker 依赖
  if docker info &>/dev/null 2>&1; then
    info "停止 Docker 依赖服务..."
    docker compose -f "$COMPOSE_DEPS" down 2>/dev/null || true
    ok "Docker 依赖服务已停止"
  fi

  ok "全部服务已停止"
}

# ── 服务状态 ──
show_status() {
  echo ""
  echo -e "${BOLD}ResolveAgent 服务状态${NC}"
  echo "────────────────────────────────────────"

  # 本地进程
  for svc in platform runtime webui; do
    local pid
    pid=$(read_pid "$svc")
    if is_running "$pid"; then
      echo -e "  ${GREEN}●${NC} $svc (PID: $pid)"
    else
      echo -e "  ${RED}●${NC} $svc (未运行)"
    fi
  done

  echo "────────────────────────────────────────"

  # Docker 容器
  if docker info &>/dev/null 2>&1; then
    for svc in postgres redis nats milvus; do
      local state
      state=$(docker compose -f "$COMPOSE_DEPS" ps --format '{{.State}}' "$svc" 2>/dev/null || echo "stopped")
      if [ "$state" = "running" ]; then
        echo -e "  ${GREEN}●${NC} $svc (docker: running)"
      else
        echo -e "  ${RED}●${NC} $svc (docker: $state)"
      fi
    done
  else
    echo -e "  ${RED}●${NC} Docker 未运行"
  fi

  echo ""
}

# ── 查看日志 ──
show_logs() {
  if docker info &>/dev/null 2>&1; then
    docker compose -f "$COMPOSE_DEPS" logs -f
  else
    fail "Docker 未运行"
  fi
}

# =============================================================================
# 入口
# =============================================================================

CMD="${1:-all}"

case "$CMD" in
  all|start)   start_all ;;
  deps)        check_docker && start_deps && wait_deps ;;
  platform)    ensure_env && start_platform ;;
  runtime)     ensure_env && start_runtime ;;
  web|webui)   start_web ;;
  status)      show_status ;;
  stop)        stop_all ;;
  logs)        show_logs ;;
  *)
    echo "用法: $0 {all|deps|platform|runtime|web|status|stop|logs}"
    exit 1
    ;;
esac
