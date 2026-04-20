"""Entry point for running the agent runtime as a module.

Usage:
    python -m resolveagent.runtime
"""

from __future__ import annotations

import asyncio
import logging
import os

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)


def main() -> None:
    """Start the runtime HTTP server."""
    host = os.environ.get("RESOLVEAGENT_RUNTIME_HOST", "0.0.0.0")
    port = int(os.environ.get("RESOLVEAGENT_RUNTIME_PORT", "9091"))

    from resolveagent.runtime.http_server import get_runtime_server

    server = get_runtime_server(host, port)
    logger.info("Starting ResolveAgent runtime on %s:%d", host, port)
    asyncio.run(server.start())


if __name__ == "__main__":
    main()
