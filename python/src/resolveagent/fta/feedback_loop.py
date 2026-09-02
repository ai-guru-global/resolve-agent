"""
Loop Engineering: FTA Workflow Feedback Loop.

Closes the "execute -> evaluate -> learn -> improve" cycle for FTA workflows.
After each workflow execution, this module collects metrics, compares against
historical baselines, and generates improvement suggestions that feed back
into the selector and RAG subsystems.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class WorkflowExecutionMetrics:
    """Metrics collected from a single FTA workflow execution."""

    workflow_id: str
    duration_ms: float
    success: bool
    steps_executed: int
    steps_total: int
    errors: list[str] = field(default_factory=list)
    skill_selections: list[str] = field(default_factory=list)
    started_at: float = 0.0
    completed_at: float = 0.0

    @property
    def success_rate(self) -> float:
        """Return the step-level success rate (0.0-1.0)."""
        if self.steps_total == 0:
            return 0.0
        return self.steps_executed / self.steps_total


@dataclass
class BaselineComparison:
    """Comparison of current execution against historical baseline."""

    metric_name: str
    current_value: float
    baseline_value: float
    delta: float
    is_regression: bool

    @property
    def improvement_pct(self) -> float:
        if self.baseline_value == 0:
            return 0.0
        return ((self.baseline_value - self.current_value) / self.baseline_value) * 100


@dataclass
class ImprovementSuggestion:
    """Actionable suggestion generated from feedback analysis."""

    target: str  # "selector", "rag", "skill", "workflow"
    priority: str  # "high", "medium", "low"
    description: str
    confidence: float  # 0.0-1.0
    metadata: dict[str, Any] = field(default_factory=dict)


class FeedbackLoop:
    """
    Collects FTA workflow execution metrics and generates improvement
    suggestions by comparing against historical baselines.

    This is the Python-side counterpart of the Go feedback.Collector,
    specialized for FTA workflow execution analysis.
    """

    def __init__(self, history_window: int = 100):
        self._history: list[WorkflowExecutionMetrics] = []
        self._history_window = history_window
        self._baselines: dict[str, float] = {}

    def record(self, metrics: WorkflowExecutionMetrics) -> list[ImprovementSuggestion]:
        """
        Record an execution and generate improvement suggestions.
        Returns a list of suggestions that should be acted upon.
        """
        self._history.append(metrics)
        if len(self._history) > self._history_window:
            self._history = self._history[-self._history_window :]

        suggestions = self._analyze(metrics)
        self._update_baselines()
        return suggestions

    def _analyze(self, metrics: WorkflowExecutionMetrics) -> list[ImprovementSuggestion]:
        """Analyze metrics against baselines and generate suggestions."""
        suggestions: list[ImprovementSuggestion] = []

        # Compare against baselines
        comparisons = self._compare_with_baselines(metrics)
        for comp in comparisons:
            if comp.is_regression:
                suggestions.append(
                    ImprovementSuggestion(
                        target="workflow",
                        priority="high",
                        description=(
                            f"Regression detected in {comp.metric_name}: "
                            f"{comp.current_value:.2f} vs baseline "
                            f"{comp.baseline_value:.2f} "
                            f"({comp.improvement_pct:+.1f}%)"
                        ),
                        confidence=0.8,
                        metadata={"metric": comp.metric_name},
                    )
                )

        # Check for skill selection patterns
        if metrics.errors and metrics.skill_selections:
            failing_skills = set()
            for err in metrics.errors:
                for skill in metrics.skill_selections:
                    if skill.lower() in err.lower():
                        failing_skills.add(skill)

            for skill in failing_skills:
                suggestions.append(
                    ImprovementSuggestion(
                        target="selector",
                        priority="medium",
                        description=(f"Skill '{skill}' is associated with errors. Consider lowering its selection weight."),
                        confidence=0.6,
                        metadata={"skill": skill, "errors": metrics.errors},
                    )
                )

        # Check for low success rate
        if not metrics.success and len(self._history) >= 5:
            recent_failures = sum(1 for m in self._history[-5:] if not m.success)
            if recent_failures >= 3:
                suggestions.append(
                    ImprovementSuggestion(
                        target="rag",
                        priority="high",
                        description=(f"{recent_failures}/5 recent executions failed. Enriching RAG knowledge base with error patterns."),
                        confidence=0.9,
                        metadata={"failure_rate": recent_failures / 5},
                    )
                )

        return suggestions

    def _compare_with_baselines(self, metrics: WorkflowExecutionMetrics) -> list[BaselineComparison]:
        """Compare current metrics against stored baselines."""
        comparisons: list[BaselineComparison] = []

        # Duration comparison
        if "avg_duration_ms" in self._baselines:
            baseline_dur = self._baselines["avg_duration_ms"]
            comparisons.append(
                BaselineComparison(
                    metric_name="duration_ms",
                    current_value=metrics.duration_ms,
                    baseline_value=baseline_dur,
                    delta=metrics.duration_ms - baseline_dur,
                    is_regression=metrics.duration_ms > baseline_dur * 1.5,
                )
            )

        # Success rate comparison
        if "avg_success_rate" in self._baselines:
            baseline_rate = self._baselines["avg_success_rate"]
            current_rate = 1.0 if metrics.success else 0.0
            comparisons.append(
                BaselineComparison(
                    metric_name="success_rate",
                    current_value=current_rate,
                    baseline_value=baseline_rate,
                    delta=current_rate - baseline_rate,
                    is_regression=current_rate < baseline_rate * 0.7,
                )
            )

        return comparisons

    def _update_baselines(self) -> None:
        """Recompute baselines from the current history window."""
        if not self._history:
            return

        durations = [m.duration_ms for m in self._history]
        self._baselines["avg_duration_ms"] = sum(durations) / len(durations)

        successes = [1.0 if m.success else 0.0 for m in self._history]
        self._baselines["avg_success_rate"] = sum(successes) / len(successes)

    def get_baselines(self) -> dict[str, float]:
        """Return the current baseline values."""
        return dict(self._baselines)

    def get_history_count(self) -> int:
        """Return the number of recorded executions."""
        return len(self._history)
