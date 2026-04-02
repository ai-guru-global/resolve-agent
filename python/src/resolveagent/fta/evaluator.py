"""Node evaluation for FTA basic events.

Provides evaluation of basic events through skill invocation,
RAG querying, or LLM classification.
"""

from __future__ import annotations

import json
import logging
from typing import TYPE_CHECKING, Any

from resolveagent.fta.tree import FTAEvent

if TYPE_CHECKING:
    from resolveagent.skills.executor import SkillExecutor
    from resolveagent.llm.base import LLMProvider

logger = logging.getLogger(__name__)


class NodeEvaluator:
    """Evaluates basic events in a fault tree.

    Basic events can be evaluated by:
    - Invoking a skill (e.g., "skill:log-analyzer")
    - Querying RAG (e.g., "rag:runbook-collection")
    - Calling an LLM (e.g., "llm:classify")
    - Static value assignment
    """

    def __init__(
        self,
        skill_executor: SkillExecutor | None = None,
        llm_provider: LLMProvider | None = None,
        rag_pipeline: Any | None = None,
    ) -> None:
        """Initialize the evaluator.

        Args:
            skill_executor: Executor for running skills.
            llm_provider: LLM provider for classification tasks.
            rag_pipeline: RAG pipeline for querying collections.
        """
        self.skill_executor = skill_executor
        self.llm_provider = llm_provider
        self.rag_pipeline = rag_pipeline

        # Cache for evaluation results
        self._cache: dict[str, bool] = {}

    async def evaluate(self, event: FTAEvent, context: dict[str, Any]) -> bool:
        """Evaluate a basic event.

        Args:
            event: The FTA event to evaluate.
            context: Execution context containing variables and state.

        Returns:
            Boolean result of the evaluation.
        """
        # Check cache first
        cache_key = f"{event.id}:{hash(str(context))}"
        if cache_key in self._cache:
            logger.debug(
                "Using cached evaluation result",
                extra={"event_id": event.id, "result": self._cache[cache_key]},
            )
            return self._cache[cache_key]

        # Parse evaluator string: "type:target"
        if not event.evaluator:
            logger.warning(
                "No evaluator defined for event",
                extra={"event_id": event.id, "event_name": event.name},
            )
            return True

        evaluator_type, _, target = event.evaluator.partition(":")

        logger.debug(
            "Evaluating event",
            extra={"event_id": event.id, "evaluator": event.evaluator},
        )

        try:
            if evaluator_type == "skill":
                result = await self._evaluate_skill(target, event.parameters, context)
            elif evaluator_type == "rag":
                result = await self._evaluate_rag(target, event.parameters, context)
            elif evaluator_type == "llm":
                result = await self._evaluate_llm(target, event.parameters, context)
            elif evaluator_type == "static":
                result = self._evaluate_static(target, event.parameters)
            elif evaluator_type == "context":
                result = self._evaluate_context(target, context)
            else:
                logger.warning("Unknown evaluator type: %s", evaluator_type)
                result = True

            # Cache the result
            self._cache[cache_key] = result
            return result

        except Exception as e:
            logger.error(
                "Evaluation failed",
                extra={"event_id": event.id, "evaluator": event.evaluator, "error": str(e)},
            )
            # Fail-safe: return False (event did not occur)
            return False

    async def _evaluate_skill(
        self, skill_name: str, params: dict[str, Any], context: dict[str, Any]
    ) -> bool:
        """Evaluate by invoking a skill.

        Args:
            skill_name: Name of the skill to invoke.
            params: Parameters for the skill.
            context: Execution context.

        Returns:
            Boolean result from skill execution.
        """
        if not self.skill_executor:
            logger.warning(
                "Skill executor not available, cannot evaluate skill",
                extra={"skill_name": skill_name},
            )
            return True

        logger.info("Evaluating via skill: %s", skill_name)

        # Merge event parameters with context
        skill_input = {**params}
        if "context" in context:
            skill_input["_context"] = context["context"]

        try:
            result = await self.skill_executor.execute(skill_name, skill_input)

            # Parse result as boolean
            if isinstance(result, bool):
                return result
            elif isinstance(result, dict):
                # Check for standard result fields
                if "result" in result:
                    return bool(result["result"])
                elif "matched" in result:
                    return bool(result["matched"])
                elif "found" in result:
                    return bool(result["found"])
                elif "error" in result:
                    logger.warning(
                        "Skill returned error",
                        extra={"skill_name": skill_name, "error": result["error"]},
                    )
                    return False
            elif isinstance(result, (int, float)):
                return result > 0

            return bool(result)

        except Exception as e:
            logger.error(
                "Skill execution failed",
                extra={"skill_name": skill_name, "error": str(e)},
            )
            return False

    async def _evaluate_rag(
        self, collection_id: str, params: dict[str, Any], context: dict[str, Any]
    ) -> bool:
        """Evaluate by querying RAG.

        Args:
            collection_id: ID of the RAG collection to query.
            params: Query parameters including the query text.
            context: Execution context.

        Returns:
            True if relevant documents are found.
        """
        if not self.rag_pipeline:
            logger.warning(
                "RAG pipeline not available, cannot evaluate RAG",
                extra={"collection_id": collection_id},
            )
            return True

        logger.info("Evaluating via RAG: %s", collection_id)

        # Get query from parameters or context
        query = params.get("query", context.get("query", ""))
        if not query:
            logger.warning(
                "No query provided for RAG evaluation",
                extra={"collection_id": collection_id},
            )
            return False

        # Get threshold for relevance
        threshold = params.get("threshold", 0.7)
        top_k = params.get("top_k", 3)

        try:
            # Query the RAG collection
            results = await self.rag_pipeline.query(
                collection_id=collection_id,
                query=query,
                top_k=top_k,
            )

            if not results:
                logger.debug(
                    "RAG query returned no results",
                    extra={"collection_id": collection_id, "query": query},
                )
                return False

            # Check if any result exceeds threshold
            max_score = max(r.get("score", 0) for r in results)
            matched = max_score >= threshold

            logger.debug(
                "RAG evaluation result",
                extra={
                    "collection_id": collection_id,
                    "matched": matched,
                    "max_score": max_score,
                    "threshold": threshold,
                },
            )

            return matched

        except Exception as e:
            logger.error(
                "RAG query failed",
                extra={"collection_id": collection_id, "error": str(e)},
            )
            return False

    async def _evaluate_llm(
        self, model_hint: str, params: dict[str, Any], context: dict[str, Any]
    ) -> bool:
        """Evaluate by calling an LLM.

        Args:
            model_hint: Hint for model selection or classification type.
            params: Parameters including prompt template.
            context: Execution context for variable substitution.

        Returns:
            Boolean result from LLM classification.
        """
        if not self.llm_provider:
            logger.warning(
                "LLM provider not available, cannot evaluate LLM",
                extra={"model_hint": model_hint},
            )
            return True

        logger.info("Evaluating via LLM: %s", model_hint)

        # Build the prompt
        prompt_template = params.get("prompt", params.get("template", ""))
        if not prompt_template:
            # Default classification prompt
            prompt_template = """Given the following context, determine if the condition is true.

Context: {context}

Condition: {condition}

Respond with only "true" or "false"."""

        # Substitute variables
        prompt = prompt_template.format(
            context=json.dumps(context.get("context", {})),
            condition=params.get("condition", model_hint),
            **params.get("variables", {}),
        )

        try:
            # Call LLM
            response = await self.llm_provider.chat(
                messages=[
                    {"role": "system", "content": "You are a classifier. Respond with only 'true' or 'false'."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.0,  # Low temperature for consistent results
                max_tokens=10,
            )

            content = response.content.lower().strip()

            # Parse response
            if "true" in content and "false" not in content:
                return True
            elif "false" in content and "true" not in content:
                return False
            else:
                # Ambiguous response, try to extract boolean
                logger.warning(
                    "Ambiguous LLM response",
                    extra={"model_hint": model_hint, "response": content},
                )
                return "true" in content

        except Exception as e:
            logger.error(
                "LLM call failed",
                extra={"model_hint": model_hint, "error": str(e)},
            )
            return False

    def _evaluate_static(self, value: str, params: dict[str, Any]) -> bool:
        """Evaluate a static value.

        Args:
            value: The static value string.
            params: Additional parameters (unused).

        Returns:
            Parsed boolean value.
        """
        value_lower = value.lower().strip()
        if value_lower in ("true", "1", "yes", "on"):
            return True
        elif value_lower in ("false", "0", "no", "off"):
            return False
        else:
            logger.warning("Unknown static value: %s, defaulting to True", value)
            return True

    def _evaluate_context(self, key: str, context: dict[str, Any]) -> bool:
        """Evaluate by looking up a value in context.

        Args:
            key: The key to look up (supports dot notation).
            context: The execution context.

        Returns:
            Boolean value from context.
        """
        # Support dot notation: "event.value" -> context["event"]["value"]
        keys = key.split(".")
        value = context
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                logger.warning("Context key not found: %s", key)
                return False

        # Convert to boolean
        if isinstance(value, bool):
            return value
        elif isinstance(value, (int, float)):
            return value > 0
        elif isinstance(value, str):
            return value.lower() in ("true", "1", "yes", "on")
        else:
            return bool(value)

    def clear_cache(self) -> None:
        """Clear the evaluation cache."""
        self._cache.clear()
        logger.debug("Evaluation cache cleared")
