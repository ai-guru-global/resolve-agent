"""Code Diagnosis tool for Dify.

Exposes ResolveAgent's multi-language code analysis capability as a Dify tool.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from dify_plugin import Tool

from resolveagent.integrations.dify.tools import CodeDiagnosisTool as _CodeDiagnosisTool


class CodeDiagnosisTool(_CodeDiagnosisTool):
    """Dify wrapper for Code Diagnosis."""

    def _invoke(self, tool_parameters: dict[str, Any]) -> Any:
        """Invoke the code diagnosis tool.

        Args:
            tool_parameters: Parameters from Dify.

        Returns:
            Diagnosis result as a generator of message chunks.
        """
        result = self.invoke(tool_parameters)
        yield {"type": "text", "text": result}
