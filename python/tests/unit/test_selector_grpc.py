"""Tests for the gRPC SelectorService shim."""

from __future__ import annotations

import grpc
import pytest
from google.protobuf import struct_pb2

from resolveagent.runtime.routing import RoutingService
from resolveagent.runtime.selector_grpc import SelectorServicer, add_servicer
from resolveagent.v1 import agent_pb2, selector_pb2, selector_pb2_grpc


@pytest.fixture
async def grpc_stub():
    """In-process grpc.aio server with the SelectorServicer bound to port 0."""
    server = grpc.aio.server()
    add_servicer(server, RoutingService())
    port = server.add_insecure_port("127.0.0.1:0")
    await server.start()
    try:
        async with grpc.aio.insecure_channel(f"127.0.0.1:{port}") as channel:
            yield selector_pb2_grpc.SelectorServiceStub(channel)
    finally:
        await server.stop(grace=None)


@pytest.mark.asyncio
async def test_grpc_route_rule_decision(grpc_stub):
    """Route returns a decision mapped to the proto RouteType enum."""
    resp = await grpc_stub.Route(selector_pb2.RouteRequest(input="search for Python tutorials online", agent_id="agent-1"))
    assert resp.decision.route_type == agent_pb2.ROUTE_TYPE_SKILL
    assert resp.decision.route_target == "web-search"
    assert resp.decision.confidence > 0.5
    # NOTE: proto map __getitem__ auto-creates an unset Value for missing keys
    # and raises 'Value not set' on read — use membership checks, not [].
    assert "matched_patterns" in resp.decision.parameters
    assert resp.reasoning


@pytest.mark.asyncio
async def test_grpc_route_struct_context_roundtrip(grpc_stub):
    """A Struct context is accepted and does not break routing."""
    ctx = struct_pb2.Struct()
    ctx.update({"conversation_id": "c-1"})
    resp = await grpc_stub.Route(selector_pb2.RouteRequest(input="诊断服务故障根因", agent_id="a1", context=ctx))
    assert resp.decision.route_type == agent_pb2.ROUTE_TYPE_FTA


@pytest.mark.asyncio
async def test_grpc_route_empty_input_rejected(grpc_stub):
    """Route aborts with INVALID_ARGUMENT on empty input."""
    with pytest.raises(grpc.aio.AioRpcError) as exc_info:
        await grpc_stub.Route(selector_pb2.RouteRequest(input=""))
    assert exc_info.value.code() == grpc.StatusCode.INVALID_ARGUMENT


@pytest.mark.asyncio
async def test_grpc_classify_intent(grpc_stub):
    """ClassifyIntent returns intent_type/confidence/entities."""
    resp = await grpc_stub.ClassifyIntent(selector_pb2.ClassifyIntentRequest(input="帮我搜索一下最新的 Kubernetes 版本"))
    assert resp.intent_type
    assert 0.0 <= resp.confidence <= 1.0
    assert "suggested_target" in resp.metadata


@pytest.mark.asyncio
async def test_grpc_classify_intent_empty_input_rejected(grpc_stub):
    with pytest.raises(grpc.aio.AioRpcError) as exc_info:
        await grpc_stub.ClassifyIntent(selector_pb2.ClassifyIntentRequest(input=""))
    assert exc_info.value.code() == grpc.StatusCode.INVALID_ARGUMENT


def test_route_type_enum_mapping_covers_rule_strategy_outputs():
    """Every route_type the selector can emit has a proto enum mapping (code_analysis excepted)."""
    from resolveagent.runtime.selector_grpc import _ROUTE_TYPE_ENUM
    from resolveagent.selector.strategies.rule_strategy import RuleStrategy

    known = {r.route_type for r in RuleStrategy.ROUTING_RULES} | {"direct"}
    unmapped = known - set(_ROUTE_TYPE_ENUM) - {"code_analysis"}
    assert not unmapped, f"route types without proto enum mapping: {unmapped}"


def test_servicer_direct_instantiation():
    """SelectorServicer is usable without the generated base class."""
    s = SelectorServicer()
    assert s._routing is not None
