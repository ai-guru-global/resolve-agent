"""Text chunking strategies."""

from __future__ import annotations

import re


class TextChunker:
    """Splits text into chunks for embedding.

    Strategies:
    - fixed: Fixed-size character chunks with overlap
    - sentence: Split on sentence boundaries
    - semantic: Split on semantic similarity boundaries
    - by_h2: Split on ## heading boundaries
    - by_h3: Split on ### heading boundaries
    - by_section: Split on any ## or ### heading boundary
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
        elif self.strategy == "by_h2":
            return self._chunk_by_heading(text, level=2)
        elif self.strategy == "by_h3":
            return self._chunk_by_heading(text, level=3)
        elif self.strategy == "by_section":
            return self._chunk_by_heading(text, level=0)
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

    def _chunk_by_heading(self, text: str, level: int) -> list[str]:
        """Split text on Markdown heading boundaries.

        Args:
            text: Markdown text to split.
            level: Heading level to split on.
                   2 = split on ``## ``, 3 = split on ``### ``,
                   0 = split on both ``## `` and ``### ``.

        Returns:
            List of text chunks, each starting with its heading.
        """
        if level == 2:
            pattern = r"(?=^## (?!#))"
        elif level == 3:
            pattern = r"(?=^### (?!#))"
        else:
            pattern = r"(?=^#{2,3} (?!#))"

        sections = re.split(pattern, text, flags=re.MULTILINE)
        sections = [s.strip() for s in sections if s.strip()]

        if not sections:
            return [text] if text.strip() else []

        # Merge small sections or split large ones to respect chunk_size
        chunks: list[str] = []
        current = ""

        for section in sections:
            if not current:
                current = section
            elif len(current) + len(section) + 1 <= self.chunk_size:
                current = current + "\n\n" + section
            else:
                chunks.append(current)
                current = section

            # If current section alone exceeds chunk_size, flush and fall back
            # to fixed chunking for the oversized piece.
            while len(current) > self.chunk_size:
                split_at = current.rfind("\n", 0, self.chunk_size)
                if split_at <= 0:
                    split_at = self.chunk_size
                chunks.append(current[:split_at].strip())
                current = current[split_at:].strip()

        if current:
            chunks.append(current)

        return chunks
