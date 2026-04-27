"""Multi-language error and stack-trace parser.

Parses error messages, exceptions, and stack traces from logs and
source code to extract structured diagnostic information.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class StackFrame:
    """A single frame in a stack trace."""

    file_path: str = ""
    line_number: int = 0
    function_name: str = ""
    code_context: str = ""


@dataclass
class ParsedError:
    """Structured representation of a parsed error."""

    error_type: str = ""
    message: str = ""
    language: str = ""
    severity: str = "error"  # error | warning | info
    file_path: str = ""
    line_number: int = 0
    column: int = 0
    stack_trace: list[StackFrame] = field(default_factory=list)
    raw_text: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)


# Compiled regex patterns for each supported language

_PYTHON_TRACEBACK_START = re.compile(r"Traceback \(most recent call last\):")
_PYTHON_FRAME = re.compile(r'^\s+File "([^"]+)", line (\d+), in (\w+)$')
_PYTHON_ERROR_LINE = re.compile(r"^(\w+(?:\.\w+)*(?:Error|Exception|Warning))\s*:\s*(.*)")

_GO_PANIC = re.compile(r"^(?:panic|fatal error|runtime error): (.+)")
_GO_GOROUTINE = re.compile(r"^goroutine \d+ \[.+\]:")
_GO_FRAME = re.compile(r"^(\S+)\(.*\)$")
_GO_FRAME_LOC = re.compile(r"^\s+(\S+\.go):(\d+)")

_JS_ERROR = re.compile(r"^(?:Uncaught\s+)?(\w+(?:Error|Exception))\s*:\s*(.*)")
_JS_FRAME = re.compile(r"^\s+at\s+(?:(\S+)\s+)?\(?([^:]+):(\d+):\d+\)?")

_JAVA_EXCEPTION = re.compile(r"^([\w.$]+(?:Exception|Error))\s*:\s*(.*)")
_JAVA_FRAME = re.compile(r"^\s+at\s+([\w.$]+)\(([\w.]+):(\d+)\)")


class ErrorParser:
    """Parse error messages and stack traces from multiple languages.

    Usage::

        parser = ErrorParser()
        errors = parser.parse(log_text)
        errors = parser.parse_file("/var/log/app.log")
    """

    def parse(self, text: str, language: str | None = None) -> list[ParsedError]:
        """Parse error text and return structured errors.

        Args:
            text: Raw error / log text potentially containing stack traces.
            language: Optional language hint. If ``None``, auto-detection is
                attempted on each error block.

        Returns:
            List of ``ParsedError`` instances found in the text.
        """
        if not text.strip():
            return []

        if language:
            return self._parse_by_language(text, language)

        # Try each parser and merge results
        errors: list[ParsedError] = []
        for lang in ("python", "go", "javascript", "java"):
            found = self._parse_by_language(text, lang)
            errors.extend(found)

        # Deduplicate by (error_type, message)
        seen: set[tuple[str, str]] = set()
        unique: list[ParsedError] = []
        for err in errors:
            key = (err.error_type, err.message)
            if key not in seen:
                seen.add(key)
                unique.append(err)

        return unique

    def parse_file(self, file_path: str, language: str | None = None) -> list[ParsedError]:
        """Parse errors from a log file."""
        try:
            with open(file_path, encoding="utf-8", errors="replace") as f:
                text = f.read()
        except OSError as e:
            logger.warning("Failed to read %s: %s", file_path, e)
            return []
        return self.parse(text, language)

    def _parse_by_language(self, text: str, language: str) -> list[ParsedError]:
        dispatch = {
            "python": self._parse_python,
            "go": self._parse_go,
            "javascript": self._parse_javascript,
            "typescript": self._parse_javascript,
            "java": self._parse_java,
        }
        handler = dispatch.get(language)
        if handler is None:
            return self._parse_generic(text, language)
        return handler(text)

    # ------------------------------------------------------------------
    # Python
    # ------------------------------------------------------------------

    def _parse_python(self, text: str) -> list[ParsedError]:
        errors: list[ParsedError] = []
        lines = text.splitlines()
        i = 0

        while i < len(lines):
            if _PYTHON_TRACEBACK_START.match(lines[i]):
                frames, error, end_idx = self._parse_python_traceback(lines, i)
                if error:
                    error.stack_trace = frames
                    error.language = "python"
                    error.raw_text = "\n".join(lines[i:end_idx])
                    if frames:
                        error.file_path = frames[-1].file_path
                        error.line_number = frames[-1].line_number
                    errors.append(error)
                i = end_idx
            else:
                # Standalone error line (e.g. from pytest output)
                m = _PYTHON_ERROR_LINE.match(lines[i])
                if m:
                    errors.append(
                        ParsedError(
                            error_type=m.group(1),
                            message=m.group(2),
                            language="python",
                            raw_text=lines[i],
                        )
                    )
                i += 1

        return errors

    @staticmethod
    def _parse_python_traceback(lines: list[str], start: int) -> tuple[list[StackFrame], ParsedError | None, int]:
        frames: list[StackFrame] = []
        i = start + 1  # Skip "Traceback ..." line

        while i < len(lines):
            frame_match = _PYTHON_FRAME.match(lines[i])
            if frame_match:
                frame = StackFrame(
                    file_path=frame_match.group(1),
                    line_number=int(frame_match.group(2)),
                    function_name=frame_match.group(3),
                )
                i += 1
                # Next line is usually the code context
                if i < len(lines) and lines[i].strip() and not _PYTHON_FRAME.match(lines[i]):
                    frame.code_context = lines[i].strip()
                    i += 1
                frames.append(frame)
            else:
                # Check for error line
                err_match = _PYTHON_ERROR_LINE.match(lines[i])
                if err_match:
                    error = ParsedError(
                        error_type=err_match.group(1),
                        message=err_match.group(2),
                    )
                    return frames, error, i + 1
                # Not a frame and not an error - check if indented continuation
                if lines[i].startswith("  "):
                    i += 1
                else:
                    break

        return frames, None, i

    # ------------------------------------------------------------------
    # Go
    # ------------------------------------------------------------------

    def _parse_go(self, text: str) -> list[ParsedError]:
        errors: list[ParsedError] = []
        lines = text.splitlines()
        i = 0

        while i < len(lines):
            panic_match = _GO_PANIC.match(lines[i])
            if panic_match:
                frames: list[StackFrame] = []
                raw_start = i
                i += 1

                # Skip goroutine header
                if i < len(lines) and _GO_GOROUTINE.match(lines[i]):
                    i += 1

                # Parse frames (pairs: function line + location line)
                while i + 1 < len(lines):
                    func_match = _GO_FRAME.match(lines[i])
                    loc_match = _GO_FRAME_LOC.match(lines[i + 1]) if func_match else None
                    if func_match and loc_match:
                        frames.append(
                            StackFrame(
                                function_name=func_match.group(1),
                                file_path=loc_match.group(1),
                                line_number=int(loc_match.group(2)),
                            )
                        )
                        i += 2
                    else:
                        break

                errors.append(
                    ParsedError(
                        error_type="panic",
                        message=panic_match.group(1),
                        language="go",
                        stack_trace=frames,
                        file_path=frames[0].file_path if frames else "",
                        line_number=frames[0].line_number if frames else 0,
                        raw_text="\n".join(lines[raw_start:i]),
                    )
                )
            else:
                i += 1

        return errors

    # ------------------------------------------------------------------
    # JavaScript / TypeScript
    # ------------------------------------------------------------------

    def _parse_javascript(self, text: str) -> list[ParsedError]:
        errors: list[ParsedError] = []
        lines = text.splitlines()
        i = 0

        while i < len(lines):
            m = _JS_ERROR.match(lines[i])
            if m:
                frames: list[StackFrame] = []
                raw_start = i
                i += 1

                while i < len(lines):
                    fm = _JS_FRAME.match(lines[i])
                    if fm:
                        frames.append(
                            StackFrame(
                                function_name=fm.group(1) or "<anonymous>",
                                file_path=fm.group(2),
                                line_number=int(fm.group(3)),
                            )
                        )
                        i += 1
                    else:
                        break

                errors.append(
                    ParsedError(
                        error_type=m.group(1),
                        message=m.group(2),
                        language="javascript",
                        stack_trace=frames,
                        file_path=frames[0].file_path if frames else "",
                        line_number=frames[0].line_number if frames else 0,
                        raw_text="\n".join(lines[raw_start:i]),
                    )
                )
            else:
                i += 1

        return errors

    # ------------------------------------------------------------------
    # Java
    # ------------------------------------------------------------------

    def _parse_java(self, text: str) -> list[ParsedError]:
        errors: list[ParsedError] = []
        lines = text.splitlines()
        i = 0

        while i < len(lines):
            m = _JAVA_EXCEPTION.match(lines[i])
            if m:
                frames: list[StackFrame] = []
                raw_start = i
                i += 1

                while i < len(lines):
                    fm = _JAVA_FRAME.match(lines[i])
                    if fm:
                        frames.append(
                            StackFrame(
                                function_name=fm.group(1),
                                file_path=fm.group(2),
                                line_number=int(fm.group(3)),
                            )
                        )
                        i += 1
                    else:
                        break

                errors.append(
                    ParsedError(
                        error_type=m.group(1),
                        message=m.group(2),
                        language="java",
                        stack_trace=frames,
                        file_path=frames[0].file_path if frames else "",
                        line_number=frames[0].line_number if frames else 0,
                        raw_text="\n".join(lines[raw_start:i]),
                    )
                )
            else:
                i += 1

        return errors

    # ------------------------------------------------------------------
    # Generic fallback
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_generic(text: str, language: str) -> list[ParsedError]:
        """Best-effort extraction from unknown language errors."""
        generic_error = re.compile(
            r"(?:error|exception|fatal|panic)\s*[:\-]\s*(.+)",
            re.IGNORECASE,
        )
        errors: list[ParsedError] = []
        for line in text.splitlines():
            m = generic_error.search(line)
            if m:
                errors.append(
                    ParsedError(
                        error_type="generic_error",
                        message=m.group(1).strip(),
                        language=language,
                        raw_text=line,
                    )
                )
        return errors
