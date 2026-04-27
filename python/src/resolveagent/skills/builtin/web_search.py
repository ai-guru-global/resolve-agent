"""Built-in skill for web search.

Supports multiple search providers:
- Bing Search API
- Google Custom Search
- Searx (self-hosted)
- DuckDuckGo (scraper)
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from typing import Any

import httpx

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """Web search result."""

    title: str
    url: str
    snippet: str
    source: str = ""


class WebSearchSkill:
    """Search the web for information.

    Supported providers:
    - bing: Microsoft Bing Search API
    - google: Google Custom Search API
    - searx: Self-hosted Searx instance
    - duckduckgo: DuckDuckGo HTML scraping (fallback)
    """

    DEFAULT_PROVIDER = "duckduckgo"

    def __init__(
        self,
        provider: str | None = None,
        api_key: str | None = None,
        base_url: str | None = None,
    ) -> None:
        """Initialize web search skill.

        Args:
            provider: Search provider (bing, google, searx, duckduckgo).
            api_key: API key for the provider.
            base_url: Base URL for self-hosted providers.
        """
        self.provider = provider or self.DEFAULT_PROVIDER
        self.api_key = api_key or self._get_default_api_key()
        self.base_url = base_url

    def _get_default_api_key(self) -> str | None:
        """Get default API key from environment."""
        if self.provider == "bing":
            return os.getenv("BING_SEARCH_API_KEY")
        elif self.provider == "google":
            return os.getenv("GOOGLE_SEARCH_API_KEY")
        elif self.provider == "searx":
            return None  # Searx doesn't require API key
        return None

    async def search(
        self,
        query: str,
        top_k: int = 5,
        **kwargs: Any,
    ) -> list[SearchResult]:
        """Search the web.

        Args:
            query: Search query.
            top_k: Number of results to return.
            **kwargs: Additional provider-specific parameters.

        Returns:
            List of search results.
        """
        logger.info(
            "Web search",
            extra={"provider": self.provider, "query": query, "top_k": top_k},
        )

        if self.provider == "bing":
            return await self._search_bing(query, top_k, **kwargs)
        elif self.provider == "google":
            return await self._search_google(query, top_k, **kwargs)
        elif self.provider == "searx":
            return await self._search_searx(query, top_k, **kwargs)
        elif self.provider == "duckduckgo":
            return await self._search_duckduckgo(query, top_k, **kwargs)
        else:
            raise ValueError(f"Unsupported search provider: {self.provider}")

    async def _search_bing(
        self,
        query: str,
        top_k: int,
        **kwargs: Any,
    ) -> list[SearchResult]:
        """Search using Bing API."""
        if not self.api_key:
            logger.error("Bing API key not configured")
            return []

        endpoint = "https://api.bing.microsoft.com/v7.0/search"
        headers = {"Ocp-Apim-Subscription-Key": self.api_key}
        params = {
            "q": query,
            "count": top_k,
            "mkt": kwargs.get("market", "zh-CN"),
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(endpoint, headers=headers, params=params)
                response.raise_for_status()
                data = response.json()

                results = []
                for item in data.get("webPages", {}).get("value", []):
                    results.append(
                        SearchResult(
                            title=item.get("name", ""),
                            url=item.get("url", ""),
                            snippet=item.get("snippet", ""),
                            source="Bing",
                        )
                    )

                return results[:top_k]

        except Exception as e:
            logger.error("Bing search failed", extra={"error": str(e)})
            return []

    async def _search_google(
        self,
        query: str,
        top_k: int,
        **kwargs: Any,
    ) -> list[SearchResult]:
        """Search using Google Custom Search API."""
        if not self.api_key:
            logger.error("Google API key not configured")
            return []

        cx = kwargs.get("cx") or os.getenv("GOOGLE_SEARCH_CX")
        if not cx:
            logger.error("Google Custom Search Engine ID (cx) not configured")
            return []

        endpoint = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": self.api_key,
            "cx": cx,
            "q": query,
            "num": min(top_k, 10),  # Google max is 10
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(endpoint, params=params)
                response.raise_for_status()
                data = response.json()

                results = []
                for item in data.get("items", []):
                    results.append(
                        SearchResult(
                            title=item.get("title", ""),
                            url=item.get("link", ""),
                            snippet=item.get("snippet", ""),
                            source="Google",
                        )
                    )

                return results[:top_k]

        except Exception as e:
            logger.error("Google search failed", extra={"error": str(e)})
            return []

    async def _search_searx(
        self,
        query: str,
        top_k: int,
        **kwargs: Any,
    ) -> list[SearchResult]:
        """Search using Searx instance."""
        base_url = self.base_url or os.getenv("SEARX_URL", "http://localhost:8080")
        endpoint = f"{base_url}/search"

        params = {
            "q": query,
            "format": "json",
            "language": kwargs.get("language", "zh-CN"),
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(endpoint, params=params)
                response.raise_for_status()
                data = response.json()

                results = []
                for item in data.get("results", [])[:top_k]:
                    results.append(
                        SearchResult(
                            title=item.get("title", ""),
                            url=item.get("url", ""),
                            snippet=item.get("content", ""),
                            source=item.get("engine", "Searx"),
                        )
                    )

                return results

        except Exception as e:
            logger.error("Searx search failed", extra={"error": str(e)})
            return []

    async def _search_duckduckgo(
        self,
        query: str,
        top_k: int,
        **kwargs: Any,
    ) -> list[SearchResult]:
        """Search using DuckDuckGo HTML scraping."""
        from urllib.parse import quote

        try:
            # Try using duckduckgo-search library if available
            try:
                from duckduckgo_search import DDGS

                results = []
                with DDGS() as ddgs:
                    for r in ddgs.text(query, max_results=top_k):
                        results.append(
                            SearchResult(
                                title=r.get("title", ""),
                                url=r.get("href", ""),
                                snippet=r.get("body", ""),
                                source="DuckDuckGo",
                            )
                        )
                return results

            except ImportError:
                logger.debug("duckduckgo-search not installed, using HTTP fallback")

            # Fallback to HTML scraping
            encoded_query = quote(query)
            url = f"https://html.duckduckgo.com/html/?q={encoded_query}"

            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            }

            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()

                # Parse HTML
                try:
                    from bs4 import BeautifulSoup

                    soup = BeautifulSoup(response.text, "html.parser")
                    results = []

                    for result in soup.find_all("div", class_="result"):
                        title_elem = result.find("a", class_="result__a")
                        snippet_elem = result.find("a", class_="result__snippet")

                        if title_elem and snippet_elem:
                            results.append(
                                SearchResult(
                                    title=title_elem.get_text(strip=True),
                                    url=title_elem.get("href", ""),
                                    snippet=snippet_elem.get_text(strip=True),
                                    source="DuckDuckGo",
                                )
                            )

                        if len(results) >= top_k:
                            break

                    return results

                except ImportError:
                    logger.warning("beautifulsoup4 not installed, cannot parse DuckDuckGo results")
                    return []

        except Exception as e:
            logger.error("DuckDuckGo search failed", extra={"error": str(e)})
            return []

    async def search_and_summarize(
        self,
        query: str,
        top_k: int = 5,
    ) -> dict[str, Any]:
        """Search and return formatted results.

        Args:
            query: Search query.
            top_k: Number of results.

        Returns:
            Formatted search results.
        """
        results = await self.search(query, top_k)

        if not results:
            return {
                "success": False,
                "query": query,
                "results": [],
                "formatted": "No results found.",
            }

        # Format results
        formatted_parts = [f"Search results for: {query}\n"]
        for i, r in enumerate(results, 1):
            formatted_parts.append(f"\n{i}. {r.title}")
            formatted_parts.append(f"   URL: {r.url}")
            formatted_parts.append(f"   {r.snippet}\n")

        return {
            "success": True,
            "query": query,
            "results": [
                {
                    "title": r.title,
                    "url": r.url,
                    "snippet": r.snippet,
                    "source": r.source,
                }
                for r in results
            ],
            "formatted": "\n".join(formatted_parts),
        }


# Convenience functions


async def web_search(query: str, top_k: int = 5) -> list[SearchResult]:
    """Convenience function for web search.

    Args:
        query: Search query.
        top_k: Number of results.

    Returns:
        List of search results.
    """
    skill = WebSearchSkill()
    return await skill.search(query, top_k)


async def quick_search(query: str) -> str:
    """Quick search returning formatted results.

    Args:
        query: Search query.

    Returns:
        Formatted search results.
    """
    skill = WebSearchSkill()
    result = await skill.search_and_summarize(query, top_k=3)
    return result.get("formatted", "No results found.")
