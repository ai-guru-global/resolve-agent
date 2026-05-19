# Contributing to Resolve Agent

Thank you for your interest in contributing to Resolve Agent! This document
provides guidelines and instructions to make the contribution process smooth
and effective.

Please read and follow our [Code of Conduct](./CODE_OF_CONDUCT.md) before
participating.

## Prerequisites

Ensure the following tools are installed on your system:

| Tool    | Version | Purpose                    |
|---------|---------|----------------------------|
| Go      | 1.22+   | Backend services           |
| Python  | 3.11+   | AI/ML and scripting        |
| Node.js | 20+     | Frontend (React)           |
| pnpm    | latest  | Node package manager       |
| uv      | latest  | Python package manager     |
| Docker  | latest  | Dependency services        |
| Make    | latest  | Build orchestration        |

## Development Setup

```bash
# 1. Fork the repository on GitHub, then clone your fork
git clone https://github.com/<your-username>/resolve-agent.git
cd resolve-agent

# 2. Install all dependencies, linting tools, and pre-commit hooks
make setup-dev

# 3. Start required dependency services (databases, message queues, etc.)
make compose-deps
```

## Project Structure

```
resolve-agent/
├── cmd/          # Go application entrypoints (CLI, servers)
├── pkg/          # Shared Go libraries and business logic
├── python/       # Python AI/ML services and utilities
├── web/          # React frontend (TypeScript)
├── deploy/       # Deployment configs (Docker, K8s, Helm)
├── docs/         # Documentation (bilingual zh/en)
└── Makefile      # Build, test, and lint orchestration
```

## Development Workflow

### Branch Naming

Use descriptive branch names prefixed with the change type:

- `feat/<description>` — New features
- `fix/<description>` — Bug fixes
- `docs/<description>` — Documentation changes
- `refactor/<description>` — Code refactoring
- `test/<description>` — Adding or updating tests

Example: `feat/add-ticket-resolution-api`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>(<scope>): <short summary>

<optional body>

<optional footer>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `perf`

Examples:
```
feat(api): add ticket resolution endpoint
fix(python): handle empty embedding vector in search
docs(readme): update deployment instructions
```

### Pre-commit Hooks

Running `make setup-dev` installs pre-commit hooks that automatically run
linting and formatting checks before each commit. Do not bypass these hooks
(`--no-verify`) unless absolutely necessary.

## Building

```bash
make build          # Build everything (Go, Python, Web)
make build-go       # Build Go binaries only
make build-python   # Build Python packages only
make build-web      # Build React frontend only
```

## Testing

```bash
make test           # Run all tests
make test-go        # Run Go tests
make test-python    # Run Python tests
make test-web       # Run frontend tests
```

Ensure all tests pass locally before submitting a pull request.

## Linting and Formatting

```bash
make lint           # Run all linters (Go, Python, TypeScript)
make fmt            # Auto-format all code
```

## Pull Request Process

1. **Fork** the repository on GitHub.
2. **Create a branch** from `main` following the naming convention above.
3. **Make your changes**, ensuring tests and linting pass.
4. **Push** your branch and open a **Pull Request** against `main`.
5. Fill in the PR template with a clear description of your changes.
6. **CI must pass** — all automated checks (build, test, lint) are required.
7. **Code review is required** — at least one maintainer approval before merge.
8. PRs are **squash-merged** to keep the main branch history clean.

## Coding Standards

### Go

- Format with `gofmt` (enforced by linter).
- Lint with `golangci-lint`.
- Use structured logging via `log/slog` — avoid `fmt.Println` for logs.
- Write table-driven tests where appropriate.
- Handle all errors explicitly; do not discard with `_`.

### Python

- Format with `ruff format`.
- Lint with `ruff check`.
- Type-check with `mypy` — **type hints are required** on all public functions.
- Use `uv` for dependency management.
- Write docstrings for public modules, classes, and functions.

### TypeScript / React

- Lint with **ESLint** (config in `web/.eslintrc`).
- Format with **Prettier**.
- Use functional components and hooks.
- Prefer TypeScript interfaces over `type` for object shapes.

## Documentation

Documentation is maintained in both **Chinese (zh)** and **English (en)**.
When updating docs, use the `docs-sync` tool to keep both versions in
consistency:

```bash
make docs-sync
```

Place documentation under `docs/` following the existing directory structure.

## License

By contributing to Resolve Agent, you agree that your contributions will be
licensed under the [Apache License 2.0](./LICENSE).

---

Questions? Open a discussion on GitHub or reach out to the maintainers.
We appreciate your contributions!
