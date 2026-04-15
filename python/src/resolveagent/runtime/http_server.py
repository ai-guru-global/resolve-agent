"""HTTP server for agent execution - bridges Go platform to Python runtime."""

from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse

from resolveagent.corpus.importer import CorpusImporter
from resolveagent.runtime.engine import ExecutionEngine
from resolveagent.runtime.lifecycle import AgentLifecycleManager
from resolveagent.store.skill_client import SkillStoreClient

logger = logging.getLogger(__name__)


def _get_platform_address() -> str:
    """Get the Go platform address from environment or default."""
    return os.environ.get("RESOLVEAGENT_PLATFORM_ADDR", "localhost:8080")


class RuntimeHTTPServer:
    """HTTP server that handles agent execution requests from Go platform.

    This provides a REST API that maps to the gRPC service defined in proto files.
    """

    def __init__(
        self,
        host: str = "0.0.0.0",
        port: int = 9091,
        platform_address: str | None = None,
    ) -> None:
        self.host = host
        self.port = port
        self.platform_address = platform_address or _get_platform_address()
        self.engine = ExecutionEngine()
        self.lifecycle = AgentLifecycleManager()
        self._skill_client: SkillStoreClient | None = None
        self.app = self._create_app()

    def _create_app(self) -> FastAPI:
        """Create FastAPI application with routes."""

        @asynccontextmanager
        async def lifespan(app: FastAPI):
            """Lifespan context manager."""
            logger.info("Runtime HTTP server starting up...")
            await self.lifecycle.initialize()
            # Initialize skill store client for corpus import
            self._skill_client = SkillStoreClient(address=self.platform_address)
            await self._skill_client.connect()
            logger.info("Skill store client connected", extra={"address": self.platform_address})
            yield
            logger.info("Runtime HTTP server shutting down...")
            if self._skill_client:
                await self._skill_client.close()
            await self.lifecycle.shutdown()

        app = FastAPI(
            title="ResolveAgent Runtime API",
            description="Python runtime for agent execution",
            version="0.2.0",
            lifespan=lifespan,
        )

        # Health check
        @app.get("/health")
        async def health() -> dict[str, str]:
            return {"status": "healthy", "service": "runtime"}

        # Agent execution
        @app.post("/v1/agents/{agent_id}/execute")
        async def execute_agent(agent_id: str, request: Request) -> StreamingResponse:
            """Execute an agent and stream results."""
            try:
                body = await request.json()
                input_text = body.get("input", "")
                conversation_id = body.get("conversation_id")
                context = body.get("context", {})

                async def event_stream() -> AsyncIterator[str]:
                    """Generate SSE stream."""
                    try:
                        async for event in self.engine.execute(
                            agent_id=agent_id,
                            input_text=input_text,
                            conversation_id=conversation_id,
                            context=context,
                        ):
                            yield f"data: {json.dumps(event)}\n\n"
                        yield "data: [DONE]\n\n"
                    except Exception as e:
                        logger.error(f"Execution error: {e}")
                        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

                return StreamingResponse(
                    event_stream(),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                    },
                )

            except Exception as e:
                logger.error(f"Failed to execute agent: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        # Workflow execution
        @app.post("/v1/workflows/{workflow_id}/execute")
        async def execute_workflow(workflow_id: str, request: Request) -> StreamingResponse:
            """Execute a workflow and stream results."""
            try:
                body = await request.json()
                input_data = body.get("input", {})
                context = body.get("context", {})

                async def event_stream() -> AsyncIterator[str]:
                    """Generate SSE stream."""
                    try:
                        async for event in self.engine.execute_workflow(
                            workflow_id=workflow_id,
                            input_data=input_data,
                            context=context,
                        ):
                            yield f"data: {json.dumps(event)}\n\n"
                        yield "data: [DONE]\n\n"
                    except Exception as e:
                        logger.error(f"Workflow execution error: {e}")
                        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

                return StreamingResponse(
                    event_stream(),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                    },
                )

            except Exception as e:
                logger.error(f"Failed to execute workflow: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        # RAG query
        @app.post("/v1/rag/query")
        async def rag_query(request: Request) -> JSONResponse:
            """Query RAG collection."""
            try:
                body = await request.json()
                collection_id = body.get("collection_id")
                query = body.get("query", "")
                top_k = body.get("top_k", 5)
                filters = body.get("filters", {})

                # Import here to avoid circular imports
                from resolveagent.rag.pipeline import RAGPipeline

                pipeline = RAGPipeline()
                results = await pipeline.query(
                    collection_id=collection_id,
                    query=query,
                    top_k=top_k,
                    filters=filters,
                )

                return JSONResponse({
                    "results": results,
                    "query": query,
                    "collection_id": collection_id,
                })

            except Exception as e:
                logger.error(f"RAG query error: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        # RAG ingest
        @app.post("/v1/rag/ingest")
        async def rag_ingest(request: Request) -> JSONResponse:
            """Ingest documents into RAG collection."""
            try:
                body = await request.json()
                collection_id = body.get("collection_id")
                documents = body.get("documents", [])

                from resolveagent.rag.pipeline import RAGPipeline

                pipeline = RAGPipeline()
                result = await pipeline.ingest(
                    collection_id=collection_id,
                    documents=documents,
                )

                return JSONResponse({
                    "success": True,
                    "ingested_count": len(documents),
                    "collection_id": collection_id,
                })

            except Exception as e:
                logger.error(f"RAG ingest error: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        # Skill execution
        @app.post("/v1/skills/{skill_name}/execute")
        async def execute_skill(skill_name: str, request: Request) -> JSONResponse:
            """Execute a skill directly."""
            try:
                body = await request.json()
                parameters = body.get("parameters", {})
                context = body.get("context", {})

                from resolveagent.skills.executor import SkillExecutor

                executor = SkillExecutor()
                result = await executor.execute(
                    skill_name=skill_name,
                    parameters=parameters,
                    context=context,
                )

                return JSONResponse({
                    "success": result.success,
                    "output": result.output,
                    "error": result.error,
                })

            except Exception as e:
                logger.error(f"Skill execution error: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        # Corpus import
        @app.post("/v1/corpus/import")
        async def corpus_import(request: Request) -> StreamingResponse:
            """Import external corpus data and stream progress."""
            try:
                body = await request.json()

                from resolveagent.corpus.importer import (
                    CorpusImporter,
                    CorpusImportRequest,
                )

                req = CorpusImportRequest(
                    source=body.get("source", "https://github.com/kudig-io/kudig-database"),
                    import_types=body.get("import_types", ["rag", "fta", "skills", "code_analysis"]),
                    rag_collection_id=body.get("rag_collection_id", ""),
                    profile=body.get("profile", "rag-sre-profile"),
                    force_clone=body.get("force_clone", False),
                    dry_run=body.get("dry_run", False),
                )
                importer = CorpusImporter(skill_client=self._skill_client)

                async def event_stream() -> AsyncIterator[str]:
                    """Generate SSE stream for corpus import progress."""
                    try:
                        async for event in importer.import_corpus(req):
                            yield f"data: {json.dumps(event)}\n\n"
                        yield "data: [DONE]\n\n"
                    except Exception as e:
                        logger.error(f"Corpus import error: {e}")
                        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

                return StreamingResponse(
                    event_stream(),
                    media_type="text/event-stream",
                    headers={
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                    },
                )

            except Exception as e:
                logger.error(f"Failed to start corpus import: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        # Solution RAG sync
        @app.post("/v1/solutions/sync-rag")
        async def solution_sync_rag(request: Request) -> JSONResponse:
            """Sync a troubleshooting solution to the RAG vector store."""
            try:
                body = await request.json()
                solution_id = body.get("solution_id", "")
                title = body.get("title", "")
                problem_symptoms = body.get("problem_symptoms", "")
                key_information = body.get("key_information", "")
                troubleshooting_steps = body.get("troubleshooting_steps", "")
                resolution_steps = body.get("resolution_steps", "")
                domain = body.get("domain", "")
                tags = body.get("tags", [])

                # Build combined document for RAG ingestion
                content_parts = [
                    f"# {title}",
                    "",
                    "## Problem Symptoms",
                    problem_symptoms,
                    "",
                    "## Key Information",
                    key_information,
                    "",
                    "## Troubleshooting Steps",
                    troubleshooting_steps,
                    "",
                    "## Resolution Steps",
                    resolution_steps,
                ]
                content = "\n".join(content_parts)

                from resolveagent.rag.pipeline import RAGPipeline

                pipeline = RAGPipeline()
                collection_id = "solutions"
                documents = [{
                    "content": content,
                    "metadata": {
                        "solution_id": solution_id,
                        "domain": domain,
                        "tags": tags,
                        "type": "troubleshooting_solution",
                    },
                }]
                await pipeline.ingest(
                    collection_id=collection_id,
                    documents=documents,
                )

                return JSONResponse({
                    "success": True,
                    "rag_collection_id": collection_id,
                    "rag_document_id": solution_id,
                })

            except Exception as e:
                logger.error(f"Solution RAG sync error: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        # Solution semantic search
        @app.post("/v1/solutions/semantic-search")
        async def solution_semantic_search(request: Request) -> JSONResponse:
            """Perform semantic search on troubleshooting solutions via RAG."""
            try:
                body = await request.json()
                query = body.get("query", "")
                top_k = body.get("top_k", 10)
                domain = body.get("domain", "")
                tags = body.get("tags", [])

                if not query:
                    raise HTTPException(
                        status_code=400, detail="query is required"
                    )

                from resolveagent.rag.pipeline import RAGPipeline

                pipeline = RAGPipeline()
                filters: dict[str, Any] = {
                    "type": "troubleshooting_solution",
                }
                if domain:
                    filters["domain"] = domain

                results = await pipeline.query(
                    collection_id="solutions",
                    query=query,
                    top_k=top_k,
                    filters=filters,
                )

                # Transform RAG results to solution search format
                search_results = []
                for r in results:
                    search_results.append({
                        "solution_id": r.get("metadata", {}).get(
                            "solution_id", ""
                        ),
                        "title": r.get("metadata", {}).get("title", ""),
                        "score": r.get("score", 0.0),
                        "snippet": r.get("content", "")[:200],
                    })

                return JSONResponse({
                    "results": search_results,
                    "total": len(search_results),
                })

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Solution semantic search error: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        # ---------------------------------------------------------------
        # Code Analysis endpoints
        # ---------------------------------------------------------------

        @app.post("/v1/code-analysis/static")
        async def static_analysis(request: Request) -> StreamingResponse:
            """Run static code analysis and stream progress."""
            try:
                body = await request.json()

                from resolveagent.code_analysis.engine import StaticAnalysisEngine

                engine = StaticAnalysisEngine(model=body.get("model"))

                async def event_stream() -> AsyncIterator[str]:
                    try:
                        async for event in engine.analyze(
                            repo_path=body.get("repo_path", ""),
                            language=body.get("language"),
                            entry_points=body.get("entry_points"),
                            error_logs=body.get("error_logs", ""),
                            max_depth=body.get("max_depth", 10),
                            repository_url=body.get("repository_url", ""),
                            branch=body.get("branch", "main"),
                        ):
                            yield f"data: {json.dumps(event)}\n\n"
                        yield "data: [DONE]\n\n"
                    except Exception as e:
                        logger.error(f"Static analysis error: {e}")
                        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

                return StreamingResponse(
                    event_stream(),
                    media_type="text/event-stream",
                    headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
                )

            except Exception as e:
                logger.error(f"Failed to start static analysis: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        @app.post("/v1/code-analysis/traffic")
        async def traffic_analysis(request: Request) -> StreamingResponse:
            """Run dynamic traffic analysis and stream progress."""
            try:
                body = await request.json()

                from resolveagent.traffic.engine import DynamicAnalysisEngine

                engine = DynamicAnalysisEngine(model=body.get("model"))

                async def event_stream() -> AsyncIterator[str]:
                    try:
                        async for event in engine.analyze(
                            sources=body.get("sources", []),
                            name=body.get("name", ""),
                            target_service=body.get("target_service", ""),
                        ):
                            yield f"data: {json.dumps(event)}\n\n"
                        yield "data: [DONE]\n\n"
                    except Exception as e:
                        logger.error(f"Traffic analysis error: {e}")
                        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

                return StreamingResponse(
                    event_stream(),
                    media_type="text/event-stream",
                    headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
                )

            except Exception as e:
                logger.error(f"Failed to start traffic analysis: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        @app.post("/v1/code-analysis/errors/parse")
        async def parse_errors(request: Request) -> JSONResponse:
            """Parse error text and return structured errors."""
            try:
                body = await request.json()
                text = body.get("text", "")
                language = body.get("language")

                from resolveagent.code_analysis.error_parser import ErrorParser

                parser = ErrorParser()
                errors = parser.parse(text, language)

                return JSONResponse({
                    "errors": [
                        {
                            "error_type": e.error_type,
                            "message": e.message,
                            "language": e.language,
                            "severity": e.severity,
                            "file_path": e.file_path,
                            "line_number": e.line_number,
                            "stack_trace": [
                                {
                                    "file_path": f.file_path,
                                    "line_number": f.line_number,
                                    "function_name": f.function_name,
                                }
                                for f in e.stack_trace
                            ],
                        }
                        for e in errors
                    ],
                    "count": len(errors),
                })

            except Exception as e:
                logger.error(f"Error parsing failed: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        @app.post("/v1/code-analysis/traffic/graphs/{graph_id}/analyze")
        async def analyze_traffic_graph(graph_id: str, request: Request) -> StreamingResponse:
            """Trigger LLM analysis on a persisted traffic graph."""
            try:
                body = await request.json()

                from resolveagent.store.traffic_graph_client import TrafficGraphClient
                from resolveagent.traffic.graph_builder import TrafficGraphData, ServiceNode, ServiceEdge
                from resolveagent.traffic.report_generator import ReportGenerator

                graph_client = TrafficGraphClient(base_url=body.get("platform_url", "http://localhost:8080"))
                graph_info = await graph_client.get(graph_id)

                if not graph_info:
                    raise HTTPException(status_code=404, detail="Traffic graph not found")

                # Reconstruct TrafficGraphData from stored data
                graph_data = TrafficGraphData(
                    nodes=[
                        ServiceNode(
                            id=n.get("id", ""),
                            label=n.get("label", ""),
                            request_count=n.get("request_count", 0),
                            error_count=n.get("error_count", 0),
                            avg_latency_ms=n.get("avg_latency_ms", 0),
                            protocols=n.get("protocols", []),
                        )
                        for n in (graph_info.nodes or [])
                    ],
                    edges=[
                        ServiceEdge(
                            id=e.get("id", ""),
                            source=e.get("source", ""),
                            target=e.get("target", ""),
                            request_count=e.get("request_count", 0),
                            error_count=e.get("error_count", 0),
                            avg_latency_ms=e.get("avg_latency_ms", 0),
                            protocols=e.get("protocols", []),
                            methods=e.get("methods", []),
                            paths=e.get("paths", []),
                        )
                        for e in (graph_info.edges or [])
                    ],
                    stats=graph_info.graph_data or {},
                )

                generator = ReportGenerator(model=body.get("model"))
                report = await generator.generate(graph_data)

                # Update the stored graph with the report
                await graph_client.update(graph_id, {
                    "analysis_report": report.to_markdown(),
                    "suggestions": report.suggestions,
                    "status": "analyzed",
                })

                return JSONResponse({
                    "graph_id": graph_id,
                    "report": report.to_dict(),
                    "report_markdown": report.to_markdown(),
                })

            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Traffic graph analysis failed: {e}")
                raise HTTPException(status_code=500, detail=str(e))

        return app

    async def start(self) -> None:
        """Start the HTTP server."""
        import asyncio

        config = uvicorn.Config(
            self.app,
            host=self.host,
            port=self.port,
            log_level="info",
            access_log=False,
        )
        server = uvicorn.Server(config)

        logger.info(f"Runtime HTTP server starting on {self.host}:{self.port}")
        await server.serve()

    async def stop(self) -> None:
        """Stop the server gracefully."""
        logger.info("Runtime HTTP server stopping...")


# Singleton instance
_runtime_server: RuntimeHTTPServer | None = None


def get_runtime_server(host: str = "0.0.0.0", port: int = 9091) -> RuntimeHTTPServer:
    """Get or create runtime server singleton."""
    global _runtime_server
    if _runtime_server is None:
        _runtime_server = RuntimeHTTPServer(host, port)
    return _runtime_server
