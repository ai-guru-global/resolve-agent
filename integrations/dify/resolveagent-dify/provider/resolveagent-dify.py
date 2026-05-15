"""Dify plugin provider for ResolveAgent.

This module provides the base provider class for Dify to interact with
ResolveAgent's diagnostic capabilities.
"""

from __future__ import annotations

import os
from typing import Any

from dify_plugin import ToolProvider


class ResolveAgentProvider(ToolProvider):
    """Provider for ResolveAgent tools in Dify.

    Configures the connection to the ResolveAgent backend.
    """

    def _validate_credentials(self, credentials: dict[str, Any]) -> None:
        """Validate provider credentials.

        Args:
            credentials: Provider credentials from Dify.

        Raises:
            ValueError: If credentials are invalid.
        """
        endpoint = credentials.get("endpoint") or os.environ.get("RESOLVEAGENT_ENDPOINT")
        if not endpoint:
            raise ValueError(
                "ResolveAgent endpoint is required. "
                "Set it in credentials or via RESOLVEAGENT_ENDPOINT environment variable."
            )

        api_key = credentials.get("api_key") or os.environ.get("RESOLVEAGENT_API_KEY")
        if not api_key:
            raise ValueError(
                "ResolveAgent API key is required. "
                "Set it in credentials or via RESOLVEAGENT_API_KEY environment variable."
            )
