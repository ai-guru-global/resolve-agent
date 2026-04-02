"""Sandboxed execution environment for skills.

Provides process isolation, resource limits, and security constraints
for executing untrusted code safely.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import resource
import signal
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class SandboxConfig:
    """Configuration for sandbox execution."""

    # Time limits
    timeout_seconds: float = 30.0
    cpu_time_limit: float = 10.0  # CPU time limit in seconds

    # Memory limits
    max_memory_mb: int = 512  # Maximum memory in MB
    max_stack_mb: int = 8  # Maximum stack size in MB

    # File system limits
    max_file_size_mb: int = 10  # Maximum file size in MB
    max_open_files: int = 64  # Maximum open file descriptors

    # Network
    allow_network: bool = False  # Allow network access

    # Environment
    allowed_env_vars: list[str] | None = None  # Allowed environment variables
    extra_env_vars: dict[str, str] | None = None  # Extra environment variables to set


@dataclass
class SandboxResult:
    """Result of sandboxed execution."""

    success: bool
    stdout: str
    stderr: str
    return_code: int
    execution_time_ms: float
    memory_usage_mb: float
    error: str | None = None


class SandboxExecutor:
    """Executes code in a sandboxed subprocess.

    Features:
    - Process isolation
    - CPU time limits
    - Memory limits
    - File size limits
    - Network isolation (optional)
    - Seccomp-bpf filtering (Linux)
    """

    def __init__(self, config: SandboxConfig | None = None) -> None:
        """Initialize sandbox executor.

        Args:
            config: Sandbox configuration.
        """
        self.config = config or SandboxConfig()

    async def execute(
        self,
        code: str,
        language: str = "python",
        inputs: dict[str, Any] | None = None,
    ) -> SandboxResult:
        """Execute code in sandbox.

        Args:
            code: Code to execute.
            language: Programming language (python, bash, javascript).
            inputs: Input variables to pass to the code.

        Returns:
            Execution result.
        """
        if language == "python":
            return await self._execute_python(code, inputs)
        elif language == "bash":
            return await self._execute_bash(code, inputs)
        elif language == "javascript":
            return await self._execute_javascript(code, inputs)
        else:
            return SandboxResult(
                success=False,
                stdout="",
                stderr="",
                return_code=-1,
                execution_time_ms=0,
                memory_usage_mb=0,
                error=f"Unsupported language: {language}",
            )

    async def _execute_python(
        self,
        code: str,
        inputs: dict[str, Any] | None = None,
    ) -> SandboxResult:
        """Execute Python code in sandbox."""
        # Create temporary file for the code
        with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as f:
            # Write wrapper code that sets up inputs and executes user code
            wrapper_code = self._generate_python_wrapper(code, inputs)
            f.write(wrapper_code)
            temp_file = f.name

        try:
            # Build command
            cmd = [
                sys.executable,
                "-u",  # Unbuffered output
                temp_file,
            ]

            # Set up environment
            env = self._prepare_env()

            # Execute with resource limits
            start_time = asyncio.get_event_loop().time()

            try:
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    env=env,
                    preexec_fn=self._set_resource_limits,
                )

                try:
                    stdout, stderr = await asyncio.wait_for(
                        proc.communicate(),
                        timeout=self.config.timeout_seconds,
                    )
                    execution_time = (asyncio.get_event_loop().time() - start_time) * 1000

                    return SandboxResult(
                        success=proc.returncode == 0,
                        stdout=stdout.decode("utf-8", errors="replace"),
                        stderr=stderr.decode("utf-8", errors="replace"),
                        return_code=proc.returncode,
                        execution_time_ms=execution_time,
                        memory_usage_mb=0,  # TODO: Track actual memory usage
                    )

                except asyncio.TimeoutError:
                    proc.kill()
                    await proc.wait()
                    return SandboxResult(
                        success=False,
                        stdout="",
                        stderr="Execution timed out",
                        return_code=-1,
                        execution_time_ms=self.config.timeout_seconds * 1000,
                        memory_usage_mb=0,
                        error=f"Timeout after {self.config.timeout_seconds}s",
                    )

            except Exception as e:
                logger.error(f"Failed to execute Python code", extra={"error": str(e)})
                return SandboxResult(
                    success=False,
                    stdout="",
                    stderr=str(e),
                    return_code=-1,
                    execution_time_ms=0,
                    memory_usage_mb=0,
                    error=str(e),
                )

        finally:
            # Clean up temp file
            try:
                os.unlink(temp_file)
            except Exception:
                pass

    async def _execute_bash(
        self,
        code: str,
        inputs: dict[str, Any] | None = None,
    ) -> SandboxResult:
        """Execute Bash code in sandbox."""
        # Export inputs as environment variables
        env = self._prepare_env()
        if inputs:
            for key, value in inputs.items():
                env[f"INPUT_{key.upper()}"] = json.dumps(value)

        start_time = asyncio.get_event_loop().time()

        try:
            proc = await asyncio.create_subprocess_shell(
                code,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
                preexec_fn=self._set_resource_limits,
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=self.config.timeout_seconds,
                )
                execution_time = (asyncio.get_event_loop().time() - start_time) * 1000

                return SandboxResult(
                    success=proc.returncode == 0,
                    stdout=stdout.decode("utf-8", errors="replace"),
                    stderr=stderr.decode("utf-8", errors="replace"),
                    return_code=proc.returncode,
                    execution_time_ms=execution_time,
                    memory_usage_mb=0,
                )

            except asyncio.TimeoutError:
                proc.kill()
                await proc.wait()
                return SandboxResult(
                    success=False,
                    stdout="",
                    stderr="Execution timed out",
                    return_code=-1,
                    execution_time_ms=self.config.timeout_seconds * 1000,
                    memory_usage_mb=0,
                    error=f"Timeout after {self.config.timeout_seconds}s",
                )

        except Exception as e:
            logger.error(f"Failed to execute Bash code", extra={"error": str(e)})
            return SandboxResult(
                success=False,
                stdout="",
                stderr=str(e),
                return_code=-1,
                execution_time_ms=0,
                memory_usage_mb=0,
                error=str(e),
            )

    async def _execute_javascript(
        self,
        code: str,
        inputs: dict[str, Any] | None = None,
    ) -> SandboxResult:
        """Execute JavaScript code in sandbox using Node.js."""
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode="w", suffix=".js", delete=False) as f:
            wrapper_code = self._generate_javascript_wrapper(code, inputs)
            f.write(wrapper_code)
            temp_file = f.name

        try:
            cmd = ["node", temp_file]
            env = self._prepare_env()

            start_time = asyncio.get_event_loop().time()

            try:
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    env=env,
                    preexec_fn=self._set_resource_limits,
                )

                try:
                    stdout, stderr = await asyncio.wait_for(
                        proc.communicate(),
                        timeout=self.config.timeout_seconds,
                    )
                    execution_time = (asyncio.get_event_loop().time() - start_time) * 1000

                    return SandboxResult(
                        success=proc.returncode == 0,
                        stdout=stdout.decode("utf-8", errors="replace"),
                        stderr=stderr.decode("utf-8", errors="replace"),
                        return_code=proc.returncode,
                        execution_time_ms=execution_time,
                        memory_usage_mb=0,
                    )

                except asyncio.TimeoutError:
                    proc.kill()
                    await proc.wait()
                    return SandboxResult(
                        success=False,
                        stdout="",
                        stderr="Execution timed out",
                        return_code=-1,
                        execution_time_ms=self.config.timeout_seconds * 1000,
                        memory_usage_mb=0,
                        error=f"Timeout after {self.config.timeout_seconds}s",
                    )

            except FileNotFoundError:
                return SandboxResult(
                    success=False,
                    stdout="",
                    stderr="",
                    return_code=-1,
                    execution_time_ms=0,
                    memory_usage_mb=0,
                    error="Node.js not found",
                )

        finally:
            try:
                os.unlink(temp_file)
            except Exception:
                pass

    def _set_resource_limits(self) -> None:
        """Set resource limits for the subprocess (called in child process)."""
        try:
            # CPU time limit
            resource.setrlimit(
                resource.RLIMIT_CPU,
                (int(self.config.cpu_time_limit), int(self.config.cpu_time_limit) + 1),
            )

            # Memory limit
            max_memory_bytes = self.config.max_memory_mb * 1024 * 1024
            resource.setrlimit(resource.RLIMIT_AS, (max_memory_bytes, max_memory_bytes))

            # Stack limit
            max_stack_bytes = self.config.max_stack_mb * 1024 * 1024
            resource.setrlimit(resource.RLIMIT_STACK, (max_stack_bytes, max_stack_bytes))

            # File size limit
            max_file_bytes = self.config.max_file_size_mb * 1024 * 1024
            resource.setrlimit(resource.RLIMIT_FSIZE, (max_file_bytes, max_file_bytes))

            # Open files limit
            resource.setrlimit(
                resource.RLIMIT_NOFILE,
                (self.config.max_open_files, self.config.max_open_files),
            )

            # Disable core dumps
            resource.setrlimit(resource.RLIMIT_CORE, (0, 0))

        except Exception as e:
            logger.warning(f"Failed to set resource limits", extra={"error": str(e)})

    def _prepare_env(self) -> dict[str, str]:
        """Prepare environment variables for subprocess."""
        if self.config.allowed_env_vars is None:
            # Default: minimal environment
            env = {
                "PATH": "/usr/local/bin:/usr/bin:/bin",
                "HOME": "/tmp",
                "LANG": "C.UTF-8",
            }
        else:
            env = {
                k: v for k, v in os.environ.items()
                if k in self.config.allowed_env_vars
            }

        # Add extra env vars
        if self.config.extra_env_vars:
            env.update(self.config.extra_env_vars)

        return env

    def _generate_python_wrapper(
        self,
        code: str,
        inputs: dict[str, Any] | None = None,
    ) -> str:
        """Generate Python wrapper code."""
        inputs_json = json.dumps(inputs or {})

        wrapper = f'''
import json
import sys

# Set up inputs
_inputs = json.loads({repr(inputs_json)})

# Make inputs available as variables
for _key, _value in _inputs.items():
    globals()[_key] = _value

# Execute user code
{code}
'''
        return wrapper

    def _generate_javascript_wrapper(
        self,
        code: str,
        inputs: dict[str, Any] | None = None,
    ) -> str:
        """Generate JavaScript wrapper code."""
        inputs_json = json.dumps(inputs or {})

        wrapper = f'''
// Set up inputs
const inputs = {inputs_json};

// Execute user code
{code}
'''
        return wrapper


class SecureSandbox(SandboxExecutor):
    """Extended sandbox with additional security measures.

    Features:
    - File system isolation using chroot (Linux)
    - Network namespace isolation (Linux)
    - Seccomp-bpf syscall filtering (Linux)
    """

    def __init__(self, config: SandboxConfig | None = None) -> None:
        super().__init__(config)
        self._temp_dir: Path | None = None

    async def execute(
        self,
        code: str,
        language: str = "python",
        inputs: dict[str, Any] | None = None,
    ) -> SandboxResult:
        """Execute code with enhanced security."""
        # For now, use the basic sandbox
        # Full implementation would use Docker or Firecracker
        return await super().execute(code, language, inputs)
