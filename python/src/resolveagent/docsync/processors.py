"""Format-aware document processors that preserve layout during translation."""

from __future__ import annotations

import re
from collections.abc import Callable

TextTranslator = Callable[[str], str]

_CJK_RE = re.compile(r"[\u4e00-\u9fff]")
_INLINE_CODE_RE = re.compile(r"`[^`]+`")
_LINK_RE = re.compile(r"!?\[([^\]]*)\]\(([^)]+)\)")
_URL_RE = re.compile(r"https?://\S+")
_MATH_RE = re.compile(r"\$[^$]+\$")
_LATEX_COMMANDS = (
    "title",
    "section",
    "subsection",
    "subsubsection",
    "paragraph",
    "subparagraph",
    "caption",
    "author",
)


class DocumentProcessor:
    """Common interface for format-aware translation and proofreading."""

    def translate(self, text: str, translate_text: TextTranslator) -> str:
        msg = "translate() must be implemented by subclasses"
        raise NotImplementedError(msg)

    def structure_signature(self, text: str) -> list[str]:
        msg = "structure_signature() must be implemented by subclasses"
        raise NotImplementedError(msg)

    def extract_text(self, text: str) -> str:
        msg = "extract_text() must be implemented by subclasses"
        raise NotImplementedError(msg)

    def segments(self, text: str) -> list[str]:
        msg = "segments() must be implemented by subclasses"
        raise NotImplementedError(msg)


class MarkdownProcessor(DocumentProcessor):
    """Markdown-aware processor preserving headings, tables, and code fences."""

    def translate(self, text: str, translate_text: TextTranslator) -> str:
        lines = text.splitlines()
        output: list[str] = []
        paragraph: list[str] = []
        in_fence = False
        in_math_block = False

        def flush_paragraph() -> None:
            if not paragraph:
                return
            block = " ".join(line.strip() for line in paragraph).strip()
            output.append(_translate_inline_text(block, translate_text))
            paragraph.clear()

        for line in lines:
            stripped = line.strip()
            fence_line = stripped.startswith("```") or stripped.startswith("~~~")
            if fence_line:
                flush_paragraph()
                in_fence = not in_fence
                output.append(line)
                continue
            if in_fence:
                output.append(line)
                continue
            if stripped == "$$":
                flush_paragraph()
                in_math_block = not in_math_block
                output.append(line)
                continue
            if in_math_block:
                output.append(line)
                continue
            if stripped == "":
                flush_paragraph()
                output.append("")
                continue
            if _is_markdown_heading(line):
                flush_paragraph()
                prefix, content = _split_markdown_heading(line)
                output.append(f"{prefix}{_translate_inline_text(content, translate_text)}")
                continue
            if _is_markdown_list(line) or _is_markdown_quote(line):
                flush_paragraph()
                prefix, content = _split_prefixed_line(line)
                output.append(f"{prefix}{_translate_inline_text(content, translate_text)}")
                continue
            if _is_markdown_table(line):
                flush_paragraph()
                output.append(_translate_markdown_table_line(line, translate_text))
                continue
            paragraph.append(line)

        flush_paragraph()
        return "\n".join(output) + ("\n" if text.endswith("\n") else "")

    def structure_signature(self, text: str) -> list[str]:
        signature: list[str] = []
        in_fence = False
        for line in text.splitlines():
            stripped = line.strip()
            if stripped.startswith("```") or stripped.startswith("~~~"):
                in_fence = not in_fence
                signature.append("fence")
                continue
            if in_fence:
                continue
            if _is_markdown_heading(line):
                level = len(line) - len(line.lstrip("#"))
                signature.append(f"h{level}")
            elif _is_markdown_table(line):
                signature.append("table")
        return signature

    def extract_text(self, text: str) -> str:
        return "\n".join(self.segments(text))

    def segments(self, text: str) -> list[str]:
        segments: list[str] = []
        paragraph: list[str] = []
        in_fence = False
        in_math_block = False

        def flush_paragraph() -> None:
            if not paragraph:
                return
            block = " ".join(line.strip() for line in paragraph).strip()
            if block:
                segments.append(block)
            paragraph.clear()

        for line in text.splitlines():
            stripped = line.strip()
            fence_line = stripped.startswith("```") or stripped.startswith("~~~")
            if fence_line:
                flush_paragraph()
                in_fence = not in_fence
                continue
            if in_fence:
                continue
            if stripped == "$$":
                flush_paragraph()
                in_math_block = not in_math_block
                continue
            if in_math_block or stripped == "":
                flush_paragraph()
                continue
            if _is_markdown_heading(line):
                flush_paragraph()
                _, content = _split_markdown_heading(line)
                if content:
                    segments.append(content)
                continue
            if _is_markdown_list(line) or _is_markdown_quote(line):
                flush_paragraph()
                _, content = _split_prefixed_line(line)
                if content:
                    segments.append(content)
                continue
            if _is_markdown_table(line):
                flush_paragraph()
                cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
                segments.extend(cell for cell in cells if cell and not re.fullmatch(r"[:\-\s]+", cell))
                continue
            paragraph.append(line)

        flush_paragraph()
        return segments


class TextProcessor(DocumentProcessor):
    """Plain text processor preserving paragraph boundaries."""

    def translate(self, text: str, translate_text: TextTranslator) -> str:
        paragraphs = text.split("\n\n")
        translated = [translate_text(paragraph) if paragraph.strip() else paragraph for paragraph in paragraphs]
        return "\n\n".join(translated)

    def structure_signature(self, text: str) -> list[str]:
        return ["paragraph" for paragraph in text.split("\n\n") if paragraph.strip()]

    def extract_text(self, text: str) -> str:
        return text

    def segments(self, text: str) -> list[str]:
        return [paragraph for paragraph in text.split("\n\n") if paragraph.strip()]


class LatexProcessor(DocumentProcessor):
    """Lightweight LaTeX processor preserving commands and math blocks."""

    def translate(self, text: str, translate_text: TextTranslator) -> str:
        lines = text.splitlines()
        output: list[str] = []
        in_verbatim = False
        in_math_env = False
        in_tabular = False
        for line in lines:
            stripped = line.strip()
            if _latex_begin(line, "verbatim") or _latex_begin(line, "lstlisting"):
                in_verbatim = True
                output.append(line)
                continue
            if _latex_end(line, "verbatim") or _latex_end(line, "lstlisting"):
                in_verbatim = False
                output.append(line)
                continue
            if _latex_begin_any(line, ("equation", "align", "align*", "multline", "displaymath")):
                in_math_env = True
                output.append(line)
                continue
            if _latex_end_any(line, ("equation", "align", "align*", "multline", "displaymath")):
                in_math_env = False
                output.append(line)
                continue
            if _latex_begin(line, "tabular"):
                in_tabular = True
                output.append(line)
                continue
            if _latex_end(line, "tabular"):
                in_tabular = False
                output.append(line)
                continue
            if in_verbatim or in_math_env or stripped.startswith("%"):
                output.append(line)
                continue
            translated = _translate_latex_command_line(line, translate_text)
            if translated != line:
                output.append(translated)
                continue
            if in_tabular and "&" in line and "\\" in line:
                output.append(_translate_latex_table_row(line, translate_text))
                continue
            if stripped.startswith("\\item"):
                prefix, content = stripped.split(" ", 1) if " " in stripped else (stripped, "")
                leading = line[: len(line) - len(line.lstrip())]
                output.append(f"{leading}{prefix} {_translate_latex_inline(content, translate_text)}".rstrip())
                continue
            if stripped.startswith("\\") or stripped == "":
                output.append(line)
                continue
            output.append(_translate_latex_inline(line, translate_text))
        return "\n".join(output) + ("\n" if text.endswith("\n") else "")

    def structure_signature(self, text: str) -> list[str]:
        signature: list[str] = []
        for line in text.splitlines():
            stripped = line.strip()
            for command in ("section", "subsection", "subsubsection"):
                if stripped.startswith(f"\\{command}"):
                    signature.append(command)
            if stripped.startswith("\\begin{tabular"):
                signature.append("tabular")
            if stripped.startswith("\\begin{figure"):
                signature.append("figure")
            if stripped.startswith("\\begin{table"):
                signature.append("table")
        return signature

    def extract_text(self, text: str) -> str:
        return "\n".join(self.segments(text))

    def segments(self, text: str) -> list[str]:
        chunks: list[str] = []
        for line in text.splitlines():
            stripped = line.strip()
            if stripped.startswith("%") or stripped.startswith("\\begin{") or stripped.startswith("\\end{"):
                continue
            if "&" in line and "\\\\" in line:
                cells = [cell.strip() for cell in line.rstrip().rstrip("\\").split("&")]
                chunks.extend(cell for cell in cells if cell)
                continue
            translated = _extract_latex_text(line)
            if translated:
                chunks.append(translated)
        return chunks


def get_processor(file_type: str) -> DocumentProcessor:
    if file_type == "markdown":
        return MarkdownProcessor()
    if file_type == "latex":
        return LatexProcessor()
    return TextProcessor()


def contains_cjk(text: str) -> bool:
    return _CJK_RE.search(text) is not None


def _is_markdown_heading(line: str) -> bool:
    return bool(re.match(r"^#{1,6}\s+", line))


def _split_markdown_heading(line: str) -> tuple[str, str]:
    match = re.match(r"^(#{1,6}\s+)(.*)$", line)
    if match is None:
        return "", line
    return match.group(1), match.group(2)


def _is_markdown_list(line: str) -> bool:
    return bool(re.match(r"^\s*(?:[-*+]\s+|\d+\.\s+)", line))


def _is_markdown_quote(line: str) -> bool:
    return bool(re.match(r"^\s*>+\s*", line))


def _split_prefixed_line(line: str) -> tuple[str, str]:
    match = re.match(r"^(\s*(?:>+\s*)?(?:[-*+]\s+|\d+\.\s+)?)(.*)$", line)
    if match is None:
        return "", line
    return match.group(1), match.group(2)


def _is_markdown_table(line: str) -> bool:
    stripped = line.strip()
    return stripped.startswith("|") and stripped.endswith("|") and stripped.count("|") >= 2


def _translate_markdown_table_line(line: str, translate_text: TextTranslator) -> str:
    stripped = line.strip()
    cells = stripped.strip("|").split("|")
    translated_cells: list[str] = []
    for cell in cells:
        text = cell.strip()
        if text and re.fullmatch(r"[:\-\s]+", text):
            translated_cells.append(text)
        else:
            translated_cells.append(_translate_inline_text(text, translate_text))
    return f"| {' | '.join(translated_cells)} |"


def _translate_inline_text(text: str, translate_text: TextTranslator) -> str:
    if not text.strip():
        return text
    protected: dict[str, str] = {}

    def protect(pattern: re.Pattern[str], value: str) -> str:
        def replacer(match: re.Match[str]) -> str:
            key = f"__PROTECTED_{len(protected)}__"
            protected[key] = match.group(0)
            return key

        return pattern.sub(replacer, value)

    value = text
    translated_links: dict[str, str] = {}

    def replace_link(match: re.Match[str]) -> str:
        label = _translate_inline_text(match.group(1), translate_text) if match.group(1) else ""
        prefix = "!" if match.group(0).startswith("!") else ""
        token = f"__LINK_{len(translated_links)}__"
        translated_links[token] = f"{prefix}[{label}]({match.group(2)})"
        return token

    value = _LINK_RE.sub(replace_link, value)
    value = protect(_INLINE_CODE_RE, value)
    value = protect(_URL_RE, value)
    value = translate_text(value)
    for token, replacement in {**translated_links, **protected}.items():
        value = value.replace(token, replacement)
    return value


def _latex_begin(line: str, name: str) -> bool:
    return line.strip().startswith(f"\\begin{{{name}}}")


def _latex_end(line: str, name: str) -> bool:
    return line.strip().startswith(f"\\end{{{name}}}")


def _latex_begin_any(line: str, names: tuple[str, ...]) -> bool:
    return any(_latex_begin(line, name) for name in names)


def _latex_end_any(line: str, names: tuple[str, ...]) -> bool:
    return any(_latex_end(line, name) for name in names)


def _translate_latex_command_line(line: str, translate_text: TextTranslator) -> str:
    result = line
    changed = False
    for command in _LATEX_COMMANDS:
        pattern = re.compile(rf"(\\{command}\*?\{{)(.*?)(\}})")

        def replacer(match: re.Match[str]) -> str:
            nonlocal changed
            changed = True
            return f"{match.group(1)}{_translate_latex_inline(match.group(2), translate_text)}{match.group(3)}"

        result = pattern.sub(replacer, result)
    return result if changed else line


def _translate_latex_table_row(line: str, translate_text: TextTranslator) -> str:
    ending = "\\\\" if line.rstrip().endswith("\\\\") else ""
    body = line.rstrip()
    if ending:
        body = body[: -len(ending)].rstrip()
    cells = body.split("&")
    translated = [_translate_latex_inline(cell.strip(), translate_text) for cell in cells]
    joined = " & ".join(translated)
    if ending:
        return f"{joined} {ending}".rstrip()
    return joined


def _translate_latex_inline(text: str, translate_text: TextTranslator) -> str:
    if not text.strip():
        return text
    protected: dict[str, str] = {}

    def protect(pattern: re.Pattern[str], value: str) -> str:
        def replacer(match: re.Match[str]) -> str:
            key = f"__LATEX_{len(protected)}__"
            protected[key] = match.group(0)
            return key

        return pattern.sub(replacer, value)

    value = protect(_MATH_RE, text)
    value = protect(re.compile(r"\\(?:cite|ref|label|url|texttt)\{.*?\}"), value)
    value = translate_text(value)
    for key, original in protected.items():
        value = value.replace(key, original)
    return value


def _extract_latex_text(line: str) -> str:
    stripped = line.strip()
    if not stripped:
        return ""
    if stripped.startswith("\\item "):
        return stripped[len("\\item ") :]
    for command in _LATEX_COMMANDS:
        match = re.search(rf"\\{command}\*?\{{(.*?)\}}", line)
        if match:
            return match.group(1)
    if stripped.startswith("\\"):
        return ""
    return stripped
