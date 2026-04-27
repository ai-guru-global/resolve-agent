"""Intent analysis for the Intelligent Selector.

This module provides sophisticated intent classification using multiple
strategies: keyword matching, pattern recognition, and LLM-based analysis.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from enum import StrEnum
from typing import Any

from pydantic import BaseModel


class IntentType(StrEnum):
    """Supported intent types for routing decisions."""

    WORKFLOW = "workflow"  # Complex multi-step processes, FTA, decision trees
    SKILL = "skill"  # Specific tool execution
    RAG = "rag"  # Knowledge retrieval, document Q&A
    CODE_ANALYSIS = "code_analysis"  # Code review, static analysis, AST parsing
    DIRECT = "direct"  # General conversation, simple questions
    MULTI = "multi"  # Multiple intents detected


class IntentClassification(BaseModel):
    """Result of intent analysis."""

    intent_type: str
    confidence: float
    entities: list[str] = []
    metadata: dict[str, Any] = {}
    sub_intents: list[str] = []  # For multi-intent scenarios
    suggested_target: str = ""  # Specific skill/workflow/collection to use


@dataclass
class IntentPattern:
    """A pattern for intent matching."""

    intent_type: IntentType
    patterns: list[str]
    keywords: list[str]
    weight: float = 1.0
    target_hint: str = ""


class IntentAnalyzer:
    """Analyzes user input to classify intent with high precision.

    Uses a multi-layered approach:
    1. Keyword-based fast path for common patterns
    2. Regex pattern matching for structured requests
    3. Semantic analysis for ambiguous cases
    4. LLM fallback for complex intent detection

    Attributes:
        patterns: List of intent patterns for matching.
        enable_semantic: Whether to enable semantic analysis.
    """

    # Intent patterns for different routing targets
    INTENT_PATTERNS: list[IntentPattern] = [
        # Workflow / FTA patterns
        IntentPattern(
            intent_type=IntentType.WORKFLOW,
            patterns=[
                r"\b(diagnose|troubleshoot|root cause|analyze failure|investigate)\b",
                r"\b(fault tree|decision tree|workflow|process flow)\b",
                r"\b(step by step|multi-?step|complex process)\b",
                r"\b(incident|outage|failure|degradation)\s+(analysis|investigation)\b",
                r"\b(why|how).*\b(failed|broken|not working|down)\b",
            ],
            keywords=[
                "diagnose",
                "troubleshoot",
                "root cause",
                "incident",
                "workflow",
                "decision tree",
                "fault tree",
                "investigation",
                "outage",
                "failure analysis",
                "debug",
                "trace",
            ],
            weight=1.2,
        ),
        # Skill patterns
        IntentPattern(
            intent_type=IntentType.SKILL,
            patterns=[
                r"\b(search|find|look up)\b.*\b(web|internet|online)\b",
                r"\b(run|execute|eval|invoke)\b.*\b(code|script|command|tool)\b",
                r"\b(read|open|write|save|create|delete)\b.*\b(file|document)\b",
                r"\b(send|post|get|fetch)\b.*\b(api|request|http)\b",
                r"\b(calculate|compute|convert|format)\b",
            ],
            keywords=[
                "search",
                "execute",
                "run",
                "invoke",
                "calculate",
                "convert",
                "format",
                "send",
                "fetch",
                "download",
                "upload",
                "compress",
                "extract",
                "parse",
            ],
            weight=1.0,
        ),
        # RAG / Knowledge retrieval patterns
        IntentPattern(
            intent_type=IntentType.RAG,
            patterns=[
                r"\b(what|how|explain|describe|tell me about|define)\b",
                r"\b(document|knowledge|reference|manual|guide)\b",
                r"\b(find|search)\b.*\b(information|docs|documentation)\b",
                r"\b(where|when|who|which)\b.*\b(is|are|was|were)\b",
                r"\b(learn|understand|know)\b.*\b(about|more)\b",
            ],
            keywords=[
                "what",
                "how",
                "explain",
                "describe",
                "document",
                "knowledge",
                "reference",
                "guide",
                "manual",
                "documentation",
                "learn",
                "understand",
                "definition",
                "meaning",
            ],
            weight=0.8,  # Lower weight as these are more general
        ),
        # Code analysis patterns
        IntentPattern(
            intent_type=IntentType.CODE_ANALYSIS,
            patterns=[
                r"\b(analyze|review|check|inspect)\b.*\b(code|function|class|module)\b",
                r"\b(find|detect)\b.*\b(bug|issue|vulnerability|error)\b",
                r"\b(refactor|optimize|improve)\b.*\b(code|performance)\b",
                r"\b(static analysis|code review|security scan|lint)\b",
                r"\b(ast|syntax tree|parse tree|call graph)\b",
                r"\b(dependency|import|module)\s+(analysis|check|graph)\b",
                r"\b(traffic|packet|capture)\s+(analysis|graph|trace)\b",
                r"\b(service\s+dependency|call\s+chain|entry\s*point)\b",
                r"\b(ebpf|otel|opentelemetry|tracing)\s+(analysis|data)\b",
                r"```[a-z]*\n[\s\S]*```",  # Code blocks
                r"\b(def|class|function|method|import|from)\b.*:\s*$",  # Code syntax
            ],
            keywords=[
                "code",
                "analyze",
                "review",
                "bug",
                "vulnerability",
                "refactor",
                "optimize",
                "lint",
                "static analysis",
                "ast",
                "syntax",
                "parse",
                "security",
                "dependency",
                "function",
                "class",
                "method",
                "module",
                "call graph",
                "call chain",
                "entry point",
                "traffic",
                "packet",
                "capture",
                "tracing",
                "service dependency",
                "latency",
                "error rate",
            ],
            weight=1.1,
        ),
    ]

    def __init__(self, enable_semantic: bool = True, split_threshold: float = 0.15) -> None:
        """Initialize the intent analyzer.

        Args:
            enable_semantic: Enable semantic analysis for ambiguous cases.
            split_threshold: When the gap between top-2 normalised scores is
                below this value the input is classified as MULTI intent.
        """
        self.enable_semantic = enable_semantic
        self.split_threshold = split_threshold
        self._compiled_patterns: dict[IntentType, list[re.Pattern[str]]] = {}
        self._compile_patterns()
        # Pre-compile the code-detection patterns once.
        self._code_block_re = re.compile(r"```[\s\S]*```")
        self._inline_code_re = re.compile(r"`[^`]+`")
        self._code_syntax_patterns = [
            re.compile(p)
            for p in [
                r"\bdef\s+\w+\s*\(",
                r"\bclass\s+\w+",
                r"\bfunction\s+\w+\s*\(",
                r"\bimport\s+[\w.]+",
                r"\bfrom\s+[\w.]+\s+import",
                r"\bconst\s+\w+\s*=",
                r"\blet\s+\w+\s*=",
                r"\bvar\s+\w+\s*=",
            ]
        ]
        self._question_starters = frozenset(
            [
                "what",
                "how",
                "why",
                "when",
                "where",
                "who",
                "which",
                "is",
                "are",
                "can",
                "could",
                "would",
                "should",
                "does",
                "do",
            ]
        )

    def _compile_patterns(self) -> None:
        """Pre-compile regex patterns for efficiency."""
        for pattern_def in self.INTENT_PATTERNS:
            self._compiled_patterns[pattern_def.intent_type] = [re.compile(p, re.IGNORECASE) for p in pattern_def.patterns]

    async def classify(self, input_text: str) -> IntentClassification:
        """Classify the intent of the user input.

        Uses a consolidated single-pass approach for efficiency:
        1. Keyword + pattern scoring in one traversal per intent pattern
        2. Code-block and question detection (pre-compiled regexes)
        3. Score normalisation, multi-intent detection, target suggestion
        """
        if not input_text or not input_text.strip():
            return IntentClassification(
                intent_type=IntentType.DIRECT.value,
                confidence=0.1,
                metadata={"reason": "Empty input"},
            )

        text_lower = input_text.lower()
        scores: dict[IntentType, float] = {}
        entities: list[str] = []
        matched_patterns: list[str] = []
        metadata: dict[str, Any] = {"input_length": len(input_text)}

        # --- Single pass: keywords + regex patterns simultaneously ---
        for pattern_def in self.INTENT_PATTERNS:
            intent = pattern_def.intent_type
            # Keyword hits
            kw_hits = sum(1 for kw in pattern_def.keywords if kw in text_lower)
            if kw_hits:
                scores[intent] = scores.get(intent, 0) + kw_hits * 0.15 * pattern_def.weight
            # Pattern hits
            for pat in self._compiled_patterns.get(intent, []):
                if pat.search(text_lower):
                    scores[intent] = scores.get(intent, 0) + 0.3 * pattern_def.weight
                    matched_patterns.append(pat.pattern)

        metadata["matched_patterns"] = matched_patterns

        # --- Code detection (pre-compiled) ---
        contains_code = bool(
            self._code_block_re.search(input_text)
            or self._inline_code_re.search(input_text)
            or any(p.search(input_text) for p in self._code_syntax_patterns)
        )
        if contains_code:
            scores[IntentType.CODE_ANALYSIS] = scores.get(IntentType.CODE_ANALYSIS, 0) + 0.5
            metadata["contains_code"] = True
            entities.append("code_block")

        # --- Question detection ---
        text_stripped = text_lower.strip()
        first_word = text_stripped.split()[0] if text_stripped else ""
        is_question = first_word in self._question_starters or text_stripped.endswith("?")
        if is_question:
            scores[IntentType.RAG] = scores.get(IntentType.RAG, 0) + 0.3
            metadata["is_question"] = True

        # --- Scoring & winner selection ---
        if not scores:
            return IntentClassification(
                intent_type=IntentType.DIRECT.value,
                confidence=0.5,
                entities=entities,
                metadata=metadata,
            )

        total_score = sum(scores.values())
        normalized: dict[IntentType, float] = {k: v / total_score if total_score > 0 else 0 for k, v in scores.items()}

        sorted_intents = sorted(normalized.items(), key=lambda kv: kv[1], reverse=True)
        best_intent = sorted_intents[0][0]
        best_norm = sorted_intents[0][1]

        # Multi-intent: if gap to second-best < split_threshold
        if len(sorted_intents) >= 2:
            second_norm = sorted_intents[1][1]
            if best_norm - second_norm < self.split_threshold and second_norm > 0.2:
                best_intent = IntentType.MULTI

        confidence = min(best_norm * 1.5, 1.0)

        sub_intents = [k.value for k, v in normalized.items() if v > 0.2 and k != best_intent]

        suggested_target = self._get_suggested_target(best_intent, text_lower)

        return IntentClassification(
            intent_type=best_intent.value,
            confidence=confidence,
            entities=entities,
            metadata=metadata,
            sub_intents=sub_intents,
            suggested_target=suggested_target,
        )

    # -- Legacy helpers kept for backward compat but no longer called by classify --

    def _score_keywords(self, text: str) -> dict[IntentType, float]:
        """Score based on keyword presence."""
        scores: dict[IntentType, float] = {}

        for pattern_def in self.INTENT_PATTERNS:
            matched_keywords = [kw for kw in pattern_def.keywords if kw in text]
            if matched_keywords:
                score = len(matched_keywords) * 0.15 * pattern_def.weight
                scores[pattern_def.intent_type] = score

        return scores

    def _score_patterns(self, text: str) -> tuple[dict[IntentType, float], list[str]]:
        """Score based on pattern matching."""
        scores: dict[IntentType, float] = {}
        matched_patterns: list[str] = []

        for pattern_def in self.INTENT_PATTERNS:
            patterns = self._compiled_patterns.get(pattern_def.intent_type, [])
            for pattern in patterns:
                if pattern.search(text):
                    score = 0.3 * pattern_def.weight
                    scores[pattern_def.intent_type] = scores.get(pattern_def.intent_type, 0) + score
                    matched_patterns.append(pattern.pattern)

        return scores, matched_patterns

    def _contains_code(self, text: str) -> bool:
        """Check if input contains code blocks or code-like content."""
        return bool(self._code_block_re.search(text) or self._inline_code_re.search(text) or any(p.search(text) for p in self._code_syntax_patterns))

    def _is_question(self, text: str) -> bool:
        """Check if input is a question."""
        text = text.strip()
        first_word = text.split()[0] if text else ""
        return first_word in self._question_starters or text.endswith("?")

    def _get_suggested_target(self, intent_type: IntentType, text: str) -> str:
        """Get suggested target based on intent and text analysis."""
        if intent_type == IntentType.SKILL:
            # Suggest specific skill based on keywords
            if "search" in text and "web" in text:
                return "web-search"
            if ("execute" in text or "run" in text) and ("code" in text or "script" in text):
                return "code-exec"
            if "file" in text:
                return "file-ops"
        elif intent_type == IntentType.CODE_ANALYSIS:
            if "security" in text or "vulnerability" in text:
                return "security-scan"
            if "lint" in text:
                return "linter"
            if "refactor" in text:
                return "refactor"
            if "traffic" in text or "packet" in text or "capture" in text:
                return "traffic-analysis"
            if "call graph" in text or "call chain" in text or "entry point" in text:
                return "static-analysis"
            return "static-analysis"

        return ""
