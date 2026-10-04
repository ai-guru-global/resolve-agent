"""Unit tests for the Go platform store REST clients (store/).

All HTTP interaction runs through httpx.MockTransport — no live server needed.
Locks the address-normalization invariant that 7b72906 had to patch at the
http_server call site.
"""

from __future__ import annotations

from typing import Any

import httpx
import pytest

from resolveagent.store.base_client import BaseStoreClient
from resolveagent.store.skill_client import SkillStoreClient
from resolveagent.store.traffic_graph_client import TrafficGraphClient


def make_client(client_cls: type, handler: Any) -> Any:
    client = client_cls(address="localhost:8080", transport=httpx.MockTransport(handler))
    return client


def json_handler(routes: dict[tuple[str, str], Any], status: int = 200) -> Any:
    """Build a MockTransport handler from {(method, path): json_body}."""

    def handler(request: httpx.Request) -> httpx.Response:
        key = (request.method, request.url.path)
        if key not in routes:
            return httpx.Response(404, json={"error": "not found"})
        body = routes[key]
        if isinstance(body, int):
            return httpx.Response(body)
        return httpx.Response(status, json=body)

    return handler


class TestAddressNormalization:
    def test_bare_host_builds_http_base_url(self) -> None:
        client = BaseStoreClient(address="localhost:8080")
        assert client._base_url == "http://localhost:8080"

    @pytest.mark.parametrize("raw", ["http://localhost:8080", "https://localhost:8080", "http://localhost:8080/"])
    def test_scheme_prefixed_address_is_stripped(self, raw: str) -> None:
        client = BaseStoreClient(address=raw)
        assert client._base_url == "http://localhost:8080"

    def test_trailing_slash_is_stripped(self) -> None:
        client = BaseStoreClient(address="localhost:8080/")
        assert client._base_url == "http://localhost:8080"


class TestBaseStoreClient:
    async def test_not_connected_raises(self) -> None:
        client = BaseStoreClient()
        with pytest.raises(RuntimeError, match="not connected"):
            await client._get("/api/v1/anything")

    async def test_success_returns_json(self) -> None:
        client = make_client(
            BaseStoreClient,
            json_handler({("GET", "/api/v1/thing"): {"id": "t-1"}}),
        )
        await client.connect()
        try:
            assert await client._get("/api/v1/thing") == {"id": "t-1"}
        finally:
            await client.close()

    async def test_404_returns_none(self) -> None:
        client = make_client(BaseStoreClient, json_handler({}))
        await client.connect()
        try:
            assert await client._get("/api/v1/missing") is None
        finally:
            await client.close()

    async def test_http_error_is_swallowed_and_returns_none(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(500, json={"error": "boom"})

        client = make_client(BaseStoreClient, handler)
        await client.connect()
        try:
            assert await client._get("/api/v1/thing") is None
            assert await client._post("/api/v1/thing", {"a": 1}) is None
            assert await client._put("/api/v1/thing", {"a": 1}) is None
            assert await client._delete("/api/v1/thing") is None
        finally:
            await client.close()

    async def test_post_put_delete_roundtrip(self) -> None:
        routes = {
            ("POST", "/api/v1/thing"): {"created": True},
            ("PUT", "/api/v1/thing"): {"updated": True},
            ("DELETE", "/api/v1/thing"): {"deleted": True},
        }
        seen_methods: list[str] = []

        def handler(request: httpx.Request) -> httpx.Response:
            seen_methods.append(request.method)
            return httpx.Response(200, json=routes[(request.method, request.url.path)])

        client = make_client(BaseStoreClient, handler)
        await client.connect()
        try:
            assert await client._post("/api/v1/thing", {"x": 1}) == {"created": True}
            assert await client._put("/api/v1/thing", {"x": 2}) == {"updated": True}
            assert await client._delete("/api/v1/thing") == {"deleted": True}
            assert seen_methods == ["POST", "PUT", "DELETE"]
        finally:
            await client.close()

    async def test_close_clears_client(self) -> None:
        client = make_client(BaseStoreClient, json_handler({}))
        await client.connect()
        await client.close()
        assert client._client is None


class TestTrafficGraphClient:
    async def test_get_maps_all_fields(self) -> None:
        payload = {
            "id": "g-1",
            "capture_id": "c-9",
            "name": "prod-graph",
            "graph_data": {"nodes_count": 3},
            "nodes": [{"id": "n1"}],
            "edges": [{"src": "n1"}],
            "analysis_report": "looks fine",
            "suggestions": ["scale up"],
            "status": "analyzed",
        }
        client = make_client(
            TrafficGraphClient,
            json_handler({("GET", "/api/v1/traffic/graphs/g-1"): payload}),
        )
        await client.connect()
        try:
            info = await client.get("g-1")
            assert info is not None
            assert (info.id, info.capture_id, info.name, info.status) == ("g-1", "c-9", "prod-graph", "analyzed")
            assert info.graph_data == {"nodes_count": 3}
            assert info.suggestions == ["scale up"]
        finally:
            await client.close()

    async def test_get_missing_returns_none(self) -> None:
        client = make_client(TrafficGraphClient, json_handler({}))
        await client.connect()
        try:
            assert await client.get("nope") is None
            assert await client.list() == []
        finally:
            await client.close()

    async def test_list_parses_graph_summaries(self) -> None:
        client = make_client(
            TrafficGraphClient,
            json_handler({("GET", "/api/v1/traffic/graphs"): {"graphs": [{"id": "g-1", "status": "pending"}, {"id": "g-2"}]}}),
        )
        await client.connect()
        try:
            graphs = await client.list()
            assert [g.id for g in graphs] == ["g-1", "g-2"]
            assert graphs[1].status == "pending"
        finally:
            await client.close()

    async def test_create_update_delete_analyze_paths(self) -> None:
        routes = {
            ("POST", "/api/v1/traffic/graphs"): {"id": "g-new"},
            ("PUT", "/api/v1/traffic/graphs/g-1"): {"ok": True},
            ("DELETE", "/api/v1/traffic/graphs/g-1"): {"ok": True},
            ("POST", "/api/v1/traffic/graphs/g-1/analyze"): {"report": "r"},
        }
        client = make_client(TrafficGraphClient, json_handler(routes))
        await client.connect()
        try:
            assert await client.create({"name": "n"}) == {"id": "g-new"}
            assert await client.update("g-1", {"status": "x"}) == {"ok": True}
            assert await client.delete("g-1") == {"ok": True}
            assert await client.analyze("g-1") == {"report": "r"}
        finally:
            await client.close()


class TestSkillStoreClient:
    async def test_register_skill_success(self) -> None:
        client = make_client(
            SkillStoreClient,
            json_handler({("POST", "/api/v1/skills"): {"name": "demo", "status": "active"}}),
        )
        await client.connect()
        try:
            result = await client.register_skill({"name": "demo"})
            assert result == {"name": "demo", "status": "active"}
        finally:
            await client.close()

    async def test_register_skill_409_returns_input_verbatim(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            assert request.url.path == "/api/v1/skills"
            return httpx.Response(409)

        client = make_client(SkillStoreClient, handler)
        await client.connect()
        try:
            payload = {"name": "already-there"}
            assert await client.register_skill(payload) is payload
        finally:
            await client.close()

    async def test_register_skill_error_returns_none(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(500)

        client = make_client(SkillStoreClient, handler)
        await client.connect()
        try:
            assert await client.register_skill({"name": "x"}) is None
        finally:
            await client.close()
