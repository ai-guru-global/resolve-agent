"""FTA Analyzer tool for Dify.

Exposes ResolveAgent's Fault Tree Analysis capability as a Dify tool.
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


class FTAAnalyzerTool(Tool):
    """Dify wrapper for FTA Analyzer."""

    def _invoke(self, tool_parameters: dict[str, Any]) -> Generator[ToolInvokeMessage, None, None]:
        incident = tool_parameters.get("incident_description", "")
        context = tool_parameters.get("system_context", "")
        mode = tool_parameters.get("evaluation_mode", "parallel")

        if not incident:
            yield self.create_text_message("Error: incident_description is required")
            return

        result = self._analyze_remote(incident, context, mode)
        if result is None:
            result = self._analyze_local(incident, context, mode)
        yield self.create_text_message(result)

    def _credentials(self) -> tuple[str, str]:
        """Resolve endpoint and API key from provider credentials or environment."""
        credentials: dict[str, Any] = getattr(getattr(self, "runtime", None), "credentials", None) or {}
        endpoint = credentials.get("endpoint") or os.environ.get("RESOLVEAGENT_ENDPOINT", "http://localhost:8080")
        api_key = credentials.get("api_key") or os.environ.get("RESOLVEAGENT_API_KEY", "")
        return endpoint, api_key

    def _analyze_remote(self, incident: str, context: str, mode: str) -> str | None:
        """Analyze using the remote ResolveAgent API. Returns None if unavailable."""
        try:
            import httpx
        except ImportError:
            return None

        endpoint, api_key = self._credentials()

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
            logger.warning("Remote analysis failed, falling back to local analysis: %s", e)
            return None

    def _analyze_local(self, incident: str, context: str, mode: str) -> str:
        """Heuristic local analysis when the ResolveAgent backend is unavailable."""
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
            f"**Top Event Triggered:** {bool(causes)}\n\n"
            f"**Identified Root Causes:**\n" + "\n".join(f"- {c}" for c in causes) + f"\n\n**Evaluation Mode:** {mode}\n"
        )
