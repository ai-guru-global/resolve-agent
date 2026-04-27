"""LLM-based traffic analysis report generator.

Analyses traffic graphs to produce structured reports with
optimisation suggestions.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from resolveagent.traffic.graph_builder import TrafficGraphData

logger = logging.getLogger(__name__)


@dataclass
class AnalysisReport:
    """Structured traffic analysis report."""

    summary: str = ""
    hotspots: list[dict[str, Any]] = field(default_factory=list)
    anomalies: list[dict[str, Any]] = field(default_factory=list)
    suggestions: list[dict[str, Any]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_markdown(self) -> str:
        parts = ["# Traffic Analysis Report\n"]
        if self.summary:
            parts.append(f"{self.summary}\n")

        if self.hotspots:
            parts.append("## Hotspots\n")
            for h in self.hotspots:
                parts.append(f"- **{h.get('service', '')}**: {h.get('description', '')}")
            parts.append("")

        if self.anomalies:
            parts.append("## Anomalies\n")
            for a in self.anomalies:
                parts.append(f"- **{a.get('type', '')}**: {a.get('description', '')}")
            parts.append("")

        if self.suggestions:
            parts.append("## Suggestions\n")
            for i, s in enumerate(self.suggestions, 1):
                parts.append(f"{i}. **{s.get('title', '')}** - {s.get('description', '')}")
                if s.get("priority"):
                    parts.append(f"   Priority: {s['priority']}")
            parts.append("")

        return "\n".join(parts)

    def to_dict(self) -> dict[str, Any]:
        return {
            "summary": self.summary,
            "hotspots": self.hotspots,
            "anomalies": self.anomalies,
            "suggestions": self.suggestions,
            "metadata": self.metadata,
        }


class ReportGenerator:
    """Generate analysis reports from traffic graph data.

    Supports LLM-based generation with optional RAG context,
    as well as a rule-based fallback.

    Usage::

        gen = ReportGenerator(llm_provider=provider)
        report = await gen.generate(graph_data)
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

    async def generate(self, graph: TrafficGraphData) -> AnalysisReport:
        """Generate a report from traffic graph data."""
        # Always run rule-based analysis first
        rule_report = self._rule_based_analysis(graph)

        if self._llm is not None:
            try:
                llm_report = await self._generate_with_llm(graph, rule_report)
                return llm_report
            except Exception:
                logger.warning("LLM report generation failed, using rule-based fallback", exc_info=True)

        return rule_report

    def _rule_based_analysis(self, graph: TrafficGraphData) -> AnalysisReport:
        """Rule-based traffic analysis without LLM."""
        report = AnalysisReport()
        stats = graph.stats

        # Summary
        report.summary = (
            f"分析了 {stats.get('total_records', 0)} 条流量记录，"
            f"涉及 {stats.get('unique_services', 0)} 个服务和 "
            f"{stats.get('unique_edges', 0)} 条调用链路。"
        )

        # Detect hotspots (high request count nodes)
        sorted_nodes = sorted(graph.nodes, key=lambda n: n.request_count, reverse=True)
        for node in sorted_nodes[:5]:
            if node.request_count > 0:
                report.hotspots.append(
                    {
                        "service": node.label,
                        "description": f"请求量 {node.request_count}，平均延迟 {node.avg_latency_ms:.1f}ms，错误数 {node.error_count}",
                        "request_count": node.request_count,
                        "avg_latency_ms": node.avg_latency_ms,
                    }
                )

        # Detect anomalies
        for node in graph.nodes:
            # High error rate
            if node.request_count > 0 and node.error_count / node.request_count > 0.1:
                report.anomalies.append(
                    {
                        "type": "high_error_rate",
                        "service": node.label,
                        "description": f"服务 {node.label} 错误率 {node.error_count / node.request_count * 100:.1f}%",
                        "severity": "high",
                    }
                )

            # High latency (> 1000ms)
            if node.avg_latency_ms > 1000:
                report.anomalies.append(
                    {
                        "type": "high_latency",
                        "service": node.label,
                        "description": f"服务 {node.label} 平均延迟 {node.avg_latency_ms:.0f}ms，超过阈值",
                        "severity": "medium",
                    }
                )

        for edge in graph.edges:
            # High error rate on edge
            if edge.request_count > 10 and edge.error_count / edge.request_count > 0.05:
                report.anomalies.append(
                    {
                        "type": "edge_errors",
                        "service": f"{edge.source} -> {edge.target}",
                        "description": f"链路 {edge.source} -> {edge.target} 错误率 {edge.error_count / edge.request_count * 100:.1f}%",
                        "severity": "high",
                    }
                )

        # Generate suggestions based on anomalies
        if any(a["type"] == "high_error_rate" for a in report.anomalies):
            report.suggestions.append(
                {
                    "title": "排查高错误率服务",
                    "description": "建议检查错误率异常的服务日志，确认是否有代码缺陷或依赖故障。",
                    "priority": "high",
                }
            )

        if any(a["type"] == "high_latency" for a in report.anomalies):
            report.suggestions.append(
                {
                    "title": "优化高延迟链路",
                    "description": "建议对高延迟服务进行性能剖析，检查数据库查询、外部API调用等瓶颈。",
                    "priority": "medium",
                }
            )

        if len(graph.edges) > len(graph.nodes) * 2:
            report.suggestions.append(
                {
                    "title": "简化服务依赖",
                    "description": "服务间调用关系复杂度较高，建议评估是否可以合并服务或引入网关收敛调用。",
                    "priority": "low",
                }
            )

        report.metadata = {
            "analysis_type": "rule_based",
            "stats": stats,
        }

        return report

    async def _generate_with_llm(self, graph: TrafficGraphData, rule_report: AnalysisReport) -> AnalysisReport:
        """Generate report using LLM with graph context."""
        from resolveagent.llm.provider import ChatMessage

        # Build context from graph data
        nodes_desc = "\n".join(
            f"- {n.label}: 请求={n.request_count}, 错误={n.error_count}, 延迟={n.avg_latency_ms:.0f}ms"
            for n in sorted(graph.nodes, key=lambda n: n.request_count, reverse=True)[:20]
        )

        edges_desc = "\n".join(
            f"- {e.source} -> {e.target}: 请求={e.request_count}, 错误={e.error_count}, 延迟={e.avg_latency_ms:.0f}ms"
            for e in sorted(graph.edges, key=lambda e: e.request_count, reverse=True)[:20]
        )

        rule_anomalies = "\n".join(f"- [{a['type']}] {a['description']}" for a in rule_report.anomalies)

        prompt = (
            "请基于以下服务流量数据，生成详细的分析报告。\n\n"
            f"## 服务节点 (共 {len(graph.nodes)} 个)\n{nodes_desc}\n\n"
            f"## 调用链路 (共 {len(graph.edges)} 条)\n{edges_desc}\n\n"
            f"## 已检测的异常\n{rule_anomalies}\n\n"
            "请输出:\n"
            "1. 整体摘要 (2-3句话)\n"
            "2. 关键热点服务分析\n"
            "3. 异常和风险点\n"
            "4. 优化建议 (按优先级排序)\n"
        )

        rag_context = ""
        if self._rag is not None:
            try:
                rag_result = await self._rag.query(
                    collection_id=self._rag_collection,
                    query=f"traffic analysis {' '.join(n.label for n in graph.nodes[:5])}",
                    top_k=3,
                )
                chunks = rag_result.get("chunks", [])
                if chunks:
                    rag_context = "\n\n相关历史分析参考:\n" + "\n".join(c.get("content", "") for c in chunks[:3])
            except Exception:
                logger.debug("RAG context retrieval failed", exc_info=True)

        if rag_context:
            prompt += rag_context

        response = await self._llm.chat(
            messages=[
                ChatMessage(
                    role="system",
                    content="你是一个专业的微服务架构和流量分析顾问。请基于数据提供精准、可操作的分析和建议。",
                ),
                ChatMessage(role="user", content=prompt),
            ],
            model=self._model,
        )

        # Merge LLM analysis with rule-based findings
        report = AnalysisReport(
            summary=response.content,
            hotspots=rule_report.hotspots,
            anomalies=rule_report.anomalies,
            suggestions=rule_report.suggestions,
            metadata={
                "analysis_type": "llm_augmented",
                "stats": graph.stats,
            },
        )

        return report
