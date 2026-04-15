"""Unit tests for the kudig-database RAG import script."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

from resolveagent.corpus.kudig_rag_import import (
    ImportState,
    KudigRAGClient,
    MarkdownProcessor,
)

# ---------------------------------------------------------------------------
# MarkdownProcessor tests
# ---------------------------------------------------------------------------


class TestExtractTitle:
    def test_bilingual_title(self):
        content = "# Kubernetes 控制平面架构总览 (Control Plane Architecture Overview)\n\nSome text"
        title = MarkdownProcessor.extract_title(content)
        assert title == "Kubernetes 控制平面架构总览 (Control Plane Architecture Overview)"

    def test_chinese_only_title(self):
        content = "# 容器启动失败排查指南\n\n内容"
        title = MarkdownProcessor.extract_title(content)
        assert title == "容器启动失败排查指南"

    def test_no_title(self):
        content = "Some content without a heading"
        title = MarkdownProcessor.extract_title(content)
        assert title == ""

    def test_ignores_h2(self):
        content = "## 这是 H2 标题\n\n内容"
        title = MarkdownProcessor.extract_title(content)
        assert title == ""


class TestExtractBlockquoteMetadata:
    def test_chinese_colon(self):
        content = "> **适用版本**：v1.25 - v1.32\n> **最后更新**：2026-01\n\n## 内容"
        meta = MarkdownProcessor.extract_blockquote_metadata(content)
        assert meta["适用版本"] == "v1.25 - v1.32"
        assert meta["最后更新"] == "2026-01"

    def test_ascii_colon(self):
        content = "> **文档类型**: 架构设计文档\n\n内容"
        meta = MarkdownProcessor.extract_blockquote_metadata(content)
        assert meta["文档类型"] == "架构设计文档"

    def test_mixed_format(self):
        content = (
            "> **适用版本**: v1.25 - v1.32 | **最后更新**: 2026-02 | **文档类型**: 架构设计文档"
        )
        # The pipe-separated format is on a single line, so the regex picks up the first key
        meta = MarkdownProcessor.extract_blockquote_metadata(content)
        assert "适用版本" in meta

    def test_no_metadata(self):
        content = "# Title\n\n## Section 1\nContent here"
        meta = MarkdownProcessor.extract_blockquote_metadata(content)
        assert meta == {}

    def test_plain_blockquote_without_bold(self):
        content = "> 版本：v2.0\n> 更新日期：2026-03\n"
        meta = MarkdownProcessor.extract_blockquote_metadata(content)
        assert meta["版本"] == "v2.0"
        assert meta["更新日期"] == "2026-03"


class TestContentHash:
    def test_deterministic(self):
        content = "Test content 测试内容"
        h1 = MarkdownProcessor.content_hash(content)
        h2 = MarkdownProcessor.content_hash(content)
        assert h1 == h2
        assert len(h1) == 64  # SHA-256 hex digest

    def test_different_content(self):
        h1 = MarkdownProcessor.content_hash("content A")
        h2 = MarkdownProcessor.content_hash("content B")
        assert h1 != h2


class TestPrepareDocuments:
    def test_basic_file(self, tmp_path):
        md_content = (
            "# 测试文档 (Test Doc)\n\n"
            "> **版本**：v1.0\n\n"
            "## 1. 第一节\n\n第一节内容\n\n"
            "## 2. 第二节\n\n第二节内容\n"
        )
        md_file = tmp_path / "domain-1" / "01-test.md"
        md_file.parent.mkdir(parents=True)
        md_file.write_text(md_content, encoding="utf-8")

        processor = MarkdownProcessor(strategy="by_h2", chunk_size=2000)
        docs, c_hash = processor.prepare_documents(md_file, tmp_path, "domain-1")

        assert len(docs) >= 1
        assert c_hash
        # Check metadata structure
        meta = docs[0]["metadata"]
        assert meta["title"] == "测试文档 (Test Doc)"
        assert meta["domain"] == "domain-1"
        assert meta["corpus"] == "kudig"
        assert meta["content_type"] == "text/markdown"
        assert "source_uri" in meta
        assert meta["chunk_index"] == 0
        assert meta["total_chunks"] == len(docs)

    def test_empty_file(self, tmp_path):
        md_file = tmp_path / "empty.md"
        md_file.write_text("", encoding="utf-8")
        processor = MarkdownProcessor()
        docs, c_hash = processor.prepare_documents(md_file, tmp_path, "domain-1")
        assert docs == []

    def test_no_h2_headings(self, tmp_path):
        md_content = "# Just a Title\n\nSome paragraph text without any H2 sections."
        md_file = tmp_path / "no-h2.md"
        md_file.write_text(md_content, encoding="utf-8")

        processor = MarkdownProcessor(strategy="by_h2", chunk_size=2000)
        docs, _ = processor.prepare_documents(md_file, tmp_path, "domain-1")
        # Should still return at least one chunk (the entire content)
        assert len(docs) >= 1


# ---------------------------------------------------------------------------
# ImportState tests
# ---------------------------------------------------------------------------


class TestImportState:
    def test_roundtrip(self, tmp_path):
        state_path = str(tmp_path / "state.json")
        state = ImportState(_path=state_path)
        state.collection_id = "test-id-123"
        state.collection_name = "test-collection"
        state.record_success("domain-1/file.md", "abc123", 5)
        state.record_error("domain-2/bad.md", "parse error")
        state.save()

        loaded = ImportState.load(state_path)
        assert loaded.collection_id == "test-id-123"
        assert loaded.collection_name == "test-collection"
        assert loaded.is_imported("domain-1/file.md", "abc123")
        assert not loaded.is_imported("domain-1/file.md", "different-hash")
        assert len(loaded.errors) == 1

    def test_load_missing_file(self, tmp_path):
        state = ImportState.load(str(tmp_path / "nonexistent.json"))
        assert state.collection_id == ""
        assert state.completed_files == {}

    def test_load_corrupted_file(self, tmp_path):
        state_path = tmp_path / "bad.json"
        state_path.write_text("not valid json{{{", encoding="utf-8")
        state = ImportState.load(str(state_path))
        assert state.completed_files == {}

    def test_skip_already_imported(self, tmp_path):
        state_path = str(tmp_path / "state.json")
        state = ImportState(_path=state_path)
        state.record_success("domain-1/file.md", "hash123", 3)

        assert state.is_imported("domain-1/file.md", "hash123") is True
        assert state.is_imported("domain-1/file.md", "changed") is False
        assert state.is_imported("domain-1/other.md", "hash123") is False


# ---------------------------------------------------------------------------
# KudigRAGClient tests (mocked HTTP)
# ---------------------------------------------------------------------------


class TestKudigRAGClient:
    def test_ensure_collection_exists(self):
        client = KudigRAGClient("http://test:3004/api/v1")
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "collections": [
                {"id": "existing-id", "name": "kudig-rag"},
            ],
            "total": 1,
        }

        with patch.object(client._client, "request", return_value=mock_resp):
            cid = client.ensure_collection("kudig-rag")
            assert cid == "existing-id"

    def test_ensure_collection_creates_new(self):
        client = KudigRAGClient("http://test:3004/api/v1")

        list_resp = MagicMock()
        list_resp.status_code = 200
        list_resp.json.return_value = {"collections": [], "total": 0}

        create_resp = MagicMock()
        create_resp.status_code = 201
        create_resp.json.return_value = {"id": "new-id", "name": "kudig-rag"}

        with patch.object(
            client._client, "request", side_effect=[list_resp, create_resp]
        ):
            cid = client.ensure_collection("kudig-rag")
            assert cid == "new-id"

    def test_retry_on_500(self):
        client = KudigRAGClient("http://test:3004/api/v1")

        error_resp = MagicMock()
        error_resp.status_code = 500
        error_resp.raise_for_status = MagicMock()

        ok_resp = MagicMock()
        ok_resp.status_code = 200
        ok_resp.json.return_value = {"collections": []}
        ok_resp.raise_for_status = MagicMock()

        with patch.object(
            client._client, "request", side_effect=[error_resp, ok_resp]
        ), patch("resolveagent.corpus.kudig_rag_import.time.sleep"):
            result = client.list_collections()
            assert result == []
