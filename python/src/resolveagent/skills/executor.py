"""Skill execution with sandboxing and input/output validation."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from resolveagent.skills.loader import LoadedSkill
from resolveagent.skills.manifest import SkillType
from resolveagent.skills.sandbox import SandboxConfig, SandboxExecutor, SandboxResult
from resolveagent.skills.solution import StructuredSolution

logger = logging.getLogger(__name__)


class SkillExecutor:
    """Executes skills in a controlled environment.

    Handles input validation, sandboxed execution, and output validation.
    Supports both direct execution (trusted skills) and sandboxed execution
    (untrusted skills).

    Example:
        ```python
        executor = SkillExecutor()
        result = await executor.execute(skill, {"query": "hello"})
        if result.success:
            print(result.outputs)
        ```
    """

    def __init__(
        self,
        sandbox_config: SandboxConfig | None = None,
        use_sandbox: bool = True,
    ) -> None:
        """Initialize the skill executor.

        Args:
            sandbox_config: Configuration for sandboxed execution.
            use_sandbox: Whether to use sandbox for all skills by default.
        """
        self.sandbox_config = sandbox_config or SandboxConfig()
        self.use_sandbox = use_sandbox
        self._sandbox = SandboxExecutor(self.sandbox_config)
        self._execution_history: list[SkillExecutionRecord] = []

    async def execute(
        self,
        skill: LoadedSkill,
        inputs: dict[str, Any],
        use_sandbox: bool | None = None,
    ) -> SkillResult:
        """Execute a skill with the given inputs.

        Args:
            skill: The loaded skill to execute.
            inputs: Input parameters for the skill.
            use_sandbox: Override default sandbox setting.

        Returns:
            SkillResult with outputs and execution metadata.
        """
        start = time.monotonic()
        execution_start = time.time()

        logger.info(
            "Executing skill",
            extra={
                "name": skill.manifest.name,
                "version": skill.manifest.version,
                "sandbox": use_sandbox if use_sandbox is not None else self.use_sandbox,
            },
        )

        # Validate inputs against manifest schema
        validation_errors = self._validate_inputs(skill, inputs)
        if validation_errors:
            duration_ms = int((time.monotonic() - start) * 1000)
            logger.error(
                "Input validation failed",
                extra={"skill": skill.manifest.name, "errors": validation_errors},
            )
            return SkillResult(
                outputs={},
                success=False,
                error=f"Input validation failed: {', '.join(validation_errors)}",
                duration_ms=duration_ms,
            )

        try:
            # Route scenario skills to the TroubleshootingEngine
            if skill.manifest.skill_type == SkillType.SCENARIO:
                return await self._execute_scenario(skill, inputs)

            # Determine if we should use sandbox
            should_use_sandbox = use_sandbox if use_sandbox is not None else self.use_sandbox

            # Check if skill requires sandbox based on manifest
            if skill.manifest.execution_mode == "sandbox":
                should_use_sandbox = True
            elif skill.manifest.execution_mode == "direct":
                should_use_sandbox = False

            if should_use_sandbox:
                result = await self._execute_sandboxed(skill, inputs)
            else:
                result = await self._execute_direct(skill, inputs)

            # Validate outputs
            if result.success:
                output_errors = self._validate_outputs(skill, result.outputs)
                if output_errors:
                    result.success = False
                    result.error = f"Output validation failed: {', '.join(output_errors)}"

            # Record execution
            record = SkillExecutionRecord(
                skill_name=skill.manifest.name,
                skill_version=skill.manifest.version,
                success=result.success,
                duration_ms=result.duration_ms,
                timestamp=execution_start,
                error=result.error,
            )
            self._execution_history.append(record)

            # Keep only last 1000 records
            if len(self._execution_history) > 1000:
                self._execution_history = self._execution_history[-1000:]

            return result

        except Exception as e:
            duration_ms = int((time.monotonic() - start) * 1000)
            logger.exception("Skill execution failed", extra={"skill": skill.manifest.name})

            return SkillResult(
                outputs={},
                success=False,
                error=str(e),
                duration_ms=duration_ms,
            )

    def _validate_inputs(
        self,
        skill: LoadedSkill,
        inputs: dict[str, Any],
    ) -> list[str]:
        """Validate inputs against skill manifest schema.

        Args:
            skill: The skill to validate inputs for.
            inputs: Input parameters.

        Returns:
            List of validation error messages (empty if valid).
        """
        errors = []
        manifest = skill.manifest

        # Check required parameters
        for param in manifest.parameters:
            if param.required and param.name not in inputs:
                errors.append(f"Missing required parameter: {param.name}")
                continue

            if param.name in inputs:
                value = inputs[param.name]

                # Type validation
                if param.type == "string" and not isinstance(value, str):
                    errors.append(f"Parameter {param.name} must be a string")
                elif param.type == "integer" and not isinstance(value, int):
                    errors.append(f"Parameter {param.name} must be an integer")
                elif param.type == "number" and not isinstance(value, (int, float)):
                    errors.append(f"Parameter {param.name} must be a number")
                elif param.type == "boolean" and not isinstance(value, bool):
                    errors.append(f"Parameter {param.name} must be a boolean")
                elif param.type == "array" and not isinstance(value, list):
                    errors.append(f"Parameter {param.name} must be an array")
                elif param.type == "object" and not isinstance(value, dict):
                    errors.append(f"Parameter {param.name} must be an object")

                # Enum validation
                if param.enum and value not in param.enum:
                    errors.append(
                        f"Parameter {param.name} must be one of: {', '.join(map(str, param.enum))}"
                    )

        # Check for unknown parameters
        known_params = {p.name for p in manifest.parameters}
        for key in inputs:
            if key not in known_params:
                logger.warning(
                    "Unknown parameter provided",
                    extra={"skill": manifest.name, "parameter": key},
                )

        return errors

    def _validate_outputs(
        self,
        skill: LoadedSkill,
        outputs: dict[str, Any],
    ) -> list[str]:
        """Validate outputs against skill manifest schema.

        Args:
            skill: The skill to validate outputs for.
            outputs: Output values.

        Returns:
            List of validation error messages (empty if valid).
        """
        errors = []
        manifest = skill.manifest

        # Check required outputs
        for output in manifest.outputs:
            if output.required and output.name not in outputs:
                errors.append(f"Missing required output: {output.name}")
                continue

            if output.name in outputs:
                value = outputs[output.name]

                # Type validation
                if output.type == "string" and not isinstance(value, str):
                    errors.append(f"Output {output.name} must be a string")
                elif output.type == "integer" and not isinstance(value, int):
                    errors.append(f"Output {output.name} must be an integer")
                elif output.type == "number" and not isinstance(value, (int, float)):
                    errors.append(f"Output {output.name} must be a number")
                elif output.type == "boolean" and not isinstance(value, bool):
                    errors.append(f"Output {output.name} must be a boolean")
                elif output.type == "array" and not isinstance(value, list):
                    errors.append(f"Output {output.name} must be an array")
                elif output.type == "object" and not isinstance(value, dict):
                    errors.append(f"Output {output.name} must be an object")

        return errors

    async def _execute_scenario(
        self,
        skill: LoadedSkill,
        inputs: dict[str, Any],
    ) -> SkillResult:
        """Execute a scenario skill through the TroubleshootingEngine.

        Args:
            skill: The loaded scenario skill.
            inputs: Input parameters.

        Returns:
            SkillResult wrapping a StructuredSolution.
        """
        from resolveagent.skills.troubleshoot import TroubleshootingEngine

        start = time.monotonic()
        engine = TroubleshootingEngine(skill_executor=self)
        solution = await engine.execute(skill.manifest, inputs)
        duration_ms = int((time.monotonic() - start) * 1000)

        return SkillResult(
            outputs={"structured_solution": solution.to_dict()},
            success=True,
            logs=solution.to_markdown(),
            duration_ms=duration_ms,
            solution=solution,
        )

    async def _execute_direct(
        self,
        skill: LoadedSkill,
        inputs: dict[str, Any],
    ) -> SkillResult:
        """Execute skill directly (without sandbox).

        Args:
            skill: The skill to execute.
            inputs: Input parameters.

        Returns:
            Execution result.
        """
        start = time.monotonic()

        try:
            callable_fn = skill.get_callable()
            result = callable_fn(**inputs)

            # Handle coroutine results
            import asyncio
            if asyncio.iscoroutine(result):
                result = await result

            duration_ms = int((time.monotonic() - start) * 1000)

            # Normalize result
            if isinstance(result, dict):
                outputs = result
            elif isinstance(result, SkillResult):
                return result
            else:
                outputs = {"result": result}

            return SkillResult(
                outputs=outputs,
                success=True,
                duration_ms=duration_ms,
            )

        except Exception as e:
            duration_ms = int((time.monotonic() - start) * 1000)
            raise

    async def _execute_sandboxed(
        self,
        skill: LoadedSkill,
        inputs: dict[str, Any],
    ) -> SkillResult:
        """Execute skill in sandbox.

        Args:
            skill: The skill to execute.
            inputs: Input parameters.

        Returns:
            Execution result.
        """
        # Read skill code
        entry_file = skill.directory / f"{skill.entry_module.replace('.', '/')}.py"
        if not entry_file.exists():
            entry_file = skill.directory / f"{skill.entry_module}.py"

        if not entry_file.exists():
            return SkillResult(
                outputs={},
                success=False,
                error=f"Entry file not found: {skill.entry_module}",
            )

        code = entry_file.read_text()

        # Execute in sandbox
        sandbox_result: SandboxResult = await self._sandbox.execute(
            code=code,
            language="python",
            inputs=inputs,
        )

        # Parse outputs from stdout
        outputs = {}
        if sandbox_result.success:
            try:
                # Try to parse JSON output from stdout
                stdout = sandbox_result.stdout.strip()
                if stdout:
                    outputs = json.loads(stdout)
            except json.JSONDecodeError:
                # If not JSON, use raw stdout as result
                outputs = {"result": sandbox_result.stdout}

        return SkillResult(
            outputs=outputs,
            success=sandbox_result.success,
            error=sandbox_result.error or sandbox_result.stderr,
            logs=sandbox_result.stdout,
            duration_ms=int(sandbox_result.execution_time_ms),
        )

    def get_execution_stats(self) -> dict[str, Any]:
        """Get execution statistics.

        Returns:
            Execution statistics.
        """
        if not self._execution_history:
            return {
                "total_executions": 0,
                "success_rate": 0.0,
                "average_duration_ms": 0.0,
            }

        total = len(self._execution_history)
        successful = sum(1 for r in self._execution_history if r.success)
        avg_duration = sum(r.duration_ms for r in self._execution_history) / total

        return {
            "total_executions": total,
            "success_rate": successful / total,
            "average_duration_ms": avg_duration,
        }


class SkillResult:
    """Result of a skill execution."""

    def __init__(
        self,
        outputs: dict[str, Any],
        success: bool = True,
        error: str | None = None,
        logs: str = "",
        duration_ms: int = 0,
        solution: StructuredSolution | None = None,
    ) -> None:
        """Initialize skill result.

        Args:
            outputs: Output values from the skill.
            success: Whether execution succeeded.
            error: Error message if execution failed.
            logs: Execution logs/output.
            duration_ms: Execution duration in milliseconds.
            solution: Structured solution (only for scenario skills).
        """
        self.outputs = outputs
        self.success = success
        self.error = error
        self.logs = logs
        self.duration_ms = duration_ms
        self.solution = solution

    def to_dict(self) -> dict[str, Any]:
        """Convert result to dictionary.

        Returns:
            Dictionary representation.
        """
        result_dict: dict[str, Any] = {
            "outputs": self.outputs,
            "success": self.success,
            "error": self.error,
            "duration_ms": self.duration_ms,
        }
        if self.solution is not None:
            result_dict["structured_solution"] = self.solution.to_dict()
        return result_dict

    def __repr__(self) -> str:
        return f"SkillResult(success={self.success}, duration={self.duration_ms}ms)"


class SkillExecutionRecord:
    """Record of a skill execution."""

    def __init__(
        self,
        skill_name: str,
        skill_version: str,
        success: bool,
        duration_ms: int,
        timestamp: float,
        error: str | None = None,
    ) -> None:
        """Initialize execution record.

        Args:
            skill_name: Name of the skill.
            skill_version: Version of the skill.
            success: Whether execution succeeded.
            duration_ms: Execution duration in milliseconds.
            timestamp: Execution timestamp.
            error: Error message if execution failed.
        """
        self.skill_name = skill_name
        self.skill_version = skill_version
        self.success = success
        self.duration_ms = duration_ms
        self.timestamp = timestamp
        self.error = error
