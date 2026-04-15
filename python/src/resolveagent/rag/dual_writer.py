"""RAG dual-write pipeline.

Writes documents to both an independent ``code-analysis`` collection
AND the existing ``kudig-rag`` collection. The secondary write is
best-effort — failures are logged but do not block the primary write.
"""

from __future__ import annotations

import logging
from typing import Any

from resolveagent.rag.pipeline import RAGPipeline

logger = logging.getLogger(__name__)

# Default collection names
PRIMARY_COLLECTION = "code-analysis"
SECONDARY_COLLECTION = "kudig-rag"


class DualWriteRAGPipeline:
    """Wraps ``RAGPipeline`` to write to two collections.

    Primary writes go to the ``code-analysis`` collection.
    Secondary writes (best-effort) go to the ``kudig-rag`` collection
    so that existing RAG queries also benefit from code analysis data.

    Usage::

        dw = DualWriteRAGPipeline(pipeline=rag_pipeline)
        result = await dw.ingest(documents, tags=["static-analysis"])
    """

    def __init__(
        self,
        pipeline: RAGPipeline | None = None,
        primary_collection: str = PRIMARY_COLLECTION,
        secondary_collection: str = SECONDARY_COLLECTION,
    ) -> None:
        self._pipeline = pipeline or RAGPipeline()
        self._primary = primary_collection
        self._secondary = secondary_collection

    async def ingest(
        self,
        documents: list[dict[str, Any]],
        *,
        tags: list[str] | None = None,
        chunker: Any | None = None,
    ) -> dict[str, Any]:
        """Ingest documents into both collections.

        Args:
            documents: List of document dicts with ``content`` and ``metadata``.
            tags: Extra tags to attach to each document's metadata.
            chunker: Optional ``TextChunker`` override.

        Returns:
            Combined result dict with primary and secondary outcomes.
        """
        # Enrich metadata with tags
        if tags:
            for doc in documents:
                meta = doc.setdefault("metadata", {})
                existing = meta.get("tags", [])
                meta["tags"] = list(set(existing + tags))

        # Primary write (must succeed)
        primary_result = await self._pipeline.ingest(
            collection_id=self._primary,
            documents=documents,
            chunker=chunker,
        )

        # Secondary write (best-effort)
        secondary_result: dict[str, Any] | None = None
        try:
            secondary_result = await self._pipeline.ingest(
                collection_id=self._secondary,
                documents=documents,
                chunker=chunker,
            )
        except Exception:
            logger.warning(
                "Secondary RAG write failed (best-effort)",
                exc_info=True,
            )

        return {
            "primary": primary_result,
            "secondary": secondary_result,
            "primary_collection": self._primary,
            "secondary_collection": self._secondary,
        }

    async def query(
        self,
        query: str,
        top_k: int = 5,
        *,
        collection: str | None = None,
    ) -> list[dict[str, Any]]:
        """Query the primary or specified collection.

        Args:
            query: Query text.
            top_k: Number of results.
            collection: Override collection to search (defaults to primary).

        Returns:
            Retrieved chunks with scores.
        """
        target = collection or self._primary
        return await self._pipeline.query(
            collection_id=target,
            query=query,
            top_k=top_k,
        )

    async def ingest_solutions(
        self, solutions: list[Any]
    ) -> dict[str, Any]:
        """Ingest solution documents from the static analysis engine.

        Converts ``SolutionDocument`` instances into RAG documents.
        """
        documents: list[dict[str, Any]] = []
        for sol in solutions:
            content = sol.to_markdown() if hasattr(sol, "to_markdown") else str(sol)
            meta = sol.to_dict() if hasattr(sol, "to_dict") else {}
            documents.append({
                "content": content,
                "metadata": {
                    **meta,
                    "source": "code_analysis",
                    "type": "solution_document",
                },
            })

        return await self.ingest(documents, tags=["solution", "code-analysis"])

    async def ingest_report(
        self, report: Any
    ) -> dict[str, Any]:
        """Ingest a traffic analysis report into RAG.

        Converts an ``AnalysisReport`` into a RAG document.
        """
        content = report.to_markdown() if hasattr(report, "to_markdown") else str(report)
        meta = report.to_dict() if hasattr(report, "to_dict") else {}
        documents = [{
            "content": content,
            "metadata": {
                **meta,
                "source": "traffic_analysis",
                "type": "analysis_report",
            },
        }]

        return await self.ingest(documents, tags=["traffic", "analysis-report"])
