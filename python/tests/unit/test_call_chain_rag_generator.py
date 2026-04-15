"""Tests for the CallChainRAGGenerator.

Validates that structured RAG documents are correctly generated from
call chain data, covering all document types and metadata.
"""

from __future__ import annotations

import pytest

from resolveagent.corpus.call_chain_rag_generator import (
    CallChainData,
    CallChainRAGGenerator,
    ChainEdge,
    ChainFunctionInfo,
    ChainSourceFile,
    RAGCorpusResult,
    RAGDocument,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_troubleshooting_chain() -> CallChainData:
    """Build a sample troubleshooting (event-driven) call chain."""
    return CallChainData(
        chain_id="pod-not-ready",
        name="Pod NotReady 调用链",
        description="当容器健康检查失败时的完整代码路径",
        version="v1.35.0",
        chain_type="troubleshooting",
        topology="event-driven",
        components=["kubelet", "controller-manager", "api-server"],
        tags=["故障排查", "事件驱动", "多分支并行"],
        total_files=3,
        total_functions=4,
        total_lines_of_code=1500,
        source_files=[
            ChainSourceFile(
                id="prober",
                file_path="pkg/kubelet/prober/prober_manager.go",
                file_name="prober_manager.go",
                package="prober",
                component="kubelet",
                description="探针管理器",
                lines_of_code=320,
                importance="critical",
                key_functions=[
                    ChainFunctionInfo(
                        name="AddPod",
                        signature="func (m *manager) AddPod(pod *v1.Pod)",
                        description="为新 Pod 创建探针 worker",
                        code_snippet="func (m *manager) AddPod(pod *v1.Pod) {\n    // ...\n}",
                        called_by=["kubelet.HandlePodAdditions"],
                        calls=["worker.run"],
                    ),
                    ChainFunctionInfo(
                        name="UpdatePodStatus",
                        signature="func (m *manager) UpdatePodStatus(...)",
                        description="根据探针结果更新容器 Ready 状态",
                        code_snippet="func (m *manager) UpdatePodStatus(...) {\n    // ...\n}",
                        called_by=["status_manager.SetPodStatus"],
                        calls=["readinessManager.Get"],
                    ),
                ],
            ),
            ChainSourceFile(
                id="status_mgr",
                file_path="pkg/kubelet/status/status_manager.go",
                file_name="status_manager.go",
                package="status",
                component="kubelet",
                description="Pod 状态管理器",
                lines_of_code=620,
                importance="critical",
                key_functions=[
                    ChainFunctionInfo(
                        name="SetPodStatus",
                        signature="func (m *manager) SetPodStatus(...)",
                        description="更新 Pod 状态缓存",
                        code_snippet="func (m *manager) SetPodStatus(...) {\n    // ...\n}",
                        called_by=["kubelet.syncPod"],
                        calls=["isStatusMoreRecent"],
                    ),
                ],
            ),
            ChainSourceFile(
                id="node_lifecycle",
                file_path="pkg/controller/nodelifecycle/controller.go",
                file_name="controller.go",
                package="nodelifecycle",
                component="controller-manager",
                description="节点生命周期控制器",
                lines_of_code=560,
                importance="high",
                key_functions=[
                    ChainFunctionInfo(
                        name="monitorNodeHealth",
                        signature="func (nc *Controller) monitorNodeHealth(...)",
                        description="节点健康监控主循环",
                        code_snippet="func (nc *Controller) monitorNodeHealth(...) {\n    // ...\n}",
                        called_by=["Controller.Run"],
                        calls=["tryUpdateNodeHealth"],
                    ),
                ],
            ),
        ],
        edges=[
            ChainEdge(
                id="e1",
                source_file_id="prober",
                target_file_id="status_mgr",
                label="上报探针结果",
                call_type="event",
                functions=["AddPod", "UpdatePodStatus"],
            ),
            ChainEdge(
                id="e2",
                source_file_id="status_mgr",
                target_file_id="node_lifecycle",
                label="状态变更触发",
                call_type="watch",
                functions=["SetPodStatus", "monitorNodeHealth"],
            ),
        ],
        flow_steps=[
            "容器健康检查失败",
            "Kubelet 探针系统执行 Readiness Probe",
            "Status Manager 更新 Pod 状态",
            "Node Lifecycle Controller 监控节点心跳",
        ],
    )


def _make_initialization_chain() -> CallChainData:
    """Build a sample initialization (sequential) call chain."""
    return CallChainData(
        chain_id="kubeadm-init",
        name="新建集群链路 (kubeadm init)",
        description="kubeadm init 创建新 Kubernetes 集群的完整代码路径",
        version="v1.35.0",
        chain_type="initialization",
        topology="sequential-pipeline",
        components=["kubeadm", "api-server"],
        tags=["集群初始化", "顺序流水线"],
        total_files=2,
        total_functions=2,
        total_lines_of_code=1200,
        source_files=[
            ChainSourceFile(
                id="init",
                file_path="cmd/kubeadm/app/cmd/init.go",
                file_name="init.go",
                package="cmd",
                component="kubeadm",
                description="kubeadm init 命令入口",
                lines_of_code=520,
                importance="critical",
                key_functions=[
                    ChainFunctionInfo(
                        name="NewCmdInit",
                        signature="func NewCmdInit(...) *cobra.Command",
                        description="创建 kubeadm init 命令对象",
                        code_snippet="func NewCmdInit(...) {\n    // ...\n}",
                        called_by=["main"],
                        calls=["workflow.NewRunner"],
                    ),
                ],
            ),
            ChainSourceFile(
                id="certs",
                file_path="cmd/kubeadm/app/phases/certs/certs.go",
                file_name="certs.go",
                package="certs",
                component="kubeadm",
                description="证书生成阶段",
                lines_of_code=680,
                importance="critical",
                key_functions=[
                    ChainFunctionInfo(
                        name="CreatePKIAssets",
                        signature="func CreatePKIAssets(...) error",
                        description="创建所有 PKI 资产",
                        code_snippet="func CreatePKIAssets(...) {\n    // ...\n}",
                        called_by=["initRunner.Run"],
                        calls=["pkiutil.NewCertificateAuthority"],
                    ),
                ],
            ),
        ],
        edges=[
            ChainEdge(
                id="e-init-certs",
                source_file_id="init",
                target_file_id="certs",
                label="Phase: 生成证书",
                call_type="direct",
                functions=["NewCmdInit", "CreatePKIAssets"],
            ),
        ],
        flow_steps=[
            "kubeadm init 命令解析配置和参数",
            "生成全套 PKI 证书",
        ],
    )


# ---------------------------------------------------------------------------
# Tests: CallChainRAGGenerator
# ---------------------------------------------------------------------------

class TestCallChainRAGGenerator:
    """Test suite for CallChainRAGGenerator."""

    def test_generate_produces_documents(self) -> None:
        """Generator should produce non-empty document list."""
        gen = CallChainRAGGenerator()
        chain = _make_troubleshooting_chain()
        result = gen.generate(chain)

        assert isinstance(result, RAGCorpusResult)
        assert result.total_documents > 0
        assert all(isinstance(d, RAGDocument) for d in result.documents)

    def test_generate_overview_document(self) -> None:
        """Should produce exactly one overview document."""
        gen = CallChainRAGGenerator()
        chain = _make_troubleshooting_chain()
        result = gen.generate(chain)

        overview_docs = [d for d in result.documents if d.metadata.get("doc_type") == "overview"]
        assert len(overview_docs) == 1

        overview = overview_docs[0]
        assert chain.name in overview.content
        assert "故障排查" in overview.content
        assert "事件驱动" in overview.content
        assert "kubelet" in overview.content

    def test_generate_source_file_docs(self) -> None:
        """Should produce one document per source file."""
        gen = CallChainRAGGenerator()
        chain = _make_troubleshooting_chain()
        result = gen.generate(chain)

        file_docs = [d for d in result.documents if d.metadata.get("doc_type") == "source_file"]
        assert len(file_docs) == len(chain.source_files)

        # Each doc should reference its file
        for doc in file_docs:
            assert doc.metadata.get("file_id") in [sf.id for sf in chain.source_files]
            assert doc.metadata.get("component") in ["kubelet", "controller-manager"]

    def test_generate_function_docs(self) -> None:
        """Should produce one document per function."""
        gen = CallChainRAGGenerator()
        chain = _make_troubleshooting_chain()
        result = gen.generate(chain)

        func_docs = [d for d in result.documents if d.metadata.get("doc_type") == "function"]
        total_fns = sum(len(sf.key_functions) for sf in chain.source_files)
        assert len(func_docs) == total_fns

        # Check a specific function doc
        add_pod_docs = [d for d in func_docs if d.metadata.get("function_name") == "AddPod"]
        assert len(add_pod_docs) == 1
        assert "为新 Pod 创建探针 worker" in add_pod_docs[0].content

    def test_generate_flow_docs(self) -> None:
        """Should produce complete flow + per-step documents."""
        gen = CallChainRAGGenerator()
        chain = _make_troubleshooting_chain()
        result = gen.generate(chain)

        flow_complete = [d for d in result.documents if d.metadata.get("doc_type") == "flow_complete"]
        flow_steps = [d for d in result.documents if d.metadata.get("doc_type") == "flow_step"]

        assert len(flow_complete) == 1
        assert len(flow_steps) == len(chain.flow_steps)

        # Steps should have context (prev/next)
        step_1 = [d for d in flow_steps if d.metadata.get("step_index") == 1][0]
        assert "前一步" in step_1.content
        assert "下一步" in step_1.content

    def test_generate_cross_reference_docs(self) -> None:
        """Should produce cross-component interaction documents."""
        gen = CallChainRAGGenerator()
        chain = _make_troubleshooting_chain()
        result = gen.generate(chain)

        xref_docs = [d for d in result.documents if d.metadata.get("doc_type") == "cross_reference"]
        comp_docs = [d for d in result.documents if d.metadata.get("doc_type") == "component_summary"]

        # The chain has 1 cross-component edge (kubelet → controller-manager)
        assert len(xref_docs) == 1
        assert xref_docs[0].metadata["source_component"] == "kubelet"
        assert xref_docs[0].metadata["target_component"] == "controller-manager"

        # Should have component summary docs
        assert len(comp_docs) >= 2  # kubelet and controller-manager

    def test_generate_qa_pairs(self) -> None:
        """Should produce Q&A pair documents."""
        gen = CallChainRAGGenerator(generate_qa_pairs=True)
        chain = _make_troubleshooting_chain()
        result = gen.generate(chain)

        qa_docs = [d for d in result.documents if d.metadata.get("doc_type") == "qa_pair"]
        assert len(qa_docs) > 0

        # Check that generic QAs are present
        questions = [d.metadata.get("question", "") for d in qa_docs]
        assert any("源码文件" in q for q in questions)
        assert any("执行流程" in q for q in questions)

    def test_qa_generation_can_be_disabled(self) -> None:
        """When generate_qa_pairs=False, no QA docs should be produced."""
        gen = CallChainRAGGenerator(generate_qa_pairs=False)
        chain = _make_troubleshooting_chain()
        result = gen.generate(chain)

        qa_docs = [d for d in result.documents if d.metadata.get("doc_type") == "qa_pair"]
        assert len(qa_docs) == 0

    def test_different_chain_types_produce_different_content(self) -> None:
        """Troubleshooting and initialization chains should produce different docs."""
        gen = CallChainRAGGenerator()

        ts_chain = _make_troubleshooting_chain()
        init_chain = _make_initialization_chain()

        ts_result = gen.generate(ts_chain)
        init_result = gen.generate(init_chain)

        # Get overview docs
        ts_overview = [d for d in ts_result.documents if d.metadata.get("doc_type") == "overview"][0]
        init_overview = [d for d in init_result.documents if d.metadata.get("doc_type") == "overview"][0]

        # They should have different chain types in metadata
        assert ts_overview.metadata["chain_type"] == "troubleshooting"
        assert init_overview.metadata["chain_type"] == "initialization"
        assert ts_overview.metadata["topology"] == "event-driven"
        assert init_overview.metadata["topology"] == "sequential-pipeline"

        # Content should reference different types
        assert "故障排查" in ts_overview.content
        assert "集群初始化" in init_overview.content

    def test_generate_batch(self) -> None:
        """Batch generation should combine results from multiple chains."""
        gen = CallChainRAGGenerator()
        chains = [_make_troubleshooting_chain(), _make_initialization_chain()]
        result = gen.generate_batch(chains)

        assert result.total_documents > 0
        # Should have docs from both chains
        chain_ids = set(d.metadata.get("chain_id") for d in result.documents)
        assert "pod-not-ready" in chain_ids
        assert "kubeadm-init" in chain_ids

    def test_stats_are_populated(self) -> None:
        """Stats dict should contain all document type counts."""
        gen = CallChainRAGGenerator()
        chain = _make_troubleshooting_chain()
        result = gen.generate(chain)

        assert result.stats["overview_docs"] == 1
        assert result.stats["source_file_docs"] == len(chain.source_files)
        assert result.stats["total_documents"] == result.total_documents
        assert result.stats["function_docs"] > 0
        assert result.stats["flow_docs"] > 0

    def test_document_ids_are_unique(self) -> None:
        """All generated document IDs should be unique."""
        gen = CallChainRAGGenerator()
        chain = _make_troubleshooting_chain()
        result = gen.generate(chain)

        ids = [d.doc_id for d in result.documents]
        assert len(ids) == len(set(ids)), "Duplicate document IDs found"

    def test_metadata_consistency(self) -> None:
        """All documents should have consistent base metadata."""
        gen = CallChainRAGGenerator()
        chain = _make_troubleshooting_chain()
        result = gen.generate(chain)

        for doc in result.documents:
            assert doc.metadata.get("source") == "call_chain_analysis"
            assert doc.metadata.get("chain_id") == "pod-not-ready"
            assert doc.metadata.get("version") == "v1.35.0"
            assert "doc_type" in doc.metadata

    def test_code_snippets_included(self) -> None:
        """With include_code_snippets=True, function docs should contain code."""
        gen = CallChainRAGGenerator(include_code_snippets=True)
        chain = _make_troubleshooting_chain()
        result = gen.generate(chain)

        func_docs = [d for d in result.documents if d.metadata.get("doc_type") == "function"]
        # At least some function docs should have code blocks
        code_blocks = [d for d in func_docs if "```" in d.content]
        assert len(code_blocks) > 0

    def test_code_snippets_excluded(self) -> None:
        """With include_code_snippets=False, no code blocks in function docs."""
        gen = CallChainRAGGenerator(include_code_snippets=False)
        chain = _make_troubleshooting_chain()
        result = gen.generate(chain)

        func_docs = [d for d in result.documents if d.metadata.get("doc_type") == "function"]
        for doc in func_docs:
            assert "```" not in doc.content

    def test_to_dict_format(self) -> None:
        """RAGDocument.to_dict should return expected format."""
        gen = CallChainRAGGenerator()
        chain = _make_troubleshooting_chain()
        result = gen.generate(chain)

        for doc in result.documents:
            d = doc.to_dict()
            assert "id" in d
            assert "content" in d
            assert "metadata" in d
            assert isinstance(d["content"], str)
            assert isinstance(d["metadata"], dict)


class TestCodeAnalysisImporterDictConversion:
    """Test dict-to-CallChainData conversion in the importer."""

    def test_convert_camelcase_dict(self) -> None:
        """Should handle camelCase keys from frontend JSON."""
        from resolveagent.corpus.code_analysis_importer import CodeAnalysisCorpusImporter

        raw = {
            "id": "test-chain",
            "name": "Test Chain",
            "description": "A test chain",
            "version": "v1.0.0",
            "chainType": "troubleshooting",
            "topology": "event-driven",
            "components": ["kubelet"],
            "tags": ["test"],
            "totalFiles": 1,
            "totalFunctions": 1,
            "totalLinesOfCode": 100,
            "flowSteps": ["Step 1"],
            "sourceFiles": [
                {
                    "id": "f1",
                    "filePath": "pkg/test.go",
                    "fileName": "test.go",
                    "package": "test",
                    "component": "kubelet",
                    "description": "Test file",
                    "linesOfCode": 100,
                    "importance": "high",
                    "keyFunctions": [
                        {
                            "name": "TestFunc",
                            "signature": "func TestFunc()",
                            "description": "A test function",
                            "codeSnippet": "func TestFunc() {}",
                            "calledBy": ["main"],
                            "calls": [],
                        }
                    ],
                }
            ],
            "edges": [
                {
                    "id": "e1",
                    "sourceFileId": "f1",
                    "targetFileId": "f1",
                    "label": "self call",
                    "callType": "direct",
                    "functions": ["TestFunc"],
                }
            ],
        }

        chain = CodeAnalysisCorpusImporter._dict_to_call_chain(raw)

        assert chain.chain_id == "test-chain"
        assert chain.chain_type == "troubleshooting"
        assert chain.topology == "event-driven"
        assert len(chain.source_files) == 1
        assert chain.source_files[0].file_path == "pkg/test.go"
        assert len(chain.source_files[0].key_functions) == 1
        assert chain.source_files[0].key_functions[0].name == "TestFunc"
        assert len(chain.edges) == 1
        assert chain.edges[0].source_file_id == "f1"

    def test_convert_snake_case_dict(self) -> None:
        """Should handle snake_case keys from Python backend."""
        from resolveagent.corpus.code_analysis_importer import CodeAnalysisCorpusImporter

        raw = {
            "chain_id": "test-chain-2",
            "name": "Test Chain 2",
            "description": "Another test",
            "version": "v2.0.0",
            "chain_type": "initialization",
            "topology": "sequential-pipeline",
            "components": ["kubeadm"],
            "tags": [],
            "total_files": 0,
            "total_functions": 0,
            "total_lines_of_code": 0,
            "flow_steps": [],
            "source_files": [],
            "edges": [],
        }

        chain = CodeAnalysisCorpusImporter._dict_to_call_chain(raw)

        assert chain.chain_id == "test-chain-2"
        assert chain.chain_type == "initialization"
        assert chain.topology == "sequential-pipeline"
