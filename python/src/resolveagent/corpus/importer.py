"""Corpus import orchestrator — coordinates acquisition and import of all corpus types."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import TYPE_CHECKING, Any

from resolveagent.corpus.acquisition import CorpusAcquisition
from resolveagent.corpus.code_analysis_importer import CodeAnalysisCorpusImporter
from resolveagent.corpus.config import load_profile_from_repo
from resolveagent.corpus.fta_importer import FTACorpusImporter
from resolveagent.corpus.progress import ProgressEvent, ProgressTracker
from resolveagent.corpus.rag_importer import RAGCorpusImporter
from resolveagent.corpus.skill_importer import SkillCorpusImporter
from resolveagent.rag.pipeline import RAGPipeline

if TYPE_CHECKING:
    from collections.abc import AsyncIterator

logger = logging.getLogger(__name__)


@dataclass
class CorpusImportRequest:
    """Parameters for a corpus import operation."""

    source: str = "https://github.com/kudig-io/kudig-database"
    import_types: list[str] = field(default_factory=lambda: ["rag", "fta", "skills", "code_analysis"])
    rag_collection_id: str = ""
    profile: str = "rag-sre-profile"
    force_clone: bool = False
    dry_run: bool = False


@dataclass
class CorpusImportResult:
    """Summary of a completed corpus import."""

    rag_documents: int = 0
    rag_chunks: int = 0
    fta_trees: int = 0
    skills_registered: int = 0
    code_analysis_solutions: int = 0
    errors: list[str] = field(default_factory=list)


class CorpusImporter:
    """Orchestrates the full corpus import pipeline.

    Usage::

        importer = CorpusImporter()
        async for event in importer.import_corpus(request):
            print(event)  # SSE-style progress events
    """

    def __init__(
        self,
        pipeline: RAGPipeline | None = None,
        fta_client: Any | None = None,
        skill_client: Any | None = None,
        code_analysis_engine: Any | None = None,
        dual_writer: Any | None = None,
    ) -> None:
        self._pipeline = pipeline or RAGPipeline()
        self._fta_client = fta_client
        self._skill_client = skill_client
        self._code_analysis_engine = code_analysis_engine
        self._dual_writer = dual_writer

    async def import_corpus(self, request: CorpusImportRequest) -> AsyncIterator[dict[str, Any]]:
        """Run the full import and yield progress events as dicts.

        Yields:
            Dicts suitable for SSE ``data:`` serialisation.
        """
        events: list[dict[str, Any]] = []

        async def collect_event(evt: ProgressEvent) -> None:
            events.append(evt.to_dict())

        progress = ProgressTracker(callback=collect_event)

        # -- 1. Acquire data --
        acquisition = CorpusAcquisition()
        try:
            repo_path = acquisition.acquire(
                source=request.source,
                force=request.force_clone,
            )
        except Exception as e:
            error_event = {
                "type": "import.error",
                "message": f"Acquisition failed: {e}",
                "data": {"fatal": True},
            }
            yield error_event
            return

        yield {
            "type": "import.acquisition.completed",
            "message": f"Repository acquired at {repo_path}",
            "data": {"path": repo_path},
        }

        # -- 2. Load profile config --
        config = load_profile_from_repo(repo_path, request.profile)

        # -- 3. Count files to set totals --
        root = Path(repo_path)
        rag_files = self._count_rag_files(root) if "rag" in request.import_types else 0
        fta_files = self._count_fta_files(root) if "fta" in request.import_types else 0
        skills_files = self._count_skill_files(root) if "skills" in request.import_types else 0
        code_analysis_files = self._count_source_files(root) if "code_analysis" in request.import_types else 0
        await progress.start(rag_files, fta_files, skills_files, code_analysis_files)

        # Flush accumulated events
        for evt in events:
            yield evt
        events.clear()

        if request.dry_run:
            yield {
                "type": "import.dry_run",
                "message": "Dry run completed — no data imported",
                "data": {
                    "rag_files": rag_files,
                    "fta_files": fta_files,
                    "skills_files": skills_files,
                },
            }
            return

        # -- 4. Determine collection IDs --
        rag_collection = request.rag_collection_id or "kudig-rag"
        fta_rag_collection = "kudig-fta"
        skills_rag_collection = "kudig-skills"

        # Shared RAG importer
        rag_importer = RAGCorpusImporter(pipeline=self._pipeline)

        # -- 5. RAG import --
        if "rag" in request.import_types:
            await rag_importer.import_domains(repo_path, rag_collection, config, progress)
            await progress.phase_completed("rag")
            for evt in events:
                yield evt
            events.clear()

        # -- 6. FTA import --
        if "fta" in request.import_types:
            fta_importer = FTACorpusImporter(
                fta_client=self._fta_client,
                rag_importer=rag_importer,
            )
            await fta_importer.import_fta(repo_path, fta_rag_collection, config, progress)
            await progress.phase_completed("fta")
            for evt in events:
                yield evt
            events.clear()

        # -- 7. Skills import --
        if "skills" in request.import_types:
            skill_importer = SkillCorpusImporter(
                skill_client=self._skill_client,
                rag_importer=rag_importer,
            )
            await skill_importer.import_skills(repo_path, skills_rag_collection, config, progress)
            await progress.phase_completed("skills")
            for evt in events:
                yield evt
            events.clear()

        # -- 8. Code analysis import --
        if "code_analysis" in request.import_types:
            ca_importer = CodeAnalysisCorpusImporter(
                engine=self._code_analysis_engine,
                dual_writer=self._dual_writer,
            )
            await ca_importer.import_code_analysis(repo_path, config, progress)
            await progress.phase_completed("code_analysis")
            for evt in events:
                yield evt
            events.clear()

        # -- 9. Final summary --
        await progress.completed()
        for evt in events:
            yield evt

    # ------------------------------------------------------------------
    # File counting helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _count_rag_files(root: Path) -> int:
        count = 0
        for d in root.iterdir():
            if d.is_dir() and re.match(r"^domain-\d+", d.name):
                count += sum(1 for _ in d.rglob("*.md"))
        return count

    @staticmethod
    def _count_fta_files(root: Path) -> int:
        fta_dir = root / "topic-fta" / "list"
        if not fta_dir.is_dir():
            return 0
        return sum(1 for f in fta_dir.glob("*.md") if f.name.lower() != "readme.md")

    @staticmethod
    def _count_skill_files(root: Path) -> int:
        skills_dir = root / "topic-skills"
        if not skills_dir.is_dir():
            return 0
        skip = {"readme.md", "enhancement-record.md", "skill-schema.md"}
        return sum(1 for f in skills_dir.glob("*.md") if f.name.lower() not in skip)

    @staticmethod
    def _count_source_files(root: Path) -> int:
        """Count source code files for code analysis."""
        extensions = ["*.py", "*.go", "*.js", "*.ts", "*.tsx", "*.jsx", "*.java"]
        skip_dirs = {"node_modules", "vendor", "__pycache__", "venv", ".venv", ".git"}
        count = 0
        for pattern in extensions:
            for f in root.rglob(pattern):
                if not any(p in skip_dirs for p in f.relative_to(root).parts):
                    count += 1
        return count
