"""Unit tests for LLM provider contract and model registry (llm/).

Covers the pure-logic layer: pydantic models, the abstract provider contract,
and the ModelRegistry factory dispatch. No network is touched.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import pytest
from pydantic import ValidationError

from resolveagent.llm.model_config import ModelConfig, ModelRegistry
from resolveagent.llm.openai_compat import OpenAICompatProvider
from resolveagent.llm.provider import ChatMessage, ChatResponse, LLMProvider
from resolveagent.llm.qwen import QwenProvider
from resolveagent.llm.wenxin import WenxinProvider
from resolveagent.llm.zhipu import ZhipuProvider

if TYPE_CHECKING:
    from collections.abc import AsyncIterator


class TestChatModels:
    def test_chat_message_fields(self) -> None:
        msg = ChatMessage(role="user", content="hello")
        assert msg.role == "user"
        assert msg.content == "hello"

    def test_chat_message_requires_both_fields(self) -> None:
        with pytest.raises(ValidationError):
            ChatMessage(role="user")  # type: ignore[call-arg]

    def test_chat_response_defaults(self) -> None:
        resp = ChatResponse(content="ok", model="m-1")
        assert resp.usage == {}
        assert resp.finish_reason == "stop"


class _RecordingProvider(LLMProvider):
    """Minimal concrete provider used to verify the abstract contract."""

    default_model = "rec-1"

    async def chat(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> ChatResponse:
        return ChatResponse(content=f"echo:{messages[-1].content}", model=model or self.default_model)

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        yield "chunk"


class TestProviderContract:
    def test_abstract_base_cannot_instantiate(self) -> None:
        with pytest.raises(TypeError):
            LLMProvider()  # type: ignore[abstract]

    async def test_concrete_subclass_roundtrip(self) -> None:
        provider = _RecordingProvider()
        resp = await provider.chat([ChatMessage(role="user", content="hi")])
        assert resp.content == "echo:hi"
        assert resp.model == "rec-1"

    async def test_streaming_yields(self) -> None:
        provider = _RecordingProvider()
        chunks = [c async for c in provider.chat_stream([ChatMessage(role="user", content="hi")])]
        assert chunks == ["chunk"]


class TestModelConfigDefaults:
    def test_defaults(self) -> None:
        config = ModelConfig(id="m1", provider="qwen", model_name="qwen-plus")
        assert config.api_key == ""
        assert config.base_url == ""
        assert config.default_temperature == 0.7
        assert config.max_tokens == 4096
        assert config.extra == {}


class TestModelRegistry:
    def test_register_get_list(self) -> None:
        registry = ModelRegistry()
        registry.register(ModelConfig(id="a", provider="qwen", model_name="qwen-plus"))
        registry.register(ModelConfig(id="b", provider="zhipu", model_name="glm-4"))

        assert registry.get("a").model_name == "qwen-plus"
        assert registry.get("missing") is None
        assert {c.id for c in registry.list_models()} == {"a", "b"}

        # 同 id 重复注册为覆盖
        registry.register(ModelConfig(id="a", provider="qwen", model_name="qwen-max"))
        assert registry.get("a").model_name == "qwen-max"

    def test_get_unknown_provider_raises(self) -> None:
        registry = ModelRegistry()
        with pytest.raises(ValueError, match="not found"):
            registry.get_provider("missing")

    def test_factory_dispatch(self) -> None:
        registry = ModelRegistry()
        cases = {
            "qwen": QwenProvider,
            "wenxin": WenxinProvider,
            "zhipu": ZhipuProvider,
        }
        for provider_name, expected_cls in cases.items():
            registry.register(
                ModelConfig(
                    id=f"m-{provider_name}",
                    provider=provider_name,
                    model_name="x",
                    api_key="k",
                    base_url="http://unit.test",
                )
            )
            provider = registry.get_provider(f"m-{provider_name}")
            assert isinstance(provider, expected_cls)

    def test_factory_kimi_and_mimo_defaults(self) -> None:
        registry = ModelRegistry()
        registry.register(ModelConfig(id="kimi", provider="kimi", model_name="kimi-k2", api_key="kk"))
        registry.register(ModelConfig(id="mimo", provider="mimo", model_name="mimo-v", api_key="mm"))

        kimi = registry.get_provider("kimi")
        assert isinstance(kimi, OpenAICompatProvider)
        assert kimi.base_url == "https://api.moonshot.cn/v1"
        assert kimi.default_model == "kimi-k2"

        mimo = registry.get_provider("mimo")
        assert isinstance(mimo, OpenAICompatProvider)
        assert mimo.base_url == "https://token-plan-cn.xiaomimimo.com/v1"
        assert mimo.default_model == "mimo-v"

    def test_factory_unknown_provider_falls_back_to_openai_compat(self) -> None:
        registry = ModelRegistry()
        registry.register(ModelConfig(id="custom", provider="vllm", model_name="my-model", api_key="k", base_url="http://vLLM/v1"))
        provider = registry.get_provider("custom")
        assert isinstance(provider, OpenAICompatProvider)
        assert provider.base_url == "http://vLLM/v1"
        assert provider.default_model == "my-model"


class TestOpenAICompatInit:
    def test_base_url_trailing_slash_stripped(self) -> None:
        provider = OpenAICompatProvider(api_key="k", base_url="http://localhost:8000/v1/", default_model="m")
        assert provider.base_url == "http://localhost:8000/v1"

    def test_default_model_falls_back_to_class_default(self) -> None:
        provider = OpenAICompatProvider(api_key="k", base_url="http://localhost:8000/v1")
        assert provider.default_model == OpenAICompatProvider.DEFAULT_MODEL

    def test_local_base_url_allows_empty_key(self) -> None:
        provider = OpenAICompatProvider(api_key="", base_url="http://localhost:11434/v1")
        assert provider.api_key == ""
