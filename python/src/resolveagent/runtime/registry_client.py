"""HTTP client for querying Go Registry.

This module provides the Python runtime with access to the Go Registry,
implementing the single-source-of-truth pattern where Go manages all
service registration and Python queries through HTTP/REST API.

Note: Originally designed for gRPC, but using HTTP/REST as a practical
alternative until protobuf stubs are generated.
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Any, AsyncIterator

import httpx

logger = logging.getLogger(__name__)


@dataclass
class AgentInfo:
    """Agent information from Go Registry."""

    id: str
    name: str
    description: str
    type: str
    status: str
    capabilities: dict[str, Any] = field(default_factory=dict)
    config: dict[str, Any] = field(default_factory=dict)
    labels: dict[str, str] = field(default_factory=dict)


@dataclass
class SkillInfo:
    """Skill information from Go Registry."""

    name: str
    version: str
    description: str
    author: str
    status: str
    manifest: dict[str, Any] = field(default_factory=dict)
    source_type: str = ""
    source_uri: str = ""
    labels: dict[str, str] = field(default_factory=dict)


@dataclass
class ModelRouteInfo:
    """LLM model route information from Go Registry."""

    model_id: str
    provider: str
    gateway_endpoint: str
    enabled: bool = True
    priority: int = 0
    rate_limit: dict[str, int] | None = None
    fallback_models: list[str] = field(default_factory=list)
    labels: dict[str, str] = field(default_factory=dict)


@dataclass
class WorkflowInfo:
    """Workflow information from Go Registry."""

    id: str
    name: str
    description: str
    type: str
    status: str
    definition: dict[str, Any] = field(default_factory=dict)
    labels: dict[str, str] = field(default_factory=dict)


@dataclass
class RAGCollectionInfo:
    """RAG collection information from Go Registry."""

    id: str
    name: str
    description: str
    embedding_model: str
    status: str
    document_count: int = 0
    vector_count: int = 0
    labels: dict[str, str] = field(default_factory=dict)


@dataclass
class ServiceEndpoint:
    """Service endpoint information."""

    name: str
    host: str
    port: int
    protocol: str
    gateway_path: str
    healthy: bool = True


@dataclass
class RegistryEvent:
    """Registry change event."""

    event_type: str  # "created", "updated", "deleted"
    resource_type: str  # "agent", "skill", "workflow", "model"
    resource_id: str
    data: dict[str, Any] = field(default_factory=dict)


class RegistryClient:
    """HTTP client for querying Go Registry.

    This client connects to the Go platform service via HTTP/REST API to query
    the registry, which serves as the single source of truth for all service
    discovery.
    """

    def __init__(
        self,
        address: str = "localhost:8080",
        timeout: float = 30.0,
    ) -> None:
        """Initialize the registry client.

        Args:
            address: Go platform HTTP address (host:port).
            timeout: Default timeout for HTTP calls.
        """
        self._address = address
        self._timeout = timeout
        self._base_url = f"http://{address}"
        self._client: httpx.AsyncClient | None = None
        self._connected = False

        # Local cache for frequently accessed data
        self._agent_cache: dict[str, AgentInfo] = {}
        self._skill_cache: dict[str, SkillInfo] = {}
        self._model_cache: dict[str, ModelRouteInfo] = {}
        self._cache_ttl = 60.0  # seconds

    async def connect(self) -> None:
        """Establish connection to the Go platform service."""
        try:
            self._client = httpx.AsyncClient(
                base_url=self._base_url,
                timeout=self._timeout,
            )
            self._connected = True
            logger.info("Connected to Go Registry", extra={"address": self._address})
        except Exception as e:
            logger.error("Failed to connect to Go Registry", extra={"error": str(e)})
            raise

    async def close(self) -> None:
        """Close the HTTP connection."""
        if self._client:
            await self._client.aclose()
        self._connected = False
        logger.info("Disconnected from Go Registry")

    async def _get(self, path: str) -> dict[str, Any] | None:
        """Make a GET request to the registry."""
        if not self._client:
            raise RuntimeError("Registry client not connected")

        try:
            response = await self._client.get(path)
            if response.status_code == 404:
                return None
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Registry request failed: {path}", extra={"error": str(e)})
            return None

    async def _post(self, path: str, data: dict[str, Any]) -> dict[str, Any] | None:
        """Make a POST request to the registry."""
        if not self._client:
            raise RuntimeError("Registry client not connected")

        try:
            response = await self._client.post(path, json=data)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Registry request failed: {path}", extra={"error": str(e)})
            return None

    async def get_agent(self, agent_id: str) -> AgentInfo | None:
        """Get agent information by ID.

        Args:
            agent_id: The agent ID.

        Returns:
            AgentInfo or None if not found.
        """
        # Check cache first
        if agent_id in self._agent_cache:
            return self._agent_cache[agent_id]

        logger.debug("Getting agent from registry", extra={"agent_id": agent_id})

        data = await self._get(f"/api/v1/agents/{agent_id}")
        if data:
            agent = AgentInfo(
                id=data.get("id", agent_id),
                name=data.get("name", ""),
                description=data.get("description", ""),
                type=data.get("type", ""),
                status=data.get("status", ""),
                capabilities=data.get("capabilities", {}),
                config=data.get("config", {}),
                labels=data.get("labels", {}),
            )
            self._agent_cache[agent_id] = agent
            return agent

        return None

    async def list_agents(
        self,
        type_filter: str | None = None,
        status_filter: str | None = None,
        labels: dict[str, str] | None = None,
    ) -> list[AgentInfo]:
        """List all registered agents.

        Args:
            type_filter: Filter by agent type.
            status_filter: Filter by status.
            labels: Filter by labels.

        Returns:
            List of AgentInfo.
        """
        logger.debug("Listing agents from registry")

        params: dict[str, Any] = {}
        if type_filter:
            params["type"] = type_filter
        if status_filter:
            params["status"] = status_filter

        data = await self._get("/api/v1/agents")
        if not data:
            return []

        agents = []
        for item in data.get("agents", []):
            agents.append(
                AgentInfo(
                    id=item.get("id", ""),
                    name=item.get("name", ""),
                    description=item.get("description", ""),
                    type=item.get("type", ""),
                    status=item.get("status", ""),
                    capabilities=item.get("capabilities", {}),
                    config=item.get("config", {}),
                    labels=item.get("labels", {}),
                )
            )

        return agents

    async def get_skill(self, skill_name: str) -> SkillInfo | None:
        """Get skill information by name.

        Args:
            skill_name: The skill name.

        Returns:
            SkillInfo or None if not found.
        """
        if skill_name in self._skill_cache:
            return self._skill_cache[skill_name]

        logger.debug("Getting skill from registry", extra={"skill": skill_name})

        data = await self._get(f"/api/v1/skills/{skill_name}")
        if data:
            skill = SkillInfo(
                name=data.get("name", skill_name),
                version=data.get("version", ""),
                description=data.get("description", ""),
                author=data.get("author", ""),
                status=data.get("status", ""),
                manifest=data.get("manifest", {}),
                source_type=data.get("source_type", ""),
                source_uri=data.get("source_uri", ""),
                labels=data.get("labels", {}),
            )
            self._skill_cache[skill_name] = skill
            return skill

        return None

    async def list_skills(
        self,
        status_filter: str | None = None,
        labels: dict[str, str] | None = None,
    ) -> list[SkillInfo]:
        """List all registered skills.

        Args:
            status_filter: Filter by status.
            labels: Filter by labels.

        Returns:
            List of SkillInfo.
        """
        logger.debug("Listing skills from registry")

        data = await self._get("/api/v1/skills")
        if not data:
            return []

        skills = []
        for item in data.get("skills", []):
            skills.append(
                SkillInfo(
                    name=item.get("name", ""),
                    version=item.get("version", ""),
                    description=item.get("description", ""),
                    author=item.get("author", ""),
                    status=item.get("status", ""),
                    manifest=item.get("manifest", {}),
                    source_type=item.get("source_type", ""),
                    source_uri=item.get("source_uri", ""),
                    labels=item.get("labels", {}),
                )
            )

        return skills

    async def get_model_route(self, model_id: str) -> ModelRouteInfo | None:
        """Get LLM model route information.

        This returns the Higress gateway endpoint for calling the model,
        enabling centralized traffic management through the gateway.

        Args:
            model_id: The model ID (e.g., "qwen-plus").

        Returns:
            ModelRouteInfo with gateway_endpoint for making LLM calls.
        """
        if model_id in self._model_cache:
            return self._model_cache[model_id]

        logger.debug("Getting model route from registry", extra={"model": model_id})

        data = await self._get(f"/api/v1/models/{model_id}")
        if data:
            route = ModelRouteInfo(
                model_id=data.get("id", model_id),
                provider=data.get("provider", ""),
                gateway_endpoint=data.get("gateway_endpoint", f"/llm/models/{model_id}"),
                enabled=data.get("enabled", True),
                priority=data.get("priority", 0),
                rate_limit=data.get("rate_limit"),
                fallback_models=data.get("fallback_models", []),
                labels=data.get("labels", {}),
            )
            self._model_cache[model_id] = route
            return route

        # Fallback: return default route structure
        return ModelRouteInfo(
            model_id=model_id,
            provider="qwen",
            gateway_endpoint=f"/llm/models/{model_id}",
            enabled=True,
        )

    async def list_model_routes(
        self,
        provider_filter: str | None = None,
        enabled_only: bool = True,
    ) -> list[ModelRouteInfo]:
        """List all available LLM model routes.

        Args:
            provider_filter: Filter by provider.
            enabled_only: Only return enabled routes.

        Returns:
            List of ModelRouteInfo.
        """
        logger.debug("Listing model routes from registry")

        data = await self._get("/api/v1/models")
        if not data:
            return []

        routes = []
        for item in data.get("models", []):
            if enabled_only and not item.get("enabled", True):
                continue
            if provider_filter and item.get("provider") != provider_filter:
                continue

            routes.append(
                ModelRouteInfo(
                    model_id=item.get("id", ""),
                    provider=item.get("provider", ""),
                    gateway_endpoint=item.get("gateway_endpoint", ""),
                    enabled=item.get("enabled", True),
                    priority=item.get("priority", 0),
                    rate_limit=item.get("rate_limit"),
                    fallback_models=item.get("fallback_models", []),
                    labels=item.get("labels", {}),
                )
            )

        return routes

    async def get_default_model(self) -> str:
        """Get the default model ID configured in the gateway.

        Returns:
            Default model ID.
        """
        routes = await self.list_model_routes(enabled_only=True)
        if routes:
            # Return highest priority enabled model
            return max(routes, key=lambda r: r.priority).model_id
        return "qwen-plus"

    async def get_workflow(self, workflow_id: str) -> WorkflowInfo | None:
        """Get workflow information by ID.

        Args:
            workflow_id: The workflow ID.

        Returns:
            WorkflowInfo or None if not found.
        """
        logger.debug("Getting workflow from registry", extra={"workflow": workflow_id})

        data = await self._get(f"/api/v1/workflows/{workflow_id}")
        if data:
            return WorkflowInfo(
                id=data.get("id", workflow_id),
                name=data.get("name", ""),
                description=data.get("description", ""),
                type=data.get("type", ""),
                status=data.get("status", ""),
                definition=data.get("definition", {}),
                labels=data.get("labels", {}),
            )

        return None

    async def list_workflows(
        self,
        type_filter: str | None = None,
        labels: dict[str, str] | None = None,
    ) -> list[WorkflowInfo]:
        """List all registered workflows.

        Args:
            type_filter: Filter by type.
            labels: Filter by labels.

        Returns:
            List of WorkflowInfo.
        """
        logger.debug("Listing workflows from registry")

        data = await self._get("/api/v1/workflows")
        if not data:
            return []

        workflows = []
        for item in data.get("workflows", []):
            workflows.append(
                WorkflowInfo(
                    id=item.get("id", ""),
                    name=item.get("name", ""),
                    description=item.get("description", ""),
                    type=item.get("type", ""),
                    status=item.get("status", ""),
                    definition=item.get("definition", {}),
                    labels=item.get("labels", {}),
                )
            )

        return workflows

    async def get_service_endpoint(self, service_name: str) -> ServiceEndpoint | None:
        """Get service endpoint through Higress.

        Args:
            service_name: The service name.

        Returns:
            ServiceEndpoint with gateway_path.
        """
        logger.debug("Getting service endpoint", extra={"service": service_name})

        # This would typically query a service discovery endpoint
        # For now, return a default structure
        return ServiceEndpoint(
            name=service_name,
            host="localhost",
            port=8080,
            protocol="http",
            gateway_path=f"/services/{service_name}",
            healthy=True,
        )

    async def list_rag_collections(
        self,
        status_filter: str | None = None,
        labels: dict[str, str] | None = None,
    ) -> list[RAGCollectionInfo]:
        """List all registered RAG collections.

        Args:
            status_filter: Filter by status.
            labels: Filter by labels.

        Returns:
            List of RAGCollectionInfo.
        """
        logger.debug("Listing RAG collections from registry")

        data = await self._get("/api/v1/rag/collections")
        if not data:
            return []

        collections = []
        for item in data.get("collections", []):
            collections.append(
                RAGCollectionInfo(
                    id=item.get("id", ""),
                    name=item.get("name", ""),
                    description=item.get("description", ""),
                    embedding_model=item.get("embedding_model", ""),
                    status=item.get("status", ""),
                    document_count=item.get("document_count", 0),
                    vector_count=item.get("vector_count", 0),
                    labels=item.get("labels", {}),
                )
            )

        return collections

    async def watch_registry(
        self,
        resource_types: list[str] | None = None,
        labels: dict[str, str] | None = None,
    ) -> AsyncIterator[RegistryEvent]:
        """Watch for registry changes.

        Note: Currently a placeholder. Full implementation would use
        WebSockets or Server-Sent Events for real-time updates.

        Args:
            resource_types: Types to watch (empty = all).
            labels: Filter by labels.

        Yields:
            RegistryEvent for each change.
        """
        logger.info("Starting registry watch stream")

        # Placeholder: yield nothing
        # Full implementation would establish a WebSocket/SSE connection
        if False:  # This makes the function a proper async generator
            yield RegistryEvent(
                event_type="created",
                resource_type="agent",
                resource_id="placeholder",
            )

    def invalidate_cache(self, resource_type: str | None = None) -> None:
        """Invalidate local cache.

        Args:
            resource_type: Type to invalidate (None = all).
        """
        if resource_type is None or resource_type == "agent":
            self._agent_cache.clear()
        if resource_type is None or resource_type == "skill":
            self._skill_cache.clear()
        if resource_type is None or resource_type == "model":
            self._model_cache.clear()

        logger.debug("Cache invalidated", extra={"type": resource_type or "all"})


# Global singleton instance
_registry_client: RegistryClient | None = None


def get_registry_client() -> RegistryClient:
    """Get the global registry client instance.

    Returns:
        The singleton RegistryClient.
    """
    global _registry_client
    if _registry_client is None:
        _registry_client = RegistryClient()
    return _registry_client


async def init_registry_client(address: str = "localhost:8080") -> RegistryClient:
    """Initialize and connect the global registry client.

    Args:
        address: Go platform HTTP address.

    Returns:
        The connected RegistryClient.
    """
    global _registry_client
    _registry_client = RegistryClient(address)
    await _registry_client.connect()
    return _registry_client
