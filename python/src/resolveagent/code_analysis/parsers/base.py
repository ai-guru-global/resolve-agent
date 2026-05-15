"""Base parser interface for multi-language code analysis."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class FunctionNode:
    """Represents a function/method in the AST."""

    name: str
    start_line: int
    end_line: int
    parameters: list[str] = field(default_factory=list)
    return_type: str | None = None
    decorators: list[str] = field(default_factory=list)
    docstring: str = ""


@dataclass
class CallNode:
    """Represents a function call in the AST."""

    callee: str
    caller: str
    line: int
    arguments: list[str] = field(default_factory=list)


@dataclass
class ImportNode:
    """Represents an import/dependency in the AST."""

    module: str
    line: int
    symbols: list[str] = field(default_factory=list)
    is_relative: bool = False


@dataclass
class ParsedFile:
    """Result of parsing a source file."""

    language: str
    functions: list[FunctionNode] = field(default_factory=list)
    calls: list[CallNode] = field(default_factory=list)
    imports: list[ImportNode] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    raw_ast: Any = field(default=None)


class BaseParser(ABC):
    """Abstract base class for language-specific parsers."""

    @property
    @abstractmethod
    def language(self) -> str:
        """Return the language identifier (e.g., 'python', 'java')."""
        ...

    @property
    @abstractmethod
    def file_extensions(self) -> list[str]:
        """Return supported file extensions."""
        ...

    @abstractmethod
    def parse(self, code: str) -> ParsedFile:
        """Parse source code and return structured AST information.

        Args:
            code: Source code string.

        Returns:
            ParsedFile with extracted functions, calls, and imports.
        """
        ...

    @abstractmethod
    def extract_call_graph(self, parsed: ParsedFile) -> dict[str, list[str]]:
        """Extract call graph from parsed file.

        Args:
            parsed: ParsedFile result.

        Returns:
            Mapping from function name to list of callees.
        """
        ...

    def is_supported_file(self, filename: str) -> bool:
        """Check if a file is supported by this parser.

        Args:
            filename: File name or path.

        Returns:
            True if the file extension is supported.
        """
        return any(filename.endswith(ext) for ext in self.file_extensions)
