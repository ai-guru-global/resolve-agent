"""Lightweight troubleshooting engine for scenario skills.

Independent of the FTA engine — provides a sequential/conditional step-based
diagnostic flow that collects evidence and produces a four-element
StructuredSolution.
"""

from __future__ import annotations

import logging
import time
from typing import Any

from resolveagent.skills.manifest import ScenarioConfig, SkillManifest, SkillType, TroubleshootingStep
from resolveagent.skills.solution import (
    DiagnosticEvidence,
    StructuredSolution,
    TroubleshootingStepResult,
)

logger = logging.getLogger(__name__)


class TroubleshootingContext:
    """Accumulator for diagnostic information during troubleshooting."""

    def __init__(self) -> None:
        self.symptoms: list[str] = []
        self.evidence: list[DiagnosticEvidence] = []
        self.step_results: list[TroubleshootingStepResult] = []
        self.variables: dict[str, Any] = {}

    def add_symptom(self, symptom: str) -> None:
        if symptom and symptom not in self.symptoms:
            self.symptoms.append(symptom)

    def add_evidence(self, evidence: DiagnosticEvidence) -> None:
        self.evidence.append(evidence)

    def get_step_result(self, step_id: str) -> TroubleshootingStepResult | None:
        for result in self.step_results:
            if result.step_id == step_id:
                return result
        return None


class TroubleshootingEngine:
    """Executes structured troubleshooting flows defined in scenario skills.

    Each flow consists of ordered steps (collect, diagnose, verify, action)
    that are executed sequentially with optional conditional branching.
    The engine collects evidence at each step and synthesizes a
    StructuredSolution with the four required elements.
    """

    def __init__(
        self,
        skill_executor: Any | None = None,
        llm_provider: Any | None = None,
    ) -> None:
        self._skill_executor = skill_executor
        self._llm_provider = llm_provider

    async def execute(
        self,
        manifest: SkillManifest,
        inputs: dict[str, Any],
        context: dict[str, Any] | None = None,
    ) -> StructuredSolution:
        """Execute the troubleshooting flow defined in a scenario skill manifest.

        Args:
            manifest: The scenario skill manifest containing the flow definition.
            inputs: User-provided input parameters.
            context: Optional additional context (e.g., environment info).

        Returns:
            A StructuredSolution containing the four-element output.

        Raises:
            ValueError: If the manifest is not a scenario skill.
        """
        if manifest.skill_type != SkillType.SCENARIO:
            raise ValueError(
                f"TroubleshootingEngine requires a scenario skill, "
                f"got skill_type={manifest.skill_type!r}"
            )

        scenario = manifest.scenario
        if scenario is None:
            raise ValueError("Scenario skill is missing scenario configuration")

        logger.info(
            "Starting troubleshooting flow",
            extra={
                "skill": manifest.name,
                "domain": scenario.domain,
                "steps": len(scenario.troubleshooting_flow),
            },
        )

        ts_context = TroubleshootingContext()
        ts_context.variables.update(inputs)
        if context:
            ts_context.variables.update(context)

        # Sort steps by order
        sorted_steps = sorted(scenario.troubleshooting_flow, key=lambda s: s.order)

        # Execute each step
        for step in sorted_steps:
            if step.condition and not self._evaluate_condition(step.condition, ts_context):
                logger.info(
                    "Skipping step (condition not met)",
                    extra={"step_id": step.id, "condition": step.condition},
                )
                ts_context.step_results.append(
                    TroubleshootingStepResult(
                        step_id=step.id,
                        step_name=step.name,
                        status="skipped",
                        output="Condition not met",
                    )
                )
                continue

            result = await self._execute_step(step, ts_context, scenario)
            ts_context.step_results.append(result)

            # Collect evidence from the step
            for ev in result.evidence:
                ts_context.add_evidence(ev)

        # Synthesize the final solution
        return self._synthesize_solution(
            ts_context,
            scenario,
            inputs,
        )

    async def _execute_step(
        self,
        step: TroubleshootingStep,
        context: TroubleshootingContext,
        scenario: ScenarioConfig,
    ) -> TroubleshootingStepResult:
        """Execute a single troubleshooting step."""
        start = time.monotonic()

        logger.info(
            "Executing troubleshooting step",
            extra={"step_id": step.id, "step_type": step.step_type},
        )

        try:
            output = ""
            evidence: list[DiagnosticEvidence] = []
            finding: str | None = None

            # Dispatch based on execution method
            if step.skill_ref and self._skill_executor:
                output, evidence = await self._execute_via_skill(step, context)
            elif step.command:
                output, evidence = await self._execute_command(step, context)
            else:
                output, evidence = self._execute_descriptive(step, context)

            # Determine step status
            status = "passed"
            if step.step_type == "diagnose" and step.expected_output:
                if step.expected_output.lower() not in output.lower():
                    status = "failed"
                    finding = (
                        f"Expected '{step.expected_output}' not found in output"
                    )

            # Extract finding from diagnostic steps
            if step.step_type in ("diagnose", "verify") and not finding:
                finding = output[:500] if output else None

            # Collect symptoms from failed diagnostics
            if status == "failed" and step.step_type == "diagnose":
                context.add_symptom(
                    f"{step.name}: {finding or 'diagnostic check failed'}"
                )

            duration_ms = int((time.monotonic() - start) * 1000)

            return TroubleshootingStepResult(
                step_id=step.id,
                step_name=step.name,
                status=status,
                output=output,
                evidence=evidence,
                duration_ms=duration_ms,
                finding=finding,
            )

        except Exception as e:
            duration_ms = int((time.monotonic() - start) * 1000)
            logger.exception(
                "Troubleshooting step failed",
                extra={"step_id": step.id},
            )
            return TroubleshootingStepResult(
                step_id=step.id,
                step_name=step.name,
                status="error",
                output=str(e),
                duration_ms=duration_ms,
                finding=f"Step execution error: {e}",
            )

    async def _execute_via_skill(
        self,
        step: TroubleshootingStep,
        context: TroubleshootingContext,
    ) -> tuple[str, list[DiagnosticEvidence]]:
        """Execute a step by invoking another skill."""
        if not self._skill_executor:
            return "Skill executor not available", []

        from resolveagent.skills.loader import SkillLoader

        loader = SkillLoader()
        skill = loader.get(step.skill_ref or "")
        if skill is None:
            return f"Referenced skill '{step.skill_ref}' not found", []

        result = await self._skill_executor.execute(skill, dict(context.variables))
        output = str(result.outputs) if result.success else (result.error or "")
        evidence = [
            DiagnosticEvidence(
                source=f"skill:{step.skill_ref}",
                content=output[:2000],
            )
        ]
        return output, evidence

    async def _execute_command(
        self,
        step: TroubleshootingStep,
        context: TroubleshootingContext,
    ) -> tuple[str, list[DiagnosticEvidence]]:
        """Execute a step by running a command (placeholder for sandbox)."""
        # In production this would use the SandboxExecutor
        output = f"[Command execution placeholder] {step.command}"
        evidence = [
            DiagnosticEvidence(
                source=f"command:{step.id}",
                content=f"Command: {step.command}\n{output}",
            )
        ]
        return output, evidence

    def _execute_descriptive(
        self,
        step: TroubleshootingStep,
        context: TroubleshootingContext,
    ) -> tuple[str, list[DiagnosticEvidence]]:
        """Execute a descriptive step (no command or skill ref)."""
        output = step.description or step.name
        evidence = [
            DiagnosticEvidence(
                source=f"step:{step.id}",
                content=output,
            )
        ]
        return output, evidence

    def _evaluate_condition(
        self,
        condition: str,
        context: TroubleshootingContext,
    ) -> bool:
        """Evaluate a step condition against the current context.

        Supported condition formats:
        - "step_id.status == 'failed'"
        - "step_id.status != 'passed'"
        """
        try:
            parts = condition.split(".")
            if len(parts) >= 2:
                step_id = parts[0].strip()
                rest = ".".join(parts[1:]).strip()

                result = context.get_step_result(step_id)
                if result is None:
                    return False

                if "==" in rest:
                    field, _, expected = rest.partition("==")
                    field = field.strip()
                    expected = expected.strip().strip("'\"")
                    actual = getattr(result, field, None)
                    return str(actual) == expected

                if "!=" in rest:
                    field, _, expected = rest.partition("!=")
                    field = field.strip()
                    expected = expected.strip().strip("'\"")
                    actual = getattr(result, field, None)
                    return str(actual) != expected

            return True
        except Exception:
            logger.warning("Failed to evaluate condition: %s", condition)
            return True

    def _synthesize_solution(
        self,
        context: TroubleshootingContext,
        scenario: ScenarioConfig,
        inputs: dict[str, Any],
    ) -> StructuredSolution:
        """Assemble the four-element StructuredSolution from collected data."""
        # Symptoms: from context accumulation + failed diagnostic steps
        symptoms = list(context.symptoms)
        if not symptoms:
            for sr in context.step_results:
                if sr.status == "failed" and sr.finding:
                    symptoms.append(sr.finding)

        # Key information: all collected evidence
        key_info = list(context.evidence)

        # Troubleshooting steps: all step results
        ts_steps = list(context.step_results)

        # Resolution steps: from action-type steps
        resolution_steps: list[str] = []
        for sr in context.step_results:
            if sr.step_id.startswith("suggest") or sr.step_id.startswith("resolve"):
                if sr.output:
                    resolution_steps.append(sr.output)
            elif sr.finding and sr.status == "failed":
                resolution_steps.append(f"Address: {sr.finding}")

        if not resolution_steps:
            resolution_steps.append(
                "Review the diagnostic results above and apply appropriate fixes"
            )

        # Calculate confidence based on step completion
        total = len(context.step_results)
        completed = sum(
            1 for r in context.step_results if r.status in ("passed", "failed")
        )
        confidence = completed / total if total > 0 else 0.0

        return StructuredSolution(
            symptoms=symptoms,
            key_information=key_info,
            troubleshooting_steps=ts_steps,
            resolution_steps=resolution_steps,
            summary=f"Troubleshooting: {scenario.domain}",
            confidence=confidence,
            severity=inputs.get("severity"),
            metadata={
                "domain": scenario.domain,
                "tags": scenario.tags,
                "input_params": {k: str(v)[:100] for k, v in inputs.items()},
            },
        )
