"""HTTP server for agent execution - bridges Go platform to Python runtime."""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse

from resolveagent.runtime.engine import ExecutionEngine
from resolveagent.runtime.lifecycle import AgentLifecycleManager

logger = logging.getLogger(__name__)


class RuntimeHTTPServer:
    """HTTP server that handles agent execution requests from Go platform.
    
    This provides a REST API that maps to the gRPC service defined in proto files.
    """

    def __init__(self, host: str = "0.0.0.0", port: int = 9091) -> None:
        self.host = host
        self.port = port
        self.engine = ExecutionEngine()
        self.lifecycle = AgentLifecycleManager()
        self.app = self._create_app()

    def _create_app(self) -> FastAPI:
        """Create FastAPI application with routes."""
        
        @asynccontextmanager
        async def lifespan(app: FastAPI):
            """Lifespan context manager."""
            logger.info("Runtime HTTP server starting up...")
            await self.lifecycle.initialize()
            yield
            logger.info("Runtime HTTP server shutting down...")
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
