"""Static code analysis engine for ResolveAgent.

Provides AST-based call graph construction, error parsing, and
solution generation for the code analysis corpus.
"""

from resolveagent.code_analysis.ast_parser import ASTParser, ParsedModule
from resolveagent.code_analysis.call_graph import CallGraphBuilder, CallGraphResult
from resolveagent.code_analysis.engine import StaticAnalysisEngine
from resolveagent.code_analysis.error_parser import ErrorParser, ParsedError
from resolveagent.code_analysis.solution_generator import (
    SolutionDocument,
    SolutionGenerator,
)

__all__ = [
    "ASTParser",
    "CallGraphBuilder",
    "CallGraphResult",
    "ErrorParser",
    "ParsedError",
    "ParsedModule",
    "SolutionDocument",
    "SolutionGenerator",
    "StaticAnalysisEngine",
]
