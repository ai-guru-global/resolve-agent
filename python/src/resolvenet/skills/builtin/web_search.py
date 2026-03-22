"""Web search skill."""

from __future__ import annotations

from typing import Any


def run(query: str, num_results: int = 5, **kwargs: Any) -> dict[str, Any]:
    """Search the web for the given query.

    Args:
        query: Search query string.
        num_results: Number of results to return.

    Returns:
        Dict with search results.
    """
    # TODO: Implement web search via configurable provider
    return {
        "query": query,
        "results": [],
        "total": 0,
        "message": "Web search not implemented - configure a search provider",
    }
