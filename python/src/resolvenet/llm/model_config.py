"""LLM model configuration and registry."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class ModelConfig(BaseModel):
    """Configuration for an LLM model."""

    id: str
    provider: str  # "qwen", "wenxin", "zhipu", "openai-compat"
    model_name: str
    api_key: str = ""
    base_url: str = ""
    default_temperature: float = 0.7
    max_tokens: int = 4096
    extra: dict[str, Any] = {}


class ModelRegistry:
    """Registry of configured LLM models."""

    def __init__(self) -> None:
        self._models: dict[str, ModelConfig] = {}

    def register(self, config: ModelConfig) -> None:
        """Register a model configuration."""
        self._models[config.id] = config

    def get(self, model_id: str) -> ModelConfig | None:
        """Get a model configuration by ID."""
        return self._models.get(model_id)

    def list_models(self) -> list[ModelConfig]:
        """List all registered models."""
        return list(self._models.values())

    def get_provider(self, model_id: str) -> Any:
        """Get an LLM provider instance for the given model.

        Args:
            model_id: Registered model ID.

        Returns:
            Configured LLMProvider instance.
        """
        config = self.get(model_id)
        if not config:
            raise ValueError(f"Model {model_id} not found in registry")

        if config.provider == "qwen":
            from resolvenet.llm.qwen import QwenProvider
            return QwenProvider(api_key=config.api_key, base_url=config.base_url)
        elif config.provider == "wenxin":
            from resolvenet.llm.wenxin import WenxinProvider
            return WenxinProvider(api_key=config.api_key)
        elif config.provider == "zhipu":
            from resolvenet.llm.zhipu import ZhipuProvider
            return ZhipuProvider(api_key=config.api_key)
        else:
            from resolvenet.llm.openai_compat import OpenAICompatProvider
            return OpenAICompatProvider(
                api_key=config.api_key,
                base_url=config.base_url,
                default_model=config.model_name,
            )
