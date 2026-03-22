"""Unit tests for the RAG Pipeline."""

from resolvenet.rag.ingest.chunker import TextChunker


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
