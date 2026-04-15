/**
 * Database Schema Definition
 * 从 scripts/migration/ 下 8 个迁移文件逐字段转录
 */

// ─── Type Definitions ───

export interface ColumnDef {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  primaryKey?: boolean;
  unique?: boolean;
  description: string;
}

export interface ForeignKeyDef {
  column: string;
  referencesTable: string;
  referencesColumn: string;
  onDelete: string;
}

export interface IndexDef {
  name: string;
  columns: string[];
  condition?: string;
}

export interface TableDef {
  name: string;
  displayName: string;
  description: string;
  migration: string;
  columns: ColumnDef[];
  foreignKeys: ForeignKeyDef[];
  indexes: IndexDef[];
  mockData: Record<string, unknown>[];
}

export interface TableGroup {
  label: string;
  color: string;
  tables: TableDef[];
}

// ─── Helper ───

function col(
  name: string,
  type: string,
  nullable: boolean,
  description: string,
  opts?: { default?: string; primaryKey?: boolean; unique?: boolean },
): ColumnDef {
  return { name, type, nullable, description, ...opts };
}

// ═════════════════════════════════════════════════════════════════
// Migration 001: Core Registry
// ═════════════════════════════════════════════════════════════════

const agents: TableDef = {
  name: 'agents',
  displayName: 'Agent 注册表',
  description: '存储所有 Agent 实例的注册信息，包括配置、元数据和运行状态',
  migration: '001_init',
  columns: [
    col('id', 'UUID', false, '主键', { primaryKey: true, default: 'uuid_generate_v4()' }),
    col('name', 'VARCHAR(255)', false, 'Agent 唯一名称', { unique: true }),
    col('display_name', 'VARCHAR(255)', true, '展示名称'),
    col('description', 'TEXT', true, '描述信息'),
    col('version', 'VARCHAR(50)', false, '版本号', { default: "'0.1.0'" }),
    col('status', 'VARCHAR(50)', false, '运行状态', { default: "'inactive'" }),
    col('config', 'JSONB', false, '配置信息', { default: "'{}'" }),
    col('metadata', 'JSONB', false, '元数据', { default: "'{}'" }),
    col('created_at', 'TIMESTAMPTZ', false, '创建时间', { default: 'NOW()' }),
    col('updated_at', 'TIMESTAMPTZ', false, '更新时间', { default: 'NOW()' }),
  ],
  foreignKeys: [],
  indexes: [
    { name: 'idx_agents_name', columns: ['name'] },
    { name: 'idx_agents_status', columns: ['status'] },
  ],
  mockData: [
    { id: 'a1b2c3d4-0001-4000-8000-000000000001', name: 'ack-cluster-ops', display_name: 'ACK 集群运维助手', description: '专注于阿里云 ACK 容器服务的运维助手', version: '0.6.0', status: 'active', config: { model: 'qwen-max', max_tokens: 4096 }, metadata: { region: 'cn-hangzhou' }, created_at: '2026-03-01T08:00:00Z', updated_at: '2026-04-08T09:12:00Z' },
    { id: 'a1b2c3d4-0002-4000-8000-000000000002', name: 'fta-engine', display_name: '故障根因分析引擎', description: '基于 FTA 方法论的根因定位引擎', version: '0.6.0', status: 'active', config: { model: 'qwen-plus', auto_execute: true }, metadata: {}, created_at: '2026-03-05T10:30:00Z', updated_at: '2026-04-07T14:30:00Z' },
    { id: 'a1b2c3d4-0003-4000-8000-000000000003', name: 'rag-qa', display_name: '运维知识问答', description: '基于 RAG 语义检索的运维知识问答助手', version: '0.6.0', status: 'active', config: { model: 'qwen-turbo', top_k: 5 }, metadata: {}, created_at: '2026-03-10T14:00:00Z', updated_at: '2026-04-08T09:00:00Z' },
  ],
};

const skills: TableDef = {
  name: 'skills',
  displayName: 'Skills 注册表',
  description: '存储所有可用 Skill 的定义、版本和 Manifest 元数据',
  migration: '001_init',
  columns: [
    col('id', 'UUID', false, '主键', { primaryKey: true, default: 'uuid_generate_v4()' }),
    col('name', 'VARCHAR(255)', false, 'Skill 唯一名称', { unique: true }),
    col('display_name', 'VARCHAR(255)', true, '展示名称'),
    col('description', 'TEXT', true, '描述信息'),
    col('version', 'VARCHAR(50)', false, '版本号', { default: "'0.1.0'" }),
    col('skill_type', 'VARCHAR(50)', true, '技能类型 (general/scenario)'),
    col('domain', 'VARCHAR(100)', true, '场景领域'),
    col('tags', 'TEXT[]', true, '关键词标签'),
    col('category', 'VARCHAR(100)', true, '分类'),
    col('manifest', 'JSONB', false, 'Manifest 元数据', { default: "'{}'" }),
    col('status', 'VARCHAR(50)', false, '状态', { default: "'inactive'" }),
    col('created_at', 'TIMESTAMPTZ', false, '创建时间', { default: 'NOW()' }),
    col('updated_at', 'TIMESTAMPTZ', false, '更新时间', { default: 'NOW()' }),
  ],
  foreignKeys: [],
  indexes: [
    { name: 'idx_skills_name', columns: ['name'] },
    { name: 'idx_skills_category', columns: ['category'] },
    { name: 'idx_skills_skill_type', columns: ['skill_type'] },
    { name: 'idx_skills_domain', columns: ['domain'] },
  ],
  mockData: [
    { id: 'b2c3d4e5-0001-4000-8000-000000000001', name: 'ticket-handler', display_name: '工单处理', description: '自动分析运维工单，评估优先级', version: '1.2.0', skill_type: 'general', domain: 'ops', tags: ['ticket', 'ops'], category: 'ops', manifest: { entry_point: 'skills/ticket_handler/main.py' }, status: 'installed', created_at: '2026-03-01T08:00:00Z', updated_at: '2026-04-08T09:12:00Z' },
    { id: 'b2c3d4e5-0002-4000-8000-000000000002', name: 'log-analyzer', display_name: '日志分析', description: '多源日志聚合分析与异常检测', version: '2.0.1', skill_type: 'general', domain: 'analysis', tags: ['log', 'analysis'], category: 'analysis', manifest: { entry_point: 'skills/log_analyzer/main.py' }, status: 'installed', created_at: '2026-03-05T14:00:00Z', updated_at: '2026-04-08T09:30:00Z' },
    // Kudig topic-skills (scenario-type)
    { id: 'b2c3d4e5-0003-4000-8000-000000000003', name: 'SKILL-NODE-001', display_name: '节点 NotReady 诊断与修复', description: 'Node NotReady 是 Kubernetes 集群中爆炸半径最大的故障类型之一', version: '1.0', skill_type: 'scenario', domain: 'node', tags: ['NotReady', 'NodeNotReady', 'kubelet'], category: 'node', manifest: { trigger_keywords: ['NotReady', 'NodeNotReady', '节点不可用'], trigger_events: ['NodeNotReady', 'NodeStatusUnknown'], source_uri: 'https://github.com/kudig-io/kudig-database/topic-skills/01-node-notready.md' }, status: 'installed', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { id: 'b2c3d4e5-0004-4000-8000-000000000004', name: 'SKILL-POD-001', display_name: 'Pod CrashLoopBackOff & OOMKilled 诊断', description: 'CrashLoopBackOff 和 OOMKilled 是生产环境中最常见的 Pod 级别故障', version: '1.0', skill_type: 'scenario', domain: 'pod', tags: ['CrashLoopBackOff', 'OOMKilled', 'exit code 137'], category: 'pod', manifest: { trigger_keywords: ['CrashLoopBackOff', 'OOMKilled', '容器崩溃'], source_uri: 'https://github.com/kudig-io/kudig-database/topic-skills/02-pod-crashloop-oomkilled.md' }, status: 'installed', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { id: 'b2c3d4e5-0005-4000-8000-000000000005', name: 'SKILL-POD-002', display_name: 'Pod Pending 诊断与修复', description: 'Pod Pending 状态表示容器无法被调度到节点', version: '1.0', skill_type: 'scenario', domain: 'pod', tags: ['Pending', '调度失败', 'unschedulable'], category: 'pod', manifest: { trigger_keywords: ['Pending', 'Pod Pending'], source_uri: 'https://github.com/kudig-io/kudig-database/topic-skills/03-pod-pending.md' }, status: 'installed', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { id: 'b2c3d4e5-0006-4000-8000-000000000006', name: 'SKILL-NET-001', display_name: 'DNS 解析失败诊断', description: 'DNS 解析失败是 Kubernetes 网络故障中最常见的问题之一', version: '1.0', skill_type: 'scenario', domain: 'network', tags: ['DNS', 'CoreDNS', '域名解析'], category: 'network', manifest: { trigger_keywords: ['DNS', 'CoreDNS', '域名解析'], source_uri: 'https://github.com/kudig-io/kudig-database/topic-skills/04-dns-resolution-failure.md' }, status: 'installed', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { id: 'b2c3d4e5-0007-4000-8000-000000000007', name: 'SKILL-NET-002', display_name: 'Service 连通性故障诊断', description: 'Service 连通性故障可能由 Endpoints 不健康、kube-proxy 异常等引起', version: '1.0', skill_type: 'scenario', domain: 'network', tags: ['Service', '连通性', 'Endpoints'], category: 'network', manifest: { trigger_keywords: ['Service', '连同性', 'Connection refused'], source_uri: 'https://github.com/kudig-io/kudig-database/topic-skills/05-service-connectivity.md' }, status: 'installed', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { id: 'b2c3d4e5-0008-4000-8000-000000000008', name: 'SKILL-SEC-001', display_name: '证书过期诊断与修复', description: '证书过期是导致服务不可用的常见原因', version: '1.0', skill_type: 'scenario', domain: 'security', tags: ['Certificate', 'TLS', '证书过期'], category: 'security', manifest: { trigger_keywords: ['Certificate', 'TLS', '证书过期'], source_uri: 'https://github.com/kudig-io/kudig-database/topic-skills/06-certificate-expiry.md' }, status: 'installed', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { id: 'b2c3d4e5-0009-4000-8000-000000000009', name: 'SKILL-STORE-001', display_name: 'PVC 存储故障诊断', description: 'PVC 存储故障可能由 StorageClass 配置错误、CSI driver 异常等引起', version: '1.0', skill_type: 'scenario', domain: 'storage', tags: ['PVC', 'Storage', 'PersistentVolume'], category: 'storage', manifest: { trigger_keywords: ['PVC', 'Storage', '挂载失败'], source_uri: 'https://github.com/kudig-io/kudig-database/topic-skills/07-pvc-storage-failure.md' }, status: 'installed', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { id: 'b2c3d4e5-0010-4000-8000-000000000010', name: 'SKILL-WORK-001', display_name: 'Deployment Rollout 失败诊断', description: 'Deployment Rollout 失败可能由于镜像拉取错误、资源配额不足等导致', version: '1.0', skill_type: 'scenario', domain: 'workload', tags: ['Deployment', 'Rollout', 'ImagePullBackOff'], category: 'workload', manifest: { trigger_keywords: ['Deployment', 'Rollout', 'ImagePullBackOff'], source_uri: 'https://github.com/kudig-io/kudig-database/topic-skills/08-deployment-rollout-failure.md' }, status: 'installed', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { id: 'b2c3d4e5-0011-4000-8000-000000000011', name: 'SKILL-SEC-002', display_name: 'RBAC/Quota 故障诊断', description: 'RBAC/Quota 故障包括 ServiceAccount 权限不足、RoleBinding 缺失等', version: '1.0', skill_type: 'scenario', domain: 'security', tags: ['RBAC', 'Quota', 'Forbidden'], category: 'security', manifest: { trigger_keywords: ['RBAC', 'Quota', 'Forbidden'], source_uri: 'https://github.com/kudig-io/kudig-database/topic-skills/09-rbac-quota-failure.md' }, status: 'installed', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { id: 'b2c3d4e5-0012-4000-8000-000000000012', name: 'SKILL-IMAGE-001', display_name: '镜像拉取失败诊断', description: '镜像拉取失败可能由于镜像不存在、registry 认证失败等导致', version: '1.0', skill_type: 'scenario', domain: 'image', tags: ['ImagePullBackOff', 'ErrImagePull', 'registry'], category: 'image', manifest: { trigger_keywords: ['ImagePullBackOff', 'ErrImagePull', '镜像拉取'], source_uri: 'https://github.com/kudig-io/kudig-database/topic-skills/10-image-pull-failure.md' }, status: 'installed', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { id: 'b2c3d4e5-0013-4000-8000-000000000013', name: 'SKILL-CP-001', display_name: '控制平面故障诊断', description: '控制平面故障包括 etcd 集群异常、kube-apiserver 不可用等', version: '1.0', skill_type: 'scenario', domain: 'control-plane', tags: ['etcd', 'apiserver', 'control-plane'], category: 'control-plane', manifest: { trigger_keywords: ['etcd', 'apiserver', 'controlplane'], source_uri: 'https://github.com/kudig-io/kudig-database/topic-skills/11-control-plane-failure.md' }, status: 'installed', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { id: 'b2c3d4e5-0014-4000-8000-000000000014', name: 'SKILL-SCALE-001', display_name: '自动扩缩容故障诊断', description: 'HPA/VPA/CA 无法正常工作，可能由于指标采集失败等导致', version: '1.0', skill_type: 'scenario', domain: 'scaling', tags: ['HPA', 'VPA', 'Autoscaling', '扩缩容'], category: 'scaling', manifest: { trigger_keywords: ['HPA', 'VPA', 'Autoscaling'], source_uri: 'https://github.com/kudig-io/kudig-database/topic-skills/12-autoscaling-failure.md' }, status: 'installed', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { id: 'b2c3d4e5-0015-4000-8000-000000000015', name: 'SKILL-NET-003', display_name: 'Ingress/Gateway 故障诊断', description: 'Ingress/Gateway 故障可能由于 Ingress Controller 异常、域名解析问题等导致', version: '1.0', skill_type: 'scenario', domain: 'network', tags: ['Ingress', 'Gateway', 'nginx'], category: 'network', manifest: { trigger_keywords: ['Ingress', 'Gateway'], source_uri: 'https://github.com/kudig-io/kudig-database/topic-skills/13-ingress-gateway-failure.md' }, status: 'installed', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { id: 'b2c3d4e5-0016-4000-8000-000000000016', name: 'SKILL-CONFIG-001', display_name: 'ConfigMap/Secret 故障诊断', description: 'ConfigMap/Secret 故障包括配置未同步、Secret 缺失、挂载路径错误等', version: '1.0', skill_type: 'scenario', domain: 'configuration', tags: ['ConfigMap', 'Secret', '配置'], category: 'configuration', manifest: { trigger_keywords: ['ConfigMap', 'Secret', '配置'], source_uri: 'https://github.com/kudig-io/kudig-database/topic-skills/14-configmap-secret-failure.md' }, status: 'installed', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { id: 'b2c3d4e5-0017-4000-8000-000000000017', name: 'SKILL-MONITOR-001', display_name: '监控告警故障诊断', description: '监控告警故障包括 Prometheus 采集失败、Alertmanager 通知异常等', version: '1.0', skill_type: 'scenario', domain: 'observability', tags: ['Prometheus', 'Alertmanager', '告警'], category: 'observability', manifest: { trigger_keywords: ['Prometheus', 'Alertmanager', '告警'], source_uri: 'https://github.com/kudig-io/kudig-database/topic-skills/15-monitoring-alerting-failure.md' }, status: 'installed', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { id: 'b2c3d4e5-0018-4000-8000-000000000018', name: 'SKILL-LOG-001', display_name: '日志采集故障诊断', description: '日志采集故障包括日志丢失、采集延迟、日志格式解析错误等', version: '1.0', skill_type: 'scenario', domain: 'observability', tags: ['Logging', '日志', 'FluentBit'], category: 'observability', manifest: { trigger_keywords: ['Logging', '日志', 'FluentBit'], source_uri: 'https://github.com/kudig-io/kudig-database/topic-skills/16-logging-pipeline-failure.md' }, status: 'installed', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { id: 'b2c3d4e5-0019-4000-8000-000000000019', name: 'SKILL-PERF-001', display_name: '性能瓶颈诊断', description: '性能瓶颈诊断包括 CPU 节流、内存泄漏、IO 延迟高等', version: '1.0', skill_type: 'scenario', domain: 'performance', tags: ['CPU', 'Memory', 'IO', '瓶颈'], category: 'performance', manifest: { trigger_keywords: ['CPU', 'Memory', 'Performance', '瓶颈'], source_uri: 'https://github.com/kudig-io/kudig-database/topic-skills/17-performance-bottleneck.md' }, status: 'installed', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { id: 'b2c3d4e5-0020-4000-8000-000000000020', name: 'SKILL-SEC-003', display_name: '安全事件响应', description: '安全事件响应包括未授权访问检测、异常行为分析、漏洞利用排查等', version: '1.0', skill_type: 'scenario', domain: 'security', tags: ['Security', 'Incident', 'Vulnerability'], category: 'security', manifest: { trigger_keywords: ['Security', 'Incident', 'Vulnerability'], source_uri: 'https://github.com/kudig-io/kudig-database/topic-skills/18-security-incident-response.md' }, status: 'installed', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
  ],
};

const workflows: TableDef = {
  name: 'workflows',
  displayName: '工作流定义表',
  description: '存储工作流（主要为 FTA 故障树）的定义和版本信息',
  migration: '001_init',
  columns: [
    col('id', 'UUID', false, '主键', { primaryKey: true, default: 'uuid_generate_v4()' }),
    col('name', 'VARCHAR(255)', false, '工作流唯一名称', { unique: true }),
    col('display_name', 'VARCHAR(255)', true, '展示名称'),
    col('description', 'TEXT', true, '描述信息'),
    col('version', 'VARCHAR(50)', false, '版本号', { default: "'0.1.0'" }),
    col('workflow_type', 'VARCHAR(50)', false, '类型', { default: "'fta'" }),
    col('definition', 'JSONB', false, '工作流定义', { default: "'{}'" }),
    col('status', 'VARCHAR(50)', false, '状态', { default: "'draft'" }),
    col('created_at', 'TIMESTAMPTZ', false, '创建时间', { default: 'NOW()' }),
    col('updated_at', 'TIMESTAMPTZ', false, '更新时间', { default: 'NOW()' }),
  ],
  foreignKeys: [],
  indexes: [
    { name: 'idx_workflows_name', columns: ['name'] },
    { name: 'idx_workflows_type', columns: ['workflow_type'] },
  ],
  mockData: [
    { id: 'c3d4e5f6-0001-4000-8000-000000000001', name: 'k8s-node-notready', display_name: 'K8s 节点 NotReady 故障树', description: '基于节点状态和 kubelet 日志分析 NotReady 根因', version: '1.0.0', workflow_type: 'fta', definition: { top_event: 'node_notready' }, status: 'active', created_at: '2026-03-01T08:00:00Z', updated_at: '2026-04-05T14:30:00Z' },
    { id: 'c3d4e5f6-0002-4000-8000-000000000002', name: 'rds-replication-lag', display_name: 'RDS 主从同步延迟诊断', description: '分析 MySQL 主从同步延迟的根本原因', version: '1.0.0', workflow_type: 'fta', definition: { top_event: 'replication_lag' }, status: 'active', created_at: '2026-03-05T10:00:00Z', updated_at: '2026-04-03T09:00:00Z' },
    // Kudig topic-fta entries
    { id: 'c3d4e5f6-0003-4000-8000-000000000003', name: 'wf-kudig-node', display_name: 'Node 节点异常故障树', description: '覆盖节点不可用/不稳定的关键成因：节点状态、kubelet、运行时、系统资源、内核与网络、存储、证书与时间、控制面依赖', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/node-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0004-4000-8000-000000000004', name: 'wf-kudig-pod', display_name: 'Pod 异常故障树', description: '覆盖 Pod 启动、运行、终止阶段的异常：CrashLoopBackOff、OOMKilled、Pending、ImagePullBackOff', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/pod-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0005-4000-8000-000000000005', name: 'wf-kudig-apiserver', display_name: 'API Server 异常故障树', description: '覆盖 APIServer 不可用/性能劣化的关键成因：进程与配置、认证鉴权、请求排队与限流、依赖组件、证书与时间', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/apiserver-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0006-4000-8000-000000000006', name: 'wf-kudig-etcd', display_name: 'Etcd 异常故障树', description: '覆盖 Etcd 集群异常的关键成因：进程与资源、WAL 与快照、磁盘 IO、网络分区、leadership 变更', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/etcd-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0007-4000-8000-000000000007', name: 'wf-kudig-dns', display_name: 'DNS 解析异常故障树', description: '覆盖 CoreDNS 异常、DNS 解析失败的根本成因：Pod 层面、节点层面、集群层面、网络策略', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/dns-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0008-4000-8000-000000000008', name: 'wf-kudig-ingress', display_name: 'Ingress/Gateway 故障树', description: '覆盖 Ingress Controller 异常、域名解析问题、证书问题的故障路径', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/ingress-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0009-4000-8000-000000000009', name: 'wf-kudig-deployment', display_name: 'Deployment 异常故障树', description: '覆盖 Deployment Rollout 失败、ReplicaSet 不健康的根因：镜像拉取、资源配额、探针配置', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/deployment-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0010-4000-8000-000000000010', name: 'wf-kudig-statefulset', display_name: 'StatefulSet 异常故障树', description: '覆盖 StatefulSet 异常的根本成因：PVC 挂载、序号分配、headless Service', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/statefulset-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0011-4000-8000-000000000011', name: 'wf-kudig-daemonset', display_name: 'DaemonSet 异常故障树', description: '覆盖 DaemonSet Pod 调度失败或异常的根本成因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/daemonset-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0012-4000-8000-000000000012', name: 'wf-kudig-job', display_name: 'Job/CronJob 异常故障树', description: '覆盖 Job 失败、CronJob 未按计划执行的根本成因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/job-cronjob-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0013-4000-8000-000000000013', name: 'wf-kudig-hpa', display_name: 'HPA 扩缩容异常故障树', description: '覆盖 HPA 无法扩缩容、缩容到 0 或扩容失败的根因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/hpa-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0014-4000-8000-000000000014', name: 'wf-kudig-vpa', display_name: 'VPA 异常故障树', description: '覆盖 VPA 推荐值异常、更新失败的根因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/vpa-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0015-4000-8000-000000000015', name: 'wf-kudig-csi', display_name: 'CSI 存储异常故障树', description: '覆盖 PersistentVolume 挂载失败、CSI driver 异常的根因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/csi-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0016-4000-8000-000000000016', name: 'wf-kudig-rbac', display_name: 'RBAC 权限异常故障树', description: '覆盖 ServiceAccount 权限不足、RoleBinding/ClusterRoleBinding 配置错误的根因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/rbac-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0017-4000-8000-000000000017', name: 'wf-kudig-certificate', display_name: 'Certificate 证书异常故障树', description: '覆盖 kubelet/apiserver/etcd 证书过期或无效的根因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/certificate-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0018-4000-8000-000000000018', name: 'wf-kudig-scheduler', display_name: 'Scheduler 调度异常故障树', description: '覆盖 Pod 无法调度、调度延迟的根本成因：资源不足、亲和性冲突、污点', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/scheduler-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0019-4000-8000-000000000019', name: 'wf-kudig-controller', display_name: 'Controller Manager 异常故障树', description: '覆盖 kube-controller-manager 异常的根本成因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/controller-manager-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0020-4000-8000-000000000020', name: 'wf-kudig-monitoring', display_name: 'Monitoring 监控异常故障树', description: '覆盖 Prometheus 采集失败、Alertmanager 通知异常的根本成因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/monitoring-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0021-4000-8000-000000000021', name: 'wf-kudig-service', display_name: 'Service 连通性异常故障树', description: '覆盖 Service 无法访问、Endpoints 不健康的根本成因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/service-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0022-4000-8000-000000000022', name: 'wf-kudig-nodepool', display_name: 'NodePool 节点池异常故障树', description: '覆盖节点池扩缩容异常、节点加入失败的根因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/nodepool-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0023-4000-8000-000000000023', name: 'wf-kudig-pdb', display_name: 'PDB 驱散异常故障树', description: '覆盖 PodDisruptionBudget 导致驱逐失败或无法完成的根因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/pdb-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0024-4000-8000-000000000024', name: 'wf-kudig-autoscaler', display_name: 'Cluster Autoscaler 异常故障树', description: '覆盖 Cluster Autoscaler 无法扩容或缩容节点的根本成因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/cluster-autoscaler-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0025-4000-8000-000000000025', name: 'wf-kudig-cluster-upgrade', display_name: '集群升级异常故障树', description: '覆盖集群升级失败、节点升级过程中异常的根本成因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/cluster-upgrade-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0026-4000-8000-000000000026', name: 'wf-kudig-gateway', display_name: 'Gateway API 异常故障树', description: '覆盖 Gateway API 资源异常、HTTPRoute 绑定失败的根因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/gateway-api-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0027-4000-8000-000000000027', name: 'wf-kudig-service-mesh', display_name: 'Service Mesh Istio 异常故障树', description: '覆盖 Istio 网格内服务无法通信、Sidecar 注入异常的根因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/service-mesh-istio-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0028-4000-8000-000000000028', name: 'wf-kudig-gitops', display_name: 'GitOps ArgoCD 异常故障树', description: '覆盖 ArgoCD 同步失败、应用状态异常的根因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/gitops-argocd-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0029-4000-8000-000000000029', name: 'wf-kudig-gpu', display_name: 'GPU 节点异常故障树', description: '覆盖 GPU 节点不可用、DevicePlugin 异常的根因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/gpu-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0030-4000-8000-000000000030', name: 'wf-kudig-helm', display_name: 'Helm Release 异常故障树', description: '覆盖 Helm Release 升级失败、回滚异常的根本成因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/helm-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0031-4000-8000-000000000031', name: 'wf-kudig-crd', display_name: 'CRD/Operator 异常故障树', description: '覆盖 CustomResourceDefinition 异常、Operator 无法正常工作的根因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/crd-operator-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0032-4000-8000-000000000032', name: 'wf-kudig-networkpolicy', display_name: 'NetworkPolicy 异常故障树', description: '覆盖 NetworkPolicy 配置后流量不通的根本成因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/networkpolicy-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0033-4000-8000-000000000033', name: 'wf-kudig-psp', display_name: 'PSP/SCC 策略异常故障树', description: '覆盖 PodSecurityPolicy 或 SecurityContextConstraints 导致 Pod 创建失败的根因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/psp-scc-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0034-4000-8000-000000000034', name: 'wf-kudig-resourcequota', display_name: 'ResourceQuota 异常故障树', description: '覆盖 ResourceQuota/LimitRange 导致资源创建失败的根因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/resource-quota-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0035-4000-8000-000000000035', name: 'wf-kudig-webhook', display_name: 'Webhook Admission 异常故障树', description: '覆盖 MutatingWebhook/ValidatingWebhook 导致资源创建/更新失败的根因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/webhook-admission-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0036-4000-8000-000000000036', name: 'wf-kudig-backup', display_name: 'Backup/Restore 异常故障树', description: '覆盖 Velero 备份失败、恢复异常的根本成因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/backup-restore-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0037-4000-8000-000000000037', name: 'wf-kudig-cloudprovider', display_name: 'Cloud Provider 异常故障树', description: '覆盖阿里云/AWS/GCP 云厂商特定资源异常的根本成因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/cloud-provider-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c3d4e5f6-0038-4000-8000-000000000038', name: 'wf-kudig-terway', display_name: 'Terway CNI 异常故障树', description: '覆盖阿里云 Terway CNI 网络异常的根因', version: '1.0.0', workflow_type: 'fta', definition: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/terway-fta.md' }, status: 'active', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
  ],
};

const workflowExecutions: TableDef = {
  name: 'workflow_executions',
  displayName: '工作流执行记录',
  description: '记录每次工作流执行的状态、输入输出和错误信息',
  migration: '001_init',
  columns: [
    col('id', 'UUID', false, '主键', { primaryKey: true, default: 'uuid_generate_v4()' }),
    col('workflow_id', 'UUID', false, '关联工作流 ID (FK)'),
    col('status', 'VARCHAR(50)', false, '执行状态', { default: "'pending'" }),
    col('input', 'JSONB', false, '输入数据', { default: "'{}'" }),
    col('output', 'JSONB', true, '输出数据', { default: "'{}'" }),
    col('error', 'TEXT', true, '错误信息'),
    col('started_at', 'TIMESTAMPTZ', true, '开始时间'),
    col('completed_at', 'TIMESTAMPTZ', true, '完成时间'),
    col('created_at', 'TIMESTAMPTZ', false, '创建时间', { default: 'NOW()' }),
  ],
  foreignKeys: [
    { column: 'workflow_id', referencesTable: 'workflows', referencesColumn: 'id', onDelete: 'CASCADE' },
  ],
  indexes: [
    { name: 'idx_workflow_executions_workflow', columns: ['workflow_id'] },
    { name: 'idx_workflow_executions_status', columns: ['status'] },
  ],
  mockData: [
    { id: 'd4e5f6a7-0001-4000-8000-000000000001', workflow_id: 'c3d4e5f6-0001-4000-8000-000000000001', status: 'completed', input: { trigger: 'alert-node-notready-cn-hz-03' }, output: { root_cause: 'NetworkPolicy 误配置' }, error: null, started_at: '2026-04-08T08:15:00Z', completed_at: '2026-04-08T08:15:12Z', created_at: '2026-04-08T08:15:00Z' },
    { id: 'd4e5f6a7-0002-4000-8000-000000000002', workflow_id: 'c3d4e5f6-0002-4000-8000-000000000002', status: 'completed', input: { trigger: 'alert-rds-replication-lag' }, output: { root_cause: '大事务阻塞' }, error: null, started_at: '2026-04-07T16:20:00Z', completed_at: '2026-04-07T16:20:25Z', created_at: '2026-04-07T16:20:00Z' },
    { id: 'd4e5f6a7-0003-4000-8000-000000000003', workflow_id: 'c3d4e5f6-0001-4000-8000-000000000001', status: 'failed', input: { trigger: 'alert-ecs-cpu-high' }, output: {}, error: '无法连接到目标集群 API Server', started_at: '2026-04-07T22:10:00Z', completed_at: '2026-04-07T22:10:45Z', created_at: '2026-04-07T22:10:00Z' },
    // Kudig topic-fta executions
    { id: 'd4e5f6a7-0004-4000-8000-000000000004', workflow_id: 'c3d4e5f6-0003-4000-8000-000000000003', status: 'completed', input: { trigger: 'alert-node-notready-cn-hz-05' }, output: { root_cause: 'kubelet 进程 OOM 被 kill' }, error: null, started_at: '2026-04-12T14:20:00Z', completed_at: '2026-04-12T14:20:18Z', created_at: '2026-04-12T14:20:00Z' },
    { id: 'd4e5f6a7-0005-4000-8000-000000000005', workflow_id: 'c3d4e5f6-0004-4000-8000-000000000004', status: 'completed', input: { trigger: 'alert-pod-crashloop-cn-hz-01' }, output: { root_cause: 'OOMKilled — 容器内存限制 512Mi 不足' }, error: null, started_at: '2026-04-12T16:00:00Z', completed_at: '2026-04-12T16:00:31Z', created_at: '2026-04-12T16:00:00Z' },
    { id: 'd4e5f6a7-0006-4000-8000-000000000006', workflow_id: 'c3d4e5f6-0004-4000-8000-000000000004', status: 'completed', input: { trigger: 'alert-pod-crashloop-cn-sh-02' }, output: { root_cause: 'CrashLoopBackOff — exit code 1 应用启动脚本错误' }, error: null, started_at: '2026-04-11T10:30:00Z', completed_at: '2026-04-11T10:30:22Z', created_at: '2026-04-11T10:30:00Z' },
    { id: 'd4e5f6a7-0007-4000-8000-000000000007', workflow_id: 'c3d4e5f6-0005-4000-8000-000000000005', status: 'completed', input: { trigger: 'alert-apiserver-latency-high' }, output: { root_cause: 'etcd 写入延迟过高，磁盘 IO 瓶颈' }, error: null, started_at: '2026-04-11T09:00:00Z', completed_at: '2026-04-11T09:00:28Z', created_at: '2026-04-11T09:00:00Z' },
    { id: 'd4e5f6a7-0008-4000-8000-000000000008', workflow_id: 'c3d4e5f6-0006-4000-8000-000000000006', status: 'completed', input: { trigger: 'alert-etcd-leader-change' }, output: { root_cause: '网络抖动导致 leader 重新选举' }, error: null, started_at: '2026-04-10T22:30:00Z', completed_at: '2026-04-10T22:30:15Z', created_at: '2026-04-10T22:30:00Z' },
    { id: 'd4e5f6a7-0009-4000-8000-000000000009', workflow_id: 'c3d4e5f6-0007-4000-8000-000000000007', status: 'completed', input: { trigger: 'alert-dns-resolution-fail' }, output: { root_cause: 'CoreDNS Pod 被驱逐，coredns 配置丢失' }, error: null, started_at: '2026-04-12T10:15:00Z', completed_at: '2026-04-12T10:15:08Z', created_at: '2026-04-12T10:15:00Z' },
    { id: 'd4e5f6a7-0010-4000-8000-000000000010', workflow_id: 'c3d4e5f6-0007-4000-8000-000000000007', status: 'completed', input: { trigger: 'alert-dns-timeout' }, output: { root_cause: 'Node /etc/resolv.conf nameserver 配置被覆盖' }, error: null, started_at: '2026-04-11T08:45:00Z', completed_at: '2026-04-11T08:45:12Z', created_at: '2026-04-11T08:45:00Z' },
    { id: 'd4e5f6a7-0011-4000-8000-000000000011', workflow_id: 'c3d4e5f6-0008-4000-8000-000000000008', status: 'completed', input: { trigger: 'alert-ingress-5xx' }, output: { root_cause: 'Ingress Controller 证书过期' }, error: null, started_at: '2026-04-11T15:45:00Z', completed_at: '2026-04-11T15:45:19Z', created_at: '2026-04-11T15:45:00Z' },
    { id: 'd4e5f6a7-0012-4000-8000-000000000012', workflow_id: 'c3d4e5f6-0009-4000-8000-000000000009', status: 'completed', input: { trigger: 'alert-deploy-rollout-stuck' }, output: { root_cause: 'ImagePullBackOff — 私有镜像仓库认证过期' }, error: null, started_at: '2026-04-12T08:30:00Z', completed_at: '2026-04-12T08:30:42Z', created_at: '2026-04-12T08:30:00Z' },
    { id: 'd4e5f6a7-0013-4000-8000-000000000013', workflow_id: 'c3d4e5f6-0009-4000-8000-000000000009', status: 'completed', input: { trigger: 'alert-deploy-replicasset-unhealthy' }, output: { root_cause: 'liveness 探针连续失败 3 次，容器被重启' }, error: null, started_at: '2026-04-11T14:00:00Z', completed_at: '2026-04-11T14:00:25Z', created_at: '2026-04-11T14:00:00Z' },
    { id: 'd4e5f6a7-0014-4000-8000-000000000014', workflow_id: 'c3d4e5f6-0010-4000-8000-000000000010', status: 'completed', input: { trigger: 'alert-statefulset-pvc-pending' }, output: { root_cause: 'PVC 一直 Pending — 存储类不存在' }, error: null, started_at: '2026-04-10T16:20:00Z', completed_at: '2026-04-10T16:20:14Z', created_at: '2026-04-10T16:20:00Z' },
    { id: 'd4e5f6a7-0015-4000-8000-000000000015', workflow_id: 'c3d4e5f6-0011-4000-8000-000000000011', status: 'completed', input: { trigger: 'alert-daemonset-pod-not-scheduled' }, output: { root_cause: '节点污点 NoSchedule 未被 Pod 容忍' }, error: null, started_at: '2026-04-11T11:00:00Z', completed_at: '2026-04-11T11:00:09Z', created_at: '2026-04-11T11:00:00Z' },
    { id: 'd4e5f6a7-0016-4000-8000-000000000016', workflow_id: 'c3d4e5f6-0012-4000-8000-000000000012', status: 'completed', input: { trigger: 'alert-job-failed' }, output: { root_cause: '容器退出码 1 — 数据清洗脚本 SQL 语法错误' }, error: null, started_at: '2026-04-12T09:00:00Z', completed_at: '2026-04-12T09:00:18Z', created_at: '2026-04-12T09:00:00Z' },
    { id: 'd4e5f6a7-0017-4000-8000-000000000017', workflow_id: 'c3d4e5f6-0013-4000-8000-000000000013', status: 'completed', input: { trigger: 'alert-hpa-not-scaling' }, output: { root_cause: 'metrics-server 未运行，HPA 无法获取指标' }, error: null, started_at: '2026-04-11T14:30:00Z', completed_at: '2026-04-11T14:30:11Z', created_at: '2026-04-11T14:30:00Z' },
    { id: 'd4e5f6a7-0018-4000-8000-000000000018', workflow_id: 'c3d4e5f6-0014-4000-8000-000000000014', status: 'completed', input: { trigger: 'alert-vpa-update-failed' }, output: { root_cause: 'VPA 推荐值超出资源限制范围' }, error: null, started_at: '2026-04-10T12:00:00Z', completed_at: '2026-04-10T12:00:07Z', created_at: '2026-04-10T12:00:00Z' },
    { id: 'd4e5f6a7-0019-4000-8000-000000000019', workflow_id: 'c3d4e5f6-0015-4000-8000-000000000015', status: 'completed', input: { trigger: 'alert-pvc-attach-failed' }, output: { root_cause: 'CSI driver 插件异常退出，卷挂载失败' }, error: null, started_at: '2026-04-12T11:15:00Z', completed_at: '2026-04-12T11:15:22Z', created_at: '2026-04-12T11:15:00Z' },
    { id: 'd4e5f6a7-0020-4000-8000-000000000020', workflow_id: 'c3d4e5f6-0016-4000-8000-000000000016', status: 'completed', input: { trigger: 'alert-sa-permission-denied' }, output: { root_cause: 'RoleBinding 未绑定正确的 ClusterRole' }, error: null, started_at: '2026-04-11T16:00:00Z', completed_at: '2026-04-11T16:00:13Z', created_at: '2026-04-11T16:00:00Z' },
    { id: 'd4e5f6a7-0021-4000-8000-000000000021', workflow_id: 'c3d4e5f6-0017-4000-8000-000000000017', status: 'completed', input: { trigger: 'alert-kubelet-cert-expiring' }, output: { root_cause: 'kubelet 证书 30 天后过期，需手动续期' }, error: null, started_at: '2026-04-12T07:45:00Z', completed_at: '2026-04-12T07:45:09Z', created_at: '2026-04-12T07:45:00Z' },
    { id: 'd4e5f6a7-0022-4000-8000-000000000022', workflow_id: 'c3d4e5f6-0018-4000-8000-000000000018', status: 'completed', input: { trigger: 'alert-pod-unschedulable' }, output: { root_cause: 'CPU 资源不足，节点所有可用 CPU 被占满' }, error: null, started_at: '2026-04-11T13:20:00Z', completed_at: '2026-04-11T13:20:27Z', created_at: '2026-04-11T13:20:00Z' },
    { id: 'd4e5f6a7-0023-4000-8000-000000000023', workflow_id: 'c3d4e5f6-0018-4000-8000-000000000018', status: 'failed', input: { trigger: 'alert-pod-unschedulable-2' }, output: {}, error: '调度器无法连接 API Server', started_at: '2026-04-12T17:00:00Z', completed_at: '2026-04-12T17:00:30Z', created_at: '2026-04-12T17:00:00Z' },
    { id: 'd4e5f6a7-0024-4000-8000-000000000024', workflow_id: 'c3d4e5f6-0019-4000-8000-000000000019', status: 'completed', input: { trigger: 'alert-controller-manager-down' }, output: { root_cause: 'kube-controller-manager Pod 被OOMKill' }, error: null, started_at: '2026-04-10T20:00:00Z', completed_at: '2026-04-10T20:00:11Z', created_at: '2026-04-10T20:00:00Z' },
    { id: 'd4e5f6a7-0025-4000-8000-000000000025', workflow_id: 'c3d4e5f6-0020-4000-8000-000000000020', status: 'completed', input: { trigger: 'alert-prometheus-target-down' }, output: { root_cause: 'Prometheus 采集 target 超时，网络策略阻断' }, error: null, started_at: '2026-04-12T06:30:00Z', completed_at: '2026-04-12T06:30:19Z', created_at: '2026-04-12T06:30:00Z' },
    { id: 'd4e5f6a7-0026-4000-8000-000000000026', workflow_id: 'c3d4e5f6-0021-4000-8000-000000000021', status: 'completed', input: { trigger: 'alert-svc-endpoints-empty' }, output: { root_cause: 'Service selector 写错，匹配不到后端 Pod' }, error: null, started_at: '2026-04-11T10:00:00Z', completed_at: '2026-04-11T10:00:08Z', created_at: '2026-04-11T10:00:00Z' },
    { id: 'd4e5f6a7-0027-4000-8000-000000000027', workflow_id: 'c3d4e5f6-0021-4000-8000-000000000021', status: 'completed', input: { trigger: 'alert-svc-connection-refused' }, output: { root_cause: '后端 Pod 全部非 Ready，NetworkPolicy 阻断' }, error: null, started_at: '2026-04-12T13:30:00Z', completed_at: '2026-04-12T13:30:15Z', created_at: '2026-04-12T13:30:00Z' },
    { id: 'd4e5f6a7-0028-4000-8000-000000000028', workflow_id: 'c3d4e5f6-0022-4000-8000-000000000022', status: 'completed', input: { trigger: 'alert-nodepool-scale-fail' }, output: { root_cause: 'Cluster Autoscaler 无法扩容，云厂商配额不足' }, error: null, started_at: '2026-04-12T13:00:00Z', completed_at: '2026-04-12T13:00:22Z', created_at: '2026-04-12T13:00:00Z' },
    { id: 'd4e5f6a7-0029-4000-8000-000000000029', workflow_id: 'c3d4e5f6-0023-4000-8000-000000000023', status: 'completed', input: { trigger: 'alert-pdb-burst-allowed-0' }, output: { root_cause: 'PDB minAvailable 配置过高，阻断正常驱逐' }, error: null, started_at: '2026-04-11T08:15:00Z', completed_at: '2026-04-11T08:15:06Z', created_at: '2026-04-11T08:15:00Z' },
    { id: 'd4e5f6a7-0030-4000-8000-000000000030', workflow_id: 'c3d4e5f6-0024-4000-8000-000000000024', status: 'completed', input: { trigger: 'alert-autoscaler-scale-fail' }, output: { root_cause: 'Cluster Autoscaler 参数区域配置错误' }, error: null, started_at: '2026-04-12T15:30:00Z', completed_at: '2026-04-12T15:30:14Z', created_at: '2026-04-12T15:30:00Z' },
    { id: 'd4e5f6a7-0031-4000-8000-000000000031', workflow_id: 'c3d4e5f6-0025-4000-8000-000000000025', status: 'completed', input: { trigger: 'alert-cluster-upgrade-failed' }, output: { root_cause: '节点升级超时，控制面组件版本不兼容' }, error: null, started_at: '2026-04-11T22:00:00Z', completed_at: '2026-04-11T22:00:48Z', created_at: '2026-04-11T22:00:00Z' },
    { id: 'd4e5f6a7-0032-4000-8000-000000000032', workflow_id: 'c3d4e5f6-0026-4000-8000-000000000026', status: 'completed', input: { trigger: 'alert-gateway-route-conflict' }, output: { root_cause: 'HTTPRoute 绑定冲突，重复的 hostname' }, error: null, started_at: '2026-04-10T18:00:00Z', completed_at: '2026-04-10T18:00:11Z', created_at: '2026-04-10T18:00:00Z' },
    { id: 'd4e5f6a7-0033-4000-8000-000000000033', workflow_id: 'c3d4e5f6-0027-4000-8000-000000000027', status: 'completed', input: { trigger: 'alert-istio-sidecar-injection-fail' }, output: { root_cause: 'Sidecar 注入失败，namespace 标签配置错误' }, error: null, started_at: '2026-04-12T10:45:00Z', completed_at: '2026-04-12T10:45:17Z', created_at: '2026-04-12T10:45:00Z' },
    { id: 'd4e5f6a7-0034-4000-8000-000000000034', workflow_id: 'c3d4e5f6-0028-4000-8000-000000000028', status: 'completed', input: { trigger: 'alert-argocd-sync-failed' }, output: { root_cause: 'ArgoCD Image Updater 配置错误，镜像 Tag 不存在' }, error: null, started_at: '2026-04-11T20:30:00Z', completed_at: '2026-04-11T20:30:24Z', created_at: '2026-04-11T20:30:00Z' },
    { id: 'd4e5f6a7-0035-4000-8000-000000000035', workflow_id: 'c3d4e5f6-0029-4000-8000-000000000029', status: 'completed', input: { trigger: 'alert-gpu-device-plugin-fail' }, output: { root_cause: 'GPU 节点 DevicePlugin 注册失败，驱动版本不兼容' }, error: null, started_at: '2026-04-12T17:00:00Z', completed_at: '2026-04-12T17:00:31Z', created_at: '2026-04-12T17:00:00Z' },
    { id: 'd4e5f6a7-0036-4000-8000-000000000036', workflow_id: 'c3d4e5f6-0030-4000-8000-000000000030', status: 'completed', input: { trigger: 'alert-helm-release-fail' }, output: { root_cause: 'Helm Release values 参数类型错误' }, error: null, started_at: '2026-04-11T12:00:00Z', completed_at: '2026-04-11T12:00:19Z', created_at: '2026-04-11T12:00:00Z' },
    { id: 'd4e5f6a7-0037-4000-8000-000000000037', workflow_id: 'c3d4e5f6-0031-4000-8000-000000000031', status: 'completed', input: { trigger: 'alert-crd-conversion-fail' }, output: { root_cause: 'CRD conversion webhook 配置缺失' }, error: null, started_at: '2026-04-12T08:00:00Z', completed_at: '2026-04-12T08:00:12Z', created_at: '2026-04-12T08:00:00Z' },
    { id: 'd4e5f6a7-0038-4000-8000-000000000038', workflow_id: 'c3d4e5f6-0032-4000-8000-000000000032', status: 'completed', input: { trigger: 'alert-networkpolicy-pod-isolation' }, output: { root_cause: 'NetworkPolicy 默认 deny-all，未配置例外规则' }, error: null, started_at: '2026-04-11T17:30:00Z', completed_at: '2026-04-11T17:30:08Z', created_at: '2026-04-11T17:30:00Z' },
    { id: 'd4e5f6a7-0039-4000-8000-000000000039', workflow_id: 'c3d4e5f6-0033-4000-8000-000000000033', status: 'completed', input: { trigger: 'alert-psp-pod-rejected' }, output: { root_cause: 'PodSecurityPolicy 拒绝了 privileged 容器' }, error: null, started_at: '2026-04-10T14:00:00Z', completed_at: '2026-04-10T14:00:05Z', created_at: '2026-04-10T14:00:00Z' },
    { id: 'd4e5f6a7-0040-4000-8000-000000000040', workflow_id: 'c3d4e5f6-0034-4000-8000-000000000034', status: 'completed', input: { trigger: 'alert-quota-exceeded' }, output: { root_cause: 'Namespace CPU quota 耗尽，新 Pod 无法调度' }, error: null, started_at: '2026-04-11T09:45:00Z', completed_at: '2026-04-11T09:45:16Z', created_at: '2026-04-11T09:45:00Z' },
    { id: 'd4e5f6a7-0041-4000-8000-000000000041', workflow_id: 'c3d4e5f6-0035-4000-8000-000000000035', status: 'completed', input: { trigger: 'alert-webhook-cert-expired' }, output: { root_cause: 'MutatingWebhook 证书过期，请求被拒绝' }, error: null, started_at: '2026-04-12T12:00:00Z', completed_at: '2026-04-12T12:00:21Z', created_at: '2026-04-12T12:00:00Z' },
    { id: 'd4e5f6a7-0042-4000-8000-000000000042', workflow_id: 'c3d4e5f6-0036-4000-8000-000000000036', status: 'completed', input: { trigger: 'alert-velero-backup-failed' }, output: { root_cause: 'Velero s3 bucket 凭证过期' }, error: null, started_at: '2026-04-11T23:00:00Z', completed_at: '2026-04-11T23:00:14Z', created_at: '2026-04-11T23:00:00Z' },
    { id: 'd4e5f6a7-0043-4000-8000-000000000043', workflow_id: 'c3d4e5f6-0037-4000-8000-000000000037', status: 'completed', input: { trigger: 'alert-alibaba-cloud-api-throttling' }, output: { root_cause: '阿里云 API 调用频率超过限额' }, error: null, started_at: '2026-04-12T14:00:00Z', completed_at: '2026-04-12T14:00:09Z', created_at: '2026-04-12T14:00:00Z' },
    { id: 'd4e5f6a7-0044-4000-8000-000000000044', workflow_id: 'c3d4e5f6-0038-4000-8000-000000000038', status: 'completed', input: { trigger: 'alert-terway-eni ip-exhausted' }, output: { root_cause: 'Terway ENI IP 地址池耗尽' }, error: null, started_at: '2026-04-11T19:00:00Z', completed_at: '2026-04-11T19:00:18Z', created_at: '2026-04-11T19:00:00Z' },
  ],
};

const models: TableDef = {
  name: 'models',
  displayName: 'LLM 模型注册表',
  description: '存储 LLM 模型配置，包括提供商、参数限制和启用状态',
  migration: '001_init',
  columns: [
    col('id', 'UUID', false, '主键', { primaryKey: true, default: 'uuid_generate_v4()' }),
    col('model_id', 'VARCHAR(255)', false, '模型唯一标识', { unique: true }),
    col('provider', 'VARCHAR(100)', false, '模型提供商'),
    col('model_name', 'VARCHAR(255)', false, '模型名称'),
    col('max_tokens', 'INTEGER', false, '最大 Token 数', { default: '8192' }),
    col('default_temp', 'REAL', true, '默认温度', { default: '0.7' }),
    col('enabled', 'BOOLEAN', false, '是否启用', { default: 'true' }),
    col('config', 'JSONB', false, '扩展配置', { default: "'{}'" }),
    col('created_at', 'TIMESTAMPTZ', false, '创建时间', { default: 'NOW()' }),
    col('updated_at', 'TIMESTAMPTZ', false, '更新时间', { default: 'NOW()' }),
  ],
  foreignKeys: [],
  indexes: [
    { name: 'idx_models_provider', columns: ['provider'] },
  ],
  mockData: [
    { id: 'e5f6a7b8-0001-4000-8000-000000000001', model_id: 'qwen-plus', provider: '阿里云', model_name: '通义千问 Plus', max_tokens: 32768, default_temp: 0.7, enabled: true, config: {}, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    { id: 'e5f6a7b8-0002-4000-8000-000000000002', model_id: 'qwen-turbo', provider: '阿里云', model_name: '通义千问 Turbo', max_tokens: 8192, default_temp: 0.7, enabled: true, config: {}, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
    { id: 'e5f6a7b8-0003-4000-8000-000000000003', model_id: 'qwen-max', provider: '阿里云', model_name: '通义千问 Max', max_tokens: 32768, default_temp: 0.3, enabled: true, config: {}, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  ],
};

const auditLog: TableDef = {
  name: 'audit_log',
  displayName: '审计日志',
  description: '记录所有实体的操作审计追踪',
  migration: '001_init',
  columns: [
    col('id', 'BIGSERIAL', false, '自增主键', { primaryKey: true }),
    col('entity_type', 'VARCHAR(50)', false, '实体类型'),
    col('entity_id', 'UUID', false, '实体 ID'),
    col('action', 'VARCHAR(50)', false, '操作类型'),
    col('actor', 'VARCHAR(255)', true, '操作者'),
    col('details', 'JSONB', true, '详细信息', { default: "'{}'" }),
    col('created_at', 'TIMESTAMPTZ', false, '创建时间', { default: 'NOW()' }),
  ],
  foreignKeys: [],
  indexes: [
    { name: 'idx_audit_log_entity', columns: ['entity_type', 'entity_id'] },
    { name: 'idx_audit_log_created', columns: ['created_at'] },
  ],
  mockData: [
    { id: 1, entity_type: 'agent', entity_id: 'a1b2c3d4-0001-4000-8000-000000000001', action: 'create', actor: 'admin', details: { name: 'ack-cluster-ops' }, created_at: '2026-03-01T08:00:00Z' },
    { id: 2, entity_type: 'skill', entity_id: 'b2c3d4e5-0001-4000-8000-000000000001', action: 'install', actor: 'system', details: { version: '1.2.0' }, created_at: '2026-03-01T08:00:00Z' },
    { id: 3, entity_type: 'agent', entity_id: 'a1b2c3d4-0001-4000-8000-000000000001', action: 'update', actor: 'admin', details: { field: 'config', old_model: 'qwen-plus', new_model: 'qwen-max' }, created_at: '2026-03-15T10:00:00Z' },
  ],
};

// ═════════════════════════════════════════════════════════════════
// Migration 002: Hooks
// ═════════════════════════════════════════════════════════════════

const hooks: TableDef = {
  name: 'hooks',
  displayName: 'Hook 定义表',
  description: '生命周期 Hook 注册，支持 pre/post 执行、错误处理等触发点',
  migration: '002_hooks',
  columns: [
    col('id', 'UUID', false, '主键', { primaryKey: true, default: 'uuid_generate_v4()' }),
    col('name', 'VARCHAR(255)', false, 'Hook 唯一名称', { unique: true }),
    col('description', 'TEXT', true, '描述信息'),
    col('hook_type', 'VARCHAR(50)', false, 'Hook 类型 (pre/post/on_error)'),
    col('trigger_point', 'VARCHAR(100)', false, '触发点 (agent.execute, skill.invoke 等)'),
    col('target_id', 'VARCHAR(255)', true, '目标实体 ID'),
    col('execution_order', 'INTEGER', false, '执行顺序', { default: '0' }),
    col('handler_type', 'VARCHAR(50)', false, '处理器类型'),
    col('config', 'JSONB', false, '配置信息', { default: "'{}'" }),
    col('enabled', 'BOOLEAN', false, '是否启用', { default: 'true' }),
    col('labels', 'JSONB', true, '标签', { default: "'{}'" }),
    col('created_at', 'TIMESTAMPTZ', false, '创建时间', { default: 'NOW()' }),
    col('updated_at', 'TIMESTAMPTZ', false, '更新时间', { default: 'NOW()' }),
  ],
  foreignKeys: [],
  indexes: [],
  mockData: [
    { id: 'f6a7b8c9-0001-4000-8000-000000000001', name: 'execution-logger', description: '记录每次执行的追踪日志', hook_type: 'post_execution', trigger_point: 'agent.execute', target_id: null, execution_order: 0, handler_type: 'log_trace', config: {}, enabled: true, labels: {}, created_at: '2026-03-01T08:00:00Z', updated_at: '2026-03-01T08:00:00Z' },
    { id: 'f6a7b8c9-0002-4000-8000-000000000002', name: 'auto-retry', description: '错误时自动重试', hook_type: 'on_error', trigger_point: 'agent.execute', target_id: 'agent-mega-001', execution_order: 1, handler_type: 'auto_retry', config: { max_retries: 3 }, enabled: true, labels: {}, created_at: '2026-03-01T08:00:00Z', updated_at: '2026-03-05T10:00:00Z' },
  ],
};

const hookExecutions: TableDef = {
  name: 'hook_executions',
  displayName: 'Hook 执行记录',
  description: '记录每次 Hook 触发的执行详情、输入输出和持续时间',
  migration: '002_hooks',
  columns: [
    col('id', 'UUID', false, '主键', { primaryKey: true, default: 'uuid_generate_v4()' }),
    col('hook_id', 'UUID', false, '关联 Hook ID (FK)'),
    col('trigger_event', 'VARCHAR(100)', false, '触发事件'),
    col('target_entity_id', 'VARCHAR(255)', true, '目标实体 ID'),
    col('status', 'VARCHAR(50)', false, '执行状态', { default: "'pending'" }),
    col('input_data', 'JSONB', true, '输入数据', { default: "'{}'" }),
    col('output_data', 'JSONB', true, '输出数据', { default: "'{}'" }),
    col('error', 'TEXT', true, '错误信息'),
    col('duration_ms', 'INTEGER', true, '执行耗时 (ms)'),
    col('started_at', 'TIMESTAMPTZ', true, '开始时间'),
    col('completed_at', 'TIMESTAMPTZ', true, '完成时间'),
    col('created_at', 'TIMESTAMPTZ', false, '创建时间', { default: 'NOW()' }),
  ],
  foreignKeys: [
    { column: 'hook_id', referencesTable: 'hooks', referencesColumn: 'id', onDelete: 'CASCADE' },
  ],
  indexes: [],
  mockData: [
    { id: 'a7b8c9d0-0001-4000-8000-000000000001', hook_id: 'f6a7b8c9-0001-4000-8000-000000000001', trigger_event: 'agent.execute.completed', target_entity_id: 'agent-mega-001', status: 'completed', input_data: { execution_id: 'aexec-001' }, output_data: { logged: true }, error: null, duration_ms: 5, started_at: '2026-04-08T09:12:01Z', completed_at: '2026-04-08T09:12:01Z', created_at: '2026-04-08T09:12:01Z' },
    { id: 'a7b8c9d0-0002-4000-8000-000000000002', hook_id: 'f6a7b8c9-0002-4000-8000-000000000002', trigger_event: 'agent.execute.error', target_entity_id: 'agent-mega-006', status: 'completed', input_data: { error: 'API timeout' }, output_data: { retried: true, attempt: 2 }, error: null, duration_ms: 820, started_at: '2026-04-08T06:00:01Z', completed_at: '2026-04-08T06:00:02Z', created_at: '2026-04-08T06:00:01Z' },
  ],
};

// ═════════════════════════════════════════════════════════════════
// Migration 003: RAG Documents
// ═════════════════════════════════════════════════════════════════

const ragDocuments: TableDef = {
  name: 'rag_documents',
  displayName: 'RAG 文档表',
  description: 'RAG 文档元数据存储，向量数据由 Milvus/Qdrant 管理',
  migration: '003_rag_documents',
  columns: [
    col('id', 'UUID', false, '主键', { primaryKey: true, default: 'uuid_generate_v4()' }),
    col('collection_id', 'VARCHAR(255)', false, '所属集合 ID'),
    col('title', 'VARCHAR(512)', true, '文档标题'),
    col('source_uri', 'VARCHAR(1024)', true, '来源 URI'),
    col('content_hash', 'VARCHAR(128)', true, '内容哈希（去重）'),
    col('content_type', 'VARCHAR(100)', true, '内容类型'),
    col('chunk_count', 'INTEGER', true, '分块数量', { default: '0' }),
    col('vector_ids', 'TEXT[]', true, '关联向量 ID 列表'),
    col('metadata', 'JSONB', false, '元数据', { default: "'{}'" }),
    col('status', 'VARCHAR(50)', false, '状态', { default: "'pending'" }),
    col('size_bytes', 'BIGINT', true, '文件大小 (bytes)', { default: '0' }),
    col('created_at', 'TIMESTAMPTZ', false, '创建时间', { default: 'NOW()' }),
    col('updated_at', 'TIMESTAMPTZ', false, '更新时间', { default: 'NOW()' }),
  ],
  foreignKeys: [],
  indexes: [],
  mockData: [
    { id: 'b8c9d0e1-0001-4000-8000-000000000001', collection_id: 'col-ops-kb-001', title: 'ACK 集群升级操作手册.pdf', source_uri: 's3://docs/ack-upgrade.pdf', content_hash: 'sha256:abc123', content_type: 'application/pdf', chunk_count: 48, vector_ids: ['vec-001', 'vec-002', 'vec-003'], metadata: { author: 'SRE Team' }, status: 'indexed', size_bytes: 2456000, created_at: '2026-02-01T08:00:00Z', updated_at: '2026-03-15T10:00:00Z' },
    { id: 'b8c9d0e1-0002-4000-8000-000000000002', collection_id: 'col-ops-kb-002', title: 'INC-2024-0673 RDS 主从同步复盘.md', source_uri: 's3://docs/inc-0673.md', content_hash: 'sha256:def456', content_type: 'text/markdown', chunk_count: 12, vector_ids: ['vec-004', 'vec-005'], metadata: { incident_id: 'INC-2024-0673' }, status: 'indexed', size_bytes: 67000, created_at: '2026-02-20T16:00:00Z', updated_at: '2026-02-20T16:00:00Z' },
  ],
};

const ragIngestionHistory: TableDef = {
  name: 'rag_ingestion_history',
  displayName: 'RAG 摄取历史',
  description: '文档摄取过程的追踪记录，包括分块数、向量数和耗时',
  migration: '003_rag_documents',
  columns: [
    col('id', 'UUID', false, '主键', { primaryKey: true, default: 'uuid_generate_v4()' }),
    col('collection_id', 'VARCHAR(255)', false, '集合 ID'),
    col('document_id', 'UUID', true, '关联文档 ID (FK)'),
    col('action', 'VARCHAR(50)', false, '操作类型'),
    col('status', 'VARCHAR(50)', false, '状态', { default: "'pending'" }),
    col('chunks_processed', 'INTEGER', true, '已处理分块数', { default: '0' }),
    col('vectors_created', 'INTEGER', true, '已创建向量数', { default: '0' }),
    col('error', 'TEXT', true, '错误信息'),
    col('duration_ms', 'INTEGER', true, '耗时 (ms)'),
    col('metadata', 'JSONB', true, '元数据', { default: "'{}'" }),
    col('created_at', 'TIMESTAMPTZ', false, '创建时间', { default: 'NOW()' }),
  ],
  foreignKeys: [
    { column: 'document_id', referencesTable: 'rag_documents', referencesColumn: 'id', onDelete: 'SET NULL' },
  ],
  indexes: [],
  mockData: [
    { id: 'c9d0e1f2-0001-4000-8000-000000000001', collection_id: 'col-ops-kb-001', document_id: 'b8c9d0e1-0001-4000-8000-000000000001', action: 'ingest', status: 'completed', chunks_processed: 48, vectors_created: 48, error: null, duration_ms: 12500, metadata: { embedding_model: 'text-embedding-v2' }, created_at: '2026-02-01T08:05:00Z' },
    { id: 'c9d0e1f2-0002-4000-8000-000000000002', collection_id: 'col-ops-kb-002', document_id: 'b8c9d0e1-0002-4000-8000-000000000002', action: 'ingest', status: 'completed', chunks_processed: 12, vectors_created: 12, error: null, duration_ms: 3200, metadata: { embedding_model: 'text-embedding-v2' }, created_at: '2026-02-20T16:05:00Z' },
  ],
};

// ═════════════════════════════════════════════════════════════════
// Migration 004: FTA Documents
// ═════════════════════════════════════════════════════════════════

const ftaDocuments: TableDef = {
  name: 'fta_documents',
  displayName: 'FTA 文档表',
  description: '故障树分析文档，存储故障树定义和版本信息',
  migration: '004_fta_documents',
  columns: [
    col('id', 'UUID', false, '主键', { primaryKey: true, default: 'uuid_generate_v4()' }),
    col('workflow_id', 'VARCHAR(64)', true, '关联工作流 ID'),
    col('name', 'VARCHAR(255)', false, '文档名称'),
    col('description', 'TEXT', true, '描述信息'),
    col('fault_tree', 'JSONB', false, '故障树定义', { default: "'{}'" }),
    col('version', 'INTEGER', false, '版本号', { default: '1' }),
    col('status', 'VARCHAR(50)', false, '状态', { default: "'draft'" }),
    col('metadata', 'JSONB', true, '元数据', { default: "'{}'" }),
    col('labels', 'JSONB', true, '标签', { default: "'{}'" }),
    col('created_by', 'VARCHAR(255)', true, '创建者'),
    col('created_at', 'TIMESTAMPTZ', false, '创建时间', { default: 'NOW()' }),
    col('updated_at', 'TIMESTAMPTZ', false, '更新时间', { default: 'NOW()' }),
  ],
  foreignKeys: [],
  indexes: [],
  mockData: [
    { id: 'd0e1f2a3-0001-4000-8000-000000000001', workflow_id: 'wf-001', name: 'K8s 节点 NotReady 故障树', description: '基于节点状态和 kubelet 日志分析', fault_tree: { top_event_id: 'evt-top-001', events: 8, gates: 4 }, version: 3, status: 'published', metadata: {}, labels: { domain: 'k8s' }, created_by: 'admin', created_at: '2026-03-01T08:00:00Z', updated_at: '2026-04-05T14:30:00Z' },
    { id: 'd0e1f2a3-0002-4000-8000-000000000002', workflow_id: 'wf-002', name: 'RDS 主从同步延迟诊断', description: '分析 MySQL 主从同步延迟的根本原因', fault_tree: { top_event_id: 'evt-rds-top', events: 7, gates: 3 }, version: 2, status: 'published', metadata: {}, labels: { domain: 'rds' }, created_by: 'admin', created_at: '2026-03-05T10:00:00Z', updated_at: '2026-04-03T09:00:00Z' },
    // Kudig topic-fta/list/ entries
    { id: 'd0e1f2a3-0003-4000-8000-000000000003', workflow_id: 'wf-kudig-node', name: 'Node 节点异常故障树', description: '覆盖节点不可用/不稳定的关键成因：节点状态、kubelet、运行时、系统资源、内核与网络、存储、证书与时间、控制面依赖', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/node-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'node' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0004-4000-8000-000000000004', workflow_id: 'wf-kudig-pod', name: 'Pod 异常故障树', description: '覆盖 Pod 启动、运行、终止阶段的异常：CrashLoopBackOff、OOMKilled、Pending、ImagePullBackOff', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/pod-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'pod' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0005-4000-8000-000000000005', workflow_id: 'wf-kudig-apiserver', name: 'API Server 异常故障树', description: '覆盖 APIServer 不可用/性能劣化的关键成因：进程与配置、认证鉴权、请求排队与限流、依赖组件、证书与时间', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/apiserver-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'apiserver' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0006-4000-8000-000000000006', workflow_id: 'wf-kudig-etcd', name: 'Etcd 异常故障树', description: '覆盖 Etcd 集群异常的关键成因：进程与资源、 WAL 与快照、磁盘 IO、网络分区、 leadership 变更', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/etcd-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'etcd' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0007-4000-8000-000000000007', workflow_id: 'wf-kudig-dns', name: 'DNS 解析异常故障树', description: '覆盖 CoreDNS 异常、DNS 解析失败的根本成因：Pod 层面、节点层面、集群层面、网络策略', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/dns-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'dns' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0008-4000-8000-000000000008', workflow_id: 'wf-kudig-network', name: 'Network 网络异常故障树', description: '覆盖 CNI 组件异常、节点网络配置错误、Service 连通性故障的根本成因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/network-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'network' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0009-4000-8000-000000000009', workflow_id: 'wf-kudig-ingress', name: 'Ingress/Gateway 故障树', description: '覆盖 Ingress Controller 异常、域名解析问题、证书问题的故障路径', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/ingress-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'ingress' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0010-4000-8000-000000000010', workflow_id: 'wf-kudig-deployment', name: 'Deployment 异常故障树', description: '覆盖 Deployment Rollout 失败、ReplicaSet 不健康的根因：镜像拉取、资源配额、探针配置', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/deployment-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'deployment' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0011-4000-8000-000000000011', workflow_id: 'wf-kudig-statefulset', name: 'StatefulSet 异常故障树', description: '覆盖 StatefulSet 异常的根本成因：PVC 挂载、序号分配、headless Service', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/statefulset-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'statefulset' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0012-4000-8000-000000000012', workflow_id: 'wf-kudig-daemonset', name: 'DaemonSet 异常故障树', description: '覆盖 DaemonSet Pod 调度失败或异常的根本成因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/daemonset-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'daemonset' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0013-4000-8000-000000000013', workflow_id: 'wf-kudig-job', name: 'Job/CronJob 异常故障树', description: '覆盖 Job 失败、CronJob 未按计划执行的根本成因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/job-cronjob-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'job' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0014-4000-8000-000000000014', workflow_id: 'wf-kudig-hpa', name: 'HPA 扩缩容异常故障树', description: '覆盖 HPA 无法扩缩容、缩容到 0 或扩容失败的根因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/hpa-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'hpa' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0015-4000-8000-000000000015', workflow_id: 'wf-kudig-vpa', name: 'VPA 异常故障树', description: '覆盖 VPA 推荐值异常、更新失败的根因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/vpa-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'vpa' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0016-4000-8000-000000000016', workflow_id: 'wf-kudig-csi', name: 'CSI 存储异常故障树', description: '覆盖 PersistentVolume 挂载失败、CSI driver 异常的根因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/csi-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'csi' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0017-4000-8000-000000000017', workflow_id: 'wf-kudig-rbac', name: 'RBAC 权限异常故障树', description: '覆盖 ServiceAccount 权限不足、RoleBinding/ClusterRoleBinding 配置错误的根因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/rbac-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'rbac' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0018-4000-8000-000000000018', workflow_id: 'wf-kudig-certificate', name: 'Certificate 证书异常故障树', description: '覆盖 kubelet/apiserver/etcd 证书过期或无效的根因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/certificate-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'certificate' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0019-4000-8000-000000000019', workflow_id: 'wf-kudig-scheduler', name: 'Scheduler 调度异常故障树', description: '覆盖 Pod 无法调度、调度延迟的根本成因：资源不足、亲和性冲突、污点', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/scheduler-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'scheduler' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0020-4000-8000-000000000020', workflow_id: 'wf-kudig-controller', name: 'Controller Manager 异常故障树', description: '覆盖 kube-controller-manager 异常的根本成因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/controller-manager-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'controller-manager' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0021-4000-8000-000000000021', workflow_id: 'wf-kudig-monitoring', name: 'Monitoring 监控异常故障树', description: '覆盖 Prometheus 采集失败、Alertmanager 通知异常的根本成因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/monitoring-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'monitoring' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0022-4000-8000-000000000022', workflow_id: 'wf-kudig-service', name: 'Service 连通性异常故障树', description: '覆盖 Service 无法访问、Endpoints 不健康的根本成因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/service-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'service' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0023-4000-8000-000000000023', workflow_id: 'wf-kudig-nodepool', name: 'NodePool 节点池异常故障树', description: '覆盖节点池扩缩容异常、节点加入失败的根因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/nodepool-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'nodepool' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0024-4000-8000-000000000024', workflow_id: 'wf-kudig-pdb', name: 'PDB 驱散异常故障树', description: '覆盖 PodDisruptionBudget 导致驱逐失败或无法完成的根因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/pdb-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'pdb' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0025-4000-8000-000000000025', workflow_id: 'wf-kudig-autoscaler', name: 'Cluster Autoscaler 异常故障树', description: '覆盖 Cluster Autoscaler 无法扩容或缩容节点的根本成因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/cluster-autoscaler-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'autoscaler' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0026-4000-8000-000000000026', workflow_id: 'wf-kudig-cluster-upgrade', name: '集群升级异常故障树', description: '覆盖集群升级失败、节点升级过程中异常的根本成因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/cluster-upgrade-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'upgrade' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0027-4000-8000-000000000027', workflow_id: 'wf-kudig-gateway', name: 'Gateway API 异常故障树', description: '覆盖 Gateway API 资源异常、HTTPRoute 绑定失败的根因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/gateway-api-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'gateway' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0028-4000-8000-000000000028', workflow_id: 'wf-kudig-service-mesh', name: 'Service Mesh Istio 异常故障树', description: '覆盖 Istio 网格内服务无法通信、Sidecar 注入了异常的根因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/service-mesh-istio-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'service-mesh' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0029-4000-8000-000000000029', workflow_id: 'wf-kudig-gitops', name: 'GitOps ArgoCD 异常故障树', description: '覆盖 ArgoCD 同步失败、应用状态异常的根因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/gitops-argocd-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'gitops' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0030-4000-8000-000000000030', workflow_id: 'wf-kudig-gpu', name: 'GPU 节点异常故障树', description: '覆盖 GPU 节点不可用、DevicePlugin 异常的根因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/gpu-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'gpu' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0031-4000-8000-000000000031', workflow_id: 'wf-kudig-helm', name: 'Helm Release 异常故障树', description: '覆盖 Helm Release 升级失败、回滚异常的根本成因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/helm-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'helm' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0032-4000-8000-000000000032', workflow_id: 'wf-kudig-crd', name: 'CRD/Operator 异常故障树', description: '覆盖 CustomResourceDefinition 异常、Operator 无法正常工作的根因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/crd-operator-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'crd' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0033-4000-8000-000000000033', workflow_id: 'wf-kudig-networkpolicy', name: 'NetworkPolicy 异常故障树', description: '覆盖 NetworkPolicy 配置后流量不通的根本成因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/networkpolicy-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'networkpolicy' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0034-4000-8000-000000000034', workflow_id: 'wf-kudig-psp', name: 'PSP/SCC 策略异常故障树', description: '覆盖 PodSecurityPolicy 或 SecurityContextConstraints 导致 Pod 创建失败的根因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/psp-scc-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'security' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0035-4000-8000-000000000035', workflow_id: 'wf-kudig-resourcequota', name: 'ResourceQuota 异常故障树', description: '覆盖 ResourceQuota/LimitRange 导致资源创建失败的根因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/resource-quota-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'quota' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0036-4000-8000-000000000036', workflow_id: 'wf-kudig-webhook', name: 'Webhook Admission 异常故障树', description: '覆盖 MutatingWebhook/ValidatingWebhook 导致资源创建/更新失败的根因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/webhook-admission-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'webhook' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0037-4000-8000-000000000037', workflow_id: 'wf-kudig-backup', name: 'Backup/Restore 异常故障树', description: '覆盖 Velero 备份失败、恢复异常的根本成因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/backup-restore-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'backup' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0038-4000-8000-000000000038', workflow_id: 'wf-kudig-cloudprovider', name: 'Cloud Provider 异常故障树', description: '覆盖阿里云/ AWS / GCP 云厂商特定资源异常的根本成因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/cloud-provider-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'cloud-provider' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0039-4000-8000-000000000039', workflow_id: 'wf-kudig-terway', name: 'Terway CNI 异常故障树', description: '覆盖阿里云 Terway CNI 网络异常的根因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/terway-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'cni' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'd0e1f2a3-0040-4000-8000-000000000040', workflow_id: 'wf-kudig-monitoring-extra', name: 'Monitoring Extra 监控扩展异常故障树', description: '覆盖 Metrics Server、Prometheus Adapter 等监控扩展组件异常的根因', fault_tree: { source: 'kudig', source_uri: 'https://github.com/kudig-io/kudig-database/blob/main/topic-fta/list/monitoring-fta.md' }, version: 1, status: 'published', metadata: { source: 'kudig', domain: 'kubernetes' }, labels: { domain: 'kubernetes', component: 'monitoring' }, created_by: 'kudig-importer', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
  ],
};

const ftaAnalysisResults: TableDef = {
  name: 'fta_analysis_results',
  displayName: 'FTA 分析结果',
  description: '故障树分析的执行结果，包含最小割集、基本事件概率和门逻辑结果',
  migration: '004_fta_documents',
  columns: [
    col('id', 'UUID', false, '主键', { primaryKey: true, default: 'uuid_generate_v4()' }),
    col('document_id', 'UUID', false, '关联 FTA 文档 ID (FK)'),
    col('execution_id', 'UUID', true, '关联执行 ID'),
    col('top_event_result', 'BOOLEAN', true, '顶事件结果'),
    col('minimal_cut_sets', 'JSONB', true, '最小割集', { default: "'[]'" }),
    col('basic_event_probabilities', 'JSONB', true, '基本事件概率', { default: "'{}'" }),
    col('gate_results', 'JSONB', true, '门逻辑结果', { default: "'{}'" }),
    col('importance_measures', 'JSONB', true, '重要度指标', { default: "'{}'" }),
    col('status', 'VARCHAR(50)', false, '状态', { default: "'completed'" }),
    col('duration_ms', 'INTEGER', true, '分析耗时 (ms)'),
    col('context', 'JSONB', true, '上下文信息', { default: "'{}'" }),
    col('created_at', 'TIMESTAMPTZ', false, '创建时间', { default: 'NOW()' }),
  ],
  foreignKeys: [
    { column: 'document_id', referencesTable: 'fta_documents', referencesColumn: 'id', onDelete: 'CASCADE' },
  ],
  indexes: [],
  mockData: [
    { id: 'e1f2a3b4-0001-4000-8000-000000000001', document_id: 'd0e1f2a3-0001-4000-8000-000000000001', execution_id: 'd4e5f6a7-0001-4000-8000-000000000001', top_event_result: true, minimal_cut_sets: [['evt-basic-001']], basic_event_probabilities: { 'evt-basic-001': 0.85 }, gate_results: { 'gate-001': true }, importance_measures: {}, status: 'completed', duration_ms: 12340, context: { trigger: 'alert' }, created_at: '2026-04-08T08:15:12Z' },
  ],
};

// ═════════════════════════════════════════════════════════════════
// Migration 005: Code Analysis
// ═════════════════════════════════════════════════════════════════

const codeAnalyses: TableDef = {
  name: 'code_analyses',
  displayName: '代码分析记录',
  description: '代码静态分析的运行记录，包括仓库、分支、分析器类型等信息',
  migration: '005_code_analysis',
  columns: [
    col('id', 'UUID', false, '主键', { primaryKey: true, default: 'uuid_generate_v4()' }),
    col('name', 'VARCHAR(255)', false, '分析名称'),
    col('repository_url', 'VARCHAR(1024)', true, '仓库 URL'),
    col('branch', 'VARCHAR(255)', true, '分支'),
    col('commit_sha', 'VARCHAR(64)', true, 'Commit SHA'),
    col('language', 'VARCHAR(50)', true, '编程语言'),
    col('analyzer_type', 'VARCHAR(100)', false, '分析器类型'),
    col('config', 'JSONB', false, '配置', { default: "'{}'" }),
    col('status', 'VARCHAR(50)', false, '状态', { default: "'pending'" }),
    col('summary', 'JSONB', true, '分析摘要', { default: "'{}'" }),
    col('duration_ms', 'INTEGER', true, '耗时 (ms)'),
    col('labels', 'JSONB', true, '标签', { default: "'{}'" }),
    col('triggered_by', 'VARCHAR(255)', true, '触发者'),
    col('started_at', 'TIMESTAMPTZ', true, '开始时间'),
    col('completed_at', 'TIMESTAMPTZ', true, '完成时间'),
    col('created_at', 'TIMESTAMPTZ', false, '创建时间', { default: 'NOW()' }),
    col('updated_at', 'TIMESTAMPTZ', false, '更新时间', { default: 'NOW()' }),
  ],
  foreignKeys: [],
  indexes: [],
  mockData: [
    { id: 'f2a3b4c5-0001-4000-8000-000000000001', name: 'resolve-agent Go 静态分析', repository_url: 'https://github.com/resolve-agent/core', branch: 'main', commit_sha: 'a3f7c2e', language: 'go', analyzer_type: 'golangci-lint', config: { rules: ['errcheck', 'govet'] }, status: 'completed', summary: { total_findings: 12, critical: 0, high: 3, medium: 9 }, duration_ms: 45000, labels: { ci: 'true' }, triggered_by: 'ci-pipeline', started_at: '2026-04-08T06:00:00Z', completed_at: '2026-04-08T06:00:45Z', created_at: '2026-04-08T06:00:00Z', updated_at: '2026-04-08T06:00:45Z' },
  ],
};

const codeAnalysisFindings: TableDef = {
  name: 'code_analysis_findings',
  displayName: '代码分析发现',
  description: '单个代码分析发现条目，包含规则、严重程度、文件位置和修复建议',
  migration: '005_code_analysis',
  columns: [
    col('id', 'UUID', false, '主键', { primaryKey: true, default: 'uuid_generate_v4()' }),
    col('analysis_id', 'UUID', false, '关联分析 ID (FK)'),
    col('rule_id', 'VARCHAR(255)', false, '规则 ID'),
    col('severity', 'VARCHAR(50)', false, '严重程度'),
    col('category', 'VARCHAR(100)', true, '分类'),
    col('message', 'TEXT', false, '发现描述'),
    col('file_path', 'VARCHAR(1024)', true, '文件路径'),
    col('line_start', 'INTEGER', true, '起始行'),
    col('line_end', 'INTEGER', true, '结束行'),
    col('column_start', 'INTEGER', true, '起始列'),
    col('column_end', 'INTEGER', true, '结束列'),
    col('snippet', 'TEXT', true, '代码片段'),
    col('suggestion', 'TEXT', true, '修复建议'),
    col('metadata', 'JSONB', true, '元数据', { default: "'{}'" }),
    col('created_at', 'TIMESTAMPTZ', false, '创建时间', { default: 'NOW()' }),
  ],
  foreignKeys: [
    { column: 'analysis_id', referencesTable: 'code_analyses', referencesColumn: 'id', onDelete: 'CASCADE' },
  ],
  indexes: [],
  mockData: [
    { id: 'a3b4c5d6-0001-4000-8000-000000000001', analysis_id: 'f2a3b4c5-0001-4000-8000-000000000001', rule_id: 'errcheck', severity: 'high', category: 'error-handling', message: '未检查 error 返回值', file_path: 'pkg/store/postgres/hook_store.go', line_start: 42, line_end: 42, column_start: 5, column_end: 30, snippet: 'rows.Close()', suggestion: '使用 defer rows.Close() 并检查 error', metadata: {}, created_at: '2026-04-08T06:00:45Z' },
    { id: 'a3b4c5d6-0002-4000-8000-000000000002', analysis_id: 'f2a3b4c5-0001-4000-8000-000000000001', rule_id: 'govet', severity: 'medium', category: 'correctness', message: '可能的空指针解引用', file_path: 'pkg/registry/memory.go', line_start: 78, line_end: 78, column_start: 12, column_end: 25, snippet: 'result.Content', suggestion: '添加 nil 检查', metadata: {}, created_at: '2026-04-08T06:00:45Z' },
  ],
};

// ═════════════════════════════════════════════════════════════════
// Migration 006: Memory
// ═════════════════════════════════════════════════════════════════

const memoryShortTerm: TableDef = {
  name: 'memory_short_term',
  displayName: '短期记忆（会话历史）',
  description: '按会话存储对话历史，支持序列号排序和 Token 计数',
  migration: '006_memory',
  columns: [
    col('id', 'UUID', false, '主键', { primaryKey: true, default: 'uuid_generate_v4()' }),
    col('agent_id', 'VARCHAR(255)', false, 'Agent ID'),
    col('conversation_id', 'VARCHAR(255)', false, '会话 ID'),
    col('role', 'VARCHAR(50)', false, '角色 (user/assistant/system)'),
    col('content', 'TEXT', false, '消息内容'),
    col('token_count', 'INTEGER', true, 'Token 数量', { default: '0' }),
    col('metadata', 'JSONB', true, '元数据', { default: "'{}'" }),
    col('sequence_num', 'INTEGER', false, '序列号'),
    col('created_at', 'TIMESTAMPTZ', false, '创建时间', { default: 'NOW()' }),
  ],
  foreignKeys: [],
  indexes: [],
  mockData: [
    { id: 'b4c5d6e7-0001-4000-8000-000000000001', agent_id: 'agent-mega-001', conversation_id: 'conv-001', role: 'user', content: 'ACK 集群 cn-hangzhou-prod 节点池需要扩容吗？', token_count: 28, metadata: {}, sequence_num: 1, created_at: '2026-04-08T09:10:00Z' },
    { id: 'b4c5d6e7-0002-4000-8000-000000000002', agent_id: 'agent-mega-001', conversation_id: 'conv-001', role: 'assistant', content: '当前集群负载率 78%，建议扩容 2 个节点到节点池 pool-general。', token_count: 45, metadata: { model: 'qwen-max' }, sequence_num: 2, created_at: '2026-04-08T09:10:02Z' },
    { id: 'b4c5d6e7-0003-4000-8000-000000000003', agent_id: 'agent-rag-003', conversation_id: 'conv-002', role: 'user', content: 'RDS 主从同步延迟怎么排查？', token_count: 18, metadata: {}, sequence_num: 1, created_at: '2026-04-08T09:00:00Z' },
  ],
};

const memoryLongTerm: TableDef = {
  name: 'memory_long_term',
  displayName: '长期记忆（跨会话知识）',
  description: '跨会话的知识存储，支持重要度评分、访问计数、TTL 和嵌入向量关联',
  migration: '006_memory',
  columns: [
    col('id', 'UUID', false, '主键', { primaryKey: true, default: 'uuid_generate_v4()' }),
    col('agent_id', 'VARCHAR(255)', false, 'Agent ID'),
    col('user_id', 'VARCHAR(255)', true, '用户 ID'),
    col('memory_type', 'VARCHAR(50)', false, '记忆类型'),
    col('content', 'TEXT', false, '记忆内容'),
    col('importance', 'REAL', true, '重要度 (0.0-1.0)', { default: '0.5' }),
    col('access_count', 'INTEGER', true, '访问次数', { default: '0' }),
    col('source_conversations', 'TEXT[]', true, '来源会话 ID 列表'),
    col('embedding_id', 'VARCHAR(255)', true, '嵌入向量 ID'),
    col('metadata', 'JSONB', true, '元数据', { default: "'{}'" }),
    col('expires_at', 'TIMESTAMPTZ', true, '过期时间'),
    col('last_accessed_at', 'TIMESTAMPTZ', true, '最后访问时间', { default: 'NOW()' }),
    col('created_at', 'TIMESTAMPTZ', false, '创建时间', { default: 'NOW()' }),
    col('updated_at', 'TIMESTAMPTZ', false, '更新时间', { default: 'NOW()' }),
  ],
  foreignKeys: [],
  indexes: [],
  mockData: [
    { id: 'c5d6e7f8-0001-4000-8000-000000000001', agent_id: 'agent-mega-001', user_id: 'admin', memory_type: 'fact', content: '用户偏好使用 cn-hangzhou 区域的 ACK 集群，节点池名称通常以 pool- 开头', importance: 0.8, access_count: 12, source_conversations: ['conv-001', 'conv-005'], embedding_id: 'emb-001', metadata: {}, expires_at: null, last_accessed_at: '2026-04-08T09:10:00Z', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-08T09:10:00Z' },
    { id: 'c5d6e7f8-0002-4000-8000-000000000002', agent_id: 'agent-rag-003', user_id: null, memory_type: 'summary', content: 'RDS 主从同步延迟的最常见原因是大事务阻塞和从库规格不足', importance: 0.9, access_count: 45, source_conversations: ['conv-002', 'conv-008', 'conv-012'], embedding_id: 'emb-002', metadata: {}, expires_at: '2026-07-01T00:00:00Z', last_accessed_at: '2026-04-08T09:00:00Z', created_at: '2026-03-20T14:00:00Z', updated_at: '2026-04-08T09:00:00Z' },
    // Kudig topic-skills knowledge
    { id: 'c5d6e7f8-0003-4000-8000-000000000003', agent_id: 'agent-mega-001', user_id: null, memory_type: 'fact', content: 'K8s 节点 NotReady 爆炸半径极大，kubelet 心跳超时后 5 分钟开始驱逐 Pod，优先排查 kubelet 进程状态和容器运行时', importance: 0.95, access_count: 28, source_conversations: ['conv-kudig-001'], embedding_id: 'emb-kudig-001', metadata: { skill_id: 'SKILL-NODE-001' }, expires_at: null, last_accessed_at: '2026-04-10T10:00:00Z', created_at: '2026-04-10T10:00:00Z', updated_at: '2026-04-10T10:00:00Z' },
    { id: 'c5d6e7f8-0004-4000-8000-000000000004', agent_id: 'agent-mega-001', user_id: null, memory_type: 'fact', content: 'CrashLoopBackOff 的根因隐藏在前一次退出的 exit code 中，exit code 137 = OOMKill，exit code 1 = 应用错误，需结合 kubectl logs --previous 分析', importance: 0.92, access_count: 35, source_conversations: ['conv-kudig-002'], embedding_id: 'emb-kudig-002', metadata: { skill_id: 'SKILL-POD-001' }, expires_at: null, last_accessed_at: '2026-04-10T10:05:00Z', created_at: '2026-04-10T10:05:00Z', updated_at: '2026-04-10T10:05:00Z' },
    { id: 'c5d6e7f8-0005-4000-8000-000000000005', agent_id: 'agent-mega-001', user_id: null, memory_type: 'fact', content: 'DNS 解析失败时首先检查 CoreDNS Pod 是否 Running，其次用 kubectl run nslookup --image=busybox nslookup kubernetes.default 检查集群内 DNS 解析', importance: 0.88, access_count: 19, source_conversations: ['conv-kudig-003'], embedding_id: 'emb-kudig-003', metadata: { skill_id: 'SKILL-NET-001' }, expires_at: null, last_accessed_at: '2026-04-10T10:10:00Z', created_at: '2026-04-10T10:10:00Z', updated_at: '2026-04-10T10:10:00Z' },
    { id: 'c5d6e7f8-0006-4000-8000-000000000006', agent_id: 'agent-mega-001', user_id: null, memory_type: 'fact', content: '证书过期的快速排查：kubectl get csr 查看证书签署请求状态，kubelet 证书默认一年过期，到期前需手动续期', importance: 0.9, access_count: 22, source_conversations: ['conv-kudig-004'], embedding_id: 'emb-kudig-004', metadata: { skill_id: 'SKILL-SEC-001' }, expires_at: null, last_accessed_at: '2026-04-10T10:15:00Z', created_at: '2026-04-10T10:15:00Z', updated_at: '2026-04-10T10:15:00Z' },
  ],
};

// ═════════════════════════════════════════════════════════════════
// Migration 008: Troubleshooting Solutions
// ═════════════════════════════════════════════════════════════════

const troubleshootingSolutions: TableDef = {
  name: 'troubleshooting_solutions',
  displayName: '排查方案表',
  description: '结构化故障排查知识库，包含四要素：问题现象、关键信息、排查步骤、解决方案',
  migration: '008_troubleshooting_solutions',
  columns: [
    col('id', 'UUID', false, '主键', { primaryKey: true, default: 'uuid_generate_v4()' }),
    col('title', 'VARCHAR(500)', false, '方案标题'),
    col('problem_symptoms', 'TEXT', false, '问题现象描述'),
    col('key_information', 'TEXT', false, '关键信息/日志'),
    col('troubleshooting_steps', 'TEXT', false, '排查步骤'),
    col('resolution_steps', 'TEXT', false, '解决方案'),
    col('domain', 'VARCHAR(100)', true, '问题领域 (kubernetes/database/network)'),
    col('component', 'VARCHAR(200)', true, '相关组件'),
    col('severity', 'VARCHAR(20)', false, '严重程度', { default: "'medium'" }),
    col('tags', 'TEXT[]', true, '标签数组'),
    col('search_keywords', 'TEXT', true, '搜索关键词 (pg_trgm 索引)'),
    col('version', 'INTEGER', false, '版本号', { default: '1' }),
    col('status', 'VARCHAR(50)', false, '状态', { default: "'active'" }),
    col('source_uri', 'TEXT', true, '来源 URI'),
    col('rag_collection_id', 'VARCHAR(255)', true, 'RAG 关联集合 ID'),
    col('rag_document_id', 'VARCHAR(255)', true, 'RAG 关联文档 ID'),
    col('related_skill_names', 'TEXT[]', true, '关联技能名称'),
    col('related_workflow_ids', 'TEXT[]', true, '关联工作流 ID'),
    col('metadata', 'JSONB', true, '扩展元数据', { default: "'{}'" }),
    col('created_by', 'VARCHAR(200)', true, '创建者'),
    col('created_at', 'TIMESTAMPTZ', false, '创建时间', { default: 'NOW()' }),
    col('updated_at', 'TIMESTAMPTZ', false, '更新时间', { default: 'NOW()' }),
  ],
  foreignKeys: [],
  indexes: [
    { name: 'idx_ts_domain', columns: ['domain'] },
    { name: 'idx_ts_severity', columns: ['severity'] },
    { name: 'idx_ts_status', columns: ['status'] },
    { name: 'idx_ts_tags', columns: ['tags'], condition: 'GIN' },
    { name: 'idx_ts_search_keywords_trgm', columns: ['search_keywords'], condition: 'GIN (pg_trgm)' },
  ],
  mockData: [
    { id: 'sol-001', title: 'K8s Pod CrashLoopBackOff 排查方案', problem_symptoms: 'Pod 频繁重启', key_information: 'kubectl describe pod Events', troubleshooting_steps: '1. 检查 Events 2. 分析退出码', resolution_steps: '调整 memory limits', domain: 'kubernetes', component: 'pod', severity: 'high', tags: ['k8s', 'pod'], version: 1, status: 'active', created_at: '2026-03-15T10:00:00Z', updated_at: '2026-04-01T08:30:00Z' },
    { id: 'sol-kudig-001', title: 'API Server 故障排查指南', problem_symptoms: 'API Server 无响应、请求超时或返回 5xx 错误', key_information: 'kube-apiserver pod logs, etcd 连接状态, --audit-log', troubleshooting_steps: '1. 检查 apiserver pod 状态 2. 验证 etcd 连接 3. 检查证书有效期', resolution_steps: '重启 apiserver / 修复 etcd 连接 / 续签证书', domain: 'kubernetes', component: 'api-server', severity: 'high', tags: ['k8s', 'api-server', 'control-plane'], version: 1, status: 'active', created_at: '2026-04-10T08:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
    { id: 'sol-kudig-003', title: 'Pod 生命周期故障排查指南', problem_symptoms: 'Pod 启动失败、CrashLoopBackOff、ImagePullBackOff 或异常退出', key_information: 'Pod Events, container logs, exit code, node 资源状态', troubleshooting_steps: '1. kubectl describe pod 2. 检查镜像拉取 3. 分析 exit code', resolution_steps: '修复配置/资源限制/镜像版本', domain: 'kubernetes', component: 'pod', severity: 'medium', tags: ['k8s', 'pod', 'lifecycle'], version: 1, status: 'active', created_at: '2026-04-10T08:00:00Z', updated_at: '2026-04-10T08:00:00Z' },
  ],
};

const solutionExecutions: TableDef = {
  name: 'solution_executions',
  displayName: '方案执行记录',
  description: '记录排查方案的每次执行及其效果评估',
  migration: '008_troubleshooting_solutions',
  columns: [
    col('id', 'UUID', false, '主键', { primaryKey: true, default: 'uuid_generate_v4()' }),
    col('solution_id', 'UUID', false, '关联方案 ID (FK)'),
    col('executor', 'VARCHAR(200)', true, '执行者'),
    col('trigger_context', 'JSONB', true, '触发上下文', { default: "'{}'" }),
    col('status', 'VARCHAR(50)', false, '执行状态', { default: "'pending'" }),
    col('outcome_notes', 'TEXT', true, '结果备注'),
    col('effectiveness_score', 'DECIMAL(3,2)', true, '有效性评分 (0~1)'),
    col('duration_ms', 'INTEGER', true, '执行耗时 (ms)'),
    col('started_at', 'TIMESTAMPTZ', true, '开始时间'),
    col('completed_at', 'TIMESTAMPTZ', true, '完成时间'),
    col('created_at', 'TIMESTAMPTZ', false, '创建时间', { default: 'NOW()' }),
  ],
  foreignKeys: [
    { column: 'solution_id', referencesTable: 'troubleshooting_solutions', referencesColumn: 'id', onDelete: 'CASCADE' },
  ],
  indexes: [
    { name: 'idx_se_solution_id', columns: ['solution_id'] },
    { name: 'idx_se_status', columns: ['status'] },
  ],
  mockData: [
    { id: 'exec-001', solution_id: 'sol-001', executor: 'agent-mega-001', trigger_context: { ticket_id: 'TK-2026041201' }, status: 'success', outcome_notes: 'OOM 确认，调整 limits 后恢复', effectiveness_score: 0.92, duration_ms: 45000, started_at: '2026-04-12T10:30:00Z', completed_at: '2026-04-12T10:30:45Z', created_at: '2026-04-12T10:30:45Z' },
  ],
};

// ═════════════════════════════════════════════════════════════════
// Exports
// ═════════════════════════════════════════════════════════════════

export const tableGroups: TableGroup[] = [
  {
    label: '核心注册',
    color: 'blue',
    tables: [agents, skills, workflows, workflowExecutions, models, auditLog],
  },
  {
    label: 'Hook 生命周期',
    color: 'purple',
    tables: [hooks, hookExecutions],
  },
  {
    label: 'RAG 知识库',
    color: 'emerald',
    tables: [ragDocuments, ragIngestionHistory],
  },
  {
    label: 'FTA 故障树',
    color: 'amber',
    tables: [ftaDocuments, ftaAnalysisResults],
  },
  {
    label: '代码分析',
    color: 'cyan',
    tables: [codeAnalyses, codeAnalysisFindings],
  },
  {
    label: '记忆系统',
    color: 'rose',
    tables: [memoryShortTerm, memoryLongTerm],
  },
  {
    label: '结构化标准方案',
    color: 'orange',
    tables: [troubleshootingSolutions, solutionExecutions],
  },
];

export const allTables: TableDef[] = tableGroups.flatMap((g) => g.tables);

export function getTableGroup(tableName: string): TableGroup | undefined {
  return tableGroups.find((g) => g.tables.some((t) => t.name === tableName));
}

export function getGroupColorClasses(color: string): { bg: string; text: string; border: string } {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/20' },
    purple: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/20' },
    emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    amber: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20' },
    cyan: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/20' },
    rose: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/20' },
    orange: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/20' },
  };
  return map[color] ?? map.blue!;
}
