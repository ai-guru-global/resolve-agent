"""Vectorize seed RAG documents — generates representative content and indexes into vector store.

The seed-rag.sql file contains 87 document metadata entries across 45 collections,
but no actual text content or vector embeddings. This script:

1. Reconstructs the 87 seed documents from their metadata (title, collection, domain)
2. Generates representative Markdown content for each document
3. Runs the full RAG pipeline: chunk → embed → index into Milvus

Usage::

    # Dry-run (show what would be vectorized, no actual writes)
    vectorize-rag-seeds --dry-run

    # Full vectorization
    vectorize-rag-seeds

    # Vectorize only a specific collection
    vectorize-rag-seeds --collection col-ops-kb-001

    # Force re-vectorize (ignore existing vectors)
    vectorize-rag-seeds --force
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
import time
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger("vectorize-rag-seeds")


# ---------------------------------------------------------------------------
# Seed document definitions (matches scripts/seed/seed-rag.sql)
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class SeedDoc:
    """A seed document definition."""

    id: str
    collection_id: str
    collection_name: str
    title: str
    content_type: str
    embedding_model: str
    domain: str = ""


# fmt: off
SEED_DOCUMENTS: list[SeedDoc] = [
    # ── col-ops-kb-001: 阿里云产品运维手册 ──
    SeedDoc("doc-001", "col-ops-kb-001", "阿里云产品运维手册", "ACK 集群升级操作手册", "pdf", "text-embedding-v2"),
    SeedDoc("doc-002", "col-ops-kb-001", "阿里云产品运维手册", "ECS 实例故障排查 SOP", "markdown", "text-embedding-v2"),
    SeedDoc("doc-003", "col-ops-kb-001", "阿里云产品运维手册", "RDS 备份恢复最佳实践", "pdf", "text-embedding-v2"),
    SeedDoc("doc-004", "col-ops-kb-001", "阿里云产品运维手册", "SLB 配置指南", "markdown", "text-embedding-v2"),
    SeedDoc("doc-015", "col-ops-kb-001", "阿里云产品运维手册", "OSS 跨区域复制配置", "txt", "text-embedding-v2"),
    # ── col-ops-kb-002: 历史故障复盘 ──
    SeedDoc("doc-005", "col-ops-kb-002", "历史故障复盘文档", "INC-2024-0673 RDS 主从同步复盘", "markdown", "text-embedding-v2"),
    SeedDoc("doc-006", "col-ops-kb-002", "历史故障复盘文档", "INC-2024-0521 K8s 集群网络风暴", "pdf", "text-embedding-v2"),
    SeedDoc("doc-007", "col-ops-kb-002", "历史故障复盘文档", "INC-2024-0445 DNS 解析异常", "markdown", "text-embedding-v2"),
    # ── col-ops-kb-003: K8s 最佳实践 ──
    SeedDoc("doc-008", "col-ops-kb-003", "K8s 最佳实践", "K8s Pod 调度策略", "markdown", "text-embedding-v2"),
    SeedDoc("doc-009", "col-ops-kb-003", "K8s 最佳实践", "Helm Chart 最佳实践", "markdown", "text-embedding-v2"),
    SeedDoc("doc-010", "col-ops-kb-003", "K8s 最佳实践", "容器镜像安全扫描", "pdf", "text-embedding-v2"),
    # ── col-ops-kb-004: 内部运维 SOP ──
    SeedDoc("doc-011", "col-ops-kb-004", "内部运维 SOP 流程", "变更管理 SOP v2.1", "pdf", "text-embedding-v2"),
    SeedDoc("doc-012", "col-ops-kb-004", "内部运维 SOP 流程", "应急响应流程", "markdown", "text-embedding-v2"),
    # ── col-ops-kb-005: 安全基线 ──
    SeedDoc("doc-013", "col-ops-kb-005", "安全基线与合规指南", "CIS Benchmark K8s 1.28", "pdf", "text-embedding-v2"),
    SeedDoc("doc-014", "col-ops-kb-005", "安全基线与合规指南", "等保 2.0 合规检查清单", "pdf", "text-embedding-v2"),
    # ── kudig domains ──
    SeedDoc("doc-kudig-001", "col-kudig-d01", "kudig: K8s 架构概览", "Kubernetes 架构全景图", "markdown", "bge-large-zh", "K8s 架构概览"),
    SeedDoc("doc-kudig-002", "col-kudig-d01", "kudig: K8s 架构概览", "K8s 核心组件交互流程", "markdown", "bge-large-zh", "K8s 架构概览"),
    SeedDoc("doc-kudig-003", "col-kudig-d01", "kudig: K8s 架构概览", "集群拓扑与高可用部署", "markdown", "bge-large-zh", "K8s 架构概览"),
    SeedDoc("doc-kudig-004", "col-kudig-d02", "kudig: K8s 设计原则", "声明式 API 设计哲学", "markdown", "bge-large-zh", "K8s 设计原则"),
    SeedDoc("doc-kudig-005", "col-kudig-d02", "kudig: K8s 设计原则", "控制器模式与终态驱动", "markdown", "bge-large-zh", "K8s 设计原则"),
    SeedDoc("doc-kudig-006", "col-kudig-d03", "kudig: 控制平面", "控制平面架构总览", "markdown", "bge-large-zh", "控制平面"),
    SeedDoc("doc-kudig-007", "col-kudig-d03", "kudig: 控制平面", "etcd 集群运维指南", "markdown", "bge-large-zh", "控制平面"),
    SeedDoc("doc-kudig-008", "col-kudig-d03", "kudig: 控制平面", "API Server 深度解析", "markdown", "bge-large-zh", "控制平面"),
    SeedDoc("doc-kudig-009", "col-kudig-d04", "kudig: 工作负载管理", "Deployment 滚动更新策略", "markdown", "bge-large-zh", "工作负载管理"),
    SeedDoc("doc-kudig-010", "col-kudig-d04", "kudig: 工作负载管理", "StatefulSet 有状态应用管理", "markdown", "bge-large-zh", "工作负载管理"),
    SeedDoc("doc-kudig-011", "col-kudig-d05", "kudig: 网络", "CNI 插件对比与选型", "markdown", "bge-large-zh", "网络"),
    SeedDoc("doc-kudig-012", "col-kudig-d05", "kudig: 网络", "Service 与 Ingress 深度解析", "markdown", "bge-large-zh", "网络"),
    SeedDoc("doc-kudig-013", "col-kudig-d05", "kudig: 网络", "NetworkPolicy 网络策略实战", "markdown", "bge-large-zh", "网络"),
    SeedDoc("doc-kudig-014", "col-kudig-d06", "kudig: 存储", "PV/PVC 持久化存储详解", "markdown", "bge-large-zh", "存储"),
    SeedDoc("doc-kudig-015", "col-kudig-d06", "kudig: 存储", "CSI 驱动开发与集成", "markdown", "bge-large-zh", "存储"),
    SeedDoc("doc-kudig-016", "col-kudig-d07", "kudig: 安全", "RBAC 权限模型详解", "markdown", "bge-large-zh", "安全"),
    SeedDoc("doc-kudig-017", "col-kudig-d07", "kudig: 安全", "Pod Security Admission 实践", "markdown", "bge-large-zh", "安全"),
    SeedDoc("doc-kudig-018", "col-kudig-d08", "kudig: 可观测性", "Prometheus 监控体系搭建", "markdown", "bge-large-zh", "可观测性"),
    SeedDoc("doc-kudig-019", "col-kudig-d08", "kudig: 可观测性", "OpenTelemetry 全链路追踪", "markdown", "bge-large-zh", "可观测性"),
    SeedDoc("doc-kudig-020", "col-kudig-d09", "kudig: 平台运维", "集群升级滚动策略", "markdown", "bge-large-zh", "平台运维"),
    SeedDoc("doc-kudig-021", "col-kudig-d09", "kudig: 平台运维", "etcd 备份与恢复", "markdown", "bge-large-zh", "平台运维"),
    SeedDoc("doc-kudig-022", "col-kudig-d10", "kudig: 扩展机制", "CRD 与 Operator 开发指南", "markdown", "bge-large-zh", "扩展机制"),
    SeedDoc("doc-kudig-023", "col-kudig-d10", "kudig: 扩展机制", "Webhook 准入控制器", "markdown", "bge-large-zh", "扩展机制"),
    SeedDoc("doc-kudig-024", "col-kudig-d11", "kudig: AI 基础设施", "GPU 调度与 AI 训练平台", "markdown", "bge-large-zh", "AI 基础设施"),
    SeedDoc("doc-kudig-025", "col-kudig-d11", "kudig: AI 基础设施", "KubeRay 推理服务部署", "markdown", "bge-large-zh", "AI 基础设施"),
    SeedDoc("doc-kudig-026", "col-kudig-d12", "kudig: 故障排查", "Pod CrashLoopBackOff 排查", "markdown", "bge-large-zh", "故障排查"),
    SeedDoc("doc-kudig-027", "col-kudig-d12", "kudig: 故障排查", "节点 NotReady 故障诊断", "markdown", "bge-large-zh", "故障排查"),
    SeedDoc("doc-kudig-028", "col-kudig-d12", "kudig: 故障排查", "OOM Killed 根因分析", "markdown", "bge-large-zh", "故障排查"),
    SeedDoc("doc-kudig-029", "col-kudig-d13", "kudig: Docker 容器", "Docker 镜像构建最佳实践", "markdown", "bge-large-zh", "Docker 容器"),
    SeedDoc("doc-kudig-030", "col-kudig-d13", "kudig: Docker 容器", "containerd 与 CRI-O 运行时", "markdown", "bge-large-zh", "Docker 容器"),
    SeedDoc("doc-kudig-031", "col-kudig-d14", "kudig: Linux 基础", "Linux Namespace 与 Cgroup", "markdown", "bge-large-zh", "Linux 基础"),
    SeedDoc("doc-kudig-032", "col-kudig-d14", "kudig: Linux 基础", "内核参数调优指南", "markdown", "bge-large-zh", "Linux 基础"),
    SeedDoc("doc-kudig-033", "col-kudig-d15", "kudig: 网络基础", "iptables 与 nftables 详解", "markdown", "bge-large-zh", "网络基础"),
    SeedDoc("doc-kudig-034", "col-kudig-d15", "kudig: 网络基础", "VXLAN 隧道与 BGP 路由", "markdown", "bge-large-zh", "网络基础"),
    SeedDoc("doc-kudig-035", "col-kudig-d16", "kudig: 存储基础", "分布式存储原理", "markdown", "bge-large-zh", "存储基础"),
    SeedDoc("doc-kudig-036", "col-kudig-d16", "kudig: 存储基础", "Ceph 与 Rook 存储方案", "markdown", "bge-large-zh", "存储基础"),
    SeedDoc("doc-kudig-037", "col-kudig-d17", "kudig: 云服务商", "ACK vs EKS vs GKE 对比", "markdown", "bge-large-zh", "云服务商"),
    SeedDoc("doc-kudig-038", "col-kudig-d17", "kudig: 云服务商", "托管 K8s 服务选型指南", "markdown", "bge-large-zh", "云服务商"),
    SeedDoc("doc-kudig-039", "col-kudig-d18", "kudig: 生产运维", "生产集群 Day-2 运维手册", "markdown", "bge-large-zh", "生产运维"),
    SeedDoc("doc-kudig-040", "col-kudig-d18", "kudig: 生产运维", "SLA 保障与故障演练", "markdown", "bge-large-zh", "生产运维"),
    SeedDoc("doc-kudig-041", "col-kudig-d19", "kudig: 技术论文", "Borg 论文解读", "markdown", "bge-large-zh", "技术论文"),
    SeedDoc("doc-kudig-042", "col-kudig-d19", "kudig: 技术论文", "Omega 调度器设计", "markdown", "bge-large-zh", "技术论文"),
    SeedDoc("doc-kudig-043", "col-kudig-d20", "kudig: 监控告警", "AlertManager 告警策略配置", "markdown", "bge-large-zh", "监控告警"),
    SeedDoc("doc-kudig-044", "col-kudig-d20", "kudig: 监控告警", "自定义 Metrics 与 PromQL", "markdown", "bge-large-zh", "监控告警"),
    SeedDoc("doc-kudig-045", "col-kudig-d21", "kudig: 日志管理", "EFK 日志栈部署", "markdown", "bge-large-zh", "日志管理"),
    SeedDoc("doc-kudig-046", "col-kudig-d21", "kudig: 日志管理", "Loki + Grafana 日志方案", "markdown", "bge-large-zh", "日志管理"),
    SeedDoc("doc-kudig-047", "col-kudig-d22", "kudig: 安全运维", "供应链安全与镜像签名", "markdown", "bge-large-zh", "安全运维"),
    SeedDoc("doc-kudig-048", "col-kudig-d22", "kudig: 安全运维", "Falco 运行时安全监控", "markdown", "bge-large-zh", "安全运维"),
    SeedDoc("doc-kudig-049", "col-kudig-d23", "kudig: 灾备恢复", "Velero 备份恢复指南", "markdown", "bge-large-zh", "灾备恢复"),
    SeedDoc("doc-kudig-050", "col-kudig-d23", "kudig: 灾备恢复", "跨区域灾备与故障切换", "markdown", "bge-large-zh", "灾备恢复"),
    SeedDoc("doc-kudig-051", "col-kudig-d24", "kudig: 容量规划", "VPA/HPA 自动伸缩策略", "markdown", "bge-large-zh", "容量规划"),
    SeedDoc("doc-kudig-052", "col-kudig-d24", "kudig: 容量规划", "集群容量评估方法论", "markdown", "bge-large-zh", "容量规划"),
    SeedDoc("doc-kudig-053", "col-kudig-d25", "kudig: 成本优化", "FinOps 云成本治理", "markdown", "bge-large-zh", "成本优化"),
    SeedDoc("doc-kudig-054", "col-kudig-d25", "kudig: 成本优化", "Spot 实例与资源优化", "markdown", "bge-large-zh", "成本优化"),
    SeedDoc("doc-kudig-055", "col-kudig-d26", "kudig: SRE 实践", "SLI/SLO/SLA 定义与度量", "markdown", "bge-large-zh", "SRE 实践"),
    SeedDoc("doc-kudig-056", "col-kudig-d26", "kudig: SRE 实践", "错误预算与 On-Call 实践", "markdown", "bge-large-zh", "SRE 实践"),
    SeedDoc("doc-kudig-057", "col-kudig-d27", "kudig: 混沌工程", "Chaos Mesh 故障注入", "markdown", "bge-large-zh", "混沌工程"),
    SeedDoc("doc-kudig-058", "col-kudig-d27", "kudig: 混沌工程", "韧性验证与 GameDay 演练", "markdown", "bge-large-zh", "混沌工程"),
    SeedDoc("doc-kudig-059", "col-kudig-d28", "kudig: 服务网格", "Istio 服务网格全解", "markdown", "bge-large-zh", "服务网格"),
    SeedDoc("doc-kudig-060", "col-kudig-d28", "kudig: 服务网格", "Envoy 数据面与 mTLS", "markdown", "bge-large-zh", "服务网格"),
    SeedDoc("doc-kudig-061", "col-kudig-d29", "kudig: GitOps", "ArgoCD 声明式交付", "markdown", "bge-large-zh", "GitOps"),
    SeedDoc("doc-kudig-062", "col-kudig-d29", "kudig: GitOps", "FluxCD 持续部署实践", "markdown", "bge-large-zh", "GitOps"),
    SeedDoc("doc-kudig-063", "col-kudig-d30", "kudig: 多集群管理", "联邦集群与多集群调度", "markdown", "bge-large-zh", "多集群管理"),
    SeedDoc("doc-kudig-064", "col-kudig-d30", "kudig: 多集群管理", "Submariner 跨集群网络", "markdown", "bge-large-zh", "多集群管理"),
    SeedDoc("doc-kudig-065", "col-kudig-d31", "kudig: 硬件基础", "CPU/内存硬件知识", "markdown", "bge-large-zh", "硬件基础"),
    SeedDoc("doc-kudig-066", "col-kudig-d31", "kudig: 硬件基础", "网卡与磁盘性能调优", "markdown", "bge-large-zh", "硬件基础"),
    SeedDoc("doc-kudig-067", "col-kudig-d32", "kudig: YAML 清单", "Deployment YAML 模板大全", "markdown", "bge-large-zh", "YAML 清单"),
    SeedDoc("doc-kudig-068", "col-kudig-d32", "kudig: YAML 清单", "Service/Ingress YAML 示例", "markdown", "bge-large-zh", "YAML 清单"),
    SeedDoc("doc-kudig-069", "col-kudig-d33", "kudig: K8s 事件", "K8s Event 类型与含义", "markdown", "bge-large-zh", "K8s 事件"),
    SeedDoc("doc-kudig-070", "col-kudig-d33", "kudig: K8s 事件", "事件驱动运维与告警关联", "markdown", "bge-large-zh", "K8s 事件"),
    SeedDoc("doc-kudig-071", "col-kudig-d33", "kudig: K8s 事件", "Warning Event 排查手册", "markdown", "bge-large-zh", "K8s 事件"),
    SeedDoc("doc-kudig-072", "col-kudig-d34", "kudig: CNCF 全景", "Prometheus 项目全解", "markdown", "bge-large-zh", "CNCF 全景"),
    SeedDoc("doc-kudig-073", "col-kudig-d34", "kudig: CNCF 全景", "Envoy 项目全解", "markdown", "bge-large-zh", "CNCF 全景"),
    SeedDoc("doc-kudig-074", "col-kudig-d34", "kudig: CNCF 全景", "Helm 项目全解", "markdown", "bge-large-zh", "CNCF 全景"),
    SeedDoc("doc-kudig-075", "col-kudig-d34", "kudig: CNCF 全景", "Cilium 项目全解", "markdown", "bge-large-zh", "CNCF 全景"),
    SeedDoc("doc-kudig-076", "col-kudig-d35", "kudig: eBPF", "eBPF 原理与 Cilium 实践", "markdown", "bge-large-zh", "eBPF"),
    SeedDoc("doc-kudig-077", "col-kudig-d35", "kudig: eBPF", "eBPF 网络可观测性", "markdown", "bge-large-zh", "eBPF"),
    SeedDoc("doc-kudig-078", "col-kudig-d36", "kudig: 平台工程", "Backstage 内部开发者门户", "markdown", "bge-large-zh", "平台工程"),
    SeedDoc("doc-kudig-079", "col-kudig-d36", "kudig: 平台工程", "平台工程成熟度模型", "markdown", "bge-large-zh", "平台工程"),
    SeedDoc("doc-kudig-080", "col-kudig-d37", "kudig: 边缘计算", "KubeEdge 边缘节点管理", "markdown", "bge-large-zh", "边缘计算"),
    SeedDoc("doc-kudig-081", "col-kudig-d37", "kudig: 边缘计算", "OpenYurt 边云协同架构", "markdown", "bge-large-zh", "边缘计算"),
    SeedDoc("doc-kudig-082", "col-kudig-d38", "kudig: WebAssembly", "WasmEdge 运行时入门", "markdown", "bge-large-zh", "WebAssembly"),
    SeedDoc("doc-kudig-083", "col-kudig-d38", "kudig: WebAssembly", "Spin 框架与 Wasm on K8s", "markdown", "bge-large-zh", "WebAssembly"),
    SeedDoc("doc-kudig-084", "col-kudig-d39", "kudig: API 网关", "Gateway API 规范解读", "markdown", "bge-large-zh", "API 网关"),
    SeedDoc("doc-kudig-085", "col-kudig-d39", "kudig: API 网关", "APISIX 与 Higress 对比", "markdown", "bge-large-zh", "API 网关"),
    SeedDoc("doc-kudig-086", "col-kudig-d40", "kudig: AIOps", "AIOps 平台建设指南", "markdown", "bge-large-zh", "AIOps"),
    SeedDoc("doc-kudig-087", "col-kudig-d40", "kudig: AIOps", "智能告警与异常检测", "markdown", "bge-large-zh", "AIOps"),
]
# fmt: on


# ---------------------------------------------------------------------------
# Content generator — produces representative Markdown for each seed doc
# ---------------------------------------------------------------------------

# Domain-specific knowledge templates keyed by collection_name keywords
_DOMAIN_TEMPLATES: dict[str, list[str]] = {
    "运维手册": [
        "## 概述\n\n本文档介绍{title}的标准操作流程，适用于生产环境的日常运维场景。",
        "## 前置条件\n\n- 已配置对应云产品的 RAM 权限\n- 已安装 aliyun CLI 或登录控制台\n- 了解基本的资源拓扑结构",
        "## 操作步骤\n\n### 步骤一：环境确认\n\n在执行任何变更之前，需先确认目标环境的状态和版本信息。建议使用 `kubectl get nodes` 或控制台查看集群概况。\n\n### 步骤二：执行变更\n\n按照变更窗口要求，依次执行预设的运维操作。注意保留操作日志和回滚方案。\n\n### 步骤三：验证结果\n\n变更完成后，通过监控面板和健康检查接口确认服务状态正常。",
        "## 故障回滚\n\n若变更导致异常，应立即执行回滚：\n1. 停止当前变更操作\n2. 恢复到变更前的配置快照\n3. 通知相关团队并记录故障原因",
        "## 注意事项\n\n- 生产环境操作需要至少两人确认\n- 变更窗口外严禁执行高风险操作\n- 所有操作必须有审计日志",
    ],
    "故障复盘": [
        "## 事件概要\n\n{title}是一起影响生产环境可用性的故障事件。本文档记录了故障的完整时间线、根因分析和改进措施。",
        "## 时间线\n\n| 时间 | 事件 |\n|------|------|\n| T+0min | 监控告警触发，PagerDuty 通知 On-Call |\n| T+5min | On-Call 确认并开始排查 |\n| T+15min | 定位根因，开始修复 |\n| T+30min | 服务恢复正常 |\n| T+60min | 发布故障通报 |",
        "## 根因分析\n\n经过深入排查，故障的根本原因是配置变更未经过充分的预发验证，导致生产环境出现非预期行为。具体表现为数据库连接池耗尽、请求超时级联放大。\n\n### 5-Whys 分析\n\n1. 为什么服务不可用？—— 数据库连接超时\n2. 为什么连接超时？—— 连接池参数配置异常\n3. 为什么配置异常？—— 变更未做灰度发布\n4. 为什么未灰度？—— 缺少强制灰度流程\n5. 为什么缺少流程？—— SOP 未覆盖此场景",
        "## 改进措施\n\n- [ ] 补充变更灰度发布 SOP\n- [ ] 增加配置变更的自动化回归测试\n- [ ] 完善监控告警的敏感度配置\n- [ ] 定期进行故障演练",
    ],
    "最佳实践": [
        "## 简介\n\n{title}旨在帮助运维和开发团队在 Kubernetes 环境中建立标准化的最佳实践。",
        "## 核心原则\n\n### 声明式管理\n\n所有资源配置通过 YAML 声明式定义，纳入 Git 版本管理。避免手动修改和 kubectl 命令直接操作生产集群。\n\n### 最小权限\n\n遵循最小权限原则，为每个服务账号配置精确的 RBAC 权限。避免使用 cluster-admin 角色。\n\n### 可观测性\n\n每个服务必须暴露健康检查端点（/healthz、/readyz），集成 Prometheus Metrics 和结构化日志。",
        "## 实施步骤\n\n1. 评估当前环境的合规性\n2. 制定改进路线图\n3. 分阶段实施改进措施\n4. 建立持续监控和审计机制",
        "## 常见问题\n\n### Q: 如何处理遗留应用的改造？\n\nA: 建议采用渐进式改造策略，先实现容器化，再逐步引入声明式管理和可观测性。\n\n### Q: 多集群场景下如何统一管理？\n\nA: 推荐使用 GitOps 工具（如 ArgoCD）实现多集群的统一配置分发和同步。",
    ],
    "SOP": [
        "## 目标\n\n本 SOP 定义了{title}的标准化操作流程，确保运维操作的可重复性和安全性。",
        "## 适用范围\n\n本流程适用于所有生产环境的变更操作，包括但不限于：\n- 应用部署与升级\n- 基础设施配置变更\n- 数据库迁移与维护\n- 紧急故障处理",
        "## 审批流程\n\n1. **发起变更申请**：填写变更单，描述变更内容、影响范围和回滚方案\n2. **技术评审**：至少一名高级工程师审核变更方案\n3. **审批通过**：相关负责人审批后方可执行\n4. **执行变更**：在变更窗口内按计划执行\n5. **验证确认**：变更完成后验证服务状态",
        "## 应急响应\n\n当发生非预期情况时：\n1. 立即停止变更操作\n2. 评估影响范围\n3. 执行回滚方案\n4. 升级通知管理层\n5. 组织复盘分析",
    ],
    "安全基线": [
        "## 安全基线概述\n\n{title}定义了 Kubernetes 集群及其上运行的工作负载必须满足的安全要求。",
        "## 控制面安全\n\n### API Server 安全配置\n\n- 启用 RBAC 授权模式\n- 配置审计日志策略\n- 限制匿名访问\n- 启用 TLS 加密通信\n\n### etcd 安全\n\n- 启用 etcd 数据加密\n- 配置 etcd 访问认证\n- 定期备份 etcd 数据",
        "## 工作负载安全\n\n### Pod 安全标准\n\n- 禁止特权容器运行\n- 配置只读根文件系统\n- 限制资源使用（CPU/Memory limits）\n- 禁用 hostNetwork 和 hostPID\n\n### 镜像安全\n\n- 仅使用经过签名验证的镜像\n- 定期扫描已部署镜像的 CVE 漏洞\n- 建立私有镜像仓库并配置访问策略",
        "## 合规检查\n\n建议使用 kube-bench 等工具定期进行自动化合规检查，并将结果纳入安全审计报告。",
    ],
}

# Generic template for kudig domain docs
_KUDIG_TEMPLATE: list[str] = [
    "## 概述\n\n{title}是 Kubernetes 运维知识体系中{domain}领域的核心内容。本文档提供了系统化的技术讲解和实践指导。",
    "## 核心概念\n\n### 基础架构\n\n在{domain}领域，理解底层架构是关键。{title}涉及的核心组件包括控制面、数据面和管理面的协同工作机制。每个组件都有明确的职责边界和通信接口。\n\n### 设计原则\n\n遵循云原生设计原则：声明式配置、自愈性、可观测性、松耦合。这些原则在{title}的实践中尤为重要。",
    "## 技术详解\n\n### 架构分层\n\n{title}的技术实现分为三层：\n1. **接口层**：提供 API 和 CLI 入口，处理用户请求\n2. **逻辑层**：实现核心业务逻辑，包括调度、编排、策略执行\n3. **数据层**：负责状态持久化和数据一致性保证\n\n### 关键流程\n\n从请求发起到最终执行，经历了认证鉴权、准入控制、资源调度、状态同步等多个阶段。每个阶段都有相应的扩展点和配置选项。",
    "## 实战指南\n\n### 环境准备\n\n```bash\n# 确认集群版本\nkubectl version --short\n\n# 检查相关组件状态\nkubectl get componentstatuses\n```\n\n### 配置示例\n\n根据{title}的最佳实践，建议在生产环境中采用以下配置策略：\n- 资源配额：设置合理的 ResourceQuota\n- 网络策略：启用 NetworkPolicy 限制 Pod 间通信\n- 监控告警：配置 Prometheus 采集关键指标",
    "## 故障排查\n\n### 常见问题\n\n1. **状态异常**：检查 Events 和日志，定位根因\n2. **性能瓶颈**：通过 Metrics 分析资源使用情况\n3. **配置漂移**：对比期望状态与实际状态的差异\n\n### 排查工具\n\n- `kubectl describe` 查看资源详情\n- `kubectl logs` 查看容器日志\n- `kubectl top` 查看资源使用\n- `kubectl debug` 进行交互式调试",
    "## 参考资料\n\n- Kubernetes 官方文档\n- CNCF 技术雷达\n- 相关 KEP（Kubernetes Enhancement Proposals）\n- 社区最佳实践分享",
]


def generate_content(doc: SeedDoc) -> str:
    """Generate representative Markdown content for a seed document.

    The generated content is deterministic and domain-appropriate,
    making the vector embeddings semantically meaningful for RAG retrieval.
    """
    title = doc.title

    # Pick template based on collection_name keywords
    template: list[str] | None = None
    for keyword, tmpl in _DOMAIN_TEMPLATES.items():
        if keyword in doc.collection_name:
            template = tmpl
            break

    if template is None:
        template = _KUDIG_TEMPLATE

    # Build the document
    header = f"# {title}\n\n"
    header += f"> **知识库**: {doc.collection_name}\n"
    if doc.domain:
        header += f"> **领域**: {doc.domain}\n"
    header += "\n"

    body_parts: list[str] = []
    for section in template:
        rendered = section.format(title=title, domain=doc.domain or doc.collection_name)
        body_parts.append(rendered)

    return header + "\n\n".join(body_parts)


# ---------------------------------------------------------------------------
# Vectorization runner
# ---------------------------------------------------------------------------


async def vectorize_seeds(
    *,
    collection_filter: str | None = None,
    embedding_model: str = "bge-large-zh",
    vector_backend: str = "milvus",
    milvus_host: str = "localhost",
    milvus_port: int = 19530,
    chunk_strategy: str = "by_h2",
    chunk_size: int = 2000,
    force: bool = False,
    dry_run: bool = False,
    batch_delay: float = 0.1,
) -> dict[str, Any]:
    """Vectorize all seed RAG documents.

    Returns:
        Summary dict with counts and timing.
    """
    from resolveagent.rag.ingest.chunker import TextChunker
    from resolveagent.rag.pipeline import RAGPipeline

    # Filter documents
    docs = SEED_DOCUMENTS
    if collection_filter:
        docs = [d for d in docs if d.collection_id == collection_filter]

    if not docs:
        logger.warning("No documents match the filter: %s", collection_filter)
        return {"documents": 0, "chunks": 0, "errors": []}

    logger.info(
        "Starting seed vectorization: %d documents across %d collections",
        len(docs),
        len({d.collection_id for d in docs}),
    )

    if dry_run:
        _print_dry_run(docs)
        return {"documents": len(docs), "chunks": 0, "dry_run": True}

    # Initialize pipeline
    pipeline = RAGPipeline(
        embedding_model=embedding_model,
        vector_backend=vector_backend,
    )
    chunker = TextChunker(strategy=chunk_strategy, chunk_size=chunk_size)

    total_docs = 0
    total_chunks = 0
    errors: list[str] = []
    start_time = time.monotonic()

    # Group by collection for efficient processing
    from itertools import groupby
    from operator import attrgetter

    sorted_docs = sorted(docs, key=attrgetter("collection_id"))

    for collection_id, group in groupby(sorted_docs, key=attrgetter("collection_id")):
        group_docs = list(group)
        collection_name = group_docs[0].collection_name
        logger.info(
            "Processing collection: %s (%s) — %d documents",
            collection_id,
            collection_name,
            len(group_docs),
        )

        for doc in group_docs:
            try:
                content = generate_content(doc)
                document = {
                    "id": doc.id,
                    "content": content,
                    "metadata": {
                        "title": doc.title,
                        "collection_name": doc.collection_name,
                        "content_type": "text/markdown",
                        "source": "seed-vectorizer",
                        "seed_id": doc.id,
                        "embedding_model": doc.embedding_model,
                    },
                }
                if doc.domain:
                    document["metadata"]["domain"] = doc.domain

                result = await pipeline.ingest(
                    collection_id=collection_id,
                    documents=[document],
                    chunker=chunker,
                )

                chunks_created = result.get("chunks_created", 0)
                total_docs += 1
                total_chunks += chunks_created

                logger.info(
                    "  [%d/%d] %s — %d chunks",
                    total_docs,
                    len(docs),
                    doc.title,
                    chunks_created,
                )

                if result.get("errors"):
                    errors.extend(result["errors"])

            except Exception as e:
                error_msg = f"{doc.id} ({doc.title}): {e}"
                logger.error("  FAILED: %s", error_msg)
                errors.append(error_msg)

            if batch_delay > 0:
                await asyncio.sleep(batch_delay)

    duration = time.monotonic() - start_time

    summary = {
        "documents_processed": total_docs,
        "documents_total": len(docs),
        "chunks_created": total_chunks,
        "collections": len({d.collection_id for d in docs}),
        "errors": errors,
        "duration_seconds": round(duration, 2),
    }

    _print_summary(summary)
    return summary


def _print_dry_run(docs: list[SeedDoc]) -> None:
    """Print what would be vectorized without actually doing it."""
    print("\n╔══════════════════════════════════════════════════════╗")
    print("║        RAG Seed Vectorization — Dry Run              ║")
    print("╚══════════════════════════════════════════════════════╝\n")

    from itertools import groupby
    from operator import attrgetter

    sorted_docs = sorted(docs, key=attrgetter("collection_id"))

    for collection_id, group in groupby(sorted_docs, key=attrgetter("collection_id")):
        group_list = list(group)
        print(f"  📁 {collection_id} ({group_list[0].collection_name})")
        for doc in group_list:
            content = generate_content(doc)
            print(f"     📄 {doc.title} — ~{len(content)} chars")
        print()

    print(f"  Total: {len(docs)} documents across {len({d.collection_id for d in docs})} collections")
    print("  Run without --dry-run to start vectorization.\n")


def _print_summary(summary: dict[str, Any]) -> None:
    """Print vectorization summary."""
    print("\n╔══════════════════════════════════════════════════════╗")
    print("║        RAG Seed Vectorization — Summary              ║")
    print("╚══════════════════════════════════════════════════════╝\n")
    print(f"  Documents processed: {summary['documents_processed']}/{summary['documents_total']}")
    print(f"  Chunks created:      {summary['chunks_created']}")
    print(f"  Collections:         {summary['collections']}")
    print(f"  Duration:            {summary['duration_seconds']}s")
    if summary.get("errors"):
        print(f"  Errors:              {len(summary['errors'])}")
        for err in summary["errors"][:5]:
            print(f"    ⚠ {err}")
    else:
        print("  Errors:              0")
    print()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------


def main(argv: list[str] | None = None) -> None:
    """CLI entry point for seed vectorization."""
    parser = argparse.ArgumentParser(
        prog="vectorize-rag-seeds",
        description="Vectorize seed RAG documents — generate content and index into vector store.",
    )
    parser.add_argument(
        "--collection",
        default=None,
        help="Only vectorize documents in this collection ID (e.g. col-ops-kb-001)",
    )
    parser.add_argument(
        "--embedding-model",
        default="bge-large-zh",
        help="Embedding model (default: bge-large-zh)",
    )
    parser.add_argument(
        "--vector-backend",
        default="milvus",
        choices=["milvus", "qdrant"],
        help="Vector store backend (default: milvus)",
    )
    parser.add_argument(
        "--milvus-host",
        default="localhost",
        help="Milvus server host (default: localhost)",
    )
    parser.add_argument(
        "--milvus-port",
        type=int,
        default=19530,
        help="Milvus server port (default: 19530)",
    )
    parser.add_argument(
        "--chunk-strategy",
        default="by_h2",
        choices=["fixed", "sentence", "by_h2", "by_h3", "by_section"],
        help="Text chunking strategy (default: by_h2)",
    )
    parser.add_argument(
        "--chunk-size",
        type=int,
        default=2000,
        help="Maximum chunk size in characters (default: 2000)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-vectorize even if vectors already exist",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be vectorized without writing",
    )
    parser.add_argument(
        "--batch-delay",
        type=float,
        default=0.1,
        help="Delay in seconds between document processing (default: 0.1)",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable DEBUG logging",
    )

    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )

    asyncio.run(
        vectorize_seeds(
            collection_filter=args.collection,
            embedding_model=args.embedding_model,
            vector_backend=args.vector_backend,
            milvus_host=args.milvus_host,
            milvus_port=args.milvus_port,
            chunk_strategy=args.chunk_strategy,
            chunk_size=args.chunk_size,
            force=args.force,
            dry_run=args.dry_run,
            batch_delay=args.batch_delay,
        )
    )


if __name__ == "__main__":
    main()
