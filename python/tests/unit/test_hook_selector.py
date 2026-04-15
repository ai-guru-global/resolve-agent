"""Unit tests for the HookSelectorAdapter and InMemoryHookClient."""

import pytest

from resolveagent.hooks.memory_client import InMemoryHookClient
from resolveagent.hooks.models import HookContext, HookResult
from resolveagent.hooks.runner import HookRunner
from resolveagent.selector.hook_selector import HookSelectorAdapter
from resolveagent.selector.protocol import SelectorProtocol
from resolveagent.selector.selector import RouteDecision


# ==================== InMemoryHookClient Tests ====================


class TestInMemoryHookClient:
    """Tests for the in-memory hook store."""

    @pytest.fixture
    def client(self):
        return InMemoryHookClient()

    @pytest.mark.asyncio
    async def test_create_and_get(self, client):
        """Test creating and retrieving a hook."""
        result = await client.create({
            "name": "test-hook",
            "hook_type": "pre",
            "trigger_point": "agent.execute",
            "handler_type": "intent_analysis",
            "enabled": True,
        })
        assert result is not None
        hook_id = result["id"]

        hook = await client.get(hook_id)
        assert hook is not None
        assert hook.name == "test-hook"
        assert hook.hook_type == "pre"
        assert hook.handler_type == "intent_analysis"
        assert hook.enabled is True

    @pytest.mark.asyncio
    async def test_list_empty(self, client):
        """Test listing hooks on empty store."""
        hooks = await client.list()
        assert hooks == []

    @pytest.mark.asyncio
    async def test_list_after_create(self, client):
        """Test listing hooks after creation."""
        await client.create({"name": "h1", "hook_type": "pre", "trigger_point": "a"})
        await client.create({"name": "h2", "hook_type": "post", "trigger_point": "b"})
        hooks = await client.list()
        assert len(hooks) == 2

    @pytest.mark.asyncio
    async def test_update(self, client):
        """Test updating a hook."""
        result = await client.create({"name": "original", "hook_type": "pre", "trigger_point": "x"})
        hook_id = result["id"]

        await client.update(hook_id, {"name": "updated", "enabled": False})
        hook = await client.get(hook_id)
        assert hook.name == "updated"
        assert hook.enabled is False

    @pytest.mark.asyncio
    async def test_update_nonexistent(self, client):
        """Test updating a nonexistent hook returns None."""
        result = await client.update("no-such-id", {"name": "x"})
        assert result is None

    @pytest.mark.asyncio
    async def test_delete(self, client):
        """Test deleting a hook."""
        result = await client.create({"name": "to-delete", "hook_type": "pre", "trigger_point": "y"})
        hook_id = result["id"]

        deleted = await client.delete(hook_id)
        assert deleted is not None
        assert await client.get(hook_id) is None

    @pytest.mark.asyncio
    async def test_delete_nonexistent(self, client):
        """Test deleting a nonexistent hook returns None."""
        assert await client.delete("no-such-id") is None

    @pytest.mark.asyncio
    async def test_list_executions_empty(self, client):
        """Test listing executions returns empty list."""
        execs = await client.list_executions("any-id")
        assert execs == []

    @pytest.mark.asyncio
    async def test_custom_id(self, client):
        """Test creating a hook with a custom id."""
        await client.create({"id": "custom-id", "name": "custom", "hook_type": "pre", "trigger_point": "z"})
        hook = await client.get("custom-id")
        assert hook is not None
        assert hook.name == "custom"


# ==================== HookSelectorAdapter Tests ====================


class TestHookSelectorAdapter:
    """Tests for the hook-based selector adapter."""

    @pytest.fixture
    def adapter(self):
        return HookSelectorAdapter(strategy="hybrid")

    @pytest.mark.asyncio
    async def test_basic_route(self, adapter):
        """Test that adapter produces a RouteDecision."""
        decision = await adapter.route("search the web for Python tutorials")
        assert isinstance(decision, RouteDecision)
        assert decision.route_type in ("skill", "rag", "direct", "fta", "code_analysis", "workflow")
        assert 0.0 <= decision.confidence <= 1.0

    @pytest.mark.asyncio
    async def test_default_hooks_installed_on_first_route(self, adapter):
        """Test that default hooks are lazily installed."""
        assert adapter._default_hooks_installed is False
        await adapter.route("hello")
        assert adapter._default_hooks_installed is True

        # Calling again should not re-install
        hooks_before = await adapter._client.list()
        await adapter.route("hello again")
        hooks_after = await adapter._client.list()
        assert len(hooks_before) == len(hooks_after)

    @pytest.mark.asyncio
    async def test_strategy_info(self, adapter):
        """Test strategy info for hook adapter."""
        info = adapter.get_strategy_info()
        assert info["strategy"] == "hooks"
        assert info["underlying_strategy"] == "hybrid"

    @pytest.mark.asyncio
    async def test_protocol_conformance(self, adapter):
        """Test that HookSelectorAdapter conforms to SelectorProtocol."""
        assert isinstance(adapter, SelectorProtocol)

    @pytest.mark.asyncio
    async def test_pre_hook_short_circuit(self):
        """Test that a pre-hook can short-circuit with a decision."""
        client = InMemoryHookClient()

        # Create a pre-hook that short-circuits
        await client.create({
            "name": "force-direct",
            "hook_type": "pre",
            "trigger_point": "selector.route",
            "handler_type": "force_direct",
            "execution_order": 0,
            "enabled": True,
        })

        adapter = HookSelectorAdapter(hook_client=client, strategy="hybrid")
        adapter._default_hooks_installed = True  # Skip default hook installation

        # Register a custom handler that short-circuits
        async def force_direct_handler(ctx: HookContext) -> HookResult:
            return HookResult(
                success=True,
                skip_remaining=True,
                modified_data={
                    "route_decision": {
                        "route_type": "direct",
                        "confidence": 1.0,
                        "reasoning": "forced by pre-hook",
                    },
                },
            )

        adapter._runner.register_handler("force_direct", force_direct_handler)

        decision = await adapter.route("anything goes here")
        assert decision.route_type == "direct"
        assert decision.confidence == 1.0
        assert "forced by pre-hook" in decision.reasoning

    @pytest.mark.asyncio
    async def test_custom_hook_client(self):
        """Test using a custom InMemoryHookClient."""
        client = InMemoryHookClient()
        adapter = HookSelectorAdapter(hook_client=client, strategy="rule")
        decision = await adapter.route("diagnose the error")
        assert isinstance(decision, RouteDecision)

    @pytest.mark.asyncio
    async def test_code_analysis_through_hooks(self, adapter):
        """Test code analysis routing through hook pipeline."""
        decision = await adapter.route(
            '```python\ndef vulnerable(): exec(input())```\nreview this code'
        )
        assert decision.route_type == "code_analysis"
