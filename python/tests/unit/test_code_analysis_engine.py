"""Unit tests for code_analysis analyze_single full results and RAG list handling."""

from __future__ import annotations

from unittest.mock import AsyncMock

from resolveagent.code_analysis.engine import StaticAnalysisEngine
from resolveagent.code_analysis.error_parser import ParsedError
from resolveagent.code_analysis.solution_generator import SolutionGenerator


class TestAnalyzeSingle:
    async def test_returns_full_result(self, tmp_path):
        (tmp_path / "main.py").write_text("def foo():\n    bar()\n\ndef bar():\n    pass\n", encoding="utf-8")
        engine = StaticAnalysisEngine()

        result = await engine.analyze_single(
            repo_path=str(tmp_path),
            language="python",
            entry_points=["foo"],
            error_logs=(
                "Traceback (most recent call last):\n"
                '  File "main.py", line 2, in foo\n'
                "    bar()\n"
                "ZeroDivisionError: division by zero"
            ),
        )

        assert result.analysis_id
        assert result.call_graph is not None
        assert len(result.call_graph.nodes) > 0
        assert len(result.errors) == 1
        assert result.errors[0].error_type == "ZeroDivisionError"
        assert len(result.solutions) == 1
        assert result.stats["errors_found"] == 1
        assert result.stats["solutions_generated"] == 1


class TestRetrieveContext:
    async def test_rag_query_list_result_joined(self):
        rag = AsyncMock()
        rag.query = AsyncMock(return_value=[{"text": "片段一"}, {"content": "片段二"}])
        generator = SolutionGenerator(rag_pipeline=rag)

        context = await generator._retrieve_context(ParsedError(error_type="KeyError", message="x"))

        assert "片段一" in context
        assert "片段二" in context

    async def test_rag_query_empty_list(self):
        rag = AsyncMock()
        rag.query = AsyncMock(return_value=[])
        generator = SolutionGenerator(rag_pipeline=rag)

        assert await generator._retrieve_context(ParsedError(error_type="KeyError", message="x")) == ""
