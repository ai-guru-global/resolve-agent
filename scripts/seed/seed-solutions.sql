-- =============================================================================
-- ResolveAgent - Seed: Troubleshooting Solutions
-- =============================================================================
-- 8 troubleshooting solutions (3 ops + 5 kudig structured solutions)
-- Matches web/src/api/mock.ts mockSolutions data
-- Targets migration schema (resolveagent) with UUID PKs
-- =============================================================================

SET search_path TO resolveagent, public;

INSERT INTO troubleshooting_solutions (
    id, title, problem_symptoms, key_information, troubleshooting_steps, resolution_steps,
    domain, component, severity, tags, search_keywords, version, status,
    source_uri, rag_collection_id, related_skill_names, related_workflow_ids,
    metadata, created_by, created_at, updated_at
) VALUES
-- ── sol-001: K8s Pod CrashLoopBackOff ──
(
    'a0000001-0000-0000-0000-000000000001',
    'K8s Pod CrashLoopBackOff 排查方案',
    'Pod 频繁重启，状态为 CrashLoopBackOff，容器日志显示 OOMKilled 或应用启动失败',
    E'1. kubectl describe pod 输出的 Events 和 Last State\n2. 容器 exit code（137=OOM, 1=应用错误）\n3. 节点资源使用率（kubectl top nodes）',
    E'1. 检查 Pod Events 和容器状态\n2. 分析容器退出码确定失败类型\n3. 检查资源配额和 limits 设置\n4. 分析应用日志定位根因',
    E'1. OOM: 调整 memory limits 或优化应用内存使用\n2. 应用错误: 修复代码或配置问题\n3. 镜像问题: 检查镜像版本和拉取策略',
    'kubernetes', 'pod', 'high',
    ARRAY['k8s', 'pod', 'crashloop', 'oom'],
    'CrashLoopBackOff OOMKilled pod restart',
    1, 'active', '',
    'solutions', ARRAY['k8s-pod-crash'], ARRAY[]::TEXT[],
    '{}'::jsonb, 'system',
    '2026-03-15T10:00:00Z', '2026-04-01T08:30:00Z'
),
-- ── sol-002: RDS MySQL 主从复制延迟 ──
(
    'a0000001-0000-0000-0000-000000000002',
    'RDS MySQL 主从复制延迟排查',
    '从库复制延迟持续增大，Seconds_Behind_Master 值异常，应用读请求获取到过时数据',
    E'1. SHOW SLAVE STATUS 输出\n2. 主库 binlog 写入速率\n3. 从库 relay log 应用速率\n4. 大事务或 DDL 操作记录',
    E'1. 检查从库复制状态（IO Thread / SQL Thread）\n2. 分析主库慢查询和大事务\n3. 检查网络延迟和带宽\n4. 评估从库硬件资源',
    E'1. 大事务: 拆分大批量操作为小批次\n2. 网络: 优化主从网络链路\n3. 资源: 升级从库规格或开启并行复制',
    'database', 'mysql-replication', 'high',
    ARRAY['rds', 'mysql', 'replication', 'lag'],
    'replication lag Seconds_Behind_Master slave delay',
    1, 'active', '',
    'solutions', ARRAY[]::TEXT[], ARRAY['wf-rds-replication-lag'],
    '{}'::jsonb, 'system',
    '2026-03-20T14:00:00Z', '2026-04-05T11:20:00Z'
),
-- ── sol-003: SLB 后端健康检查失败 ──
(
    'a0000001-0000-0000-0000-000000000003',
    'SLB 后端健康检查失败排查',
    'SLB 健康检查显示后端服务器异常，流量未转发到部分实例，导致服务降级',
    E'1. SLB 健康检查配置（端口、路径、间隔）\n2. 后端 ECS 安全组规则\n3. 应用健康检查端点响应状态',
    E'1. 确认健康检查端口和路径配置\n2. 检查 ECS 安全组是否放行健康检查端口\n3. 手动 curl 健康检查端点验证\n4. 检查应用进程和端口监听状态',
    E'1. 安全组: 添加 SLB 健康检查 IP 段放行规则\n2. 应用: 确保健康检查端点返回 200\n3. 配置: 调整健康检查超时和阈值参数',
    'network', 'slb', 'medium',
    ARRAY['slb', 'health-check', 'load-balancer'],
    'SLB health check failed backend unhealthy',
    1, 'active', '',
    'solutions', ARRAY[]::TEXT[], ARRAY[]::TEXT[],
    '{}'::jsonb, 'system',
    '2026-04-01T09:00:00Z', '2026-04-10T16:45:00Z'
),
-- ── sol-kudig-001: API Server 故障排查 ──
(
    'a0000001-0000-0000-0000-000000000011',
    'API Server 故障排查指南',
    E'API Server 无响应或请求超时，kubectl 命令返回 "Unable to connect to the server" 或 "connection refused"，集群内 Pod 无法通过 Service Account 访问 API，审计日志中出现大量 429/503 错误',
    E'1. kube-apiserver Pod 日志（kubectl logs -n kube-system kube-apiserver-*）\n2. etcd 健康状态及延迟指标\n3. API Server 审计日志（--audit-log-path）\n4. API Priority and Fairness 配置（FlowSchema / PriorityLevelConfiguration）\n5. 证书有效期（openssl x509 -enddate）',
    E'1. 检查 kube-apiserver Pod 运行状态和重启次数\n2. 验证 etcd 集群健康（etcdctl endpoint health）\n3. 检查 TLS 证书是否过期\n4. 分析 API Server 请求延迟和队列深度\n5. 检查 APF 限流配置是否合理\n6. 排查 Webhook 配置是否阻塞请求',
    E'1. 证书过期: 使用 kubeadm certs renew 续签\n2. etcd 故障: 修复 etcd 成员或从备份恢复\n3. 过载: 调整 APF FlowSchema 优先级和并发限制\n4. Webhook 阻塞: 设置 failurePolicy=Ignore 或修复 Webhook 服务',
    'kubernetes', 'api-server', 'high',
    ARRAY['k8s', 'api-server', 'control-plane', 'etcd', 'certificate', 'apf'],
    'apiserver connection refused 503 429 certificate expired etcd unhealthy',
    1, 'active',
    'https://raw.githubusercontent.com/kudig-io/kudig-database/main/topic-structural-trouble-shooting/01-control-plane/api-server.md',
    'kudig-solutions', ARRAY[]::TEXT[], ARRAY[]::TEXT[],
    '{"source":"kudig","category":"01-control-plane"}'::jsonb, 'kudig-importer',
    '2026-04-10T08:00:00Z', '2026-04-10T08:00:00Z'
),
-- ── sol-kudig-002: etcd 集群故障 ──
(
    'a0000001-0000-0000-0000-000000000012',
    'etcd 集群故障排查指南',
    E'etcd 响应缓慢或不可用，API Server 报 "etcdserver: request timed out"，集群 Leader 频繁切换，etcd 数据库大小持续增长触发告警',
    E'1. etcdctl endpoint status / endpoint health 输出\n2. etcd 成员列表及 Leader 信息\n3. etcd 磁盘 I/O 延迟（WAL fsync duration）\n4. etcd 数据库大小和碎片率\n5. etcd 网络延迟（peer round-trip time）',
    E'1. 检查所有 etcd 成员健康状态\n2. 分析 Leader 选举历史和切换频率\n3. 检查磁盘 I/O 性能（fdatasync 延迟应 < 10ms）\n4. 检查数据库大小是否接近配额（默认 2GB）\n5. 排查网络分区导致的脑裂问题',
    E'1. 磁盘慢: 迁移到 SSD 或调整 I/O 调度器\n2. 数据库过大: 执行 etcdctl compact + defrag\n3. 成员故障: 移除并重新加入成员\n4. 数据损坏: 从快照恢复 etcd 数据',
    'kubernetes', 'etcd', 'high',
    ARRAY['k8s', 'etcd', 'control-plane', 'storage', 'leader-election'],
    'etcd timeout leader election disk io compact defrag snapshot restore',
    1, 'active',
    'https://raw.githubusercontent.com/kudig-io/kudig-database/main/topic-structural-trouble-shooting/01-control-plane/etcd.md',
    'kudig-solutions', ARRAY[]::TEXT[], ARRAY[]::TEXT[],
    '{"source":"kudig","category":"01-control-plane"}'::jsonb, 'kudig-importer',
    '2026-04-10T08:00:00Z', '2026-04-10T08:00:00Z'
),
-- ── sol-kudig-003: Pod 生命周期故障 ──
(
    'a0000001-0000-0000-0000-000000000013',
    'Pod 生命周期故障排查指南',
    E'Pod 处于 Pending/CrashLoopBackOff/ImagePullBackOff/Unknown 等异常状态，容器频繁重启且 backoff 时间持续增长，Init Container 执行失败导致主容器无法启动',
    E'1. kubectl describe pod 输出（Events、Conditions、Container States）\n2. 容器退出码（137=OOM/SIGKILL, 1=应用错误, 126=权限问题, 127=命令未找到）\n3. Pod QoS 等级和资源配额（requests/limits）\n4. 节点资源使用率和调度约束\n5. PodSandbox 和 Pause 容器状态',
    E'1. 检查 Pod Events 确定失败阶段（调度/拉镜像/启动/运行）\n2. 分析容器退出码和 Last State\n3. 检查节点资源是否充足（kubectl top nodes）\n4. 验证 PVC 挂载、ConfigMap/Secret 是否存在\n5. 检查 SecurityContext 和 PodSecurityPolicy/Standards\n6. 排查 DNS 解析和网络连通性',
    E'1. OOMKilled: 增加 memory limits 或优化应用内存\n2. ImagePullBackOff: 检查镜像名称/凭证/仓库可达性\n3. 调度失败: 调整 nodeSelector/tolerations 或扩容节点\n4. 启动失败: 修复 command/args/env 配置',
    'kubernetes', 'pod', 'medium',
    ARRAY['k8s', 'pod', 'lifecycle', 'crashloop', 'oom', 'scheduling'],
    'pod pending crashloopbackoff imagepullbackoff oomkilled exit code scheduling',
    1, 'active',
    'https://raw.githubusercontent.com/kudig-io/kudig-database/main/topic-structural-trouble-shooting/05-workloads/01-pod-troubleshooting.md',
    'kudig-solutions', ARRAY['k8s-pod-crash'], ARRAY[]::TEXT[],
    '{"source":"kudig","category":"05-workloads"}'::jsonb, 'kudig-importer',
    '2026-04-10T08:00:00Z', '2026-04-10T08:00:00Z'
),
-- ── sol-kudig-004: CoreDNS 域名解析故障 ──
(
    'a0000001-0000-0000-0000-000000000014',
    'CoreDNS 域名解析故障排查指南',
    E'Pod 内 DNS 解析失败，nslookup/dig 返回 SERVFAIL 或超时，Service 域名 (*.svc.cluster.local) 无法解析，外部域名解析异常',
    E'1. CoreDNS Pod 日志和运行状态\n2. CoreDNS Corefile 配置\n3. kube-dns Service ClusterIP 和 Endpoints\n4. Pod 的 /etc/resolv.conf 内容\n5. 节点上游 DNS 服务器可达性',
    E'1. 检查 CoreDNS Pod 是否正常运行\n2. 验证 kube-dns Service 的 Endpoints 是否指向 CoreDNS Pod\n3. 在故障 Pod 中执行 nslookup kubernetes.default\n4. 检查 CoreDNS 配置（Corefile）是否正确\n5. 确认 Pod resolv.conf 中 nameserver 指向 kube-dns ClusterIP\n6. 排查上游 DNS 转发链路',
    E'1. CoreDNS 崩溃: 检查资源限制并重启\n2. 配置错误: 修复 Corefile 中的 forward/upstream 配置\n3. Endpoints 空: 检查 CoreDNS Deployment 和标签选择器\n4. 网络隔离: 检查 NetworkPolicy 是否阻断 DNS 流量（UDP 53）',
    'kubernetes', 'coredns', 'medium',
    ARRAY['k8s', 'dns', 'coredns', 'networking', 'service-discovery'],
    'dns coredns resolve servfail nslookup dig resolv.conf cluster.local',
    1, 'active',
    'https://raw.githubusercontent.com/kudig-io/kudig-database/main/topic-structural-trouble-shooting/03-networking/dns.md',
    'kudig-solutions', ARRAY[]::TEXT[], ARRAY[]::TEXT[],
    '{"source":"kudig","category":"03-networking"}'::jsonb, 'kudig-importer',
    '2026-04-10T08:00:00Z', '2026-04-10T08:00:00Z'
),
-- ── sol-kudig-005: PV/PVC 存储故障 ──
(
    'a0000001-0000-0000-0000-000000000015',
    'PV/PVC 存储故障排查指南',
    E'PVC 长时间处于 Pending 状态无法绑定，Pod 挂载卷失败报 "FailedMount" 或 "FailedAttachVolume"，存储卷扩容后容量未生效，数据读写异常或 I/O 错误',
    E'1. PVC 状态和 Events（kubectl describe pvc）\n2. PV 信息和 reclaimPolicy\n3. StorageClass 配置和 provisioner\n4. CSI Driver Pod 日志\n5. 云厂商存储服务状态和配额',
    E'1. 检查 PVC 状态和绑定的 PV\n2. 检查 StorageClass 是否存在及 provisioner 是否可用\n3. 查看 CSI Driver Pod 日志排查 provisioning/attach 错误\n4. 验证节点是否支持挂载（cloud provider 权限/配额）\n5. 检查 Pod 的 volumeMounts 和 volumes 配置一致性',
    E'1. PVC Pending: 创建匹配的 PV 或检查 StorageClass provisioner\n2. Attach 失败: 检查云盘配额/节点挂载数量限制\n3. Mount 失败: 检查文件系统类型和 fsGroup 权限\n4. 扩容不生效: 确认 StorageClass 支持 allowVolumeExpansion 并重启 Pod',
    'kubernetes', 'pvc', 'medium',
    ARRAY['k8s', 'storage', 'pv', 'pvc', 'csi', 'storageclass'],
    'pvc pending pv bind mount attach csi storage class volume expansion',
    1, 'active',
    'https://raw.githubusercontent.com/kudig-io/kudig-database/main/topic-structural-trouble-shooting/04-storage/pv-pvc.md',
    'kudig-solutions', ARRAY[]::TEXT[], ARRAY[]::TEXT[],
    '{"source":"kudig","category":"04-storage"}'::jsonb, 'kudig-importer',
    '2026-04-10T08:00:00Z', '2026-04-10T08:00:00Z'
)
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    problem_symptoms = EXCLUDED.problem_symptoms,
    key_information = EXCLUDED.key_information,
    troubleshooting_steps = EXCLUDED.troubleshooting_steps,
    resolution_steps = EXCLUDED.resolution_steps,
    domain = EXCLUDED.domain,
    component = EXCLUDED.component,
    severity = EXCLUDED.severity,
    tags = EXCLUDED.tags,
    search_keywords = EXCLUDED.search_keywords,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    source_uri = EXCLUDED.source_uri,
    metadata = EXCLUDED.metadata,
    updated_at = EXCLUDED.updated_at;
