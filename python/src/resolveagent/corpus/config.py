"""Corpus configuration and profile loading."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

logger = logging.getLogger(__name__)

# Default chunking strategies per directory pattern
DEFAULT_STRATEGIES: dict[str, tuple[str, int]] = {
    "domain-": ("by_h2", 2000),
    "topic-fta/list": ("by_h3", 1500),
    "topic-skills": ("by_section", 3000),
    "topic-cheat-sheet": ("sentence", 50000),  # full-doc-like
    "topic-dictionary": ("sentence", 500),
}


DEFAULT_EXCLUDE = [".git", ".github", "node_modules", "__pycache__", ".DS_Store"]


@dataclass
class SourceConfig:
    """A single source entry from a corpus profile."""

    path: str
    priority: str = "medium"
    chunking: str = "by_h2"


@dataclass
class CorpusConfig:
    """Loaded corpus configuration profile."""

    name: str = "default"
    description: str = ""
    sources: list[SourceConfig] = field(default_factory=list)
    exclude_patterns: list[str] = field(default_factory=list)
    _strategy_map: dict[str, tuple[str, int]] = field(
        default_factory=lambda: dict(DEFAULT_STRATEGIES)
    )

    def get_chunking_strategy(self, file_path: str) -> tuple[str, int]:
        """Return (strategy, chunk_size) for a given file path.

        Checks loaded profile sources first, falls back to default patterns.
        """
        # Check profile sources
        for src in self.sources:
            if src.path in file_path:
                strategy = src.chunking
                # Map profile strategy names to chunk sizes
                size_map = {
                    "by_h2": 2000,
                    "by_h3": 1500,
                    "by_section": 3000,
                    "full_doc": 50000,
                    "sentence": 512,
                }
                return strategy, size_map.get(strategy, 2000)

        # Fallback to default pattern matching
        for pattern, (strategy, size) in self._strategy_map.items():
            if pattern in file_path:
                return strategy, size

        return "by_h2", 2000

    def is_excluded(self, file_path: str) -> bool:
        """Check if a file should be excluded from import."""
        parts = Path(file_path).parts
        # Always exclude common non-content directories
        for part in parts:
            if part in DEFAULT_EXCLUDE:
                return True
        name = Path(file_path).name
        for pattern in self.exclude_patterns:
            if pattern.startswith("*."):
                if name.endswith(pattern[1:]):
                    return True
            elif name == pattern:
                return True
        return False


def load_profile(profile_path: str) -> CorpusConfig:
    """Load a corpus config profile from a YAML file.

    Args:
        profile_path: Path to a YAML profile file.

    Returns:
        Parsed CorpusConfig.
    """
    path = Path(profile_path)
    if not path.exists():
        logger.warning("Profile not found, using defaults", extra={"path": profile_path})
        return CorpusConfig()

    with open(path) as f:
        data: dict[str, Any] = yaml.safe_load(f) or {}

    sources: list[SourceConfig] = []
    for section_key in ("core", "methodology", "reference"):
        for entry in data.get(section_key, []):
            sources.append(
                SourceConfig(
                    path=entry.get("path", ""),
                    priority=entry.get("priority", "medium"),
                    chunking=entry.get("chunking", "by_h2"),
                )
            )

    return CorpusConfig(
        name=data.get("name", "default"),
        description=data.get("description", ""),
        sources=sources,
        exclude_patterns=data.get("exclude", []),
    )


def load_profile_from_repo(repo_path: str, profile_name: str = "rag-sre-profile") -> CorpusConfig:
    """Load a profile from a cloned kudig-database repository.

    Args:
        repo_path: Path to the cloned repository root.
        profile_name: Profile filename without extension.

    Returns:
        Parsed CorpusConfig.
    """
    profile_path = Path(repo_path) / "corpus-config" / "profiles" / f"{profile_name}.yaml"
    return load_profile(str(profile_path))
