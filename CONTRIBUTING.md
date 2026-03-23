# Contributing to ResolveAgent

Thank you for your interest in contributing to ResolveAgent! This document provides guidelines and information about contributing to this project.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Issues

- Use the [GitHub issue tracker](https://github.com/ai-guru-global/resolve-net/issues) to report bugs or suggest features.
- Before creating a new issue, search existing issues to avoid duplicates.
- Use the provided issue templates when available.

### Submitting Changes

1. Fork the repository and create a feature branch from `main`.
2. Make your changes following the coding standards below.
3. Write or update tests for your changes.
4. Run the full test suite and ensure all tests pass.
5. Submit a pull request using the PR template.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/ai-guru-global/resolve-net.git
cd resolve-net

# Set up the development environment
make setup-dev

# Build all components
make build

# Run tests
make test

# Run linters
make lint
```

### Prerequisites

- **Go** >= 1.22
- **Python** >= 3.11 with [uv](https://github.com/astral-sh/uv)
- **Node.js** >= 20 with [pnpm](https://pnpm.io/)
- **Buf** CLI for Protocol Buffer management
- **Docker** and **Docker Compose** for local development

## Coding Standards

### Go

- Follow [Effective Go](https://go.dev/doc/effective_go) guidelines.
- Use `gofumpt` for formatting.
- All exported functions must have documentation comments.
- Use structured logging with `slog`.
- Propagate context through function signatures.

### Python

- Follow PEP 8 (enforced by `ruff`).
- Use type hints on all public functions.
- Use Pydantic models for data structures.
- Format with `ruff format`.

### TypeScript/React

- Use strict TypeScript configuration.
- Follow React hooks conventions.
- Use functional components exclusively.

### Protocol Buffers

- Follow the [Buf style guide](https://buf.build/docs/best-practices/style-guide).
- Use `buf lint` to validate proto files.

## RFC Process

For significant architectural changes, we use an RFC (Request for Comments) process:

1. Copy `docs/rfcs/0001-template.md` to a new file.
2. Fill in the RFC template with your proposal.
3. Submit as a PR for community discussion.
4. RFCs are accepted by maintainer consensus.

## License

By contributing to ResolveAgent, you agree that your contributions will be licensed under the Apache License 2.0.
