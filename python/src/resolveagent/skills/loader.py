"""Skill discovery and loading."""

from __future__ import annotations

import importlib
import logging
from pathlib import Path
from typing import Any

from resolveagent.skills.manifest import SkillManifest, load_manifest

logger = logging.getLogger(__name__)


class SkillLoader:
    """Discovers and loads agent skills.

    Skills can be loaded from:
    - Local directories
    - Git repositories
    - Skill registry (remote)
    """

    def __init__(self) -> None:
        self._loaded: dict[str, LoadedSkill] = {}

    def load_from_directory(self, path: str) -> LoadedSkill:
        """Load a skill from a local directory.

        Args:
            path: Path to the skill directory containing manifest.yaml.

        Returns:
            LoadedSkill instance.
        """
        skill_dir = Path(path)
        manifest = load_manifest(str(skill_dir / "manifest.yaml"))

        # Import the entry point module
        module_path, _, func_name = manifest.entry_point.rpartition(":")
        if not func_name:
            func_name = "run"

        logger.info(
            "Loading skill",
            extra={"name": manifest.name, "path": path},
        )

        loaded = LoadedSkill(
            manifest=manifest,
            directory=skill_dir,
            entry_module=module_path,
            entry_function=func_name,
        )

        self._loaded[manifest.name] = loaded
        return loaded

    def get(self, name: str) -> LoadedSkill | None:
        """Get a loaded skill by name."""
        return self._loaded.get(name)

    def list_loaded(self) -> list[str]:
        """List names of all loaded skills."""
        return list(self._loaded.keys())


class LoadedSkill:
    """A skill that has been loaded and is ready for execution."""

    def __init__(
        self,
        manifest: SkillManifest,
        directory: Path,
        entry_module: str,
        entry_function: str,
    ) -> None:
        self.manifest = manifest
        self.directory = directory
        self.entry_module = entry_module
        self.entry_function = entry_function
        self._callable: Any = None

    def get_callable(self) -> Any:
        """Get the skill's entry point function."""
        if self._callable is None:
            module = importlib.import_module(self.entry_module)
            self._callable = getattr(module, self.entry_function)
        return self._callable
