"""Cross-encoder reranking for improved retrieval precision.

Implements reranking using cross-encoder models like BGE-Reranker
to improve the relevance of retrieved chunks.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

logger = logging.getLogger(__name__)

# Try to import sentence-transformers for cross-encoder
# This is optional - if not available, will fall back to simple scoring
try:
    from sentence_transformers import CrossEncoder

    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    logger.debug("sentence-transformers not available, using fallback reranking")

if TYPE_CHECKING:
    from resolveagent.llm.base import LLMProvider


class Reranker:
    """Reranks retrieved chunks using a cross-encoder model.

    Cross-encoders are more accurate than bi-encoders for ranking
    but slower, so they are applied as a second-pass filter.

    Supports:
    - BGE-Reranker models (default: bge-reranker-large)
    - LLM-based reranking (fallback)
    - Simple frequency-based scoring (fallback)
    """

    def __init__(
        self,
        model: str = "bge-reranker-large",
        device: str | None = None,
        llm_provider: LLMProvider | None = None,
    ) -> None:
        """Initialize the reranker.

        Args:
            model: Name of the cross-encoder model to use.
            device: Device to run the model on ('cpu', 'cuda', or None for auto).
            llm_provider: Optional LLM provider for LLM-based reranking.
        """
        self.model_name = model
        self.device = device
        self.llm_provider = llm_provider
        self._model: Any | None = None

        # Initialize model if sentence-transformers is available
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            self._init_model()

    def _init_model(self) -> None:
        """Initialize the cross-encoder model."""
        try:
            # Map common model names to HuggingFace model names
            model_map = {
                "bge-reranker-large": "BAAI/bge-reranker-large",
                "bge-reranker-base": "BAAI/bge-reranker-base",
                "cohere-rerank": "cohere/rerank-english-v3.0",
            }

            hf_model = model_map.get(self.model_name, self.model_name)

            logger.info(
                "Loading cross-encoder model",
                extra={"model": hf_model},
            )

            self._model = CrossEncoder(
                hf_model,
                device=self.device,
                max_length=512,
            )

            logger.info(
                "Cross-encoder model loaded successfully",
                extra={"model": hf_model},
            )

        except Exception as e:
            logger.warning(
                "Failed to load cross-encoder model, using fallback",
                extra={"model": self.model_name, "error": str(e)},
            )
            self._model = None

    async def rerank(
        self,
        query: str,
        chunks: list[dict[str, Any]],
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        """Rerank chunks by relevance to the query.

        Args:
            query: Original query text.
            chunks: Retrieved chunks to rerank.
            top_k: Number of top results to keep.

        Returns:
            Reranked chunks with updated scores.
        """
        if not chunks:
            return []

        logger.debug(
            "Reranking chunks",
            extra={
                "model": self.model_name,
                "chunk_count": len(chunks),
                "top_k": top_k,
            },
        )

        # Try different reranking strategies in order of preference
        if self._model is not None:
            reranked = await self._rerank_with_cross_encoder(query, chunks)
        elif self.llm_provider is not None:
            reranked = await self._rerank_with_llm(query, chunks)
        else:
            reranked = self._rerank_with_fallback(query, chunks)

        # Return top_k results
        return reranked[:top_k]

    async def _rerank_with_cross_encoder(
        self,
        query: str,
        chunks: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Rerank using cross-encoder model.

        Args:
            query: Original query text.
            chunks: Chunks to rerank.

        Returns:
            Reranked chunks with cross-encoder scores.
        """
        # Prepare query-chunk pairs
        pairs = []
        for chunk in chunks:
            content = chunk.get("content", chunk.get("text", ""))
            pairs.append([query, content])

        # Get scores from cross-encoder
        try:
            scores = self._model.predict(pairs)

            # Attach scores to chunks
            reranked = []
            for chunk, score in zip(chunks, scores, strict=False):
                new_chunk = chunk.copy()
                new_chunk["rerank_score"] = float(score)
                # Combine original score with rerank score if available
                original_score = chunk.get("score", 0.5)
                new_chunk["score"] = 0.3 * original_score + 0.7 * float(score)
                reranked.append(new_chunk)

            # Sort by rerank score (descending)
            reranked.sort(key=lambda x: x["rerank_score"], reverse=True)

            logger.debug(
                "Cross-encoder reranking completed",
                extra={
                    "chunks_processed": len(chunks),
                    "top_score": reranked[0]["rerank_score"] if reranked else 0,
                },
            )

            return reranked

        except Exception as e:
            logger.error(
                "Cross-encoder reranking failed, falling back",
                extra={"error": str(e)},
            )
            return self._rerank_with_fallback(query, chunks)

    async def _rerank_with_llm(
        self,
        query: str,
        chunks: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Rerank using LLM-based scoring.

        Args:
            query: Original query text.
            chunks: Chunks to rerank.

        Returns:
            Reranked chunks with LLM scores.
        """
        if not self.llm_provider:
            return self._rerank_with_fallback(query, chunks)

        reranked = []

        for chunk in chunks:
            content = chunk.get("content", chunk.get("text", ""))

            # Build relevance prompt
            prompt = f"""Rate the relevance of the following document to the query on a scale of 0-10.

Query: {query}

Document: {content[:500]}...

Respond with only a number from 0 to 10."""

            try:
                response = await self.llm_provider.chat(
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a relevance scorer. Respond with only a number 0-10.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.0,
                    max_tokens=5,
                )

                # Parse score
                content_response = response.content.strip()
                try:
                    score = float(content_response) / 10.0  # Normalize to 0-1
                    score = max(0.0, min(1.0, score))  # Clamp to [0, 1]
                except ValueError:
                    # Try to extract number from response
                    import re

                    numbers = re.findall(r"\d+", content_response)
                    score = float(numbers[0]) / 10.0 if numbers else 0.5

                new_chunk = chunk.copy()
                new_chunk["rerank_score"] = score
                original_score = chunk.get("score", 0.5)
                new_chunk["score"] = 0.4 * original_score + 0.6 * score
                reranked.append(new_chunk)

            except Exception as e:
                logger.warning(
                    "LLM reranking failed for chunk",
                    extra={"chunk_id": chunk.get("id", "unknown"), "error": str(e)},
                )
                # Keep original chunk with neutral score
                new_chunk = chunk.copy()
                new_chunk["rerank_score"] = 0.5
                reranked.append(new_chunk)

        # Sort by rerank score (descending)
        reranked.sort(key=lambda x: x["rerank_score"], reverse=True)

        logger.debug(
            "LLM reranking completed",
            extra={"chunks_processed": len(chunks)},
        )

        return reranked

    def _rerank_with_fallback(
        self,
        query: str,
        chunks: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Fallback reranking using simple frequency-based scoring.

        Args:
            query: Original query text.
            chunks: Chunks to rerank.

        Returns:
            Chunks with simple relevance scores.
        """
        query_terms = set(query.lower().split())

        reranked = []
        for chunk in chunks:
            content = chunk.get("content", chunk.get("text", "")).lower()
            content_terms = set(content.split())

            # Simple Jaccard similarity
            intersection = query_terms & content_terms
            union = query_terms | content_terms
            jaccard = len(intersection) / len(union) if union else 0

            # Also count term frequency
            term_freq = sum(content.count(term) for term in query_terms)
            freq_score = min(term_freq / 10, 1.0)  # Normalize and cap

            # Combine scores
            score = 0.5 * jaccard + 0.5 * freq_score

            new_chunk = chunk.copy()
            new_chunk["rerank_score"] = score
            original_score = chunk.get("score", 0.5)
            new_chunk["score"] = 0.5 * original_score + 0.5 * score
            reranked.append(new_chunk)

        # Sort by score (descending)
        reranked.sort(key=lambda x: x["rerank_score"], reverse=True)

        logger.debug(
            "Fallback reranking completed",
            extra={"chunks_processed": len(chunks)},
        )

        return reranked

    def _calculate_diversity_penalty(
        self,
        chunk: dict[str, Any],
        selected_chunks: list[dict[str, Any]],
    ) -> float:
        """Calculate diversity penalty to avoid redundant results.

        Args:
            chunk: The chunk to evaluate.
            selected_chunks: Already selected chunks.

        Returns:
            Penalty score (0-1, higher means more similar to existing).
        """
        if not selected_chunks:
            return 0.0

        chunk_content = set(chunk.get("content", "").lower().split())

        max_similarity = 0.0
        for selected in selected_chunks:
            selected_content = set(selected.get("content", "").lower().split())

            # Jaccard similarity
            intersection = chunk_content & selected_content
            union = chunk_content | selected_content
            similarity = len(intersection) / len(union) if union else 0

            max_similarity = max(max_similarity, similarity)

        return max_similarity

    async def rerank_with_diversity(
        self,
        query: str,
        chunks: list[dict[str, Any]],
        top_k: int = 5,
        diversity_weight: float = 0.3,
    ) -> list[dict[str, Any]]:
        """Rerank with diversity-aware selection (Maximal Marginal Relevance).

        Args:
            query: Original query text.
            chunks: Retrieved chunks to rerank.
            top_k: Number of top results to keep.
            diversity_weight: Weight for diversity vs relevance (0-1).

        Returns:
            Diverse, relevant chunks.
        """
        if not chunks:
            return []

        # First get relevance scores
        reranked = await self.rerank(query, chunks, len(chunks))

        # Apply MMR (Maximal Marginal Relevance) selection
        selected: list[dict[str, Any]] = []
        remaining = reranked.copy()

        while len(selected) < top_k and remaining:
            if not selected:
                # First item: highest relevance
                best = max(remaining, key=lambda x: x.get("rerank_score", 0))
            else:
                # Subsequent items: balance relevance and diversity
                def mmr_score(chunk):
                    relevance = chunk.get("rerank_score", 0)
                    diversity_penalty = self._calculate_diversity_penalty(chunk, selected)
                    return (1 - diversity_weight) * relevance - diversity_weight * diversity_penalty

                best = max(remaining, key=mmr_score)

            selected.append(best)
            remaining.remove(best)

        logger.debug(
            "Diversity-aware reranking completed",
            extra={
                "selected": len(selected),
                "diversity_weight": diversity_weight,
            },
        )

        return selected
