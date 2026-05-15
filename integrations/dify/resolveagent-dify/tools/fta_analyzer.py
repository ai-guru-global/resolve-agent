"""FTA Analyzer tool for Dify.

Exposes ResolveAgent's Fault Tree Analysis capability as a Dify tool.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from dify_plugin import Tool

from resolveagent.integrations.dify.tools import FTAAnalyzerTool as _FTAAnalyzerTool


class FTAAnalyzerTool(_FTAAnalyzerTool):
    """Dify wrapper for FTA Analyzer."""

    def _invoke(self, tool_parameters: dict[str, Any]) -> Any:
        """Invoke the FTA analyzer.

        Args:
            tool_parameters: Parameters from Dify.

        Returns:
            Analysis result as a generator of message chunks.
        """
        result = self.invoke(tool_parameters)
        # Dify expects generator of message objects
        yield {"type": "text", "text": result}
