"""Unit tests for HookRunner with InMemoryHookClient."""

from __future__ import annotations

import pytest

from resolveagent.hooks.memory_client import InMemoryHookClient
from resolveagent.hooks.models import HookContext, HookResult
from resolveagent.hooks.runner import HookRunner


@pytest.mark.asyncio
async def test_inmemory_hook_client_crud():
    """create/get/update/delete/list round-trips on the in-memory store."""
    client = InMemoryHookClient()

    created = await client.create(
        {"name": "h1", "hook_type": "pre", "trigger_point": "agent.execute"}
    )
    hook_id = created["id"]

    info = await client.get(hook_id)
    assert info is not None
    assert info.name == "h1"

    assert len(await client.list()) == 1

    await client.update(hook_id, {"name": "h1-renamed", "enabled": False})
    info = await client.get(hook_id)
    assert info is not None
    assert info.name == "h1-renamed"
    assert info.enabled is False

    assert await client.delete(hook_id) == {"id": hook_id}
    assert await client.list() == []
    assert await client.delete("missing") is None


@pytest.mark.asyncio
async def test_hook_runner_executes_matching_hooks_in_order():
    """Hooks filter by trigger_point/hook_type and run in execution_order."""
    client = InMemoryHookClient()
    runner = HookRunner(client)
    calls: list[str] = []

    async def handler_a(ctx):
        calls.append("a")
        return HookResult(success=True)

    async def handler_b(ctx):
        calls.append("b")
        return HookResult(success=True)

    runner.register_handler("handler_a", handler_a)
    runner.register_handler("handler_b", handler_b)

    await client.create(
        {
            "name": "second",
            "hook_type": "pre",
            "trigger_point": "agent.execute",
            "handler_type": "handler_b",
            "execution_order": 2,
        }
    )
    await client.create(
        {
            "name": "first",
            "hook_type": "pre",
            "trigger_point": "agent.execute",
            "handler_type": "handler_a",
            "execution_order": 1,
        }
    )
    # Wrong trigger point and hook_type must be filtered out.
    await client.create(
        {
            "name": "post-other",
            "hook_type": "post",
            "trigger_point": "agent.execute",
            "handler_type": "handler_a",
            "execution_order": 0,
        }
    )

    ctx = HookContext(
        trigger_point="agent.execute",
        hook_type="pre",
        target_id="agent-1",
        input_data={"message": "hi"},
    )
    results = await runner.run(ctx)

    assert calls == ["a", "b"]
    assert all(r.success for r in results)
    assert all(r.duration_ms >= 0 for r in results)


@pytest.mark.asyncio
async def test_hook_runner_skip_remaining_short_circuits():
    """skip_remaining=True stops the chain after the current hook."""
    client = InMemoryHookClient()
    runner = HookRunner(client)
    calls: list[str] = []

    async def short_circuit(ctx):
        calls.append("short")
        return HookResult(
            success=True,
            modified_data={"decision": "short-circuited"},
            skip_remaining=True,
        )

    async def never_called(ctx):
        calls.append("never")
        return HookResult(success=True)

    runner.register_handler("short", short_circuit)
    runner.register_handler("never", never_called)

    await client.create(
        {
            "name": "first",
            "hook_type": "pre",
            "trigger_point": "selector.route",
            "handler_type": "short",
            "execution_order": 0,
        }
    )
    await client.create(
        {
            "name": "second",
            "hook_type": "pre",
            "trigger_point": "selector.route",
            "handler_type": "never",
            "execution_order": 1,
        }
    )

    ctx = HookContext(
        trigger_point="selector.route",
        hook_type="pre",
        target_id="agent-1",
        input_data={},
    )
    results = await runner.run(ctx)

    assert calls == ["short"]
    # modified_data of the last successful pre-hook is applied to input_data
    assert ctx.input_data["decision"] == "short-circuited"


@pytest.mark.asyncio
async def test_hook_runner_missing_handler_is_non_fatal():
    """A hook with no registered handler logs a warning and returns success."""
    client = InMemoryHookClient()
    runner = HookRunner(client)

    await client.create(
        {
            "name": "no-handler",
            "hook_type": "pre",
            "trigger_point": "agent.execute",
            "handler_type": "nonexistent",
            "execution_order": 0,
        }
    )

    ctx = HookContext(trigger_point="agent.execute", hook_type="pre", target_id="a")
    results = await runner.run(ctx)

    assert len(results) == 1
    assert results[0].success is True
