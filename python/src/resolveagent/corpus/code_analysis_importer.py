"""Code analysis corpus importer.

Performs static analysis on a repository's source code, generates
solution documents, and ingests results into RAG via dual-write.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from resolveagent.code_analysis.engine import StaticAnalysisEngine
from resolveagent.corpus.progress import ProgressTracker
from resolveagent.rag.dual_writer import DualWriteRAGPipeline

logger = logging.getLogger(__name__)


class CodeAnalysisCorpusImporter:
    """Import code analysis results as a corpus.

    Analyses source code in a repository, builds call graphs and
    solution documents, then ingests them into RAG collections
    via the dual-write pipeline.

    Usage::

        importer = CodeAnalysisCorpusImporter(
            engine=engine,
            dual_writer=dual_writer,
        )
        result = await importer.import_code_analysis(
            repo_path="/path/to/repo",
            config=config,
            progress=progress,
        )
    """

    def __init__(
        self,
        engine: StaticAnalysisEngine | None = None,
        dual_writer: DualWriteRAGPipeline | None = None,
    ) -> None:
        self._engine = engine or StaticAnalysisEngine()
        self._dual_writer = dual_writer or DualWriteRAGPipeline()

    async def import_code_analysis(
        self,
        repo_path: str,
        config: Any | None = None,
        progress: ProgressTracker | None = None,
        language: str | None = None,
        error_logs: str = "",
    ) -> dict[str, Any]:
        """Run code analysis and import results into RAG.

        Args:
            repo_path: Local path to the repository.
            config: Optional ``CorpusConfig`` (currently unused).
            progress: Optional progress tracker for SSE events.
            language: Language filter for analysis.
            error_logs: Raw error logs to parse.

        Returns:
            Summary dict with analysis and ingestion stats.
        """
        root = Path(repo_path)
        result: dict[str, Any] = {
            "call_graph_nodes": 0,
            "call_graph_edges": 0,
            "errors_found": 0,
            "solutions_generated": 0,
            "rag_documents_ingested": 0,
        }

        # Count source files for progress tracking
        source_count = self._count_source_files(root, language)
        if progress:
            progress.stats["code_analysis"].total = source_count

        # Run static analysis (non-streaming)
        try:
            analysis = await self._engine.analyze_single(
                repo_path=repo_path,
                language=language,
                error_logs=error_logs,
            )

            result["call_graph_nodes"] = analysis.stats.get("call_graph_nodes", 0)
            result["call_graph_edges"] = analysis.stats.get("call_graph_edges", 0)
            result["errors_found"] = analysis.stats.get("errors_found", 0)
            result["solutions_generated"] = analysis.stats.get("solutions_generated", 0)

            if progress:
                await progress.file_processed(
                    "code_analysis",
                    repo_path,
                    chunks=0,
                    extra={"stats": analysis.stats},
                )

        except Exception as e:
            logger.exception("Static analysis failed for %s", repo_path)
            if progress:
                await progress.file_error("code_analysis", repo_path, str(e))
            result["error"] = str(e)
            return result

        # Ingest solutions into RAG via dual-write
        if analysis.solutions:
            try:
                ingest_result = await self._dual_writer.ingest_solutions(
                    analysis.solutions
                )
                primary = ingest_result.get("primary", {})
                result["rag_documents_ingested"] = primary.get("documents_processed", 0)
                result["rag_chunks_created"] = primary.get("chunks_created", 0)

                if progress:
                    await progress.file_processed(
                        "code_analysis",
                        f"{repo_path}/solutions",
                        chunks=primary.get("chunks_created", 0),
                    )

            except Exception as e:
                logger.warning("RAG ingestion failed for solutions", exc_info=True)
                if progress:
                    await progress.file_error(
                        "code_analysis", f"{repo_path}/solutions", str(e)
                    )

        # Ingest call graph summary as a RAG document
        if analysis.call_graph and analysis.call_graph.nodes:
            try:
                cg = analysis.call_graph
                cg_doc = self._call_graph_to_document(cg, repo_path)
                await self._dual_writer.ingest(
                    [cg_doc], tags=["call-graph", "code-analysis"]
                )
            except Exception:
                logger.warning("RAG ingestion failed for call graph", exc_info=True)

        return result

    @staticmethod
    def _call_graph_to_document(cg: Any, repo_path: str) -> dict[str, Any]:
        """Convert a call graph result to a RAG document."""
        entry_list = "\n".join(f"- {ep}" for ep in cg.entry_points[:20])
        node_summary = "\n".join(
            f"- {n.function_name} ({n.file_path}:{n.line_start})"
            for n in cg.nodes[:50]
        )

        content = (
            f"# Call Graph Analysis: {repo_path}\n\n"
            f"## Entry Points\n{entry_list}\n\n"
            f"## Key Functions ({len(cg.nodes)} total)\n{node_summary}\n\n"
            f"## Statistics\n"
            f"- Nodes: {len(cg.nodes)}\n"
            f"- Edges: {len(cg.edges)}\n"
            f"- Max Depth: {cg.max_depth_reached}\n"
        )

        return {
            "content": content,
            "metadata": {
                "source": "code_analysis",
                "type": "call_graph",
                "repo_path": repo_path,
                "node_count": len(cg.nodes),
                "edge_count": len(cg.edges),
            },
        }

    @staticmethod
    def _count_source_files(root: Path, language: str | None) -> int:
        """Count source files for progress tracking."""
        ext_map = {
            "python": ["*.py"],
            "go": ["*.go"],
            "javascript": ["*.js", "*.jsx"],
            "typescript": ["*.ts", "*.tsx"],
            "java": ["*.java"],
        }

        if language:
            patterns = ext_map.get(language, [f"*.{language}"])
        else:
            patterns = [p for group in ext_map.values() for p in group]

        count = 0
        for pat in patterns:
            count += sum(
                1 for _ in root.rglob(pat)
                if not any(
                    p.startswith(".") or p in ("node_modules", "vendor", "__pycache__", "venv")
                    for p in _.relative_to(root).parts
                )
            )
        return count
