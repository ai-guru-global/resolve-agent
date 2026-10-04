"""Unit tests for AgentMessageBus (message_bus.py)."""

from __future__ import annotations

import asyncio
from typing import Any

import pytest

from resolveagent.message_bus import (
    AgentMessage,
    AgentMessageBus,
    MessageBusRegistry,
    MessagePriority,
)


def make_message(channel: str, sender: str = "agent-b", **kwargs: Any) -> AgentMessage:
    return AgentMessage(
        id=kwargs.pop("id", "msg-1"),
        channel=channel,
        sender=sender,
        message_type=kwargs.pop("message_type", "event"),
        content=kwargs.pop("content", {"ok": True}),
        **kwargs,
    )


@pytest.fixture
async def bus() -> AgentMessageBus:
    b = AgentMessageBus()
    await b.start()
    yield b
    await b.stop()


async def wait_for(condition, timeout: float = 2.0) -> None:
    async def _poll() -> None:
        while not condition():
            await asyncio.sleep(0.01)

    await asyncio.wait_for(_poll(), timeout=timeout)


class TestPubSub:
    async def test_delivers_to_subscriber(self, bus: AgentMessageBus) -> None:
        received: list[AgentMessage] = []

        async def on_message(msg: AgentMessage) -> None:
            received.append(msg)

        await bus.subscribe("agent-a", "code_analysis.completed", on_message)
        await bus.publish(make_message("code_analysis.completed"))

        await wait_for(lambda: len(received) == 1)
        assert received[0].content == {"ok": True}
        assert received[0].sender == "agent-b"

    async def test_multiple_subscribers_all_receive(self, bus: AgentMessageBus) -> None:
        got_a: list[AgentMessage] = []
        got_b: list[AgentMessage] = []
        await bus.subscribe("a", "chan", lambda m: got_a.append(m))
        await bus.subscribe("b", "chan", lambda m: got_b.append(m))

        await bus.publish(make_message("chan"))
        await wait_for(lambda: got_a and got_b)
        assert len(got_a) == len(got_b) == 1

    async def test_other_channels_not_delivered(self, bus: AgentMessageBus) -> None:
        received: list[AgentMessage] = []
        await bus.subscribe("a", "chan.one", lambda m: received.append(m))

        await bus.publish(make_message("chan.two"))
        await asyncio.sleep(0.15)
        assert received == []

    async def test_wildcard_channel_not_matched(self, bus: AgentMessageBus) -> None:
        # 文档宣称支持 "code_analysis.*" 通配，但实现只做精确匹配——
        # 该测试锁定实际行为，防止无意中变更。
        received: list[AgentMessage] = []
        await bus.subscribe("a", "code_analysis.*", lambda m: received.append(m))

        await bus.publish(make_message("code_analysis.done"))
        await asyncio.sleep(0.15)
        assert received == []

    async def test_filter_fn_excludes_messages(self, bus: AgentMessageBus) -> None:
        received: list[AgentMessage] = []
        await bus.subscribe(
            "a",
            "chan",
            lambda m: received.append(m),
            filter_fn=lambda m: m.content.get("level") == "high",
        )

        await bus.publish(make_message("chan", content={"level": "low"}))
        await asyncio.sleep(0.15)
        assert received == []

        await bus.publish(make_message("chan", content={"level": "high"}))
        await wait_for(lambda: len(received) == 1)

    async def test_subscriber_error_does_not_block_others(self, bus: AgentMessageBus) -> None:
        got_broken: list[AgentMessage] = []
        got_healthy: list[AgentMessage] = []

        async def broken(msg: AgentMessage) -> None:
            got_broken.append(msg)
            raise RuntimeError("subscriber exploded")

        await bus.subscribe("broken", "chan", broken)
        await bus.subscribe("healthy", "chan", lambda m: got_healthy.append(m))

        await bus.publish(make_message("chan"))
        await wait_for(lambda: got_healthy)
        assert len(got_broken) == 1

    async def test_unsubscribe_stops_delivery(self, bus: AgentMessageBus) -> None:
        received: list[AgentMessage] = []
        await bus.subscribe("a", "chan", lambda m: received.append(m))
        await bus.unsubscribe("a", "chan")

        await bus.publish(make_message("chan"))
        await asyncio.sleep(0.15)
        assert received == []
        assert bus.get_channel_subscriber_count("chan") == 0

    async def test_subscription_introspection(self, bus: AgentMessageBus) -> None:
        await bus.subscribe("a", "chan-1", lambda m: None)
        await bus.subscribe("a", "chan-2", lambda m: None)
        await bus.subscribe("b", "chan-1", lambda m: None)

        assert set(bus.get_subscriptions("a")) == {"chan-1", "chan-2"}
        assert bus.get_subscriptions("nobody") == []
        assert bus.get_channel_subscriber_count("chan-1") == 2
        assert bus.get_channel_subscriber_count("chan-9") == 0


class TestRequestResponse:
    async def test_request_roundtrip(self, bus: AgentMessageBus) -> None:
        async def responder(msg: AgentMessage) -> None:
            reply = make_message(
                "agent-c.reply",
                sender="agent-a",
                content={"answer": 42},
                correlation_id=msg.correlation_id,
            )
            await bus.publish(reply)

        await bus.subscribe("agent-a", "skill.execute", responder)
        response = await bus.request(
            sender="agent-c",
            channel="skill.execute",
            content={"skill": "web-search"},
            timeout=2.0,
        )

        assert response is not None
        assert response.content == {"answer": 42}

    async def test_request_timeout_returns_none(self, bus: AgentMessageBus) -> None:
        response = await bus.request(
            sender="agent-c",
            channel="nobody.listening",
            content={"q": 1},
            timeout=0.1,
        )
        assert response is None
        # 超时后订阅与 pending request 都被清理
        assert bus.get_channel_subscriber_count("agent-c.reply") == 0

    async def test_broadcast_reaches_subscribers(self, bus: AgentMessageBus) -> None:
        received: list[AgentMessage] = []
        await bus.subscribe("a", "announcements", lambda m: received.append(m))

        await bus.broadcast("ops", "announcements", {"text": "hello"}, priority=MessagePriority.HIGH)
        await wait_for(lambda: received)

        assert received[0].message_type == "broadcast"
        assert received[0].priority == MessagePriority.HIGH


class TestLifecycle:
    async def test_start_is_idempotent(self, bus: AgentMessageBus) -> None:
        worker_before = bus._worker_task
        await bus.start()
        assert bus._worker_task is worker_before

    async def test_stop_cancels_worker(self) -> None:
        b = AgentMessageBus()
        await b.start()
        worker = b._worker_task
        assert worker is not None
        await b.stop()
        assert worker.cancelled() or worker.done()


class TestMessageBusRegistry:
    async def test_get_or_create_is_singleton(self) -> None:
        registry = MessageBusRegistry()
        bus1 = await registry.get_or_create("default")
        bus2 = await registry.get_or_create("default")
        assert bus1 is bus2
        await registry.close_all()

    async def test_register_and_get(self) -> None:
        registry = MessageBusRegistry()
        custom = AgentMessageBus()
        await registry.register("analysis", custom)
        assert await registry.get("analysis") is custom
        assert await registry.get("missing") is None
        await registry.close_all()

    async def test_close_stops_and_removes(self) -> None:
        registry = MessageBusRegistry()
        bus = await registry.get_or_create("default")
        await registry.close("default")
        assert await registry.get("default") is None
        assert bus._worker_task.cancelled() or bus._worker_task.done()

    async def test_close_all(self) -> None:
        registry = MessageBusRegistry()
        await registry.get_or_create("a")
        await registry.get_or_create("b")
        await registry.close_all()
        assert await registry.get("a") is None
        assert await registry.get("b") is None
