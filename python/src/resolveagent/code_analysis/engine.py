"""Static analysis engine orchestrator.

Coordinates AST parsing, call graph building, error parsing, and
solution generation into a single analysis workflow.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from typing import Any, AsyncIterator

from resolveagent.code_analysis.ast_parser import ASTParser
from resolveagent.code_analysis.call_graph import CallGraphBuilder, CallGraphResult
from resolveagent.code_analysis.error_parser import ErrorParser, ParsedError
from resolveagent.code_analysis.solution_generator import (
    SolutionDocument,
    SolutionGenerator,
)

logger = logging.getLogger(__name__)


@dataclass
class AnalysisResult:
    """Full result of a static analysis run."""

    analysis_id: str = ""
    repository_url: str = ""
    branch: str = "main"
    language: str = ""
    call_graph: CallGraphResult | None = None
    errors: list[ParsedError] = field(default_factory=list)
    solutions: list[SolutionDocument] = field(default_factory=list)
    stats: dict[str, Any] = field(default_factory=dict)


class StaticAnalysisEngine:
    """Top-level orchestrator for static code analysis.

    Coordinates the full analysis pipeline:
    1. AST parsing of repository source files
    2. Call graph construction from entry points
    3. Error parsing from logs / source
    4. Solution document generation (LLM + RAG)

    The engine reports progress via an ``AsyncIterator`` of SSE-compatible
    event dicts so the caller can stream updates to clients.

    Usage::

        engine = StaticAnalysisEngine(
            call_graph_client=cg_client,
            llm_provider=llm,
            rag_pipeline=rag,
        )

        async for event in engine.analyze(
            repo_path="/path/to/repo",
            language="python",
        ):
            send_sse(event)
    """

    def __init__(
        self,
        call_graph_client: Any | None = None,
        llm_provider: Any | None = None,
        rag_pipeline: Any | None = None,
        rag_collection: str = "code-analysis",
        model: str | None = None,
    ) -> None:
        self._parser = ASTParser()
        self._graph_builder = CallGraphBuilder(parser=self._parser)
        self._error_parser = ErrorParser()
        self._solution_gen = SolutionGenerator(
            llm_provider=llm_provider,
            rag_pipeline=rag_pipeline,
            rag_collection=rag_collection,
            model=model,
        )
        self._cg_client = call_graph_client

    async def analyze(
        self,
        repo_path: str,
        language: str | None = None,
        entry_points: list[str] | None = None,
        error_logs: str = "",
        max_depth: int = 10,
        repository_url: str = "",
        branch: str = "main",
    ) -> AsyncIterator[dict[str, Any]]:
        """Run the full static analysis pipeline.

        Yields SSE-compatible event dicts with ``type`` and ``data`` keys.

        Args:
            repo_path: Local path to the repository.
            language: Language filter (optional).
            entry_points: Explicit entry point function names (optional).
            error_logs: Raw error / log text to parse (optional).
            max_depth: Max call graph BFS depth.
            repository_url: Remote URL for metadata.
            branch: Git branch name for metadata.

        Yields:
            ``dict`` events with keys ``type`` (str) and ``data`` (dict).
        """
        analysis_id = str(uuid.uuid4())

        yield {
            "type": "analysis_started",
            "data": {
                "analysis_id": analysis_id,
                "repo_path": repo_path,
                "language": language or "auto",
            },
        }

        result = AnalysisResult(
            analysis_id=analysis_id,
            repository_url=repository_url,
            branch=branch,
            language=language or "auto",
        )

        # Phase 1: Build call graph
        yield {"type": "phase", "data": {"phase": "call_graph", "status": "started"}}

        try:
            cg_result = self._graph_builder.build(
                repo_path,
                language=language,
                entry_points=entry_points,
                max_depth=max_depth,
            )
            result.call_graph = cg_result

            yield {
                "type": "call_graph_complete",
                "data": {
                    "nodes": len(cg_result.nodes),
                    "edges": len(cg_result.edges),
                    "entry_points": len(cg_result.entry_points),
                    "max_depth_reached": cg_result.max_depth_reached,
                },
            }

            # Persist to Go platform if client is available
            if self._cg_client is not None:
                await self._persist_call_graph(analysis_id, cg_result, result)

        except Exception:
            logger.exception("Call graph construction failed")
            yield {"type": "phase", "data": {"phase": "call_graph", "status": "error"}}

        # Phase 2: Parse errors
        yield {"type": "phase", "data": {"phase": "error_parsing", "status": "started"}}

        try:
            parsed_errors: list[ParsedError] = []
            if error_logs:
                parsed_errors = self._error_parser.parse(error_logs, language)

            result.errors = parsed_errors

            yield {
                "type": "errors_parsed",
                "data": {"count": len(parsed_errors)},
            }
        except Exception:
            logger.exception("Error parsing failed")
            yield {"type": "phase", "data": {"phase": "error_parsing", "status": "error"}}

        # Phase 3: Generate solutions
        if result.errors:
            yield {"type": "phase", "data": {"phase": "solution_generation", "status": "started"}}

            try:
                solutions = await self._solution_gen.generate(result.errors)
                result.solutions = solutions

                yield {
                    "type": "solutions_generated",
                    "data": {
                        "count": len(solutions),
                        "titles": [s.title for s in solutions[:5]],
                    },
                }
            except Exception:
                logger.exception("Solution generation failed")
                yield {
                    "type": "phase",
                    "data": {"phase": "solution_generation", "status": "error"},
                }

        # Final summary
        result.stats = {
            "call_graph_nodes": len(result.call_graph.nodes) if result.call_graph else 0,
            "call_graph_edges": len(result.call_graph.edges) if result.call_graph else 0,
            "errors_found": len(result.errors),
            "solutions_generated": len(result.solutions),
        }

        yield {
            "type": "analysis_complete",
            "data": {
                "analysis_id": analysis_id,
                "stats": result.stats,
            },
        }

    async def analyze_single(
        self,
        repo_path: str,
        language: str | None = None,
        entry_points: list[str] | None = None,
        error_logs: str = "",
        max_depth: int = 10,
        repository_url: str = "",
        branch: str = "main",
    ) -> AnalysisResult:
        """Run analysis and return the complete result (non-streaming)."""
        result = AnalysisResult()
        async for event in self.analyze(
            repo_path=repo_path,
            language=language,
            entry_points=entry_points,
            error_logs=error_logs,
            max_depth=max_depth,
            repository_url=repository_url,
            branch=branch,
        ):
            if event["type"] == "analysis_complete":
                result.analysis_id = event["data"]["analysis_id"]
                result.stats = event["data"]["stats"]
        return result

    async def _persist_call_graph(
        self,
        analysis_id: str,
        cg_result: CallGraphResult,
        result: AnalysisResult,
    ) -> None:
        """Persist call graph to Go platform store."""
        try:
            graph_data = await self._cg_client.create({
                "analysis_id": analysis_id,
                "repository_url": result.repository_url,
                "branch": result.branch,
                "language": result.language,
                "entry_point": cg_result.entry_points[0] if cg_result.entry_points else "",
                "node_count": len(cg_result.nodes),
                "edge_count": len(cg_result.edges),
                "max_depth": cg_result.max_depth_reached,
                "status": "completed",
                "graph_data": cg_result.stats,
            })

            if graph_data and graph_data.get("id"):
                graph_id = graph_data["id"]

                # Persist nodes
                nodes_payload = [
                    {
                        "function_name": n.function_name,
                        "file_path": n.file_path,
                        "line_start": n.line_start,
                        "line_end": n.line_end,
                        "package": n.package,
                        "node_type": n.node_type,
                        "metadata": n.metadata,
                    }
                    for n in cg_result.nodes
                ]
                if nodes_payload:
                    await self._cg_client.add_nodes(graph_id, nodes_payload)

                # Persist edges (use function names as placeholder IDs)
                edges_payload = [
                    {
                        "caller_node_id": e.caller_id,
                        "callee_node_id": e.callee_id,
                        "call_type": e.call_type,
                        "weight": e.weight,
                        "metadata": e.metadata,
                    }
                    for e in cg_result.edges
                ]
                if edges_payload:
                    await self._cg_client.add_edges(graph_id, edges_payload)

        except Exception:
            logger.warning("Failed to persist call graph", exc_info=True)
