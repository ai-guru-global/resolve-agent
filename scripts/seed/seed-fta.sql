-- =============================================================================
-- ResolveAgent - Seed: FTA Fault Tree Documents
-- =============================================================================
-- Core fault tree definitions linked to workflows
-- Matches web/src/api/mock.ts mockFaultTrees
-- =============================================================================

-- ─── FTA Documents: K8s Node NotReady ───
INSERT INTO fta_documents (id, workflow_id, name, description, fault_tree, version, status, created_by)
VALUES
('ft-k8s-node-notready', 'wf-001', 'K8s 节点 NotReady 故障树', '基于 K8s 节点状态分析 NotReady 根因',
 '{"id": "ft-k8s-node-notready", "name": "K8s 节点 NotReady 故障树", "top_event_id": "evt-top-001",
   "events": [
     {"id": "evt-top-001", "name": "节点 NotReady", "description": "K8s 节点进入 NotReady 状态", "type": "top", "evaluator": "", "parameters": {}},
     {"id": "evt-mid-001", "name": "网络故障", "description": "节点网络通信异常", "type": "intermediate", "evaluator": "", "parameters": {}},
     {"id": "evt-mid-002", "name": "资源耗尽", "description": "节点计算资源不足", "type": "intermediate", "evaluator": "", "parameters": {}},
     {"id": "evt-mid-003", "name": "kubelet 异常", "description": "kubelet 进程异常", "type": "intermediate", "evaluator": "", "parameters": {}},
     {"id": "evt-basic-001", "name": "NetworkPolicy 误配置", "description": "calico 网络策略阻断 kubelet 心跳", "type": "basic", "evaluator": "check_network_policy", "parameters": {"namespace": "kube-system"}},
     {"id": "evt-basic-002", "name": "安全组规则变更", "description": "安全组入方向规则阻断 10250 端口", "type": "basic", "evaluator": "check_security_group", "parameters": {"port": 10250}},
     {"id": "evt-basic-003", "name": "内存 OOM", "description": "节点内存使用率 > 95% 触发 OOM Killer", "type": "basic", "evaluator": "check_memory", "parameters": {"threshold": 0.95}},
     {"id": "evt-basic-004", "name": "磁盘空间不足", "description": "节点磁盘使用率 > 90%", "type": "basic", "evaluator": "check_disk", "parameters": {"threshold": 0.9}},
     {"id": "evt-basic-005", "name": "kubelet 进程崩溃", "description": "kubelet 进程 OOM 或 panic", "type": "basic", "evaluator": "check_kubelet_status", "parameters": {}},
     {"id": "evt-basic-006", "name": "证书过期", "description": "kubelet 客户端证书过期", "type": "basic", "evaluator": "check_cert_expiry", "parameters": {"component": "kubelet"}}
   ],
   "gates": [
     {"id": "gate-001", "name": "NotReady 原因", "type": "OR", "input_ids": ["evt-mid-001", "evt-mid-002", "evt-mid-003"], "output_id": "evt-top-001"},
     {"id": "gate-002", "name": "网络故障原因", "type": "OR", "input_ids": ["evt-basic-001", "evt-basic-002"], "output_id": "evt-mid-001"},
     {"id": "gate-003", "name": "资源耗尽原因", "type": "OR", "input_ids": ["evt-basic-003", "evt-basic-004"], "output_id": "evt-mid-002"},
     {"id": "gate-004", "name": "kubelet 异常原因", "type": "OR", "input_ids": ["evt-basic-005", "evt-basic-006"], "output_id": "evt-mid-003"}
   ]
 }'::jsonb, 1, 'active', 'system'),

('ft-rds-replication-lag', 'wf-002', 'RDS 主从同步延迟诊断', '分析 MySQL 主从同步延迟的根本原因',
 '{"id": "ft-rds-replication-lag", "name": "RDS 主从同步延迟诊断", "top_event_id": "evt-rds-top",
   "events": [
     {"id": "evt-rds-top", "name": "主从同步延迟", "description": "Seconds_Behind_Master > 阈值", "type": "top", "evaluator": "", "parameters": {}},
     {"id": "evt-rds-mid-001", "name": "SQL 线程延迟", "description": "SQL 回放线程落后", "type": "intermediate", "evaluator": "", "parameters": {}},
     {"id": "evt-rds-mid-002", "name": "IO 线程延迟", "description": "binlog 接收线程落后", "type": "intermediate", "evaluator": "", "parameters": {}},
     {"id": "evt-rds-basic-001", "name": "大事务阻塞", "description": "单条 SQL 影响行数 > 10 万", "type": "basic", "evaluator": "check_large_transactions", "parameters": {"row_threshold": 100000}},
     {"id": "evt-rds-basic-002", "name": "从库规格不足", "description": "从库 CPU/IO 性能弱于主库", "type": "basic", "evaluator": "check_replica_spec", "parameters": {}},
     {"id": "evt-rds-basic-003", "name": "并行复制未开启", "description": "slave_parallel_workers = 0", "type": "basic", "evaluator": "check_parallel_replication", "parameters": {}},
     {"id": "evt-rds-basic-004", "name": "网络带宽瓶颈", "description": "跨可用区带宽不足", "type": "basic", "evaluator": "check_network_bandwidth", "parameters": {}},
     {"id": "evt-rds-basic-005", "name": "binlog 过大", "description": "单个 binlog 文件超过 1GB", "type": "basic", "evaluator": "check_binlog_size", "parameters": {"max_size_mb": 1024}}
   ],
   "gates": [
     {"id": "gate-rds-001", "name": "延迟原因", "type": "OR", "input_ids": ["evt-rds-mid-001", "evt-rds-mid-002"], "output_id": "evt-rds-top"},
     {"id": "gate-rds-002", "name": "SQL 线程延迟原因", "type": "OR", "input_ids": ["evt-rds-basic-001", "evt-rds-basic-002", "evt-rds-basic-003"], "output_id": "evt-rds-mid-001"},
     {"id": "gate-rds-003", "name": "IO 线程延迟原因", "type": "OR", "input_ids": ["evt-rds-basic-004", "evt-rds-basic-005"], "output_id": "evt-rds-mid-002"}
   ]
 }'::jsonb, 1, 'active', 'system'),

('ft-kudig-node', 'wf-kudig-node', 'Node 节点异常故障树', '覆盖节点不可用/不稳定的关键成因',
 '{"id": "ft-kudig-node", "name": "Node 节点异常故障树", "top_event_id": "evt-node-top",
   "events": [
     {"id": "evt-node-top", "name": "节点 NotReady/Unavailable", "description": "K8s 节点进入 NotReady 或不可用状态", "type": "top"},
     {"id": "evt-node-mid-001", "name": "kubelet 异常", "description": "kubelet 进程状态异常", "type": "intermediate"},
     {"id": "evt-node-mid-002", "name": "系统资源耗尽", "description": "CPU/内存/磁盘资源耗尽", "type": "intermediate"},
     {"id": "evt-node-mid-003", "name": "网络异常", "description": "节点网络通信故障", "type": "intermediate"},
     {"id": "evt-node-mid-004", "name": "运行时异常", "description": "容器运行时 Docker/containerd 异常", "type": "intermediate"},
     {"id": "evt-node-basic-001", "name": "kubelet 进程崩溃", "type": "basic", "evaluator": "check_kubelet_status"},
     {"id": "evt-node-basic-002", "name": "证书过期", "type": "basic", "evaluator": "check_cert_expiry"},
     {"id": "evt-node-basic-003", "name": "内存 OOM", "type": "basic", "evaluator": "check_memory"},
     {"id": "evt-node-basic-004", "name": "磁盘空间不足", "type": "basic", "evaluator": "check_disk"},
     {"id": "evt-node-basic-005", "name": "NetworkPolicy 阻断", "type": "basic", "evaluator": "check_network_policy"},
     {"id": "evt-node-basic-006", "name": "安全组阻断", "type": "basic", "evaluator": "check_security_group"},
     {"id": "evt-node-basic-007", "name": "Docker hang", "type": "basic", "evaluator": "check_container_runtime"}
   ],
   "gates": [
     {"id": "gate-node-001", "name": "节点异常原因", "type": "OR", "input_ids": ["evt-node-mid-001", "evt-node-mid-002", "evt-node-mid-003", "evt-node-mid-004"], "output_id": "evt-node-top"},
     {"id": "gate-node-002", "name": "kubelet 异常原因", "type": "OR", "input_ids": ["evt-node-basic-001", "evt-node-basic-002"], "output_id": "evt-node-mid-001"},
     {"id": "gate-node-003", "name": "资源耗尽原因", "type": "OR", "input_ids": ["evt-node-basic-003", "evt-node-basic-004"], "output_id": "evt-node-mid-002"},
     {"id": "gate-node-004", "name": "网络异常原因", "type": "OR", "input_ids": ["evt-node-basic-005", "evt-node-basic-006"], "output_id": "evt-node-mid-003"},
     {"id": "gate-node-005", "name": "运行时异常原因", "type": "OR", "input_ids": ["evt-node-basic-007"], "output_id": "evt-node-mid-004"}
   ]
 }'::jsonb, 1, 'active', 'system'),

('ft-kudig-pod', 'wf-kudig-pod', 'Pod 异常故障树', '覆盖 Pod 各阶段异常',
 '{"id": "ft-kudig-pod", "name": "Pod 异常故障树", "top_event_id": "evt-pod-top",
   "events": [
     {"id": "evt-pod-top", "name": "Pod 异常", "type": "top"},
     {"id": "evt-pod-mid-001", "name": "启动阶段异常", "type": "intermediate"},
     {"id": "evt-pod-mid-002", "name": "运行阶段异常", "type": "intermediate"},
     {"id": "evt-pod-mid-003", "name": "调度阶段异常", "type": "intermediate"},
     {"id": "evt-pod-basic-001", "name": "CrashLoopBackOff", "type": "basic", "evaluator": "check_crashloop"},
     {"id": "evt-pod-basic-002", "name": "OOMKilled", "type": "basic", "evaluator": "check_oom"},
     {"id": "evt-pod-basic-003", "name": "ImagePullBackOff", "type": "basic", "evaluator": "check_image_pull"},
     {"id": "evt-pod-basic-004", "name": "Pending 调度失败", "type": "basic", "evaluator": "check_pod_pending"},
     {"id": "evt-pod-basic-005", "name": "PVC 挂载失败", "type": "basic", "evaluator": "check_pvc_mount"},
     {"id": "evt-pod-basic-006", "name": "探针检测失败", "type": "basic", "evaluator": "check_probe"}
   ],
   "gates": [
     {"id": "gate-pod-001", "type": "OR", "input_ids": ["evt-pod-mid-001", "evt-pod-mid-002", "evt-pod-mid-003"], "output_id": "evt-pod-top"},
     {"id": "gate-pod-002", "type": "OR", "input_ids": ["evt-pod-basic-003", "evt-pod-basic-005", "evt-pod-basic-006"], "output_id": "evt-pod-mid-001"},
     {"id": "gate-pod-003", "type": "OR", "input_ids": ["evt-pod-basic-001", "evt-pod-basic-002", "evt-pod-basic-006"], "output_id": "evt-pod-mid-002"},
     {"id": "gate-pod-004", "type": "OR", "input_ids": ["evt-pod-basic-004", "evt-pod-basic-005"], "output_id": "evt-pod-mid-003"}
   ]
 }'::jsonb, 1, 'active', 'system'),

('ft-kudig-apiserver', 'wf-kudig-apiserver', 'API Server 异常故障树', '覆盖 APIServer 不可用/性能劣化',
 '{"id": "ft-kudig-apiserver", "name": "API Server 异常故障树", "top_event_id": "evt-apiserver-top",
   "events": [
     {"id": "evt-apiserver-top", "name": "API Server 不可用", "type": "top"},
     {"id": "evt-apiserver-mid-001", "name": "进程与配置异常", "type": "intermediate"},
     {"id": "evt-apiserver-mid-002", "name": "认证鉴权异常", "type": "intermediate"},
     {"id": "evt-apiserver-mid-003", "name": "请求排队与限流", "type": "intermediate"},
     {"id": "evt-apiserver-mid-004", "name": "依赖组件异常", "type": "intermediate"},
     {"id": "evt-apiserver-basic-001", "name": "apiserver 进程崩溃", "type": "basic", "evaluator": "check_apiserver_process"},
     {"id": "evt-apiserver-basic-002", "name": "etcd 连接失败", "type": "basic", "evaluator": "check_etcd_connect"},
     {"id": "evt-apiserver-basic-003", "name": "证书过期", "type": "basic", "evaluator": "check_cert_expiry"},
     {"id": "evt-apiserver-basic-004", "name": "请求限流触发", "type": "basic", "evaluator": "check_rate_limit"},
     {"id": "evt-apiserver-basic-005", "name": "认证 Token 无效", "type": "basic", "evaluator": "check_sa_token"}
   ],
   "gates": [
     {"id": "gate-apiserver-001", "type": "OR", "input_ids": ["evt-apiserver-mid-001", "evt-apiserver-mid-002", "evt-apiserver-mid-003", "evt-apiserver-mid-004"], "output_id": "evt-apiserver-top"},
     {"id": "gate-apiserver-002", "type": "OR", "input_ids": ["evt-apiserver-basic-001", "evt-apiserver-basic-003"], "output_id": "evt-apiserver-mid-001"},
     {"id": "gate-apiserver-003", "type": "OR", "input_ids": ["evt-apiserver-basic-002"], "output_id": "evt-apiserver-mid-004"}
   ]
 }'::jsonb, 1, 'active', 'system'),

('ft-kudig-etcd', 'wf-kudig-etcd', 'Etcd 异常故障树', '覆盖 Etcd 集群异常',
 '{"id": "ft-kudig-etcd", "name": "Etcd 异常故障树", "top_event_id": "evt-etcd-top",
   "events": [
     {"id": "evt-etcd-top", "name": "Etcd 集群异常", "type": "top"},
     {"id": "evt-etcd-mid-001", "name": "进程与资源异常", "type": "intermediate"},
     {"id": "evt-etcd-mid-002", "name": "磁盘 IO 异常", "type": "intermediate"},
     {"id": "evt-etcd-mid-003", "name": "网络分区", "type": "intermediate"},
     {"id": "evt-etcd-basic-001", "name": "etcd 进程崩溃", "type": "basic", "evaluator": "check_etcd_process"},
     {"id": "evt-etcd-basic-002", "name": "磁盘空间不足", "type": "basic", "evaluator": "check_disk"},
     {"id": "evt-etcd-basic-003", "name": "WAL 写入缓慢", "type": "basic", "evaluator": "check_wal_latency"},
     {"id": "evt-etcd-basic-004", "name": "leader 选举失败", "type": "basic", "evaluator": "check_etcd_leader"}
   ],
   "gates": [
     {"id": "gate-etcd-001", "type": "OR", "input_ids": ["evt-etcd-mid-001", "evt-etcd-mid-002", "evt-etcd-mid-003"], "output_id": "evt-etcd-top"},
     {"id": "gate-etcd-002", "type": "OR", "input_ids": ["evt-etcd-basic-001", "evt-etcd-basic-002"], "output_id": "evt-etcd-mid-001"}
   ]
 }'::jsonb, 1, 'active', 'system'),

('ft-kudig-dns', 'wf-kudig-dns', 'DNS 解析异常故障树', '覆盖 CoreDNS 异常',
 '{"id": "ft-kudig-dns", "name": "DNS 解析异常故障树", "top_event_id": "evt-dns-top",
   "events": [
     {"id": "evt-dns-top", "name": "DNS 解析失败", "type": "top"},
     {"id": "evt-dns-mid-001", "name": "CoreDNS Pod 异常", "type": "intermediate"},
     {"id": "evt-dns-mid-002", "name": "节点层面 DNS 异常", "type": "intermediate"},
     {"id": "evt-dns-mid-003", "name": "网络策略阻断", "type": "intermediate"},
     {"id": "evt-dns-basic-001", "name": "CoreDNS Pod 不健康", "type": "basic", "evaluator": "check_coredns_pods"},
     {"id": "evt-dns-basic-002", "name": "CoreDNS 配置错误", "type": "basic", "evaluator": "check_coredns_config"},
     {"id": "evt-dns-basic-003", "name": "resolv.conf 错误", "type": "basic", "evaluator": "check_resolv_conf"},
     {"id": "evt-dns-basic-004", "name": "DNS NPC 阻断", "type": "basic", "evaluator": "check_network_policy"}
   ],
   "gates": [
     {"id": "gate-dns-001", "type": "OR", "input_ids": ["evt-dns-mid-001", "evt-dns-mid-002", "evt-dns-mid-003"], "output_id": "evt-dns-top"},
     {"id": "gate-dns-002", "type": "OR", "input_ids": ["evt-dns-basic-001", "evt-dns-basic-002"], "output_id": "evt-dns-mid-001"}
   ]
 }'::jsonb, 1, 'active', 'system'),

('ft-kudig-deployment', 'wf-kudig-deployment', 'Deployment 异常故障树', '覆盖 Deployment Rollout 失败',
 '{"id": "ft-kudig-deployment", "name": "Deployment 异常故障树", "top_event_id": "evt-deploy-top",
   "events": [
     {"id": "evt-deploy-top", "name": "Deployment Rollout 失败", "type": "top"},
     {"id": "evt-deploy-mid-001", "name": "ReplicaSet 不健康", "type": "intermediate"},
     {"id": "evt-deploy-mid-002", "name": "镜像拉取失败", "type": "intermediate"},
     {"id": "evt-deploy-mid-003", "name": "资源配额不足", "type": "intermediate"},
     {"id": "evt-deploy-basic-001", "name": "ImagePullBackOff", "type": "basic", "evaluator": "check_image_pull"},
     {"id": "evt-deploy-basic-002", "name": "资源不足", "type": "basic", "evaluator": "check_resource_quota"},
     {"id": "evt-deploy-basic-003", "name": "探针失败", "type": "basic", "evaluator": "check_probe"},
     {"id": "evt-deploy-basic-004", "name": "版本冲突", "type": "basic", "evaluator": "check_revision"}
   ],
   "gates": [
     {"id": "gate-deploy-001", "type": "OR", "input_ids": ["evt-deploy-mid-001", "evt-deploy-mid-002", "evt-deploy-mid-003"], "output_id": "evt-deploy-top"},
     {"id": "gate-deploy-002", "type": "OR", "input_ids": ["evt-deploy-basic-001", "evt-deploy-basic-002", "evt-deploy-basic-003", "evt-deploy-basic-004"], "output_id": "evt-deploy-mid-001"}
   ]
 }'::jsonb, 1, 'active', 'system'),

('ft-kudig-service', 'wf-kudig-service', 'Service 连通性异常故障树', '覆盖 Service 连通性异常',
 '{"id": "ft-kudig-service", "name": "Service 连通性异常故障树", "top_event_id": "evt-svc-top",
   "events": [
     {"id": "evt-svc-top", "name": "Service 不可达", "type": "top"},
     {"id": "evt-svc-mid-001", "name": "Endpoints 不健康", "type": "intermediate"},
     {"id": "evt-svc-mid-002", "name": "网络连通性故障", "type": "intermediate"},
     {"id": "evt-svc-basic-001", "name": "Pod 未就绪", "type": "basic", "evaluator": "check_pod_ready"},
     {"id": "evt-svc-basic-002", "name": "Selector 不匹配", "type": "basic", "evaluator": "check_svc_selector"},
     {"id": "evt-svc-basic-003", "name": "连接被 NetworkPolicy 阻断", "type": "basic", "evaluator": "check_network_policy"},
     {"id": "evt-svc-basic-004", "name": "Service Type 问题", "type": "basic", "evaluator": "check_svc_type"}
   ],
   "gates": [
     {"id": "gate-svc-001", "type": "OR", "input_ids": ["evt-svc-mid-001", "evt-svc-mid-002"], "output_id": "evt-svc-top"},
     {"id": "gate-svc-002", "type": "OR", "input_ids": ["evt-svc-basic-001", "evt-svc-basic-002"], "output_id": "evt-svc-mid-001"}
   ]
 }'::jsonb, 1, 'active', 'system'),

('ft-kudig-scheduler', 'wf-kudig-scheduler', 'Scheduler 调度异常故障树', '覆盖 Pod 无法调度的成因',
 '{"id": "ft-kudig-scheduler", "name": "Scheduler 调度异常故障树", "top_event_id": "evt-sched-top",
   "events": [
     {"id": "evt-sched-top", "name": "Pod 调度失败", "type": "top"},
     {"id": "evt-sched-mid-001", "name": "资源不足", "type": "intermediate"},
     {"id": "evt-sched-mid-002", "name": "亲和性冲突", "type": "intermediate"},
     {"id": "evt-sched-mid-003", "name": "污点不容忍", "type": "intermediate"},
     {"id": "evt-sched-mid-004", "name": "调度器异常", "type": "intermediate"},
     {"id": "evt-sched-basic-001", "name": "CPU/内存不足", "type": "basic", "evaluator": "check_node_resources"},
     {"id": "evt-sched-basic-002", "name": "PVC 无法绑定", "type": "basic", "evaluator": "check_pvc_pending"},
     {"id": "evt-sched-basic-003", "name": "节点亲和性冲突", "type": "basic", "evaluator": "check_node_affinity"},
     {"id": "evt-sched-basic-004", "name": "调度器未运行", "type": "basic", "evaluator": "check_scheduler_running"}
   ],
   "gates": [
     {"id": "gate-sched-001", "type": "OR", "input_ids": ["evt-sched-mid-001", "evt-sched-mid-002", "evt-sched-mid-003", "evt-sched-mid-004"], "output_id": "evt-sched-top"},
     {"id": "gate-sched-002", "type": "OR", "input_ids": ["evt-sched-basic-001", "evt-sched-basic-002"], "output_id": "evt-sched-mid-001"}
   ]
 }'::jsonb, 1, 'active', 'system'),

('ft-kudig-monitoring', 'wf-kudig-monitoring', 'Monitoring 监控异常故障树', '覆盖 Prometheus 采集和 Alertmanager 通知异常',
 '{"id": "ft-kudig-monitoring", "name": "Monitoring 监控异常故障树", "top_event_id": "evt-monitor-top",
   "events": [
     {"id": "evt-monitor-top", "name": "监控告警异常", "type": "top"},
     {"id": "evt-monitor-mid-001", "name": "Prometheus 采集失败", "type": "intermediate"},
     {"id": "evt-monitor-mid-002", "name": "Alertmanager 通知失败", "type": "intermediate"},
     {"id": "evt-monitor-basic-001", "name": "Prometheus Pod 不健康", "type": "basic", "evaluator": "check_prometheus"},
     {"id": "evt-monitor-basic-002", "name": "ServiceMonitor 配置错误", "type": "basic", "evaluator": "check_servicemonitor"},
     {"id": "evt-monitor-basic-003", "name": "Alertmanager Pod 不健康", "type": "basic", "evaluator": "check_alertmanager"},
     {"id": "evt-monitor-basic-004", "name": "告警抑制规则错误", "type": "basic", "evaluator": "check_alert_inhibit"}
   ],
   "gates": [
     {"id": "gate-monitor-001", "type": "OR", "input_ids": ["evt-monitor-mid-001", "evt-monitor-mid-002"], "output_id": "evt-monitor-top"}
   ]
 }'::jsonb, 1, 'active', 'system')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    fault_tree = EXCLUDED.fault_tree,
    status = EXCLUDED.status;
