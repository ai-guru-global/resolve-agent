"""FTA tree serialization and deserialization."""

from __future__ import annotations

from typing import Any

import yaml

from resolvenet.fta.tree import EventType, FaultTree, FTAEvent, FTAGate, GateType


def load_tree_from_yaml(yaml_path: str) -> FaultTree:
    """Load a fault tree from a YAML file.

    Args:
        yaml_path: Path to the YAML file.

    Returns:
        Parsed FaultTree instance.
    """
    with open(yaml_path) as f:
        data = yaml.safe_load(f)
    return load_tree_from_dict(data)


def load_tree_from_dict(data: dict[str, Any]) -> FaultTree:
    """Load a fault tree from a dictionary.

    Args:
        data: Dictionary representation of the tree.

    Returns:
        Parsed FaultTree instance.
    """
    tree_data = data.get("tree", data)

    events = []
    for event_data in tree_data.get("events", []):
        events.append(
            FTAEvent(
                id=event_data["id"],
                name=event_data.get("name", event_data["id"]),
                description=event_data.get("description", ""),
                event_type=EventType(event_data.get("type", "basic")),
                evaluator=event_data.get("evaluator", ""),
                parameters=event_data.get("parameters", {}),
            )
        )

    gates = []
    for gate_data in tree_data.get("gates", []):
        gates.append(
            FTAGate(
                id=gate_data["id"],
                name=gate_data.get("name", gate_data["id"]),
                gate_type=GateType(gate_data.get("type", "and")),
                input_ids=gate_data.get("inputs", []),
                output_id=gate_data.get("output", ""),
                k_value=gate_data.get("k_value", 1),
            )
        )

    return FaultTree(
        id=tree_data.get("id", ""),
        name=tree_data.get("name", ""),
        description=tree_data.get("description", ""),
        top_event_id=tree_data.get("top_event_id", ""),
        events=events,
        gates=gates,
    )


def dump_tree_to_yaml(tree: FaultTree) -> str:
    """Serialize a fault tree to YAML string.

    Args:
        tree: The FaultTree to serialize.

    Returns:
        YAML string representation.
    """
    data = {
        "tree": {
            "id": tree.id,
            "name": tree.name,
            "description": tree.description,
            "top_event_id": tree.top_event_id,
            "events": [
                {
                    "id": e.id,
                    "name": e.name,
                    "description": e.description,
                    "type": e.event_type.value,
                    "evaluator": e.evaluator,
                    "parameters": e.parameters,
                }
                for e in tree.events
            ],
            "gates": [
                {
                    "id": g.id,
                    "name": g.name,
                    "type": g.gate_type.value,
                    "inputs": g.input_ids,
                    "output": g.output_id,
                    "k_value": g.k_value,
                }
                for g in tree.gates
            ],
        }
    }
    return yaml.dump(data, default_flow_style=False, sort_keys=False)
