"""Context enrichment for the Intelligent Selector.

This module provides comprehensive context augmentation for routing decisions,
including conversation history, available resources, and code analysis context.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import re
from dataclasses import dataclass, field
from typing import Any


@dataclass
class CodeContext:
    """Context information extracted from code."""

    language: str = ""
    has_code_blocks: bool = False
    code_snippets: list[str] = field(default_factory=list)
    detected_patterns: list[str] = field(default_factory=list)
    potential_issues: list[str] = field(default_factory=list)
    complexity_hint: str = ""  # low, medium, high


@dataclass
class EnrichedContext:
    """Fully enriched context for routing decisions."""

    input_text: str
    agent_id: str
    conversation_history: list[dict[str, Any]] = field(default_factory=list)
    available_skills: list[dict[str, Any]] = field(default_factory=list)
    active_workflows: list[dict[str, Any]] = field(default_factory=list)
    rag_collections: list[dict[str, Any]] = field(default_factory=list)
    code_context: CodeContext | None = None
    user_preferences: dict[str, Any] = field(default_factory=dict)
    session_metadata: dict[str, Any] = field(default_factory=dict)
    enrichment_confidence: float = 1.0

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "input_text": self.input_text,
            "agent_id": self.agent_id,
            "conversation_history": self.conversation_history,
            "available_skills": self.available_skills,
            "active_workflows": self.active_workflows,
            "rag_collections": self.rag_collections,
            "code_context": (
                {
                    "language": self.code_context.language,
                    "has_code_blocks": self.code_context.has_code_blocks,
                    "code_snippets": self.code_context.code_snippets,
                    "detected_patterns": self.code_context.detected_patterns,
                    "potential_issues": self.code_context.potential_issues,
                    "complexity_hint": self.code_context.complexity_hint,
                }
                if self.code_context
                else None
            ),
            "user_preferences": self.user_preferences,
            "session_metadata": self.session_metadata,
            "enrichment_confidence": self.enrichment_confidence,
        }


class ContextEnricher:
    """Enriches request context with comprehensive information.

    Pulls in conversation history, agent memory, available skills,
    active workflows, RAG collection summaries, and code analysis
    context to help the route decision.

    The enricher uses multiple strategies:
    1. Memory lookup for conversation context
    2. Registry queries for available resources
    3. Code analysis for code-related requests
    4. User preference inference

    Attributes:
        skill_registry: Registry for querying available skills.
        workflow_registry: Registry for active workflows.
        rag_registry: Registry for RAG collections.
        memory_manager: Manager for conversation memory.
    """

    # Language detection patterns
    LANGUAGE_PATTERNS: dict[str, list[str]] = {
        "python": [
            r"\bdef\s+\w+\s*\(",
            r"\bclass\s+\w+.*:",
            r"\bimport\s+[\w.]+",
            r"\bfrom\s+[\w.]+\s+import",
            r"\bif\s+__name__\s*==\s*['\"]__main__['\"]",
            r"\bprint\s*\(",
            r"\basync\s+def\b",
            r"\bawait\s+\w+",
        ],
        "javascript": [
            r"\bfunction\s+\w+\s*\(",
            r"\bconst\s+\w+\s*=",
            r"\blet\s+\w+\s*=",
            r"\bvar\s+\w+\s*=",
            r"\b=>\s*[{(]",
            r"\brequire\s*\(['\"]\w+['\"]\)",
            r"\bexport\s+(default\s+)?(function|class|const)",
            r"\bimport\s+.*\s+from\s+['\"].*['\"]",
        ],
        "typescript": [
            r"\binterface\s+\w+",
            r"\btype\s+\w+\s*=",
            r":\s*(string|number|boolean|any|void|never)\b",
            r"<\w+>\s*(\(|\{)",
        ],
        "go": [
            r"\bpackage\s+\w+",
            r"\bfunc\s+\w+\s*\(",
            r"\bfunc\s*\(\w+\s+\*?\w+\)\s+\w+",
            r"\btype\s+\w+\s+(struct|interface)",
            r"\bgo\s+\w+\(",
            r"\bdefer\s+\w+",
        ],
        "java": [
            r"\bpublic\s+class\s+\w+",
            r"\bprivate\s+(static\s+)?\w+\s+\w+",
            r"\bpublic\s+(static\s+)?void\s+main",
            r"\bimport\s+java\.",
            r"\b@\w+\s*\(",
        ],
        "rust": [
            r"\bfn\s+\w+\s*\(",
            r"\blet\s+mut\s+\w+",
            r"\bimpl\s+\w+",
            r"\bstruct\s+\w+",
            r"\benum\s+\w+",
            r"\buse\s+[\w:]+;",
        ],
        "sql": [
            r"\bSELECT\s+.*\s+FROM\b",
            r"\bINSERT\s+INTO\b",
            r"\bUPDATE\s+\w+\s+SET\b",
            r"\bCREATE\s+(TABLE|INDEX|VIEW)\b",
            r"\bALTER\s+TABLE\b",
            r"\bDROP\s+(TABLE|INDEX)\b",
        ],
        "yaml": [
            r"^\w+:\s*$",
            r"^\s+-\s+\w+:",
            r"^\s+\w+:\s+['\"]?\w+",
        ],
        "json": [
            r'^\s*\{\s*"\w+"\s*:',
            r'^\s*\[\s*\{',
        ],
    }

    # Common code issue patterns
    ISSUE_PATTERNS: dict[str, str] = {
        r"\beval\s*\(": "potential_security_risk_eval",
        r"\bexec\s*\(": "potential_security_risk_exec",
        r"password\s*=\s*['\"]\w+['\"]": "hardcoded_credential",
        r"api_key\s*=\s*['\"]\w+['\"]": "hardcoded_api_key",
        r"TODO\s*:": "todo_comment",
        r"FIXME\s*:": "fixme_comment",
        r"HACK\s*:": "hack_comment",
        r"except\s*:\s*pass": "empty_except_block",
        r"catch\s*\(.*\)\s*\{\s*\}": "empty_catch_block",
        r"\.\s*\*\s*$": "sql_wildcard_select",
        r"SELECT\s+\*\s+FROM": "sql_select_all",
    }

    def __init__(self, registry_client: Any | None = None) -> None:
        """Initialize the context enricher.

        Args:
            registry_client: Optional registry client for querying resources.
        """
        self._compiled_lang_patterns: dict[str, list[re.Pattern[str]]] = {}
        self._compiled_issue_patterns: list[tuple[re.Pattern[str], str]] = []
        self._compile_patterns()
        self._registry_client = registry_client
        self._logger = logging.getLogger(__name__)

    def _compile_patterns(self) -> None:
        """Pre-compile patterns for efficiency."""
        for lang, patterns in self.LANGUAGE_PATTERNS.items():
            self._compiled_lang_patterns[lang] = [
                re.compile(p, re.IGNORECASE | re.MULTILINE)
                for p in patterns
            ]

        for pattern, issue in self.ISSUE_PATTERNS.items():
            self._compiled_issue_patterns.append(
                (re.compile(pattern, re.IGNORECASE), issue)
            )

    async def enrich(
        self,
        input_text: str,
        agent_id: str,
        context: dict[str, Any],
    ) -> EnrichedContext:
        """Enrich the context with comprehensive information.

        Args:
            input_text: The user input.
            agent_id: The agent processing this request.
            context: Existing context to enrich.

        Returns:
            EnrichedContext with all available information.
        """
        # Create enriched context
        enriched = EnrichedContext(
            input_text=input_text,
            agent_id=agent_id,
            session_metadata={
                "input_hash": hashlib.md5(input_text.encode()).hexdigest()[:8],
                "input_length": len(input_text),
            },
        )

        # Enrich with available resources (parallel I/O)
        skills, workflows, collections = await asyncio.gather(
            self._get_available_skills(agent_id),
            self._get_active_workflows(agent_id),
            self._get_rag_collections(agent_id),
        )
        # Sort skills by relevance to the input, keep top 10.
        enriched.available_skills = self._rank_skills(input_text, skills)
        enriched.active_workflows = workflows
        enriched.rag_collections = collections

        # Enrich with conversation history
        enriched.conversation_history = await self._get_conversation_history(
            agent_id, context.get("conversation_id")
        )

        # Analyze code context if present
        code_context = self._analyze_code_context(input_text)
        if code_context.has_code_blocks or code_context.detected_patterns:
            enriched.code_context = code_context

        # Infer user preferences from history
        enriched.user_preferences = await self._infer_user_preferences(
            agent_id, enriched.conversation_history
        )

        # Calculate enrichment confidence
        enriched.enrichment_confidence = self._calculate_confidence(enriched)

        return enriched

    async def _get_available_skills(self, agent_id: str) -> list[dict[str, Any]]:
        """Get available skills for the agent.

        Queries the skill registry via registry_client if available,
        otherwise returns default skills.
        """
        if self._registry_client:
            try:
                skills = await self._registry_client.list_skills()
                return [
                    {
                        "name": skill.name,
                        "description": skill.description,
                        "version": skill.version,
                        "capabilities": skill.manifest.get("capabilities", []),
                        "status": skill.status,
                    }
                    for skill in skills
                ]
            except Exception as e:
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to query skill registry: {e}")

        # Fallback to default skills
        return [
            {
                "name": "web-search",
                "description": "Search the web for information",
                "capabilities": ["search", "lookup", "find"],
            },
            {
                "name": "code-exec",
                "description": "Execute code snippets safely",
                "capabilities": ["execute", "run", "eval"],
            },
            {
                "name": "file-ops",
                "description": "File system operations",
                "capabilities": ["read", "write", "create", "delete"],
            },
            {
                "name": "static-analysis",
                "description": "Analyze code for issues and patterns",
                "capabilities": ["analyze", "lint", "review"],
            },
            {
                "name": "security-scan",
                "description": "Scan code for security vulnerabilities",
                "capabilities": ["security", "vulnerability", "scan"],
            },
        ]

    async def _get_active_workflows(self, agent_id: str) -> list[dict[str, Any]]:
        """Get active workflows for the agent.

        Queries the workflow registry via registry_client if available,
        otherwise returns default workflows.
        """
        if self._registry_client:
            try:
                workflows = await self._registry_client.list_workflows()
                return [
                    {
                        "id": workflow.id,
                        "name": workflow.name,
                        "description": workflow.description,
                        "type": workflow.type,
                        "status": workflow.status,
                    }
                    for workflow in workflows
                    if workflow.status == "active"
                ]
            except Exception as e:
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to query workflow registry: {e}")

        # Fallback to default workflows
        return [
            {
                "id": "incident-diagnosis",
                "name": "Incident Diagnosis",
                "description": "Multi-step incident root cause analysis",
                "type": "fta",
            },
            {
                "id": "code-review-workflow",
                "name": "Code Review Workflow",
                "description": "Comprehensive code review process",
                "type": "dag",
            },
            {
                "id": "deployment-check",
                "name": "Deployment Verification",
                "description": "Pre-deployment health checks",
                "type": "fta",
            },
        ]

    async def _get_rag_collections(
        self, agent_id: str
    ) -> list[dict[str, Any]]:
        """Get available RAG collections for the agent.

        Queries the RAG registry via registry_client if available,
        otherwise returns default collections.
        """
        if self._registry_client:
            try:
                collections = await self._registry_client.list_rag_collections()
                return [
                    {
                        "id": coll.id,
                        "name": coll.name,
                        "description": coll.description,
                        "doc_count": coll.document_count,
                        "vector_count": coll.vector_count,
                        "status": coll.status,
                    }
                    for coll in collections
                ]
            except Exception as e:
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to query RAG registry: {e}")

        # Fallback to default collections
        return [
            {
                "id": "product-docs",
                "name": "Product Documentation",
                "description": "Official product documentation and guides",
                "doc_count": 1250,
            },
            {
                "id": "runbooks",
                "name": "Operations Runbooks",
                "description": "Standard operating procedures",
                "doc_count": 85,
            },
            {
                "id": "incident-history",
                "name": "Incident History",
                "description": "Past incidents and resolutions",
                "doc_count": 432,
            },
            {
                "id": "code-standards",
                "name": "Coding Standards",
                "description": "Team coding standards and best practices",
                "doc_count": 67,
            },
        ]

    async def _get_conversation_history(
        self, agent_id: str, conversation_id: str | None
    ) -> list[dict[str, Any]]:
        """Get conversation history for context continuity.

        In production, this would query the memory manager.
        """
        # TODO: Query actual memory manager
        return []

    async def _infer_user_preferences(
        self, agent_id: str, history: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """Infer user preferences from conversation history."""
        # TODO: Implement preference inference
        return {
            "preferred_detail_level": "medium",
            "prefers_code_examples": True,
            "language": "en",
        }

    def _analyze_code_context(self, text: str) -> CodeContext:
        """Analyze code content in the input text.

        Extracts code blocks, detects programming language,
        and identifies potential issues.
        """
        context = CodeContext()

        # Extract code blocks
        code_block_pattern = r"```(\w*)\n([\s\S]*?)```"
        matches = re.findall(code_block_pattern, text)

        if matches:
            context.has_code_blocks = True
            for lang_hint, code in matches:
                context.code_snippets.append(code)
                if lang_hint:
                    context.language = lang_hint.lower()

        # Also check for inline code or unformatted code
        if not context.has_code_blocks:
            # Try to detect code-like content
            for lang, patterns in self._compiled_lang_patterns.items():
                for pattern in patterns:
                    if pattern.search(text):
                        context.detected_patterns.append(f"{lang}:{pattern.pattern[:30]}")
                        if not context.language:
                            context.language = lang
                        break

        # Check for potential issues in code
        code_to_analyze = "\n".join(context.code_snippets) if context.code_snippets else text
        for pattern, issue in self._compiled_issue_patterns:
            if pattern.search(code_to_analyze):
                context.potential_issues.append(issue)

        # Estimate complexity
        context.complexity_hint = self._estimate_complexity(code_to_analyze)

        return context

    def _estimate_complexity(self, code: str) -> str:
        """Estimate code complexity based on heuristics."""
        lines = code.strip().split("\n")
        line_count = len(lines)

        # Count nesting levels
        max_indent = 0
        for line in lines:
            stripped = line.lstrip()
            if stripped:
                indent = len(line) - len(stripped)
                max_indent = max(max_indent, indent)

        # Simple heuristics
        if line_count < 20 and max_indent < 8:
            return "low"
        elif line_count < 100 and max_indent < 16:
            return "medium"
        else:
            return "high"

    def _rank_skills(
        self, input_text: str, skills: list[dict[str, Any]], top_n: int = 10
    ) -> list[dict[str, Any]]:
        """Rank skills by relevance to *input_text* and return top-N."""
        text_lower = input_text.lower()
        scored: list[tuple[float, dict[str, Any]]] = []
        for skill in skills:
            score = self._score_skill_relevance(text_lower, skill)
            scored.append((score, skill))
        scored.sort(key=lambda t: t[0], reverse=True)
        return [s for _, s in scored[:top_n]]

    @staticmethod
    def _score_skill_relevance(text_lower: str, skill_info: dict[str, Any]) -> float:
        """Compute a 0-1 relevance score for a skill against input text."""
        caps: list[str] = skill_info.get("capabilities", [])
        if not caps:
            return 0.0
        hits: float = sum(1 for c in caps if c in text_lower)
        # Also check skill name / description fragments.
        name = skill_info.get("name", "").lower()
        if name and name.replace("-", " ") in text_lower:
            hits += 1
        desc = skill_info.get("description", "").lower()
        desc_words = [w for w in desc.split() if len(w) > 3]
        for word in desc_words:
            if word in text_lower:
                hits += 0.5
        max_possible = len(caps) + 1 + len(desc_words) * 0.5
        return min(hits / max_possible, 1.0) if max_possible > 0 else 0.0

    def _calculate_confidence(self, context: EnrichedContext) -> float:
        """Calculate confidence in the enrichment quality."""
        confidence = 0.5  # Base confidence

        # More available resources = higher confidence
        if context.available_skills:
            confidence += 0.1
        if context.active_workflows:
            confidence += 0.1
        if context.rag_collections:
            confidence += 0.1

        # Code context adds confidence for code-related routing
        if context.code_context and context.code_context.has_code_blocks:
            confidence += 0.15
        if context.code_context and context.code_context.language:
            confidence += 0.05

        return min(confidence, 1.0)
