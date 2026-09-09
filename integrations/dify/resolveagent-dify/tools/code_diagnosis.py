"""Code Diagnosis tool for Dify.

Exposes ResolveAgent's multi-language code analysis capability as a Dify tool.
Self-contained: the packaged plugin only ships requirements.txt dependencies,
so the analysis logic is inlined here instead of importing resolveagent.
"""

from __future__ import annotations

import logging
import os
from collections.abc import Generator
from typing import Any

from dify_plugin import Tool
from dify_plugin.entities.tool import ToolInvokeMessage

logger = logging.getLogger(__name__)


class CodeDiagnosisTool(Tool):
    """Dify wrapper for Code Diagnosis."""

    def _invoke(self, tool_parameters: dict[str, Any]) -> Generator[ToolInvokeMessage, None, None]:
        code = tool_parameters.get("code_snippet", "")
        language = tool_parameters.get("language", "python")
        diag_type = tool_parameters.get("diagnosis_type", "general")

        if not code:
            yield self.create_text_message("Error: code_snippet is required")
            return

        result = self._diagnose_remote(code, language, diag_type)
        if result is None:
            result = self._analyze_local(code, language, diag_type)
        yield self.create_text_message(result)

    def _credentials(self) -> tuple[str, str]:
        """Resolve endpoint and API key from provider credentials or environment."""
        credentials: dict[str, Any] = getattr(getattr(self, "runtime", None), "credentials", None) or {}
        endpoint = credentials.get("endpoint") or os.environ.get("RESOLVEAGENT_ENDPOINT", "http://localhost:8080")
        api_key = credentials.get("api_key") or os.environ.get("RESOLVEAGENT_API_KEY", "")
        return endpoint, api_key

    def _diagnose_remote(self, code: str, language: str, diag_type: str) -> str | None:
        """Diagnose using the remote ResolveAgent API. Returns None if unavailable."""
        try:
            import httpx
        except ImportError:
            return None

        endpoint, api_key = self._credentials()

        try:
            response = httpx.post(
                f"{endpoint}/api/v1/code/diagnose",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "code_snippet": code,
                    "language": language,
                    "diagnosis_type": diag_type,
                },
                timeout=60.0,
            )
            response.raise_for_status()
            data = response.json()
            result: str = data.get("result", "Diagnosis completed")
            return result
        except Exception as e:
            logger.warning("Remote diagnosis failed, falling back to local analysis: %s", e)
            return None

    def _analyze_local(self, code: str, language: str, diag_type: str) -> str:
        """Heuristic local analysis when the ResolveAgent backend is unavailable."""
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

        if diag_type == "general":
            if "TODO" in code or "FIXME" in code:
                issues.append("Code contains TODO/FIXME comments")
            if "print(" in code:
                issues.append("Debug print statements found - remove before production")
            if len(code.split("\n")) > 200:
                issues.append("File is quite long - consider refactoring into smaller modules")

        lines = [
            "## Code Diagnosis Result",
            "",
            f"**Language:** {language}",
            f"**Diagnosis Type:** {diag_type}",
            "",
        ]

        if issues:
            lines.append("**Issues Detected:**")
            for issue in issues:
                lines.append(f"- {issue}")
            lines.append("")
        else:
            lines.append("No obvious issues detected.")
            lines.append("")

        return "\n".join(lines)
