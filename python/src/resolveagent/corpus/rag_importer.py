"""RAG corpus importer — imports Markdown knowledge documents into RAG collections."""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any

from resolveagent.corpus.config import CorpusConfig
from resolveagent.corpus.progress import ProgressTracker
from resolveagent.rag.ingest.chunker import TextChunker
from resolveagent.rag.pipeline import RAGPipeline

logger = logging.getLogger(__name__)

# Directories to walk for RAG domain import (domain-1 through domain-40)
_DOMAIN_PATTERN = re.compile(r"^domain-\d+")


class RAGCorpusImporter:
    """Imports knowledge documents from kudig-database into RAG collections."""

    def __init__(self, pipeline: RAGPipeline | None = None) -> None:
        self._pipeline = pipeline or RAGPipeline()

    async def import_domains(
        self,
        repo_path: str,
        collection_id: str,
        config: CorpusConfig,
        progress: ProgressTracker,
    ) -> dict[str, int]:
        """Import all ``domain-*`` directories into a RAG collection.

        Returns:
            Dict with ``documents`` and ``chunks`` counts.
        """
        root = Path(repo_path)
        docs_processed = 0
        total_chunks = 0

        # Discover domain directories
        domain_dirs = sorted(
            d for d in root.iterdir()
            if d.is_dir() and _DOMAIN_PATTERN.match(d.name)
        )

        for domain_dir in domain_dirs:
            for md_file in sorted(domain_dir.rglob("*.md")):
                if config.is_excluded(str(md_file)):
                    continue
                try:
                    chunks = await self._import_single_file(
                        md_file, collection_id, config, domain=domain_dir.name
                    )
                    docs_processed += 1
                    total_chunks += chunks
                    await progress.file_processed(
                        "rag", str(md_file.relative_to(root)), chunks=chunks
                    )
                except Exception as e:
                    await progress.file_error(
                        "rag", str(md_file.relative_to(root)), str(e)
                    )

        return {"documents": docs_processed, "chunks": total_chunks}

    async def import_to_rag(
        self,
        collection_id: str,
        content: str,
        metadata: dict[str, Any],
        strategy: str = "by_h2",
        chunk_size: int = 2000,
    ) -> int:
        """Import a single piece of content into RAG.

        Convenience helper used by FTA and Skills importers.

        Returns:
            Number of chunks created.
        """
        chunker = TextChunker(strategy=strategy, chunk_size=chunk_size)
        doc = {"content": content, "metadata": metadata}
        result = await self._pipeline.ingest(
            collection_id, [doc], chunker=chunker
        )
        return result.get("chunks_created", 0)

    async def _import_single_file(
        self,
        file_path: Path,
        collection_id: str,
        config: CorpusConfig,
        domain: str = "",
    ) -> int:
        """Parse and ingest a single Markdown file."""
        content = file_path.read_text(encoding="utf-8", errors="ignore")
        if not content.strip():
            return 0

        # Determine chunking strategy
        strategy, chunk_size = config.get_chunking_strategy(str(file_path))
        chunker = TextChunker(strategy=strategy, chunk_size=chunk_size)

        # Extract title
        title_match = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        title = title_match.group(1).strip() if title_match else file_path.stem

        metadata: dict[str, Any] = {
            "source_uri": str(file_path),
            "title": title,
            "content_type": "text/markdown",
            "domain": domain,
            "corpus": "kudig",
        }

        doc = {"content": content, "metadata": metadata}
        result = await self._pipeline.ingest(
            collection_id, [doc], chunker=chunker
        )
        return result.get("chunks_created", 0)
