#!/usr/bin/env bash
# =============================================================================
# ResolveAgent - Docker Deployment Script
# =============================================================================
# One-click deployment script for ResolveAgent platform.
#
# Usage:
#   ./deploy.sh              # Deploy full production stack
#   ./deploy.sh dev          # Deploy development stack (with hot reload)
#   ./deploy.sh deps         # Deploy infrastructure only
#   ./deploy.sh build        # Build images only
#   ./deploy.sh down         # Stop all services
#   ./deploy.sh logs         # Tail service logs
#   ./deploy.sh status       # Show service status
#   ./deploy.sh clean        # Stop and remove all data
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
COMPOSE_DIR="${PROJECT_ROOT}/deploy/docker-compose"

# Files
COMPOSE_FILE="${COMPOSE_DIR}/docker-compose.yaml"
COMPOSE_DEV_FILE="${COMPOSE_DIR}/docker-compose.dev.yaml"
ENV_FILE="${COMPOSE_DIR}/.env"
ENV_EXAMPLE="${COMPOSE_DIR}/.env.example"

# =============================================================================
# Helper Functions
# =============================================================================

log_info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

banner() {
    echo -e "${CYAN}"
    echo "  ╔══════════════════════════════════════════════╗"
    echo "  ║         ResolveAgent Docker Deploy           ║"
    echo "  ║      Mega Agent Platform Deployment          ║"
    echo "  ╚══════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_dependencies() {
    local missing=()
    command -v docker >/dev/null 2>&1 || missing+=("docker")
    command -v docker compose >/dev/null 2>&1 || {
        command -v docker-compose >/dev/null 2>&1 || missing+=("docker-compose")
    }

    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing required tools: ${missing[*]}"
        log_info "Please install Docker Desktop or Docker Engine with Compose plugin."
        exit 1
    fi

    # Check Docker daemon
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi

    log_ok "All dependencies satisfied."
}

ensure_env() {
    if [ ! -f "${ENV_FILE}" ]; then
        log_warn ".env file not found. Creating from .env.example..."
        cp "${ENV_EXAMPLE}" "${ENV_FILE}"
        log_info "Please review and edit: ${ENV_FILE}"
        log_info "At minimum, configure LLM API keys for your preferred provider."
    fi
}

compose_cmd() {
    docker compose --project-directory "${COMPOSE_DIR}" "$@"
}

# =============================================================================
# Commands
# =============================================================================

cmd_up() {
    banner
    check_dependencies
    ensure_env

    log_info "Starting ResolveAgent production stack..."
    compose_cmd -f "${COMPOSE_FILE}" up -d --build

    echo ""
    log_ok "ResolveAgent is starting up!"
    echo ""
    echo "  Services:"
    echo "    Web UI:     http://localhost:${WEBUI_PORT:-3000}"
    echo "    Platform:   http://localhost:${PLATFORM_HTTP_PORT:-8080}"
    echo "    gRPC:       localhost:${PLATFORM_GRPC_PORT:-9090}"
    echo "    Runtime:    localhost:${RUNTIME_GRPC_PORT:-9091}"
    echo ""
    echo "  Infrastructure:"
    echo "    PostgreSQL: localhost:${POSTGRES_PORT:-5432}"
    echo "    Redis:      localhost:${REDIS_PORT:-6379}"
    echo "    NATS:       localhost:${NATS_CLIENT_PORT:-4222}"
    echo "    NATS Mon:   http://localhost:${NATS_MONITOR_PORT:-8222}"
    echo ""
    log_info "Use './deploy.sh logs' to view service logs."
    log_info "Use './deploy.sh status' to check service health."
}

cmd_dev() {
    banner
    check_dependencies
    ensure_env

    log_info "Starting ResolveAgent development stack (hot reload enabled)..."
    compose_cmd -f "${COMPOSE_FILE}" -f "${COMPOSE_DEV_FILE}" up -d --build

    echo ""
    log_ok "Development stack is running!"
    echo ""
    echo "  Web UI (Vite): http://localhost:5173"
    echo "  Platform:      http://localhost:${PLATFORM_HTTP_PORT:-8080}"
    echo "  Runtime:       localhost:${RUNTIME_GRPC_PORT:-9091}"
    echo ""
    log_info "Source changes will trigger automatic reload."
}

cmd_deps() {
    banner
    check_dependencies

    log_info "Starting infrastructure dependencies only..."
    compose_cmd -f "${COMPOSE_FILE}" up -d postgres redis nats

    echo ""
    log_ok "Infrastructure services are running!"
    echo ""
    echo "  PostgreSQL: localhost:${POSTGRES_PORT:-5432}"
    echo "  Redis:      localhost:${REDIS_PORT:-6379}"
    echo "  NATS:       localhost:${NATS_CLIENT_PORT:-4222}"
}

cmd_build() {
    banner
    check_dependencies

    log_info "Building Docker images..."
    compose_cmd -f "${COMPOSE_FILE}" build

    log_ok "All images built successfully."
}

cmd_down() {
    log_info "Stopping ResolveAgent stack..."
    compose_cmd -f "${COMPOSE_FILE}" -f "${COMPOSE_DEV_FILE}" down 2>/dev/null || \
    compose_cmd -f "${COMPOSE_FILE}" down

    log_ok "All services stopped."
}

cmd_logs() {
    local service="${1:-}"
    if [ -n "${service}" ]; then
        compose_cmd -f "${COMPOSE_FILE}" logs -f "${service}"
    else
        compose_cmd -f "${COMPOSE_FILE}" logs -f
    fi
}

cmd_status() {
    banner
    echo "Service Status:"
    echo "==============="
    compose_cmd -f "${COMPOSE_FILE}" ps
    echo ""

    # Health checks
    echo "Health Checks:"
    echo "=============="
    for svc in platform runtime webui postgres redis nats; do
        local status
        status=$(docker inspect --format='{{.State.Health.Status}}' "resolveagent-${svc}" 2>/dev/null || echo "no-healthcheck")
        case "${status}" in
            healthy)     echo -e "  ${svc}: ${GREEN}healthy${NC}" ;;
            unhealthy)   echo -e "  ${svc}: ${RED}unhealthy${NC}" ;;
            starting)    echo -e "  ${svc}: ${YELLOW}starting${NC}" ;;
            *)           echo -e "  ${svc}: ${BLUE}${status}${NC}" ;;
        esac
    done
}

cmd_clean() {
    log_warn "This will stop all services and DELETE all data (volumes)!"
    read -rp "Are you sure? (y/N) " confirm
    if [[ "${confirm}" =~ ^[Yy]$ ]]; then
        log_info "Stopping and cleaning up..."
        compose_cmd -f "${COMPOSE_FILE}" -f "${COMPOSE_DEV_FILE}" down -v --remove-orphans 2>/dev/null || \
        compose_cmd -f "${COMPOSE_FILE}" down -v --remove-orphans
        log_ok "All services stopped and data removed."
    else
        log_info "Cancelled."
    fi
}

cmd_help() {
    banner
    echo "Usage: ./deploy.sh [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  (default)   Deploy full production stack"
    echo "  dev         Deploy development stack with hot reload"
    echo "  deps        Start infrastructure only (DB, Redis, NATS)"
    echo "  build       Build all Docker images"
    echo "  down        Stop all services"
    echo "  logs [svc]  Tail logs (optionally for specific service)"
    echo "  status      Show service status and health"
    echo "  clean       Stop all and remove volumes (DESTRUCTIVE)"
    echo "  help        Show this message"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh              # Production deployment"
    echo "  ./deploy.sh dev          # Development with hot reload"
    echo "  ./deploy.sh logs platform # Tail platform logs only"
    echo ""
}

# =============================================================================
# Main
# =============================================================================

# Source .env if exists for port variables
[ -f "${ENV_FILE}" ] && set -a && source "${ENV_FILE}" && set +a

case "${1:-}" in
    dev)     cmd_dev ;;
    deps)    cmd_deps ;;
    build)   cmd_build ;;
    down)    cmd_down ;;
    logs)    shift; cmd_logs "$@" ;;
    status)  cmd_status ;;
    clean)   cmd_clean ;;
    help|-h|--help) cmd_help ;;
    *)       cmd_up ;;
esac
