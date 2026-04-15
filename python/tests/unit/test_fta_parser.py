"""Unit tests for the FTA Markdown parser."""

from resolveagent.corpus.fta_parser import FTAMarkdownParser, FTAParseResult
from resolveagent.fta.tree import EventType, GateType


def _make_parser() -> FTAMarkdownParser:
    return FTAMarkdownParser()


# ---------------------------------------------------------------------------
# Title extraction
# ---------------------------------------------------------------------------


def test_extract_title_from_h1():
    content = "# DNS Resolution Failure FTA\n\nSome content."
    result = _make_parser().parse(content, file_id="dns-fta")
    assert result.tree.name == "DNS Resolution Failure FTA"


def test_fallback_to_file_id_when_no_heading():
    content = "Some content with no heading."
    result = _make_parser().parse(content, file_id="my-fta")
    assert result.tree.name == "my-fta"


# ---------------------------------------------------------------------------
# Mermaid diagram parsing
# ---------------------------------------------------------------------------

SIMPLE_MERMAID = """\
# Service Failure

```mermaid
graph TD
    TOP["Service Unavailable"]
    OR_GATE{{"OR"}}
    A["Network Issue"]
    B["App Crash"]

    TOP --> OR_GATE
    OR_GATE --> A
    OR_GATE --> B
```
"""


def test_parse_mermaid_nodes():
    result = _make_parser().parse(SIMPLE_MERMAID, file_id="svc-fta")
    tree = result.tree

    # Should have extracted non-gate events
    event_ids = {e.id for e in tree.events}
    assert "TOP" in event_ids
    assert "A" in event_ids
    assert "B" in event_ids


def test_parse_mermaid_gate():
    result = _make_parser().parse(SIMPLE_MERMAID, file_id="svc-fta")
    tree = result.tree

    # Should detect the OR gate (with original node ID since it has "OR" label)
    gate_ids = {g.id for g in tree.gates}
    assert "OR_GATE" in gate_ids

    or_gate = next(g for g in tree.gates if g.id == "OR_GATE")
    assert or_gate.gate_type == GateType.OR
    assert set(or_gate.input_ids) == {"A", "B"}
    assert or_gate.output_id == "TOP"


def test_parse_mermaid_event_types():
    result = _make_parser().parse(SIMPLE_MERMAID, file_id="svc-fta")
    tree = result.tree

    event_map = {e.id: e for e in tree.events}
    assert event_map["TOP"].event_type == EventType.TOP
    assert event_map["A"].event_type == EventType.BASIC
    assert event_map["B"].event_type == EventType.BASIC


def test_top_event_id():
    result = _make_parser().parse(SIMPLE_MERMAID, file_id="svc-fta")
    assert result.tree.top_event_id == "TOP"


def test_gate_node_not_in_events():
    """Gate nodes should not appear in the events list."""
    result = _make_parser().parse(SIMPLE_MERMAID, file_id="svc-fta")
    event_ids = {e.id for e in result.tree.events}
    assert "OR_GATE" not in event_ids


# ---------------------------------------------------------------------------
# AND gate detection
# ---------------------------------------------------------------------------

AND_MERMAID = """\
# Dual Failure

```mermaid
graph TD
    TOP["System Down"]
    AND_GATE{{"AND"}}
    C1["Primary Fails"]
    C2["Backup Fails"]

    TOP --> AND_GATE
    AND_GATE --> C1
    AND_GATE --> C2
```
"""


def test_and_gate_detection():
    result = _make_parser().parse(AND_MERMAID, file_id="dual-fta")
    gate = next(g for g in result.tree.gates if g.id == "AND_GATE")
    assert gate.gate_type == GateType.AND


# ---------------------------------------------------------------------------
# No Mermaid -> empty tree
# ---------------------------------------------------------------------------


def test_no_mermaid_gives_empty_tree():
    content = "# Some FTA\n\nJust text, no diagram."
    result = _make_parser().parse(content, file_id="empty-fta")
    assert result.tree.events == []
    assert result.tree.gates == []


# ---------------------------------------------------------------------------
# JSON block parsing
# ---------------------------------------------------------------------------

JSON_CONTENT = """\
# FTA

```mermaid
graph TD
    TOP["Error"]
    EVT1["High Latency"]
    TOP --> EVT1
```

```json
{
    "EVT1": {
        "severity": "P2",
        "probability": 0.3,
        "mttr": "15m"
    }
}
```

```json
{
    "flow_steps": ["step1", "step2"]
}
```
"""


def test_json_base_events_extracted():
    result = _make_parser().parse(JSON_CONTENT, file_id="json-fta")
    assert "EVT1" in result.base_events
    assert result.base_events["EVT1"]["severity"] == "P2"


def test_json_workflow_extracted():
    result = _make_parser().parse(JSON_CONTENT, file_id="json-fta")
    assert "flow_steps" in result.workflow
    assert result.workflow["flow_steps"] == ["step1", "step2"]


def test_enrich_events_from_json():
    result = _make_parser().parse(JSON_CONTENT, file_id="json-fta")
    evt = next(e for e in result.tree.events if e.id == "EVT1")
    assert evt.parameters.get("severity") == "P2"
    assert evt.parameters.get("probability") == 0.3


# ---------------------------------------------------------------------------
# Raw content preserved
# ---------------------------------------------------------------------------


def test_raw_content_preserved():
    result = _make_parser().parse(SIMPLE_MERMAID, file_id="raw")
    assert result.raw_content == SIMPLE_MERMAID


# ---------------------------------------------------------------------------
# Implicit OR gate for intermediate nodes
# ---------------------------------------------------------------------------

IMPLICIT_GATE_MERMAID = """\
# Cascading

```mermaid
graph TD
    ROOT["Root Failure"]
    MID["Intermediate"]
    LEAF1["Leaf 1"]
    LEAF2["Leaf 2"]

    ROOT --> MID
    MID --> LEAF1
    MID --> LEAF2
```
"""


def test_implicit_or_gate_for_intermediate_nodes():
    result = _make_parser().parse(IMPLICIT_GATE_MERMAID, file_id="cascade")
    tree = result.tree
    # MID has children but no explicit gate -> implicit OR gate should be created
    implicit_gates = [g for g in tree.gates if g.output_id == "MID"]
    assert len(implicit_gates) >= 1
    gate = implicit_gates[0]
    assert gate.gate_type == GateType.OR
    assert set(gate.input_ids) == {"LEAF1", "LEAF2"}
