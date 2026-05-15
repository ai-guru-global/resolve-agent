"""Parser factory for creating language-specific parsers."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from resolveagent.code_analysis.parsers.base import BaseParser

logger = logging.getLogger(__name__)


class ParserFactory:
    """Factory for creating code parsers by language."""

    _parsers: dict[str, BaseParser] = {}
    _initialized = False

    @classmethod
    def _initialize(cls) -> None:
        """Lazy-load available parsers."""
        if cls._initialized:
            return

        # Try to import and register each parser
        parsers_to_try = [
            ("python", "resolveagent.code_analysis.parsers.python_parser", "PythonParser"),
            ("java", "resolveagent.code_analysis.parsers.treesitter_parser", "TreeSitterJavaParser"),
            ("go", "resolveagent.code_analysis.parsers.treesitter_parser", "TreeSitterGoParser"),
            ("rust", "resolveagent.code_analysis.parsers.treesitter_parser", "TreeSitterRustParser"),
        ]

        for lang, module, class_name in parsers_to_try:
            try:
                mod = __import__(module, fromlist=[class_name])
                parser_cls = getattr(mod, class_name)
                cls._parsers[lang] = parser_cls()
                logger.debug("Registered parser for %s", lang)
            except Exception as e:
                logger.debug("Parser not available for %s: %s", lang, e)

        cls._initialized = True

    @classmethod
    def get_parser(cls, language: str) -> BaseParser | None:
        """Get a parser for the specified language.

        Args:
            language: Language identifier (e.g., 'python', 'java').

        Returns:
            Parser instance or None if not available.
        """
        cls._initialize()
        return cls._parsers.get(language.lower())

    @classmethod
    def list_supported_languages(cls) -> list[str]:
        """List all supported languages.

        Returns:
            List of language identifiers.
        """
        cls._initialize()
        return list(cls._parsers.keys())

    @classmethod
    def get_parser_for_file(cls, filename: str) -> BaseParser | None:
        """Get a parser based on file extension.

        Args:
            filename: File name or path.

        Returns:
            Parser instance or None if no matching parser.
        """
        cls._initialize()
        for parser in cls._parsers.values():
            if parser.is_supported_file(filename):
                return parser
        return None
