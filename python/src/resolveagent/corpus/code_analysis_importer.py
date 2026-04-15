"""Code analysis corpus importer.

Performs static analysis on a repository's source code, generates
solution documents, and ingests results into RAG via dual-write.

Also supports generating structured RAG corpus from call chain data
via the ``CallChainRAGGenerator``.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import TYPE_CHECKING, Any

from resolveagent.code_analysis.engine import StaticAnalysisEngine
from resolveagent.corpus.call_chain_rag_generator import (
    CallChainData,
    CallChainRAGGenerator,
    ChainEdge,
    ChainFunctionInfo,
    ChainSourceFile,
)
from resolveagent.rag.dual_writer import DualWriteRAGPipeline

if TYPE_CHECKING:
    from resolveagent.corpus.progress import ProgressTracker

logger = logging.getLogger(__name__)


class CodeAnalysisCorpusImporter:
    """Import code analysis results as a corpus.

    Analyses source code in a repository, builds call graphs and
    solution documents, then ingests them into RAG collections
    via the dual-write pipeline.

    Additionally supports generating structured RAG corpus from
    pre-built call chain analysis data (e.g. K8s source code chains).

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

        # Or generate RAG corpus from call chain data
        result = await importer.import_call_chain_corpus(
            chain_data=[...],
            progress=progress,
        )
    """

    def __init__(
        self,
        engine: StaticAnalysisEngine | None = None,
        dual_writer: DualWriteRAGPipeline | None = None,
        rag_generator: CallChainRAGGenerator | None = None,
    ) -> None:
        self._engine = engine or StaticAnalysisEngine()
        self._dual_writer = dual_writer or DualWriteRAGPipeline()
        self._rag_generator = rag_generator or CallChainRAGGenerator()

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

    async def import_call_chain_corpus(
        self,
        chain_data: list[CallChainData] | list[dict[str, Any]],
        progress: ProgressTracker | None = None,
    ) -> dict[str, Any]:
        """Generate and ingest RAG corpus from call chain data.

        This method takes pre-built call chain analysis data (e.g. from
        K8s source code analysis) and generates structured RAG documents
        covering overviews, source files, functions, flow steps,
        cross-references, and Q&A pairs.

        Args:
            chain_data: List of ``CallChainData`` instances or raw dicts.
            progress: Optional progress tracker for SSE events.

        Returns:
            Summary dict with generation and ingestion stats.
        """
        result: dict[str, Any] = {
            "chains_processed": 0,
            "rag_documents_generated": 0,
            "rag_documents_ingested": 0,
            "rag_chunks_created": 0,
        }

        # Normalize input: convert dicts to CallChainData if needed
        chains: list[CallChainData] = []
        for item in chain_data:
            if isinstance(item, CallChainData):
                chains.append(item)
            elif isinstance(item, dict):
                chains.append(self._dict_to_call_chain(item))
            else:
                logger.warning("Skipping unsupported chain data type: %s", type(item))

        if not chains:
            logger.warning("No valid call chain data provided")
            return result

        if progress:
            progress.stats["code_analysis"].total = len(chains)

        # Generate RAG corpus from all chains
        corpus_result = self._rag_generator.generate_batch(chains)
        result["rag_documents_generated"] = corpus_result.total_documents
        result["generation_stats"] = corpus_result.stats

        logger.info(
            "Generated %d RAG documents from %d call chains",
            corpus_result.total_documents,
            len(chains),
        )

        # Ingest generated documents into RAG via dual-write
        if corpus_result.documents:
            documents_for_ingest = [doc.to_dict() for doc in corpus_result.documents]

            try:
                ingest_result = await self._dual_writer.ingest(
                    documents_for_ingest,
                    tags=["call-chain", "k8s-source", "code-analysis"],
                )
                primary = ingest_result.get("primary", {})
                result["rag_documents_ingested"] = primary.get("documents_processed", 0)
                result["rag_chunks_created"] = primary.get("chunks_created", 0)
                result["chains_processed"] = len(chains)

                if progress:
                    for chain in chains:
                        await progress.file_processed(
                            "code_analysis",
                            f"call-chain/{chain.chain_id}",
                            chunks=primary.get("chunks_created", 0) // len(chains),
                            extra={"chain_id": chain.chain_id},
                        )

            except Exception as e:
                logger.warning("RAG ingestion failed for call chain corpus", exc_info=True)
                result["error"] = str(e)
                if progress:
                    await progress.file_error(
                        "code_analysis", "call-chain-corpus", str(e)
                    )

        return result

    @staticmethod
    def _dict_to_call_chain(data: dict[str, Any]) -> CallChainData:
        """Convert a raw dictionary to a CallChainData instance.

        Handles the conversion from frontend-compatible JSON format
        to the Python dataclass model.
        """
        source_files: list[ChainSourceFile] = []
        for sf_data in data.get("sourceFiles", data.get("source_files", [])):
            key_fns = [
                ChainFunctionInfo(
                    name=fn.get("name", ""),
                    signature=fn.get("signature", ""),
                    description=fn.get("description", ""),
                    code_snippet=fn.get("codeSnippet", fn.get("code_snippet", "")),
                    called_by=fn.get("calledBy", fn.get("called_by", [])),
                    calls=fn.get("calls", []),
                )
                for fn in sf_data.get("keyFunctions", sf_data.get("key_functions", []))
            ]
            source_files.append(ChainSourceFile(
                id=sf_data.get("id", ""),
                file_path=sf_data.get("filePath", sf_data.get("file_path", "")),
                file_name=sf_data.get("fileName", sf_data.get("file_name", "")),
                package=sf_data.get("package", ""),
                component=sf_data.get("component", ""),
                description=sf_data.get("description", ""),
                key_functions=key_fns,
                lines_of_code=sf_data.get("linesOfCode", sf_data.get("lines_of_code", 0)),
                importance=sf_data.get("importance", "medium"),
            ))

        edges: list[ChainEdge] = []
        for e_data in data.get("edges", []):
            edges.append(ChainEdge(
                id=e_data.get("id", ""),
                source_file_id=e_data.get("sourceFileId", e_data.get("source_file_id", "")),
                target_file_id=e_data.get("targetFileId", e_data.get("target_file_id", "")),
                label=e_data.get("label", ""),
                call_type=e_data.get("callType", e_data.get("call_type", "direct")),
                functions=e_data.get("functions", []),
            ))

        return CallChainData(
            chain_id=data.get("id", data.get("chain_id", "")),
            name=data.get("name", ""),
            description=data.get("description", ""),
            version=data.get("version", ""),
            chain_type=data.get("chainType", data.get("chain_type", "troubleshooting")),
            topology=data.get("topology", "event-driven"),
            source_files=source_files,
            edges=edges,
            flow_steps=data.get("flowSteps", data.get("flow_steps", [])),
            components=data.get("components", []),
            tags=data.get("tags", []),
            total_files=data.get("totalFiles", data.get("total_files", len(source_files))),
            total_functions=data.get(
                "totalFunctions",
                data.get("total_functions", sum(len(sf.key_functions) for sf in source_files)),
            ),
            total_lines_of_code=data.get(
                "totalLinesOfCode",
                data.get("total_lines_of_code", sum(sf.lines_of_code for sf in source_files)),
            ),
        )

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
