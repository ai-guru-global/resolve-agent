#!/usr/bin/env bash
# =============================================================================
# ResolveAgent - 本地一键启动脚本 (Hardened Edition)
# =============================================================================
# 用法:
#   ./scripts/start-local.sh              # 启动全部服务
#   ./scripts/start-local.sh deps         # 仅启动依赖服务
#   ./scripts/start-local.sh web          # 仅启动 WebUI 开发服务器
#   ./scripts/start-local.sh platform     # 仅启动 Go 平台服务
#   ./scripts/start-local.sh runtime      # 仅启动 Python Agent 运行时
#   ./scripts/start-local.sh status       # 查看服务状态 (含端口健康检查)
#   ./scripts/start-local.sh stop         # 停止全部服务 (含僵尸进程清理)
#   ./scripts/start-local.sh restart      # 完整停止 + 启动
#   ./scripts/start-local.sh logs [svc]   # 查看日志 (platform/runtime/webui/deps)
#   ./scripts/start-local.sh doctor       # 环境诊断与自动修复
# =============================================================================

set -euo pipefail

# ── 颜色与符号 ──────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
BOLD='\033[1m'
NC='\033[0m' # No Color

ok()   { echo -e "${GREEN}✔${NC} $*"; }
info() { echo -e "${BLUE}▸${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
fail() { echo -e "${RED}✘${NC} $*"; exit 1; }
dim()  { echo -e "${GRAY}  $*${NC}"; }

# ── 项目根目录 ──────────────────────────────────────────────────────────────
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

BIN_DIR="$ROOT_DIR/bin"
PYTHON_DIR="$ROOT_DIR/python"
WEB_DIR="$ROOT_DIR/web"
DEPLOY_DIR="$ROOT_DIR/deploy"
COMPOSE_DEPS="$DEPLOY_DIR/docker-compose/docker-compose.deps.yaml"
PID_DIR="$ROOT_DIR/.pids"
LOG_DIR="$PID_DIR"  # 日志与 PID 同目录

# ── 端口定义 (单一真相源) ──────────────────────────────────────────────────
PORT_PLATFORM=${RESOLVEAGENT_HTTP_PORT:-8080}
PORT_RUNTIME=${RESOLVEAGENT_RUNTIME_PORT:-9091}
PORT_GRPC=${RESOLVEAGENT_GRPC_PORT:-9090}
PORT_WEB=3000

# =============================================================================
# 工具函数
# =============================================================================

banner() {
  echo ""
  echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}${BOLD}║      ResolveAgent  Local  Launcher  v2       ║${NC}"
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
  set -a && source "$ROOT_DIR/.env" 2>/dev/null && set +a || true
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

# ── 端口级检测与清理 ─────────────────────────────────────────────────────────
get_port_pid() {
  # 获取监听指定端口的进程 PID
  local port=$1
  lsof -ti TCP:"$port" -sTCP:LISTEN 2>/dev/null | head -1
}

is_port_listening() {
  local port=$1
  [ -n "$(get_port_pid "$port")" ]
}

kill_port() {
  # 强制释放端口：先 SIGTERM，等 2 秒，若还在则 SIGKILL
  local port=$1 label=$2
  local pids
  pids=$(lsof -ti TCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if [ -z "$pids" ]; then
    return 0
  fi
  warn "端口 $port ($label) 被占用，清理中 (PID: $pids)..."
  echo "$pids" | xargs kill 2>/dev/null || true
  sleep 2
  # 复查
  pids=$(lsof -ti TCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
  ok "端口 $port 已释放"
}

# ── HTTP 健康探测 ─────────────────────────────────────────────────────────────
wait_http_healthy() {
  local url=$1 label=$2 timeout=${3:-30}
  local elapsed=0
  info "等待 $label 就绪 ($url)..."
  while [ $elapsed -lt $timeout ]; do
    if curl -sf --connect-timeout 2 --max-time 3 "$url" >/dev/null 2>&1; then
      ok "$label 已就绪 (${elapsed}s)"
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  warn "$label 未在 ${timeout}s 内就绪 — 请检查日志: $LOG_DIR"
  return 1
}

# =============================================================================
# Python 虚拟环境管理
# =============================================================================

ensure_python_venv() {
  local venv_dir="$PYTHON_DIR/.venv"
  local venv_python="$venv_dir/bin/python"
  local need_install=0

  # 1. 检查 venv 是否存在且可执行
  if [ ! -x "$venv_python" ]; then
    info "Python 虚拟环境不存在，正在创建..."
    if command -v uv &>/dev/null; then
      uv venv --clear "$venv_dir" 2>/dev/null
    else
      python3 -m venv "$venv_dir"
    fi
    need_install=1
  fi

  # 2. 健康检查：核心依赖是否可导入
  if [ $need_install -eq 0 ]; then
    if ! PYTHONPATH="$PYTHON_DIR/src" "$venv_python" -c "import uvicorn, fastapi" 2>/dev/null; then
      warn "Python 虚拟环境损坏（核心依赖缺失），正在修复..."
      need_install=1
    fi
  fi

  # 3. 检查 resolveagent 包是否可导入（Python 3.14 .pth 兼容性问题）
  if [ $need_install -eq 0 ]; then
    if ! PYTHONPATH="$PYTHON_DIR/src" "$venv_python" -c "import resolveagent" 2>/dev/null; then
      warn "resolveagent 包不可导入，正在重新安装..."
      need_install=1
    fi
  fi

  # 4. 安装依赖
  if [ $need_install -eq 1 ]; then
    info "安装 Python 依赖..."
    # 如果 venv 存在但损坏，先彻底重建
    if [ -d "$venv_dir" ] && ! PYTHONPATH="$PYTHON_DIR/src" "$venv_python" -c "import uvicorn" 2>/dev/null; then
      info "重建虚拟环境..."
      if command -v uv &>/dev/null; then
        uv venv --clear --python 3.14 "$venv_dir" 2>/dev/null
      else
        rm -rf "$venv_dir" && python3 -m venv "$venv_dir"
      fi
    fi
    if command -v uv &>/dev/null; then
      (cd "$PYTHON_DIR" && uv pip install --python "$venv_python" -e ".[rag]") 2>&1 | tail -3
    else
      (cd "$PYTHON_DIR" && "$venv_python" -m pip install -e ".[rag]") 2>&1 | tail -3
    fi
    # 验证安装
    if PYTHONPATH="$PYTHON_DIR/src" "$venv_python" -c "import uvicorn, fastapi, resolveagent" 2>/dev/null; then
      ok "Python 依赖安装成功"
    else
      fail "Python 依赖安装失败，请手动执行: cd python && uv pip install --python .venv/bin/python -e '.[rag]'"
    fi
  fi
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

  # 检查 PID 文件 + 实际进程
  local existing_pid
  existing_pid=$(read_pid platform)
  if is_running "$existing_pid"; then
    # 额外确认端口确实在监听
    if is_port_listening "$PORT_PLATFORM"; then
      ok "平台服务已在运行 (PID: $existing_pid, port: $PORT_PLATFORM)"
      return
    fi
  fi

  # 清理残留端口占用
  kill_port "$PORT_PLATFORM" "platform HTTP"
  kill_port "$PORT_GRPC" "platform gRPC"

  build_platform
  info "启动平台服务..."
  "$BIN_DIR/resolveagent-server" > "$LOG_DIR/platform.log" 2>&1 &
  local pid=$!
  save_pid platform "$pid"

  # 等待实际就绪
  if wait_http_healthy "http://localhost:$PORT_PLATFORM/api/v1/health" "Go 平台" 15; then
    ok "平台服务已启动 (PID: $pid)"
  else
    warn "平台服务进程已启动 (PID: $pid)，但健康检查未通过"
    dim "查看日志: tail -50 $LOG_DIR/platform.log"
  fi
  echo "  HTTP → http://localhost:$PORT_PLATFORM"
  echo "  gRPC → localhost:$PORT_GRPC"
  echo "  日志 → $LOG_DIR/platform.log"
  echo ""
}

# ── 启动 Python Agent 运行时 ──
start_runtime() {
  mkdir_pids

  # 检查 PID + 端口双重确认
  local existing_pid
  existing_pid=$(read_pid runtime)
  if is_running "$existing_pid" && is_port_listening "$PORT_RUNTIME"; then
    ok "Agent 运行时已在运行 (PID: $existing_pid, port: $PORT_RUNTIME)"
    return
  fi

  # 清理残留端口占用（解决僵尸进程问题）
  kill_port "$PORT_RUNTIME" "runtime"

  # 确保 Python 环境健康
  ensure_python_venv

  info "启动 Python Agent 运行时..."
  # 使用 PYTHONPATH=src 绕过 Python 3.14 的 .pth 文件兼容性问题
  PYTHONPATH="$PYTHON_DIR/src" "$PYTHON_DIR/.venv/bin/python" \
    -m resolveagent.runtime > "$LOG_DIR/runtime.log" 2>&1 &
  local pid=$!
  save_pid runtime "$pid"

  # 等待实际就绪
  if wait_http_healthy "http://localhost:$PORT_RUNTIME/health" "Agent 运行时" 20; then
    ok "Agent 运行时已启动 (PID: $pid)"
  else
    # 检查进程是否还活着
    if is_running "$pid"; then
      warn "运行时进程存活但端口未就绪，可能正在初始化"
    else
      warn "运行时进程已退出，请查看日志:"
      tail -20 "$LOG_DIR/runtime.log" 2>/dev/null | while read -r line; do
        dim "$line"
      done
    fi
  fi
  echo "  HTTP → http://localhost:$PORT_RUNTIME"
  echo "  日志 → $LOG_DIR/runtime.log"
  echo ""
}

# ── 启动 WebUI 开发服务器 ──
start_web() {
  mkdir_pids

  local existing_pid
  existing_pid=$(read_pid webui)
  if is_running "$existing_pid" && is_port_listening "$PORT_WEB"; then
    ok "WebUI 已在运行 (PID: $existing_pid, port: $PORT_WEB)"
    return
  fi

  # 清理残留端口占用
  kill_port "$PORT_WEB" "webui"

  info "启动 WebUI 开发服务器..."
  cd "$WEB_DIR"

  # 自动安装前端依赖
  if [ ! -d "node_modules" ]; then
    info "安装前端依赖..."
    if command -v pnpm &>/dev/null; then
      pnpm install
    elif command -v npm &>/dev/null; then
      npm install
    else
      fail "未找到 pnpm 或 npm，请先安装 Node.js 包管理器"
    fi
  fi

  # 选择包管理器启动
  if command -v pnpm &>/dev/null; then
    pnpm dev > "$LOG_DIR/webui.log" 2>&1 &
  else
    npm run dev > "$LOG_DIR/webui.log" 2>&1 &
  fi
  local pid=$!
  save_pid webui "$pid"
  cd "$ROOT_DIR"

  # 等待 Vite 就绪
  if wait_http_healthy "http://localhost:$PORT_WEB" "WebUI" 20; then
    ok "WebUI 已启动 (PID: $pid)"
  else
    if is_running "$pid"; then
      ok "WebUI 进程已启动 (PID: $pid)，Vite 可能仍在编译中"
    else
      warn "WebUI 进程已退出"
    fi
  fi
  echo "  URL  → http://localhost:$PORT_WEB"
  echo "  日志 → $LOG_DIR/webui.log"
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

  # ── 最终状态总结 ──
  echo ""
  echo -e "${BOLD}════════════════ 启动结果 ════════════════${NC}"
  local all_ok=1
  for pair in "platform:$PORT_PLATFORM" "runtime:$PORT_RUNTIME" "webui:$PORT_WEB"; do
    local svc=${pair%%:*}
    local port=${pair##*:}
    if is_port_listening "$port"; then
      echo -e "  ${GREEN}●${NC} $svc  → localhost:$port"
    else
      echo -e "  ${RED}●${NC} $svc  → localhost:$port ${RED}(未就绪)${NC}"
      all_ok=0
    fi
  done
  echo -e "${BOLD}══════════════════════════════════════════${NC}"

  if [ $all_ok -eq 1 ]; then
    echo ""
    echo -e "${GREEN}${BOLD}  ✔ 全部服务已就绪！${NC}"
  else
    echo ""
    echo -e "${YELLOW}${BOLD}  ⚠ 部分服务未就绪 — 运行 doctor 子命令诊断:${NC}"
    echo "    ./scripts/start-local.sh doctor"
  fi
  echo ""
  echo "  WebUI      → http://localhost:$PORT_WEB"
  echo "  Platform   → http://localhost:$PORT_PLATFORM"
  echo "  Runtime    → http://localhost:$PORT_RUNTIME"
  echo "  PostgreSQL → localhost:5432"
  echo "  Redis      → localhost:6379"
  echo ""
  echo "  停止服务:  ./scripts/start-local.sh stop"
  echo "  重启服务:  ./scripts/start-local.sh restart"
  echo "  查看状态:  ./scripts/start-local.sh status"
  echo "  诊断修复:  ./scripts/start-local.sh doctor"
  echo ""
}

# ── 停止全部服务 ──
stop_all() {
  info "停止全部服务..."

  # 1. 先按 PID 文件停止已知进程
  for svc in platform runtime webui; do
    local pid
    pid=$(read_pid "$svc")
    if is_running "$pid"; then
      kill "$pid" 2>/dev/null && ok "已停止 $svc (PID: $pid)" || warn "停止 $svc 失败"
    fi
    rm -f "$PID_DIR/$svc.pid"
  done

  sleep 1

  # 2. 按端口清理残留进程（处理 PID 文件与实际进程不一致的情况）
  for pair in "platform:$PORT_PLATFORM" "runtime:$PORT_RUNTIME" "webui:$PORT_WEB"; do
    local svc=${pair%%:*}
    local port=${pair##*:}
    local leftover
    leftover=$(get_port_pid "$port")
    if [ -n "$leftover" ]; then
      warn "$svc 残留进程 (PID: $leftover, port: $port)，强制终止..."
      kill -9 "$leftover" 2>/dev/null || true
    fi
  done

  # 3. 停止 Docker 依赖
  if docker info &>/dev/null 2>&1; then
    info "停止 Docker 依赖服务..."
    docker compose -f "$COMPOSE_DEPS" down 2>/dev/null || true
    ok "Docker 依赖服务已停止"
  fi

  ok "全部服务已停止"
}

# ── 重启 ──
restart_all() {
  stop_all
  echo ""
  sleep 2
  start_all
}

# ── 服务状态 (增强版：PID + 端口 + HTTP 探测) ──
show_status() {
  echo ""
  echo -e "${BOLD}ResolveAgent 服务状态${NC}"
  echo "────────────────────────────────────────────────────"

  # 本地服务
  for triple in "platform:$PORT_PLATFORM:http://localhost:$PORT_PLATFORM/api/v1/health" \
                "runtime:$PORT_RUNTIME:http://localhost:$PORT_RUNTIME/health" \
                "webui:$PORT_WEB:http://localhost:$PORT_WEB"; do
    local svc=${triple%%:*}
    local rest=${triple#*:}
    local port=${rest%%:*}
    local health_url=${rest#*:}
    local pid
    pid=$(read_pid "$svc")
    local port_pid
    port_pid=$(get_port_pid "$port")
    local http_ok=false

    # HTTP 探测
    if curl -sf --connect-timeout 2 --max-time 3 "$health_url" >/dev/null 2>&1; then
      http_ok=true
    fi

    if [ "$http_ok" = true ]; then
      local actual_pid=${port_pid:-$pid}
      echo -e "  ${GREEN}●${NC} $svc  port:$port  PID:${actual_pid:--}  ${GREEN}healthy${NC}"
    elif [ -n "$port_pid" ]; then
      echo -e "  ${YELLOW}●${NC} $svc  port:$port  PID:$port_pid  ${YELLOW}端口占用但未响应${NC}"
    elif is_running "$pid"; then
      echo -e "  ${YELLOW}●${NC} $svc  port:$port  PID:$pid  ${YELLOW}进程存活但端口未监听${NC}"
    else
      echo -e "  ${RED}●${NC} $svc  port:$port  ${RED}未运行${NC}"
    fi
  done

  echo "────────────────────────────────────────────────────"

  # Docker 容器
  if docker info &>/dev/null 2>&1; then
    for svc in postgres redis nats milvus; do
      local state
      state=$(docker compose -f "$COMPOSE_DEPS" ps --format '{{.State}}' "$svc" 2>/dev/null || echo "stopped")
      if [ "$state" = "running" ]; then
        echo -e "  ${GREEN}●${NC} $svc  ${GREEN}docker: running${NC}"
      else
        echo -e "  ${RED}●${NC} $svc  ${RED}docker: ${state:-stopped}${NC}"
      fi
    done
  else
    echo -e "  ${RED}●${NC} Docker 未运行"
  fi

  echo ""
}

# ── 查看日志 ──
show_logs() {
  local target=${1:-deps}
  case "$target" in
    platform)
      tail -100f "$LOG_DIR/platform.log" 2>/dev/null || fail "无平台日志"
      ;;
    runtime)
      tail -100f "$LOG_DIR/runtime.log" 2>/dev/null || fail "无运行时日志"
      ;;
    webui|web)
      tail -100f "$LOG_DIR/webui.log" 2>/dev/null || fail "无 WebUI 日志"
      ;;
    deps|docker)
      if docker info &>/dev/null 2>&1; then
        docker compose -f "$COMPOSE_DEPS" logs -f
      else
        fail "Docker 未运行"
      fi
      ;;
    all)
      tail -100f "$LOG_DIR/platform.log" "$LOG_DIR/runtime.log" "$LOG_DIR/webui.log" 2>/dev/null || true
      ;;
    *)
      echo "用法: $0 logs {platform|runtime|webui|deps|all}"
      exit 1
      ;;
  esac
}

# ── 环境诊断与自动修复 ──
run_doctor() {
  echo ""
  echo -e "${BOLD}🩺 ResolveAgent 环境诊断${NC}"
  echo "════════════════════════════════════════════════════"
  local issues=0

  # 1. Docker
  echo -e "\n${BOLD}[Docker]${NC}"
  if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
    ok "Docker 可用"
  else
    warn "Docker 不可用"
    issues=$((issues + 1))
  fi

  # 2. Go
  echo -e "\n${BOLD}[Go]${NC}"
  if command -v go &>/dev/null; then
    ok "Go $(go version | awk '{print $3}')"
  else
    warn "Go 未安装"
    issues=$((issues + 1))
  fi

  # 3. Node.js
  echo -e "\n${BOLD}[Node.js]${NC}"
  if command -v node &>/dev/null; then
    ok "Node.js $(node --version)"
  else
    warn "Node.js 未安装"
    issues=$((issues + 1))
  fi

  # 4. Python 虚拟环境
  echo -e "\n${BOLD}[Python Runtime]${NC}"
  local venv_python="$PYTHON_DIR/.venv/bin/python"
  if [ -x "$venv_python" ]; then
    local py_ver
    py_ver=$("$venv_python" --version 2>&1 || echo "unknown")
    ok "venv 存在 ($py_ver)"

    # 核心依赖
    if PYTHONPATH="$PYTHON_DIR/src" "$venv_python" -c "import uvicorn, fastapi" 2>/dev/null; then
      ok "核心依赖 (uvicorn, fastapi) 正常"
    else
      warn "核心依赖缺失 — 自动修复中..."
      ensure_python_venv
      issues=$((issues + 1))
    fi

    # resolveagent 包
    if PYTHONPATH="$PYTHON_DIR/src" "$venv_python" -c "import resolveagent" 2>/dev/null; then
      ok "resolveagent 包可导入 (PYTHONPATH 模式)"
    else
      warn "resolveagent 不可导入 — 需要 PYTHONPATH=src"
      issues=$((issues + 1))
    fi

    # __main__.py
    if [ -f "$PYTHON_DIR/src/resolveagent/runtime/__main__.py" ]; then
      ok "runtime __main__.py 存在"
    else
      warn "runtime __main__.py 缺失"
      issues=$((issues + 1))
    fi
  else
    warn "Python 虚拟环境不存在 — 自动创建中..."
    ensure_python_venv
    issues=$((issues + 1))
  fi

  # 5. 端口冲突
  echo -e "\n${BOLD}[端口检查]${NC}"
  for pair in "Platform:$PORT_PLATFORM" "Runtime:$PORT_RUNTIME" "gRPC:$PORT_GRPC" "WebUI:$PORT_WEB"; do
    local label=${pair%%:*}
    local port=${pair##*:}
    local occ_pid
    occ_pid=$(get_port_pid "$port")
    if [ -n "$occ_pid" ]; then
      local cmd_name
      cmd_name=$(ps -p "$occ_pid" -o comm= 2>/dev/null || echo "unknown")
      warn "$label (port $port) 被 PID $occ_pid ($cmd_name) 占用"
    else
      ok "$label (port $port) 空闲"
    fi
  done

  # 6. .env
  echo -e "\n${BOLD}[配置]${NC}"
  if [ -f "$ROOT_DIR/.env" ]; then
    ok ".env 文件存在"
    # 检查关键配置
    local has_key=false
    for key in RESOLVEAGENT_LLM_QWEN_API_KEY RESOLVEAGENT_LLM_WENXIN_API_KEY RESOLVEAGENT_LLM_ZHIPU_API_KEY KIMI_API_KEY OPENAI_API_KEY; do
      local val
      val=$(grep "^${key}=" "$ROOT_DIR/.env" 2>/dev/null | cut -d= -f2-)
      if [ -n "$val" ] && [ "$val" != '""' ] && [ "$val" != "''" ]; then
        has_key=true
        break
      fi
    done
    if [ "$has_key" = true ]; then
      ok "至少一个 LLM API Key 已配置"
    else
      warn "未检测到 LLM API Key — Playground 对话可能失败"
      issues=$((issues + 1))
    fi
  else
    warn ".env 文件不存在"
    issues=$((issues + 1))
  fi

  # 总结
  echo ""
  echo "════════════════════════════════════════════════════"
  if [ $issues -eq 0 ]; then
    echo -e "${GREEN}${BOLD}  ✔ 环境正常，无需修复${NC}"
  else
    echo -e "${YELLOW}${BOLD}  ⚠ 发现 $issues 个问题（已尝试自动修复可修复项）${NC}"
  fi
  echo ""
}

# =============================================================================
# 入口
# =============================================================================

CMD="${1:-all}"
SUB="${2:-}"

case "$CMD" in
  all|start)   start_all ;;
  deps)        check_docker && start_deps && wait_deps ;;
  platform)    ensure_env && start_platform ;;
  runtime)     ensure_env && start_runtime ;;
  web|webui)   start_web ;;
  status)      show_status ;;
  stop)        stop_all ;;
  restart)     ensure_env && restart_all ;;
  logs)        show_logs "$SUB" ;;
  doctor)      ensure_env && run_doctor ;;
  *)
    echo "用法: $0 {all|deps|platform|runtime|web|status|stop|restart|logs|doctor}"
    exit 1
    ;;
esac
