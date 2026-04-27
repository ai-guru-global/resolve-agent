"""AST parser for multi-language source code analysis.

Uses Python's built-in ``ast`` module for Python code and
``tree-sitter`` bindings for other languages.
"""

from __future__ import annotations

import ast
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class FunctionDef:
    """A parsed function definition."""

    name: str
    file_path: str = ""
    line_start: int = 0
    line_end: int = 0
    package: str = ""
    decorators: list[str] = field(default_factory=list)
    calls: list[str] = field(default_factory=list)
    is_entry_point: bool = False


@dataclass
class ClassDef:
    """A parsed class definition."""

    name: str
    file_path: str = ""
    line_start: int = 0
    line_end: int = 0
    methods: list[FunctionDef] = field(default_factory=list)
    bases: list[str] = field(default_factory=list)


@dataclass
class ImportDef:
    """A parsed import statement."""

    module: str
    names: list[str] = field(default_factory=list)
    is_from: bool = False


@dataclass
class CallSite:
    """A parsed function call site."""

    callee: str
    file_path: str = ""
    line: int = 0
    caller: str = ""


@dataclass
class ParsedModule:
    """Result of parsing a single source file."""

    file_path: str
    language: str
    functions: list[FunctionDef] = field(default_factory=list)
    classes: list[ClassDef] = field(default_factory=list)
    imports: list[ImportDef] = field(default_factory=list)
    calls: list[CallSite] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


# Python entry-point decorator patterns
_PYTHON_ENTRY_DECORATORS = frozenset(
    [
        "app.route",
        "app.get",
        "app.post",
        "app.put",
        "app.delete",
        "app.patch",
        "router.get",
        "router.post",
        "router.put",
        "router.delete",
        "api_view",
        "action",
        "task",
        "celery.task",
    ]
)


class _PythonCallVisitor(ast.NodeVisitor):
    """AST visitor that extracts function definitions, calls, and imports."""

    def __init__(self, file_path: str) -> None:
        self.file_path = file_path
        self.functions: list[FunctionDef] = []
        self.classes: list[ClassDef] = []
        self.imports: list[ImportDef] = []
        self.calls: list[CallSite] = []
        self._current_func: str = ""
        self._current_class: str = ""

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:  # noqa: N802
        decorators = []
        is_entry = False
        for dec in node.decorator_list:
            dec_name = self._get_decorator_name(dec)
            decorators.append(dec_name)
            if any(ep in dec_name for ep in _PYTHON_ENTRY_DECORATORS):
                is_entry = True

        qualified = f"{self._current_class}.{node.name}" if self._current_class else node.name
        func = FunctionDef(
            name=qualified,
            file_path=self.file_path,
            line_start=node.lineno,
            line_end=node.end_lineno or node.lineno,
            decorators=decorators,
            is_entry_point=is_entry,
        )

        old_func = self._current_func
        self._current_func = qualified

        # Visit body to find calls
        call_names: list[str] = []
        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                callee = self._get_call_name(child)
                if callee:
                    call_names.append(callee)
                    self.calls.append(
                        CallSite(
                            callee=callee,
                            file_path=self.file_path,
                            line=child.lineno,
                            caller=qualified,
                        )
                    )

        func.calls = call_names
        self.functions.append(func)
        self._current_func = old_func

    visit_AsyncFunctionDef = visit_FunctionDef  # noqa: N815

    def visit_ClassDef(self, node: ast.ClassDef) -> None:  # noqa: N802
        bases = [self._get_name(b) for b in node.bases]
        cls = ClassDef(
            name=node.name,
            file_path=self.file_path,
            line_start=node.lineno,
            line_end=node.end_lineno or node.lineno,
            bases=[b for b in bases if b],
        )

        old_class = self._current_class
        self._current_class = node.name
        self.generic_visit(node)
        self._current_class = old_class

        # Collect methods that were added during class visit
        cls.methods = [f for f in self.functions if f.name.startswith(f"{node.name}.")]
        self.classes.append(cls)

    def visit_Import(self, node: ast.Import) -> None:  # noqa: N802
        for alias in node.names:
            self.imports.append(ImportDef(module=alias.name, names=[alias.asname or alias.name]))

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:  # noqa: N802
        module = node.module or ""
        names = [alias.name for alias in node.names]
        self.imports.append(ImportDef(module=module, names=names, is_from=True))

    @staticmethod
    def _get_decorator_name(node: ast.expr) -> str:
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            parts = []
            current: ast.expr = node
            while isinstance(current, ast.Attribute):
                parts.append(current.attr)
                current = current.value
            if isinstance(current, ast.Name):
                parts.append(current.id)
            return ".".join(reversed(parts))
        if isinstance(node, ast.Call):
            return _PythonCallVisitor._get_decorator_name(node.func)
        return "<unknown>"

    @staticmethod
    def _get_call_name(node: ast.Call) -> str:
        func = node.func
        if isinstance(func, ast.Name):
            return func.id
        if isinstance(func, ast.Attribute):
            parts = []
            current: ast.expr = func
            while isinstance(current, ast.Attribute):
                parts.append(current.attr)
                current = current.value
            if isinstance(current, ast.Name):
                parts.append(current.id)
            return ".".join(reversed(parts))
        return ""

    @staticmethod
    def _get_name(node: ast.expr) -> str:
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            parts = []
            current: ast.expr = node
            while isinstance(current, ast.Attribute):
                parts.append(current.attr)
                current = current.value
            if isinstance(current, ast.Name):
                parts.append(current.id)
            return ".".join(reversed(parts))
        return ""


class ASTParser:
    """Multi-language AST parser.

    Currently supports Python natively. Other languages fall back to
    a basic regex-based heuristic if ``tree-sitter`` is not installed.
    """

    SUPPORTED_LANGUAGES = {"python", "go", "javascript", "typescript", "java"}

    def parse_file(self, file_path: str, language: str | None = None) -> ParsedModule:
        """Parse a source file and return a structured module representation."""
        path = Path(file_path)
        if not path.is_file():
            return ParsedModule(file_path=file_path, language=language or "unknown")

        lang = language or self._detect_language(path)
        source = path.read_text(encoding="utf-8", errors="replace")
        return self.parse_source(source, lang, file_path=file_path)

    def parse_source(self, source: str, language: str, file_path: str = "<string>") -> ParsedModule:
        """Parse source code text and return a structured module representation."""
        if language == "python":
            return self._parse_python(source, file_path)
        # For other languages, try tree-sitter, else fall back to heuristic
        return self._parse_generic(source, language, file_path)

    def _parse_python(self, source: str, file_path: str) -> ParsedModule:
        """Parse Python source using the ``ast`` module."""
        try:
            tree = ast.parse(source, filename=file_path)
        except SyntaxError as e:
            logger.warning("Failed to parse %s: %s", file_path, e)
            return ParsedModule(
                file_path=file_path,
                language="python",
                metadata={"parse_error": str(e)},
            )

        visitor = _PythonCallVisitor(file_path)
        visitor.visit(tree)

        return ParsedModule(
            file_path=file_path,
            language="python",
            functions=visitor.functions,
            classes=visitor.classes,
            imports=visitor.imports,
            calls=visitor.calls,
            metadata={"total_lines": len(source.splitlines())},
        )

    def _parse_generic(self, source: str, language: str, file_path: str) -> ParsedModule:
        """Fallback parser using basic regex patterns."""
        import re

        functions: list[FunctionDef] = []
        calls: list[CallSite] = []
        imports: list[ImportDef] = []

        lines = source.splitlines()

        # Language-specific function patterns
        func_patterns = {
            "go": re.compile(r"^func\s+(?:\(.*?\)\s+)?(\w+)\s*\("),
            "javascript": re.compile(
                r"(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\())",
                re.MULTILINE,
            ),
            "typescript": re.compile(
                r"(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\())",
                re.MULTILINE,
            ),
            "java": re.compile(r"(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)+(\w+)\s*\("),
        }

        # Entry-point patterns per language
        entry_patterns = {
            "go": re.compile(r'(?:HandleFunc|Handle|Get|Post|Put|Delete)\s*\(\s*"'),
            "javascript": re.compile(r"(?:app|router)\.\s*(?:get|post|put|delete|patch)\s*\("),
            "typescript": re.compile(r"(?:app|router)\.\s*(?:get|post|put|delete|patch)\s*\("),
            "java": re.compile(r"@(?:GetMapping|PostMapping|RequestMapping|DeleteMapping|PutMapping)"),
        }

        func_re = func_patterns.get(language)
        entry_re = entry_patterns.get(language)

        for i, line in enumerate(lines, 1):
            # Detect functions
            if func_re:
                m = func_re.search(line)
                if m:
                    name = m.group(1) or (m.group(2) if m.lastindex and m.lastindex >= 2 else "")
                    if name:
                        functions.append(
                            FunctionDef(
                                name=name,
                                file_path=file_path,
                                line_start=i,
                                line_end=i,
                            )
                        )

            # Detect entry points
            if entry_re and entry_re.search(line) and functions:
                functions[-1].is_entry_point = True

        # Simple import detection
        import_patterns = {
            "go": re.compile(r'^\s*"([\w./]+)"'),
            "javascript": re.compile(r"(?:import|require)\s*\(?['\"]([^'\"]+)['\"]"),
            "typescript": re.compile(r"(?:import|require)\s*\(?['\"]([^'\"]+)['\"]"),
            "java": re.compile(r"^import\s+([\w.]+);"),
        }
        import_re = import_patterns.get(language)
        if import_re:
            for line in lines:
                m = import_re.search(line)
                if m:
                    imports.append(ImportDef(module=m.group(1)))

        return ParsedModule(
            file_path=file_path,
            language=language,
            functions=functions,
            imports=imports,
            calls=calls,
            metadata={"total_lines": len(lines), "parser": "generic"},
        )

    @staticmethod
    def _detect_language(path: Path) -> str:
        """Detect language from file extension."""
        ext_map = {
            ".py": "python",
            ".go": "go",
            ".js": "javascript",
            ".ts": "typescript",
            ".tsx": "typescript",
            ".jsx": "javascript",
            ".java": "java",
        }
        return ext_map.get(path.suffix.lower(), "unknown")
