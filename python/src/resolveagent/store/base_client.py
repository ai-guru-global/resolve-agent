"""Base HTTP store client for Go platform REST API."""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class BaseStoreClient:
    """Base HTTP client for Go platform store APIs.

    Follows the same pattern as RegistryClient but for store endpoints.
    All store clients inherit from this to share connection management.
    """

    def __init__(
        self,
        address: str = "localhost:8080",
        timeout: float = 30.0,
    ) -> None:
        self._address = address
        self._timeout = timeout
        self._base_url = f"http://{address}"
        self._client: httpx.AsyncClient | None = None

    async def connect(self) -> None:
        """Establish HTTP connection."""
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=self._timeout,
        )
        logger.info("Store client connected", extra={"address": self._address})

    async def close(self) -> None:
        """Close the HTTP connection."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any] | None:
        """Make a GET request."""
        if not self._client:
            raise RuntimeError("Store client not connected")
        try:
            response = await self._client.get(path, params=params)
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Store GET failed: {path}", extra={"error": str(e)})
            return None

    async def _post(self, path: str, data: dict[str, Any]) -> dict[str, Any] | None:
        """Make a POST request."""
        if not self._client:
            raise RuntimeError("Store client not connected")
        try:
            response = await self._client.post(path, json=data)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Store POST failed: {path}", extra={"error": str(e)})
            return None

    async def _put(self, path: str, data: dict[str, Any]) -> dict[str, Any] | None:
        """Make a PUT request."""
        if not self._client:
            raise RuntimeError("Store client not connected")
        try:
            response = await self._client.put(path, json=data)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Store PUT failed: {path}", extra={"error": str(e)})
            return None

    async def _delete(self, path: str) -> dict[str, Any] | None:
        """Make a DELETE request."""
        if not self._client:
            raise RuntimeError("Store client not connected")
        try:
            response = await self._client.delete(path)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Store DELETE failed: {path}", extra={"error": str(e)})
            return None
