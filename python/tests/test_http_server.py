"""Unit tests for the RuntimeHTTPServer FastAPI application."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
def server():
    """Create a RuntimeHTTPServer instance for testing."""
    from resolveagent.runtime.http_server import RuntimeHTTPServer

    return RuntimeHTTPServer()


@pytest.fixture
def app(server):
    """Return the FastAPI app from the server."""
    return server.app


@pytest.fixture
async def client(app):
    """Async httpx client bound to the FastAPI ASGI app."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


# -----------------------------------------------------------------------
# Health endpoint
# -----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_health_endpoint(client):
    """GET /health returns 200 with status and service fields."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["service"] == "runtime"


@pytest.mark.asyncio
async def test_health_endpoint_content_type(client):
    """GET /health returns application/json content type."""
    resp = await client.get("/health")
    assert "application/json" in resp.headers["content-type"]


# -----------------------------------------------------------------------
# Streaming endpoints
# -----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_execute_agent_returns_stream(app):
    """POST /v1/agents/{id}/execute returns an SSE stream."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/v1/agents/test-agent/execute",
            json={"input": "hello"},
        )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]


@pytest.mark.asyncio
async def test_execute_workflow_returns_stream(app):
    """POST /v1/workflows/{id}/execute returns an SSE stream."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/v1/workflows/test-workflow/execute",
            json={"input": {"step": "start"}},
        )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]


@pytest.mark.asyncio
async def test_corpus_import_returns_stream(app):
    """POST /v1/corpus/import returns an SSE stream."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/v1/corpus/import",
            json={"source": "https://example.com/repo", "dry_run": True},
        )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]


# -----------------------------------------------------------------------
# Error handling
# -----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_rag_query_missing_body(app):
    """POST /v1/rag/query with empty body handles gracefully."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/v1/rag/query", json={})
    # Should handle gracefully (may return 500 or empty results)
    assert resp.status_code in (200, 500)


@pytest.mark.asyncio
async def test_solution_semantic_search_empty_query(app):
    """POST /v1/solutions/semantic-search with empty query returns 400."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/v1/solutions/semantic-search",
            json={"query": ""},
        )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_solution_semantic_search_missing_query(app):
    """POST /v1/solutions/semantic-search without query field returns 400."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/v1/solutions/semantic-search",
            json={},
        )
    assert resp.status_code == 400


# -----------------------------------------------------------------------
# Security headers
# -----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_security_headers(client):
    """Responses include security headers set by middleware."""
    resp = await client.get("/health")
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "DENY"
    assert resp.headers.get("X-XSS-Protection") == "1; mode=block"
    assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


@pytest.mark.asyncio
async def test_security_headers_on_streaming_response(app):
    """Streaming responses also include security headers."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/v1/agents/test-agent/execute",
            json={"input": "hello"},
        )
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "DENY"


# -----------------------------------------------------------------------
# Rate limiting
# -----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_rate_limit_middleware(app):
    """Rate limiting returns 429 when the RPM threshold is exceeded."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        responses = []
        for _ in range(65):  # Default limit is 60 RPM
            resp = await ac.get("/health")
            responses.append(resp.status_code)
    # At least some requests should be rate-limited
    assert 429 in responses


@pytest.mark.asyncio
async def test_rate_limit_response_body(app):
    """Rate-limited response contains a helpful detail message."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Exhaust the rate limit
        for _ in range(60):
            await ac.get("/health")
        resp = await ac.get("/health")
    assert resp.status_code == 429
    data = resp.json()
    assert "Rate limit" in data.get("detail", "")


# -----------------------------------------------------------------------
# Error sanitization
# -----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_error_messages_sanitized(app):
    """Error responses should not leak internal implementation details."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/v1/rag/query",
            json={"collection_id": "nonexistent", "query": "test"},
        )
    if resp.status_code == 500:
        data = resp.json()
        detail = data.get("detail", "").lower()
        assert "traceback" not in detail
        assert "import" not in detail


@pytest.mark.asyncio
async def test_error_sanitization_on_skill_endpoint(app):
    """Skill execution errors should not leak stack traces."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/v1/skills/nonexistent-skill/execute",
            json={"parameters": {}},
        )
    if resp.status_code == 500:
        data = resp.json()
        detail = data.get("detail", "").lower()
        assert "traceback" not in detail


# -----------------------------------------------------------------------
# Endpoint existence / 404 handling
# -----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_unknown_route_returns_404(client):
    """Requesting an undefined route returns 404."""
    resp = await client.get("/v1/nonexistent")
    assert resp.status_code == 404


# -----------------------------------------------------------------------
# POST /v1/selector/route
# -----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_selector_route_rule_strategy(client):
    """POST /v1/selector/route with strategy=rule returns a valid skill decision."""
    resp = await client.post(
        "/v1/selector/route",
        json={"input_text": "search for Python tutorials online", "strategy": "rule"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["route_type"] == "skill"
    assert data["route_target"] == "web-search"
    assert data["strategy"] == "rule"
    assert data["degraded"] is False


@pytest.mark.asyncio
async def test_selector_route_code_analysis(client):
    """POST /v1/selector/route routes code block input to code_analysis."""
    resp = await client.post(
        "/v1/selector/route",
        json={"input_text": "analyze this code for vulnerabilities", "strategy": "rule"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["route_type"] == "code_analysis"


@pytest.mark.asyncio
async def test_selector_route_accepts_input_text_alias(client):
    """Both 'input_text' and 'input' field names are accepted."""
    resp_a = await client.post(
        "/v1/selector/route",
        json={"input_text": "搜索最新资讯", "strategy": "rule"},
    )
    resp_b = await client.post(
        "/v1/selector/route",
        json={"input": "搜索最新资讯", "strategy": "rule"},
    )
    assert resp_a.status_code == 200
    assert resp_b.status_code == 200
    # Both aliases must produce the same routing decision
    assert resp_a.json()["route_type"] == resp_b.json()["route_type"]
    assert resp_a.json()["route_target"] == resp_b.json()["route_target"]


@pytest.mark.asyncio
async def test_selector_route_empty_input_returns_400(client):
    """POST /v1/selector/route with empty input_text returns 400."""
    resp = await client.post(
        "/v1/selector/route",
        json={"input_text": "", "strategy": "rule"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_selector_route_hybrid_degrades(client):
    """Without a real LLM key, hybrid strategy degrades gracefully and still returns 200."""
    resp = await client.post(
        "/v1/selector/route",
        json={"input_text": "diagnose the outage root cause", "strategy": "hybrid"},
    )
    assert resp.status_code == 200
    data = resp.json()
    # Must always contain a valid decision even when degraded
    assert "route_type" in data
    assert isinstance(data["degraded"], bool)
    # latency_ms must be a non-negative number
    assert data["latency_ms"] >= 0


@pytest.mark.asyncio
async def test_selector_route_invalid_strategy_returns_422(client):
    """POST /v1/selector/route with an invalid strategy value returns 422."""
    resp = await client.post(
        "/v1/selector/route",
        json={"input_text": "search for something", "strategy": "invalid_strategy"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_selector_route_response_schema(client):
    """GET /openapi.json exposes the /v1/selector/route endpoint."""
    resp = await client.get("/openapi.json")
    assert resp.status_code == 200
    schema = resp.json()
    paths = schema.get("paths", {})
    assert "/v1/selector/route" in paths, f"/v1/selector/route not found in OpenAPI paths: {list(paths.keys())}"


# -----------------------------------------------------------------------
# Error event contract (Go ExecuteAgentResponse)
# -----------------------------------------------------------------------


def test_build_error_event_includes_nested_error():
    """_build_error_event carries both the nested Go-style error and flat fields."""
    from resolveagent.runtime.http_server import _build_error_event

    event = _build_error_event(ValueError("bad input"))
    assert event["type"] == "error"
    assert event["error"] == {
        "error_code": "INVALID_ARGUMENT",
        "category": "validation",
        "message": "bad input",
    }
    # Flat fields kept for backward compatibility
    assert event["error_code"] == "INVALID_ARGUMENT"
    assert event["message"] == "bad input"


# -----------------------------------------------------------------------
# Rate limiting: X-Forwarded-For and idle-client pruning
# -----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_rate_limit_uses_x_forwarded_for(app):
    """Clients are rate-limited independently by X-Forwarded-For IP."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        for _ in range(60):
            await ac.get("/health", headers={"X-Forwarded-For": "203.0.113.7"})
        resp = await ac.get("/health", headers={"X-Forwarded-For": "203.0.113.7"})
        assert resp.status_code == 429
        other = await ac.get("/health", headers={"X-Forwarded-For": "203.0.113.8"})
        assert other.status_code == 200


def test_rate_limit_prunes_idle_clients():
    """Buckets idle for over 5 minutes are dropped from the map."""
    import time

    from resolveagent.runtime.http_server import RateLimitMiddleware

    mw = RateLimitMiddleware(app=None)
    now = time.time()
    mw.requests["stale"] = [now - 400]
    mw.requests["active"] = [now]
    mw._prune_idle_clients(now)
    assert "stale" not in mw.requests
    assert "active" in mw.requests


# -----------------------------------------------------------------------
# /v1/selector/route flag passthrough
# -----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_selector_route_forwards_enrich_and_bypass_flags(server):
    """enrich_context/bypass_cache flags are forwarded to selector.route()."""
    from unittest.mock import AsyncMock, MagicMock

    from resolveagent.selector.selector import RouteDecision

    mock_selector = MagicMock()
    mock_selector.route = AsyncMock(return_value=RouteDecision(route_type="skill", route_target="web-search", confidence=0.9))
    server._selectors["hybrid"] = mock_selector

    async with AsyncClient(transport=ASGITransport(app=server.app), base_url="http://test") as ac:
        resp = await ac.post(
            "/v1/selector/route",
            json={
                "input_text": "search the web for tutorials",
                "strategy": "hybrid",
                "enrich_context": True,
                "bypass_cache": True,
            },
        )
    assert resp.status_code == 200
    _, kwargs = mock_selector.route.call_args
    assert kwargs["enrich_context"] is True
    assert kwargs["bypass_cache"] is True


# -----------------------------------------------------------------------
# /v1/solutions/semantic-search
# -----------------------------------------------------------------------


@pytest.mark.asyncio
async def test_semantic_search_filters_results_in_memory(app, monkeypatch):
    """Semantic search filters RAG results by domain/tags and maps the text key."""
    from resolveagent.rag import pipeline as rag_pipeline

    class _FakePipeline:
        async def query(self, collection_id, query, top_k=5):
            return [
                {
                    "text": "x" * 300,
                    "score": 0.9,
                    "metadata": {"solution_id": "s1", "title": "Pod Crash Fix", "domain": "k8s", "tags": ["pod"]},
                },
                {
                    "text": "mysql restart",
                    "score": 0.8,
                    "metadata": {"solution_id": "s2", "title": "DB Fix", "domain": "db", "tags": ["mysql"]},
                },
            ]

    monkeypatch.setattr(rag_pipeline, "RAGPipeline", _FakePipeline)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/v1/solutions/semantic-search", json={"query": "pod crash", "domain": "k8s"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        result = data["results"][0]
        assert result["solution_id"] == "s1"
        assert result["title"] == "Pod Crash Fix"
        assert result["snippet"] == "x" * 200

        resp = await ac.post("/v1/solutions/semantic-search", json={"query": "pod crash", "tags": ["mysql"]})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["results"][0]["solution_id"] == "s2"
