"""Python code parser using the standard library ast module."""

from __future__ import annotations

import ast
import logging

from resolveagent.code_analysis.parsers.base import (
    BaseParser,
    CallNode,
    FunctionNode,
    ImportNode,
    ParsedFile,
)

logger = logging.getLogger(__name__)


class PythonParser(BaseParser):
    """Python code parser using the ``ast`` module."""

    def __init__(self) -> None:
        self._language = "python"
        self._extensions = [".py"]

    @property
    def language(self) -> str:
        return self._language

    @property
    def file_extensions(self) -> list[str]:
        return self._extensions

    def parse(self, code: str) -> ParsedFile:
        """Parse Python source code.

        Args:
            code: Python source code string.

        Returns:
            ParsedFile with extracted information.
        """
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            return ParsedFile(
                language=self._language,
                errors=[f"Syntax error: {e}"],
            )

        extractor = _Extractor(code)
        extractor.visit(tree)

        return ParsedFile(
            language=self._language,
            functions=extractor.functions,
            calls=extractor.calls,
            imports=extractor.imports,
            raw_ast=tree,
        )

    def extract_call_graph(self, parsed: ParsedFile) -> dict[str, list[str]]:
        """Extract call graph from parsed file."""
        graph: dict[str, list[str]] = {}
        func_names = {f.name for f in parsed.functions}

        for func in parsed.functions:
            callees = [call.callee for call in parsed.calls if call.caller == func.name and call.callee in func_names]
            if callees:
                graph[func.name] = callees

        return graph


class _Extractor(ast.NodeVisitor):
    """AST visitor that extracts functions, calls, and imports."""

    def __init__(self, code: str) -> None:
        self.code = code
        self.functions: list[FunctionNode] = []
        self.calls: list[CallNode] = []
        self.imports: list[ImportNode] = []
        self._current_function: str | None = None

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:  # noqa: N802
        self._add_function(node)
        prev = self._current_function
        self._current_function = node.name
        self.generic_visit(node)
        self._current_function = prev

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:  # noqa: N802
        self._add_function(node)
        prev = self._current_function
        self._current_function = node.name
        self.generic_visit(node)
        self._current_function = prev

    def _add_function(self, node: ast.FunctionDef | ast.AsyncFunctionDef) -> None:
        params = [arg.arg for arg in node.args.args]
        params += [arg.arg for arg in node.args.kwonlyargs]
        if node.args.vararg:
            params.append(node.args.vararg.arg)
        if node.args.kwarg:
            params.append(node.args.kwarg.arg)

        docstring = ast.get_docstring(node) or ""
        decorators = [self._node_name(d) for d in node.decorator_list]

        self.functions.append(
            FunctionNode(
                name=node.name,
                start_line=node.lineno,
                end_line=node.end_lineno or node.lineno,
                parameters=params,
                docstring=docstring,
                decorators=decorators,
            )
        )

    def visit_Call(self, node: ast.Call) -> None:  # noqa: N802
        callee = self._node_name(node.func)
        if callee:
            self.calls.append(
                CallNode(
                    callee=callee,
                    caller=self._current_function or "__global__",
                    line=node.lineno,
                )
            )
        self.generic_visit(node)

    def visit_Import(self, node: ast.Import) -> None:  # noqa: N802
        for alias in node.names:
            self.imports.append(
                ImportNode(
                    module=alias.name,
                    line=node.lineno,
                )
            )
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:  # noqa: N802
        module = node.module or ""
        symbols = [alias.name for alias in node.names]
        self.imports.append(
            ImportNode(
                module=module,
                symbols=symbols,
                line=node.lineno,
                is_relative=node.level is not None and node.level > 0,
            )
        )
        self.generic_visit(node)

    def _node_name(self, node: ast.AST) -> str:
        """Get a string representation of a node."""
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            return f"{self._node_name(node.value)}.{node.attr}"
        if isinstance(node, ast.Subscript):
            return self._node_name(node.value)
        if isinstance(node, ast.Call):
            return self._node_name(node.func)
        return ""
