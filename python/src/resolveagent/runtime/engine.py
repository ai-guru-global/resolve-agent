"""Execution engine for agent runs."""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from typing import Any, AsyncIterator

from resolveagent.agent.mega import MegaAgent
from resolveagent.runtime.context import ExecutionContext
from resolveagent.selector.selector import IntelligentSelector, RouteDecision

logger = logging.getLogger(__name__)


class ExecutionEngine:
    """Orchestrates agent execution.

    The engine creates an execution context, loads the agent,
    invokes the Intelligent Selector, and routes to the appropriate
    subsystem (FTA, Skills, or RAG).

    Example:
        ```python
        engine = ExecutionEngine()
        async for chunk in engine.execute(
            agent_id="my-agent",
            input_text="Analyze this error",
        ):
            print(chunk)
        ```
    """

    def __init__(self, registry_client: Any | None = None) -> None:
        self._agent_pool: dict[str, MegaAgent] = {}
        self._selector = IntelligentSelector(strategy="hybrid", registry_client=registry_client)
        self._conversations: dict[str, list[dict]] = {}
        self._execution_count = 0
        self._registry_client = registry_client

    async def execute(
        self,
        agent_id: str,
        input_text: str,
        conversation_id: str | None = None,
        context: dict[str, Any] | None = None,
        stream: bool = True,
    ) -> AsyncIterator[dict[str, Any]]:
        """Execute an agent with the given input.

        Args:
            agent_id: The agent to execute.
            input_text: User input.
            conversation_id: Conversation context ID (auto-generated if None).
            context: Additional context data.
            stream: Whether to stream results or return all at once.

        Yields:
            Response chunks with content or events.
        """
        execution_id = str(uuid.uuid4())
        start_time = time.time()

        # Use or create conversation ID
        conversation_id = conversation_id or str(uuid.uuid4())

        # Initialize conversation history if new
        if conversation_id not in self._conversations:
            self._conversations[conversation_id] = []

        # Create execution context
        ctx = ExecutionContext(
            execution_id=execution_id,
            agent_id=agent_id,
            conversation_id=conversation_id,
            input_text=input_text,
            context=context or {},
        )

        logger.info(
            "Starting execution",
            extra={
                "execution_id": execution_id,
                "agent_id": agent_id,
                "conversation_id": conversation_id,
            },
        )

        # Yield start event
        yield {
            "type": "event",
            "event": {
                "type": "execution.started",
                "message": f"Starting agent {agent_id}",
                "data": {
                    "execution_id": execution_id,
                    "agent_id": agent_id,
                    "conversation_id": conversation_id,
                    "timestamp": start_time,
                },
            },
        }

        try:
            # Load or create agent
            agent = await self._load_agent(agent_id)

            # Add user message to conversation history
            user_message = {"role": "user", "content": input_text}
            self._conversations[conversation_id].append(user_message)

            # Run Intelligent Selector for routing decision
            yield {
                "type": "event",
                "event": {
                    "type": "selector.started",
                    "message": "Analyzing request...",
                    "data": {"input_length": len(input_text)},
                },
            }

            decision = await self._selector.route(
                input_text=input_text,
                agent_id=agent_id,
                conversation_history=self._conversations[conversation_id][-10:],  # Last 10 messages
            )

            yield {
                "type": "event",
                "event": {
                    "type": "selector.completed",
                    "message": f"Route: {decision.route_type} -> {decision.route_target}",
                    "data": {
                        "route_type": decision.route_type,
                        "route_target": decision.route_target,
                        "confidence": decision.confidence,
                        "reasoning": decision.reasoning,
                    },
                },
            }

            # Execute based on routing decision
            if stream:
                async for chunk in self._execute_streaming(agent, input_text, decision, ctx):
                    yield chunk
            else:
                result = await self._execute_sync(agent, input_text, decision, ctx)
                yield {
                    "type": "content",
                    "content": result.get("content", ""),
                    "metadata": result.get("metadata", {}),
                }

            # Add assistant response to conversation history
            # (Note: actual content is handled by the caller)

            duration = time.time() - start_time
            self._execution_count += 1

            yield {
                "type": "event",
                "event": {
                    "type": "execution.completed",
                    "message": "Execution completed",
                    "data": {
                        "execution_id": execution_id,
                        "duration_ms": round(duration * 1000, 2),
                        "execution_count": self._execution_count,
                    },
                },
            }

            logger.info(
                "Execution completed",
                extra={
                    "execution_id": execution_id,
                    "agent_id": agent_id,
                    "duration_ms": round(duration * 1000, 2),
                },
            )

        except Exception as e:
            duration = time.time() - start_time
            logger.exception(
                "Execution failed",
                extra={
                    "execution_id": execution_id,
                    "agent_id": agent_id,
                    "error": str(e),
                },
            )

            yield {
                "type": "event",
                "event": {
                    "type": "execution.failed",
                    "message": f"Execution failed: {str(e)}",
                    "data": {
                        "execution_id": execution_id,
                        "error": str(e),
                        "duration_ms": round(duration * 1000, 2),
                    },
                },
            }

            # Yield error content
            yield {
                "type": "content",
                "content": f"执行失败: {str(e)}",
                "metadata": {"error": str(e)},
            }

    async def _load_agent(self, agent_id: str) -> MegaAgent:
        """Load an agent from the pool or create a new one.

        Args:
            agent_id: The agent identifier.

        Returns:
            Loaded or created MegaAgent instance.
        """
        if agent_id in self._agent_pool:
            logger.debug("Loaded agent from pool", extra={"agent_id": agent_id})
            return self._agent_pool[agent_id]

        # Try to load agent configuration from registry
        agent_config = None
        if self._registry_client:
            try:
                agent_info = await self._registry_client.get_agent(agent_id)
                if agent_info:
                    agent_config = {
                        "name": agent_info.name,
                        "model_id": agent_info.config.get("model_id", "qwen-plus"),
                        "system_prompt": agent_info.config.get("system_prompt", ""),
                        "selector_strategy": agent_info.config.get("selector_strategy", "hybrid"),
                        "skill_names": agent_info.config.get("skill_names", []),
                    }
                    logger.info("Loaded agent from registry", extra={"agent_id": agent_id})
            except Exception as e:
                logger.warning(f"Failed to load agent from registry: {e}", extra={"agent_id": agent_id})

        # Create agent with config or defaults
        if agent_config:
            agent = MegaAgent(
                name=agent_config["name"],
                model_id=agent_config["model_id"],
                system_prompt=agent_config["system_prompt"],
                selector_strategy=agent_config["selector_strategy"],
                skill_names=agent_config["skill_names"],
            )
        else:
            # Create with default configuration
            agent = MegaAgent(
                name=agent_id,
                model_id="qwen-plus",
                system_prompt="你是一个智能助手，可以帮助用户完成各种任务。",
                selector_strategy="hybrid",
            )

        self._agent_pool[agent_id] = agent
        logger.info("Created new agent", extra={"agent_id": agent_id, "from_registry": agent_config is not None})

        return agent

    async def _execute_streaming(
        self,
        agent: MegaAgent,
        input_text: str,
        decision: RouteDecision,
        ctx: ExecutionContext,
    ) -> AsyncIterator[dict[str, Any]]:
        """Execute with streaming output.

        Args:
            agent: The agent to execute.
            input_text: User input.
            decision: Routing decision.
            ctx: Execution context.

        Yields:
            Response chunks.
        """
        message = {"content": input_text, "context": ctx.context}

        # Route to appropriate subsystem
        if decision.route_type == "direct":
            # Direct LLM call with streaming
            async for chunk in self._stream_direct_llm(agent, input_text, decision):
                yield chunk

        elif decision.route_type == "rag":
            # RAG with streaming
            async for chunk in self._stream_rag(agent, input_text, decision):
                yield chunk

        else:
            # Non-streaming execution for other types
            result = await agent.reply(message)

            yield {
                "type": "content",
                "content": result.get("content", ""),
                "metadata": result.get("metadata", {}),
            }

    async def _execute_sync(
        self,
        agent: MegaAgent,
        input_text: str,
        decision: RouteDecision,
        ctx: ExecutionContext,
    ) -> dict[str, Any]:
        """Execute synchronously (non-streaming).

        Args:
            agent: The agent to execute.
            input_text: User input.
            decision: Routing decision.
            ctx: Execution context.

        Returns:
            Execution result.
        """
        message = {"content": input_text, "context": ctx.context}
        return await agent.reply(message)

    async def _stream_direct_llm(
        self,
        agent: MegaAgent,
        input_text: str,
        decision: RouteDecision,
    ) -> AsyncIterator[dict[str, Any]]:
        """Stream direct LLM response.

        Args:
            agent: The agent.
            input_text: User input.
            decision: Routing decision.

        Yields:
            Content chunks.
        """
        from resolveagent.llm.higress_provider import create_llm_provider
        from resolveagent.llm.provider import ChatMessage

        llm = create_llm_provider(model=agent.model_id or "qwen-plus")

        messages = [
            ChatMessage(role="system", content=agent.system_prompt),
            ChatMessage(role="user", content=input_text),
        ]

        try:
            # Try streaming
            content_parts = []
            async for chunk in llm.chat_stream(messages=messages, model=agent.model_id):
                delta = chunk.delta
                content_parts.append(delta)

                yield {
                    "type": "content_chunk",
                    "content": delta,
                    "metadata": {
                        "route_type": decision.route_type,
                        "finished": chunk.finish_reason is not None,
                    },
                }

        except Exception as e:
            logger.warning("Streaming failed, falling back to sync", extra={"error": str(e)})

            # Fallback to non-streaming
            response = await llm.chat(messages=messages, model=agent.model_id)

            yield {
                "type": "content",
                "content": response.content,
                "metadata": {
                    "route_type": decision.route_type,
                    "model": response.model,
                },
            }

    async def _stream_rag(
        self,
        agent: MegaAgent,
        input_text: str,
        decision: RouteDecision,
    ) -> AsyncIterator[dict[str, Any]]:
        """Stream RAG response.

        Args:
            agent: The agent.
            input_text: User input.
            decision: Routing decision.

        Yields:
            Content chunks.
        """
        from resolveagent.rag.pipeline import RAGPipeline

        pipeline = RAGPipeline()

        # Get collection from decision
        collection = decision.parameters.get("collection", "default")
        top_k = decision.parameters.get("top_k", 5)

        yield {
            "type": "event",
            "event": {
                "type": "rag.retrieving",
                "message": "Retrieving relevant documents...",
                "data": {"collection": collection, "query": input_text},
            },
        }

        # Retrieve documents
        results = await pipeline.query(
            collection_id=collection,
            query=input_text,
            top_k=top_k,
        )

        yield {
            "type": "event",
            "event": {
                "type": "rag.retrieved",
                "message": f"Retrieved {len(results)} documents",
                "data": {"count": len(results)},
            },
        }

        # Generate response with retrieved context
        # For now, just yield the formatted result
        formatted = agent._format_rag_results(results)

        # Use LLM to generate final response
        from resolveagent.llm.higress_provider import create_llm_provider
        from resolveagent.llm.provider import ChatMessage

        llm = create_llm_provider(model=agent.model_id or "qwen-plus")

        prompt = f"""基于以下检索到的信息回答问题：

{formatted}

用户问题：{input_text}
"""

        response = await llm.chat(
            messages=[
                ChatMessage(role="system", content=agent.system_prompt),
                ChatMessage(role="user", content=prompt),
            ],
            model=agent.model_id,
        )

        yield {
            "type": "content",
            "content": response.content,
            "metadata": {
                "route_type": decision.route_type,
                "retrieved_docs": len(results),
                "sources": [r.get("source", "") for r in results],
            },
        }

    def get_conversation_history(self, conversation_id: str) -> list[dict]:
        """Get conversation history.

        Args:
            conversation_id: The conversation ID.

        Returns:
            List of messages in the conversation.
        """
        return self._conversations.get(conversation_id, []).copy()

    def clear_conversation(self, conversation_id: str) -> bool:
        """Clear a conversation history.

        Args:
            conversation_id: The conversation ID.

        Returns:
            True if conversation existed and was cleared.
        """
        if conversation_id in self._conversations:
            del self._conversations[conversation_id]
            return True
        return False

    async def execute_workflow(
        self,
        workflow_id: str,
        input_data: dict[str, Any],
        context: dict[str, Any] | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """Execute a workflow.

        Args:
            workflow_id: The workflow to execute.
            input_data: Input data for the workflow.
            context: Additional context data.

        Yields:
            Workflow execution events and results.
        """
        execution_id = str(uuid.uuid4())
        start_time = time.time()

        logger.info(
            "Starting workflow execution",
            extra={
                "execution_id": execution_id,
                "workflow_id": workflow_id,
            },
        )

        # Yield start event
        yield {
            "type": "event",
            "event": {
                "type": "workflow.started",
                "message": f"Starting workflow {workflow_id}",
                "data": {
                    "execution_id": execution_id,
                    "workflow_id": workflow_id,
                    "timestamp": start_time,
                },
            },
        }

        try:
            # Load workflow from registry (placeholder - use registry_client in production)
            # For now, create a simple workflow execution
            from resolveagent.fta.workflow import Workflow, WorkflowNode
            
            workflow = Workflow(
                id=workflow_id,
                name=f"Workflow-{workflow_id}",
                description="Auto-generated workflow",
                nodes=[
                    WorkflowNode(
                        id="start",
                        type="start",
                        config={"input": input_data},
                    ),
                    WorkflowNode(
                        id="process",
                        type="agent",
                        config={"agent_id": "default-agent"},
                    ),
                    WorkflowNode(
                        id="end",
                        type="end",
                        config={},
                    ),
                ],
                edges=[
                    {"from": "start", "to": "process"},
                    {"from": "process", "to": "end"},
                ],
            )

            # Execute workflow steps
            current_data = input_data
            
            for i, node in enumerate(workflow.nodes):
                yield {
                    "type": "event",
                    "event": {
                        "type": "workflow.step_started",
                        "message": f"Executing step {node.id}",
                        "data": {
                            "step_index": i,
                            "node_id": node.id,
                            "node_type": node.type,
                        },
                    },
                }

                # Execute node based on type
                if node.type == "agent":
                    agent_id = node.config.get("agent_id", "default")
                    async for chunk in self.execute(
                        agent_id=agent_id,
                        input_text=current_data.get("text", str(current_data)),
                        context=context,
                    ):
                        # Filter only content chunks for workflow output
                        if chunk.get("type") in ("content", "content_chunk"):
                            yield chunk
                
                elif node.type == "skill":
                    from resolveagent.skills.executor import SkillExecutor
                    executor = SkillExecutor()
                    result = await executor.execute(
                        skill_name=node.config.get("skill_name", ""),
                        parameters=current_data,
                        context=context or {},
                    )
                    yield {
                        "type": "content",
                        "content": str(result.output) if result.success else str(result.error),
                        "metadata": {"step": node.id, "success": result.success},
                    }

                yield {
                    "type": "event",
                    "event": {
                        "type": "workflow.step_completed",
                        "message": f"Step {node.id} completed",
                        "data": {"node_id": node.id},
                    },
                }

            duration = time.time() - start_time
            
            yield {
                "type": "event",
                "event": {
                    "type": "workflow.completed",
                    "message": "Workflow execution completed",
                    "data": {
                        "execution_id": execution_id,
                        "workflow_id": workflow_id,
                        "duration_ms": round(duration * 1000, 2),
                    },
                },
            }

            logger.info(
                "Workflow execution completed",
                extra={
                    "execution_id": execution_id,
                    "workflow_id": workflow_id,
                    "duration_ms": round(duration * 1000, 2),
                },
            )

        except Exception as e:
            duration = time.time() - start_time
            logger.exception(
                "Workflow execution failed",
                extra={
                    "execution_id": execution_id,
                    "workflow_id": workflow_id,
                    "error": str(e),
                },
            )

            yield {
                "type": "event",
                "event": {
                    "type": "workflow.failed",
                    "message": f"Workflow failed: {str(e)}",
                    "data": {
                        "execution_id": execution_id,
                        "error": str(e),
                        "duration_ms": round(duration * 1000, 2),
                    },
                },
            }

    def get_stats(self) -> dict[str, Any]:
        """Get engine statistics.

        Returns:
            Engine statistics.
        """
        return {
            "execution_count": self._execution_count,
            "active_agents": len(self._agent_pool),
            "active_conversations": len(self._conversations),
        }
