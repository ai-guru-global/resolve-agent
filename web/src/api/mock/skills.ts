import type { Skill } from '../client';
import type { ScenarioConfig, SkillDetailInfo } from '../../types';

// ─── Skills ───
export const mockSkills: Skill[] = [
  { name: 'ticket-handler', version: '1.2.0', description: '自动分析运维工单，提取关键信息，评估优先级，生成处理建议', status: 'enabled', skill_type: 'general' },
  { name: 'consulting-qa', version: '1.1.0', description: '基于阿里云产品文档和最佳实践的智能问答，覆盖 ECS/ACK/RDS/OSS 等', status: 'enabled', skill_type: 'general' },
  { name: 'log-analyzer', version: '2.0.1', description: '多源日志聚合分析，支持 SLS、Kafka、文件日志的模式识别和异常检测', status: 'enabled', skill_type: 'general' },
  { name: 'metric-alerter', version: '1.0.3', description: '基于 Prometheus 指标的智能告警，支持动态阈值和趋势预测', status: 'enabled', skill_type: 'general' },
  { name: 'change-reviewer', version: '0.9.0', description: '变更单自动审核，检查回滚方案完整性和变更窗口合规性', status: 'enabled', skill_type: 'general' },
  { name: 'hello-world', version: '0.1.0', description: '技能框架验证用的基础测试技能', status: 'deprecated', skill_type: 'general' },
  { name: 'k8s-pod-crash', version: '1.0.0', description: 'Kubernetes Pod CrashLoopBackOff 场景化排查，自动采集事件/日志/资源状态并输出结构化排查方案', status: 'enabled', skill_type: 'scenario', domain: 'kubernetes', tags: ['k8s', 'pod', 'crash', 'oom'] },
  { name: 'rds-replication-lag', version: '0.8.0', description: 'RDS MySQL 主从复制延迟诊断，检测复制线程状态、慢查询阻塞及网络延迟', status: 'enabled', skill_type: 'scenario', domain: 'database', tags: ['rds', 'mysql', 'replication', 'lag'] },
  // Kudig topic-skills (scenario-type, imported from kudig-database)
  { name: 'SKILL-NODE-001', version: '1.0', description: 'Node NotReady 是 Kubernetes 集群中爆炸半径最大的故障类型之一。当节点进入 NotReady 状态时，Kubernetes 控制平面将在 pod-eviction-timeout 后开始驱逐该节点上的所有非 DaemonSet Pod', status: 'enabled', skill_type: 'scenario', domain: 'node', tags: ['NotReady', 'NodeNotReady', '节点不可用', 'kubelet'] },
  { name: 'SKILL-POD-001', version: '1.0', description: 'CrashLoopBackOff 和 OOMKilled 是生产环境中最常见的 Pod 级别故障。CrashLoopBackOff: 容器反复退出，kubelet 以指数退避策略不断尝试重启容器。OOMKilled: Linux 内核的 OOM Killer 终止了容器进程', status: 'enabled', skill_type: 'scenario', domain: 'pod', tags: ['CrashLoopBackOff', 'OOMKilled', '容器崩溃', 'exit code 137'] },
  { name: 'SKILL-POD-002', version: '1.0', description: 'Pod Pending 状态表示容器无法被调度到节点，可能由于资源不足、节点选择器不匹配、污点等原因导致', status: 'enabled', skill_type: 'scenario', domain: 'pod', tags: ['Pending', 'Pod Pending', '调度失败', 'unschedulable'] },
  { name: 'SKILL-NET-001', version: '1.0', description: 'DNS 解析失败是 Kubernetes 网络故障中最常见的问题之一。CoreDNS 是集群内服务发现的核心组件，DNS 解析异常会导致服务间无法通信', status: 'enabled', skill_type: 'scenario', domain: 'network', tags: ['DNS', 'CoreDNS', 'resolved', '域名解析'] },
  { name: 'SKILL-NET-002', version: '1.0', description: 'Service 连通性故障可能由 Endpoints 不健康、kube-proxy 异常、网络策略阻止或 CNI 故障引起', status: 'enabled', skill_type: 'scenario', domain: 'network', tags: ['Service', '连同性', 'Endpoints', 'Connection refused'] },
  { name: 'SKILL-SEC-001', version: '1.0', description: '证书过期是生产环境中导致服务不可用的常见原因。kubelet、apiserver、etcd 之间的 TLS 证书过期会导致组件无法通信', status: 'enabled', skill_type: 'scenario', domain: 'security', tags: ['Certificate', 'TLS', '证书过期', 'expired'] },
  { name: 'SKILL-STORE-001', version: '1.0', description: 'PVC 存储故障可能由 StorageClass 配置错误、CSI driver 异常、节点存储满或 PVC/PV 绑定问题引起', status: 'enabled', skill_type: 'scenario', domain: 'storage', tags: ['PVC', 'Storage', 'PersistentVolume', '挂载失败'] },
  { name: 'SKILL-WORK-001', version: '1.0', description: 'Deployment Rollout 失败可能由于镜像拉取错误、资源配额不足、探针配置错误或 Readiness 失败导致', status: 'enabled', skill_type: 'scenario', domain: 'workload', tags: ['Deployment', 'Rollout', 'ImagePullBackOff', '探针'] },
  { name: 'SKILL-SEC-002', version: '1.0', description: 'RBAC/Quota 故障包括 ServiceAccount 权限不足、RoleBinding 缺失、ResourceQuota 或 LimitRange 限制导致的工作负载无法创建', status: 'enabled', skill_type: 'scenario', domain: 'security', tags: ['RBAC', 'Quota', '权限', 'Forbidden', 'ResourceQuota'] },
  { name: 'SKILL-IMAGE-001', version: '1.0', description: '镜像拉取失败可能由于镜像不存在、registry 认证失败、网络不通或节点缺少镜像拉取权限导致', status: 'enabled', skill_type: 'scenario', domain: 'image', tags: ['ImagePullBackOff', 'ErrImagePull', 'registry', '镜像拉取'] },
  { name: 'SKILL-CP-001', version: '1.0', description: '控制平面故障包括 etcd 集群异常、kube-apiserver 不可用、kube-controller-manager 或 kube-scheduler 异常，可能导致集群范围的服务中断', status: 'disabled', skill_type: 'scenario', domain: 'control-plane', tags: ['etcd', 'apiserver', 'control-plane', 'controlplane'] },
  { name: 'SKILL-SCALE-001', version: '1.0', description: '自动扩缩容故障包括 HPA/VPA/CA 无法正常工作，可能由于指标采集失败、资源瓶颈或副本数达到上限导致', status: 'enabled', skill_type: 'scenario', domain: 'scaling', tags: ['HPA', 'VPA', 'Autoscaling', '扩缩容', 'replicas'] },
  { name: 'SKILL-NET-003', version: '1.0', description: 'Ingress/Gateway 故障可能由于 Ingress Controller 异常、域名解析问题、证书问题或后端服务不可达导致', status: 'enabled', skill_type: 'scenario', domain: 'network', tags: ['Ingress', 'Gateway', 'nginx', '域名'] },
  { name: 'SKILL-CONFIG-001', version: '1.0', description: 'ConfigMap/Secret 故障包括配置未同步、Secret 缺失、挂载路径错误或 ConfigMap 变更未触发 Pod 更新', status: 'enabled', skill_type: 'scenario', domain: 'configuration', tags: ['ConfigMap', 'Secret', '配置', '挂载'] },
  { name: 'SKILL-MONITOR-001', version: '1.0', description: '监控告警故障包括 Prometheus 采集失败、Alertmanager 通知异常、指标数据缺失或告警规则配置错误', status: 'enabled', skill_type: 'scenario', domain: 'observability', tags: ['Prometheus', 'Alertmanager', '告警', 'metrics'] },
  { name: 'SKILL-LOG-001', version: '1.0', description: '日志采集故障包括日志丢失、采集延迟、日志格式解析错误或日志后端存储异常', status: 'enabled', skill_type: 'scenario', domain: 'observability', tags: ['Logging', '日志', 'FluentBit', 'SLS'] },
  { name: 'SKILL-PERF-001', version: '1.0', description: '性能瓶颈诊断包括 CPU 节流、内存泄漏、IO 延迟高、网络带宽饱和或存储吞吐不足', status: 'enabled', skill_type: 'scenario', domain: 'performance', tags: ['CPU', 'Memory', 'IO', 'Performance', '瓶颈', 'Throttling'] },
  { name: 'SKILL-SEC-003', version: '1.0', description: '安全事件响应包括未授权访问检测、异常行为分析、漏洞利用排查和安全事件遏制', status: 'enabled', skill_type: 'scenario', domain: 'security', tags: ['Security', 'Incident', 'Vulnerability', '安全事件'] },
];

export const generatedSkillDisplayNames: Record<string, string> = {
  'SKILL-NODE-001': '节点 NotReady 诊断与修复',
  'SKILL-POD-001': 'Pod CrashLoopBackOff 与 OOMKilled 诊断',
  'SKILL-POD-002': 'Pod Pending 诊断与修复',
  'SKILL-NET-001': 'DNS 解析失败诊断',
  'SKILL-NET-002': 'Service 连通性故障诊断',
  'SKILL-SEC-001': '证书过期诊断与修复',
  'SKILL-STORE-001': 'PVC 存储故障诊断',
  'SKILL-WORK-001': 'Deployment Rollout 失败诊断',
  'SKILL-SEC-002': 'RBAC/Quota 故障诊断',
  'SKILL-IMAGE-001': '镜像拉取失败诊断',
  'SKILL-CP-001': '控制平面故障诊断',
  'SKILL-SCALE-001': '自动扩缩容故障诊断',
  'SKILL-NET-003': 'Ingress/Gateway 故障诊断',
  'SKILL-CONFIG-001': 'ConfigMap/Secret 故障诊断',
  'SKILL-MONITOR-001': '监控告警故障诊断',
  'SKILL-LOG-001': '日志采集故障诊断',
  'SKILL-PERF-001': '性能瓶颈诊断',
  'SKILL-SEC-003': '安全事件响应',
};

export const generatedSkillIcons: Record<string, string> = {
  'SKILL-NODE-001': '🖥️',
  'SKILL-POD-001': '💥',
  'SKILL-POD-002': '⏳',
  'SKILL-NET-001': '🌐',
  'SKILL-NET-002': '🔗',
  'SKILL-SEC-001': '🔐',
  'SKILL-STORE-001': '💾',
  'SKILL-WORK-001': '🚀',
  'SKILL-SEC-002': '👮',
  'SKILL-IMAGE-001': '📦',
  'SKILL-CP-001': '⚙️',
  'SKILL-SCALE-001': '📈',
  'SKILL-NET-003': '🚪',
  'SKILL-CONFIG-001': '📋',
  'SKILL-MONITOR-001': '📉',
  'SKILL-LOG-001': '📝',
  'SKILL-PERF-001': '⚡',
  'SKILL-SEC-003': '🛡️',
};

export function formatSkillDisplayName(name: string): string {
  if (generatedSkillDisplayNames[name]) {
    return generatedSkillDisplayNames[name];
  }

  if (name.startsWith('SKILL-')) {
    return name.replace(/^SKILL-/, '').replace(/-/g, ' ');
  }

  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function inferSkillLevel(executionCount: number): number {
  return Math.min(10, Math.max(1, Math.floor(executionCount / 120) + 1));
}

export function inferExperiencePoints(executionCount: number): number {
  return executionCount * 15 + 120;
}

export function createScenarioFlow(skill: Skill): ScenarioConfig['troubleshooting_flow'] {
  const domain = skill.domain ?? 'general';
  const tags = skill.tags ?? [];

  return [
    {
      id: `${skill.name}-collect-context`,
      name: '收集上下文',
      description: `收集 ${domain} 场景的基础上下文、日志与事件信息`,
      step_type: 'collect',
      command: null,
      skill_ref: 'log-analyzer',
      expected_output: 'context_bundle',
      condition: null,
      timeout_seconds: 20,
      order: 1,
    },
    {
      id: `${skill.name}-diagnose-signal`,
      name: '诊断关键异常',
      description: `结合标签 ${tags.join(' / ') || 'default'} 分析关键异常信号`,
      step_type: 'diagnose',
      command: null,
      skill_ref: 'metric-alerter',
      expected_output: 'diagnosis_report',
      condition: null,
      timeout_seconds: 15,
      order: 2,
    },
    {
      id: `${skill.name}-recommend-action`,
      name: '生成修复建议',
      description: '输出结构化修复建议、优先级和回归验证要点',
      step_type: 'action',
      command: null,
      skill_ref: 'ticket-handler',
      expected_output: 'resolution_plan',
      condition: null,
      timeout_seconds: 10,
      order: 3,
    },
  ];
}

export function buildSkillDetailFromList(skill: Skill): SkillDetailInfo {
  const executionCount = 80 + skill.name.length * 17;
  const level = inferSkillLevel(executionCount);
  const experiencePoints = inferExperiencePoints(executionCount);

  return {
    name: skill.name,
    display_name: formatSkillDisplayName(skill.name),
    version: skill.version,
    description: skill.description,
    status: skill.status,
    author: 'ResolveNet Team',
    icon: generatedSkillIcons[skill.name] ?? '⚡',
    entry_point: `skills/${skill.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}/skill.py`,
    skill_type: skill.skill_type ?? 'general',
    scenario_config: skill.skill_type === 'scenario'
      ? {
          domain: skill.domain ?? 'general',
          tags: skill.tags ?? [],
          troubleshooting_flow: createScenarioFlow(skill),
          output_template: {
            include_symptoms: true,
            include_evidence: true,
            include_steps: true,
            include_resolution: true,
            custom_sections: ['影响范围评估', '回归验证清单'],
          },
          severity_levels: ['low', 'medium', 'high', 'critical'],
        }
      : undefined,
    inputs: skill.skill_type === 'scenario'
      ? [
          { name: 'target', type: 'string', description: '待排查对象标识', required: true },
          { name: 'namespace', type: 'string', description: '相关命名空间或服务空间', required: false },
        ]
      : [
          { name: 'input', type: 'string', description: '技能输入内容', required: true },
          { name: 'context', type: 'object', description: '附加上下文', required: false },
        ],
    outputs: skill.skill_type === 'scenario'
      ? [
          { name: 'root_cause', type: 'string', description: '诊断出的根因', required: false },
          { name: 'resolution_plan', type: 'object', description: '结构化修复方案', required: false },
        ]
      : [
          { name: 'result', type: 'string', description: '技能执行结果', required: false },
          { name: 'metadata', type: 'object', description: '执行元数据', required: false },
        ],
    permissions: {
      network_access: skill.skill_type === 'scenario',
      file_system_read: true,
      file_system_write: false,
      timeout_seconds: skill.skill_type === 'scenario' ? 90 : 30,
    },
    install_date: '2026-08-01T08:00:00Z',
    last_executed: `2026-08-${25 + (skill.name.length % 7)}T09:30:00Z`,
    execution_count: executionCount,
    level,
    experience_points: experiencePoints,
    next_level_experience: experiencePoints + 500,
  };
}

// ─── Skill Details ───
export const mockSkillDetails: Record<string, SkillDetailInfo> = {
  'ticket-handler': {
    name: 'ticket-handler',
    display_name: '工单处理',
    version: '1.2.0',
    description: '自动分析运维工单，提取关键信息，评估优先级，生成处理建议',
    status: 'enabled',
    author: 'ResolveNet Team',
    icon: '🎫',
    entry_point: 'skills/ticket_handler/main.py',
    skill_type: 'general',
    inputs: [
      { name: 'ticket_content', type: 'string', description: '工单内容描述', required: true },
      { name: 'action', type: 'string', description: '操作类型: analyze | summarize | suggest', required: true },
      { name: 'context', type: 'object', description: '附加上下文信息', required: false },
    ],
    outputs: [
      { name: 'result', type: 'string', description: '处理结果', required: false },
      { name: 'component', type: 'string', description: '涉及组件', required: false },
      { name: 'priority', type: 'string', description: '优先级评估', required: false },
    ],
    permissions: {
      network_access: true,
      file_system_read: true,
      file_system_write: false,
      timeout_seconds: 30,
    },
    install_date: '2026-07-01T08:00:00Z',
    last_executed: '2026-08-30T09:12:00Z',
    execution_count: 1247,
  },
  'consulting-qa': {
    name: 'consulting-qa',
    display_name: '咨询问答',
    version: '1.1.0',
    description: '基于阿里云产品文档和最佳实践的智能问答，覆盖 ECS/ACK/RDS/OSS 等',
    status: 'enabled',
    author: 'ResolveNet Team',
    icon: '💬',
    entry_point: 'skills/consulting_qa/main.py',
    skill_type: 'general',
    inputs: [
      { name: 'question', type: 'string', description: '用户提问', required: true },
      { name: 'category', type: 'string', description: '问题分类', required: false },
    ],
    outputs: [
      { name: 'answer', type: 'string', description: '回答内容', required: false },
      { name: 'confidence', type: 'number', description: '置信度', required: false },
      { name: 'sources', type: 'array', description: '参考来源', required: false },
    ],
    permissions: {
      network_access: false,
      file_system_read: true,
      file_system_write: false,
      timeout_seconds: 15,
    },
    install_date: '2026-07-02T10:00:00Z',
    last_executed: '2026-08-30T08:45:00Z',
    execution_count: 892,
  },
  'log-analyzer': {
    name: 'log-analyzer',
    display_name: '日志分析',
    version: '2.0.1',
    description: '多源日志聚合分析，支持 SLS、Kafka、文件日志的模式识别和异常检测',
    status: 'enabled',
    author: 'ResolveNet Team',
    icon: '📊',
    entry_point: 'skills/log_analyzer/main.py',
    skill_type: 'general',
    inputs: [
      { name: 'log_source', type: 'string', description: '日志来源 (SLS project/logstore 或文件路径)', required: true },
      { name: 'time_range', type: 'string', description: '时间范围 (如 "1h", "6h", "1d")', required: true },
      { name: 'pattern', type: 'string', description: '匹配模式或关键字', required: false },
    ],
    outputs: [
      { name: 'anomalies', type: 'array', description: '检测到的异常列表', required: false },
      { name: 'summary', type: 'string', description: '分析摘要', required: false },
      { name: 'severity', type: 'string', description: '严重程度 (info/warning/error/critical)', required: false },
    ],
    permissions: {
      network_access: true,
      file_system_read: true,
      file_system_write: false,
      timeout_seconds: 60,
    },
    install_date: '2026-07-05T14:00:00Z',
    last_executed: '2026-08-29T09:30:00Z',
    execution_count: 2156,
  },
  'metric-alerter': {
    name: 'metric-alerter',
    display_name: '指标告警',
    version: '1.0.3',
    description: '基于 Prometheus 指标的智能告警，支持动态阈值和趋势预测',
    status: 'enabled',
    author: 'ResolveNet Team',
    icon: '📈',
    entry_point: 'skills/metric_alerter/main.py',
    skill_type: 'general',
    inputs: [
      { name: 'metric_query', type: 'string', description: 'PromQL 查询表达式', required: true },
      { name: 'threshold_config', type: 'object', description: '阈值配置 (静态/动态)', required: true },
      { name: 'window', type: 'string', description: '检测时间窗口', required: false },
    ],
    outputs: [
      { name: 'alert_status', type: 'string', description: '告警状态 (normal/warning/critical)', required: false },
      { name: 'prediction', type: 'object', description: '趋势预测结果', required: false },
      { name: 'recommendations', type: 'array', description: '优化建议', required: false },
    ],
    permissions: {
      network_access: true,
      file_system_read: false,
      file_system_write: false,
      timeout_seconds: 45,
    },
    install_date: '2026-07-08T09:00:00Z',
    last_executed: '2026-08-29T09:00:00Z',
    execution_count: 3421,
  },
  'change-reviewer': {
    name: 'change-reviewer',
    display_name: '变更审核',
    version: '0.9.0',
    description: '变更单自动审核，检查回滚方案完整性和变更窗口合规性',
    status: 'enabled',
    author: 'ResolveNet Team',
    icon: '🔍',
    entry_point: 'skills/change_reviewer/main.py',
    skill_type: 'general',
    inputs: [
      { name: 'change_request', type: 'object', description: '变更申请单内容', required: true },
      { name: 'rollback_plan', type: 'string', description: '回滚方案描述', required: true },
      { name: 'change_window', type: 'string', description: '变更窗口时间', required: false },
    ],
    outputs: [
      { name: 'risk_level', type: 'string', description: '风险等级 (low/medium/high/critical)', required: false },
      { name: 'compliance_check', type: 'object', description: '合规检查结果', required: false },
      { name: 'approval_suggestion', type: 'string', description: '审批建议', required: false },
    ],
    permissions: {
      network_access: false,
      file_system_read: true,
      file_system_write: false,
      timeout_seconds: 30,
    },
    install_date: '2026-07-10T11:00:00Z',
    last_executed: '2026-08-27T18:30:00Z',
    execution_count: 156,
  },
  'hello-world': {
    name: 'hello-world',
    display_name: '测试技能',
    version: '0.1.0',
    description: '技能框架验证用的基础测试技能',
    status: 'deprecated',
    author: 'ResolveNet Team',
    icon: '👋',
    entry_point: 'skills/hello_world/main.py',
    skill_type: 'general',
    inputs: [
      { name: 'message', type: 'string', description: '输入消息', required: true },
    ],
    outputs: [
      { name: 'reply', type: 'string', description: '回复消息', required: false },
    ],
    permissions: {
      network_access: false,
      file_system_read: false,
      file_system_write: false,
      timeout_seconds: 10,
    },
    install_date: '2026-06-20T16:00:00Z',
    last_executed: '2026-08-25T15:00:00Z',
    execution_count: 42,
  },
  'k8s-pod-crash': {
    name: 'k8s-pod-crash',
    display_name: 'K8s Pod 崩溃排查',
    version: '1.0.0',
    description: 'Kubernetes Pod CrashLoopBackOff 场景化排查，自动采集事件/日志/资源状态并输出结构化排查方案',
    status: 'enabled',
    author: 'ResolveNet Team',
    icon: '🔥',
    entry_point: 'skills/k8s_pod_crash/skill.py',
    skill_type: 'scenario',
    scenario_config: {
      domain: 'kubernetes',
      tags: ['k8s', 'pod', 'crash', 'oom', 'crashloopbackoff'],
      troubleshooting_flow: [
        { id: 'collect-pod-events', name: '采集 Pod 事件', description: '获取 Pod 相关的 Kubernetes Events', step_type: 'collect', command: 'kubectl get events --field-selector involvedObject.name={pod_name} -n {namespace}', skill_ref: 'log-analyzer', expected_output: 'events_json', condition: null, timeout_seconds: 15, order: 1 },
        { id: 'collect-container-status', name: '采集容器状态', description: '获取 Pod 中各容器的运行状态和重启次数', step_type: 'collect', command: 'kubectl get pod {pod_name} -n {namespace} -o json', skill_ref: 'log-analyzer', expected_output: 'container_statuses', condition: null, timeout_seconds: 10, order: 2 },
        { id: 'diagnose-exit-code', name: '诊断退出码', description: '分析容器退出码，判断 OOM / 应用错误 / 信号终止', step_type: 'diagnose', command: null, skill_ref: 'metric-alerter', expected_output: 'exit_code_diagnosis', condition: null, timeout_seconds: 5, order: 3 },
        { id: 'collect-resource-usage', name: '采集资源用量', description: '获取 Pod 实际 CPU / Memory 使用情况', step_type: 'collect', command: 'kubectl top pod {pod_name} -n {namespace}', skill_ref: 'log-analyzer', expected_output: 'resource_metrics', condition: null, timeout_seconds: 15, order: 4 },
        { id: 'collect-logs', name: '采集容器日志', description: '拉取最近重启周期的容器日志 (含 previous)', step_type: 'collect', command: 'kubectl logs {pod_name} -n {namespace} --previous --tail=200', skill_ref: 'log-analyzer', expected_output: 'container_logs', condition: null, timeout_seconds: 20, order: 5 },
        { id: 'diagnose-oom', name: '诊断 OOM', description: '判断是否因 memory limits 不足导致 OOMKilled', step_type: 'diagnose', command: null, skill_ref: 'metric-alerter', expected_output: 'oom_diagnosis', condition: 'exit_code == 137', timeout_seconds: 5, order: 6 },
        { id: 'verify-resource-limits', name: '校验资源配置', description: '比较实际用量与 requests/limits 配置是否合理', step_type: 'verify', command: null, skill_ref: 'metric-alerter', expected_output: 'resource_verification', condition: null, timeout_seconds: 5, order: 7 },
        { id: 'action-recommend', name: '生成修复建议', description: '综合所有诊断信息，生成结构化修复方案', step_type: 'action', command: null, skill_ref: 'ticket-handler', expected_output: 'structured_solution', condition: null, timeout_seconds: 10, order: 8 },
      ],
      output_template: { include_symptoms: true, include_evidence: true, include_steps: true, include_resolution: true, custom_sections: ['影响范围评估', '容量与资源配置建议', '回归验证清单'] },
      severity_levels: ['low', 'medium', 'high', 'critical'],
    },
    inputs: [
      { name: 'namespace', type: 'string', description: 'Kubernetes 命名空间', required: true },
      { name: 'pod_name', type: 'string', description: '目标 Pod 名称', required: true },
      { name: 'container_name', type: 'string', description: '容器名称 (多容器 Pod 时指定)', required: false },
    ],
    outputs: [
      { name: 'structured_solution', type: 'object', description: '结构化排查方案 (四要素)', required: false },
      { name: 'severity', type: 'string', description: '问题严重程度', required: false },
      { name: 'root_cause', type: 'string', description: '根因分类', required: false },
    ],
    permissions: {
      network_access: true,
      file_system_read: true,
      file_system_write: false,
      timeout_seconds: 120,
    },
    install_date: '2026-08-01T10:00:00Z',
    last_executed: '2026-08-31T08:30:00Z',
    execution_count: 89,
  },
  'rds-replication-lag': {
    name: 'rds-replication-lag',
    display_name: 'RDS 复制延迟诊断',
    version: '0.8.0',
    description: 'RDS MySQL 主从复制延迟诊断，检测复制线程状态、慢查询阻塞及网络延迟',
    status: 'enabled',
    author: 'ResolveNet Team',
    icon: '🗄️',
    entry_point: 'skills/rds_replication_lag/skill.py',
    skill_type: 'scenario',
    scenario_config: {
      domain: 'database',
      tags: ['rds', 'mysql', 'replication', 'lag', 'slave'],
      troubleshooting_flow: [
        { id: 'check-slave-status', name: '检查从库状态', description: '执行 SHOW SLAVE STATUS 获取复制线程状态', step_type: 'collect', command: 'SHOW SLAVE STATUS', skill_ref: 'log-analyzer', expected_output: 'slave_status', condition: null, timeout_seconds: 10, order: 1 },
        { id: 'check-slow-queries', name: '检查慢查询', description: '查询是否存在长事务或大批量 DML 阻塞复制', step_type: 'collect', command: 'SELECT * FROM information_schema.processlist WHERE time > 10', skill_ref: 'log-analyzer', expected_output: 'slow_queries', condition: null, timeout_seconds: 10, order: 2 },
        { id: 'diagnose-thread-state', name: '诊断线程状态', description: '分析 IO Thread 和 SQL Thread 是否正常运行', step_type: 'diagnose', command: null, skill_ref: 'metric-alerter', expected_output: 'thread_diagnosis', condition: null, timeout_seconds: 5, order: 3 },
        { id: 'check-network-latency', name: '检查网络延迟', description: '测试主从实例间的网络延迟', step_type: 'collect', command: null, skill_ref: 'log-analyzer', expected_output: 'network_latency', condition: null, timeout_seconds: 15, order: 4 },
        { id: 'action-recommend', name: '生成修复建议', description: '综合诊断结果，生成修复方案', step_type: 'action', command: null, skill_ref: 'ticket-handler', expected_output: 'structured_solution', condition: null, timeout_seconds: 10, order: 5 },
      ],
      output_template: { include_symptoms: true, include_evidence: true, include_steps: true, include_resolution: true, custom_sections: ['主从拓扑健康摘要', '回归验证清单'] },
      severity_levels: ['low', 'medium', 'high', 'critical'],
    },
    inputs: [
      { name: 'instance_id', type: 'string', description: 'RDS 实例 ID', required: true },
      { name: 'region', type: 'string', description: '地域', required: true },
    ],
    outputs: [
      { name: 'structured_solution', type: 'object', description: '结构化排查方案 (四要素)', required: false },
      { name: 'replication_delay', type: 'number', description: '当前复制延迟秒数', required: false },
    ],
    permissions: {
      network_access: true,
      file_system_read: false,
      file_system_write: false,
      timeout_seconds: 90,
    },
    install_date: '2026-08-05T14:00:00Z',
    last_executed: '2026-08-28T16:20:00Z',
    execution_count: 34,
  },
};

for (const skill of mockSkills) {
  if (!mockSkillDetails[skill.name]) {
    mockSkillDetails[skill.name] = buildSkillDetailFromList(skill);
  }
}
