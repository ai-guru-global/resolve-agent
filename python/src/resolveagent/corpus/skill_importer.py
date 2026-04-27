"""Skills corpus importer — adapts kudig skills and registers them."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import TYPE_CHECKING, Any

from resolveagent.corpus.skill_adapter import KudigSkillAdapter, parse_front_matter

if TYPE_CHECKING:
    from resolveagent.corpus.config import CorpusConfig
    from resolveagent.corpus.progress import ProgressTracker
    from resolveagent.corpus.rag_importer import RAGCorpusImporter

logger = logging.getLogger(__name__)

# Files to skip when scanning topic-skills/
_SKIP_FILES = {"readme.md", "enhancement-record.md", "skill-schema.md"}


class SkillCorpusImporter:
    """Imports kudig skill files as registered skills and RAG knowledge."""

    def __init__(
        self,
        skill_client: Any | None = None,
        rag_importer: RAGCorpusImporter | None = None,
    ) -> None:
        self._skill_client = skill_client
        self._rag_importer = rag_importer
        self._adapter = KudigSkillAdapter()

    async def import_skills(
        self,
        repo_path: str,
        rag_collection_id: str,
        config: CorpusConfig,
        progress: ProgressTracker,
    ) -> dict[str, int]:
        """Import skill files from ``topic-skills/``.

        Returns:
            Dict with ``skills`` and ``errors`` counts.
        """
        skills_dir = Path(repo_path) / "topic-skills"
        if not skills_dir.is_dir():
            logger.warning("Skills directory not found", extra={"path": str(skills_dir)})
            return {"skills": 0, "errors": 0}

        skills_registered = 0
        root = Path(repo_path)

        for md_file in sorted(skills_dir.glob("*.md")):
            if md_file.name.lower() in _SKIP_FILES:
                continue
            if config.is_excluded(str(md_file)):
                continue

            try:
                registered = await self._import_single(md_file, rag_collection_id, root)
                if registered:
                    skills_registered += 1
                await progress.file_processed(
                    "skills",
                    str(md_file.relative_to(root)),
                    extra={"skill_name": md_file.stem},
                )
            except Exception as e:
                await progress.file_error("skills", str(md_file.relative_to(root)), str(e))

        return {"skills": skills_registered, "errors": progress.stats["skills"].errors}

    async def _import_single(
        self,
        file_path: Path,
        rag_collection_id: str,
        root: Path,
    ) -> bool:
        """Parse, adapt, and register a single skill file."""
        content = file_path.read_text(encoding="utf-8", errors="ignore")
        if not content.strip():
            return False

        front_matter, body = parse_front_matter(content)
        adapted = self._adapter.convert(front_matter, body)

        # 1. Register skill via store client (HTTP POST to Go platform)
        if self._skill_client is not None:
            try:
                reg_dict = adapted.to_registration_dict()
                await self._skill_client.register_skill(reg_dict)
            except Exception as e:
                logger.warning(
                    "Failed to register skill",
                    extra={"skill_name": adapted.name, "error": str(e)},
                )

        # 2. Import runbook body into RAG for semantic search
        if self._rag_importer is not None:
            metadata: dict[str, Any] = {
                "source_uri": str(file_path),
                "title": adapted.description or adapted.name,
                "content_type": "text/markdown",
                "corpus": "kudig",
                "domain": "skills",
                "skill_id": adapted.name,
            }
            await self._rag_importer.import_to_rag(
                rag_collection_id,
                body,
                metadata,
                strategy="by_section",
                chunk_size=3000,
            )

        return True
