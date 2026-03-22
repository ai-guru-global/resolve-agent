"""Execution sandbox for skill isolation."""

from __future__ import annotations

import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class SandboxConfig:
    """Configuration for the skill execution sandbox."""

    max_memory_mb: int = 256
    max_cpu_seconds: int = 30
    timeout_seconds: int = 60
    network_access: bool = False
    allowed_hosts: list[str] | None = None
    writable_paths: list[str] | None = None


class Sandbox:
    """Provides isolated execution for skills.

    Skills run in a restricted subprocess with:
    - Resource limits (CPU, memory, wall-clock timeout)
    - Network restrictions (only allowed hosts)
    - File system restrictions (read-only except temp workspace)
    """

    def __init__(self, config: SandboxConfig | None = None) -> None:
        self.config = config or SandboxConfig()

    async def run(self, fn_path: str, args: dict) -> dict:
        """Execute a function in the sandbox.

        Args:
            fn_path: Dotted path to the function to execute.
            args: Arguments to pass to the function.

        Returns:
            Function output as a dict.
        """
        # TODO: Implement subprocess-based sandboxing
        # - Fork subprocess with resource limits (setrlimit)
        # - Apply seccomp/AppArmor profiles
        # - Restrict network via iptables rules or network namespace
        # - Mount skill directory read-only
        # - Provide temporary writable workspace
        logger.info(
            "Sandbox execution",
            extra={"fn": fn_path, "config": str(self.config)},
        )
        return {"status": "sandbox not implemented"}
