"""MCP server configuration parsing.

Supports loading MCP server configurations from YAML/JSON files.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# MCP Server Configuration
# ---------------------------------------------------------------------------


class MCPServerConfig(BaseModel):
    """Configuration for a single MCP server."""

    name: str
    transport: str = "stdio"  # stdio | http | sse
    command: str | None = None  # For stdio transport
    args: list[str] = Field(default_factory=list)  # For stdio transport
    url: str | None = None  # For http/sse transport
    headers: dict[str, str] = Field(default_factory=dict)  # For http transport
    env: dict[str, str] = Field(default_factory=dict)
    timeout_seconds: float = 30.0
    enabled: bool = True

    def resolve_env(self) -> dict[str, str]:
        """Resolve environment variables in config values.

        Supports ${VAR} and ${VAR:-default} syntax.
        """
        resolved: dict[str, str] = {}
        for key, value in self.env.items():
            resolved[key] = _resolve_env_vars(value)
        return resolved

    def resolve_command(self) -> str | None:
        """Resolve environment variables in command."""
        if self.command is None:
            return None
        return _resolve_env_vars(self.command)

    def resolve_url(self) -> str | None:
        """Resolve environment variables in URL."""
        if self.url is None:
            return None
        return _resolve_env_vars(self.url)


class MCPConfig(BaseModel):
    """Top-level MCP configuration."""

    enabled: bool = False
    servers: list[MCPServerConfig] = Field(default_factory=list)

    def get_server(self, name: str) -> MCPServerConfig | None:
        """Get a server configuration by name."""
        for server in self.servers:
            if server.name == name and server.enabled:
                return server
        return None

    def list_enabled_servers(self) -> list[MCPServerConfig]:
        """List all enabled server configurations."""
        return [s for s in self.servers if s.enabled]


# ---------------------------------------------------------------------------
# Configuration Loading
# ---------------------------------------------------------------------------


def _resolve_env_vars(value: str) -> str:
    """Resolve ${VAR} and ${VAR:-default} syntax in strings."""
    import re

    def replacer(match: re.Match[str]) -> str:
        var_name = match.group(1)
        default = match.group(2)
        env_value = os.environ.get(var_name)
        if env_value is not None:
            return env_value
        if default is not None:
            return default
        return match.group(0)  # Return original if not found

    # Match ${VAR} or ${VAR:-default}
    pattern = r"\$\{([^:-]+)(?::-([^}]*))?\}"
    return str(re.sub(pattern, replacer, value))


def load_mcp_config(path: str | Path | None = None) -> MCPConfig:
    """Load MCP configuration from a file.

    Args:
        path: Path to configuration file. If None, looks for:
            1. mcp_servers.json in current directory
            2. mcp_servers.yaml in current directory
            3. resolveagent.yaml with 'mcp' section

    Returns:
        MCPConfig instance.
    """
    if path is not None:
        config_path = Path(path)
        if config_path.exists():
            return _load_from_file(config_path)
        logger.warning("MCP config file not found: %s", path)
        return MCPConfig()

    # Try common locations
    search_paths = [
        Path("mcp_servers.json"),
        Path("mcp_servers.yaml"),
        Path("configs/resolveagent.yaml"),
        Path("resolveagent.yaml"),
    ]

    for config_path in search_paths:
        if config_path.exists():
            return _load_from_file(config_path)

    logger.debug("No MCP config file found, using defaults")
    return MCPConfig()


def _load_from_file(path: Path) -> MCPConfig:
    """Load MCP config from a specific file."""
    suffix = path.suffix.lower()

    try:
        with open(path) as f:
            if suffix in (".yaml", ".yml"):
                data = yaml.safe_load(f)
            elif suffix == ".json":
                data = json.load(f)
            else:
                # Try YAML first, then JSON
                content = f.read()
                try:
                    data = yaml.safe_load(content)
                except Exception:
                    data = json.loads(content)
    except Exception as e:
        logger.error("Failed to load MCP config from %s: %s", path, e)
        return MCPConfig()

    if data is None:
        return MCPConfig()

    # Handle nested 'mcp' section in resolveagent.yaml
    if "mcp" in data:
        data = data["mcp"]

    try:
        return MCPConfig(**data)
    except Exception as e:
        logger.error("Failed to parse MCP config: %s", e)
        return MCPConfig()


def load_mcp_config_from_dict(data: dict[str, Any]) -> MCPConfig:
    """Load MCP configuration from a dictionary.

    Args:
        data: Configuration dictionary, may contain nested 'mcp' key.

    Returns:
        MCPConfig instance.
    """
    if "mcp" in data:
        data = data["mcp"]
    try:
        return MCPConfig(**data)
    except Exception as e:
        logger.error("Failed to parse MCP config from dict: %s", e)
        return MCPConfig()
