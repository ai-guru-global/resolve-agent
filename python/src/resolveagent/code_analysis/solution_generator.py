"""Solution document generator for code analysis findings.

Combines LLM generation with RAG retrieval to produce
standardised consultation solution documents.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class SolutionDocument:
    """A structured solution / consultation document."""

    title: str = ""
    summary: str = ""
    error_type: str = ""
    language: str = ""
    root_cause: str = ""
    solution_steps: list[str] = field(default_factory=list)
    code_examples: list[dict[str, str]] = field(default_factory=list)
    references: list[str] = field(default_factory=list)
    severity: str = "medium"
    tags: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_markdown(self) -> str:
        """Render the solution document as Markdown."""
        parts = [f"# {self.title}\n"]
        if self.summary:
            parts.append(f"{self.summary}\n")

        parts.append(f"**Severity:** {self.severity}  ")
        parts.append(f"**Language:** {self.language}  ")
        if self.error_type:
            parts.append(f"**Error Type:** {self.error_type}\n")

        if self.root_cause:
            parts.append(f"## Root Cause\n\n{self.root_cause}\n")

        if self.solution_steps:
            parts.append("## Solution Steps\n")
            for i, step in enumerate(self.solution_steps, 1):
                parts.append(f"{i}. {step}")
            parts.append("")

        if self.code_examples:
            parts.append("## Code Examples\n")
            for example in self.code_examples:
                lang = example.get("language", "")
                code = example.get("code", "")
                desc = example.get("description", "")
                if desc:
                    parts.append(f"**{desc}**\n")
                parts.append(f"```{lang}\n{code}\n```\n")

        if self.references:
            parts.append("## References\n")
            for ref in self.references:
                parts.append(f"- {ref}")
            parts.append("")

        if self.tags:
            parts.append(f"**Tags:** {', '.join(self.tags)}\n")

        return "\n".join(parts)

    def to_dict(self) -> dict[str, Any]:
        """Serialise to a JSON-compatible dict."""
        return {
            "title": self.title,
            "summary": self.summary,
            "error_type": self.error_type,
            "language": self.language,
            "root_cause": self.root_cause,
            "solution_steps": self.solution_steps,
            "code_examples": self.code_examples,
            "references": self.references,
            "severity": self.severity,
            "tags": self.tags,
            "metadata": self.metadata,
        }


class SolutionGenerator:
    """Generate solution documents from parsed errors.

    Supports two generation modes:

    1. **LLM mode** - Generate solutions using a language model.
    2. **RAG mode** - Augment generation with retrieved context from the
       RAG pipeline.

    When both an ``llm_provider`` and ``rag_pipeline`` are supplied, the
    generator uses RAG-augmented generation.

    Usage::

        gen = SolutionGenerator(llm_provider=provider, rag_pipeline=pipeline)
        docs = await gen.generate(errors)
    """

    def __init__(
        self,
        llm_provider: Any | None = None,
        rag_pipeline: Any | None = None,
        rag_collection: str = "code-analysis",
        model: str | None = None,
    ) -> None:
        self._llm = llm_provider
        self._rag = rag_pipeline
        self._rag_collection = rag_collection
        self._model = model

    async def generate(
        self,
        errors: list[Any],
        *,
        include_rag: bool = True,
    ) -> list[SolutionDocument]:
        """Generate solution documents for a list of parsed errors.

        Args:
            errors: List of ``ParsedError`` instances.
            include_rag: Whether to retrieve RAG context. Defaults to True
                when a pipeline is available.

        Returns:
            A ``SolutionDocument`` per error.
        """
        results: list[SolutionDocument] = []

        for error in errors:
            doc = await self._generate_single(error, include_rag=include_rag)
            results.append(doc)

        return results

    async def _generate_single(self, error: Any, *, include_rag: bool = True) -> SolutionDocument:
        """Generate a single solution document."""

        # 1. Attempt RAG retrieval for additional context
        rag_context = ""
        if include_rag and self._rag is not None:
            rag_context = await self._retrieve_context(error)

        # 2. Use LLM if available
        if self._llm is not None:
            return await self._generate_with_llm(error, rag_context)

        # 3. Fallback: template-based solution
        return self._generate_template(error, rag_context)

    async def _retrieve_context(self, error: Any) -> str:
        """Query RAG for context related to the error."""
        try:
            query = f"{error.error_type}: {error.message}"
            result = await self._rag.query(
                collection_id=self._rag_collection,
                query=query,
                top_k=3,
            )
            chunks = result.get("chunks", [])
            if chunks:
                return "\n\n".join(c.get("content", "") for c in chunks[:3])
        except Exception:
            logger.debug("RAG retrieval failed for %s", error.error_type, exc_info=True)
        return ""

    async def _generate_with_llm(self, error: Any, rag_context: str) -> SolutionDocument:
        """Generate solution using LLM (optionally RAG-augmented)."""
        from resolveagent.llm.provider import ChatMessage

        context_block = ""
        if rag_context:
            context_block = f"\n\n已知相关解决方案参考:\n{rag_context}\n"

        stack_text = ""
        if hasattr(error, "stack_trace") and error.stack_trace:
            stack_text = "\n".join(f"  {f.file_path}:{f.line_number} in {f.function_name}" for f in error.stack_trace[:10])
            stack_text = f"\n\n调用栈:\n{stack_text}"

        prompt = (
            f"请为以下错误生成标准化的排查解决方案文档。\n\n"
            f"错误类型: {error.error_type}\n"
            f"错误信息: {error.message}\n"
            f"语言: {error.language}\n"
            f"文件: {error.file_path}:{error.line_number}"
            f"{stack_text}"
            f"{context_block}\n\n"
            "请按以下格式输出:\n"
            "1. 标题 (一句话描述)\n"
            "2. 摘要 (2-3句话概述)\n"
            "3. 根因分析\n"
            "4. 解决步骤 (编号列表)\n"
            "5. 代码示例 (如适用)\n"
            "6. 严重程度 (low/medium/high/critical)\n"
        )

        try:
            response = await self._llm.chat(
                messages=[
                    ChatMessage(
                        role="system",
                        content="你是一个专业的软件故障排查顾问。请提供清晰、可操作的解决方案。",
                    ),
                    ChatMessage(role="user", content=prompt),
                ],
                model=self._model,
            )
            return self._parse_llm_response(response.content, error)
        except Exception:
            logger.warning("LLM generation failed for %s", error.error_type, exc_info=True)
            return self._generate_template(error, rag_context)

    def _parse_llm_response(self, content: str, error: Any) -> SolutionDocument:
        """Best-effort extraction of structured fields from LLM output."""
        lines = content.strip().splitlines()
        doc = SolutionDocument(
            error_type=getattr(error, "error_type", ""),
            language=getattr(error, "language", ""),
            tags=[getattr(error, "error_type", ""), getattr(error, "language", "")],
        )

        # Use the full LLM response as summary if parsing fails
        doc.summary = content

        # Attempt line-by-line extraction
        section = ""
        steps: list[str] = []

        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue

            lower = stripped.lower()
            if any(k in lower for k in ("标题", "title")):
                doc.title = stripped.split(":", 1)[-1].strip().strip("#").strip()
                section = "title"
            elif any(k in lower for k in ("摘要", "summary")):
                section = "summary"
            elif any(k in lower for k in ("根因", "root cause")):
                section = "root_cause"
            elif any(k in lower for k in ("解决步骤", "solution")):
                section = "steps"
            elif any(k in lower for k in ("代码示例", "code example")):
                section = "code"
            elif any(k in lower for k in ("严重程度", "severity")):
                for sev in ("critical", "high", "medium", "low"):
                    if sev in lower:
                        doc.severity = sev
                        break
                section = "severity"
            elif section == "root_cause":
                doc.root_cause += stripped + " "
            elif section == "steps":
                # Strip leading numbering
                step_text = stripped.lstrip("0123456789.-) ").strip()
                if step_text:
                    steps.append(step_text)

        if steps:
            doc.solution_steps = steps
        if not doc.title:
            doc.title = f"{error.error_type}: {error.message[:80]}"
        doc.root_cause = doc.root_cause.strip()

        return doc

    @staticmethod
    def _generate_template(error: Any, rag_context: str) -> SolutionDocument:
        """Generate a template-based solution when no LLM is available."""
        title = f"{getattr(error, 'error_type', 'Error')}: {getattr(error, 'message', '')[:80]}"

        steps = [
            f"检查文件 {error.file_path} 第 {error.line_number} 行的代码" if hasattr(error, "file_path") and error.file_path else "检查相关代码",
            f"分析 {error.error_type} 的触发条件",
            "检查相关依赖版本和配置",
            "添加错误处理和日志记录",
            "编写回归测试验证修复",
        ]

        references: list[str] = []
        if rag_context:
            references.append("RAG检索到的相关上下文已包含在分析中")

        return SolutionDocument(
            title=title,
            summary=f"发现 {error.error_type} 错误: {error.message}",
            error_type=getattr(error, "error_type", ""),
            language=getattr(error, "language", ""),
            root_cause=f"需要进一步分析 {error.error_type} 在 {getattr(error, 'file_path', '未知文件')} 中的触发原因。",
            solution_steps=steps,
            severity="medium",
            tags=[getattr(error, "error_type", ""), getattr(error, "language", "")],
            references=references,
        )
