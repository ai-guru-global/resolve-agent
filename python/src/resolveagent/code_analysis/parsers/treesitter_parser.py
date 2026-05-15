"""Tree-sitter based parsers for Java, Go, and Rust.

Uses tree-sitter grammars to parse multiple languages with a unified interface.
Requires: tree-sitter, tree-sitter-java, tree-sitter-go, tree-sitter-rust
"""

from __future__ import annotations

import logging
from typing import Any

from resolveagent.code_analysis.parsers.base import (
    BaseParser,
    CallNode,
    FunctionNode,
    ImportNode,
    ParsedFile,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tree-sitter Parser Base
# ---------------------------------------------------------------------------


class TreeSitterParserBase(BaseParser):
    """Base class for tree-sitter based parsers."""

    def __init__(self, language: str, file_extensions: list[str]) -> None:
        self._language = language
        self._extensions = file_extensions
        self._parser = None
        self._ts_language = None

    @property
    def language(self) -> str:
        return self._language

    @property
    def file_extensions(self) -> list[str]:
        return self._extensions

    def _ensure_parser(self) -> bool:
        """Ensure tree-sitter parser is initialized.

        Returns:
            True if parser is ready.
        """
        if self._parser is not None:
            return True

        if self._ts_language is None:
            logger.warning(
                "tree-sitter language not loaded for %s",
                self._language,
            )
            return False

        try:
            from tree_sitter import Parser as TSParser

            self._parser = TSParser()
            self._parser.set_language(self._ts_language)
            return True
        except ImportError:
            logger.warning(
                "tree-sitter not installed. Install with: uv add tree-sitter tree-sitter-%s",
                self._language,
            )
            return False

    def parse(self, code: str) -> ParsedFile:
        """Parse source code using tree-sitter.

        Args:
            code: Source code string.

        Returns:
            ParsedFile with extracted information.
        """
        if not self._ensure_parser():
            return ParsedFile(
                language=self._language,
                errors=["tree-sitter not available"],
            )

        assert self._parser is not None

        try:
            tree = self._parser.parse(code.encode("utf-8"))
            root = tree.root_node

            functions = self._extract_functions(root, code)
            calls = self._extract_calls(root, code)
            imports = self._extract_imports(root, code)

            return ParsedFile(
                language=self._language,
                functions=functions,
                calls=calls,
                imports=imports,
                raw_ast=root,
            )
        except Exception as e:
            logger.error("Parse error: %s", e)
            return ParsedFile(
                language=self._language,
                errors=[str(e)],
            )

    def extract_call_graph(self, parsed: ParsedFile) -> dict[str, list[str]]:
        """Extract call graph from parsed file.

        Args:
            parsed: ParsedFile result.

        Returns:
            Mapping from function name to list of callees.
        """
        graph: dict[str, list[str]] = {}

        # Build function name to node mapping
        func_names = {f.name for f in parsed.functions}

        for func in parsed.functions:
            callees = []
            for call in parsed.calls:
                if call.caller == func.name and call.callee in func_names:
                    callees.append(call.callee)
            if callees:
                graph[func.name] = callees

        return graph

    def _extract_functions(self, node: Any, code: str) -> list[FunctionNode]:
        """Extract function definitions from AST."""
        functions: list[FunctionNode] = []
        self._walk_functions(node, code, functions)
        return functions

    def _extract_calls(self, node: Any, code: str) -> list[CallNode]:
        """Extract function calls from AST."""
        calls: list[CallNode] = []
        self._walk_calls(node, code, calls)
        return calls

    def _extract_imports(self, node: Any, code: str) -> list[ImportNode]:
        """Extract imports from AST."""
        imports: list[ImportNode] = []
        self._walk_imports(node, code, imports)
        return imports

    def _walk_functions(self, node: Any, code: str, results: list[FunctionNode]) -> None:
        """Walk AST and extract functions. To be overridden."""
        pass

    def _walk_calls(self, node: Any, code: str, results: list[CallNode]) -> None:
        """Walk AST and extract calls. To be overridden."""
        pass

    def _walk_imports(self, node: Any, code: str, results: list[ImportNode]) -> None:
        """Walk AST and extract imports. To be overridden."""
        pass

    def _node_text(self, node: Any, code: str) -> str:
        """Get text for a node."""
        return code[node.start_byte : node.end_byte]


# ---------------------------------------------------------------------------
# Java Parser
# ---------------------------------------------------------------------------


class TreeSitterJavaParser(TreeSitterParserBase):
    """Java code parser using tree-sitter."""

    def __init__(self) -> None:
        super().__init__("java", [".java"])
        try:
            from tree_sitter_java import language as java_language

            self._ts_language = java_language()
        except ImportError:
            logger.debug("tree-sitter-java not available")

    def _walk_functions(self, node: Any, code: str, results: list[FunctionNode]) -> None:
        """Extract Java methods."""
        if node.type == "method_declaration":
            name_node = next((c for c in node.children if c.type == "identifier"), None)
            name = self._node_text(name_node, code) if name_node else "__anonymous__"

            params_node = next((c for c in node.children if c.type == "formal_parameters"), None)
            params = []
            if params_node:
                for param in params_node.children:
                    if param.type == "formal_parameter":
                        param_name = next(
                            (self._node_text(c, code) for c in param.children if c.type == "identifier"),
                            "",
                        )
                        params.append(param_name)

            results.append(
                FunctionNode(
                    name=name,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    parameters=params,
                )
            )

        for child in node.children:
            self._walk_functions(child, code, results)

    def _walk_calls(self, node: Any, code: str, results: list[CallNode]) -> None:
        """Extract Java method invocations."""
        if node.type == "method_invocation":
            name_node = next((c for c in node.children if c.type == "identifier"), None)
            if name_node:
                callee = self._node_text(name_node, code)
                # Find enclosing method for caller context
                caller = self._find_enclosing_function(node, code)
                results.append(
                    CallNode(
                        callee=callee,
                        caller=caller,
                        line=node.start_point[0] + 1,
                    )
                )

        for child in node.children:
            self._walk_calls(child, code, results)

    def _walk_imports(self, node: Any, code: str, results: list[ImportNode]) -> None:
        """Extract Java imports."""
        if node.type == "import_declaration":
            path_node = next((c for c in node.children if c.type == "scoped_identifier"), None)
            if path_node:
                module = self._node_text(path_node, code)
                results.append(
                    ImportNode(
                        module=module,
                        line=node.start_point[0] + 1,
                    )
                )

        for child in node.children:
            self._walk_imports(child, code, results)

    def _find_enclosing_function(self, node: Any, code: str) -> str:
        """Find the name of the enclosing function."""
        current = node
        while current:
            if current.type == "method_declaration":
                name_node = next(
                    (c for c in current.children if c.type == "identifier"),
                    None,
                )
                if name_node:
                    return self._node_text(name_node, code)
            current = current.parent
        return "__global__"


# ---------------------------------------------------------------------------
# Go Parser
# ---------------------------------------------------------------------------


class TreeSitterGoParser(TreeSitterParserBase):
    """Go code parser using tree-sitter."""

    def __init__(self) -> None:
        super().__init__("go", [".go"])
        try:
            from tree_sitter_go import language as go_language

            self._ts_language = go_language()
        except ImportError:
            logger.debug("tree-sitter-go not available")

    def _walk_functions(self, node: Any, code: str, results: list[FunctionNode]) -> None:
        """Extract Go functions."""
        if node.type == "function_declaration":
            name_node = next((c for c in node.children if c.type == "identifier"), None)
            name = self._node_text(name_node, code) if name_node else "__anonymous__"

            params_node = next((c for c in node.children if c.type == "parameter_list"), None)
            params = []
            if params_node:
                for param in params_node.children:
                    if param.type == "parameter_declaration":
                        param_name = next(
                            (self._node_text(c, code) for c in param.children if c.type == "identifier"),
                            "",
                        )
                        params.append(param_name)

            results.append(
                FunctionNode(
                    name=name,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    parameters=params,
                )
            )

        for child in node.children:
            self._walk_functions(child, code, results)

    def _walk_calls(self, node: Any, code: str, results: list[CallNode]) -> None:
        """Extract Go function calls."""
        if node.type == "call_expression":
            func_node = node.children[0] if node.children else None
            if func_node:
                callee = self._node_text(func_node, code)
                caller = self._find_enclosing_function(node, code)
                results.append(
                    CallNode(
                        callee=callee,
                        caller=caller,
                        line=node.start_point[0] + 1,
                    )
                )

        for child in node.children:
            self._walk_calls(child, code, results)

    def _walk_imports(self, node: Any, code: str, results: list[ImportNode]) -> None:
        """Extract Go imports."""
        if node.type == "import_spec":
            path_node = next((c for c in node.children if c.type == "interpreted_string_literal"), None)
            if path_node:
                module = self._node_text(path_node, code).strip('"')
                results.append(
                    ImportNode(
                        module=module,
                        line=node.start_point[0] + 1,
                    )
                )

        for child in node.children:
            self._walk_imports(child, code, results)

    def _find_enclosing_function(self, node: Any, code: str) -> str:
        """Find the name of the enclosing function."""
        current = node
        while current:
            if current.type == "function_declaration":
                name_node = next(
                    (c for c in current.children if c.type == "identifier"),
                    None,
                )
                if name_node:
                    return self._node_text(name_node, code)
            current = current.parent
        return "__global__"


# ---------------------------------------------------------------------------
# Rust Parser
# ---------------------------------------------------------------------------


class TreeSitterRustParser(TreeSitterParserBase):
    """Rust code parser using tree-sitter."""

    def __init__(self) -> None:
        super().__init__("rust", [".rs"])
        try:
            from tree_sitter_rust import language as rust_language

            self._ts_language = rust_language()
        except ImportError:
            logger.debug("tree-sitter-rust not available")

    def _walk_functions(self, node: Any, code: str, results: list[FunctionNode]) -> None:
        """Extract Rust functions."""
        if node.type == "function_item":
            name_node = next((c for c in node.children if c.type == "identifier"), None)
            name = self._node_text(name_node, code) if name_node else "__anonymous__"

            params = []
            params_node = next(
                (c for c in node.children if c.type == "parameters"),
                None,
            )
            if params_node:
                for param in params_node.children:
                    if param.type == "parameter":
                        param_name = next(
                            (self._node_text(c, code) for c in param.children if c.type == "identifier"),
                            "",
                        )
                        params.append(param_name)

            results.append(
                FunctionNode(
                    name=name,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    parameters=params,
                )
            )

        for child in node.children:
            self._walk_functions(child, code, results)

    def _walk_calls(self, node: Any, code: str, results: list[CallNode]) -> None:
        """Extract Rust function calls."""
        if node.type == "call_expression":
            func_node = node.children[0] if node.children else None
            if func_node:
                callee = self._node_text(func_node, code)
                caller = self._find_enclosing_function(node, code)
                results.append(
                    CallNode(
                        callee=callee,
                        caller=caller,
                        line=node.start_point[0] + 1,
                    )
                )

        for child in node.children:
            self._walk_calls(child, code, results)

    def _walk_imports(self, node: Any, code: str, results: list[ImportNode]) -> None:
        """Extract Rust use statements."""
        if node.type == "use_declaration":
            path_node = next((c for c in node.children if c.type == "scoped_use_list"), None)
            if not path_node:
                path_node = next((c for c in node.children if c.type == "identifier"), None)
            if path_node:
                module = self._node_text(path_node, code)
                results.append(
                    ImportNode(
                        module=module,
                        line=node.start_point[0] + 1,
                    )
                )

        for child in node.children:
            self._walk_imports(child, code, results)

    def _find_enclosing_function(self, node: Any, code: str) -> str:
        """Find the name of the enclosing function."""
        current = node
        while current:
            if current.type == "function_item":
                name_node = next(
                    (c for c in current.children if c.type == "identifier"),
                    None,
                )
                if name_node:
                    return self._node_text(name_node, code)
            current = current.parent
        return "__global__"
