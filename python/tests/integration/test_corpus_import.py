"""Integration test for the corpus import pipeline.

Tests the end-to-end flow from parsing raw content to producing
importable data structures, without requiring external services
(no Milvus, no git clone, no running server).
"""

import os
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

from resolveagent.corpus.config import CorpusConfig
from resolveagent.corpus.fta_parser import FTAMarkdownParser
from resolveagent.corpus.skill_adapter import KudigSkillAdapter, parse_front_matter
from resolveagent.rag.ingest.chunker import TextChunker


# ---------------------------------------------------------------------------
# Fixture: create a minimal kudig-database-like directory
# ---------------------------------------------------------------------------

SAMPLE_RAG_DOC = """\
# DNS Troubleshooting Guide

## Overview

DNS (Domain Name System) is a critical infrastructure component.

## Common Issues

### Slow Resolution

When DNS queries take longer than expected, check the following:
- DNS cache TTL configuration
- Network latency to upstream resolvers
- Query volume on DNS servers

### NXDOMAIN Errors

NXDOMAIN indicates the domain does not exist. Verify:
- Domain spelling
- DNS zone configuration
- Domain registration status
"""

SAMPLE_FTA_DOC = """\
# DNS Resolution Failure FTA

```mermaid
graph TD
    TOP["DNS Resolution Failure"]
    OR1{{"OR"}}
    EVT1["DNS Server Down"]
    EVT2["Network Partition"]
    EVT3["Config Error"]

    TOP --> OR1
    OR1 --> EVT1
    OR1 --> EVT2
    OR1 --> EVT3
```

```json
{
    "EVT1": {"severity": "P1", "probability": 0.1, "mttr": "30m"},
    "EVT2": {"severity": "P1", "probability": 0.05, "mttr": "45m"},
    "EVT3": {"severity": "P2", "probability": 0.3, "mttr": "15m"}
}
```

```json
{
    "flow_steps": ["check_dns_pods", "verify_network", "review_config"]
}
```
"""

SAMPLE_SKILL_DOC = """\
---
skill_id: dns-resolution-recovery
version: "1.0"
skill_name:
  en: DNS Resolution Recovery
  zh: DNS 解析恢复
category: networking/dns
severity_range: P1-P2
trigger_keywords:
  - dns failure
  - name resolution
trigger_events:
  - DNSResolutionFailure
related_skills:
  - network-connectivity-check
fta_refs:
  - dns-fta
estimated_resolution_time: 30m
---

## Overview

Automated recovery procedure for DNS resolution failures.

## Symptom

Services report DNS resolution errors.

## Triage

1. Check CoreDNS pod status
2. Verify upstream DNS connectivity

## Diagnostic

Run nslookup/dig commands to isolate the failure point.

## Root Cause

Common causes: CoreDNS crash, upstream DNS outage, network policy blocking.

## Remediation

Restart CoreDNS pods and verify resolution.

## Verification

Confirm DNS queries succeed from test pods.
"""


@pytest.fixture
def corpus_dir(tmp_path: Path) -> Path:
    """Create a minimal kudig-database-like directory structure."""
    # RAG domain
    domain = tmp_path / "domain-1"
    domain.mkdir()
    (domain / "dns-troubleshooting.md").write_text(SAMPLE_RAG_DOC)

    # FTA documents
    fta_dir = tmp_path / "topic-fta" / "list"
    fta_dir.mkdir(parents=True)
    (fta_dir / "dns-fta.md").write_text(SAMPLE_FTA_DOC)

    # Skill documents
    skills_dir = tmp_path / "topic-skills"
    skills_dir.mkdir()
    (skills_dir / "dns-resolution-recovery.md").write_text(SAMPLE_SKILL_DOC)
    # Schema file that should be skipped
    (skills_dir / "skill-schema.md").write_text("# Schema docs")

    # Corpus config (optional)
    config_dir = tmp_path / "corpus-config"
    config_dir.mkdir()

    return tmp_path


# ---------------------------------------------------------------------------
# Integration: RAG chunking pipeline
# ---------------------------------------------------------------------------


class TestRAGChunkingPipeline:
    """Test the complete RAG pipeline from doc to chunks."""

    def test_rag_doc_to_chunks_by_h2(self, corpus_dir: Path):
        doc_path = corpus_dir / "domain-1" / "dns-troubleshooting.md"
        content = doc_path.read_text()

        chunker = TextChunker(strategy="by_h2", chunk_size=200)
        chunks = chunker.chunk(content)

        assert len(chunks) >= 2
        # First chunk should have Overview
        assert any("Overview" in c for c in chunks)
        # Common Issues should be in another chunk
        assert any("Common Issues" in c for c in chunks)

    def test_rag_doc_to_chunks_by_h3(self, corpus_dir: Path):
        doc_path = corpus_dir / "domain-1" / "dns-troubleshooting.md"
        content = doc_path.read_text()

        chunker = TextChunker(strategy="by_h3", chunk_size=200)
        chunks = chunker.chunk(content)

        # Should split on ### headings
        assert any("Slow Resolution" in c for c in chunks)
        assert any("NXDOMAIN" in c for c in chunks)


# ---------------------------------------------------------------------------
# Integration: FTA parsing pipeline
# ---------------------------------------------------------------------------


class TestFTAParsingPipeline:
    """Test the FTA parsing from Markdown to FaultTree."""

    def test_fta_full_parse(self, corpus_dir: Path):
        fta_path = corpus_dir / "topic-fta" / "list" / "dns-fta.md"
        content = fta_path.read_text()
        file_id = fta_path.stem  # "dns-fta"

        parser = FTAMarkdownParser()
        result = parser.parse(content, file_id=file_id)

        # Tree basics
        assert result.tree.id == "dns-fta"
        assert result.tree.name == "DNS Resolution Failure FTA"
        assert result.tree.top_event_id == "TOP"

        # Events
        event_ids = {e.id for e in result.tree.events}
        assert "TOP" in event_ids
        assert "EVT1" in event_ids
        assert "EVT2" in event_ids
        assert "EVT3" in event_ids

        # Gates
        gate_ids = {g.id for g in result.tree.gates}
        assert "OR1" in gate_ids
        or_gate = next(g for g in result.tree.gates if g.id == "OR1")
        assert set(or_gate.input_ids) == {"EVT1", "EVT2", "EVT3"}

        # JSON enrichment
        assert result.base_events.get("EVT1", {}).get("severity") == "P1"
        assert result.workflow.get("flow_steps") == [
            "check_dns_pods",
            "verify_network",
            "review_config",
        ]

        # Event parameter enrichment
        evt1 = next(e for e in result.tree.events if e.id == "EVT1")
        assert evt1.parameters.get("mttr") == "30m"

    def test_fta_then_rag_chunking(self, corpus_dir: Path):
        """FTA raw content should also be indexable into RAG."""
        fta_path = corpus_dir / "topic-fta" / "list" / "dns-fta.md"
        content = fta_path.read_text()

        chunker = TextChunker(strategy="by_h3", chunk_size=500)
        chunks = chunker.chunk(content)
        assert len(chunks) >= 1
        # Content should be preserved in chunks
        assert any("DNS Resolution Failure" in c for c in chunks)


# ---------------------------------------------------------------------------
# Integration: Skill adaptation pipeline
# ---------------------------------------------------------------------------


class TestSkillAdaptationPipeline:
    """Test skill parsing and adaptation from kudig format."""

    def test_skill_full_adaptation(self, corpus_dir: Path):
        skill_path = corpus_dir / "topic-skills" / "dns-resolution-recovery.md"
        content = skill_path.read_text()

        fm, body = parse_front_matter(content)
        adapter = KudigSkillAdapter()
        skill = adapter.convert(fm, body)

        # Identity
        assert skill.name == "dns-resolution-recovery"
        assert skill.version == "1.0"
        assert skill.description == "DNS Resolution Recovery"

        # Labels
        assert skill.labels["category"] == "networking/dns"
        assert skill.labels["severity_range"] == "P1-P2"
        assert skill.labels["corpus"] == "kudig"

        # Manifest
        assert "trigger_keywords" in skill.manifest
        assert "dns failure" in skill.manifest["trigger_keywords"]
        assert skill.manifest["fta_refs"] == ["dns-fta"]
        assert skill.manifest["estimated_resolution_time"] == "30m"

        # Runbook sections
        runbook = skill.manifest.get("runbook", {})
        assert "Overview" in runbook
        assert "Symptom" in runbook
        assert "Triage" in runbook
        assert "Diagnostic" in runbook
        assert "Root Cause" in runbook
        assert "Remediation" in runbook
        assert "Verification" in runbook

        # Registration dict
        reg = skill.to_registration_dict()
        assert reg["status"] == "active"
        assert reg["source_type"] == "corpus"
        assert reg["name"] == "dns-resolution-recovery"

    def test_skill_schema_file_skipped(self, corpus_dir: Path):
        """skill-schema.md should be skipped during import."""
        skills_dir = corpus_dir / "topic-skills"
        md_files = list(skills_dir.glob("*.md"))
        skill_files = [
            f for f in md_files if f.stem not in ("readme", "skill-schema", "enhancement-record")
        ]
        assert len(skill_files) == 1
        assert skill_files[0].stem == "dns-resolution-recovery"


# ---------------------------------------------------------------------------
# Integration: Corpus config
# ---------------------------------------------------------------------------


class TestCorpusConfig:
    """Test corpus configuration loading."""

    def test_default_strategy_lookup(self):
        config = CorpusConfig()
        # domain-N directories should get by_h2 strategy
        strategy, size = config.get_chunking_strategy("domain-5/some-file.md")
        assert strategy == "by_h2"

    def test_fta_strategy_lookup(self):
        config = CorpusConfig()
        strategy, size = config.get_chunking_strategy("topic-fta/list/dns-fta.md")
        assert strategy == "by_h3"

    def test_skills_strategy_lookup(self):
        config = CorpusConfig()
        strategy, size = config.get_chunking_strategy("topic-skills/my-skill.md")
        assert strategy == "by_section"

    def test_exclusion(self):
        config = CorpusConfig()
        assert config.is_excluded(".git/config")
        assert config.is_excluded("node_modules/package.json")
        assert not config.is_excluded("domain-1/doc.md")
