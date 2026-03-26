"""Synchronization engine for bilingual documents."""

from __future__ import annotations

import hashlib
import json
import shlex
import subprocess
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Union

import yaml

from resolveagent.docsync.glossary import GlossaryManager
from resolveagent.docsync.models import (
    ReviewItem,
    ReviewQueue,
    SyncConfig,
    SyncPair,
    SyncSnapshot,
    SyncStateFile,
    TranslationMemoryEntry,
    TranslationMemoryFile,
    TranslatorSettings,
)
from resolveagent.docsync.processors import contains_cjk, get_processor


class SyncError(RuntimeError):
    """Base error for sync failures."""


class MissingTranslationError(SyncError):
    """Raised when no translation backend can translate a segment."""


@dataclass
class SyncOutcome:
    """Human-readable result for one sync pair."""

    pair_id: str
    status: str
    direction: Optional[str] = None
    details: str = ""


class TranslationMemory:
    """Exact-match translation memory persisted as YAML."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self.data = self._load()

    def _load(self) -> TranslationMemoryFile:
        if not self.path.exists():
            return TranslationMemoryFile()
        with self.path.open("r", encoding="utf-8") as handle:
            raw = yaml.safe_load(handle) or {}
        return TranslationMemoryFile.model_validate(raw)

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = self.data.model_dump(mode="json", exclude_none=True)
        with self.path.open("w", encoding="utf-8") as handle:
            yaml.safe_dump(payload, handle, allow_unicode=True, sort_keys=False)

    def lookup(self, *, source_lang: str, target_lang: str, source: str) -> Optional[str]:
        for entry in self.data.entries:
            if (
                entry.source_lang == source_lang
                and entry.target_lang == target_lang
                and entry.source == source
            ):
                return entry.target
        return None

    def remember(self, *, source_lang: str, target_lang: str, source: str, target: str) -> None:
        for index, entry in enumerate(self.data.entries):
            if (
                entry.source_lang == source_lang
                and entry.target_lang == target_lang
                and entry.source == source
            ):
                self.data.entries[index] = TranslationMemoryEntry(
                    source_lang=source_lang,
                    target_lang=target_lang,
                    source=source,
                    target=target,
                )
                self.save()
                return
        self.data.entries.append(
            TranslationMemoryEntry(
                source_lang=source_lang,
                target_lang=target_lang,
                source=source,
                target=target,
            )
        )
        self.save()


class TranslationPipeline:
    """Translation backend composed from memory, glossary, and optional command."""

    def __init__(
        self,
        *,
        settings: TranslatorSettings,
        glossary: GlossaryManager,
        memory: TranslationMemory,
    ) -> None:
        self.settings = settings
        self.glossary = glossary
        self.memory = memory

    def translate(
        self,
        *,
        text: str,
        source_lang: str,
        target_lang: str,
        pair_id: str,
        file_type: str,
    ) -> str:
        if not text.strip():
            return text
        memory_hit = self.memory.lookup(
            source_lang=source_lang,
            target_lang=target_lang,
            source=text,
        )
        if memory_hit is not None:
            return self.glossary.apply(
                source_text=text,
                translated_text=memory_hit,
                source_lang=source_lang,
                target_lang=target_lang,
            )
        if self.settings.kind == "command" and self.settings.command:
            translated = self._run_command(
                text=text,
                source_lang=source_lang,
                target_lang=target_lang,
                pair_id=pair_id,
                file_type=file_type,
            )
            translated = self.glossary.apply(
                source_text=text,
                translated_text=translated,
                source_lang=source_lang,
                target_lang=target_lang,
            )
            self.memory.remember(
                source_lang=source_lang,
                target_lang=target_lang,
                source=text,
                target=translated,
            )
            return translated
        msg = (
            f"No translation available for pair `{pair_id}` segment. "
            "Configure `defaults.translator.command` or pre-seed translation memory."
        )
        raise MissingTranslationError(msg)

    def _run_command(
        self,
        *,
        text: str,
        source_lang: str,
        target_lang: str,
        pair_id: str,
        file_type: str,
    ) -> str:
        payload = {
            "source_text": text,
            "source_lang": source_lang,
            "target_lang": target_lang,
            "pair_id": pair_id,
            "file_type": file_type,
        }
        process = subprocess.run(
            shlex.split(self.settings.command),
            input=json.dumps(payload, ensure_ascii=False),
            text=True,
            capture_output=True,
            timeout=self.settings.timeout_seconds,
            check=False,
        )
        if process.returncode != 0:
            msg = process.stderr.strip() or process.stdout.strip() or "translator command failed"
            raise SyncError(msg)
        stdout = process.stdout.strip()
        if not stdout:
            raise SyncError("translator command returned empty output")
        if stdout.startswith("{"):
            parsed = json.loads(stdout)
            translation = parsed.get("translation", "")
            if not isinstance(translation, str) or not translation.strip():
                raise SyncError("translator JSON output must contain non-empty `translation`")
            return translation
        return stdout


class SyncEngine:
    """Coordinates config loading, change detection, syncing, and review queues."""

    def __init__(self, config_path: Path, workspace_root: Optional[Path] = None) -> None:
        self.config_path = config_path
        self.workspace_root = workspace_root or config_path.parent.parent.parent
        self.config = self._load_config()
        self.glossary = GlossaryManager(self._resolve(self.config.defaults.glossary_file))
        self.memory = TranslationMemory(self._resolve(self.config.defaults.memory_file))
        self.state_path = self._resolve(self.config.defaults.state_file)
        self.review_path = self._resolve(self.config.defaults.review_file)
        self.state = self._load_state()
        self.review_queue = self._load_review_queue()
        self.translator = TranslationPipeline(
            settings=self.config.defaults.translator,
            glossary=self.glossary,
            memory=self.memory,
        )

    def sync(self, pair_id: Optional[str] = None) -> list[SyncOutcome]:
        outcomes: list[SyncOutcome] = []
        for pair in self._selected_pairs(pair_id):
            outcomes.append(self._sync_pair(pair))
        return outcomes

    def proofread(self, pair_id: Optional[str] = None) -> list[ReviewItem]:
        issues: list[ReviewItem] = []
        for pair in self._selected_pairs(pair_id):
            issues.extend(self._proofread_pair(pair))
        self._replace_proofread_items(issues, pair_id)
        self._save_review_queue()
        return issues

    def watch(self, pair_id: Optional[str] = None, interval_seconds: Optional[float] = None) -> None:
        interval = interval_seconds or self.config.defaults.poll_interval_seconds
        while True:
            self.sync(pair_id)
            self.proofread(pair_id)
            time.sleep(interval)

    def list_reviews(self, unresolved_only: bool = True) -> list[ReviewItem]:
        if unresolved_only:
            return [item for item in self.review_queue.items if not item.resolved]
        return list(self.review_queue.items)

    def resolve_review(self, review_id: str) -> bool:
        updated = False
        for item in self.review_queue.items:
            if item.id == review_id:
                item.resolved = True
                updated = True
        if updated:
            self._save_review_queue()
        return updated

    def add_glossary_term(
        self,
        *,
        zh: str,
        en: str,
        category: str = "",
        notes: str = "",
    ) -> None:
        self.glossary.add_term(zh=zh, en=en, category=category, notes=notes)

    def _selected_pairs(self, pair_id: Optional[str]) -> list[SyncPair]:
        if pair_id is None:
            return list(self.config.pairs)
        selected = [pair for pair in self.config.pairs if pair.id == pair_id]
        if not selected:
            msg = f"Unknown sync pair: {pair_id}"
            raise SyncError(msg)
        return selected

    def _sync_pair(self, pair: SyncPair) -> SyncOutcome:
        source_path = self._resolve(pair.source)
        target_path = self._resolve(pair.target)
        source_text = self._read_text(source_path)
        target_text = self._read_text(target_path)
        source_hash = _hash_text(source_text)
        target_hash = _hash_text(target_text)
        snapshot = self.state.snapshots.get(pair.id)
        direction = self._decide_direction(
            pair,
            source_hash,
            target_hash,
            snapshot,
            source_text,
            target_text,
        )
        if direction is None:
            return SyncOutcome(pair_id=pair.id, status="noop", details="no effective change")
        if direction == "conflict":
            return SyncOutcome(pair_id=pair.id, status="conflict", details="both sides changed")
        if direction == "bootstrap":
            self._bootstrap_pair(pair=pair, source_text=source_text, target_text=target_text)
        elif direction == "source_to_target":
            translated = self._translate_document(
                pair=pair,
                source_text=source_text,
                source_lang=pair.source_lang,
                target_lang=pair.target_lang,
            )
            self._write_text(target_path, translated)
        else:
            translated = self._translate_document(
                pair=pair,
                source_text=target_text,
                source_lang=pair.target_lang,
                target_lang=pair.source_lang,
            )
            self._write_text(source_path, translated)
        new_source_text = self._read_text(source_path)
        new_target_text = self._read_text(target_path)
        self.state.snapshots[pair.id] = SyncSnapshot(
            source_hash=_hash_text(new_source_text),
            target_hash=_hash_text(new_target_text),
            last_direction=direction,
            last_synced_at=_now_iso(),
        )
        self._save_state()
        if direction == "bootstrap":
            return SyncOutcome(
                pair_id=pair.id,
                status="bootstrapped",
                details="baseline established from existing bilingual content",
            )
        return SyncOutcome(pair_id=pair.id, status="synced", direction=direction)

    def _translate_document(
        self,
        *,
        pair: SyncPair,
        source_text: str,
        source_lang: str,
        target_lang: str,
    ) -> str:
        processor = get_processor(pair.file_type)
        return processor.translate(
            source_text,
            lambda segment: self.translator.translate(
                text=segment,
                source_lang=source_lang,
                target_lang=target_lang,
                pair_id=pair.id,
                file_type=pair.file_type,
            ),
        )

    def _bootstrap_pair(self, *, pair: SyncPair, source_text: str, target_text: str) -> None:
        processor = get_processor(pair.file_type)
        source_segments = processor.segments(source_text)
        target_segments = processor.segments(target_text)
        if len(source_segments) != len(target_segments):
            msg = (
                f"Unable to bootstrap pair `{pair.id}` because the bilingual segment counts diverge "
                f"({len(source_segments)} vs {len(target_segments)})."
            )
            raise SyncError(msg)
        for source_segment, target_segment in zip(source_segments, target_segments):
            if not source_segment.strip() or not target_segment.strip():
                continue
            self.memory.remember(
                source_lang=pair.source_lang,
                target_lang=pair.target_lang,
                source=source_segment,
                target=target_segment,
            )
            self.memory.remember(
                source_lang=pair.target_lang,
                target_lang=pair.source_lang,
                source=target_segment,
                target=source_segment,
            )
        self.memory.remember(
            source_lang=pair.source_lang,
            target_lang=pair.target_lang,
            source=source_text,
            target=target_text,
        )
        self.memory.remember(
            source_lang=pair.target_lang,
            target_lang=pair.source_lang,
            source=target_text,
            target=source_text,
        )

    def _can_bootstrap(self, *, pair: SyncPair, source_text: str, target_text: str) -> bool:
        if not source_text.strip() or not target_text.strip():
            return False
        processor = get_processor(pair.file_type)
        if processor.structure_signature(source_text) != processor.structure_signature(target_text):
            return False
        source_segments = processor.segments(source_text)
        target_segments = processor.segments(target_text)
        if not source_segments or len(source_segments) != len(target_segments):
            return False
        return self._looks_like_expected_language(pair.source_lang, processor.extract_text(source_text)) and self._looks_like_expected_language(pair.target_lang, processor.extract_text(target_text))

    def _looks_like_expected_language(self, lang: str, text: str) -> bool:
        if not text.strip():
            return False
        has_cjk = contains_cjk(text)
        if lang == "en":
            return not has_cjk
        if lang == "zh":
            return has_cjk
        return True

    def _proofread_pair(self, pair: SyncPair) -> list[ReviewItem]:
        processor = get_processor(pair.file_type)
        source_text = self._read_text(self._resolve(pair.source))
        target_text = self._read_text(self._resolve(pair.target))
        items: list[ReviewItem] = []
        if pair.proofread.structure:
            if processor.structure_signature(source_text) != processor.structure_signature(target_text):
                items.append(
                    self._review_item(
                        pair_id=pair.id,
                        severity="error",
                        issue="源文稿与目标文稿结构签名不一致，请人工复核章节、表格或代码块是否漂移",
                        direction="proofread",
                    )
                )
        if pair.proofread.untranslated_source_chars:
            extracted = processor.extract_text(target_text)
            if pair.target_lang == "en" and contains_cjk(extracted):
                items.append(
                    self._review_item(
                        pair_id=pair.id,
                        severity="warning",
                        issue="英文目标文稿中仍检测到中文字符，可能存在未翻译内容",
                        direction="proofread",
                        target_excerpt=_excerpt(extracted),
                    )
                )
        if pair.proofread.terminology:
            for issue in self.glossary.terminology_issues(
                source_text=source_text,
                target_text=target_text,
                source_lang=pair.source_lang,
                target_lang=pair.target_lang,
            ):
                items.append(
                    self._review_item(
                        pair_id=pair.id,
                        severity="warning",
                        issue=issue,
                        direction="proofread",
                    )
                )
        return items

    def _replace_proofread_items(self, items: list[ReviewItem], pair_id: Optional[str]) -> None:
        selected_ids = {pair.id for pair in self._selected_pairs(pair_id)}
        retained = [
            item
            for item in self.review_queue.items
            if item.direction != "proofread" or item.pair_id not in selected_ids or item.resolved
        ]
        retained.extend(items)
        self.review_queue = ReviewQueue(items=retained)

    def _decide_direction(
        self,
        pair: SyncPair,
        source_hash: str,
        target_hash: str,
        snapshot: Optional[SyncSnapshot],
        source_text: str,
        target_text: str,
    ) -> Optional[str]:
        if snapshot is None:
            if not source_text.strip() and not target_text.strip():
                return None
            if source_text.strip() and not target_text.strip():
                return "source_to_target"
            if target_text.strip() and not source_text.strip() and pair.sync_mode == "bidirectional":
                return "target_to_source"
            if self._can_bootstrap(pair=pair, source_text=source_text, target_text=target_text):
                return "bootstrap"
            return "source_to_target"
        source_changed = source_hash != snapshot.source_hash
        target_changed = target_hash != snapshot.target_hash
        if not source_changed and not target_changed:
            return None
        if source_changed and target_changed:
            self.review_queue.items.append(
                self._review_item(
                    pair_id=pair.id,
                    severity="error",
                    issue="检测到双向同时修改，已停止自动覆盖，请人工合并冲突",
                    direction="source_to_target",
                )
            )
            self._save_review_queue()
            return "conflict"
        if source_changed:
            return "source_to_target"
        if target_changed and pair.sync_mode == "bidirectional":
            return "target_to_source"
        if target_changed:
            self.review_queue.items.append(
                self._review_item(
                    pair_id=pair.id,
                    severity="warning",
                    issue="目标文稿已变更，但该文档对被配置为单向同步",
                    direction="target_to_source",
                )
            )
            self._save_review_queue()
        return None

    def _review_item(
        self,
        *,
        pair_id: str,
        severity: str,
        issue: str,
        direction: str,
        source_excerpt: str = "",
        target_excerpt: str = "",
    ) -> ReviewItem:
        base = f"{pair_id}:{severity}:{issue}:{direction}:{source_excerpt}:{target_excerpt}"
        review_id = hashlib.sha1(base.encode("utf-8")).hexdigest()[:12]
        return ReviewItem(
            id=review_id,
            pair_id=pair_id,
            severity=severity,
            issue=issue,
            direction=direction,
            source_excerpt=source_excerpt,
            target_excerpt=target_excerpt,
            created_at=_now_iso(),
        )

    def _load_config(self) -> SyncConfig:
        with self.config_path.open("r", encoding="utf-8") as handle:
            raw = yaml.safe_load(handle) or {}
        return SyncConfig.model_validate(raw)

    def _load_state(self) -> SyncStateFile:
        if not self.state_path.exists():
            return SyncStateFile()
        with self.state_path.open("r", encoding="utf-8") as handle:
            return SyncStateFile.model_validate(json.load(handle))

    def _save_state(self) -> None:
        self.state_path.parent.mkdir(parents=True, exist_ok=True)
        with self.state_path.open("w", encoding="utf-8") as handle:
            json.dump(self.state.model_dump(mode="json"), handle, ensure_ascii=False, indent=2)

    def _load_review_queue(self) -> ReviewQueue:
        if not self.review_path.exists():
            return ReviewQueue()
        with self.review_path.open("r", encoding="utf-8") as handle:
            raw = yaml.safe_load(handle) or {}
        return ReviewQueue.model_validate(raw)

    def _save_review_queue(self) -> None:
        self.review_path.parent.mkdir(parents=True, exist_ok=True)
        payload = self.review_queue.model_dump(mode="json", exclude_none=True)
        with self.review_path.open("w", encoding="utf-8") as handle:
            yaml.safe_dump(payload, handle, allow_unicode=True, sort_keys=False)

    def _resolve(self, path_like: Union[str, Path]) -> Path:
        path = Path(path_like)
        if path.is_absolute():
            return path
        return self.workspace_root / path

    def _read_text(self, path: Path) -> str:
        if not path.exists():
            return ""
        return path.read_text(encoding="utf-8")

    def _write_text(self, path: Path, content: str) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")


def _hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _excerpt(text: str, limit: int = 120) -> str:
    compact = " ".join(text.split())
    if len(compact) <= limit:
        return compact
    return compact[: limit - 3] + "..."
