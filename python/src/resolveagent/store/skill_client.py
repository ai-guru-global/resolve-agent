"""Skill store client for Go platform REST API."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from resolveagent.store.base_client import BaseStoreClient

logger = logging.getLogger(__name__)


@dataclass
class SkillInfo:
    """Skill definition from Go platform."""

    name: str
    version: str = "1.0.0"
    description: str = ""
    author: str = ""
    skill_type: str = "general"
    domain: str = ""
    tags: list[str] = field(default_factory=list)
    manifest: dict[str, Any] = field(default_factory=dict)
    source_type: str = ""
    source_uri: str = ""
    status: str = "active"
    labels: dict[str, str] = field(default_factory=dict)


class SkillStoreClient(BaseStoreClient):
    """HTTP client for Go platform skill registry API.

    Registers skills via POST /api/v1/skills.
    """

    async def register_skill(self, skill_data: dict[str, Any]) -> dict[str, Any] | None:
        """Register a skill with the Go platform skill registry.

        Args:
            skill_data: Skill definition dict matching SkillDefinition JSON schema.

        Returns:
            Registered skill dict or None on error.
        """
        if not self._client:
            raise RuntimeError("SkillStoreClient not connected")

        try:
            response = await self._client.post("/api/v1/skills", json=skill_data)
            if response.status_code == 409:
                # Skill already exists — update via PUT or just log
                logger.info(
                    "Skill already registered",
                    extra={"skill_name": skill_data.get("name")}
                )
                return skill_data
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(
                "Failed to register skill",
                extra={"skill_name": skill_data.get("name"), "error": str(e)}
            )
            return None

    async def list_skills(self) -> list[dict[str, Any]]:
        """List all registered skills."""
        if not self._client:
            raise RuntimeError("SkillStoreClient not connected")

        try:
            response = await self._client.get("/api/v1/skills")
            response.raise_for_status()
            data = response.json()
            return data.get("skills", [])
        except Exception as e:
            logger.error("Failed to list skills", extra={"error": str(e)})
            return []

    async def get_skill(self, name: str) -> dict[str, Any] | None:
        """Get a single skill by name."""
        if not self._client:
            raise RuntimeError("SkillStoreClient not connected")

        try:
            response = await self._client.get(f"/api/v1/skills/{name}")
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("Failed to get skill", extra={"skill_name": name, "error": str(e)})
            return None

    async def unregister_skill(self, name: str) -> bool:
        """Unregister a skill by name."""
        if not self._client:
            raise RuntimeError("SkillStoreClient not connected")

        try:
            response = await self._client.delete(f"/api/v1/skills/{name}")
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error(
                "Failed to unregister skill",
                extra={"skill_name": name, "error": str(e)},
            )
            return False
