-- =============================================================================
-- ResolveAgent - Seed: Workflows & FTA Fault Trees
-- =============================================================================
-- 39 workflows (5 base + 34 kudig) with FTA fault tree definitions
-- Matches web/src/api/mock.ts mockWorkflows + mockFaultTrees
-- =============================================================================

-- ─── Base Workflows ───
INSERT INTO workflows (id, name, description, type, definition, status, version)
VALUES
    ('wf-001', 'K8s 节点 NotReady 故障树', '基于 K8s 节点状态、kubelet 日志、网络策略分析 NotReady 根因', 'fta', '{"node_count": 8}'::jsonb, 'active', 1),
    ('wf-002', 'RDS 主从同步延迟诊断', '分析 MySQL 主从同步延迟的根本原因，涵盖大事务、规格不足、网络延迟等场景', 'fta', '{"node_count": 7}'::jsonb, 'active', 1),
    ('wf-003', 'SLB 后端健康检查失败排查', '排查 SLB 后端服务器健康检查失败，包括端口不通、超时、HTTP 状态码异常', 'fta', '{"node_count": 6}'::jsonb, 'draft', 1),
    ('wf-004', 'ECS 实例 CPU 打满分析', '定位 ECS 实例 CPU 使用率持续 > 90% 的根本原因，分析进程、调度、资源配置', 'fta', '{"node_count": 9}'::jsonb, 'active', 1),
    ('wf-005', 'DNS 解析异常故障树', '诊断 DNS 解析失败或超时问题，覆盖 CoreDNS、VPC DNS、外部解析链路', 'fta', '{"node_count": 5}'::jsonb, 'archived', 1),
    -- ─── Kudig Workflows ───
    ('wf-kudig-node', 'Node 节点异常故障树', '覆盖节点不可用/不稳定的关键成因：节点状态、kubelet、运行时、系统资源、内核与网络、存储、证书与时间、控制面依赖', 'fta', '{"node_count": 9}'::jsonb, 'active', 1),
    ('wf-kudig-pod', 'Pod 异常故障树', '覆盖 Pod 启动、运行、终止阶段的异常：CrashLoopBackOff、OOMKilled、Pending、ImagePullBackOff', 'fta', '{"node_count": 11}'::jsonb, 'active', 1),
    ('wf-kudig-apiserver', 'API Server 异常故障树', '覆盖 APIServer 不可用/性能劣化的关键成因', 'fta', '{"node_count": 8}'::jsonb, 'active', 1),
    ('wf-kudig-etcd', 'Etcd 异常故障树', '覆盖 Etcd 集群异常的关键成因：进程与资源、WAL 与快照、磁盘 IO、网络分区', 'fta', '{"node_count": 10}'::jsonb, 'active', 1),
    ('wf-kudig-dns', 'DNS 解析异常故障树', '覆盖 CoreDNS 异常、DNS 解析失败的根本成因', 'fta', '{"node_count": 7}'::jsonb, 'active', 1),
    ('wf-kudig-ingress', 'Ingress/Gateway 故障树', '覆盖 Ingress Controller 异常、域名解析问题、证书问题的故障路径', 'fta', '{"node_count": 6}'::jsonb, 'active', 1),
    ('wf-kudig-deployment', 'Deployment 异常故障树', '覆盖 Deployment Rollout 失败、ReplicaSet 不健康的根因', 'fta', '{"node_count": 8}'::jsonb, 'active', 1),
    ('wf-kudig-statefulset', 'StatefulSet 异常故障树', '覆盖 StatefulSet 异常的根本成因：PVC 挂载、序号分配、headless Service', 'fta', '{"node_count": 7}'::jsonb, 'active', 1),
    ('wf-kudig-daemonset', 'DaemonSet 异常故障树', '覆盖 DaemonSet Pod 调度失败或异常的根本成因', 'fta', '{"node_count": 6}'::jsonb, 'active', 1),
    ('wf-kudig-job', 'Job/CronJob 异常故障树', '覆盖 Job 失败、CronJob 未按计划执行的根本成因', 'fta', '{"node_count": 7}'::jsonb, 'active', 1),
    ('wf-kudig-hpa', 'HPA 扩缩容异常故障树', '覆盖 HPA 无法扩缩容、缩容到 0 或扩容失败的根因', 'fta', '{"node_count": 8}'::jsonb, 'active', 1),
    ('wf-kudig-vpa', 'VPA 异常故障树', '覆盖 VPA 推荐值异常、更新失败的根因', 'fta', '{"node_count": 6}'::jsonb, 'active', 1),
    ('wf-kudig-csi', 'CSI 存储异常故障树', '覆盖 PersistentVolume 挂载失败、CSI driver 异常的根因', 'fta', '{"node_count": 9}'::jsonb, 'active', 1),
    ('wf-kudig-rbac', 'RBAC 权限异常故障树', '覆盖 ServiceAccount 权限不足、RoleBinding/ClusterRoleBinding 配置错误的根因', 'fta', '{"node_count": 7}'::jsonb, 'active', 1),
    ('wf-kudig-certificate', 'Certificate 证书异常故障树', '覆盖 kubelet/apiserver/etcd 证书过期或无效的根因', 'fta', '{"node_count": 6}'::jsonb, 'active', 1),
    ('wf-kudig-scheduler', 'Scheduler 调度异常故障树', '覆盖 Pod 无法调度、调度延迟的根本成因', 'fta', '{"node_count": 9}'::jsonb, 'active', 1),
    ('wf-kudig-controller', 'Controller Manager 异常故障树', '覆盖 kube-controller-manager 异常的根本成因', 'fta', '{"node_count": 7}'::jsonb, 'active', 1),
    ('wf-kudig-monitoring', 'Monitoring 监控异常故障树', '覆盖 Prometheus 采集失败、Alertmanager 通知异常的根本成因', 'fta', '{"node_count": 8}'::jsonb, 'active', 1),
    ('wf-kudig-service', 'Service 连通性异常故障树', '覆盖 Service 无法访问、Endpoints 不健康的根本成因', 'fta', '{"node_count": 7}'::jsonb, 'active', 1),
    ('wf-kudig-nodepool', 'NodePool 节点池异常故障树', '覆盖节点池扩缩容异常、节点加入失败的根因', 'fta', '{"node_count": 8}'::jsonb, 'active', 1),
    ('wf-kudig-pdb', 'PDB 驱散异常故障树', '覆盖 PodDisruptionBudget 导致驱逐失败的根因', 'fta', '{"node_count": 6}'::jsonb, 'active', 1),
    ('wf-kudig-autoscaler', 'Cluster Autoscaler 异常故障树', '覆盖 Cluster Autoscaler 无法扩容或缩容节点的根本成因', 'fta', '{"node_count": 8}'::jsonb, 'active', 1),
    ('wf-kudig-cluster-upgrade', '集群升级异常故障树', '覆盖集群升级失败、节点升级过程中异常的根本成因', 'fta', '{"node_count": 10}'::jsonb, 'active', 1),
    ('wf-kudig-gateway', 'Gateway API 异常故障树', '覆盖 Gateway API 资源异常、HTTPRoute 绑定失败的根因', 'fta', '{"node_count": 7}'::jsonb, 'active', 1),
    ('wf-kudig-service-mesh', 'Service Mesh Istio 异常故障树', '覆盖 Istio 网格内服务无法通信、Sidecar 注入异常的根因', 'fta', '{"node_count": 9}'::jsonb, 'active', 1),
    ('wf-kudig-gitops', 'GitOps ArgoCD 异常故障树', '覆盖 ArgoCD 同步失败、应用状态异常的根因', 'fta', '{"node_count": 8}'::jsonb, 'active', 1),
    ('wf-kudig-gpu', 'GPU 节点异常故障树', '覆盖 GPU 节点不可用、DevicePlugin 异常的根因', 'fta', '{"node_count": 8}'::jsonb, 'active', 1),
    ('wf-kudig-helm', 'Helm Release 异常故障树', '覆盖 Helm Release 升级失败、回滚异常的根本成因', 'fta', '{"node_count": 7}'::jsonb, 'active', 1),
    ('wf-kudig-crd', 'CRD/Operator 异常故障树', '覆盖 CustomResourceDefinition 异常、Operator 无法正常工作的根因', 'fta', '{"node_count": 9}'::jsonb, 'active', 1),
    ('wf-kudig-networkpolicy', 'NetworkPolicy 异常故障树', '覆盖 NetworkPolicy 配置后流量不通的根本成因', 'fta', '{"node_count": 6}'::jsonb, 'active', 1),
    ('wf-kudig-psp', 'PSP/SCC 策略异常故障树', '覆盖 PodSecurityPolicy 导致 Pod 创建失败的根因', 'fta', '{"node_count": 6}'::jsonb, 'active', 1),
    ('wf-kudig-resourcequota', 'ResourceQuota 异常故障树', '覆盖 ResourceQuota/LimitRange 导致资源创建失败的根因', 'fta', '{"node_count": 7}'::jsonb, 'active', 1),
    ('wf-kudig-webhook', 'Webhook Admission 异常故障树', '覆盖 MutatingWebhook/ValidatingWebhook 导致资源创建/更新失败的根因', 'fta', '{"node_count": 7}'::jsonb, 'active', 1),
    ('wf-kudig-backup', 'Backup/Restore 异常故障树', '覆盖 Velero 备份失败、恢复异常的根本成因', 'fta', '{"node_count": 8}'::jsonb, 'active', 1),
    ('wf-kudig-cloudprovider', 'Cloud Provider 异常故障树', '覆盖阿里云/AWS/GCP 云厂商特定资源异常的根本成因', 'fta', '{"node_count": 10}'::jsonb, 'active', 1),
    ('wf-kudig-terway', 'Terway CNI 异常故障树', '覆盖阿里云 Terway CNI 网络异常的根因', 'fta', '{"node_count": 7}'::jsonb, 'active', 1),
    ('wf-kudig-monitoring-extra', 'Monitoring Extra 监控扩展异常故障树', '覆盖 Metrics Server、Prometheus Adapter 等监控扩展组件异常的根因', 'fta', '{"node_count": 7}'::jsonb, 'active', 1)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    definition = EXCLUDED.definition,
    status = EXCLUDED.status;
