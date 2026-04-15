"""Call chain RAG corpus generator.

Transforms call chain analysis data (nodes, edges, source files, flow steps)
into structured RAG documents optimized for retrieval-augmented generation.

The generator produces multiple document types from a single call chain:
- **Overview documents**: High-level chain summary for broad queries
- **Source file documents**: Per-file analysis with function details
- **Function documents**: Individual function behavior and relationships
- **Flow step documents**: Step-by-step execution flow for troubleshooting
- **Cross-reference documents**: Component interactions and call patterns
- **Q&A pair documents**: Pre-generated question-answer pairs

These documents are structured to support semantic search and contextual
retrieval in Kubernetes troubleshooting and operational scenarios.
"""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Data models matching the frontend K8s corpus types
# ---------------------------------------------------------------------------

@dataclass
class ChainFunctionInfo:
    """Function information within a source file."""

    name: str
    signature: str
    description: str
    code_snippet: str
    called_by: list[str] = field(default_factory=list)
    calls: list[str] = field(default_factory=list)


@dataclass
class ChainSourceFile:
    """Source file information in a call chain."""

    id: str
    file_path: str
    file_name: str
    package: str
    component: str
    description: str
    key_functions: list[ChainFunctionInfo] = field(default_factory=list)
    lines_of_code: int = 0
    importance: str = "medium"  # critical | high | medium


@dataclass
class ChainEdge:
    """Edge (call relationship) between source files."""

    id: str
    source_file_id: str
    target_file_id: str
    label: str
    call_type: str = "direct"  # direct | grpc | http | event | watch
    functions: list[str] = field(default_factory=list)


@dataclass
class CallChainData:
    """Complete call chain data for RAG corpus generation."""

    chain_id: str
    name: str
    description: str
    version: str
    chain_type: str  # troubleshooting | initialization
    topology: str  # event-driven | sequential-pipeline
    source_files: list[ChainSourceFile] = field(default_factory=list)
    edges: list[ChainEdge] = field(default_factory=list)
    flow_steps: list[str] = field(default_factory=list)
    components: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    total_files: int = 0
    total_functions: int = 0
    total_lines_of_code: int = 0


@dataclass
class RAGDocument:
    """A single RAG document ready for ingestion."""

    content: str
    metadata: dict[str, Any] = field(default_factory=dict)
    doc_id: str = ""

    def __post_init__(self) -> None:
        if not self.doc_id:
            self.doc_id = hashlib.sha256(self.content.encode()).hexdigest()[:16]

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.doc_id,
            "content": self.content,
            "metadata": self.metadata,
        }


@dataclass
class RAGCorpusResult:
    """Result of generating RAG corpus from call chains."""

    documents: list[RAGDocument] = field(default_factory=list)
    stats: dict[str, int] = field(default_factory=dict)

    @property
    def total_documents(self) -> int:
        return len(self.documents)

    @property
    def total_content_length(self) -> int:
        return sum(len(d.content) for d in self.documents)


# ---------------------------------------------------------------------------
# Core generator
# ---------------------------------------------------------------------------

class CallChainRAGGenerator:
    """Generate structured RAG corpus documents from call chain data.

    This generator transforms K8s source code call chain analysis into
    multiple types of RAG-ready documents, each optimized for different
    retrieval scenarios.

    Usage::

        generator = CallChainRAGGenerator()
        chain_data = CallChainData(
            chain_id="pod-not-ready",
            name="Pod NotReady 调用链",
            ...
        )
        result = generator.generate(chain_data)

        # result.documents contains all RAG documents
        for doc in result.documents:
            print(doc.content[:100], doc.metadata)
    """

    def __init__(
        self,
        include_code_snippets: bool = True,
        max_snippet_lines: int = 30,
        generate_qa_pairs: bool = True,
    ) -> None:
        self._include_code_snippets = include_code_snippets
        self._max_snippet_lines = max_snippet_lines
        self._generate_qa_pairs = generate_qa_pairs

    def generate(self, chain: CallChainData) -> RAGCorpusResult:
        """Generate complete RAG corpus from a call chain.

        Produces multiple document types optimized for different query patterns:
        1. Overview - for broad "what is this" queries
        2. Source files - for "where is this implemented" queries
        3. Functions - for "how does X work" queries
        4. Flow steps - for "what happens when" queries
        5. Cross-references - for "what components interact" queries
        6. Q&A pairs - for direct question answering

        Args:
            chain: Complete call chain data.

        Returns:
            RAGCorpusResult with all generated documents and stats.
        """
        documents: list[RAGDocument] = []

        # 1. Chain overview document
        overview = self._generate_overview(chain)
        documents.append(overview)

        # 2. Per-source-file documents
        file_docs = self._generate_source_file_docs(chain)
        documents.extend(file_docs)

        # 3. Per-function documents
        func_docs = self._generate_function_docs(chain)
        documents.extend(func_docs)

        # 4. Flow step documents
        flow_docs = self._generate_flow_docs(chain)
        documents.extend(flow_docs)

        # 5. Cross-reference / component interaction documents
        xref_docs = self._generate_cross_reference_docs(chain)
        documents.extend(xref_docs)

        # 6. Q&A pair documents
        if self._generate_qa_pairs:
            qa_docs = self._generate_qa_pairs_docs(chain)
            documents.extend(qa_docs)

        result = RAGCorpusResult(
            documents=documents,
            stats={
                "overview_docs": 1,
                "source_file_docs": len(file_docs),
                "function_docs": len(func_docs),
                "flow_docs": len(flow_docs),
                "cross_reference_docs": len(xref_docs),
                "qa_pair_docs": len(qa_docs) if self._generate_qa_pairs else 0,
                "total_documents": len(documents),
            },
        )

        logger.info(
            "Generated RAG corpus for chain '%s': %d documents",
            chain.chain_id,
            len(documents),
        )

        return result

    def generate_batch(self, chains: list[CallChainData]) -> RAGCorpusResult:
        """Generate RAG corpus for multiple call chains.

        Args:
            chains: List of call chain data.

        Returns:
            Combined RAGCorpusResult.
        """
        all_documents: list[RAGDocument] = []
        combined_stats: dict[str, int] = {}

        for chain in chains:
            result = self.generate(chain)
            all_documents.extend(result.documents)
            for key, val in result.stats.items():
                combined_stats[key] = combined_stats.get(key, 0) + val

        return RAGCorpusResult(documents=all_documents, stats=combined_stats)

    # ------------------------------------------------------------------
    # Document generators
    # ------------------------------------------------------------------

    def _generate_overview(self, chain: CallChainData) -> RAGDocument:
        """Generate a high-level overview document for the chain."""
        chain_type_label = "故障排查" if chain.chain_type == "troubleshooting" else "集群初始化"
        topology_label = "事件驱动图" if chain.topology == "event-driven" else "顺序流水线"

        # Build component list
        components_str = "、".join(chain.components) if chain.components else "未指定"

        # Build call type summary from edges
        call_types: dict[str, int] = {}
        for edge in chain.edges:
            call_types[edge.call_type] = call_types.get(edge.call_type, 0) + 1
        call_type_summary = ", ".join(
            f"{ct}: {count}" for ct, count in sorted(call_types.items())
        )

        # Build file summary
        file_summary = "\n".join(
            f"- **{sf.file_name}** (`{sf.file_path}`) - {sf.description} "
            f"[{sf.importance}] [{sf.component}]"
            for sf in chain.source_files
        )

        # Build flow steps
        flow_steps_str = "\n".join(
            f"{idx + 1}. {step}" for idx, step in enumerate(chain.flow_steps)
        )

        content = f"""# {chain.name}

## 概述
{chain.description}

## 链路特征
- **场景类型**: {chain_type_label}
- **拓扑结构**: {topology_label}
- **Kubernetes 版本**: {chain.version}
- **涉及组件**: {components_str}
- **源码文件数**: {chain.total_files}
- **关键函数数**: {chain.total_functions}
- **代码行数**: {chain.total_lines_of_code:,}
- **调用类型分布**: {call_type_summary}

## 源码文件概览
{file_summary}

## 执行流程
{flow_steps_str}
"""
        return RAGDocument(
            content=content,
            metadata=self._base_metadata(chain, "overview"),
            doc_id=f"overview-{chain.chain_id}",
        )

    def _generate_source_file_docs(self, chain: CallChainData) -> list[RAGDocument]:
        """Generate one document per source file."""
        documents: list[RAGDocument] = []

        for sf in chain.source_files:
            # Find incoming and outgoing edges for this file
            incoming = [e for e in chain.edges if e.target_file_id == sf.id]
            outgoing = [e for e in chain.edges if e.source_file_id == sf.id]

            # Build function list
            functions_str = ""
            for fn in sf.key_functions:
                fn_section = f"\n### {fn.name}\n"
                fn_section += f"**签名**: `{fn.signature}`\n\n"
                fn_section += f"{fn.description}\n\n"
                if fn.called_by:
                    fn_section += f"**被调用方**: {', '.join(fn.called_by)}\n"
                if fn.calls:
                    fn_section += f"**调用目标**: {', '.join(fn.calls)}\n"
                if self._include_code_snippets and fn.code_snippet:
                    snippet = self._truncate_snippet(fn.code_snippet)
                    fn_section += f"\n```go\n{snippet}\n```\n"
                functions_str += fn_section

            # Build edge descriptions
            incoming_str = "\n".join(
                f"- ← {e.label} (from {e.source_file_id}, type: {e.call_type})"
                for e in incoming
            ) or "无入边"
            outgoing_str = "\n".join(
                f"- → {e.label} (to {e.target_file_id}, type: {e.call_type})"
                for e in outgoing
            ) or "无出边"

            content = f"""# 源码文件: {sf.file_name}

## 基本信息
- **文件路径**: `{sf.file_path}`
- **包名**: {sf.package}
- **所属组件**: {sf.component}
- **重要程度**: {sf.importance}
- **代码行数**: {sf.lines_of_code:,}
- **所属调用链**: {chain.name}

## 文件说明
{sf.description}

## 调用关系
### 入边（被调用）
{incoming_str}

### 出边（调用其他）
{outgoing_str}

## 关键函数
{functions_str}
"""
            documents.append(RAGDocument(
                content=content,
                metadata={
                    **self._base_metadata(chain, "source_file"),
                    "file_id": sf.id,
                    "file_path": sf.file_path,
                    "file_name": sf.file_name,
                    "package": sf.package,
                    "component": sf.component,
                    "importance": sf.importance,
                    "lines_of_code": sf.lines_of_code,
                    "function_count": len(sf.key_functions),
                },
                doc_id=f"file-{chain.chain_id}-{sf.id}",
            ))

        return documents

    def _generate_function_docs(self, chain: CallChainData) -> list[RAGDocument]:
        """Generate one document per key function."""
        documents: list[RAGDocument] = []

        for sf in chain.source_files:
            for fn in sf.key_functions:
                # Find relevant edges that involve this function
                related_edges = [
                    e for e in chain.edges
                    if fn.name in e.functions
                ]

                edge_context = "\n".join(
                    f"- {e.label} ({e.source_file_id} → {e.target_file_id}, "
                    f"type: {e.call_type})"
                    for e in related_edges
                ) or "无直接关联边"

                snippet_section = ""
                if self._include_code_snippets and fn.code_snippet:
                    snippet = self._truncate_snippet(fn.code_snippet)
                    snippet_section = f"\n## 代码实现\n```go\n{snippet}\n```\n"

                content = f"""# 函数: {fn.name}

## 基本信息
- **函数签名**: `{fn.signature}`
- **所在文件**: `{sf.file_path}` ({sf.file_name})
- **所属包**: {sf.package}
- **所属组件**: {sf.component}
- **所属调用链**: {chain.name}

## 功能说明
{fn.description}

## 调用关系
### 被以下函数调用
{', '.join(fn.called_by) if fn.called_by else '无（入口函数或类型定义）'}

### 调用以下函数
{', '.join(fn.calls) if fn.calls else '无（叶子节点）'}

## 相关调用边
{edge_context}
{snippet_section}
"""
                documents.append(RAGDocument(
                    content=content,
                    metadata={
                        **self._base_metadata(chain, "function"),
                        "function_name": fn.name,
                        "function_signature": fn.signature,
                        "file_path": sf.file_path,
                        "file_name": sf.file_name,
                        "component": sf.component,
                        "package": sf.package,
                    },
                    doc_id=f"func-{chain.chain_id}-{sf.id}-{fn.name}",
                ))

        return documents

    def _generate_flow_docs(self, chain: CallChainData) -> list[RAGDocument]:
        """Generate documents from flow steps.

        Creates a single document covering the complete execution flow,
        plus individual step documents for fine-grained retrieval.
        """
        documents: list[RAGDocument] = []

        chain_type_label = "故障排查" if chain.chain_type == "troubleshooting" else "集群初始化"
        topology_label = "事件驱动" if chain.topology == "event-driven" else "顺序流水线"

        # Complete flow document
        all_steps = "\n".join(
            f"**步骤 {idx + 1}**: {step}"
            for idx, step in enumerate(chain.flow_steps)
        )

        content = f"""# {chain.name} - 完整执行流程

## 链路信息
- **场景**: {chain_type_label}
- **拓扑**: {topology_label}
- **版本**: {chain.version}

## 执行步骤
{all_steps}

## 涉及源码文件
{chr(10).join(f"- {sf.file_name} ({sf.component}): {sf.description}" for sf in chain.source_files)}
"""
        documents.append(RAGDocument(
            content=content,
            metadata={
                **self._base_metadata(chain, "flow_complete"),
                "step_count": len(chain.flow_steps),
            },
            doc_id=f"flow-complete-{chain.chain_id}",
        ))

        # Individual step documents with context (previous + next step)
        for idx, step in enumerate(chain.flow_steps):
            prev_step = chain.flow_steps[idx - 1] if idx > 0 else None
            next_step = chain.flow_steps[idx + 1] if idx < len(chain.flow_steps) - 1 else None

            context_parts = []
            if prev_step:
                context_parts.append(f"**前一步**: {prev_step}")
            context_parts.append(f"**当前步骤 ({idx + 1}/{len(chain.flow_steps)})**: {step}")
            if next_step:
                context_parts.append(f"**下一步**: {next_step}")

            step_content = f"""# {chain.name} - 步骤 {idx + 1}

## 流程上下文
{chr(10).join(context_parts)}

## 所属链路
{chain.name} ({chain_type_label}, {topology_label})

## 步骤详情
{step}
"""
            documents.append(RAGDocument(
                content=step_content,
                metadata={
                    **self._base_metadata(chain, "flow_step"),
                    "step_index": idx,
                    "step_total": len(chain.flow_steps),
                    "step_text": step,
                },
                doc_id=f"flow-step-{chain.chain_id}-{idx}",
            ))

        return documents

    def _generate_cross_reference_docs(self, chain: CallChainData) -> list[RAGDocument]:
        """Generate cross-reference documents for component interactions."""
        documents: list[RAGDocument] = []

        # Build component-to-component interaction map
        component_map: dict[str, list[ChainSourceFile]] = {}
        for sf in chain.source_files:
            component_map.setdefault(sf.component, []).append(sf)

        # Generate component interaction documents
        for edge in chain.edges:
            src_file = next((f for f in chain.source_files if f.id == edge.source_file_id), None)
            tgt_file = next((f for f in chain.source_files if f.id == edge.target_file_id), None)
            if not src_file or not tgt_file:
                continue

            # Only generate cross-component interaction docs
            if src_file.component == tgt_file.component:
                continue

            content = f"""# 组件交互: {src_file.component} → {tgt_file.component}

## 交互描述
{edge.label}

## 调用类型
{edge.call_type}

## 源端
- **组件**: {src_file.component}
- **文件**: {src_file.file_name} (`{src_file.file_path}`)
- **描述**: {src_file.description}

## 目标端
- **组件**: {tgt_file.component}
- **文件**: {tgt_file.file_name} (`{tgt_file.file_path}`)
- **描述**: {tgt_file.description}

## 涉及函数
{', '.join(edge.functions)}

## 所属调用链
{chain.name}
"""
            documents.append(RAGDocument(
                content=content,
                metadata={
                    **self._base_metadata(chain, "cross_reference"),
                    "source_component": src_file.component,
                    "target_component": tgt_file.component,
                    "call_type": edge.call_type,
                    "edge_label": edge.label,
                },
                doc_id=f"xref-{chain.chain_id}-{edge.id}",
            ))

        # Generate per-component summary document
        for comp, files in component_map.items():
            comp_edges_out = [
                e for e in chain.edges
                if any(f.id == e.source_file_id for f in files)
            ]
            comp_edges_in = [
                e for e in chain.edges
                if any(f.id == e.target_file_id for f in files)
            ]

            all_functions = [
                fn for sf in files for fn in sf.key_functions
            ]

            content = f"""# 组件概览: {comp}

## 在调用链 "{chain.name}" 中的角色
- **包含文件**: {len(files)} 个
- **关键函数**: {len(all_functions)} 个
- **出向调用**: {len(comp_edges_out)} 条
- **入向调用**: {len(comp_edges_in)} 条

## 文件列表
{chr(10).join(f"- {sf.file_name}: {sf.description}" for sf in files)}

## 关键函数
{chr(10).join(f"- {fn.name}: {fn.description}" for fn in all_functions)}

## 出向交互
{self._format_edge_list(comp_edges_out, direction="out") or "无"}

## 入向交互
{self._format_edge_list(comp_edges_in, direction="in") or "无"}
"""
            documents.append(RAGDocument(
                content=content,
                metadata={
                    **self._base_metadata(chain, "component_summary"),
                    "component": comp,
                    "file_count": len(files),
                    "function_count": len(all_functions),
                },
                doc_id=f"comp-{chain.chain_id}-{comp}",
            ))

        return documents

    def _generate_qa_pairs_docs(self, chain: CallChainData) -> list[RAGDocument]:
        """Generate pre-built Q&A pair documents.

        These cover common questions about the call chain and provide
        direct answers, improving retrieval accuracy for typical queries.
        """
        documents: list[RAGDocument] = []

        chain_type_label = "故障排查" if chain.chain_type == "troubleshooting" else "集群初始化"

        # Q&A pairs based on chain type
        qa_pairs: list[tuple[str, str]] = []

        # Generic QAs for all chains
        qa_pairs.append((
            f"{chain.name} 包含哪些源码文件？",
            "涉及以下源码文件：\n" + "\n".join(
                f"- {sf.file_name} ({sf.file_path}): {sf.description}"
                for sf in chain.source_files
            ),
        ))

        qa_pairs.append((
            f"{chain.name} 的执行流程是什么？",
            "执行流程如下：\n" + "\n".join(
                f"{idx + 1}. {step}"
                for idx, step in enumerate(chain.flow_steps)
            ),
        ))

        qa_pairs.append((
            f"{chain.name} 涉及哪些 Kubernetes 组件？",
            f"涉及以下组件：{'、'.join(chain.components)}。\n"
            f"链路类型为{chain_type_label}，拓扑结构为"
            f"{'事件驱动图' if chain.topology == 'event-driven' else '顺序流水线'}。",
        ))

        # Chain-type-specific QAs
        if chain.chain_type == "troubleshooting":
            # Find critical functions
            critical_fns = [
                (sf, fn)
                for sf in chain.source_files
                if sf.importance == "critical"
                for fn in sf.key_functions
            ]
            if critical_fns:
                qa_pairs.append((
                    f"{chain.name} 中最关键的函数有哪些？",
                    "最关键的函数包括：\n" + "\n".join(
                        f"- {fn.name} ({sf.file_name}): {fn.description}"
                        for sf, fn in critical_fns
                    ),
                ))

            # Async/event-driven edges
            async_edges = [e for e in chain.edges if e.call_type in ("event", "watch")]
            if async_edges:
                qa_pairs.append((
                    f"{chain.name} 中有哪些异步/事件驱动的调用？",
                    "异步/事件驱动调用包括：\n" + "\n".join(
                        f"- {e.label} ({e.source_file_id} → {e.target_file_id}, "
                        f"类型: {e.call_type})"
                        for e in async_edges
                    ),
                ))

        elif chain.chain_type == "initialization":
            # Phase-based QAs
            qa_pairs.append((
                f"{chain.name} 的初始化阶段顺序是什么？",
                "初始化阶段按以下顺序执行：\n" + "\n".join(
                    f"阶段 {idx + 1}: {step}"
                    for idx, step in enumerate(chain.flow_steps)
                ),
            ))

        # Per-function QAs for critical functions
        for sf in chain.source_files:
            for fn in sf.key_functions:
                qa_pairs.append((
                    f"{fn.name} 函数的作用是什么？",
                    f"**{fn.name}** 位于 `{sf.file_path}` 文件中，"
                    f"属于 {sf.component} 组件。\n\n"
                    f"**功能**: {fn.description}\n\n"
                    f"**函数签名**: `{fn.signature}`\n"
                    + (f"**被调用方**: {', '.join(fn.called_by)}\n" if fn.called_by else "")
                    + (f"**调用目标**: {', '.join(fn.calls)}\n" if fn.calls else ""),
                ))

        # Generate documents from Q&A pairs
        for idx, (question, answer) in enumerate(qa_pairs):
            content = f"""## 问题
{question}

## 回答
{answer}

---
*来源调用链: {chain.name} | 类型: {chain_type_label}*
"""
            documents.append(RAGDocument(
                content=content,
                metadata={
                    **self._base_metadata(chain, "qa_pair"),
                    "question": question,
                    "qa_index": idx,
                },
                doc_id=f"qa-{chain.chain_id}-{idx}",
            ))

        return documents

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _base_metadata(chain: CallChainData, doc_type: str) -> dict[str, Any]:
        """Build common metadata for a RAG document."""
        return {
            "source": "call_chain_analysis",
            "doc_type": doc_type,
            "chain_id": chain.chain_id,
            "chain_name": chain.name,
            "chain_type": chain.chain_type,
            "topology": chain.topology,
            "version": chain.version,
            "tags": chain.tags,
            "components": chain.components,
        }

    @staticmethod
    def _format_edge_list(
        edges: list[ChainEdge], *, direction: str = "out"
    ) -> str:
        """Format a list of edges for Markdown output."""
        lines: list[str] = []
        for e in edges:
            if direction == "out":
                lines.append(
                    f"- \u2192 {e.label} "
                    f"(to {e.target_file_id}, type: {e.call_type})"
                )
            else:
                lines.append(
                    f"- \u2190 {e.label} "
                    f"(from {e.source_file_id}, type: {e.call_type})"
                )
        return "\n".join(lines)

    def _truncate_snippet(self, snippet: str) -> str:
        """Truncate a code snippet to max_snippet_lines."""
        lines = snippet.split("\n")
        if len(lines) <= self._max_snippet_lines:
            return snippet
        return "\n".join(lines[: self._max_snippet_lines]) + "\n// ... (truncated)"
