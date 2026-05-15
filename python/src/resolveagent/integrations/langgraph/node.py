"""ResolveAgent LangGraph node implementation."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class ResolveAgentNode:
    """LangGraph node wrapping a ResolveAgent agent.

    This node integrates ResolveAgent's diagnostic capabilities into
    a LangGraph state graph. It processes state, invokes the agent,
    and returns updated state.

    Args:
        agent: BaseAgent instance to wrap.
        node_name: Name of this node in the graph.
        output_key: State key to write agent output to.

    Example::
        from resolveagent.agent.base import BaseAgent
        from resolveagent.integrations.langgraph.node import ResolveAgentNode

        agent = BaseAgent(name="diagnostician")
        node = ResolveAgentNode(agent, node_name="diagnose")

        # In a LangGraph workflow:
        # graph.add_node("diagnose", node)
    """

    def __init__(
        self,
        agent: Any,
        node_name: str,
        output_key: str = "messages",
    ) -> None:
        """Initialize the ResolveAgent node.

        Args:
            agent: Agent instance with a ``reply`` method.
            node_name: Identifier for this node.
            output_key: Key in state dict to write output to.
        """
        self.agent = agent
        self.node_name = node_name
        self.output_key = output_key

    async def __call__(self, state: dict[str, Any]) -> dict[str, Any]:
        """Execute the agent and return updated state.

        Args:
            state: Current graph state, expected to contain ``messages``
                or the configured input key.

        Returns:
            Updated state with agent response appended.
        """
        # Extract the latest user message
        messages = state.get("messages", [])
        if not messages:
            logger.warning("No messages in state for node %s", self.node_name)
            return state

        latest = messages[-1]
        if isinstance(latest, dict):
            message = latest
        else:
            # Handle LangChain message types
            message = {"role": getattr(latest, "type", "user"), "content": getattr(latest, "content", str(latest))}

        logger.info("Node %s processing message", self.node_name, extra={"agent": self.agent.name})

        try:
            response = await self.agent.reply(message)
        except Exception:
            logger.exception("Agent %s failed in node %s", self.agent.name, self.node_name)
            response = {
                "role": "assistant",
                "content": f"[{self.node_name}] Error processing request.",
            }

        # Return updated state
        new_state = dict(state)
        if self.output_key == "messages":
            new_state["messages"] = list(messages) + [response]
        else:
            new_state[self.output_key] = response

        return new_state

    def get_name(self) -> str:
        """Return the node name."""
        return self.node_name


class SkillExecutorNode:
    """LangGraph node that executes a ResolveAgent skill.

    This node is useful for invoking specific skills within a LangGraph
    workflow, such as running FTA analysis or code diagnostics.

    Args:
        skill_executor: SkillExecutor instance.
        skill_name: Name of the skill to execute.
        input_mapping: Maps state keys to skill input parameters.
        output_key: State key to write skill output to.

    Example::
        from resolveagent.skills.executor import SkillExecutor
        from resolveagent.integrations.langgraph.node import SkillExecutorNode

        executor = SkillExecutor()
        node = SkillExecutorNode(
            executor,
            skill_name="fta_analyzer",
            input_mapping={"incident_data": "query"},
            output_key="diagnosis_result",
        )
    """

    def __init__(
        self,
        skill_executor: Any,
        skill_name: str,
        input_mapping: dict[str, str] | None = None,
        output_key: str = "skill_result",
    ) -> None:
        """Initialize the skill executor node.

        Args:
            skill_executor: Executor for running skills.
            skill_name: Name of the skill to invoke.
            input_mapping: Maps state keys to skill parameter names.
            output_key: State key to write results to.
        """
        self.skill_executor = skill_executor
        self.skill_name = skill_name
        self.input_mapping = input_mapping or {}
        self.output_key = output_key

    async def __call__(self, state: dict[str, Any]) -> dict[str, Any]:
        """Execute the skill and return updated state.

        Args:
            state: Current graph state.

        Returns:
            Updated state with skill output.
        """
        # Build skill inputs from state via mapping
        skill_inputs: dict[str, Any] = {}
        for state_key, param_name in self.input_mapping.items():
            if state_key in state:
                skill_inputs[param_name] = state[state_key]

        # Also pass raw state for skills that expect it
        if not skill_inputs:
            skill_inputs = {"state": state}

        logger.info(
            "Executing skill %s in node",
            self.skill_name,
            extra={"inputs": list(skill_inputs.keys())},
        )

        try:
            # Lazy import to avoid circular deps
            from resolveagent.skills.loader import SkillLoader

            loader = SkillLoader()
            skill = loader.get(self.skill_name)
            if skill is None:
                raise ValueError(f"Skill not found: {self.skill_name}")

            result = await self.skill_executor.execute(skill, skill_inputs)

            new_state = dict(state)
            new_state[self.output_key] = {
                "success": result.success,
                "outputs": result.outputs,
                "error": result.error,
                "duration_ms": result.duration_ms,
            }
            return new_state
        except Exception:
            logger.exception("Skill %s execution failed", self.skill_name)
            new_state = dict(state)
            new_state[self.output_key] = {
                "success": False,
                "error": f"Failed to execute skill: {self.skill_name}",
            }
            return new_state
