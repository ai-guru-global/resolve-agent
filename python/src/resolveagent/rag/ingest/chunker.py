"""Text chunking strategies."""

from __future__ import annotations


class TextChunker:
    """Splits text into chunks for embedding.

    Strategies:
    - fixed: Fixed-size character chunks with overlap
    - sentence: Split on sentence boundaries
    - semantic: Split on semantic similarity boundaries
    """

    def __init__(
        self,
        strategy: str = "sentence",
        chunk_size: int = 512,
        chunk_overlap: int = 50,
    ) -> None:
        self.strategy = strategy
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def chunk(self, text: str) -> list[str]:
        """Split text into chunks.

        Args:
            text: Text to chunk.

        Returns:
            List of text chunks.
        """
        if self.strategy == "fixed":
            return self._chunk_fixed(text)
        elif self.strategy == "sentence":
            return self._chunk_sentence(text)
        else:
            return self._chunk_fixed(text)

    def _chunk_fixed(self, text: str) -> list[str]:
        """Fixed-size chunking with overlap."""
        chunks = []
        start = 0
        while start < len(text):
            end = start + self.chunk_size
            chunks.append(text[start:end])
            start = end - self.chunk_overlap
        return chunks

    def _chunk_sentence(self, text: str) -> list[str]:
        """Sentence-based chunking."""
        # Simple sentence splitting
        sentences = text.replace("!", ".").replace("?", ".").split(".")
        sentences = [s.strip() for s in sentences if s.strip()]

        chunks = []
        current_chunk: list[str] = []
        current_length = 0

        for sentence in sentences:
            if current_length + len(sentence) > self.chunk_size and current_chunk:
                chunks.append(". ".join(current_chunk) + ".")
                current_chunk = []
                current_length = 0
            current_chunk.append(sentence)
            current_length += len(sentence)

        if current_chunk:
            chunks.append(". ".join(current_chunk) + ".")

        return chunks
