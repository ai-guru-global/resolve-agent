"""Data models for bilingual document synchronization."""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class GlossaryTerm(BaseModel):
    """Canonical bilingual terminology entry."""

    zh: str
    en: str
    category: str = ""
    notes: str = ""
    zh_aliases: list[str] = Field(default_factory=list)
    en_aliases: list[str] = Field(default_factory=list)

    def term(self, lang: str) -> str:
        if lang == "zh":
            return self.zh
        if lang == "en":
            return self.en
        msg = f"Unsupported glossary language: {lang}"
        raise ValueError(msg)

    def aliases(self, lang: str) -> list[str]:
        if lang == "zh":
            return self.zh_aliases
        if lang == "en":
            return self.en_aliases
        msg = f"Unsupported glossary language: {lang}"
        raise ValueError(msg)


class GlossaryFile(BaseModel):
    """Serialized glossary file."""

    terms: list[GlossaryTerm] = Field(default_factory=list)


class TranslationMemoryEntry(BaseModel):
    """Exact-match translation memory entry."""

    source_lang: str
    target_lang: str
    source: str
    target: str


class TranslationMemoryFile(BaseModel):
    """Serialized translation memory."""

    entries: list[TranslationMemoryEntry] = Field(default_factory=list)


class TranslatorSettings(BaseModel):
    """External translation backend configuration."""

    kind: Literal["memory", "command"] = "memory"
    command: str = ""
    timeout_seconds: int = 120

    @field_validator("command", mode="before")
    @classmethod
    def normalize_command(cls, value: object) -> str:
        if value is None:
            return ""
        if isinstance(value, str):
            return value
        msg = "translator command must be a string"
        raise TypeError(msg)


class ProofreadSettings(BaseModel):
    """Proofreading and structural validation switches."""

    terminology: bool = True
    structure: bool = True
    untranslated_source_chars: bool = True


class SyncDefaults(BaseModel):
    """Global sync defaults."""

    glossary_file: str = "docs/i18n/glossary.yaml"
    memory_file: str = "docs/i18n/translation-memory.yaml"
    state_file: str = "docs/i18n/.sync-state.json"
    review_file: str = "docs/i18n/review-queue.yaml"
    poll_interval_seconds: float = 1.0
    translator: TranslatorSettings = Field(default_factory=TranslatorSettings)


class SyncPair(BaseModel):
    """One bilingual document pair."""

    id: str
    source: Path
    target: Path
    file_type: Literal["markdown", "latex", "text"] = "markdown"
    source_lang: str = "zh"
    target_lang: str = "en"
    sync_mode: Literal["bidirectional", "source_to_target"] = "bidirectional"
    proofread: ProofreadSettings = Field(default_factory=ProofreadSettings)


class SyncConfig(BaseModel):
    """Top-level synchronization configuration."""

    defaults: SyncDefaults = Field(default_factory=SyncDefaults)
    pairs: list[SyncPair] = Field(default_factory=list)


class SyncSnapshot(BaseModel):
    """Stored synchronized hashes for conflict detection."""

    source_hash: str
    target_hash: str
    last_direction: Literal["source_to_target", "target_to_source", "bootstrap"]
    last_synced_at: str


class SyncStateFile(BaseModel):
    """Serialized sync state."""

    snapshots: dict[str, SyncSnapshot] = Field(default_factory=dict)


class ReviewItem(BaseModel):
    """Pending proofreading or merge-review task."""

    id: str
    pair_id: str
    severity: Literal["warning", "error"]
    issue: str
    direction: Literal["source_to_target", "target_to_source", "proofread"]
    source_excerpt: str = ""
    target_excerpt: str = ""
    created_at: str
    resolved: bool = False


class ReviewQueue(BaseModel):
    """Serialized manual review queue."""

    items: list[ReviewItem] = Field(default_factory=list)


GlossaryFile.model_rebuild(_types_namespace=globals())
TranslationMemoryFile.model_rebuild(_types_namespace=globals())
SyncConfig.model_rebuild(_types_namespace=globals())
SyncStateFile.model_rebuild(_types_namespace=globals())
ReviewQueue.model_rebuild(_types_namespace=globals())
