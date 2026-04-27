"""Structured solution models for scenario skill troubleshooting output."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class DiagnosticEvidence(BaseModel):
    """A single piece of diagnostic evidence collected during troubleshooting."""

    source: str
    content: str
    timestamp: str | None = None
    severity: str | None = None


class TroubleshootingStepResult(BaseModel):
    """Result of executing one troubleshooting step."""

    step_id: str
    step_name: str
    status: str  # passed / failed / skipped / error
    output: str = ""
    evidence: list[DiagnosticEvidence] = []
    duration_ms: int = 0
    finding: str | None = None


class StructuredSolution(BaseModel):
    """Four-element standardized troubleshooting output.

    Every scenario skill produces output conforming to this model:
    - symptoms: Problem manifestation descriptions
    - key_information: Critical logs, metrics, and diagnostic data
    - troubleshooting_steps: Diagnostic steps with execution results
    - resolution_steps: Concrete fix measures and execution steps
    """

    symptoms: list[str] = []
    key_information: list[DiagnosticEvidence] = []
    troubleshooting_steps: list[TroubleshootingStepResult] = []
    resolution_steps: list[str] = []
    summary: str = ""
    confidence: float = 0.0
    severity: str | None = None
    metadata: dict[str, Any] = {}

    def to_dict(self) -> dict[str, Any]:
        """Serialize to a plain dictionary."""
        return self.model_dump()

    def to_markdown(self) -> str:
        """Render the four-element solution as formatted Markdown."""
        lines: list[str] = []

        # Header
        if self.summary:
            lines.append(f"# {self.summary}")
            lines.append("")

        # Section 1: Problem Symptoms
        lines.append("## 问题现象")
        lines.append("")
        if self.symptoms:
            for symptom in self.symptoms:
                lines.append(f"- {symptom}")
        else:
            lines.append("_无记录_")
        lines.append("")

        # Section 2: Key Information / Logs
        lines.append("## 关键信息或日志")
        lines.append("")
        if self.key_information:
            for evidence in self.key_information:
                source_label = f"**[{evidence.source}]**"
                if evidence.severity:
                    source_label += f" ({evidence.severity})"
                lines.append(source_label)
                lines.append("```")
                lines.append(evidence.content)
                lines.append("```")
                lines.append("")
        else:
            lines.append("_无记录_")
        lines.append("")

        # Section 3: Troubleshooting Steps
        lines.append("## 排查方案")
        lines.append("")
        if self.troubleshooting_steps:
            for i, step in enumerate(self.troubleshooting_steps, 1):
                status_icon = {
                    "passed": "✓",
                    "failed": "✗",
                    "skipped": "⊘",
                    "error": "⚠",
                }.get(step.status, "?")
                lines.append(f"{i}. [{status_icon}] **{step.step_name}** ({step.duration_ms}ms)")
                if step.finding:
                    lines.append(f"   - 发现: {step.finding}")
                if step.output:
                    lines.append(f"   - 输出: {step.output[:200]}")
                lines.append("")
        else:
            lines.append("_无排查步骤_")
        lines.append("")

        # Section 4: Resolution Steps
        lines.append("## 解决方案")
        lines.append("")
        if self.resolution_steps:
            for i, step in enumerate(self.resolution_steps, 1):
                lines.append(f"{i}. {step}")
        else:
            lines.append("_无解决方案_")
        lines.append("")

        # Footer
        if self.severity:
            lines.append(f"**严重程度**: {self.severity}")
        if self.confidence > 0:
            lines.append(f"**置信度**: {self.confidence:.0%}")

        return "\n".join(lines)
