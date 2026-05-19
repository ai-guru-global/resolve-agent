"""Unit tests for the RuntimeHTTPServer FastAPI application."""

from __future__ import annotations

import json
import os

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
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
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
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/v1/agents/test-agent/execute",
            json={"input": "hello"},
        )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]


@pytest.mark.asyncio
async def test_execute_workflow_returns_stream(app):
    """POST /v1/workflows/{id}/execute returns an SSE stream."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/v1/workflows/test-workflow/execute",
            json={"input": {"step": "start"}},
        )
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]


@pytest.mark.asyncio
async def test_corpus_import_returns_stream(app):
    """POST /v1/corpus/import returns an SSE stream."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
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
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post("/v1/rag/query", json={})
    # Should handle gracefully (may return 500 or empty results)
    assert resp.status_code in (200, 500)


@pytest.mark.asyncio
async def test_solution_semantic_search_empty_query(app):
    """POST /v1/solutions/semantic-search with empty query returns 400."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        resp = await ac.post(
            "/v1/solutions/semantic-search",
            json={"query": ""},
        )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_solution_semantic_search_missing_query(app):
    """POST /v1/solutions/semantic-search without query field returns 400."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
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
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
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
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        responses = []
        for _ in range(65):  # Default limit is 60 RPM
            resp = await ac.get("/health")
            responses.append(resp.status_code)
    # At least some requests should be rate-limited
    assert 429 in responses


@pytest.mark.asyncio
async def test_rate_limit_response_body(app):
    """Rate-limited response contains a helpful detail message."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
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
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
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
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
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
