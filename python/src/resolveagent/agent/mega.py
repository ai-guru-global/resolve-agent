"""Mega Agent - the top-level orchestrator."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any, Literal

from resolveagent.agent.base import BaseAgent

if TYPE_CHECKING:
    from resolveagent.selector.protocol import SelectorProtocol
    from resolveagent.selector.selector import RouteDecision

logger = logging.getLogger(__name__)

# Valid selector mode values.
SelectorMode = Literal["selector", "hooks", "skills"]


class MegaAgent(BaseAgent):
    """Mega Agent that owns the Intelligent Selector.

    The MegaAgent receives requests, runs them through the Intelligent Selector
    to determine routing (FTA, Skill, or RAG), and orchestrates the execution
    across subsystems.
    """

    def __init__(
        self,
        name: str,
        model_id: str | None = None,
        system_prompt: str = "",
        selector_strategy: str = "hybrid",
        selector_mode: SelectorMode = "selector",
        **kwargs: Any,
    ) -> None:
        super().__init__(name=name, model_id=model_id, system_prompt=system_prompt, **kwargs)
        self.selector_strategy = selector_strategy
        self.selector_mode: SelectorMode = selector_mode
        self._selector_instance: SelectorProtocol | None = None
        self._llm_provider = None
        self._rag_pipeline = None
        self._skill_executor = None
        self._fta_engine = None
        self._static_analysis_engine = None
        self._dynamic_analysis_engine = None

    # ------------------------------------------------------------------
    # Selector factory
    # ------------------------------------------------------------------

    def _get_selector(self) -> SelectorProtocol:
        """Return a cached selector instance matching ``selector_mode``.

        The selector is lazily created on first call and reused across
        subsequent ``reply`` invocations.
        """
        if self._selector_instance is not None:
            return self._selector_instance

        if self.selector_mode == "hooks":
            from resolveagent.selector.hook_selector import HookSelectorAdapter

            self._selector_instance = HookSelectorAdapter(strategy=self.selector_strategy)
        elif self.selector_mode == "skills":
            from resolveagent.selector.skill_selector import SkillSelectorAdapter

            self._selector_instance = SkillSelectorAdapter()
        else:
            from resolveagent.selector.selector import IntelligentSelector

            self._selector_instance = IntelligentSelector(strategy=self.selector_strategy)

        return self._selector_instance

    async def reply(self, message: dict[str, Any]) -> dict[str, Any]:
        """Process a message through the Intelligent Selector and route accordingly.

        Args:
            message: Input message.

        Returns:
            Response from the selected subsystem.
        """
        selector = self._get_selector()
        decision = await selector.route(
            input_text=message.get("content", ""),
            agent_id=self.name,
        )

        logger.info(
            "Selector decision",
            extra={
                "agent": self.name,
                "route_type": decision.route_type,
                "target": decision.route_target,
                "confidence": decision.confidence,
            },
        )

        # Execute based on decision.route_type
        try:
            result = await self._execute_by_route(decision, message)
            return result
        except Exception as e:
            logger.error(
                "Execution failed",
                extra={
                    "agent": self.name,
                    "route_type": decision.route_type,
                    "error": str(e),
                },
            )
            return {
                "role": "assistant",
                "content": f"执行失败: {str(e)}",
                "metadata": {
                    "route_type": decision.route_type,
                    "route_target": decision.route_target,
                    "confidence": decision.confidence,
                    "error": str(e),
                },
            }

    async def _execute_by_route(
        self,
        decision: RouteDecision,
        message: dict[str, Any],
    ) -> dict[str, Any]:
        """Execute the request based on the routing decision.

        Args:
            decision: The routing decision from the Intelligent Selector.
            message: The original input message.

        Returns:
            Execution result.
        """
        route_type = decision.route_type
        content = message.get("content", "")

        if route_type == "direct":
            # Direct LLM call
            return await self._execute_direct(content, decision)

        elif route_type == "rag":
            # RAG pipeline
            return await self._execute_rag(content, decision)

        elif route_type == "skill":
            # Skill execution
            return await self._execute_skill(content, decision)

        elif route_type == "workflow":
            # FTA workflow execution
            return await self._execute_workflow(content, decision)

        elif route_type == "code_analysis":
            # Code analysis
            return await self._execute_code_analysis(content, decision)

        elif route_type == "multi":
            # Multi-route execution (chain of decisions)
            return await self._execute_multi(content, decision)

        else:
            # Unknown route type, fallback to direct
            logger.warning(
                "Unknown route type, falling back to direct",
                extra={"route_type": route_type},
            )
            return await self._execute_direct(content, decision)

    async def _execute_direct(
        self,
        content: str,
        decision: RouteDecision,
    ) -> dict[str, Any]:
        """Execute a direct LLM call."""
        from resolveagent.llm.higress_provider import create_llm_provider

        if self._llm_provider is None:
            self._llm_provider = create_llm_provider(model=self.model_id or "qwen-plus")

        from resolveagent.llm.provider import ChatMessage

        response = await self._llm_provider.chat(
            messages=[
                ChatMessage(role="system", content=self.system_prompt),
                ChatMessage(role="user", content=content),
            ],
            model=self.model_id,
        )

        return {
            "role": "assistant",
            "content": response.content,
            "metadata": {
                "route_type": decision.route_type,
                "route_target": decision.route_target,
                "confidence": decision.confidence,
                "model": response.model,
                "usage": response.usage,
            },
        }

    async def _execute_rag(
        self,
        content: str,
        decision: RouteDecision,
    ) -> dict[str, Any]:
        """Execute RAG pipeline."""
        from resolveagent.rag.pipeline import RAGPipeline

        if self._rag_pipeline is None:
            self._rag_pipeline = RAGPipeline()

        # Get collection from decision parameters or use default
        collection = decision.parameters.get("collection", "default")
        top_k = decision.parameters.get("top_k", 5)

        results = await self._rag_pipeline.query(
            collection_id=collection,
            query=content,
            top_k=top_k,
        )

        # Format results for LLM context
        context = self._format_rag_results(results)

        # Generate response with context
        from resolveagent.llm.higress_provider import create_llm_provider
        from resolveagent.llm.provider import ChatMessage

        if self._llm_provider is None:
            self._llm_provider = create_llm_provider(model=self.model_id or "qwen-plus")

        prompt = f"""基于以下检索到的信息回答问题：

{context}

用户问题：{content}
"""

        response = await self._llm_provider.chat(
            messages=[
                ChatMessage(role="system", content=self.system_prompt),
                ChatMessage(role="user", content=prompt),
            ],
            model=self.model_id,
        )

        return {
            "role": "assistant",
            "content": response.content,
            "metadata": {
                "route_type": decision.route_type,
                "route_target": decision.route_target,
                "confidence": decision.confidence,
                "retrieved_docs": len(results),
                "sources": [r.get("source", "") for r in results],
            },
        }

    def _format_rag_results(self, results: list[dict[str, Any]]) -> str:
        """Format RAG results for LLM context."""
        if not results:
            return "未找到相关信息。"

        formatted = []
        for i, result in enumerate(results, 1):
            text = result.get("text", "")
            score = result.get("score", 0.0)
            formatted.append(f"[{i}] (相关性: {score:.2f})\n{text}")

        return "\n\n".join(formatted)

    async def _execute_skill(
        self,
        content: str,
        decision: RouteDecision,
    ) -> dict[str, Any]:
        """Execute a skill."""
        from resolveagent.skills.executor import SkillExecutor
        from resolveagent.skills.loader import SkillLoader

        if self._skill_executor is None:
            self._skill_executor = SkillExecutor()

        skill_name = decision.route_target or decision.parameters.get("skill")
        if not skill_name:
            return {
                "role": "assistant",
                "content": "无法执行：未指定技能名称",
                "metadata": {
                    "route_type": decision.route_type,
                    "error": "No skill specified",
                },
            }

        # Load and execute skill
        loader = SkillLoader()
        skill = await loader.load(skill_name)

        # Prepare inputs from decision parameters
        inputs = decision.parameters.get("inputs", {})
        if not inputs:
            # Use the content as input if no explicit inputs
            inputs = {"query": content}

        result = await self._skill_executor.execute(skill, inputs)

        return {
            "role": "assistant",
            "content": f"技能执行结果:\n{result.outputs}" if result.success else f"技能执行失败: {result.error}",
            "metadata": {
                "route_type": decision.route_type,
                "route_target": decision.route_target,
                "confidence": decision.confidence,
                "skill": skill_name,
                "success": result.success,
                "duration_ms": result.duration_ms,
            },
        }

    async def _execute_workflow(
        self,
        content: str,
        decision: RouteDecision,
    ) -> dict[str, Any]:
        """Execute an FTA workflow."""
        from resolveagent.fta.engine import FTAEngine

        if self._fta_engine is None:
            self._fta_engine = FTAEngine()

        workflow_name = decision.route_target or decision.parameters.get("workflow")
        if not workflow_name:
            return {
                "role": "assistant",
                "content": "无法执行：未指定工作流名称",
                "metadata": {
                    "route_type": decision.route_type,
                    "error": "No workflow specified",
                },
            }

        # Load workflow definition from registry or use default
        workflow_def = None
        try:
            from resolveagent.runtime.registry_client import get_registry_client

            registry = get_registry_client()
            workflow_info = await registry.get_workflow(workflow_name)
            if workflow_info:
                workflow_def = workflow_info.definition
        except Exception as e:
            logger.debug(f"Could not load workflow from registry: {e}")

        # Execute workflow
        if workflow_def:
            # Use workflow definition to execute
            result = await self._execute_defined_workflow(content, workflow_def, decision)
            return result

        # Fallback: simple workflow execution
        return {
            "role": "assistant",
            "content": f"工作流 '{workflow_name}' 已启动分析:\n{content}",
            "metadata": {
                "route_type": decision.route_type,
                "route_target": decision.route_target,
                "confidence": decision.confidence,
                "workflow": workflow_name,
            },
        }

    async def _execute_defined_workflow(
        self,
        content: str,
        workflow_def: dict[str, Any],
        decision: RouteDecision,
    ) -> dict[str, Any]:
        """Execute a defined workflow.

        Args:
            content: Input content.
            workflow_def: Workflow definition.
            decision: Route decision.

        Returns:
            Execution result.
        """
        workflow_name = workflow_def.get("name", "unnamed")
        nodes = workflow_def.get("nodes", [])
        edges = workflow_def.get("edges", [])

        logger.info(
            "Executing defined workflow",
            extra={
                "workflow": workflow_name,
                "nodes": len(nodes),
                "edges": len(edges),
            },
        )

        # Simple workflow execution: process through nodes
        results = []
        current_data = content

        for node in nodes:
            node_type = node.get("type")
            node_id = node.get("id")

            if node_type == "start":
                continue
            elif node_type == "end":
                break
            elif node_type == "agent":
                # Process with LLM
                result = await self.reply({"content": current_data})
                current_data = result.get("content", "")
                results.append({"node": node_id, "result": current_data})
            elif node_type == "skill":
                # Execute skill
                skill_name = node.get("config", {}).get("skill_name")
                if skill_name:
                    from resolveagent.skills.executor import SkillExecutor

                    executor = SkillExecutor()
                    skill_result = await executor.execute(
                        skill_name=skill_name,
                        parameters={"input": current_data},
                        context={},
                    )
                    current_data = str(skill_result.output) if skill_result.success else str(skill_result.error)
                    results.append({"node": node_id, "skill": skill_name, "result": current_data})

        return {
            "role": "assistant",
            "content": current_data,
            "metadata": {
                "route_type": decision.route_type,
                "route_target": decision.route_target,
                "workflow": workflow_name,
                "workflow_results": results,
            },
        }

    async def _execute_code_analysis(
        self,
        content: str,
        decision: RouteDecision,
    ) -> dict[str, Any]:
        """Execute code analysis with sub-type dispatch.

        Supports three sub-types based on ``decision.parameters``:
        - ``static``: AST-based call graph + error parsing + solution generation
        - ``traffic``: Dynamic traffic capture analysis + graph building
        - ``llm`` (default): LLM-only code review (legacy behaviour)
        """
        sub_type = decision.parameters.get("sub_type", "llm")

        if sub_type == "static":
            return await self._execute_static_analysis(content, decision)
        elif sub_type == "traffic":
            return await self._execute_traffic_analysis(content, decision)
        else:
            return await self._execute_llm_code_analysis(content, decision)

    async def _execute_llm_code_analysis(
        self,
        content: str,
        decision: RouteDecision,
    ) -> dict[str, Any]:
        """LLM-only code analysis (legacy behaviour)."""
        from resolveagent.llm.higress_provider import create_llm_provider
        from resolveagent.llm.provider import ChatMessage

        if self._llm_provider is None:
            self._llm_provider = create_llm_provider(model=self.model_id or "qwen-plus")

        analysis_prompt = f"""请分析以下代码，检查潜在的 bug、安全问题和优化机会：

```
{content}
```

请提供：
1. 代码质量评分 (1-10)
2. 发现的问题列表
3. 改进建议
"""

        response = await self._llm_provider.chat(
            messages=[
                ChatMessage(role="system", content="你是一个专业的代码审查助手。"),
                ChatMessage(role="user", content=analysis_prompt),
            ],
            model=self.model_id,
        )

        return {
            "role": "assistant",
            "content": response.content,
            "metadata": {
                "route_type": decision.route_type,
                "route_target": decision.route_target,
                "confidence": decision.confidence,
                "analyzer": "llm-based",
            },
        }

    async def _execute_static_analysis(
        self,
        content: str,
        decision: RouteDecision,
    ) -> dict[str, Any]:
        """Execute AST-based static analysis engine."""
        from resolveagent.code_analysis.engine import StaticAnalysisEngine

        if self._static_analysis_engine is None:
            self._static_analysis_engine = StaticAnalysisEngine(
                llm_provider=self._llm_provider,
                rag_pipeline=self._rag_pipeline,
                model=self.model_id,
            )

        repo_path = decision.parameters.get("repo_path", "")
        language = decision.parameters.get("language")
        entry_points = decision.parameters.get("entry_points")
        error_logs = decision.parameters.get("error_logs", content)

        if not repo_path:
            return {
                "role": "assistant",
                "content": "静态分析需要指定 repo_path 参数",
                "metadata": {
                    "route_type": decision.route_type,
                    "error": "missing_repo_path",
                },
            }

        result = await self._static_analysis_engine.analyze_single(
            repo_path=repo_path,
            language=language,
            entry_points=entry_points,
            error_logs=error_logs,
        )

        parts = ["## 静态分析结果\n"]
        parts.append(f"- 调用图节点: {result.stats.get('call_graph_nodes', 0)}")
        parts.append(f"- 调用图边: {result.stats.get('call_graph_edges', 0)}")
        parts.append(f"- 发现错误: {result.stats.get('errors_found', 0)}")
        parts.append(f"- 生成解决方案: {result.stats.get('solutions_generated', 0)}")

        if result.solutions:
            parts.append("\n### 解决方案")
            for sol in result.solutions[:5]:
                parts.append(f"\n**{sol.title}** ({sol.severity})")
                parts.append(sol.summary[:200])

        return {
            "role": "assistant",
            "content": "\n".join(parts),
            "metadata": {
                "route_type": decision.route_type,
                "route_target": decision.route_target,
                "confidence": decision.confidence,
                "analyzer": "static-analysis",
                "stats": result.stats,
            },
        }

    async def _execute_traffic_analysis(
        self,
        content: str,
        decision: RouteDecision,
    ) -> dict[str, Any]:
        """Execute dynamic traffic analysis engine."""
        from resolveagent.traffic.engine import DynamicAnalysisEngine

        if self._dynamic_analysis_engine is None:
            self._dynamic_analysis_engine = DynamicAnalysisEngine(
                llm_provider=self._llm_provider,
                rag_pipeline=self._rag_pipeline,
                model=self.model_id,
            )

        sources = decision.parameters.get("sources", [])
        name = decision.parameters.get("name", "")
        target_service = decision.parameters.get("target_service", "")

        if not sources:
            return {
                "role": "assistant",
                "content": "流量分析需要指定 sources 参数（OTel/Proxy/eBPF 数据）",
                "metadata": {
                    "route_type": decision.route_type,
                    "error": "missing_sources",
                },
            }

        result = await self._dynamic_analysis_engine.analyze_single(
            sources=sources,
            name=name,
            target_service=target_service,
        )

        report = result.get("report", {})
        stats = result.get("stats", {})

        parts = ["## 流量分析结果\n"]
        parts.append(f"- 服务数: {stats.get('unique_services', 0)}")
        parts.append(f"- 调用链路: {stats.get('unique_edges', 0)}")
        parts.append(f"- 总请求数: {stats.get('total_requests', 0)}")
        parts.append(f"- 错误率: {stats.get('error_rate', 0):.2%}")

        if report.get("summary"):
            parts.append(f"\n### 分析摘要\n{report['summary'][:500]}")

        if report.get("suggestions"):
            parts.append("\n### 优化建议")
            for s in report["suggestions"][:5]:
                parts.append(f"- **{s.get('title', '')}**: {s.get('description', '')}")

        return {
            "role": "assistant",
            "content": "\n".join(parts),
            "metadata": {
                "route_type": decision.route_type,
                "route_target": decision.route_target,
                "confidence": decision.confidence,
                "analyzer": "traffic-analysis",
                "stats": stats,
                "graph": result.get("graph"),
            },
        }

    async def _execute_multi(
        self,
        content: str,
        decision: RouteDecision,
    ) -> dict[str, Any]:
        """Execute multiple routes in sequence."""
        results = []

        for sub_decision in decision.chain:
            sub_result = await self._execute_by_route(sub_decision, {"content": content})
            results.append(sub_result)

        # Combine results
        combined_content = "\n\n".join([f"[{i + 1}] {r['metadata']['route_type']}: {r['content'][:200]}..." for i, r in enumerate(results)])

        return {
            "role": "assistant",
            "content": f"多路由执行结果:\n{combined_content}",
            "metadata": {
                "route_type": decision.route_type,
                "route_target": decision.route_target,
                "confidence": decision.confidence,
                "sub_results": len(results),
            },
        }
