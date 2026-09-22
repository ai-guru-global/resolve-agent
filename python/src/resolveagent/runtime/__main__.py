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
    """Start the runtime HTTP server (and gRPC shim when configured)."""
    host = os.environ.get("RESOLVEAGENT_RUNTIME_HOST", "0.0.0.0")
    port = int(os.environ.get("RESOLVEAGENT_RUNTIME_PORT", "9091"))
    grpc_port = os.environ.get("RESOLVEAGENT_GRPC_PORT")

    from resolveagent.runtime.http_server import get_runtime_server

    server = get_runtime_server(host, port)
    logger.info("Starting ResolveAgent runtime on %s:%d", host, port)

    if grpc_port:
        from resolveagent.runtime.selector_grpc import SelectorGrpcServer

        grpc_server = SelectorGrpcServer(port=int(grpc_port))
        logger.info("SelectorService gRPC shim on port %s", grpc_port)

        async def _serve_all() -> None:
            await asyncio.gather(server.start(), grpc_server.start())

        asyncio.run(_serve_all())
    else:
        asyncio.run(server.start())


if __name__ == "__main__":
    main()
