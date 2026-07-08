"""Tests for the Loop Engineering feedback loop and regression validator."""

import pytest
from resolveagent.fta.feedback_loop import (
    FeedbackLoop,
    WorkflowExecutionMetrics,
    ImprovementSuggestion,
)
from resolveagent.fta.regression_validator import (
    RegressionValidator,
    ValidationResult,
)


class TestFeedbackLoop:
    def test_record_and_baselines(self):
        loop = FeedbackLoop(history_window=10)
        assert loop.get_history_count() == 0
        assert loop.get_baselines() == {}

        metrics = WorkflowExecutionMetrics(
            workflow_id="wf-1",
            duration_ms=1000,
            success=True,
            steps_executed=5,
            steps_total=5,
        )
        suggestions = loop.record(metrics)
        assert loop.get_history_count() == 1
        assert isinstance(suggestions, list)

    def test_baseline_computation(self):
        loop = FeedbackLoop()
        for i in range(10):
            loop.record(
                WorkflowExecutionMetrics(
                    workflow_id=f"wf-{i}",
                    duration_ms=1000 + i * 100,
                    success=i % 2 == 0,
                    steps_executed=5,
                    steps_total=5,
                )
            )
        baselines = loop.get_baselines()
        assert "avg_duration_ms" in baselines
        assert "avg_success_rate" in baselines
        assert baselines["avg_success_rate"] == 0.5

    def test_regression_detection(self):
        loop = FeedbackLoop(history_window=20)
        # Build baseline with fast, successful executions
        for i in range(10):
            loop.record(
                WorkflowExecutionMetrics(
                    workflow_id=f"wf-{i}",
                    duration_ms=500,
                    success=True,
                    steps_executed=5,
                    steps_total=5,
                )
            )

        # Record a slow, failing execution
        suggestions = loop.record(
            WorkflowExecutionMetrics(
                workflow_id="wf-slow",
                duration_ms=5000,
                success=False,
                steps_executed=2,
                steps_total=5,
                errors=["timeout error"],
            )
        )
        # Should detect regression
        assert len(suggestions) > 0
        assert any(s.priority == "high" for s in suggestions)

    def test_history_window_truncation(self):
        loop = FeedbackLoop(history_window=5)
        for i in range(20):
            loop.record(
                WorkflowExecutionMetrics(
                    workflow_id=f"wf-{i}",
                    duration_ms=100,
                    success=True,
                    steps_executed=1,
                    steps_total=1,
                )
            )
        assert loop.get_history_count() == 5

    def test_skill_error_suggestions(self):
        loop = FeedbackLoop()
        suggestions = loop.record(
            WorkflowExecutionMetrics(
                workflow_id="wf-err",
                duration_ms=100,
                success=False,
                steps_executed=1,
                steps_total=3,
                errors=["skill_diagnose failed"],
                skill_selections=["skill_diagnose"],
            )
        )
        skill_suggestions = [s for s in suggestions if s.target == "selector"]
        assert len(skill_suggestions) > 0


class TestRegressionValidator:
    def test_insufficient_history_passes(self):
        loop = FeedbackLoop()
        validator = RegressionValidator(loop)
        result = validator.validate(
            WorkflowExecutionMetrics(
                workflow_id="wf-1",
                duration_ms=1000,
                success=True,
                steps_executed=5,
                steps_total=5,
            )
        )
        assert result.passed
        assert result.checks_run == 0

    def test_good_execution_passes(self):
        loop = FeedbackLoop()
        # Build baseline
        for i in range(10):
            loop.record(
                WorkflowExecutionMetrics(
                    workflow_id=f"wf-{i}",
                    duration_ms=500,
                    success=True,
                    steps_executed=5,
                    steps_total=5,
                )
            )

        validator = RegressionValidator(loop)
        result = validator.validate(
            WorkflowExecutionMetrics(
                workflow_id="wf-test",
                duration_ms=600,
                success=True,
                steps_executed=5,
                steps_total=5,
            )
        )
        assert result.passed
        assert result.checks_run > 0

    def test_slow_execution_fails(self):
        loop = FeedbackLoop()
        for i in range(10):
            loop.record(
                WorkflowExecutionMetrics(
                    workflow_id=f"wf-{i}",
                    duration_ms=100,
                    success=True,
                    steps_executed=5,
                    steps_total=5,
                )
            )

        validator = RegressionValidator(loop)
        result = validator.validate(
            WorkflowExecutionMetrics(
                workflow_id="wf-slow",
                duration_ms=5000,
                success=True,
                steps_executed=5,
                steps_total=5,
            )
        )
        assert not result.passed
        assert len(result.errors) > 0
