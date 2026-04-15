"""FTA corpus importer — parses FTA Markdown and registers FaultTree documents."""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any

from resolveagent.corpus.config import CorpusConfig
from resolveagent.corpus.fta_parser import FTAMarkdownParser
from resolveagent.corpus.progress import ProgressTracker
from resolveagent.corpus.rag_importer import RAGCorpusImporter
from resolveagent.fta.serializer import dump_tree_to_yaml

logger = logging.getLogger(__name__)


def _slugify(name: str) -> str:
    """Convert a filename stem to a URL-safe slug."""
    return re.sub(r"[^a-z0-9-]", "-", name.lower()).strip("-")


class FTACorpusImporter:
    """Imports kudig FTA Markdown files as FaultTree documents and RAG content."""

    def __init__(
        self,
        fta_client: Any | None = None,
        rag_importer: RAGCorpusImporter | None = None,
    ) -> None:
        self._fta_client = fta_client
        self._rag_importer = rag_importer
        self._parser = FTAMarkdownParser()

    async def import_fta(
        self,
        repo_path: str,
        rag_collection_id: str,
        config: CorpusConfig,
        progress: ProgressTracker,
    ) -> dict[str, int]:
        """Import FTA files from ``topic-fta/list/``.

        Returns:
            Dict with ``trees`` and ``errors`` counts.
        """
        fta_dir = Path(repo_path) / "topic-fta" / "list"
        if not fta_dir.is_dir():
            logger.warning("FTA directory not found", extra={"path": str(fta_dir)})
            return {"trees": 0, "errors": 0}

        trees_created = 0
        root = Path(repo_path)

        for md_file in sorted(fta_dir.glob("*.md")):
            if md_file.name.lower() == "readme.md":
                continue
            if config.is_excluded(str(md_file)):
                continue

            try:
                trees_created += await self._import_single(
                    md_file, rag_collection_id, root
                )
                await progress.file_processed(
                    "fta",
                    str(md_file.relative_to(root)),
                    extra={"trees": trees_created},
                )
            except Exception as e:
                await progress.file_error(
                    "fta", str(md_file.relative_to(root)), str(e)
                )

        return {"trees": trees_created, "errors": progress.stats["fta"].errors}

    async def _import_single(
        self,
        file_path: Path,
        rag_collection_id: str,
        root: Path,
    ) -> int:
        """Parse one FTA file, register tree, and ingest into RAG."""
        content = file_path.read_text(encoding="utf-8", errors="ignore")
        if not content.strip():
            return 0

        file_id = _slugify(file_path.stem)
        result = self._parser.parse(content, file_id=file_id)

        # 1. Register as FTA Document via store client
        if self._fta_client is not None and result.tree.events:
            doc = {
                "id": f"kudig-fta-{file_id}",
                "name": result.tree.name,
                "description": result.tree.description,
                "fault_tree": _tree_to_dict(result.tree),
                "metadata": {
                    "workflow": result.workflow,
                    "base_events": result.base_events,
                    "source": "kudig-database",
                    "source_file": str(file_path.relative_to(root)),
                },
                "status": "active",
                "labels": {"corpus": "kudig", "domain": "fta"},
            }
            try:
                await self._fta_client.create_document(doc)
            except Exception as e:
                logger.warning(
                    "Failed to register FTA document",
                    extra={"id": file_id, "error": str(e)},
                )

        # 2. Import raw Markdown into RAG for semantic search
        if self._rag_importer is not None:
            metadata: dict[str, Any] = {
                "source_uri": str(file_path),
                "title": result.tree.name,
                "content_type": "text/markdown",
                "corpus": "kudig",
                "domain": "fta",
                "fta_id": f"kudig-fta-{file_id}",
            }
            await self._rag_importer.import_to_rag(
                rag_collection_id, content, metadata,
                strategy="by_h3", chunk_size=1500,
            )

        return 1


def _tree_to_dict(tree: Any) -> dict[str, Any]:
    """Serialize a FaultTree to a plain dict (matches load_tree_from_dict input)."""
    return {
        "tree": {
            "id": tree.id,
            "name": tree.name,
            "description": tree.description,
            "top_event_id": tree.top_event_id,
            "events": [
                {
                    "id": e.id,
                    "name": e.name,
                    "description": e.description,
                    "type": e.event_type.value,
                    "evaluator": e.evaluator,
                    "parameters": e.parameters,
                }
                for e in tree.events
            ],
            "gates": [
                {
                    "id": g.id,
                    "name": g.name,
                    "type": g.gate_type.value,
                    "inputs": g.input_ids,
                    "output": g.output_id,
                    "k_value": g.k_value,
                }
                for g in tree.gates
            ],
        }
    }
