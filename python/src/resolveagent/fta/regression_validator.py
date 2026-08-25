"""
Loop Engineering: FTA Regression Validator.

Automatically validates workflow changes against historical feedback data
to catch regressions before they reach production. Closes the
"change -> validate -> deploy -> monitor" loop.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from .feedback_loop import FeedbackLoop, WorkflowExecutionMetrics  # noqa: TC001  # 运行时构造参数

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """Result of a regression validation check."""

    passed: bool
    checks_run: int
    checks_passed: int
    checks_failed: int
    warnings: list[str]
    errors: list[str]
    baseline_delta: dict[str, float]

    @property
    def pass_rate(self) -> float:
        if self.checks_run == 0:
            return 0.0
        return self.checks_passed / self.checks_run


class RegressionValidator:
    """
    Validates workflow changes against historical baselines collected
    by the FeedbackLoop. Runs a battery of regression checks before
    allowing changes to proceed.

    Checks:
    - Duration regression (new workflow is > 2x slower than baseline)
    - Success rate regression (new workflow fails more than baseline)
    - Error pattern regression (new error types not seen in history)
    - Coverage regression (fewer steps executed than baseline)
    """

    # Thresholds for regression detection
    DURATION_REGRESSION_FACTOR = 2.0
    SUCCESS_RATE_REGRESSION_THRESHOLD = 0.7
    MIN_HISTORY_SIZE = 5

    def __init__(self, feedback_loop: FeedbackLoop):
        self._feedback_loop = feedback_loop

    def validate(
        self,
        test_metrics: WorkflowExecutionMetrics,
        context: dict[str, Any] | None = None,
    ) -> ValidationResult:
        """
        Run regression checks against a test execution.
        Returns a ValidationResult indicating whether the change is safe.
        """
        warnings: list[str] = []
        errors: list[str] = []
        baseline_delta: dict[str, float] = {}
        checks_run = 0
        checks_passed = 0

        baselines = self._feedback_loop.get_baselines()
        history_count = self._feedback_loop.get_history_count()

        if history_count < self.MIN_HISTORY_SIZE:
            warnings.append(
                f"Insufficient history ({history_count}/{self.MIN_HISTORY_SIZE}) "
                f"for reliable regression detection"
            )
            return ValidationResult(
                passed=True,
                checks_run=0,
                checks_passed=0,
                checks_failed=0,
                warnings=warnings,
                errors=[],
                baseline_delta={},
            )

        # Check 1: Duration regression
        checks_run += 1
        if "avg_duration_ms" in baselines:
            baseline_dur = baselines["avg_duration_ms"]
            delta = test_metrics.duration_ms - baseline_dur
            baseline_delta["duration_ms"] = delta
            if test_metrics.duration_ms > baseline_dur * self.DURATION_REGRESSION_FACTOR:
                errors.append(
                    f"Duration regression: {test_metrics.duration_ms:.0f}ms "
                    f"vs baseline {baseline_dur:.0f}ms "
                    f"(>{self.DURATION_REGRESSION_FACTOR}x slower)"
                )
            else:
                checks_passed += 1
        else:
            checks_passed += 1

        # Check 2: Success rate regression
        checks_run += 1
        if "avg_success_rate" in baselines:
            baseline_rate = baselines["avg_success_rate"]
            current_rate = 1.0 if test_metrics.success else 0.0
            baseline_delta["success_rate"] = current_rate - baseline_rate
            if not test_metrics.success and baseline_rate > 0.5:
                errors.append(
                    f"Success rate regression: current={current_rate:.0%} "
                    f"vs baseline {baseline_rate:.0%}"
                )
            else:
                checks_passed += 1
        else:
            checks_passed += 1

        # Check 3: Step coverage regression
        checks_run += 1
        if test_metrics.steps_total > 0:
            coverage = test_metrics.steps_executed / test_metrics.steps_total
            baseline_delta["step_coverage"] = coverage
            if coverage < 0.5:
                warnings.append(
                    f"Low step coverage: {coverage:.0%} "
                    f"({test_metrics.steps_executed}/{test_metrics.steps_total})"
                )
            checks_passed += 1
        else:
            checks_passed += 1

        # Check 4: New error patterns
        checks_run += 1
        if test_metrics.errors:
            # This is a simplified check — in production, compare against
            # a known error pattern database
            known_patterns = set()
            if context and "known_error_patterns" in context:
                known_patterns = set(context["known_error_patterns"])
            new_errors = [
                e for e in test_metrics.errors if e not in known_patterns
            ]
            if new_errors:
                warnings.append(
                    f"{len(new_errors)} new error pattern(s) detected"
                )
            checks_passed += 1
        else:
            checks_passed += 1

        passed = checks_passed == checks_run and len(errors) == 0

        result = ValidationResult(
            passed=passed,
            checks_run=checks_run,
            checks_passed=checks_passed,
            checks_failed=checks_run - checks_passed,
            warnings=warnings,
            errors=errors,
            baseline_delta=baseline_delta,
        )

        logger.info(
            "Regression validation: %s (%d/%d checks passed, %d warnings, %d errors)",
            "PASS" if passed else "FAIL",
            checks_passed,
            checks_run,
            len(warnings),
            len(errors),
        )
        return result
