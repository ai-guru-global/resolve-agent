-- =============================================================================
-- ResolveAgent - Seed: Skills
-- =============================================================================
-- 26 skills (6 general + 2 scenario + 18 kudig scenario skills)
-- Matches web/src/api/mock.ts mockSkills data
-- =============================================================================

-- Skills (Go runtime schema: name VARCHAR(255) PRIMARY KEY)
INSERT INTO skills (name, version, description, author, manifest, source_type, source_uri, status, labels)
VALUES
    -- ─── General Skills ───
    ('ticket-handler', '1.2.0',
     '自动分析运维工单，提取关键信息，评估优先级，生成处理建议',
     'ResolveNet Team',
     '{"skill_type": "general", "display_name": "工单处理", "icon": "🎫", "entry_point": "skills/ticket_handler/main.py",
       "inputs": [{"name": "ticket_content", "type": "string", "description": "工单内容描述", "required": true}, {"name": "action", "type": "string", "description": "操作类型: analyze | summarize | suggest", "required": true}],
       "outputs": [{"name": "result", "type": "string"}, {"name": "component", "type": "string"}, {"name": "priority", "type": "string"}],
       "permissions": {"network_access": true, "file_system_read": true, "file_system_write": false, "timeout_seconds": 30}
     }'::jsonb, 'local', 'skills/ticket_handler/', 'active',
     '{"skill_type": "general"}'::jsonb),

    ('consulting-qa', '1.1.0',
     '基于阿里云产品文档和最佳实践的智能问答，覆盖 ECS/ACK/RDS/OSS 等',
     'ResolveNet Team',
     '{"skill_type": "general", "display_name": "咨询问答", "icon": "💬", "entry_point": "skills/consulting_qa/main.py",
       "inputs": [{"name": "question", "type": "string", "description": "用户提问", "required": true}],
       "outputs": [{"name": "answer", "type": "string"}, {"name": "confidence", "type": "number"}, {"name": "sources", "type": "array"}],
       "permissions": {"network_access": false, "file_system_read": true, "file_system_write": false, "timeout_seconds": 15}
     }'::jsonb, 'local', 'skills/consulting_qa/', 'active',
     '{"skill_type": "general"}'::jsonb),

    ('log-analyzer', '2.0.1',
     '多源日志聚合分析，支持 SLS、Kafka、文件日志的模式识别和异常检测',
     'ResolveNet Team',
     '{"skill_type": "general", "display_name": "日志分析", "icon": "📊", "entry_point": "skills/log_analyzer/main.py",
       "inputs": [{"name": "log_source", "type": "string", "description": "日志来源", "required": true}, {"name": "time_range", "type": "string", "description": "时间范围", "required": true}],
       "outputs": [{"name": "anomalies", "type": "array"}, {"name": "summary", "type": "string"}, {"name": "severity", "type": "string"}],
       "permissions": {"network_access": true, "file_system_read": true, "file_system_write": false, "timeout_seconds": 60}
     }'::jsonb, 'local', 'skills/log_analyzer/', 'active',
     '{"skill_type": "general"}'::jsonb),

    ('metric-alerter', '1.0.3',
     '基于 Prometheus 指标的智能告警，支持动态阈值和趋势预测',
     'ResolveNet Team',
     '{"skill_type": "general", "display_name": "指标告警", "icon": "📈", "entry_point": "skills/metric_alerter/main.py",
       "inputs": [{"name": "metric_query", "type": "string", "description": "PromQL 查询表达式", "required": true}],
       "outputs": [{"name": "alert_status", "type": "string"}, {"name": "prediction", "type": "object"}, {"name": "recommendations", "type": "array"}],
       "permissions": {"network_access": true, "file_system_read": false, "file_system_write": false, "timeout_seconds": 45}
     }'::jsonb, 'local', 'skills/metric_alerter/', 'active',
     '{"skill_type": "general"}'::jsonb),

    ('change-reviewer', '0.9.0',
     '变更单自动审核，检查回滚方案完整性和变更窗口合规性',
     'ResolveNet Team',
     '{"skill_type": "general", "display_name": "变更审核", "icon": "🔍", "entry_point": "skills/change_reviewer/main.py",
       "inputs": [{"name": "change_request", "type": "object", "description": "变更申请单内容", "required": true}],
       "outputs": [{"name": "risk_level", "type": "string"}, {"name": "compliance_check", "type": "object"}, {"name": "approval_suggestion", "type": "string"}],
       "permissions": {"network_access": false, "file_system_read": true, "file_system_write": false, "timeout_seconds": 30}
     }'::jsonb, 'local', 'skills/change_reviewer/', 'active',
     '{"skill_type": "general"}'::jsonb),

    ('hello-world', '0.1.0',
     '技能框架验证用的基础测试技能',
     'ResolveNet Team',
     '{"skill_type": "general", "display_name": "测试技能", "icon": "👋", "entry_point": "skills/hello_world/main.py",
       "inputs": [{"name": "message", "type": "string", "description": "输入消息", "required": true}],
       "outputs": [{"name": "reply", "type": "string"}],
       "permissions": {"network_access": false, "file_system_read": false, "file_system_write": false, "timeout_seconds": 10}
     }'::jsonb, 'local', 'skills/hello_world/', 'active',
     '{"skill_type": "general"}'::jsonb),

    -- ─── Scenario Skills ───
    ('k8s-pod-crash', '1.0.0',
     'Kubernetes Pod CrashLoopBackOff 场景化排查，自动采集事件/日志/资源状态并输出结构化排查方案',
     'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "K8s Pod 崩溃排查", "icon": "🔥", "entry_point": "skills/k8s_pod_crash/skill.py",
       "domain": "kubernetes", "tags": ["k8s", "pod", "crash", "oom", "crashloopbackoff"],
       "inputs": [{"name": "namespace", "type": "string", "required": true}, {"name": "pod_name", "type": "string", "required": true}],
       "outputs": [{"name": "structured_solution", "type": "object"}, {"name": "severity", "type": "string"}, {"name": "root_cause", "type": "string"}],
       "permissions": {"network_access": true, "file_system_read": true, "file_system_write": false, "timeout_seconds": 120}
     }'::jsonb, 'local', 'skills/k8s_pod_crash/', 'active',
     '{"skill_type": "scenario", "domain": "kubernetes", "tags": ["k8s","pod","crash","oom"]}'::jsonb),

    ('rds-replication-lag', '0.8.0',
     'RDS MySQL 主从复制延迟诊断，检测复制线程状态、慢查询阻塞及网络延迟',
     'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "RDS 复制延迟诊断", "icon": "🗄️", "entry_point": "skills/rds_replication_lag/skill.py",
       "domain": "database", "tags": ["rds", "mysql", "replication", "lag", "slave"],
       "inputs": [{"name": "instance_id", "type": "string", "required": true}, {"name": "region", "type": "string", "required": true}],
       "outputs": [{"name": "structured_solution", "type": "object"}, {"name": "replication_delay", "type": "number"}],
       "permissions": {"network_access": true, "file_system_read": false, "file_system_write": false, "timeout_seconds": 90}
     }'::jsonb, 'local', 'skills/rds_replication_lag/', 'active',
     '{"skill_type": "scenario", "domain": "database", "tags": ["rds","mysql","replication","lag"]}'::jsonb),

    -- ─── Kudig Scenario Skills ───
    ('SKILL-NODE-001', '1.0', 'Node NotReady 是 Kubernetes 集群中爆炸半径最大的故障类型之一。当节点进入 NotReady 状态时，Kubernetes 控制平面将在 pod-eviction-timeout 后开始驱逐该节点上的所有非 DaemonSet Pod', 'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "节点 NotReady 诊断与修复", "icon": "🖥️", "domain": "node", "tags": ["NotReady", "NodeNotReady", "节点不可用", "kubelet"]}'::jsonb, 'kudig', NULL, 'active',
     '{"skill_type": "scenario", "domain": "node"}'::jsonb),

    ('SKILL-POD-001', '1.0', 'CrashLoopBackOff 和 OOMKilled 是生产环境中最常见的 Pod 级别故障', 'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "Pod CrashLoopBackOff 与 OOMKilled 诊断", "icon": "💥", "domain": "pod", "tags": ["CrashLoopBackOff", "OOMKilled", "容器崩溃", "exit code 137"]}'::jsonb, 'kudig', NULL, 'active',
     '{"skill_type": "scenario", "domain": "pod"}'::jsonb),

    ('SKILL-POD-002', '1.0', 'Pod Pending 状态表示容器无法被调度到节点，可能由于资源不足、节点选择器不匹配、污点等原因导致', 'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "Pod Pending 诊断与修复", "icon": "⏳", "domain": "pod", "tags": ["Pending", "Pod Pending", "调度失败", "unschedulable"]}'::jsonb, 'kudig', NULL, 'active',
     '{"skill_type": "scenario", "domain": "pod"}'::jsonb),

    ('SKILL-NET-001', '1.0', 'DNS 解析失败是 Kubernetes 网络故障中最常见的问题之一。CoreDNS 是集群内服务发现的核心组件', 'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "DNS 解析失败诊断", "icon": "🌐", "domain": "network", "tags": ["DNS", "CoreDNS", "resolved", "域名解析"]}'::jsonb, 'kudig', NULL, 'active',
     '{"skill_type": "scenario", "domain": "network"}'::jsonb),

    ('SKILL-NET-002', '1.0', 'Service 连通性故障可能由 Endpoints 不健康、kube-proxy 异常、网络策略阻止或 CNI 故障引起', 'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "Service 连通性故障诊断", "icon": "🔗", "domain": "network", "tags": ["Service", "连通性", "Endpoints", "Connection refused"]}'::jsonb, 'kudig', NULL, 'active',
     '{"skill_type": "scenario", "domain": "network"}'::jsonb),

    ('SKILL-SEC-001', '1.0', '证书过期是生产环境中导致服务不可用的常见原因。kubelet、apiserver、etcd 之间的 TLS 证书过期会导致组件无法通信', 'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "证书过期诊断与修复", "icon": "🔐", "domain": "security", "tags": ["Certificate", "TLS", "证书过期", "expired"]}'::jsonb, 'kudig', NULL, 'active',
     '{"skill_type": "scenario", "domain": "security"}'::jsonb),

    ('SKILL-STORE-001', '1.0', 'PVC 存储故障可能由 StorageClass 配置错误、CSI driver 异常、节点存储满或 PVC/PV 绑定问题引起', 'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "PVC 存储故障诊断", "icon": "💾", "domain": "storage", "tags": ["PVC", "Storage", "PersistentVolume", "挂载失败"]}'::jsonb, 'kudig', NULL, 'active',
     '{"skill_type": "scenario", "domain": "storage"}'::jsonb),

    ('SKILL-WORK-001', '1.0', 'Deployment Rollout 失败可能由于镜像拉取错误、资源配额不足、探针配置错误或 Readiness 失败导致', 'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "Deployment Rollout 失败诊断", "icon": "🚀", "domain": "workload", "tags": ["Deployment", "Rollout", "ImagePullBackOff", "探针"]}'::jsonb, 'kudig', NULL, 'active',
     '{"skill_type": "scenario", "domain": "workload"}'::jsonb),

    ('SKILL-SEC-002', '1.0', 'RBAC/Quota 故障包括 ServiceAccount 权限不足、RoleBinding 缺失、ResourceQuota 或 LimitRange 限制导致的工作负载无法创建', 'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "RBAC/Quota 故障诊断", "icon": "👮", "domain": "security", "tags": ["RBAC", "Quota", "权限", "Forbidden", "ResourceQuota"]}'::jsonb, 'kudig', NULL, 'active',
     '{"skill_type": "scenario", "domain": "security"}'::jsonb),

    ('SKILL-IMAGE-001', '1.0', '镜像拉取失败可能由于镜像不存在、registry 认证失败、网络不通或节点缺少镜像拉取权限导致', 'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "镜像拉取失败诊断", "icon": "📦", "domain": "image", "tags": ["ImagePullBackOff", "ErrImagePull", "registry", "镜像拉取"]}'::jsonb, 'kudig', NULL, 'active',
     '{"skill_type": "scenario", "domain": "image"}'::jsonb),

    ('SKILL-CP-001', '1.0', '控制平面故障包括 etcd 集群异常、kube-apiserver 不可用、kube-controller-manager 或 kube-scheduler 异常', 'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "控制平面故障诊断", "icon": "⚙️", "domain": "control-plane", "tags": ["etcd", "apiserver", "control-plane", "controlplane"]}'::jsonb, 'kudig', NULL, 'active',
     '{"skill_type": "scenario", "domain": "control-plane"}'::jsonb),

    ('SKILL-SCALE-001', '1.0', '自动扩缩容故障包括 HPA/VPA/CA 无法正常工作，可能由于指标采集失败、资源瓶颈或副本数达到上限导致', 'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "自动扩缩容故障诊断", "icon": "📈", "domain": "scaling", "tags": ["HPA", "VPA", "Autoscaling", "扩缩容", "replicas"]}'::jsonb, 'kudig', NULL, 'active',
     '{"skill_type": "scenario", "domain": "scaling"}'::jsonb),

    ('SKILL-NET-003', '1.0', 'Ingress/Gateway 故障可能由于 Ingress Controller 异常、域名解析问题、证书问题或后端服务不可达导致', 'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "Ingress/Gateway 故障诊断", "icon": "🚪", "domain": "network", "tags": ["Ingress", "Gateway", "nginx", "域名"]}'::jsonb, 'kudig', NULL, 'active',
     '{"skill_type": "scenario", "domain": "network"}'::jsonb),

    ('SKILL-CONFIG-001', '1.0', 'ConfigMap/Secret 故障包括配置未同步、Secret 缺失、挂载路径错误或 ConfigMap 变更未触发 Pod 更新', 'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "ConfigMap/Secret 故障诊断", "icon": "📋", "domain": "configuration", "tags": ["ConfigMap", "Secret", "配置", "挂载"]}'::jsonb, 'kudig', NULL, 'active',
     '{"skill_type": "scenario", "domain": "configuration"}'::jsonb),

    ('SKILL-MONITOR-001', '1.0', '监控告警故障包括 Prometheus 采集失败、Alertmanager 通知异常、指标数据缺失或告警规则配置错误', 'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "监控告警故障诊断", "icon": "📉", "domain": "observability", "tags": ["Prometheus", "Alertmanager", "告警", "metrics"]}'::jsonb, 'kudig', NULL, 'active',
     '{"skill_type": "scenario", "domain": "observability"}'::jsonb),

    ('SKILL-LOG-001', '1.0', '日志采集故障包括日志丢失、采集延迟、日志格式解析错误或日志后端存储异常', 'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "日志采集故障诊断", "icon": "📝", "domain": "observability", "tags": ["Logging", "日志", "FluentBit", "SLS"]}'::jsonb, 'kudig', NULL, 'active',
     '{"skill_type": "scenario", "domain": "observability"}'::jsonb),

    ('SKILL-PERF-001', '1.0', '性能瓶颈诊断包括 CPU 节流、内存泄漏、IO 延迟高、网络带宽饱和或存储吞吐不足', 'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "性能瓶颈诊断", "icon": "⚡", "domain": "performance", "tags": ["CPU", "Memory", "IO", "Performance", "瓶颈", "Throttling"]}'::jsonb, 'kudig', NULL, 'active',
     '{"skill_type": "scenario", "domain": "performance"}'::jsonb),

    ('SKILL-SEC-003', '1.0', '安全事件响应包括未授权访问检测、异常行为分析、漏洞利用排查和安全事件遏制', 'ResolveNet Team',
     '{"skill_type": "scenario", "display_name": "安全事件响应", "icon": "🛡️", "domain": "security", "tags": ["Security", "Incident", "Vulnerability", "安全事件"]}'::jsonb, 'kudig', NULL, 'active',
     '{"skill_type": "scenario", "domain": "security"}'::jsonb)
ON CONFLICT (name) DO UPDATE SET
    version = EXCLUDED.version,
    description = EXCLUDED.description,
    manifest = EXCLUDED.manifest,
    status = EXCLUDED.status,
    labels = EXCLUDED.labels;
