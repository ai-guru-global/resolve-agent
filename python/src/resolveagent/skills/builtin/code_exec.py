"""Built-in skill for executing code safely.

Supports multiple programming languages with sandboxed execution.
"""

from __future__ import annotations

import logging
from typing import Any

from resolveagent.skills.sandbox import SandboxConfig, SandboxExecutor

logger = logging.getLogger(__name__)


class CodeExecutionSkill:
    """Execute code in a sandboxed environment.

    Supported languages:
    - python: Python 3
    - bash: Bash shell commands
    - javascript: JavaScript (Node.js)

    Security:
    - Process isolation
    - CPU time limits (default: 10s)
    - Memory limits (default: 512MB)
    - File size limits
    - Optional network isolation
    """

    def __init__(self, config: SandboxConfig | None = None) -> None:
        """Initialize code execution skill.

        Args:
            config: Sandbox configuration.
        """
        self.config = config or SandboxConfig(
            timeout_seconds=30.0,
            max_memory_mb=512,
            allow_network=False,
        )
        self.executor = SandboxExecutor(self.config)

    async def execute(
        self,
        code: str,
        language: str = "python",
        timeout: float | None = None,
    ) -> dict[str, Any]:
        """Execute code.

        Args:
            code: Code to execute.
            language: Programming language (python, bash, javascript).
            timeout: Custom timeout in seconds (overrides default).

        Returns:
            Execution result with stdout, stderr, and status.
        """
        # Update timeout if provided
        if timeout:
            self.config.timeout_seconds = timeout

        logger.info(
            f"Executing {language} code",
            extra={
                "language": language,
                "code_length": len(code),
                "timeout": self.config.timeout_seconds,
            },
        )

        # Execute in sandbox
        result = await self.executor.execute(code, language)

        return {
            "success": result.success,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "return_code": result.return_code,
            "execution_time_ms": result.execution_time_ms,
            "memory_usage_mb": result.memory_usage_mb,
            "error": result.error,
        }

    async def evaluate_expression(
        self,
        expression: str,
        variables: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Evaluate a Python expression.

        Args:
            expression: Python expression to evaluate.
            variables: Variables to make available in the expression.

        Returns:
            Evaluation result.
        """
        # Wrap expression to capture result
        code = f"""
_result = eval({repr(expression)})
print(json.dumps({{"result": _result}}))
"""
        result = await self.execute(code, language="python")

        # Parse result from stdout
        try:
            import json

            output = json.loads(result["stdout"].strip())
            result["value"] = output.get("result")
        except Exception:
            result["value"] = None

        return result

    async def calculate(
        self,
        expression: str,
    ) -> dict[str, Any]:
        """Calculate a mathematical expression.

        Args:
            expression: Mathematical expression (e.g., "2 + 2 * 3").

        Returns:
            Calculation result.
        """
        # Use Python for calculation
        code = f"""
try:
    import math
    result = eval({repr(expression)}, {{"__builtins__": {{"math": math}}}}, {{}})
    print(f"RESULT: {{result}}")
except Exception as e:
    print(f"ERROR: {{e}}")
"""
        result = await self.execute(code, language="python")

        # Parse result
        stdout = result["stdout"].strip()
        if stdout.startswith("RESULT: "):
            try:
                value = float(stdout[8:])
                result["value"] = value
            except ValueError:
                result["value"] = stdout[8:]
        elif stdout.startswith("ERROR: "):
            result["error"] = stdout[7:]
            result["success"] = False

        return result


class PythonCodeSkill(CodeExecutionSkill):
    """Specialized skill for Python code execution."""

    def __init__(self) -> None:
        super().__init__(
            SandboxConfig(
                timeout_seconds=30.0,
                max_memory_mb=512,
                allow_network=False,
            )
        )

    async def run_function(
        self,
        function_code: str,
        function_name: str,
        args: list[Any] | None = None,
        kwargs: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Run a specific function.

        Args:
            function_code: Python code defining the function.
            function_name: Name of the function to call.
            args: Positional arguments.
            kwargs: Keyword arguments.

        Returns:
            Function execution result.
        """
        args = args or []
        kwargs = kwargs or {}

        # Build code to execute the function
        import json

        args_json = json.dumps(args)
        kwargs_json = json.dumps(kwargs)

        code = f"""
{function_code}

import json

# Call function with arguments
args = json.loads({repr(args_json)})
kwargs = json.loads({repr(kwargs_json)})
result = {function_name}(*args, **kwargs)

# Output result
print(f"RESULT: {{json.dumps(result)}}")
"""
        result = await self.execute(code, language="python")

        # Parse result
        stdout = result["stdout"].strip()
        if stdout.startswith("RESULT: "):
            try:
                result["value"] = json.loads(stdout[8:])
            except json.JSONDecodeError:
                result["value"] = stdout[8:]

        return result


class BashSkill(CodeExecutionSkill):
    """Specialized skill for Bash command execution."""

    def __init__(self) -> None:
        super().__init__(
            SandboxConfig(
                timeout_seconds=10.0,
                max_memory_mb=256,
                allow_network=False,
            )
        )

    async def run_command(self, command: str) -> dict[str, Any]:
        """Run a shell command.

        Args:
            command: Shell command to execute.

        Returns:
            Command execution result.
        """
        return await self.execute(command, language="bash")

    async def check_command(self, command: str) -> bool:
        """Check if a command is available.

        Args:
            command: Command to check.

        Returns:
            True if command exists.
        """
        result = await self.execute(f"which {command}", language="bash")
        return result["success"] and result["stdout"].strip() != ""


# Convenience functions


async def execute_code(
    code: str,
    language: str = "python",
    timeout: float = 30.0,
) -> dict[str, Any]:
    """Convenience function to execute code.

    Args:
        code: Code to execute.
        language: Programming language.
        timeout: Timeout in seconds.

    Returns:
        Execution result.
    """
    skill = CodeExecutionSkill(SandboxConfig(timeout_seconds=timeout))
    return await skill.execute(code, language)


async def calculate(expression: str) -> float | None:
    """Convenience function to calculate expression.

    Args:
        expression: Mathematical expression.

    Returns:
        Calculation result or None if failed.
    """
    skill = CodeExecutionSkill()
    result = await skill.calculate(expression)
    return result.get("value")
