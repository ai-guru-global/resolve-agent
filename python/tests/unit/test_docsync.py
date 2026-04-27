"""Unit tests for bilingual document synchronization."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import yaml

from resolveagent.docsync.engine import SyncEngine
from resolveagent.docsync.processors import MarkdownProcessor


def test_markdown_processor_preserves_structure() -> None:
    processor = MarkdownProcessor()
    source = "# 标题\n\n- 列表项\n\n```python\nprint('hi')\n```\n\n| 列1 | 列2 |\n| --- | --- |\n| 值1 | 值2 |\n"
    translated = processor.translate(source, lambda text: f"EN<{text}>")
    assert "# EN<标题>" in translated
    assert "- EN<列表项>" in translated
    assert "print('hi')" in translated
    assert "| EN<列1> | EN<列2> |" in translated


def test_bidirectional_sync_and_conflict_detection(tmp_path: Path) -> None:
    zh_path = tmp_path / "paper-zh.md"
    en_path = tmp_path / "paper.md"
    config_path = tmp_path / "sync-config.yaml"
    glossary_path = tmp_path / "glossary.yaml"
    memory_path = tmp_path / "translation-memory.yaml"

    zh_v1 = "# 标题\n\n单一真相源\n"
    en_v1 = "# Title\n\nSingle Source of Truth\n"
    zh_v2 = "# 标题\n\n控制平面一致性\n"
    en_v2 = "# Title\n\nControl-plane consistency\n"

    zh_path.write_text(zh_v1, encoding="utf-8")
    en_path.write_text("", encoding="utf-8")
    glossary_path.write_text(
        yaml.safe_dump(
            {
                "terms": [
                    {"zh": "单一真相源", "en": "Single Source of Truth"},
                    {"zh": "控制平面一致性", "en": "control-plane consistency"},
                ]
            },
            allow_unicode=True,
            sort_keys=False,
        ),
        encoding="utf-8",
    )
    memory_path.write_text(
        yaml.safe_dump(
            {
                "entries": [
                    {"source_lang": "zh", "target_lang": "en", "source": zh_v1, "target": en_v1},
                    {"source_lang": "en", "target_lang": "zh", "source": en_v1, "target": zh_v1},
                    {"source_lang": "zh", "target_lang": "en", "source": zh_v2, "target": en_v2},
                    {"source_lang": "en", "target_lang": "zh", "source": en_v2, "target": zh_v2},
                    {"source_lang": "zh", "target_lang": "en", "source": "标题", "target": "Title"},
                    {"source_lang": "en", "target_lang": "zh", "source": "Title", "target": "标题"},
                    {"source_lang": "zh", "target_lang": "en", "source": "单一真相源", "target": "Single Source of Truth"},
                    {"source_lang": "en", "target_lang": "zh", "source": "Single Source of Truth", "target": "单一真相源"},
                    {"source_lang": "zh", "target_lang": "en", "source": "控制平面一致性", "target": "Control-plane consistency"},
                    {"source_lang": "en", "target_lang": "zh", "source": "Control-plane consistency", "target": "控制平面一致性"},
                ]
            },
            allow_unicode=True,
            sort_keys=False,
        ),
        encoding="utf-8",
    )
    config_path.write_text(
        yaml.safe_dump(
            {
                "defaults": {
                    "glossary_file": str(glossary_path.relative_to(tmp_path)),
                    "memory_file": str(memory_path.relative_to(tmp_path)),
                    "state_file": ".sync-state.json",
                    "review_file": "review-queue.yaml",
                    "translator": {"kind": "memory"},
                },
                "pairs": [
                    {
                        "id": "paper",
                        "source": str(zh_path.relative_to(tmp_path)),
                        "target": str(en_path.relative_to(tmp_path)),
                        "file_type": "markdown",
                        "source_lang": "zh",
                        "target_lang": "en",
                        "sync_mode": "bidirectional",
                    }
                ],
            },
            allow_unicode=True,
            sort_keys=False,
        ),
        encoding="utf-8",
    )

    engine = SyncEngine(config_path=config_path, workspace_root=tmp_path)
    first = engine.sync(pair_id="paper")
    assert first[0].status == "synced"
    assert en_path.read_text(encoding="utf-8") == en_v1

    en_path.write_text(en_v2, encoding="utf-8")
    second = engine.sync(pair_id="paper")
    assert second[0].direction == "target_to_source"
    assert zh_path.read_text(encoding="utf-8") == zh_v2

    zh_path.write_text(zh_v1, encoding="utf-8")
    en_path.write_text(en_v2 + "\nupdated\n", encoding="utf-8")
    third = engine.sync(pair_id="paper")
    assert third[0].status == "conflict"
    assert any(item.severity == "error" for item in engine.list_reviews(unresolved_only=True))


def test_bootstrap_existing_bilingual_pair(tmp_path: Path) -> None:
    zh_path = tmp_path / "paper-zh.md"
    en_path = tmp_path / "paper.md"
    config_path = tmp_path / "sync-config.yaml"

    zh_text = "# 标题\n\n单一真相源\n\n- 控制平面一致性\n"
    en_text = "# Title\n\nSingle Source of Truth\n\n- control-plane consistency\n"
    zh_path.write_text(zh_text, encoding="utf-8")
    en_path.write_text(en_text, encoding="utf-8")
    (tmp_path / "glossary.yaml").write_text("terms: []\n", encoding="utf-8")
    (tmp_path / "translation-memory.yaml").write_text("entries: []\n", encoding="utf-8")
    config_path.write_text(
        yaml.safe_dump(
            {
                "defaults": {
                    "glossary_file": "glossary.yaml",
                    "memory_file": "translation-memory.yaml",
                    "state_file": ".sync-state.json",
                    "review_file": "review-queue.yaml",
                    "translator": {"kind": "memory"},
                },
                "pairs": [
                    {
                        "id": "paper",
                        "source": "paper-zh.md",
                        "target": "paper.md",
                        "file_type": "markdown",
                        "source_lang": "zh",
                        "target_lang": "en",
                        "sync_mode": "bidirectional",
                    }
                ],
            },
            allow_unicode=True,
            sort_keys=False,
        ),
        encoding="utf-8",
    )

    engine = SyncEngine(config_path=config_path, workspace_root=tmp_path)
    outcome = engine.sync(pair_id="paper")

    assert outcome[0].status == "bootstrapped"
    assert zh_path.read_text(encoding="utf-8") == zh_text
    assert en_path.read_text(encoding="utf-8") == en_text
    memory = yaml.safe_load((tmp_path / "translation-memory.yaml").read_text(encoding="utf-8"))
    assert any(entry["source"] == "单一真相源" and entry["target"] == "Single Source of Truth" for entry in memory["entries"])
    assert any(entry["source"] == "control-plane consistency" and entry["target"] == "控制平面一致性" for entry in memory["entries"])


def test_proofread_accepts_glossary_aliases(tmp_path: Path) -> None:
    zh_path = tmp_path / "paper-zh.md"
    en_path = tmp_path / "paper.md"
    config_path = tmp_path / "sync-config.yaml"

    zh_path.write_text("结构化故障诊断\n故障树分析\n有界 Multi\n", encoding="utf-8")
    en_path.write_text(
        "structured diagnosis\nfault-tree diagnosis\nbudget-bounded multi-route composition\n",
        encoding="utf-8",
    )
    (tmp_path / "glossary.yaml").write_text(
        yaml.safe_dump(
            {
                "terms": [
                    {
                        "zh": "结构化故障诊断",
                        "en": "structured fault diagnosis",
                        "en_aliases": ["structured diagnosis"],
                    },
                    {
                        "zh": "故障树分析",
                        "en": "fault-tree analysis",
                        "en_aliases": ["fault-tree diagnosis"],
                    },
                    {
                        "zh": "有界 Multi",
                        "en": "bounded Multi route",
                        "en_aliases": ["budget-bounded multi-route composition"],
                    },
                ]
            },
            allow_unicode=True,
            sort_keys=False,
        ),
        encoding="utf-8",
    )
    (tmp_path / "translation-memory.yaml").write_text("entries: []\n", encoding="utf-8")
    config_path.write_text(
        yaml.safe_dump(
            {
                "defaults": {
                    "glossary_file": "glossary.yaml",
                    "memory_file": "translation-memory.yaml",
                    "state_file": ".sync-state.json",
                    "review_file": "review-queue.yaml",
                    "translator": {"kind": "memory"},
                },
                "pairs": [
                    {
                        "id": "paper",
                        "source": "paper-zh.md",
                        "target": "paper.md",
                        "file_type": "text",
                        "source_lang": "zh",
                        "target_lang": "en",
                    }
                ],
            },
            allow_unicode=True,
            sort_keys=False,
        ),
        encoding="utf-8",
    )

    engine = SyncEngine(config_path=config_path, workspace_root=tmp_path)

    assert engine.proofread(pair_id="paper") == []


def test_cli_resolves_config_from_workspace_root(tmp_path: Path) -> None:
    zh_path = tmp_path / "paper-zh.md"
    en_path = tmp_path / "paper.md"
    config_dir = tmp_path / "docs" / "i18n"
    config_path = config_dir / "sync-config.yaml"
    glossary_path = config_dir / "glossary.yaml"
    memory_path = config_dir / "translation-memory.yaml"

    zh_path.write_text("# 标题\n", encoding="utf-8")
    en_path.write_text("", encoding="utf-8")
    config_dir.mkdir(parents=True, exist_ok=True)
    glossary_path.write_text("terms: []\n", encoding="utf-8")
    memory_path.write_text(
        yaml.safe_dump(
            {
                "entries": [
                    {"source_lang": "zh", "target_lang": "en", "source": "标题", "target": "Title"},
                    {
                        "source_lang": "zh",
                        "target_lang": "en",
                        "source": "# 标题\n",
                        "target": "# Title\n",
                    },
                ]
            },
            allow_unicode=True,
            sort_keys=False,
        ),
        encoding="utf-8",
    )
    config_path.write_text(
        yaml.safe_dump(
            {
                "defaults": {
                    "glossary_file": "docs/i18n/glossary.yaml",
                    "memory_file": "docs/i18n/translation-memory.yaml",
                    "state_file": "docs/i18n/.sync-state.json",
                    "review_file": "docs/i18n/review-queue.yaml",
                    "translator": {"kind": "memory"},
                },
                "pairs": [
                    {
                        "id": "paper",
                        "source": "paper-zh.md",
                        "target": "paper.md",
                        "file_type": "markdown",
                        "source_lang": "zh",
                        "target_lang": "en",
                    }
                ],
            },
            allow_unicode=True,
            sort_keys=False,
        ),
        encoding="utf-8",
    )

    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "resolveagent.docsync.cli",
            "--workspace-root",
            str(tmp_path),
            "sync",
        ],
        cwd=tmp_path / "docs",
        env={
            **os.environ,
            "PYTHONPATH": str(Path(__file__).resolve().parents[2] / "src"),
        },
        text=True,
        capture_output=True,
        check=False,
    )

    assert completed.returncode == 0, completed.stderr
    assert en_path.read_text(encoding="utf-8") == "# Title\n"
    state = json.loads((config_dir / ".sync-state.json").read_text(encoding="utf-8"))
    assert "paper" in state["snapshots"]


def test_proofread_detects_untranslated_content(tmp_path: Path) -> None:
    zh_path = tmp_path / "paper-zh.md"
    en_path = tmp_path / "paper.md"
    config_path = tmp_path / "sync-config.yaml"

    zh_path.write_text("# 标题\n\n单一真相源\n", encoding="utf-8")
    en_path.write_text("# 标题\n\n单一真相源\n", encoding="utf-8")
    (tmp_path / "glossary.yaml").write_text(
        yaml.safe_dump(
            {"terms": [{"zh": "单一真相源", "en": "Single Source of Truth"}]},
            allow_unicode=True,
            sort_keys=False,
        ),
        encoding="utf-8",
    )
    (tmp_path / "translation-memory.yaml").write_text("entries: []\n", encoding="utf-8")
    config_path.write_text(
        yaml.safe_dump(
            {
                "defaults": {
                    "glossary_file": "glossary.yaml",
                    "memory_file": "translation-memory.yaml",
                    "state_file": ".sync-state.json",
                    "review_file": "review-queue.yaml",
                    "translator": {"kind": "memory"},
                },
                "pairs": [
                    {
                        "id": "paper",
                        "source": "paper-zh.md",
                        "target": "paper.md",
                        "file_type": "markdown",
                        "source_lang": "zh",
                        "target_lang": "en",
                    }
                ],
            },
            allow_unicode=True,
            sort_keys=False,
        ),
        encoding="utf-8",
    )

    engine = SyncEngine(config_path=config_path, workspace_root=tmp_path)
    issues = engine.proofread(pair_id="paper")
    messages = [item.issue for item in issues]
    assert any("中文字符" in message for message in messages)
    assert any("Single Source of Truth" in message for message in messages)
