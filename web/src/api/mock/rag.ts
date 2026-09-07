import type { Collection } from '../client';
import type { CollectionDetail, CorpusMatch, Document } from '../../types';

// ─── RAG Collections (enriched) ───
export const mockCollections: Collection[] = [
  { id: 'col-ops-kb-001', name: '阿里云产品运维手册', document_count: 347, vector_count: 12840 },
  { id: 'col-ops-kb-002', name: '历史故障复盘文档', document_count: 156, vector_count: 5230 },
  { id: 'col-ops-kb-003', name: 'K8s 最佳实践', document_count: 89, vector_count: 3410 },
  { id: 'col-ops-kb-004', name: '内部运维 SOP 流程', document_count: 63, vector_count: 2150 },
  { id: 'col-ops-kb-005', name: '安全基线与合规指南', document_count: 42, vector_count: 1680 },
  // kudig-database domain collections
  { id: 'col-kudig-d01', name: 'kudig: K8s 架构概览', document_count: 28, vector_count: 1120 },
  { id: 'col-kudig-d02', name: 'kudig: K8s 设计原则', document_count: 24, vector_count: 960 },
  { id: 'col-kudig-d03', name: 'kudig: 控制平面', document_count: 32, vector_count: 1280 },
  { id: 'col-kudig-d04', name: 'kudig: 工作负载管理', document_count: 30, vector_count: 1200 },
  { id: 'col-kudig-d05', name: 'kudig: 网络', document_count: 41, vector_count: 1640 },
  { id: 'col-kudig-d06', name: 'kudig: 存储', document_count: 22, vector_count: 880 },
  { id: 'col-kudig-d07', name: 'kudig: 安全', document_count: 26, vector_count: 1040 },
  { id: 'col-kudig-d08', name: 'kudig: 可观测性', document_count: 28, vector_count: 1120 },
  { id: 'col-kudig-d09', name: 'kudig: 平台运维', document_count: 20, vector_count: 800 },
  { id: 'col-kudig-d10', name: 'kudig: 扩展机制', document_count: 18, vector_count: 720 },
  { id: 'col-kudig-d11', name: 'kudig: AI 基础设施', document_count: 36, vector_count: 1440 },
  { id: 'col-kudig-d12', name: 'kudig: 故障排查', document_count: 42, vector_count: 1680 },
  { id: 'col-kudig-d13', name: 'kudig: Docker 容器', document_count: 16, vector_count: 640 },
  { id: 'col-kudig-d14', name: 'kudig: Linux 基础', document_count: 14, vector_count: 560 },
  { id: 'col-kudig-d15', name: 'kudig: 网络基础', document_count: 12, vector_count: 480 },
  { id: 'col-kudig-d16', name: 'kudig: 存储基础', document_count: 10, vector_count: 400 },
  { id: 'col-kudig-d17', name: 'kudig: 云服务商', document_count: 14, vector_count: 560 },
  { id: 'col-kudig-d18', name: 'kudig: 生产运维', document_count: 18, vector_count: 720 },
  { id: 'col-kudig-d19', name: 'kudig: 技术论文', document_count: 12, vector_count: 480 },
  { id: 'col-kudig-d20', name: 'kudig: 监控告警', document_count: 16, vector_count: 640 },
  { id: 'col-kudig-d21', name: 'kudig: 日志管理', document_count: 14, vector_count: 560 },
  { id: 'col-kudig-d22', name: 'kudig: 安全运维', document_count: 12, vector_count: 480 },
  { id: 'col-kudig-d23', name: 'kudig: 灾备恢复', document_count: 10, vector_count: 400 },
  { id: 'col-kudig-d24', name: 'kudig: 容量规划', document_count: 8, vector_count: 320 },
  { id: 'col-kudig-d25', name: 'kudig: 成本优化', document_count: 10, vector_count: 400 },
  { id: 'col-kudig-d26', name: 'kudig: SRE 实践', document_count: 14, vector_count: 560 },
  { id: 'col-kudig-d27', name: 'kudig: 混沌工程', document_count: 8, vector_count: 320 },
  { id: 'col-kudig-d28', name: 'kudig: 服务网格', document_count: 12, vector_count: 480 },
  { id: 'col-kudig-d29', name: 'kudig: GitOps', document_count: 10, vector_count: 400 },
  { id: 'col-kudig-d30', name: 'kudig: 多集群管理', document_count: 8, vector_count: 320 },
  { id: 'col-kudig-d31', name: 'kudig: 硬件基础', document_count: 12, vector_count: 480 },
  { id: 'col-kudig-d32', name: 'kudig: YAML 清单', document_count: 36, vector_count: 1440 },
  { id: 'col-kudig-d33', name: 'kudig: K8s 事件', document_count: 20, vector_count: 800 },
  { id: 'col-kudig-d34', name: 'kudig: CNCF 全景', document_count: 218, vector_count: 8720 },
  { id: 'col-kudig-d35', name: 'kudig: eBPF', document_count: 14, vector_count: 560 },
  { id: 'col-kudig-d36', name: 'kudig: 平台工程', document_count: 16, vector_count: 640 },
  { id: 'col-kudig-d37', name: 'kudig: 边缘计算', document_count: 10, vector_count: 400 },
  { id: 'col-kudig-d38', name: 'kudig: WebAssembly', document_count: 8, vector_count: 320 },
  { id: 'col-kudig-d39', name: 'kudig: API 网关', document_count: 12, vector_count: 480 },
  { id: 'col-kudig-d40', name: 'kudig: AIOps', document_count: 18, vector_count: 720 },
];

export const mockCollectionDetails: CollectionDetail[] = [
  { id: 'col-ops-kb-001', name: '阿里云产品运维手册', description: '覆盖 ECS、ACK、RDS、SLB、OSS 等核心产品的运维操作指南', document_count: 347, vector_count: 12840, embedding_model: 'text-embedding-v2', created_at: '2026-05-15T08:00:00Z' },
  { id: 'col-ops-kb-002', name: '历史故障复盘文档', description: '生产环境历史故障的 RCA 报告和复盘总结', document_count: 156, vector_count: 5230, embedding_model: 'text-embedding-v2', created_at: '2026-05-20T10:00:00Z' },
  { id: 'col-ops-kb-003', name: 'K8s 最佳实践', description: 'Kubernetes 集群管理、Pod 调度、网络策略、安全加固等最佳实践', document_count: 89, vector_count: 3410, embedding_model: 'text-embedding-v2', created_at: '2026-06-01T14:00:00Z' },
  { id: 'col-ops-kb-004', name: '内部运维 SOP 流程', description: '标准化运维操作流程，包含变更管理、应急响应、巡检等', document_count: 63, vector_count: 2150, embedding_model: 'text-embedding-v2', created_at: '2026-06-10T09:00:00Z' },
  { id: 'col-ops-kb-005', name: '安全基线与合规指南', description: 'CIS Benchmark、等保 2.0、安全基线配置检查', document_count: 42, vector_count: 1680, embedding_model: 'text-embedding-v2', created_at: '2026-06-15T16:00:00Z' },
  // kudig-database domain collection details
  { id: 'col-kudig-d01', name: 'kudig: K8s 架构概览', description: 'Kubernetes 架构全景图、核心组件关系、集群拓扑与设计理念', document_count: 28, vector_count: 1120, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d02', name: 'kudig: K8s 设计原则', description: '声明式 API、控制器模式、终态驱动、松耦合架构等设计哲学', document_count: 24, vector_count: 960, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d03', name: 'kudig: 控制平面', description: 'API Server、etcd、Scheduler、Controller Manager 深度解析', document_count: 32, vector_count: 1280, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d04', name: 'kudig: 工作负载管理', description: 'Deployment、StatefulSet、DaemonSet、Job/CronJob 工作负载全解', document_count: 30, vector_count: 1200, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d05', name: 'kudig: 网络', description: 'CNI、Service、Ingress、NetworkPolicy、DNS 等网络子系统', document_count: 41, vector_count: 1640, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d06', name: 'kudig: 存储', description: 'PV/PVC、StorageClass、CSI 驱动、动态供给与数据持久化', document_count: 22, vector_count: 880, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d07', name: 'kudig: 安全', description: 'RBAC、PSP/PSA、Secret 管理、镜像安全、审计日志', document_count: 26, vector_count: 1040, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d08', name: 'kudig: 可观测性', description: 'Metrics、Logging、Tracing 三支柱，Prometheus/Grafana/OpenTelemetry', document_count: 28, vector_count: 1120, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d09', name: 'kudig: 平台运维', description: '集群升级、证书轮换、etcd 备份、节点运维与扩缩容', document_count: 20, vector_count: 800, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d10', name: 'kudig: 扩展机制', description: 'CRD、Operator、Webhook、Aggregated API、扩展调度器', document_count: 18, vector_count: 720, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d11', name: 'kudig: AI 基础设施', description: 'GPU 调度、AI 训练平台、推理服务、MLOps on K8s', document_count: 36, vector_count: 1440, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d12', name: 'kudig: 故障排查', description: 'Pod 异常、节点问题、网络故障、存储异常等排查方法论', document_count: 42, vector_count: 1680, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d13', name: 'kudig: Docker 容器', description: 'Docker 原理、镜像构建、容器运行时、containerd/CRI-O', document_count: 16, vector_count: 640, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d14', name: 'kudig: Linux 基础', description: 'Namespace、Cgroup、文件系统、进程管理等容器底层技术', document_count: 14, vector_count: 560, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d15', name: 'kudig: 网络基础', description: 'TCP/IP、iptables/nftables、VXLAN、BGP 等网络基础知识', document_count: 12, vector_count: 480, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d16', name: 'kudig: 存储基础', description: '块存储、文件存储、对象存储、分布式存储原理', document_count: 10, vector_count: 400, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d17', name: 'kudig: 云服务商', description: '阿里云 ACK、AWS EKS、GCP GKE 等托管 K8s 服务对比', document_count: 14, vector_count: 560, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d18', name: 'kudig: 生产运维', description: '生产级 K8s 集群的运维策略、SLA 管理与故障演练', document_count: 18, vector_count: 720, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d19', name: 'kudig: 技术论文', description: 'Borg、Omega、K8s 相关学术论文与技术白皮书', document_count: 12, vector_count: 480, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d20', name: 'kudig: 监控告警', description: 'Prometheus、AlertManager、Grafana、自定义指标与告警策略', document_count: 16, vector_count: 640, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d21', name: 'kudig: 日志管理', description: 'EFK/PLG 日志栈、结构化日志、日志采集与分析', document_count: 14, vector_count: 560, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d22', name: 'kudig: 安全运维', description: '供应链安全、运行时防护、漏洞扫描、合规审计', document_count: 12, vector_count: 480, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d23', name: 'kudig: 灾备恢复', description: '跨区域灾备、Velero 备份、RTO/RPO 策略、故障切换', document_count: 10, vector_count: 400, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d24', name: 'kudig: 容量规划', description: '资源配额、LimitRange、VPA/HPA、集群容量评估', document_count: 8, vector_count: 320, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d25', name: 'kudig: 成本优化', description: '资源利用率优化、Spot 实例、FinOps 与成本可视化', document_count: 10, vector_count: 400, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d26', name: 'kudig: SRE 实践', description: 'SLI/SLO/SLA、错误预算、On-Call、事故管理流程', document_count: 14, vector_count: 560, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d27', name: 'kudig: 混沌工程', description: 'Chaos Mesh、LitmusChaos、故障注入与韧性验证', document_count: 8, vector_count: 320, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d28', name: 'kudig: 服务网格', description: 'Istio、Linkerd、Envoy、流量管理与 mTLS', document_count: 12, vector_count: 480, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d29', name: 'kudig: GitOps', description: 'ArgoCD、FluxCD、声明式交付与持续部署', document_count: 10, vector_count: 400, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d30', name: 'kudig: 多集群管理', description: '联邦集群、Submariner、多集群网络与统一调度', document_count: 8, vector_count: 320, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d31', name: 'kudig: 硬件基础', description: 'CPU/内存/磁盘/网卡硬件知识与性能调优', document_count: 12, vector_count: 480, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d32', name: 'kudig: YAML 清单', description: '常用 K8s 资源 YAML 模板与配置最佳实践', document_count: 36, vector_count: 1440, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d33', name: 'kudig: K8s 事件', description: 'K8s Event 类型、含义、排查关联与事件驱动运维', document_count: 20, vector_count: 800, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d34', name: 'kudig: CNCF 全景', description: 'CNCF 218 个项目全景解读，覆盖云原生技术栈各层', document_count: 218, vector_count: 8720, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d35', name: 'kudig: eBPF', description: 'eBPF 原理、Cilium、网络可观测性与安全策略', document_count: 14, vector_count: 560, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d36', name: 'kudig: 平台工程', description: '内部开发者平台、Backstage、自助服务门户', document_count: 16, vector_count: 640, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d37', name: 'kudig: 边缘计算', description: 'KubeEdge、OpenYurt、边缘节点管理与边云协同', document_count: 10, vector_count: 400, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d38', name: 'kudig: WebAssembly', description: 'WASM 运行时、WasmEdge、Spin、Wasm on K8s', document_count: 8, vector_count: 320, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d39', name: 'kudig: API 网关', description: 'APISIX、Kong、Higress、Gateway API 与流量治理', document_count: 12, vector_count: 480, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
  { id: 'col-kudig-d40', name: 'kudig: AIOps', description: 'AIOps 平台建设、智能告警、异常检测、根因分析', document_count: 18, vector_count: 720, embedding_model: 'bge-large-zh', created_at: '2026-08-15T10:00:00Z' },
];

// ─── RAG Documents ───
export const mockDocuments: Document[] = [
  // col-ops-kb-001: 阿里云产品运维手册
  { id: 'doc-001', collection_id: 'col-ops-kb-001', title: 'ACK 集群升级操作手册.pdf', format: 'pdf', size_bytes: 2456000, chunk_count: 48, status: 'indexed', uploaded_at: '2026-06-01T08:00:00Z', updated_at: '2026-07-15T10:00:00Z' },
  { id: 'doc-002', collection_id: 'col-ops-kb-001', title: 'ECS 实例故障排查 SOP.md', format: 'markdown', size_bytes: 156000, chunk_count: 23, status: 'indexed', uploaded_at: '2026-06-05T14:00:00Z', updated_at: '2026-07-20T09:00:00Z' },
  { id: 'doc-003', collection_id: 'col-ops-kb-001', title: 'RDS 备份恢复最佳实践.pdf', format: 'pdf', size_bytes: 1890000, chunk_count: 35, status: 'indexed', uploaded_at: '2026-06-10T11:00:00Z', updated_at: '2026-07-10T15:00:00Z' },
  { id: 'doc-004', collection_id: 'col-ops-kb-001', title: 'SLB 配置指南.md', format: 'markdown', size_bytes: 98000, chunk_count: 15, status: 'indexed', uploaded_at: '2026-06-12T09:00:00Z', updated_at: '2026-06-12T09:00:00Z' },
  // col-ops-kb-002: 历史故障复盘
  { id: 'doc-005', collection_id: 'col-ops-kb-002', title: 'INC-2026-0673 RDS 主从同步复盘.md', format: 'markdown', size_bytes: 67000, chunk_count: 12, status: 'indexed', uploaded_at: '2026-06-20T16:00:00Z', updated_at: '2026-06-20T16:00:00Z' },
  { id: 'doc-006', collection_id: 'col-ops-kb-002', title: 'INC-2026-0521 K8s 集群网络风暴.pdf', format: 'pdf', size_bytes: 1234000, chunk_count: 28, status: 'indexed', uploaded_at: '2026-06-22T10:00:00Z', updated_at: '2026-06-22T10:00:00Z' },
  { id: 'doc-007', collection_id: 'col-ops-kb-002', title: 'INC-2026-0445 DNS 解析异常.md', format: 'markdown', size_bytes: 45000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-06-25T14:00:00Z', updated_at: '2026-06-25T14:00:00Z' },
  // col-ops-kb-003: K8s 最佳实践
  { id: 'doc-008', collection_id: 'col-ops-kb-003', title: 'K8s Pod 调度策略.md', format: 'markdown', size_bytes: 89000, chunk_count: 16, status: 'indexed', uploaded_at: '2026-07-01T08:00:00Z', updated_at: '2026-07-01T08:00:00Z' },
  { id: 'doc-009', collection_id: 'col-ops-kb-003', title: 'Helm Chart 最佳实践.md', format: 'markdown', size_bytes: 72000, chunk_count: 14, status: 'indexed', uploaded_at: '2026-07-05T10:00:00Z', updated_at: '2026-07-05T10:00:00Z' },
  { id: 'doc-010', collection_id: 'col-ops-kb-003', title: '容器镜像安全扫描.pdf', format: 'pdf', size_bytes: 980000, chunk_count: 20, status: 'indexed', uploaded_at: '2026-07-08T14:00:00Z', updated_at: '2026-07-08T14:00:00Z' },
  // col-ops-kb-004: 内部运维 SOP
  { id: 'doc-011', collection_id: 'col-ops-kb-004', title: '变更管理 SOP v2.1.pdf', format: 'pdf', size_bytes: 1560000, chunk_count: 30, status: 'indexed', uploaded_at: '2026-07-10T09:00:00Z', updated_at: '2026-08-01T11:00:00Z' },
  { id: 'doc-012', collection_id: 'col-ops-kb-004', title: '应急响应流程.md', format: 'markdown', size_bytes: 112000, chunk_count: 18, status: 'indexed', uploaded_at: '2026-07-12T16:00:00Z', updated_at: '2026-07-12T16:00:00Z' },
  // col-ops-kb-005: 安全基线
  { id: 'doc-013', collection_id: 'col-ops-kb-005', title: 'CIS Benchmark K8s 1.28.pdf', format: 'pdf', size_bytes: 3200000, chunk_count: 65, status: 'indexed', uploaded_at: '2026-07-15T08:00:00Z', updated_at: '2026-07-15T08:00:00Z' },
  { id: 'doc-014', collection_id: 'col-ops-kb-005', title: '等保 2.0 合规检查清单.pdf', format: 'pdf', size_bytes: 2100000, chunk_count: 42, status: 'indexed', uploaded_at: '2026-07-18T10:00:00Z', updated_at: '2026-07-18T10:00:00Z' },
  { id: 'doc-015', collection_id: 'col-ops-kb-001', title: 'OSS 跨区域复制配置.txt', format: 'txt', size_bytes: 23000, chunk_count: 5, status: 'processing', uploaded_at: '2026-08-08T09:30:00Z', updated_at: '2026-08-08T09:30:00Z' },
  // kudig-database domain documents — every collection has documents
  // domain-1: K8s 架构概览
  { id: 'doc-kudig-001', collection_id: 'col-kudig-d01', title: 'Kubernetes 架构全景图.md', format: 'markdown', size_bytes: 45000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-002', collection_id: 'col-kudig-d01', title: 'K8s 核心组件交互流程.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-003', collection_id: 'col-kudig-d01', title: '集群拓扑与高可用部署.md', format: 'markdown', size_bytes: 42000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-2: K8s 设计原则
  { id: 'doc-kudig-004', collection_id: 'col-kudig-d02', title: '声明式 API 设计哲学.md', format: 'markdown', size_bytes: 32000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-005', collection_id: 'col-kudig-d02', title: '控制器模式与终态驱动.md', format: 'markdown', size_bytes: 36000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-3: 控制平面
  { id: 'doc-kudig-006', collection_id: 'col-kudig-d03', title: '控制平面架构总览.md', format: 'markdown', size_bytes: 52000, chunk_count: 10, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-007', collection_id: 'col-kudig-d03', title: 'etcd 集群运维指南.md', format: 'markdown', size_bytes: 41000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-008', collection_id: 'col-kudig-d03', title: 'API Server 深度解析.md', format: 'markdown', size_bytes: 48000, chunk_count: 9, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-4: 工作负载管理
  { id: 'doc-kudig-009', collection_id: 'col-kudig-d04', title: 'Deployment 滚动更新策略.md', format: 'markdown', size_bytes: 35000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-010', collection_id: 'col-kudig-d04', title: 'StatefulSet 有状态应用管理.md', format: 'markdown', size_bytes: 44000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-5: 网络
  { id: 'doc-kudig-011', collection_id: 'col-kudig-d05', title: 'CNI 插件对比与选型.md', format: 'markdown', size_bytes: 56000, chunk_count: 11, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-012', collection_id: 'col-kudig-d05', title: 'Service 与 Ingress 深度解析.md', format: 'markdown', size_bytes: 48000, chunk_count: 9, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-013', collection_id: 'col-kudig-d05', title: 'NetworkPolicy 网络策略实战.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-6: 存储
  { id: 'doc-kudig-014', collection_id: 'col-kudig-d06', title: 'PV/PVC 持久化存储详解.md', format: 'markdown', size_bytes: 40000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-015', collection_id: 'col-kudig-d06', title: 'CSI 驱动开发与集成.md', format: 'markdown', size_bytes: 36000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-7: 安全
  { id: 'doc-kudig-016', collection_id: 'col-kudig-d07', title: 'RBAC 权限模型详解.md', format: 'markdown', size_bytes: 35000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-017', collection_id: 'col-kudig-d07', title: 'Pod Security Admission 实践.md', format: 'markdown', size_bytes: 33000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-8: 可观测性
  { id: 'doc-kudig-018', collection_id: 'col-kudig-d08', title: 'Prometheus 监控体系搭建.md', format: 'markdown', size_bytes: 62000, chunk_count: 12, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-019', collection_id: 'col-kudig-d08', title: 'OpenTelemetry 全链路追踪.md', format: 'markdown', size_bytes: 45000, chunk_count: 9, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-9: 平台运维
  { id: 'doc-kudig-020', collection_id: 'col-kudig-d09', title: '集群升级滚动策略.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-021', collection_id: 'col-kudig-d09', title: 'etcd 备份与恢复.md', format: 'markdown', size_bytes: 30000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-10: 扩展机制
  { id: 'doc-kudig-022', collection_id: 'col-kudig-d10', title: 'CRD 与 Operator 开发指南.md', format: 'markdown', size_bytes: 55000, chunk_count: 10, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-023', collection_id: 'col-kudig-d10', title: 'Webhook 准入控制器.md', format: 'markdown', size_bytes: 32000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-11: AI 基础设施
  { id: 'doc-kudig-024', collection_id: 'col-kudig-d11', title: 'GPU 调度与 AI 训练平台.md', format: 'markdown', size_bytes: 58000, chunk_count: 11, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-025', collection_id: 'col-kudig-d11', title: 'KubeRay 推理服务部署.md', format: 'markdown', size_bytes: 42000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-12: 故障排查
  { id: 'doc-kudig-026', collection_id: 'col-kudig-d12', title: 'Pod CrashLoopBackOff 排查.md', format: 'markdown', size_bytes: 32000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-027', collection_id: 'col-kudig-d12', title: '节点 NotReady 故障诊断.md', format: 'markdown', size_bytes: 39000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-028', collection_id: 'col-kudig-d12', title: 'OOM Killed 根因分析.md', format: 'markdown', size_bytes: 28000, chunk_count: 5, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-13: Docker 容器
  { id: 'doc-kudig-029', collection_id: 'col-kudig-d13', title: 'Docker 镜像构建最佳实践.md', format: 'markdown', size_bytes: 34000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-030', collection_id: 'col-kudig-d13', title: 'containerd 与 CRI-O 运行时.md', format: 'markdown', size_bytes: 40000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-14: Linux 基础
  { id: 'doc-kudig-031', collection_id: 'col-kudig-d14', title: 'Linux Namespace 与 Cgroup.md', format: 'markdown', size_bytes: 46000, chunk_count: 9, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-032', collection_id: 'col-kudig-d14', title: '内核参数调优指南.md', format: 'markdown', size_bytes: 30000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-15: 网络基础
  { id: 'doc-kudig-033', collection_id: 'col-kudig-d15', title: 'iptables 与 nftables 详解.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-034', collection_id: 'col-kudig-d15', title: 'VXLAN 隧道与 BGP 路由.md', format: 'markdown', size_bytes: 35000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-16: 存储基础
  { id: 'doc-kudig-035', collection_id: 'col-kudig-d16', title: '分布式存储原理.md', format: 'markdown', size_bytes: 42000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-036', collection_id: 'col-kudig-d16', title: 'Ceph 与 Rook 存储方案.md', format: 'markdown', size_bytes: 37000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-17: 云服务商
  { id: 'doc-kudig-037', collection_id: 'col-kudig-d17', title: 'ACK vs EKS vs GKE 对比.md', format: 'markdown', size_bytes: 50000, chunk_count: 10, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-038', collection_id: 'col-kudig-d17', title: '托管 K8s 服务选型指南.md', format: 'markdown', size_bytes: 36000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-18: 生产运维
  { id: 'doc-kudig-039', collection_id: 'col-kudig-d18', title: '生产集群 Day-2 运维手册.md', format: 'markdown', size_bytes: 55000, chunk_count: 10, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-040', collection_id: 'col-kudig-d18', title: 'SLA 保障与故障演练.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-19: 技术论文
  { id: 'doc-kudig-041', collection_id: 'col-kudig-d19', title: 'Borg 论文解读.md', format: 'markdown', size_bytes: 48000, chunk_count: 9, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-042', collection_id: 'col-kudig-d19', title: 'Omega 调度器设计.md', format: 'markdown', size_bytes: 40000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-20: 监控告警
  { id: 'doc-kudig-043', collection_id: 'col-kudig-d20', title: 'AlertManager 告警策略配置.md', format: 'markdown', size_bytes: 36000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-044', collection_id: 'col-kudig-d20', title: '自定义 Metrics 与 PromQL.md', format: 'markdown', size_bytes: 42000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-21: 日志管理
  { id: 'doc-kudig-045', collection_id: 'col-kudig-d21', title: 'EFK 日志栈部署.md', format: 'markdown', size_bytes: 44000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-046', collection_id: 'col-kudig-d21', title: 'Loki + Grafana 日志方案.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-22: 安全运维
  { id: 'doc-kudig-047', collection_id: 'col-kudig-d22', title: '供应链安全与镜像签名.md', format: 'markdown', size_bytes: 36000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-048', collection_id: 'col-kudig-d22', title: 'Falco 运行时安全监控.md', format: 'markdown', size_bytes: 32000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-23: 灾备恢复
  { id: 'doc-kudig-049', collection_id: 'col-kudig-d23', title: 'Velero 备份恢复指南.md', format: 'markdown', size_bytes: 40000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-050', collection_id: 'col-kudig-d23', title: '跨区域灾备与故障切换.md', format: 'markdown', size_bytes: 35000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-24: 容量规划
  { id: 'doc-kudig-051', collection_id: 'col-kudig-d24', title: 'VPA/HPA 自动伸缩策略.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-052', collection_id: 'col-kudig-d24', title: '集群容量评估方法论.md', format: 'markdown', size_bytes: 30000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-25: 成本优化
  { id: 'doc-kudig-053', collection_id: 'col-kudig-d25', title: 'FinOps 云成本治理.md', format: 'markdown', size_bytes: 34000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-054', collection_id: 'col-kudig-d25', title: 'Spot 实例与资源优化.md', format: 'markdown', size_bytes: 28000, chunk_count: 5, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-26: SRE 实践
  { id: 'doc-kudig-055', collection_id: 'col-kudig-d26', title: 'SLI/SLO/SLA 定义与度量.md', format: 'markdown', size_bytes: 42000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-056', collection_id: 'col-kudig-d26', title: '错误预算与 On-Call 实践.md', format: 'markdown', size_bytes: 36000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-27: 混沌工程
  { id: 'doc-kudig-057', collection_id: 'col-kudig-d27', title: 'Chaos Mesh 故障注入.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-058', collection_id: 'col-kudig-d27', title: '韧性验证与 GameDay 演练.md', format: 'markdown', size_bytes: 30000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-28: 服务网格
  { id: 'doc-kudig-059', collection_id: 'col-kudig-d28', title: 'Istio 服务网格全解.md', format: 'markdown', size_bytes: 56000, chunk_count: 11, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-060', collection_id: 'col-kudig-d28', title: 'Envoy 数据面与 mTLS.md', format: 'markdown', size_bytes: 40000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-29: GitOps
  { id: 'doc-kudig-061', collection_id: 'col-kudig-d29', title: 'ArgoCD 声明式交付.md', format: 'markdown', size_bytes: 44000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-062', collection_id: 'col-kudig-d29', title: 'FluxCD 持续部署实践.md', format: 'markdown', size_bytes: 36000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-30: 多集群管理
  { id: 'doc-kudig-063', collection_id: 'col-kudig-d30', title: '联邦集群与多集群调度.md', format: 'markdown', size_bytes: 42000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-064', collection_id: 'col-kudig-d30', title: 'Submariner 跨集群网络.md', format: 'markdown', size_bytes: 34000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-31: 硬件基础
  { id: 'doc-kudig-065', collection_id: 'col-kudig-d31', title: 'CPU/内存硬件知识.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-066', collection_id: 'col-kudig-d31', title: '网卡与磁盘性能调优.md', format: 'markdown', size_bytes: 32000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-32: YAML 清单
  { id: 'doc-kudig-067', collection_id: 'col-kudig-d32', title: 'Deployment YAML 模板大全.md', format: 'markdown', size_bytes: 50000, chunk_count: 10, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-068', collection_id: 'col-kudig-d32', title: 'Service/Ingress YAML 示例.md', format: 'markdown', size_bytes: 45000, chunk_count: 9, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-33: K8s 事件
  { id: 'doc-kudig-069', collection_id: 'col-kudig-d33', title: 'K8s Event 类型与含义.md', format: 'markdown', size_bytes: 42000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-070', collection_id: 'col-kudig-d33', title: '事件驱动运维与告警关联.md', format: 'markdown', size_bytes: 36000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-071', collection_id: 'col-kudig-d33', title: 'Warning Event 排查手册.md', format: 'markdown', size_bytes: 30000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-34: CNCF 全景
  { id: 'doc-kudig-072', collection_id: 'col-kudig-d34', title: 'Prometheus 项目全解.md', format: 'markdown', size_bytes: 28000, chunk_count: 5, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-073', collection_id: 'col-kudig-d34', title: 'Envoy 项目全解.md', format: 'markdown', size_bytes: 31000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-074', collection_id: 'col-kudig-d34', title: 'Helm 项目全解.md', format: 'markdown', size_bytes: 26000, chunk_count: 5, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-075', collection_id: 'col-kudig-d34', title: 'Cilium 项目全解.md', format: 'markdown', size_bytes: 32000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-35: eBPF
  { id: 'doc-kudig-076', collection_id: 'col-kudig-d35', title: 'eBPF 原理与 Cilium 实践.md', format: 'markdown', size_bytes: 47000, chunk_count: 9, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-077', collection_id: 'col-kudig-d35', title: 'eBPF 网络可观测性.md', format: 'markdown', size_bytes: 35000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-36: 平台工程
  { id: 'doc-kudig-078', collection_id: 'col-kudig-d36', title: 'Backstage 内部开发者门户.md', format: 'markdown', size_bytes: 40000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-079', collection_id: 'col-kudig-d36', title: '平台工程成熟度模型.md', format: 'markdown', size_bytes: 34000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-37: 边缘计算
  { id: 'doc-kudig-080', collection_id: 'col-kudig-d37', title: 'KubeEdge 边缘节点管理.md', format: 'markdown', size_bytes: 38000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-081', collection_id: 'col-kudig-d37', title: 'OpenYurt 边云协同架构.md', format: 'markdown', size_bytes: 36000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-38: WebAssembly
  { id: 'doc-kudig-082', collection_id: 'col-kudig-d38', title: 'WasmEdge 运行时入门.md', format: 'markdown', size_bytes: 30000, chunk_count: 6, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-083', collection_id: 'col-kudig-d38', title: 'Spin 框架与 Wasm on K8s.md', format: 'markdown', size_bytes: 28000, chunk_count: 5, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-39: API 网关
  { id: 'doc-kudig-084', collection_id: 'col-kudig-d39', title: 'Gateway API 规范解读.md', format: 'markdown', size_bytes: 40000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-085', collection_id: 'col-kudig-d39', title: 'APISIX 与 Higress 对比.md', format: 'markdown', size_bytes: 35000, chunk_count: 7, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  // domain-40: AIOps
  { id: 'doc-kudig-086', collection_id: 'col-kudig-d40', title: 'AIOps 平台建设指南.md', format: 'markdown', size_bytes: 52000, chunk_count: 10, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
  { id: 'doc-kudig-087', collection_id: 'col-kudig-d40', title: '智能告警与异常检测.md', format: 'markdown', size_bytes: 44000, chunk_count: 8, status: 'indexed', uploaded_at: '2026-08-15T10:00:00Z', updated_at: '2026-08-15T10:00:00Z' },
];

export const RAG_CORPORA = {
  k8s: { collection_id: 'corpus-ops-k8s', collection_name: 'K8s 运维知识库', relevance_score: 0.92, matched_keywords: ['节点', 'NotReady', '调度'], document_count: 218 },
  rds: { collection_id: 'corpus-ops-rds', collection_name: 'RDS 运维手册', relevance_score: 0.94, matched_keywords: ['主从同步', 'binlog', '延迟'], document_count: 156 },
  ack: { collection_id: 'corpus-ops-ack', collection_name: 'ACK 最佳实践', relevance_score: 0.9, matched_keywords: ['Ingress', 'HTTPS', 'SLB'], document_count: 173 },
  ecs: { collection_id: 'corpus-ops-ecs', collection_name: 'ECS 运维手册', relevance_score: 0.88, matched_keywords: ['磁盘', '扩容', 'growpart'], document_count: 132 },
  fta: { collection_id: 'corpus-fta-trees', collection_name: 'FTA 故障树语料', relevance_score: 0.81, matched_keywords: ['根因', '故障树'], document_count: 47 },
} satisfies Record<string, CorpusMatch>;

export const pickRagCorpora = (input: string): CorpusMatch[] => {
  if (/RDS|主从|同步延迟|MySQL/.test(input)) return [RAG_CORPORA.rds, RAG_CORPORA.fta];
  if (/Ingress|HTTPS|证书/.test(input)) return [RAG_CORPORA.ack, RAG_CORPORA.k8s];
  if (/ECS|磁盘|扩容/.test(input)) return [RAG_CORPORA.ecs, RAG_CORPORA.k8s];
  return [RAG_CORPORA.k8s, RAG_CORPORA.fta];
};
