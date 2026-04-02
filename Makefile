# =============================================================================
# ResolveAgent - Unified Build System
# =============================================================================

.DEFAULT_GOAL := help

# Project metadata
PROJECT_NAME := resolveagent
MODULE := github.com/ai-guru-global/resolve-agent
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
COMMIT := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_DATE := $(shell date -u '+%Y-%m-%dT%H:%M:%SZ')

# Directories
ROOT_DIR := $(shell pwd)
BIN_DIR := $(ROOT_DIR)/bin
PYTHON_DIR := $(ROOT_DIR)/python
WEB_DIR := $(ROOT_DIR)/web
DEPLOY_DIR := $(ROOT_DIR)/deploy
PROTO_DIR := $(ROOT_DIR)/api/proto

# Go build flags
GO_LDFLAGS := -ldflags "\
	-X $(MODULE)/pkg/version.Version=$(VERSION) \
	-X $(MODULE)/pkg/version.Commit=$(COMMIT) \
	-X $(MODULE)/pkg/version.BuildDate=$(BUILD_DATE)"
GO_BUILD := go build $(GO_LDFLAGS)

# Docker
DOCKER_REGISTRY ?= ghcr.io/ai-guru-global
DOCKER_TAG ?= $(VERSION)

# =============================================================================
# Help
# =============================================================================

.PHONY: help
help: ## Show this help message
	@echo "ResolveAgent - Mega Agent Platform"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# =============================================================================
# Build
# =============================================================================

.PHONY: build build-go build-python build-web

build: build-go build-python build-web ## Build all components

build-go: ## Build Go binaries
	@echo "==> Building Go binaries..."
	@mkdir -p $(BIN_DIR)
	$(GO_BUILD) -o $(BIN_DIR)/resolveagent-server ./cmd/resolveagent-server
	$(GO_BUILD) -o $(BIN_DIR)/resolveagent ./cmd/resolveagent-cli

build-python: ## Build Python package
	@echo "==> Building Python package..."
	cd $(PYTHON_DIR) && uv sync

build-web: ## Build WebUI
	@echo "==> Building WebUI..."
	cd $(WEB_DIR) && pnpm install && pnpm build

# =============================================================================
# Test
# =============================================================================

.PHONY: test test-go test-python test-web test-e2e

test: test-go test-python test-web ## Run all tests

test-go: ## Run Go tests
	@echo "==> Running Go tests..."
	go test -race -coverprofile=coverage.out ./...

test-python: ## Run Python tests
	@echo "==> Running Python tests..."
	cd $(PYTHON_DIR) && uv run pytest tests/ -v --cov=resolveagent

test-web: ## Run WebUI tests
	@echo "==> Running WebUI tests..."
	cd $(WEB_DIR) && pnpm test

test-e2e: ## Run end-to-end tests
	@echo "==> Running E2E tests..."
	go test -tags=e2e -v ./test/e2e/...

# =============================================================================
# Lint
# =============================================================================

.PHONY: lint lint-go lint-python lint-web lint-proto

lint: lint-go lint-python lint-web lint-proto ## Run all linters

lint-go: ## Lint Go code
	@echo "==> Linting Go..."
	golangci-lint run ./...

lint-python: ## Lint Python code
	@echo "==> Linting Python..."
	cd $(PYTHON_DIR) && uv run ruff check src/ tests/
	cd $(PYTHON_DIR) && uv run ruff format --check src/ tests/
	cd $(PYTHON_DIR) && uv run mypy src/resolveagent/

lint-web: ## Lint WebUI code
	@echo "==> Linting WebUI..."
	cd $(WEB_DIR) && pnpm lint

lint-proto: ## Lint Protocol Buffers
	@echo "==> Linting protos..."
	buf lint --config tools/buf/buf.yaml $(PROTO_DIR)

# =============================================================================
# Code Generation
# =============================================================================

.PHONY: proto generate

proto: ## Generate code from Protocol Buffers
	@echo "==> Generating protobuf code..."
	bash hack/generate-proto.sh

generate: proto ## Run all code generation

# =============================================================================
# Docker
# =============================================================================

.PHONY: docker docker-platform docker-runtime docker-webui

docker: docker-platform docker-runtime docker-webui ## Build all Docker images

docker-platform: ## Build platform services Docker image
	@echo "==> Building platform Docker image..."
	docker build -t $(DOCKER_REGISTRY)/resolveagent-platform:$(DOCKER_TAG) \
		-f $(DEPLOY_DIR)/docker/platform.Dockerfile .

docker-runtime: ## Build agent runtime Docker image
	@echo "==> Building runtime Docker image..."
	docker build -t $(DOCKER_REGISTRY)/resolveagent-runtime:$(DOCKER_TAG) \
		-f $(DEPLOY_DIR)/docker/runtime.Dockerfile .

docker-webui: ## Build WebUI Docker image
	@echo "==> Building WebUI Docker image..."
	docker build -t $(DOCKER_REGISTRY)/resolveagent-webui:$(DOCKER_TAG) \
		-f $(DEPLOY_DIR)/docker/webui.Dockerfile .

# =============================================================================
# Docker Compose
# =============================================================================

.PHONY: compose-up compose-down compose-deps compose-logs

compose-up: ## Start full stack with Docker Compose
	@echo "==> Starting full stack..."
	docker compose -f $(DEPLOY_DIR)/docker-compose/docker-compose.yaml up -d

compose-down: ## Stop Docker Compose stack
	@echo "==> Stopping stack..."
	docker compose -f $(DEPLOY_DIR)/docker-compose/docker-compose.yaml down

compose-deps: ## Start dependencies only (DB, Redis, etc.)
	@echo "==> Starting dependencies..."
	docker compose -f $(DEPLOY_DIR)/docker-compose/docker-compose.deps.yaml up -d

compose-logs: ## Tail Docker Compose logs
	docker compose -f $(DEPLOY_DIR)/docker-compose/docker-compose.yaml logs -f

# =============================================================================
# Helm
# =============================================================================

.PHONY: helm-install helm-upgrade helm-uninstall helm-template

helm-install: ## Install Helm chart
	helm install resolveagent $(DEPLOY_DIR)/helm/resolveagent \
		--namespace resolveagent --create-namespace

helm-upgrade: ## Upgrade Helm chart
	helm upgrade resolveagent $(DEPLOY_DIR)/helm/resolveagent \
		--namespace resolveagent

helm-uninstall: ## Uninstall Helm chart
	helm uninstall resolveagent --namespace resolveagent

helm-template: ## Render Helm templates locally
	helm template resolveagent $(DEPLOY_DIR)/helm/resolveagent

# =============================================================================
# Development
# =============================================================================

.PHONY: setup-dev clean fmt docs-sync docs-sync-watch docs-proofread

setup-dev: ## Set up development environment
	@echo "==> Setting up development environment..."
	bash hack/setup-dev.sh

docs-sync: ## Synchronize bilingual document pairs
	@echo "==> Syncing bilingual docs..."
	cd $(PYTHON_DIR) && uv run resolveagent-docsync --workspace-root $(ROOT_DIR) sync

docs-sync-watch: ## Watch bilingual document pairs and sync continuously
	@echo "==> Watching bilingual docs..."
	cd $(PYTHON_DIR) && uv run resolveagent-docsync --workspace-root $(ROOT_DIR) watch

docs-proofread: ## Proofread bilingual document pairs
	@echo "==> Proofreading bilingual docs..."
	cd $(PYTHON_DIR) && uv run resolveagent-docsync --workspace-root $(ROOT_DIR) proofread

clean: ## Clean build artifacts
	@echo "==> Cleaning..."
	rm -rf $(BIN_DIR)
	rm -f coverage.out coverage.html
	rm -rf $(PYTHON_DIR)/.pytest_cache
	rm -rf $(PYTHON_DIR)/dist
	rm -rf $(WEB_DIR)/dist
	rm -rf $(WEB_DIR)/node_modules

fmt: ## Format all code
	@echo "==> Formatting Go..."
	gofumpt -w .
	@echo "==> Formatting Python..."
	cd $(PYTHON_DIR) && uv run ruff format src/ tests/
	@echo "==> Formatting WebUI..."
	cd $(WEB_DIR) && pnpm format
