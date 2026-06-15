# Input Validation Patterns

## Current State

Input validation in the Python runtime is ad-hoc, with each endpoint handling
validation independently:

```python
# Current pattern (http_server.py)
body = await request.json()
query = body.get("query", "")
if not query:
    raise HTTPException(status_code=400, detail="query is required")
```

Issues with this approach:
- No automatic OpenAPI schema generation
- Inconsistent error response format
- Each endpoint reinvents validation logic
- Missing type checking (all values are `Any`)

## Recommended: Pydantic Request Models

FastAPI's native pattern uses Pydantic models for request bodies, providing
automatic validation, type safety, and OpenAPI schema generation:

```python
from pydantic import BaseModel, Field

class RAGQueryRequest(BaseModel):
    collection_id: str
    query: str = Field(min_length=1, max_length=10000)
    top_k: int = Field(default=5, ge=1, le=100)
    filters: dict[str, Any] = Field(default_factory=dict)

@app.post("/v1/rag/query")
async def rag_query(request: RAGQueryRequest) -> JSONResponse:
    # request.query is guaranteed non-empty string <= 10000 chars
    # request.top_k is guaranteed 1-100
    pipeline = RAGPipeline()
    results = await pipeline.query(
        collection_id=request.collection_id,
        query=request.query,
        top_k=request.top_k,
        filters=request.filters,
    )
    return JSONResponse({"results": results})
```

### Benefits

1. **Automatic 422 responses** for invalid input with structured error details
2. **Type-safe** endpoint handlers — no `body.get()` calls
3. **OpenAPI schema** auto-generated from models
4. **Centralized** validation rules in model definitions
5. **Consistent** error format across all endpoints

### Migration Strategy

Replace `body.get()` patterns endpoint by endpoint:

| Endpoint | Current Pattern | Pydantic Model |
|----------|----------------|----------------|
| `POST /v1/agents/{id}/execute` | `body.get("input")` | `AgentExecuteRequest` |
| `POST /v1/rag/query` | `body.get("query")` | `RAGQueryRequest` |
| `POST /v1/rag/ingest` | `body.get("documents")` | `RAGIngestRequest` |
| `POST /v1/skills/{name}/execute` | `body.get("parameters")` | `SkillExecuteRequest` |
| `POST /v1/code-analysis/static` | `body.get("repo_path")` | `StaticAnalysisRequest` |

### Example: Agent Execute Request

```python
class AgentExecuteRequest(BaseModel):
    input: str = Field(min_length=1, max_length=50000)
    conversation_id: str | None = None
    context: dict[str, Any] = Field(default_factory=dict)

@app.post("/v1/agents/{agent_id}/execute")
async def execute_agent(agent_id: str, request: AgentExecuteRequest) -> StreamingResponse:
    async def event_stream():
        async for event in self.engine.execute(
            agent_id=agent_id,
            input_text=request.input,
            conversation_id=request.conversation_id,
            context=request.context,
        ):
            yield f"data: {json.dumps(event)}\n\n"
        yield "data: [DONE]\n\n"
    return StreamingResponse(event_stream(), media_type="text/event-stream")
```

## Go Platform Validation

The Go platform already uses typed request structs (e.g., `ExecuteAgentRequest`).
Add validation tags for completeness:

```go
type ExecuteAgentRequest struct {
    Input          string                 `json:"input" validate:"required,min=1,max=50000"`
    ConversationID string                 `json:"conversation_id,omitempty"`
    Context        map[string]interface{} `json:"context,omitempty"`
}
```
