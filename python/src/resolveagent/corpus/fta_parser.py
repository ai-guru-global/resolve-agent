"""FTA Markdown parser — extracts fault trees from kudig FTA documents.

Parses Mermaid diagrams and JSON blocks from Markdown files to construct
FaultTree objects compatible with the ResolveAgent FTA engine.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any

from resolveagent.fta.tree import EventType, FaultTree, FTAEvent, FTAGate, GateType

logger = logging.getLogger(__name__)


@dataclass
class FTAParseResult:
    """Result of parsing an FTA Markdown document."""

    tree: FaultTree
    base_events: dict[str, Any] = field(default_factory=dict)
    workflow: dict[str, Any] = field(default_factory=dict)
    raw_content: str = ""


# ---------------------------------------------------------------------------
# Mermaid parsing helpers
# ---------------------------------------------------------------------------

_MERMAID_BLOCK_RE = re.compile(r"```mermaid\s*\n(.*?)```", re.DOTALL)
_JSON_BLOCK_RE = re.compile(r"```json\s*\n(.*?)```", re.DOTALL)

# Mermaid node patterns (covers common syntax variants)
# A["Label"]  A("Label")  A{{"Label"}}  A["Label"]  A[Label]
_NODE_DEF_RE = re.compile(
    r'^\s*(\w[\w-]*)\s*'              # optional whitespace + node id
    r'(?:'
    r'\["([^"]*?)"\]'                 # ["Label"]
    r'|\("([^"]*?)"\)'               # ("Label")
    r'|\{\{"([^"]*?)"\}\}'           # {{"Label"}}
    r'|\{\{([^}]*?)\}\}'             # {{Label}}
    r'|\[([^\]]*?)\]'                # [Label]
    r')',
    re.MULTILINE,
)

# Edge patterns: A --> B, A -->|text| B, A --- B
_EDGE_RE = re.compile(
    r'(\w[\w-]*)\s*'                  # source
    r'(?:-->|---)'                    # arrow
    r'(?:\|[^|]*\|)?'                # optional label
    r'\s*(\w[\w-]*)',                 # target
)


class FTAMarkdownParser:
    """Parses kudig FTA Markdown files into FaultTree objects."""

    def parse(self, content: str, file_id: str = "") -> FTAParseResult:
        """Parse an FTA Markdown document.

        Args:
            content: Full Markdown text of the FTA document.
            file_id: Identifier derived from the filename (e.g. ``pod-fta``).

        Returns:
            FTAParseResult with the parsed tree and extracted metadata.
        """
        # Extract title from first H1/H2
        title = self._extract_title(content) or file_id

        # 1. Extract and parse Mermaid diagram
        mermaid_blocks = _MERMAID_BLOCK_RE.findall(content)
        tree = self._parse_mermaid(mermaid_blocks, file_id, title) if mermaid_blocks else self._empty_tree(file_id, title)

        # 2. Extract JSON blocks
        json_blocks = _JSON_BLOCK_RE.findall(content)
        base_events, workflow = self._categorise_json_blocks(json_blocks)

        # 3. Enrich tree events with base event parameters
        if base_events:
            self._enrich_events(tree, base_events)

        return FTAParseResult(
            tree=tree,
            base_events=base_events,
            workflow=workflow,
            raw_content=content,
        )

    # ------------------------------------------------------------------
    # Mermaid -> FaultTree
    # ------------------------------------------------------------------

    def _parse_mermaid(
        self, mermaid_blocks: list[str], file_id: str, title: str
    ) -> FaultTree:
        """Convert the first Mermaid diagram into a FaultTree."""
        diagram = mermaid_blocks[0]

        # Collect node definitions
        nodes: dict[str, str] = {}  # id -> label
        for m in _NODE_DEF_RE.finditer(diagram):
            node_id = m.group(1)
            label = m.group(2) or m.group(3) or m.group(4) or m.group(5) or m.group(6) or node_id
            nodes[node_id] = label

        # Collect edges
        edges: list[tuple[str, str]] = []  # (source, target)
        for m in _EDGE_RE.finditer(diagram):
            src, tgt = m.group(1), m.group(2)
            edges.append((src, tgt))
            # Ensure nodes referenced by edges exist
            nodes.setdefault(src, src)
            nodes.setdefault(tgt, tgt)

        if not nodes:
            return self._empty_tree(file_id, title)

        # Build parent→children map and child→parents map
        children_of: dict[str, list[str]] = {nid: [] for nid in nodes}
        parents_of: dict[str, list[str]] = {nid: [] for nid in nodes}
        for src, tgt in edges:
            children_of.setdefault(src, []).append(tgt)
            parents_of.setdefault(tgt, []).append(src)

        # Determine top event (no parents)
        roots = [nid for nid in nodes if not parents_of.get(nid)]
        top_event_id = roots[0] if roots else next(iter(nodes))

        # Determine leaf events (no children)
        leaves = {nid for nid in nodes if not children_of.get(nid)}

        # Classify nodes into events and gates
        events: list[FTAEvent] = []
        gates: list[FTAGate] = []

        # Gate detection: nodes whose labels contain OR/AND keywords
        gate_ids: set[str] = set()
        for nid, label in nodes.items():
            upper = label.upper().strip()
            if upper in ("OR", "AND") or "OR" in upper.split() or "AND" in upper.split():
                gate_ids.add(nid)

        # Build gates from detected gate nodes
        gate_counter = 0
        for nid in gate_ids:
            label = nodes[nid].upper().strip()
            if "AND" in label:
                gate_type = GateType.AND
            else:
                gate_type = GateType.OR

            gate_counter += 1
            # Inputs are the children of this gate node
            input_ids = children_of.get(nid, [])
            # Output is the parent of this gate node
            parent_ids = parents_of.get(nid, [])
            output_id = parent_ids[0] if parent_ids else ""

            gates.append(
                FTAGate(
                    id=nid,
                    name=nodes[nid],
                    gate_type=gate_type,
                    input_ids=input_ids,
                    output_id=output_id,
                )
            )

        # Build events for non-gate nodes
        for nid, label in nodes.items():
            if nid in gate_ids:
                continue

            if nid == top_event_id:
                etype = EventType.TOP
            elif nid in leaves:
                etype = EventType.BASIC
            else:
                etype = EventType.INTERMEDIATE

            events.append(
                FTAEvent(
                    id=nid,
                    name=label,
                    description="",
                    event_type=etype,
                    evaluator="",
                    parameters={},
                )
            )

        # For intermediate nodes that have children but no gate defined,
        # synthesize an implicit OR gate.
        non_gate_parents = {
            nid
            for nid in nodes
            if nid not in gate_ids
            and nid not in leaves
            and children_of.get(nid)
        }
        for nid in non_gate_parents:
            child_list = children_of[nid]
            # Only create gate if children exist and are not already handled
            if child_list:
                gate_id = f"gate-{nid}"
                gates.append(
                    FTAGate(
                        id=gate_id,
                        name=f"Gate for {nodes[nid]}",
                        gate_type=GateType.OR,
                        input_ids=child_list,
                        output_id=nid,
                    )
                )

        return FaultTree(
            id=file_id or "fta-tree",
            name=title,
            description=f"Auto-imported from kudig-database: {file_id}",
            top_event_id=top_event_id,
            events=events,
            gates=gates,
        )

    # ------------------------------------------------------------------
    # JSON block handling
    # ------------------------------------------------------------------

    def _categorise_json_blocks(
        self, json_blocks: list[str]
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        """Separate JSON blocks into base_events and workflow dicts."""
        base_events: dict[str, Any] = {}
        workflow: dict[str, Any] = {}

        for block in json_blocks:
            try:
                data = json.loads(block)
            except json.JSONDecodeError:
                logger.debug("Skipping malformed JSON block")
                continue

            if isinstance(data, dict):
                # Heuristic: workflow blocks have "flow_steps" key
                if "flow_steps" in data:
                    workflow = data
                # Base events often keyed by event name
                elif any(
                    isinstance(v, dict) and ("severity" in v or "probability" in v)
                    for v in data.values()
                ):
                    base_events = data
                else:
                    # Store first unclassified dict as base_events
                    if not base_events:
                        base_events = data
            elif isinstance(data, list):
                # A list of event defs
                for item in data:
                    if isinstance(item, dict) and "id" in item:
                        base_events[item["id"]] = item

        return base_events, workflow

    def _enrich_events(self, tree: FaultTree, base_events: dict[str, Any]) -> None:
        """Merge base event parameters into matching FTAEvents."""
        event_map = {e.id: e for e in tree.events}
        for event_id, params in base_events.items():
            if not isinstance(params, dict):
                continue
            event = event_map.get(event_id)
            if event is not None:
                event.parameters.update(params)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_title(content: str) -> str | None:
        m = re.search(r"^#\s+(.+)$", content, re.MULTILINE)
        return m.group(1).strip() if m else None

    @staticmethod
    def _empty_tree(file_id: str, title: str) -> FaultTree:
        return FaultTree(
            id=file_id or "empty",
            name=title or "Empty Tree",
            description="No Mermaid diagram found",
            top_event_id="",
            events=[],
            gates=[],
        )
