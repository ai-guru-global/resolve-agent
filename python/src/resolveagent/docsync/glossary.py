"""Glossary management and terminology checks."""

from __future__ import annotations

from typing import TYPE_CHECKING

import yaml

from resolveagent.docsync.models import GlossaryFile, GlossaryTerm

if TYPE_CHECKING:
    from pathlib import Path


class GlossaryManager:
    """Loads, updates, and validates bilingual terminology."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.data = self._load()

    def _load(self) -> GlossaryFile:
        if not self.path.exists():
            return GlossaryFile()
        with self.path.open("r", encoding="utf-8") as handle:
            raw = yaml.safe_load(handle) or {}
        return GlossaryFile.model_validate(raw)

    def reload(self) -> None:
        self.data = self._load()

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = self.data.model_dump(mode="json", exclude_none=True)
        with self.path.open("w", encoding="utf-8") as handle:
            yaml.safe_dump(payload, handle, allow_unicode=True, sort_keys=False)

    def add_term(
        self,
        *,
        zh: str,
        en: str,
        category: str = "",
        notes: str = "",
    ) -> GlossaryTerm:
        new_term = GlossaryTerm(zh=zh, en=en, category=category, notes=notes)
        remaining = [term for term in self.data.terms if term.zh != zh and term.en != en]
        remaining.append(new_term)
        remaining.sort(key=lambda term: (term.category, term.zh, term.en))
        self.data = GlossaryFile(terms=remaining)
        self.save()
        return new_term

    def apply(
        self,
        *,
        source_text: str,
        translated_text: str,
        source_lang: str,
        target_lang: str,
    ) -> str:
        result = translated_text
        for term in self.data.terms:
            source_term = term.term(source_lang)
            target_term = term.term(target_lang)
            if source_term not in source_text:
                continue
            result = result.replace(source_term, target_term)
            for alias in term.aliases(target_lang):
                result = result.replace(alias, target_term)
        return result

    def terminology_issues(
        self,
        *,
        source_text: str,
        target_text: str,
        source_lang: str,
        target_lang: str,
    ) -> list[str]:
        issues: list[str] = []
        for term in self.data.terms:
            source_term = term.term(source_lang)
            target_term = term.term(target_lang)
            accepted_targets = [target_term, *term.aliases(target_lang)]
            if self._contains_term(source_text, source_term, source_lang) and not any(
                self._contains_term(target_text, candidate, target_lang) for candidate in accepted_targets
            ):
                issues.append(f"术语 `{source_term}` 应统一翻译为 `{target_term}`")
        return issues

    def _contains_term(self, text: str, term: str, lang: str) -> bool:
        if lang == "en":
            return term.casefold() in text.casefold()
        return term in text

    def list_terms(self) -> list[GlossaryTerm]:
        return list(self.data.terms)
