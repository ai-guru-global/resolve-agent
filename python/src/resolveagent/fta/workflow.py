"""Workflow definition and execution for FTA."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class WorkflowNode:
    """A node in a workflow."""

    id: str
    type: str  # start, end, agent, skill, condition, action
    config: dict[str, Any] = field(default_factory=dict)
    inputs: list[str] = field(default_factory=list)
    outputs: list[str] = field(default_factory=list)


@dataclass
class Workflow:
    """A workflow definition."""

    id: str
    name: str
    description: str = ""
    nodes: list[WorkflowNode] = field(default_factory=list)
    edges: list[dict[str, str]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def get_node(self, node_id: str) -> WorkflowNode | None:
        """Get a node by ID."""
        for node in self.nodes:
            if node.id == node_id:
                return node
        return None

    def get_start_nodes(self) -> list[WorkflowNode]:
        """Get all start nodes."""
        return [n for n in self.nodes if n.type == "start"]

    def get_next_nodes(self, node_id: str) -> list[WorkflowNode]:
        """Get nodes that follow the given node."""
        next_ids = [edge["to"] for edge in self.edges if edge.get("from") == node_id]
        return [n for n in self.nodes if n.id in next_ids]

    def validate(self) -> tuple[bool, list[str]]:
        """Validate the workflow.

        Returns:
            Tuple of (is_valid, list of error messages).
        """
        errors = []

        # Check for start node
        start_nodes = self.get_start_nodes()
        if not start_nodes:
            errors.append("Workflow must have at least one start node")
        if len(start_nodes) > 1:
            errors.append("Workflow should have only one start node")

        # Check for end node
        end_nodes = [n for n in self.nodes if n.type == "end"]
        if not end_nodes:
            errors.append("Workflow must have at least one end node")

        # Check all nodes are reachable
        reachable = set()
        if start_nodes:
            to_visit = [start_nodes[0].id]
            while to_visit:
                current = to_visit.pop()
                if current in reachable:
                    continue
                reachable.add(current)
                for node in self.get_next_nodes(current):
                    if node.id not in reachable:
                        to_visit.append(node.id)

        unreachable = [n.id for n in self.nodes if n.id not in reachable]
        if unreachable:
            errors.append(f"Unreachable nodes: {unreachable}")

        # Check for orphaned nodes (no incoming edges except start)
        for node in self.nodes:
            if node.type == "start":
                continue
            has_input = any(edge.get("to") == node.id for edge in self.edges)
            if not has_input:
                errors.append(f"Node '{node.id}' has no incoming edges")

        return len(errors) == 0, errors

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "nodes": [
                {
                    "id": n.id,
                    "type": n.type,
                    "config": n.config,
                    "inputs": n.inputs,
                    "outputs": n.outputs,
                }
                for n in self.nodes
            ],
            "edges": self.edges,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Workflow:
        """Create from dictionary."""
        return cls(
            id=data["id"],
            name=data["name"],
            description=data.get("description", ""),
            nodes=[
                WorkflowNode(
                    id=n["id"],
                    type=n["type"],
                    config=n.get("config", {}),
                    inputs=n.get("inputs", []),
                    outputs=n.get("outputs", []),
                )
                for n in data.get("nodes", [])
            ],
            edges=data.get("edges", []),
            metadata=data.get("metadata", {}),
        )
