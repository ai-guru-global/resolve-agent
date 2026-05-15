"""Dify tool implementations for ResolveAgent.

These tools can be wrapped by Dify's plugin SDK or used standalone.
Each tool is implemented as a plain Python class for testability.
"""

from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


class FTAAnalyzerTool:
    """Fault Tree Analysis tool for Dify.

    Analyzes system failures using FTA to identify root causes.
    """

    def invoke(self, tool_parameters: dict[str, Any]) -> str:
        """Invoke the FTA analyzer.

        Args:
            tool_parameters: Parameters including:
                - incident_description: Description of the incident
                - system_context: Optional system context
                - evaluation_mode: "parallel" or "sequential"

        Returns:
            Analysis result as markdown text.
        """
        incident = tool_parameters.get("incident_description", "")
        context = tool_parameters.get("system_context", "")
        mode = tool_parameters.get("evaluation_mode", "parallel")

        if not incident:
            return "Error: incident_description is required"

        try:
            return self._analyze_local(incident, context, mode)
        except Exception as e:
            logger.warning("Local analysis failed: %s", e)
            return self._analyze_remote(incident, context, mode)

    def _analyze_local(self, incident: str, context: str, mode: str) -> str:
        """Analyze using local ResolveAgent FTA engine."""
        from resolveagent.fta.parallel_evaluator import ParallelFTAEvaluator
        from resolveagent.fta.tree import EventType, FaultTree, FTAEvent, FTAGate, GateType

        tree = FaultTree(
            id="dify-analysis",
            name="Incident Analysis",
            top_event_id="top",
            events=[
                FTAEvent(id="top", name="Incident", event_type=EventType.TOP),
                FTAEvent(id="service_down", name="Service Down", event_type=EventType.BASIC, value=True),
                FTAEvent(id="db_error", name="DB Error", event_type=EventType.BASIC, value="error" in incident.lower()),
                FTAEvent(id="network_issue", name="Network Issue", event_type=EventType.BASIC, value="network" in incident.lower()),
            ],
            gates=[
                FTAGate(
                    id="g1",
                    name="Root Cause",
                    gate_type=GateType.OR,
                    input_ids=["service_down", "db_error", "network_issue"],
                    output_id="top",
                ),
            ],
        )

        evaluator = ParallelFTAEvaluator()
        import asyncio

        result = asyncio.run(evaluator.evaluate_tree(tree, {"description": incident, "context": context}))

        causes = []
        if "error" in incident.lower():
            causes.append("Database error detected")
        if "network" in incident.lower():
            causes.append("Network connectivity issue detected")
        if "timeout" in incident.lower():
            causes.append("Timeout / latency issue detected")
        if not causes:
            causes.append("General service degradation")

        return (
            f"## FTA Analysis Result\n\n"
            f"**Incident:** {incident[:200]}...\n\n"
            f"**Top Event Triggered:** {result}\n\n"
            f"**Identified Root Causes:**\n"
            + "\n".join(f"- {c}" for c in causes)
            + f"\n\n**Evaluation Mode:** {mode}\n"
        )

    def _analyze_remote(self, incident: str, context: str, mode: str) -> str:
        """Analyze using remote ResolveAgent API."""
        try:
            import httpx
        except ImportError:
            return "Remote analysis unavailable: httpx not installed"

        endpoint = os.environ.get("RESOLVEAGENT_ENDPOINT", "http://localhost:8080")
        api_key = os.environ.get("RESOLVEAGENT_API_KEY", "")

        try:
            response = httpx.post(
                f"{endpoint}/api/v1/fta/analyze",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "incident_description": incident,
                    "system_context": context,
                    "evaluation_mode": mode,
                },
                timeout=60.0,
            )
            response.raise_for_status()
            data = response.json()
            result: str = data.get("result", "Analysis completed")
            return result
        except Exception as e:
            return f"Remote analysis failed: {e}. Please check RESOLVEAGENT_ENDPOINT configuration."


class CodeDiagnosisTool:
    """Code diagnosis tool for Dify.

    Analyzes code snippets to find bugs, performance issues, and security problems.
    """

    def invoke(self, tool_parameters: dict[str, Any]) -> str:
        """Invoke the code diagnosis tool.

        Args:
            tool_parameters: Parameters including:
                - code_snippet: Source code to analyze
                - language: Programming language
                - diagnosis_type: Type of diagnosis

        Returns:
            Diagnosis result as markdown text.
        """
        code = tool_parameters.get("code_snippet", "")
        language = tool_parameters.get("language", "python")
        diag_type = tool_parameters.get("diagnosis_type", "general")

        if not code:
            return "Error: code_snippet is required"

        try:
            return self._analyze_code(code, language, diag_type)
        except Exception as e:
            logger.warning("Code analysis failed: %s", e)
            return self._fallback_analysis(code, language, diag_type)

    def _analyze_code(self, code: str, language: str, diag_type: str) -> str:
        """Analyze code using ResolveAgent parsers."""
        from resolveagent.code_analysis.parsers.factory import ParserFactory

        factory = ParserFactory()
        parser = factory.get_parser(language)

        if parser is None:
            return f"Language '{language}' is not yet supported by ResolveAgent parsers."

        parsed = parser.parse(code)

        issues = []

        if diag_type in ("general", "security"):
            if "eval(" in code or "exec(" in code:
                issues.append("Security: Use of eval/exec detected - potential code injection risk")
            if "password" in code.lower() or "secret" in code.lower():
                issues.append("Security: Hardcoded credentials may be present")

        if diag_type in ("general", "performance"):
            if code.count("for ") > 3:
                issues.append("Performance: Multiple nested loops - consider optimization")
            if "SELECT *" in code:
                issues.append("Performance: SELECT * query - fetch only required columns")

        lines = [
            "## Code Diagnosis Result",
            "",
            f"**Language:** {language}",
            f"**Diagnosis Type:** {diag_type}",
            f"**Functions Found:** {len(parsed.functions)}",
            f"**Calls Found:** {len(parsed.calls)}",
            f"**Imports Found:** {len(parsed.imports)}",
            "",
        ]

        if parsed.functions:
            lines.append("**Functions:**")
            for func in parsed.functions[:10]:
                lines.append(f"- `{func.name}` (line {func.start_line})")
            if len(parsed.functions) > 10:
                lines.append(f"- ... and {len(parsed.functions) - 10} more")
            lines.append("")

        if issues:
            lines.append("**Issues Detected:**")
            for issue in issues:
                lines.append(f"- {issue}")
            lines.append("")
        else:
            lines.append("No obvious issues detected.")
            lines.append("")

        if parsed.errors:
            lines.append("**Parse Errors:**")
            for error in parsed.errors:
                lines.append(f"- {error}")
            lines.append("")

        return "\n".join(lines)

    def _fallback_analysis(self, code: str, language: str, diag_type: str) -> str:
        """Fallback analysis when parsers are unavailable."""
        lines = [
            "## Code Diagnosis Result (Fallback)",
            "",
            f"**Language:** {language}",
            f"**Diagnosis Type:** {diag_type}",
            "",
            "Note: ResolveAgent parsers are not available. Performing basic analysis.",
            "",
        ]

        issues = []
        if "TODO" in code or "FIXME" in code:
            issues.append("Code contains TODO/FIXME comments")
        if "print(" in code:
            issues.append("Debug print statements found - remove before production")
        if len(code.split("\n")) > 200:
            issues.append("File is quite long - consider refactoring into smaller modules")

        if issues:
            lines.append("**Basic Issues:**")
            for issue in issues:
                lines.append(f"- {issue}")
        else:
            lines.append("No basic issues detected.")

        return "\n".join(lines)
