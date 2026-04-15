"""Data acquisition — clone or locate the external corpus repository."""

from __future__ import annotations

import logging
import shutil
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)

DEFAULT_CACHE_DIR = "~/.resolveagent/corpus-cache"
EXPECTED_DIRS = ["topic-fta", "topic-skills"]


class AcquisitionError(Exception):
    """Raised when data acquisition fails."""


class CorpusAcquisition:
    """Acquire a corpus repository via git clone or local path."""

    def acquire(
        self,
        source: str,
        cache_dir: str = DEFAULT_CACHE_DIR,
        force: bool = False,
    ) -> str:
        """Acquire the corpus and return the local path.

        Args:
            source: Git URL or local directory path.
            cache_dir: Directory for caching cloned repositories.
            force: Re-clone even if a cached copy exists.

        Returns:
            Absolute path to the repository root.

        Raises:
            AcquisitionError: If acquisition fails.
        """
        if self._is_local_path(source):
            return self._validate_local(source)
        return self._clone(source, cache_dir, force)

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    @staticmethod
    def _is_local_path(source: str) -> bool:
        return not source.startswith(("http://", "https://", "git@"))

    @staticmethod
    def _validate_local(source: str) -> str:
        path = Path(source).expanduser().resolve()
        if not path.is_dir():
            raise AcquisitionError(f"Local path does not exist: {source}")
        # Check for at least one expected subdirectory
        found = [d for d in EXPECTED_DIRS if (path / d).is_dir()]
        if not found:
            raise AcquisitionError(
                f"Path does not look like kudig-database: missing {EXPECTED_DIRS}"
            )
        logger.info("Using local corpus", extra={"path": str(path)})
        return str(path)

    @staticmethod
    def _clone(source: str, cache_dir: str, force: bool) -> str:
        cache = Path(cache_dir).expanduser().resolve()
        # Derive a stable directory name from the URL
        repo_name = source.rstrip("/").rsplit("/", 1)[-1].removesuffix(".git")
        target = cache / repo_name

        if target.is_dir():
            if force:
                logger.info("Force re-clone, removing cached copy", extra={"path": str(target)})
                shutil.rmtree(target)
            else:
                logger.info("Using cached clone", extra={"path": str(target)})
                return str(target)

        cache.mkdir(parents=True, exist_ok=True)

        logger.info("Cloning repository", extra={"source": source, "target": str(target)})
        try:
            subprocess.run(
                ["git", "clone", "--depth", "1", source, str(target)],
                check=True,
                capture_output=True,
                text=True,
                timeout=300,
            )
        except subprocess.CalledProcessError as e:
            raise AcquisitionError(f"git clone failed: {e.stderr.strip()}") from e
        except FileNotFoundError:
            raise AcquisitionError("git is not installed or not on PATH")
        except subprocess.TimeoutExpired:
            raise AcquisitionError("git clone timed out after 300 seconds")

        logger.info("Clone completed", extra={"path": str(target)})
        return str(target)
