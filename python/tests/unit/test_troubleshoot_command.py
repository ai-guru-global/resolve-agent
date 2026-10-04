"""Unit tests for TroubleshootingEngine command execution (troubleshoot.py).

Covers the sandbox-wired `_execute_command` path: real SandboxExecutor runs,
honest degradation when no sandbox is configured, and evidence-driven step
status for diagnose steps.
"""

from __future__ import annotations

import pytest

from resolveagent.skills.manifest import (
    ScenarioConfig,
    SkillManifest,
    SkillType,
    TroubleshootingStep,
)
from resolveagent.skills.sandbox import SandboxConfig, SandboxExecutor
from resolveagent.skills.troubleshoot import TroubleshootingEngine


def make_manifest(steps: list[TroubleshootingStep]) -> SkillManifest:
    return SkillManifest(
        name="demo-scenario",
        version="1.0.0",
        description="demo",
        entry_point="main",
        skill_type=SkillType.SCENARIO,
        scenario=ScenarioConfig(
            domain="kubernetes",
            tags=["demo"],
            troubleshooting_flow=steps,
        ),
    )


class TestCommandWithoutSandbox:
    async def test_missing_sandbox_reported_honestly(self) -> None:
        engine = TroubleshootingEngine()
        manifest = make_manifest(
            [
                TroubleshootingStep(
                    id="step-1",
                    name="check pods",
                    step_type="collect",
                    command="kubectl get pods",
                    order=1,
                )
            ]
        )

        solution = await engine.execute(manifest, {})

        result = solution.troubleshooting_steps[0]
        assert "command NOT executed" in result.output
        assert "kubectl get pods" in result.output
        assert result.status == "passed"  # collect 步骤不参与 expected_output 判定


class TestCommandWithSandbox:
    @pytest.fixture
    def sandbox(self) -> SandboxExecutor:
        return SandboxExecutor(SandboxConfig(timeout_seconds=10))

    async def test_successful_command_uses_real_stdout(self, sandbox: SandboxExecutor) -> None:
        engine = TroubleshootingEngine(sandbox_executor=sandbox)
        manifest = make_manifest(
            [
                TroubleshootingStep(
                    id="step-1",
                    name="echo check",
                    step_type="collect",
                    command="echo nginx-pod-running",
                    order=1,
                )
            ]
        )

        solution = await engine.execute(manifest, {})
        result = solution.troubleshooting_steps[0]

        assert result.status == "passed"
        assert result.output.strip() == "nginx-pod-running"

        evidence = result.evidence[0]
        assert evidence.source == "command:step-1"
        assert "nginx-pod-running" in evidence.content
        assert "return_code: 0" in evidence.content

    async def test_failing_command_reports_stderr_and_rc(self, sandbox: SandboxExecutor) -> None:
        engine = TroubleshootingEngine(sandbox_executor=sandbox)
        manifest = make_manifest(
            [
                TroubleshootingStep(
                    id="step-1",
                    name="failing check",
                    step_type="collect",
                    command="echo boom >&2; exit 3",
                    order=1,
                )
            ]
        )

        solution = await engine.execute(manifest, {})
        result = solution.troubleshooting_steps[0]

        assert result.status == "passed"  # collect 步骤只记录不判定
        assert result.output.startswith("[command failed rc=3]")
        assert "boom" in result.output

    async def test_diagnose_status_driven_by_real_stdout(self, sandbox: SandboxExecutor) -> None:
        steps = [
            TroubleshootingStep(
                id="diag-1",
                name="probe crashloop",
                step_type="diagnose",
                command="echo CrashLoopBackOff",
                expected_output="CrashLoopBackOff",
                order=1,
            ),
            TroubleshootingStep(
                id="diag-2",
                name="probe imagepull",
                step_type="diagnose",
                command="echo nothing-wrong-here",
                expected_output="ImagePullBackOff",
                order=2,
            ),
        ]
        engine = TroubleshootingEngine(sandbox_executor=sandbox)

        solution = await engine.execute(make_manifest(steps), {})
        by_id = {r.step_id: r for r in solution.troubleshooting_steps}

        assert by_id["diag-1"].status == "passed"
        assert by_id["diag-2"].status == "failed"
        assert "Expected 'ImagePullBackOff' not found" in (by_id["diag-2"].finding or "")
        # 失败的诊断进入症状与解决建议
        assert any("diag-2" in s or "ImagePullBackOff" in s for s in solution.symptoms)

    async def test_full_solution_shape_with_sandbox(self, sandbox: SandboxExecutor) -> None:
        engine = TroubleshootingEngine(sandbox_executor=sandbox)
        manifest = make_manifest(
            [
                TroubleshootingStep(
                    id="collect-1",
                    name="gather",
                    step_type="collect",
                    command="echo evidence-line",
                    order=1,
                ),
            ]
        )

        solution = await engine.execute(manifest, {"severity": "high"})

        assert solution.summary == "Troubleshooting: kubernetes"
        assert solution.confidence == 1.0
        assert solution.severity == "high"
        assert any("evidence-line" in e.content for e in solution.key_information)
