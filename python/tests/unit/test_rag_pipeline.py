"""Unit tests for the RAG Pipeline."""

import pytest

from resolveagent.llm.provider import ChatMessage, ChatResponse
from resolveagent.rag.index.milvus import _build_filter_expression
from resolveagent.rag.ingest.chunker import TextChunker
from resolveagent.rag.pipeline import RAGPipeline
from resolveagent.rag.retrieve.reranker import Reranker


def test_fixed_chunking():
    chunker = TextChunker(strategy="fixed", chunk_size=20, chunk_overlap=5)
    text = "This is a test text that should be chunked into multiple parts."
    chunks = chunker.chunk(text)
    assert len(chunks) > 1
    assert all(len(c) <= 20 for c in chunks[:-1])


def test_sentence_chunking():
    chunker = TextChunker(strategy="sentence", chunk_size=50, chunk_overlap=0)
    text = "First sentence. Second sentence. Third sentence here."
    chunks = chunker.chunk(text)
    assert len(chunks) >= 1


# ---------------------------------------------------------------------------
# Chunker regressions
# ---------------------------------------------------------------------------


def test_fixed_chunker_rejects_invalid_overlap():
    """Regression: overlap >= chunk_size made _chunk_fixed loop forever."""
    with pytest.raises(ValueError):
        TextChunker(strategy="fixed", chunk_size=10, chunk_overlap=10)
    with pytest.raises(ValueError):
        TextChunker(strategy="fixed", chunk_size=10, chunk_overlap=30)
    with pytest.raises(ValueError):
        TextChunker(strategy="fixed", chunk_size=10, chunk_overlap=-1)


def test_sentence_chunking_chinese_punctuation():
    chunker = TextChunker(strategy="sentence", chunk_size=200)
    text = "第一句话。第二句话！第三句话？Fourth sentence."
    chunks = chunker.chunk(text)
    assert len(chunks) >= 1
    joined = " ".join(chunks)
    for fragment in ("第一句话", "第二句话", "第三句话", "Fourth sentence"):
        assert fragment in joined


def test_sentence_chunking_truncates_oversized_sentence():
    """A single sentence longer than chunk_size must be force-split."""
    chunker = TextChunker(strategy="sentence", chunk_size=20)
    text = "a" * 55 + "."
    chunks = chunker.chunk(text)
    assert len(chunks) == 3
    assert all(len(c) <= 20 for c in chunks)


# ---------------------------------------------------------------------------
# Pipeline backend selection
# ---------------------------------------------------------------------------


class _RecordingStore:
    instances: list = []

    def __init__(self, *args, **kwargs) -> None:
        self.connected = False
        self.inserted = None
        _RecordingStore.instances.append(self)

    async def connect(self) -> None:
        self.connected = True

    async def disconnect(self) -> None:
        self.connected = False

    async def create_collection(self, **kwargs) -> None:
        self.created = kwargs

    async def insert(self, **kwargs) -> None:
        self.inserted = kwargs


async def test_index_chunks_uses_milvus_backend(monkeypatch):
    _RecordingStore.instances.clear()
    monkeypatch.setattr("resolveagent.rag.index.milvus.MilvusStore", _RecordingStore)
    pipeline = RAGPipeline(vector_backend="milvus")
    await pipeline._index_chunks("col", ["hello"], [[0.1, 0.2]], {"title": "t"})
    assert len(_RecordingStore.instances) == 1
    store = _RecordingStore.instances[0]
    assert store.inserted["collection_name"] == "col"
    assert not store.connected  # disconnected in finally


async def test_index_chunks_uses_qdrant_backend(monkeypatch):
    """Regression: _index_chunks hardcoded MilvusStore, ignoring vector_backend."""
    _RecordingStore.instances.clear()
    monkeypatch.setattr("resolveagent.rag.index.qdrant.QdrantStore", _RecordingStore)
    pipeline = RAGPipeline(vector_backend="qdrant")
    await pipeline._index_chunks("col", ["hello"], [[0.1, 0.2]], {"title": "t"})
    assert len(_RecordingStore.instances) == 1
    assert _RecordingStore.instances[0].inserted["collection_name"] == "col"


async def test_index_chunks_rejects_unknown_backend():
    pipeline = RAGPipeline(vector_backend="bogus")
    with pytest.raises(ValueError, match="Unsupported vector backend"):
        await pipeline._index_chunks("col", ["x"], [[0.1]], {})


# ---------------------------------------------------------------------------
# LLM reranking
# ---------------------------------------------------------------------------


class _RecordingProvider:
    default_model = "fake"

    def __init__(self) -> None:
        self.messages = None

    async def chat(self, messages, temperature=0.7, max_tokens=2048, **kwargs):
        self.messages = messages
        return ChatResponse(content="8", model="fake")


async def test_llm_rerank_passes_chat_message_objects():
    """Regression: dict messages made providers raise AttributeError on
    attribute access, which was swallowed and scored every chunk 0.5."""
    provider = _RecordingProvider()
    reranker = Reranker(llm_provider=provider)
    reranker._model = None  # force the LLM path
    results = await reranker._rerank_with_llm("query", [{"content": "some text", "score": 0.5}])
    assert provider.messages is not None
    assert all(isinstance(m, ChatMessage) for m in provider.messages)
    assert results[0]["rerank_score"] == pytest.approx(0.8)


# ---------------------------------------------------------------------------
# Milvus filter expression injection
# ---------------------------------------------------------------------------


def test_filter_expression_plain_values():
    expr = _build_filter_expression({"source": "wiki", "chunk_index": 3})
    assert 'metadata["source"] == "wiki"' in expr
    assert 'metadata["chunk_index"] == 3' in expr
    assert " and " in expr


def test_filter_expression_escapes_quotes_and_backslash():
    expr = _build_filter_expression({"k": '" or true or "'})
    assert expr == 'metadata["k"] == "\\" or true or \\""'
    expr = _build_filter_expression({"k": "a\\b"})
    assert expr == 'metadata["k"] == "a\\\\b"'


def test_filter_expression_rejects_illegal_key():
    with pytest.raises(ValueError):
        _build_filter_expression({'k"] == "1" or "" == "': "v"})


def test_filter_expression_rejects_control_characters():
    with pytest.raises(ValueError):
        _build_filter_expression({"k": "a\nb"})
    with pytest.raises(ValueError):
        _build_filter_expression({"k": "a\x00b"})
