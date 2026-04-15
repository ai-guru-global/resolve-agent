"""Call graph builder using AST-derived call relationships.

Builds in-memory call graphs starting from detected entry points
and stores the results via the CallGraphClient.
"""

from __future__ import annotations

import logging
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from resolveagent.code_analysis.ast_parser import (
    ASTParser,
    CallSite,
    FunctionDef,
    ParsedModule,
)

logger = logging.getLogger(__name__)


@dataclass
class GraphNode:
    """Node in a call graph."""

    id: str
    function_name: str
    file_path: str = ""
    line_start: int = 0
    line_end: int = 0
    package: str = ""
    node_type: str = "internal"  # entry | internal | external
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class GraphEdge:
    """Edge in a call graph."""

    caller_id: str
    callee_id: str
    call_type: str = "direct"  # direct | indirect | dynamic
    weight: int = 1
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class CallGraphResult:
    """Result of building a call graph from source files."""

    nodes: list[GraphNode] = field(default_factory=list)
    edges: list[GraphEdge] = field(default_factory=list)
    entry_points: list[str] = field(default_factory=list)
    max_depth_reached: int = 0
    stats: dict[str, Any] = field(default_factory=dict)


class CallGraphBuilder:
    """Build call graphs from source code via AST analysis.

    Usage::

        builder = CallGraphBuilder(parser=ASTParser())
        result = builder.build("/path/to/repo", language="python", max_depth=10)
    """

    def __init__(self, parser: ASTParser | None = None) -> None:
        self._parser = parser or ASTParser()

    def build(
        self,
        repo_path: str,
        language: str | None = None,
        entry_points: list[str] | None = None,
        max_depth: int = 10,
        exclude_patterns: list[str] | None = None,
    ) -> CallGraphResult:
        """Build a call graph from the repository source files.

        Args:
            repo_path: Root directory of the repository.
            language: Language filter. When ``None``, all supported languages
                are parsed.
            entry_points: Explicit list of entry function names. When ``None``,
                entry points are auto-detected from decorators / conventions.
            max_depth: Maximum BFS traversal depth from entry points.
            exclude_patterns: Glob patterns of files to skip (e.g. ``["*_test.py"]``).

        Returns:
            A ``CallGraphResult`` containing discovered nodes and edges.
        """
        root = Path(repo_path)
        if not root.is_dir():
            logger.warning("Repository path %s is not a directory", repo_path)
            return CallGraphResult(stats={"error": "invalid_repo_path"})

        # Collect source files
        source_files = self._collect_source_files(root, language, exclude_patterns)
        logger.info("Collected %d source files from %s", len(source_files), repo_path)

        # Parse all files
        modules: list[ParsedModule] = []
        for fp in source_files:
            mod = self._parser.parse_file(str(fp), language)
            modules.append(mod)

        # Build function index and call index
        func_index, call_index = self._build_indexes(modules)

        # Determine entry points
        resolved_entries = self._resolve_entry_points(
            entry_points, func_index, modules
        )
        logger.info("Resolved %d entry points", len(resolved_entries))

        # BFS from entry points
        result = self._bfs_traverse(
            resolved_entries, func_index, call_index, max_depth
        )

        result.stats = {
            "files_parsed": len(source_files),
            "total_functions": len(func_index),
            "total_calls": sum(len(calls) for calls in call_index.values()),
            "nodes_discovered": len(result.nodes),
            "edges_discovered": len(result.edges),
            "entry_points": len(result.entry_points),
        }

        return result

    def _collect_source_files(
        self,
        root: Path,
        language: str | None,
        exclude_patterns: list[str] | None,
    ) -> list[Path]:
        """Collect source files matching the language filter."""
        lang_extensions: dict[str, list[str]] = {
            "python": [".py"],
            "go": [".go"],
            "javascript": [".js", ".jsx"],
            "typescript": [".ts", ".tsx"],
            "java": [".java"],
        }

        if language:
            exts = lang_extensions.get(language, [f".{language}"])
        else:
            exts = [ext for group in lang_extensions.values() for ext in group]

        excludes = exclude_patterns or []
        files: list[Path] = []

        for ext in exts:
            for fp in root.rglob(f"*{ext}"):
                # Skip hidden dirs and common non-source directories
                parts = fp.relative_to(root).parts
                if any(p.startswith(".") or p in ("node_modules", "vendor", "__pycache__", "venv", ".venv") for p in parts):
                    continue
                if any(fp.match(pat) for pat in excludes):
                    continue
                files.append(fp)

        return sorted(files)

    @staticmethod
    def _build_indexes(
        modules: list[ParsedModule],
    ) -> tuple[dict[str, FunctionDef], dict[str, list[CallSite]]]:
        """Build a function name → definition index and a caller → calls index."""
        func_index: dict[str, FunctionDef] = {}
        call_index: dict[str, list[CallSite]] = {}

        for mod in modules:
            for func in mod.functions:
                key = f"{mod.file_path}::{func.name}"
                func_index[key] = func
                # Also index by simple name for cross-file resolution
                if func.name not in func_index:
                    func_index[func.name] = func

            for call in mod.calls:
                caller_key = call.caller or "<module>"
                call_index.setdefault(caller_key, []).append(call)

        return func_index, call_index

    @staticmethod
    def _resolve_entry_points(
        explicit: list[str] | None,
        func_index: dict[str, FunctionDef],
        modules: list[ParsedModule],
    ) -> list[str]:
        """Resolve entry point function keys."""
        if explicit:
            resolved = []
            for ep in explicit:
                if ep in func_index:
                    resolved.append(ep)
                else:
                    # Try partial match
                    for key in func_index:
                        if key.endswith(f"::{ep}") or key == ep:
                            resolved.append(key)
                            break
            return resolved

        # Auto-detect from decorators / conventions
        entries: list[str] = []
        for mod in modules:
            for func in mod.functions:
                if func.is_entry_point:
                    key = f"{mod.file_path}::{func.name}"
                    entries.append(key)

        # If no decorated entries found, fall back to common names
        if not entries:
            common_names = {"main", "app", "handler", "run", "execute"}
            for key, func in func_index.items():
                if func.name in common_names:
                    entries.append(key)

        return entries

    def _bfs_traverse(
        self,
        entry_keys: list[str],
        func_index: dict[str, FunctionDef],
        call_index: dict[str, list[CallSite]],
        max_depth: int,
    ) -> CallGraphResult:
        """BFS traversal from entry points to build the graph."""
        nodes: dict[str, GraphNode] = {}
        edges: list[GraphEdge] = []
        visited: set[str] = set()
        max_depth_reached = 0

        # Queue items: (function_key, depth)
        queue: deque[tuple[str, int]] = deque()

        # Seed the queue with entry points
        for key in entry_keys:
            func = func_index.get(key)
            if func is None:
                continue
            node = GraphNode(
                id=key,
                function_name=func.name,
                file_path=func.file_path,
                line_start=func.line_start,
                line_end=func.line_end,
                package=func.package,
                node_type="entry",
            )
            nodes[key] = node
            queue.append((key, 0))
            visited.add(key)

        while queue:
            current_key, depth = queue.popleft()
            max_depth_reached = max(max_depth_reached, depth)

            if depth >= max_depth:
                continue

            current_func = func_index.get(current_key)
            if current_func is None:
                continue

            # Find calls made by this function
            caller_name = current_func.name
            calls = call_index.get(caller_name, [])

            for call in calls:
                callee_name = call.callee
                # Resolve callee to a known function
                callee_key = self._resolve_callee(callee_name, func_index)

                if callee_key is None:
                    # External / unresolved call - create phantom node
                    callee_key = f"<external>::{callee_name}"
                    if callee_key not in nodes:
                        nodes[callee_key] = GraphNode(
                            id=callee_key,
                            function_name=callee_name,
                            node_type="external",
                        )

                # Add edge
                edges.append(GraphEdge(
                    caller_id=current_key,
                    callee_id=callee_key,
                    call_type="direct",
                ))

                # Enqueue if not visited and not external
                if callee_key not in visited and not callee_key.startswith("<external>"):
                    visited.add(callee_key)
                    callee_func = func_index.get(callee_key)
                    if callee_func and callee_key not in nodes:
                        nodes[callee_key] = GraphNode(
                            id=callee_key,
                            function_name=callee_func.name,
                            file_path=callee_func.file_path,
                            line_start=callee_func.line_start,
                            line_end=callee_func.line_end,
                            package=callee_func.package,
                            node_type="internal",
                        )
                    queue.append((callee_key, depth + 1))

        return CallGraphResult(
            nodes=list(nodes.values()),
            edges=edges,
            entry_points=entry_keys,
            max_depth_reached=max_depth_reached,
        )

    @staticmethod
    def _resolve_callee(
        callee_name: str, func_index: dict[str, FunctionDef]
    ) -> str | None:
        """Resolve a callee name to a function index key."""
        # Direct match
        if callee_name in func_index:
            return callee_name

        # Try matching by suffix (handles module-qualified calls)
        for key in func_index:
            if key.endswith(f"::{callee_name}"):
                return key
            # Handle method calls like "self.foo" → "ClassName.foo"
            if "." in callee_name:
                simple = callee_name.split(".")[-1]
                if key.endswith(f"::{simple}") or key.endswith(f".{simple}"):
                    return key

        return None
