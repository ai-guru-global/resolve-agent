"""Unit tests for BaseAgent reply wiring (agent/base.py)."""

from __future__ import annotations

from resolveagent.agent.base import BaseAgent
from resolveagent.llm.provider import ChatMessage, ChatResponse


class FakeProvider:
    default_model = "fake-model"

    def __init__(self) -> None:
        self.calls: list[list[ChatMessage]] = []

    async def chat(self, messages: list[ChatMessage], model: str | None = None, **kwargs: object) -> ChatResponse:
        self.calls.append(messages)
        return ChatResponse(content=f"llm-reply:{messages[-1].content}", model=model or self.default_model)


class TestBaseAgentReply:
    async def test_without_provider_labels_echo_explicitly(self) -> None:
        agent = BaseAgent(name="diag")
        reply = await agent.reply({"role": "user", "content": "hello"})

        assert reply["role"] == "assistant"
        assert "[echo: no LLM provider configured]" in reply["content"]
        assert "hello" in reply["content"]

    async def test_with_provider_returns_real_completion(self) -> None:
        provider = FakeProvider()
        agent = BaseAgent(name="diag", model_id="fake-model", llm_provider=provider)

        reply = await agent.reply({"role": "user", "content": "check pods"})

        assert reply == {"role": "assistant", "content": "llm-reply:check pods"}
        assert provider.calls == [[ChatMessage(role="user", content="check pods")]]

    async def test_missing_content_is_tolerated(self) -> None:
        agent = BaseAgent(name="diag")
        reply = await agent.reply({})
        assert reply["content"].startswith("[diag] [echo: no LLM provider configured]")

    def test_mega_agent_preserves_injected_provider(self) -> None:
        from resolveagent.agent.mega import MegaAgent

        provider = FakeProvider()
        mega = MegaAgent(name="mega", llm_provider=provider)
        assert mega._llm_provider is provider

    def test_mega_agent_defaults_to_none_for_lazy_creation(self) -> None:
        from resolveagent.agent.mega import MegaAgent

        mega = MegaAgent(name="mega")
        assert mega._llm_provider is None
