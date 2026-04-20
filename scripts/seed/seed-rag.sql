-- =============================================================================
-- ResolveAgent - Seed: RAG Documents
-- =============================================================================
-- 87 RAG documents across 45 collections (5 ops-kb + 40 kudig domain)
-- Matches web/src/api/mock.ts mockDocuments data
-- Note: Collections are implicit via collection_id (no separate table in Go schema)
-- =============================================================================

-- ── col-ops-kb-001: 阿里云产品运维手册 ──
INSERT INTO rag_documents (id, collection_id, title, content_type, chunk_count, status, size_bytes, metadata, created_at, updated_at)
VALUES
    ('doc-001', 'col-ops-kb-001', 'ACK 集群升级操作手册.pdf', 'pdf', 48, 'indexed', 2456000,
     '{"collection_name":"阿里云产品运维手册","format":"pdf","embedding_model":"text-embedding-v2"}'::jsonb,
     '2026-02-01T08:00:00Z', '2026-03-15T10:00:00Z'),
    ('doc-002', 'col-ops-kb-001', 'ECS 实例故障排查 SOP.md', 'markdown', 23, 'indexed', 156000,
     '{"collection_name":"阿里云产品运维手册","format":"markdown","embedding_model":"text-embedding-v2"}'::jsonb,
     '2026-02-05T14:00:00Z', '2026-03-20T09:00:00Z'),
    ('doc-003', 'col-ops-kb-001', 'RDS 备份恢复最佳实践.pdf', 'pdf', 35, 'indexed', 1890000,
     '{"collection_name":"阿里云产品运维手册","format":"pdf","embedding_model":"text-embedding-v2"}'::jsonb,
     '2026-02-10T11:00:00Z', '2026-03-10T15:00:00Z'),
    ('doc-004', 'col-ops-kb-001', 'SLB 配置指南.md', 'markdown', 15, 'indexed', 98000,
     '{"collection_name":"阿里云产品运维手册","format":"markdown","embedding_model":"text-embedding-v2"}'::jsonb,
     '2026-02-12T09:00:00Z', '2026-02-12T09:00:00Z'),
    ('doc-015', 'col-ops-kb-001', 'OSS 跨区域复制配置.txt', 'txt', 5, 'processing', 23000,
     '{"collection_name":"阿里云产品运维手册","format":"txt","embedding_model":"text-embedding-v2"}'::jsonb,
     '2026-04-08T09:30:00Z', '2026-04-08T09:30:00Z')
ON CONFLICT (id) DO UPDATE SET
    collection_id = EXCLUDED.collection_id, title = EXCLUDED.title, content_type = EXCLUDED.content_type,
    chunk_count = EXCLUDED.chunk_count, status = EXCLUDED.status, size_bytes = EXCLUDED.size_bytes,
    metadata = EXCLUDED.metadata, updated_at = EXCLUDED.updated_at;

-- ── col-ops-kb-002: 历史故障复盘 ──
INSERT INTO rag_documents (id, collection_id, title, content_type, chunk_count, status, size_bytes, metadata, created_at, updated_at)
VALUES
    ('doc-005', 'col-ops-kb-002', 'INC-2024-0673 RDS 主从同步复盘.md', 'markdown', 12, 'indexed', 67000,
     '{"collection_name":"历史故障复盘文档","format":"markdown","embedding_model":"text-embedding-v2"}'::jsonb,
     '2026-02-20T16:00:00Z', '2026-02-20T16:00:00Z'),
    ('doc-006', 'col-ops-kb-002', 'INC-2024-0521 K8s 集群网络风暴.pdf', 'pdf', 28, 'indexed', 1234000,
     '{"collection_name":"历史故障复盘文档","format":"pdf","embedding_model":"text-embedding-v2"}'::jsonb,
     '2026-02-22T10:00:00Z', '2026-02-22T10:00:00Z'),
    ('doc-007', 'col-ops-kb-002', 'INC-2024-0445 DNS 解析异常.md', 'markdown', 8, 'indexed', 45000,
     '{"collection_name":"历史故障复盘文档","format":"markdown","embedding_model":"text-embedding-v2"}'::jsonb,
     '2026-02-25T14:00:00Z', '2026-02-25T14:00:00Z')
ON CONFLICT (id) DO UPDATE SET
    collection_id = EXCLUDED.collection_id, title = EXCLUDED.title, content_type = EXCLUDED.content_type,
    chunk_count = EXCLUDED.chunk_count, status = EXCLUDED.status, size_bytes = EXCLUDED.size_bytes,
    metadata = EXCLUDED.metadata, updated_at = EXCLUDED.updated_at;

-- ── col-ops-kb-003: K8s 最佳实践 ──
INSERT INTO rag_documents (id, collection_id, title, content_type, chunk_count, status, size_bytes, metadata, created_at, updated_at)
VALUES
    ('doc-008', 'col-ops-kb-003', 'K8s Pod 调度策略.md', 'markdown', 16, 'indexed', 89000,
     '{"collection_name":"K8s 最佳实践","format":"markdown","embedding_model":"text-embedding-v2"}'::jsonb,
     '2026-03-01T08:00:00Z', '2026-03-01T08:00:00Z'),
    ('doc-009', 'col-ops-kb-003', 'Helm Chart 最佳实践.md', 'markdown', 14, 'indexed', 72000,
     '{"collection_name":"K8s 最佳实践","format":"markdown","embedding_model":"text-embedding-v2"}'::jsonb,
     '2026-03-05T10:00:00Z', '2026-03-05T10:00:00Z'),
    ('doc-010', 'col-ops-kb-003', '容器镜像安全扫描.pdf', 'pdf', 20, 'indexed', 980000,
     '{"collection_name":"K8s 最佳实践","format":"pdf","embedding_model":"text-embedding-v2"}'::jsonb,
     '2026-03-08T14:00:00Z', '2026-03-08T14:00:00Z')
ON CONFLICT (id) DO UPDATE SET
    collection_id = EXCLUDED.collection_id, title = EXCLUDED.title, content_type = EXCLUDED.content_type,
    chunk_count = EXCLUDED.chunk_count, status = EXCLUDED.status, size_bytes = EXCLUDED.size_bytes,
    metadata = EXCLUDED.metadata, updated_at = EXCLUDED.updated_at;

-- ── col-ops-kb-004: 内部运维 SOP ──
INSERT INTO rag_documents (id, collection_id, title, content_type, chunk_count, status, size_bytes, metadata, created_at, updated_at)
VALUES
    ('doc-011', 'col-ops-kb-004', '变更管理 SOP v2.1.pdf', 'pdf', 30, 'indexed', 1560000,
     '{"collection_name":"内部运维 SOP 流程","format":"pdf","embedding_model":"text-embedding-v2"}'::jsonb,
     '2026-03-10T09:00:00Z', '2026-04-01T11:00:00Z'),
    ('doc-012', 'col-ops-kb-004', '应急响应流程.md', 'markdown', 18, 'indexed', 112000,
     '{"collection_name":"内部运维 SOP 流程","format":"markdown","embedding_model":"text-embedding-v2"}'::jsonb,
     '2026-03-12T16:00:00Z', '2026-03-12T16:00:00Z')
ON CONFLICT (id) DO UPDATE SET
    collection_id = EXCLUDED.collection_id, title = EXCLUDED.title, content_type = EXCLUDED.content_type,
    chunk_count = EXCLUDED.chunk_count, status = EXCLUDED.status, size_bytes = EXCLUDED.size_bytes,
    metadata = EXCLUDED.metadata, updated_at = EXCLUDED.updated_at;

-- ── col-ops-kb-005: 安全基线 ──
INSERT INTO rag_documents (id, collection_id, title, content_type, chunk_count, status, size_bytes, metadata, created_at, updated_at)
VALUES
    ('doc-013', 'col-ops-kb-005', 'CIS Benchmark K8s 1.28.pdf', 'pdf', 65, 'indexed', 3200000,
     '{"collection_name":"安全基线与合规指南","format":"pdf","embedding_model":"text-embedding-v2"}'::jsonb,
     '2026-03-15T08:00:00Z', '2026-03-15T08:00:00Z'),
    ('doc-014', 'col-ops-kb-005', '等保 2.0 合规检查清单.pdf', 'pdf', 42, 'indexed', 2100000,
     '{"collection_name":"安全基线与合规指南","format":"pdf","embedding_model":"text-embedding-v2"}'::jsonb,
     '2026-03-18T10:00:00Z', '2026-03-18T10:00:00Z')
ON CONFLICT (id) DO UPDATE SET
    collection_id = EXCLUDED.collection_id, title = EXCLUDED.title, content_type = EXCLUDED.content_type,
    chunk_count = EXCLUDED.chunk_count, status = EXCLUDED.status, size_bytes = EXCLUDED.size_bytes,
    metadata = EXCLUDED.metadata, updated_at = EXCLUDED.updated_at;

-- ══════════════════════════════════════════════════════════════════════════════
-- kudig domain documents (doc-kudig-001 ~ doc-kudig-087)
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO rag_documents (id, collection_id, title, content_type, chunk_count, status, size_bytes, metadata, created_at, updated_at)
VALUES
    -- domain-1: K8s 架构概览
    ('doc-kudig-001', 'col-kudig-d01', 'Kubernetes 架构全景图.md', 'markdown', 8, 'indexed', 45000, '{"collection_name":"kudig: K8s 架构概览","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-002', 'col-kudig-d01', 'K8s 核心组件交互流程.md', 'markdown', 7, 'indexed', 38000, '{"collection_name":"kudig: K8s 架构概览","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-003', 'col-kudig-d01', '集群拓扑与高可用部署.md', 'markdown', 8, 'indexed', 42000, '{"collection_name":"kudig: K8s 架构概览","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-2: K8s 设计原则
    ('doc-kudig-004', 'col-kudig-d02', '声明式 API 设计哲学.md', 'markdown', 6, 'indexed', 32000, '{"collection_name":"kudig: K8s 设计原则","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-005', 'col-kudig-d02', '控制器模式与终态驱动.md', 'markdown', 7, 'indexed', 36000, '{"collection_name":"kudig: K8s 设计原则","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-3: 控制平面
    ('doc-kudig-006', 'col-kudig-d03', '控制平面架构总览.md', 'markdown', 10, 'indexed', 52000, '{"collection_name":"kudig: 控制平面","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-007', 'col-kudig-d03', 'etcd 集群运维指南.md', 'markdown', 8, 'indexed', 41000, '{"collection_name":"kudig: 控制平面","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-008', 'col-kudig-d03', 'API Server 深度解析.md', 'markdown', 9, 'indexed', 48000, '{"collection_name":"kudig: 控制平面","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-4: 工作负载管理
    ('doc-kudig-009', 'col-kudig-d04', 'Deployment 滚动更新策略.md', 'markdown', 7, 'indexed', 35000, '{"collection_name":"kudig: 工作负载管理","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-010', 'col-kudig-d04', 'StatefulSet 有状态应用管理.md', 'markdown', 8, 'indexed', 44000, '{"collection_name":"kudig: 工作负载管理","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-5: 网络
    ('doc-kudig-011', 'col-kudig-d05', 'CNI 插件对比与选型.md', 'markdown', 11, 'indexed', 56000, '{"collection_name":"kudig: 网络","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-012', 'col-kudig-d05', 'Service 与 Ingress 深度解析.md', 'markdown', 9, 'indexed', 48000, '{"collection_name":"kudig: 网络","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-013', 'col-kudig-d05', 'NetworkPolicy 网络策略实战.md', 'markdown', 7, 'indexed', 38000, '{"collection_name":"kudig: 网络","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-6: 存储
    ('doc-kudig-014', 'col-kudig-d06', 'PV/PVC 持久化存储详解.md', 'markdown', 8, 'indexed', 40000, '{"collection_name":"kudig: 存储","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-015', 'col-kudig-d06', 'CSI 驱动开发与集成.md', 'markdown', 7, 'indexed', 36000, '{"collection_name":"kudig: 存储","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-7: 安全
    ('doc-kudig-016', 'col-kudig-d07', 'RBAC 权限模型详解.md', 'markdown', 7, 'indexed', 35000, '{"collection_name":"kudig: 安全","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-017', 'col-kudig-d07', 'Pod Security Admission 实践.md', 'markdown', 6, 'indexed', 33000, '{"collection_name":"kudig: 安全","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-8: 可观测性
    ('doc-kudig-018', 'col-kudig-d08', 'Prometheus 监控体系搭建.md', 'markdown', 12, 'indexed', 62000, '{"collection_name":"kudig: 可观测性","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-019', 'col-kudig-d08', 'OpenTelemetry 全链路追踪.md', 'markdown', 9, 'indexed', 45000, '{"collection_name":"kudig: 可观测性","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-9: 平台运维
    ('doc-kudig-020', 'col-kudig-d09', '集群升级滚动策略.md', 'markdown', 7, 'indexed', 38000, '{"collection_name":"kudig: 平台运维","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-021', 'col-kudig-d09', 'etcd 备份与恢复.md', 'markdown', 6, 'indexed', 30000, '{"collection_name":"kudig: 平台运维","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-10: 扩展机制
    ('doc-kudig-022', 'col-kudig-d10', 'CRD 与 Operator 开发指南.md', 'markdown', 10, 'indexed', 55000, '{"collection_name":"kudig: 扩展机制","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-023', 'col-kudig-d10', 'Webhook 准入控制器.md', 'markdown', 6, 'indexed', 32000, '{"collection_name":"kudig: 扩展机制","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-11: AI 基础设施
    ('doc-kudig-024', 'col-kudig-d11', 'GPU 调度与 AI 训练平台.md', 'markdown', 11, 'indexed', 58000, '{"collection_name":"kudig: AI 基础设施","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-025', 'col-kudig-d11', 'KubeRay 推理服务部署.md', 'markdown', 8, 'indexed', 42000, '{"collection_name":"kudig: AI 基础设施","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-12: 故障排查
    ('doc-kudig-026', 'col-kudig-d12', 'Pod CrashLoopBackOff 排查.md', 'markdown', 6, 'indexed', 32000, '{"collection_name":"kudig: 故障排查","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-027', 'col-kudig-d12', '节点 NotReady 故障诊断.md', 'markdown', 7, 'indexed', 39000, '{"collection_name":"kudig: 故障排查","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-028', 'col-kudig-d12', 'OOM Killed 根因分析.md', 'markdown', 5, 'indexed', 28000, '{"collection_name":"kudig: 故障排查","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-13: Docker 容器
    ('doc-kudig-029', 'col-kudig-d13', 'Docker 镜像构建最佳实践.md', 'markdown', 6, 'indexed', 34000, '{"collection_name":"kudig: Docker 容器","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-030', 'col-kudig-d13', 'containerd 与 CRI-O 运行时.md', 'markdown', 7, 'indexed', 40000, '{"collection_name":"kudig: Docker 容器","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-14: Linux 基础
    ('doc-kudig-031', 'col-kudig-d14', 'Linux Namespace 与 Cgroup.md', 'markdown', 9, 'indexed', 46000, '{"collection_name":"kudig: Linux 基础","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-032', 'col-kudig-d14', '内核参数调优指南.md', 'markdown', 6, 'indexed', 30000, '{"collection_name":"kudig: Linux 基础","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-15: 网络基础
    ('doc-kudig-033', 'col-kudig-d15', 'iptables 与 nftables 详解.md', 'markdown', 7, 'indexed', 38000, '{"collection_name":"kudig: 网络基础","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-034', 'col-kudig-d15', 'VXLAN 隧道与 BGP 路由.md', 'markdown', 6, 'indexed', 35000, '{"collection_name":"kudig: 网络基础","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-16: 存储基础
    ('doc-kudig-035', 'col-kudig-d16', '分布式存储原理.md', 'markdown', 8, 'indexed', 42000, '{"collection_name":"kudig: 存储基础","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-036', 'col-kudig-d16', 'Ceph 与 Rook 存储方案.md', 'markdown', 7, 'indexed', 37000, '{"collection_name":"kudig: 存储基础","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-17: 云服务商
    ('doc-kudig-037', 'col-kudig-d17', 'ACK vs EKS vs GKE 对比.md', 'markdown', 10, 'indexed', 50000, '{"collection_name":"kudig: 云服务商","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-038', 'col-kudig-d17', '托管 K8s 服务选型指南.md', 'markdown', 7, 'indexed', 36000, '{"collection_name":"kudig: 云服务商","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-18: 生产运维
    ('doc-kudig-039', 'col-kudig-d18', '生产集群 Day-2 运维手册.md', 'markdown', 10, 'indexed', 55000, '{"collection_name":"kudig: 生产运维","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-040', 'col-kudig-d18', 'SLA 保障与故障演练.md', 'markdown', 7, 'indexed', 38000, '{"collection_name":"kudig: 生产运维","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-19: 技术论文
    ('doc-kudig-041', 'col-kudig-d19', 'Borg 论文解读.md', 'markdown', 9, 'indexed', 48000, '{"collection_name":"kudig: 技术论文","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-042', 'col-kudig-d19', 'Omega 调度器设计.md', 'markdown', 8, 'indexed', 40000, '{"collection_name":"kudig: 技术论文","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-20: 监控告警
    ('doc-kudig-043', 'col-kudig-d20', 'AlertManager 告警策略配置.md', 'markdown', 7, 'indexed', 36000, '{"collection_name":"kudig: 监控告警","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-044', 'col-kudig-d20', '自定义 Metrics 与 PromQL.md', 'markdown', 8, 'indexed', 42000, '{"collection_name":"kudig: 监控告警","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-21: 日志管理
    ('doc-kudig-045', 'col-kudig-d21', 'EFK 日志栈部署.md', 'markdown', 8, 'indexed', 44000, '{"collection_name":"kudig: 日志管理","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-046', 'col-kudig-d21', 'Loki + Grafana 日志方案.md', 'markdown', 7, 'indexed', 38000, '{"collection_name":"kudig: 日志管理","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-22: 安全运维
    ('doc-kudig-047', 'col-kudig-d22', '供应链安全与镜像签名.md', 'markdown', 7, 'indexed', 36000, '{"collection_name":"kudig: 安全运维","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-048', 'col-kudig-d22', 'Falco 运行时安全监控.md', 'markdown', 6, 'indexed', 32000, '{"collection_name":"kudig: 安全运维","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-23: 灾备恢复
    ('doc-kudig-049', 'col-kudig-d23', 'Velero 备份恢复指南.md', 'markdown', 8, 'indexed', 40000, '{"collection_name":"kudig: 灾备恢复","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-050', 'col-kudig-d23', '跨区域灾备与故障切换.md', 'markdown', 7, 'indexed', 35000, '{"collection_name":"kudig: 灾备恢复","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-24: 容量规划
    ('doc-kudig-051', 'col-kudig-d24', 'VPA/HPA 自动伸缩策略.md', 'markdown', 7, 'indexed', 38000, '{"collection_name":"kudig: 容量规划","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-052', 'col-kudig-d24', '集群容量评估方法论.md', 'markdown', 6, 'indexed', 30000, '{"collection_name":"kudig: 容量规划","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-25: 成本优化
    ('doc-kudig-053', 'col-kudig-d25', 'FinOps 云成本治理.md', 'markdown', 6, 'indexed', 34000, '{"collection_name":"kudig: 成本优化","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-054', 'col-kudig-d25', 'Spot 实例与资源优化.md', 'markdown', 5, 'indexed', 28000, '{"collection_name":"kudig: 成本优化","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-26: SRE 实践
    ('doc-kudig-055', 'col-kudig-d26', 'SLI/SLO/SLA 定义与度量.md', 'markdown', 8, 'indexed', 42000, '{"collection_name":"kudig: SRE 实践","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-056', 'col-kudig-d26', '错误预算与 On-Call 实践.md', 'markdown', 7, 'indexed', 36000, '{"collection_name":"kudig: SRE 实践","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-27: 混沌工程
    ('doc-kudig-057', 'col-kudig-d27', 'Chaos Mesh 故障注入.md', 'markdown', 7, 'indexed', 38000, '{"collection_name":"kudig: 混沌工程","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-058', 'col-kudig-d27', '韧性验证与 GameDay 演练.md', 'markdown', 6, 'indexed', 30000, '{"collection_name":"kudig: 混沌工程","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-28: 服务网格
    ('doc-kudig-059', 'col-kudig-d28', 'Istio 服务网格全解.md', 'markdown', 11, 'indexed', 56000, '{"collection_name":"kudig: 服务网格","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-060', 'col-kudig-d28', 'Envoy 数据面与 mTLS.md', 'markdown', 8, 'indexed', 40000, '{"collection_name":"kudig: 服务网格","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-29: GitOps
    ('doc-kudig-061', 'col-kudig-d29', 'ArgoCD 声明式交付.md', 'markdown', 8, 'indexed', 44000, '{"collection_name":"kudig: GitOps","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-062', 'col-kudig-d29', 'FluxCD 持续部署实践.md', 'markdown', 7, 'indexed', 36000, '{"collection_name":"kudig: GitOps","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-30: 多集群管理
    ('doc-kudig-063', 'col-kudig-d30', '联邦集群与多集群调度.md', 'markdown', 8, 'indexed', 42000, '{"collection_name":"kudig: 多集群管理","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-064', 'col-kudig-d30', 'Submariner 跨集群网络.md', 'markdown', 6, 'indexed', 34000, '{"collection_name":"kudig: 多集群管理","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-31: 硬件基础
    ('doc-kudig-065', 'col-kudig-d31', 'CPU/内存硬件知识.md', 'markdown', 7, 'indexed', 38000, '{"collection_name":"kudig: 硬件基础","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-066', 'col-kudig-d31', '网卡与磁盘性能调优.md', 'markdown', 6, 'indexed', 32000, '{"collection_name":"kudig: 硬件基础","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-32: YAML 清单
    ('doc-kudig-067', 'col-kudig-d32', 'Deployment YAML 模板大全.md', 'markdown', 10, 'indexed', 50000, '{"collection_name":"kudig: YAML 清单","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-068', 'col-kudig-d32', 'Service/Ingress YAML 示例.md', 'markdown', 9, 'indexed', 45000, '{"collection_name":"kudig: YAML 清单","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-33: K8s 事件
    ('doc-kudig-069', 'col-kudig-d33', 'K8s Event 类型与含义.md', 'markdown', 8, 'indexed', 42000, '{"collection_name":"kudig: K8s 事件","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-070', 'col-kudig-d33', '事件驱动运维与告警关联.md', 'markdown', 7, 'indexed', 36000, '{"collection_name":"kudig: K8s 事件","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-071', 'col-kudig-d33', 'Warning Event 排查手册.md', 'markdown', 6, 'indexed', 30000, '{"collection_name":"kudig: K8s 事件","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-34: CNCF 全景
    ('doc-kudig-072', 'col-kudig-d34', 'Prometheus 项目全解.md', 'markdown', 5, 'indexed', 28000, '{"collection_name":"kudig: CNCF 全景","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-073', 'col-kudig-d34', 'Envoy 项目全解.md', 'markdown', 6, 'indexed', 31000, '{"collection_name":"kudig: CNCF 全景","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-074', 'col-kudig-d34', 'Helm 项目全解.md', 'markdown', 5, 'indexed', 26000, '{"collection_name":"kudig: CNCF 全景","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-075', 'col-kudig-d34', 'Cilium 项目全解.md', 'markdown', 6, 'indexed', 32000, '{"collection_name":"kudig: CNCF 全景","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-35: eBPF
    ('doc-kudig-076', 'col-kudig-d35', 'eBPF 原理与 Cilium 实践.md', 'markdown', 9, 'indexed', 47000, '{"collection_name":"kudig: eBPF","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-077', 'col-kudig-d35', 'eBPF 网络可观测性.md', 'markdown', 7, 'indexed', 35000, '{"collection_name":"kudig: eBPF","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-36: 平台工程
    ('doc-kudig-078', 'col-kudig-d36', 'Backstage 内部开发者门户.md', 'markdown', 8, 'indexed', 40000, '{"collection_name":"kudig: 平台工程","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-079', 'col-kudig-d36', '平台工程成熟度模型.md', 'markdown', 6, 'indexed', 34000, '{"collection_name":"kudig: 平台工程","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-37: 边缘计算
    ('doc-kudig-080', 'col-kudig-d37', 'KubeEdge 边缘节点管理.md', 'markdown', 7, 'indexed', 38000, '{"collection_name":"kudig: 边缘计算","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-081', 'col-kudig-d37', 'OpenYurt 边云协同架构.md', 'markdown', 7, 'indexed', 36000, '{"collection_name":"kudig: 边缘计算","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-38: WebAssembly
    ('doc-kudig-082', 'col-kudig-d38', 'WasmEdge 运行时入门.md', 'markdown', 6, 'indexed', 30000, '{"collection_name":"kudig: WebAssembly","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-083', 'col-kudig-d38', 'Spin 框架与 Wasm on K8s.md', 'markdown', 5, 'indexed', 28000, '{"collection_name":"kudig: WebAssembly","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-39: API 网关
    ('doc-kudig-084', 'col-kudig-d39', 'Gateway API 规范解读.md', 'markdown', 8, 'indexed', 40000, '{"collection_name":"kudig: API 网关","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-085', 'col-kudig-d39', 'APISIX 与 Higress 对比.md', 'markdown', 7, 'indexed', 35000, '{"collection_name":"kudig: API 网关","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    -- domain-40: AIOps
    ('doc-kudig-086', 'col-kudig-d40', 'AIOps 平台建设指南.md', 'markdown', 10, 'indexed', 52000, '{"collection_name":"kudig: AIOps","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z'),
    ('doc-kudig-087', 'col-kudig-d40', '智能告警与异常检测.md', 'markdown', 8, 'indexed', 44000, '{"collection_name":"kudig: AIOps","embedding_model":"bge-large-zh"}'::jsonb, '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z')
ON CONFLICT (id) DO UPDATE SET
    collection_id = EXCLUDED.collection_id, title = EXCLUDED.title, content_type = EXCLUDED.content_type,
    chunk_count = EXCLUDED.chunk_count, status = EXCLUDED.status, size_bytes = EXCLUDED.size_bytes,
    metadata = EXCLUDED.metadata, updated_at = EXCLUDED.updated_at;
