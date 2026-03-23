"""Skill execution with sandboxing."""

from __future__ import annotations

import logging
import time
from typing import Any

from resolveagent.skills.loader import LoadedSkill

logger = logging.getLogger(__name__)


class SkillExecutor:
    """Executes skills in a controlled environment.

    Handles input validation, sandboxing, execution, and output validation.
    """

    async def execute(
        self,
        skill: LoadedSkill,
        inputs: dict[str, Any],
    ) -> SkillResult:
        """Execute a skill with the given inputs.

        Args:
            skill: The loaded skill to execute.
            inputs: Input parameters for the skill.

        Returns:
            SkillResult with outputs and execution metadata.
        """
        start = time.monotonic()

        logger.info(
            "Executing skill",
            extra={"name": skill.manifest.name},
        )

        try:
            # TODO: Validate inputs against manifest schema
            # TODO: Set up sandbox environment
            # TODO: Execute in subprocess for isolation

            callable_fn = skill.get_callable()
            result = callable_fn(**inputs)

            duration_ms = int((time.monotonic() - start) * 1000)

            return SkillResult(
                outputs=result if isinstance(result, dict) else {"result": result},
                success=True,
                duration_ms=duration_ms,
            )

        except Exception as e:
            duration_ms = int((time.monotonic() - start) * 1000)
            logger.error("Skill execution failed", extra={"error": str(e)})

            return SkillResult(
                outputs={},
                success=False,
                error=str(e),
                duration_ms=duration_ms,
            )


class SkillResult:
    """Result of a skill execution."""

    def __init__(
        self,
        outputs: dict[str, Any],
        success: bool = True,
        error: str | None = None,
        logs: str = "",
        duration_ms: int = 0,
    ) -> None:
        self.outputs = outputs
        self.success = success
        self.error = error
        self.logs = logs
        self.duration_ms = duration_ms
