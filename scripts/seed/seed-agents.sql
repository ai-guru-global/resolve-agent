-- =============================================================================
-- ResolveAgent - Seed: Agents
-- =============================================================================
-- 7 production-ready agents covering mega/fta/rag/skill/custom types
-- Matches web/src/api/mock.ts mockAgents data
-- =============================================================================

-- Agents (Go runtime schema: id VARCHAR(64), type VARCHAR(50))
INSERT INTO agents (id, name, description, type, config, status, labels, version)
VALUES
    ('agent-mega-001', 'ACK 集群运维助手',
     '专注于阿里云 ACK 容器服务的运维助手。负责集群健康巡检、Pod 异常诊断、节点扩缩容决策。',
     'mega',
     '{
       "model": "qwen-max",
       "max_tokens": 4096,
       "temperature": 0.3,
       "mode": "selector",
       "harness": {
         "system_prompt": "你是一个专注于阿里云 ACK 容器服务的运维助手。负责集群健康巡检、Pod 异常诊断、节点扩缩容决策。",
         "tools": ["kubectl", "prometheus-query", "helm"],
         "skills": ["log-analyzer", "metric-alerter", "consulting-qa"],
         "memory_enabled": true,
         "hooks": [
           {"name": "执行日志", "type": "post_execution", "action": "log_trace", "enabled": true},
           {"name": "错误自动重试", "type": "on_error", "action": "auto_retry", "enabled": true},
           {"name": "上下文压缩", "type": "pre_execution", "action": "compaction", "enabled": true}
         ],
         "sandbox_type": "container",
         "context_strategy": "compaction"
       }
     }'::jsonb,
     'active', '{"component": "agent", "tier": "production"}'::jsonb, 1),

    ('agent-fta-002', '故障根因分析引擎',
     '基于 FTA 方法论进行系统性根因定位的故障树分析引擎。',
     'fta',
     '{
       "model": "qwen-plus",
       "fault_tree_id": "ft-k8s-node-notready",
       "auto_execute": true,
       "max_depth": 5,
       "mode": "selector",
       "harness": {
         "system_prompt": "你是一个故障树分析引擎，基于 FTA 方法论进行系统性根因定位。",
         "tools": ["fault-tree-engine", "log-query", "metric-query"],
         "skills": ["log-analyzer", "metric-alerter"],
         "memory_enabled": true,
         "hooks": [
           {"name": "执行日志", "type": "post_execution", "action": "log_trace", "enabled": true},
           {"name": "测试验证", "type": "post_execution", "action": "test_suite", "enabled": true}
         ],
         "sandbox_type": "container",
         "context_strategy": "offloading"
       }
     }'::jsonb,
     'active', '{"component": "agent", "tier": "production"}'::jsonb, 1),

    ('agent-rag-003', '运维知识问答',
     '基于 RAG 语义检索提供精准的运维知识回答的问答助手。',
     'rag',
     '{
       "model": "qwen-turbo",
       "collection_id": "col-ops-kb-001",
       "top_k": 5,
       "similarity_threshold": 0.72,
       "mode": "selector",
       "harness": {
         "system_prompt": "你是运维知识问答助手，基于 RAG 语义检索提供精准的运维知识回答。",
         "tools": ["vector-search", "cross-encoder-rerank"],
         "skills": ["consulting-qa"],
         "memory_enabled": true,
         "hooks": [
           {"name": "执行日志", "type": "post_execution", "action": "log_trace", "enabled": true}
         ],
         "sandbox_type": "local",
         "context_strategy": "default"
       }
     }'::jsonb,
     'active', '{"component": "agent", "tier": "production"}'::jsonb, 1),

    ('agent-skill-004', '工单自动处理',
     '并行调用所有绑定技能处理运维工单的自动处理引擎。',
     'skill',
     '{
       "model": "qwen-plus",
       "auto_assign": true,
       "mode": "all_skills",
       "harness": {
         "system_prompt": "你是工单自动处理引擎，并行调用所有绑定技能处理运维工单。",
         "tools": ["ticket-api", "notification-api"],
         "skills": ["ticket-handler", "consulting-qa"],
         "memory_enabled": false,
         "hooks": [
           {"name": "执行日志", "type": "post_execution", "action": "log_trace", "enabled": true},
           {"name": "结果通知", "type": "post_execution", "action": "notify", "enabled": true}
         ],
         "sandbox_type": "container",
         "context_strategy": "default"
       }
     }'::jsonb,
     'active', '{"component": "agent", "tier": "production"}'::jsonb, 1),

    ('agent-custom-005', 'SLB 流量分析',
     '分析 SLB 实例的流量模式，识别异常流量峰值，给出弹性伸缩建议。',
     'custom',
     '{
       "model": "qwen-turbo",
       "data_source": "prometheus",
       "mode": "all_skills",
       "harness": {
         "system_prompt": "分析 SLB 实例的流量模式，识别异常流量峰值，给出弹性伸缩建议。",
         "tools": ["prometheus-query", "slb-api"],
         "skills": ["metric-alerter"],
         "memory_enabled": false,
         "hooks": [
           {"name": "执行日志", "type": "post_execution", "action": "log_trace", "enabled": true}
         ],
         "sandbox_type": "remote",
         "context_strategy": "default"
       }
     }'::jsonb,
     'inactive', '{"component": "agent", "tier": "staging"}'::jsonb, 1),

    ('agent-mega-006', '变更风险评估',
     '评估运维变更操作的风险等级，检查变更窗口合规性，生成变更审批建议。',
     'mega',
     '{
       "model": "qwen-max",
       "risk_threshold": 0.6,
       "mode": "selector",
       "harness": {
         "system_prompt": "评估运维变更操作的风险等级，检查变更窗口合规性，生成变更审批建议。",
         "tools": ["change-management-api", "compliance-checker"],
         "skills": ["change-reviewer"],
         "memory_enabled": true,
         "hooks": [
           {"name": "执行日志", "type": "post_execution", "action": "log_trace", "enabled": true},
           {"name": "合规校验", "type": "pre_execution", "action": "lint_check", "enabled": true},
           {"name": "错误自动重试", "type": "on_error", "action": "auto_retry", "enabled": false}
         ],
         "sandbox_type": "container",
         "context_strategy": "compaction"
       }
     }'::jsonb,
     'error', '{"component": "agent", "tier": "production"}'::jsonb, 1),

    ('agent-fta-007', 'RDS 主从同步诊断',
     '专注于 RDS MySQL 主从同步延迟的故障树分析诊断。',
     'fta',
     '{
       "model": "qwen-plus",
       "fault_tree_id": "ft-rds-replication-lag",
       "check_interval_seconds": 60,
       "mode": "selector",
       "harness": {
         "system_prompt": "专注于 RDS MySQL 主从同步延迟的故障树分析诊断。",
         "tools": ["fault-tree-engine", "rds-api", "metric-query"],
         "skills": ["log-analyzer"],
         "memory_enabled": true,
         "hooks": [
           {"name": "执行日志", "type": "post_execution", "action": "log_trace", "enabled": true}
         ],
         "sandbox_type": "container",
         "context_strategy": "offloading"
       }
     }'::jsonb,
     'active', '{"component": "agent", "tier": "production"}'::jsonb, 1)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    type = EXCLUDED.type,
    config = EXCLUDED.config,
    status = EXCLUDED.status,
    labels = EXCLUDED.labels;
