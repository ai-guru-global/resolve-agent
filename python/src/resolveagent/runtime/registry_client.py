"""gRPC client for querying Go Registry.

This module provides the Python runtime with access to the Go Registry,
implementing the single-source-of-truth pattern where Go manages all
service registration and Python queries through gRPC.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, AsyncIterator

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
    """gRPC client for querying Go Registry.

    This client connects to the Go platform service to query the registry,
    which serves as the single source of truth for all service discovery.
    Python agents use this client instead of maintaining their own registry.

    Architecture:
    ```
    ┌─────────────────────────────────────────────────────────────────┐
    │                     Go Platform Service                          │
    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
    │  │   Agent     │  │    Skill    │  │    Model Router         │  │
    │  │  Registry   │  │  Registry   │  │  (Higress Integration)  │  │
    │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
    │                          │                                       │
    │                   RegistryService                                │
    │                     (gRPC API)                                   │
    └──────────────────────────┬──────────────────────────────────────┘
                               │ gRPC
                               ▼
    ┌──────────────────────────────────────────────────────────────────┐
    │                   Python Agent Runtime                            │
    │                                                                   │
    │  ┌────────────────────────────────────────────────────────────┐  │
    │  │                    RegistryClient                            │  │
    │  │  - GetAgent, ListAgents                                      │  │
    │  │  - GetSkill, ListSkills                                      │  │
    │  │  - GetModelRoute (returns Higress endpoint)                  │  │
    │  │  - WatchRegistry (streaming updates)                         │  │
    │  └────────────────────────────────────────────────────────────┘  │
    │                          │                                        │
    │         ┌────────────────┼────────────────┐                      │
    │         ▼                ▼                ▼                      │
    │  IntelligentSelector  SkillExecutor  LLMProvider                 │
    └──────────────────────────────────────────────────────────────────┘
    ```

    Usage:
        ```python
        client = RegistryClient("localhost:9090")
        await client.connect()

        # Get agent info for routing decisions
        agent = await client.get_agent("mega-agent-001")

        # List available skills
        skills = await client.list_skills()

        # Get model endpoint through Higress
        model = await client.get_model_route("qwen-plus")
        # model.gateway_endpoint = "/llm/models/qwen-plus"

        # Watch for registry changes
        async for event in client.watch_registry():
            print(f"Registry change: {event.event_type} {event.resource_type}")
        ```
    """

    def __init__(
        self,
        address: str = "localhost:9090",
        timeout: float = 30.0,
    ) -> None:
        """Initialize the registry client.

        Args:
            address: Go platform gRPC address.
            timeout: Default timeout for gRPC calls.
        """
        self._address = address
        self._timeout = timeout
        self._channel = None
        self._stub = None
        self._connected = False

        # Local cache for frequently accessed data
        self._agent_cache: dict[str, AgentInfo] = {}
        self._skill_cache: dict[str, SkillInfo] = {}
        self._model_cache: dict[str, ModelRouteInfo] = {}
        self._cache_ttl = 60.0  # seconds

    async def connect(self) -> None:
        """Establish connection to the Go platform service."""
        try:
            # In production, this would use grpc.aio
            # import grpc
            # self._channel = grpc.aio.insecure_channel(self._address)
            # from resolveagent.api.resolveagent.v1 import registry_pb2_grpc
            # self._stub = registry_pb2_grpc.RegistryServiceStub(self._channel)
            
            logger.info("Connecting to Go Registry", extra={"address": self._address})
            self._connected = True
            logger.info("Connected to Go Registry")
        except Exception as e:
            logger.error("Failed to connect to Go Registry", extra={"error": str(e)})
            raise

    async def close(self) -> None:
        """Close the gRPC connection."""
        if self._channel:
            await self._channel.close()
        self._connected = False
        logger.info("Disconnected from Go Registry")

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

        # TODO: Implement actual gRPC call
        # request = registry_pb2.GetRegistryAgentRequest(id=agent_id)
        # response = await self._stub.GetAgent(request, timeout=self._timeout)
        
        logger.debug("Getting agent from registry", extra={"agent_id": agent_id})
        
        # Placeholder implementation
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
        
        # TODO: Implement actual gRPC call
        # request = registry_pb2.ListRegistryAgentsRequest(
        #     type_filter=type_filter or "",
        #     status_filter=status_filter or "",
        #     label_filter=labels or {},
        # )
        # response = await self._stub.ListAgents(request, timeout=self._timeout)
        
        return []

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
        
        # TODO: Implement actual gRPC call
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
        
        # TODO: Implement actual gRPC call
        return []

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
        
        # TODO: Implement actual gRPC call
        # For now, return a default route structure
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
        
        # TODO: Implement actual gRPC call
        return []

    async def get_default_model(self) -> str:
        """Get the default model ID configured in the gateway.

        Returns:
            Default model ID.
        """
        # TODO: Implement actual gRPC call
        return "qwen-plus"

    async def get_workflow(self, workflow_id: str) -> WorkflowInfo | None:
        """Get workflow information by ID.

        Args:
            workflow_id: The workflow ID.

        Returns:
            WorkflowInfo or None if not found.
        """
        logger.debug("Getting workflow from registry", extra={"workflow": workflow_id})
        
        # TODO: Implement actual gRPC call
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
        
        # TODO: Implement actual gRPC call
        return []

    async def get_service_endpoint(self, service_name: str) -> ServiceEndpoint | None:
        """Get service endpoint through Higress.

        This returns the gateway path for reaching a service,
        enabling all traffic to flow through Higress.

        Args:
            service_name: The service name.

        Returns:
            ServiceEndpoint with gateway_path.
        """
        logger.debug("Getting service endpoint", extra={"service": service_name})
        
        # TODO: Implement actual gRPC call
        return None

    async def watch_registry(
        self,
        resource_types: list[str] | None = None,
        labels: dict[str, str] | None = None,
    ) -> AsyncIterator[RegistryEvent]:
        """Watch for registry changes.

        This enables Python runtime to receive real-time updates when
        agents, skills, or models are registered/updated/deleted.

        Args:
            resource_types: Types to watch (empty = all).
            labels: Filter by labels.

        Yields:
            RegistryEvent for each change.
        """
        logger.info("Starting registry watch stream")
        
        # TODO: Implement actual gRPC streaming call
        # request = registry_pb2.WatchRegistryRequest(
        #     resource_types=resource_types or [],
        #     label_filter=labels or {},
        # )
        # async for event in self._stub.WatchRegistry(request):
        #     yield RegistryEvent(...)
        
        # Placeholder: yield nothing
        return
        yield  # Makes this an async generator

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


async def init_registry_client(address: str = "localhost:9090") -> RegistryClient:
    """Initialize and connect the global registry client.

    Args:
        address: Go platform gRPC address.

    Returns:
        The connected RegistryClient.
    """
    global _registry_client
    _registry_client = RegistryClient(address)
    await _registry_client.connect()
    return _registry_client
