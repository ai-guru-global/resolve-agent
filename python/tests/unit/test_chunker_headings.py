"""Unit tests for heading-based chunking strategies."""

from resolveagent.rag.ingest.chunker import TextChunker

# ---------------------------------------------------------------------------
# by_h2 strategy
# ---------------------------------------------------------------------------

H2_DOC = """\
## Introduction

This is the introduction section with some content.

## Architecture

The architecture section describes the system.

## Deployment

Deployment section with instructions.
"""


def test_by_h2_splits_on_h2_headings():
    # chunk_size must be smaller than combined section sizes to force splitting
    chunker = TextChunker(strategy="by_h2", chunk_size=80)
    chunks = chunker.chunk(H2_DOC)
    assert len(chunks) == 3
    assert "## Introduction" in chunks[0]
    assert "## Architecture" in chunks[1]
    assert "## Deployment" in chunks[2]


def test_by_h2_does_not_split_on_h3():
    doc = """\
## Section A

### Sub A1

Content of sub A1.

### Sub A2

Content of sub A2.

## Section B

Content of B.
"""
    # Section A (~76 chars) + Section B (~27 chars) must exceed chunk_size
    chunker = TextChunker(strategy="by_h2", chunk_size=90)
    chunks = chunker.chunk(doc)
    assert len(chunks) == 2
    # First chunk should contain both sub-sections
    assert "### Sub A1" in chunks[0]
    assert "### Sub A2" in chunks[0]
    assert "## Section B" in chunks[1]


# ---------------------------------------------------------------------------
# by_h3 strategy
# ---------------------------------------------------------------------------

H3_DOC = """\
### Overview

Overview content here.

### Details

Details content here.

### Summary

Summary content here.
"""


def test_by_h3_splits_on_h3_headings():
    chunker = TextChunker(strategy="by_h3", chunk_size=50)
    chunks = chunker.chunk(H3_DOC)
    assert len(chunks) == 3
    assert "### Overview" in chunks[0]
    assert "### Details" in chunks[1]
    assert "### Summary" in chunks[2]


# ---------------------------------------------------------------------------
# by_section strategy (both ## and ###)
# ---------------------------------------------------------------------------

MIXED_DOC = """\
## Chapter 1

Intro text.

### Section 1.1

Section 1.1 content.

## Chapter 2

Chapter 2 content.
"""


def test_by_section_splits_on_both_h2_and_h3():
    chunker = TextChunker(strategy="by_section", chunk_size=50)
    chunks = chunker.chunk(MIXED_DOC)
    assert len(chunks) == 3
    assert "## Chapter 1" in chunks[0]
    assert "### Section 1.1" in chunks[1]
    assert "## Chapter 2" in chunks[2]


# ---------------------------------------------------------------------------
# Small section merging
# ---------------------------------------------------------------------------


def test_small_sections_merged():
    doc = """\
## A

X

## B

Y

## C

Z
"""
    # With a large chunk_size, all small sections merge into one chunk
    chunker = TextChunker(strategy="by_h2", chunk_size=5000)
    chunks = chunker.chunk(doc)
    assert len(chunks) == 1
    assert "## A" in chunks[0]
    assert "## C" in chunks[0]


# ---------------------------------------------------------------------------
# Large section splitting
# ---------------------------------------------------------------------------


def test_oversized_section_split():
    # Create a section that exceeds the chunk size
    big_content = "word " * 100  # ~500 chars
    doc = f"## Big Section\n\n{big_content}"
    chunker = TextChunker(strategy="by_h2", chunk_size=100)
    chunks = chunker.chunk(doc)
    assert len(chunks) > 1
    # Each chunk should be roughly within chunk_size
    for chunk in chunks:
        assert len(chunk) <= 600  # allow some margin for split boundary


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


def test_empty_text():
    chunker = TextChunker(strategy="by_h2", chunk_size=512)
    chunks = chunker.chunk("")
    assert chunks == []


def test_no_headings_returns_full_text():
    text = "Just plain text without any headings."
    chunker = TextChunker(strategy="by_h2", chunk_size=2000)
    chunks = chunker.chunk(text)
    assert len(chunks) == 1
    assert chunks[0] == text


def test_text_before_first_heading():
    doc = """\
Some preamble text.

## First Section

Content.
"""
    chunker = TextChunker(strategy="by_h2", chunk_size=2000)
    chunks = chunker.chunk(doc)
    # Preamble may merge with first section or stand alone
    assert len(chunks) >= 1
    assert "preamble" in chunks[0].lower() or "First Section" in chunks[0]


def test_by_h3_does_not_split_h2():
    doc = """\
## Top Level

Top content.

### Sub Level

Sub content.
"""
    chunker = TextChunker(strategy="by_h3", chunk_size=2000)
    chunks = chunker.chunk(doc)
    # Should only split on ###, not ##
    # First chunk has ## + content before ###, second has ###
    heading_counts = sum(1 for c in chunks if "### Sub Level" in c)
    assert heading_counts == 1
