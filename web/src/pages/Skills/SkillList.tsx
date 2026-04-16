import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Bot, Filter, Shield, Puzzle, Cpu, Cloud, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSkills } from '@/hooks/useSkills';

type SkillFilter = 'all' | 'general' | 'scenario';

const skillIcons: Record<string, string> = {
  'ticket-handler': '🎫',
  'consulting-qa': '💬',
  'log-analyzer': '📊',
  'metric-alerter': '📈',
  'change-reviewer': '🔍',
  'hello-world': '👋',
  'k8s-pod-crash': '🔥',
  'rds-replication-lag': '🗄️',
  // Kudig topic-skills (scenario-type)
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

const skillDisplayNames: Record<string, string> = {
  'ticket-handler': '工单处理',
  'consulting-qa': '咨询问答',
  'log-analyzer': '日志分析',
  'metric-alerter': '指标告警',
  'change-reviewer': '变更审核',
  'hello-world': '测试技能',
  'k8s-pod-crash': 'K8s Pod 崩溃排查',
  'rds-replication-lag': 'RDS 复制延迟诊断',
  // Kudig topic-skills (scenario-type)
  'SKILL-NODE-001': '节点 NotReady 诊断与修复',
  'SKILL-POD-001': 'Pod CrashLoopBackOff & OOMKilled 诊断',
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

// Mock: which agents reference each skill
const skillAgentRefs: Record<string, string[]> = {
  'ticket-handler': ['mega-agent', 'resolve-coordinator'],
  'consulting-qa': ['mega-agent', 'qa-specialist'],
  'log-analyzer': ['mega-agent', 'log-expert', 'fta-diagnoser'],
  'metric-alerter': ['mega-agent', 'monitor-agent'],
  'change-reviewer': ['mega-agent', 'code-reviewer'],
  'hello-world': ['test-agent'],
  'k8s-pod-crash': ['mega-agent', 'fta-diagnoser'],
  'rds-replication-lag': ['mega-agent', 'fta-diagnoser'],
  // Kudig topic-skills (imported from corpus)
  'SKILL-NODE-001': ['mega-agent', 'fta-diagnoser'],
  'SKILL-POD-001': ['mega-agent', 'fta-diagnoser'],
  'SKILL-POD-002': ['mega-agent', 'fta-diagnoser'],
  'SKILL-NET-001': ['mega-agent', 'fta-diagnoser'],
  'SKILL-NET-002': ['mega-agent', 'fta-diagnoser'],
  'SKILL-SEC-001': ['mega-agent', 'fta-diagnoser'],
  'SKILL-STORE-001': ['mega-agent', 'fta-diagnoser'],
  'SKILL-WORK-001': ['mega-agent', 'fta-diagnoser'],
  'SKILL-SEC-002': ['mega-agent', 'fta-diagnoser'],
  'SKILL-IMAGE-001': ['mega-agent', 'fta-diagnoser'],
  'SKILL-CP-001': ['mega-agent', 'fta-diagnoser'],
  'SKILL-SCALE-001': ['mega-agent', 'fta-diagnoser'],
  'SKILL-NET-003': ['mega-agent', 'fta-diagnoser'],
  'SKILL-CONFIG-001': ['mega-agent', 'fta-diagnoser'],
  'SKILL-MONITOR-001': ['mega-agent', 'fta-diagnoser'],
  'SKILL-LOG-001': ['mega-agent', 'fta-diagnoser'],
  'SKILL-PERF-001': ['mega-agent', 'fta-diagnoser'],
  'SKILL-SEC-003': ['mega-agent', 'fta-diagnoser'],
};

const filterTabs: { key: SkillFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'general', label: '通用技能' },
  { key: 'scenario', label: '场景技能' },
];

export default function SkillList() {
  const { data, isLoading } = useSkills();
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [filter, setFilter] = useState<SkillFilter>('all');

  const skills = data?.skills ?? [];
  const filteredSkills = filter === 'all'
    ? skills
    : skills.filter((s) => (s.skill_type ?? 'general') === filter);

  const generalCount = skills.filter((s) => (s.skill_type ?? 'general') === 'general').length;
  const scenarioCount = skills.filter((s) => s.skill_type === 'scenario').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Skills 技能"
        description={isLoading ? '加载中...' : `Harness Tools/Skills 层 · 已安装 ${skills.length} 个技能 (${generalCount} 通用 / ${scenarioCount} 场景)`}
      />

      {/* Skill system introduction */}
      <div className="rounded-xl border border-border/40 bg-gradient-to-br from-card/60 via-card/30 to-transparent p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Puzzle className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold mb-1">什么是技能（Skill）？</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              技能是 ResolveAgent 的<strong className="text-foreground/80">可复用功能模块</strong>，为 AI Agent 提供插件化的能力扩展。
              每个技能封装了特定的运维能力 —— 从日志分析、指标告警到自动化修复，Agent 通过组合不同技能来处理复杂的运维场景。
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-start gap-2 rounded-lg bg-muted/15 p-3">
            <Cpu className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-foreground/80">诊断类</span>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">日志分析、指标异常检测、根因定位</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-muted/15 p-3">
            <Wrench className="h-3.5 w-3.5 text-purple-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-foreground/80">操作类</span>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">自动修复、配置变更、服务重启</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-muted/15 p-3">
            <Cloud className="h-3.5 w-3.5 text-cyan-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-foreground/80">云服务类</span>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">K8s 编排、RDS 运维、云资源管理</p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-muted/15 p-3">
            <Shield className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-foreground/80">安全机制</span>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">权限控制、沙箱执行、资源限制</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/20">
          <Bot className="h-3 w-3 text-muted-foreground/60" />
          <p className="text-[10px] text-muted-foreground/60">
            技能与 Agent 的关系：Agent 是决策中枢，技能是执行单元。Agent 根据上下文智能选择并编排技能，完成端到端的运维自动化。
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      {!isLoading && skills.length > 0 && (
        <div className="flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setFilter(tab.key); setSelectedSkill(null); }}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                filter === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/50',
              )}
            >
              {tab.label}
              {tab.key === 'all' && ` (${skills.length})`}
              {tab.key === 'general' && ` (${generalCount})`}
              {tab.key === 'scenario' && ` (${scenarioCount})`}
            </button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border/30 bg-card/20 p-4 animate-pulse">
              <div className="h-5 w-40 bg-muted rounded mb-2" />
              <div className="h-4 w-60 bg-muted/50 rounded" />
            </div>
          ))}
        </div>
      ) : skills.length === 0 ? (
        <Card>
          <EmptyState
            icon={Zap}
            title="暂无已安装技能"
            description="通过 CLI 或技能市场安装技能，作为 Harness 的 Tools/Skills 层"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Skill list — left */}
          <div className="lg:col-span-2 space-y-1.5">
            {filteredSkills.map((skill) => {
              const refs = skillAgentRefs[skill.name] ?? [];
              const isScenario = skill.skill_type === 'scenario';
              return (
                <button
                  key={skill.name}
                  onClick={() => setSelectedSkill(skill.name === selectedSkill ? null : skill.name)}
                  className={cn(
                    'w-full text-left rounded-lg border p-4 transition-all duration-200',
                    selectedSkill === skill.name
                      ? 'border-primary/30 bg-accent/30'
                      : 'border-border/30 bg-card/20 hover:bg-card/40',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl shrink-0">{skillIcons[skill.name] ?? '⚡'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-sm font-display font-bold">{skillDisplayNames[skill.name] ?? skill.name}</span>
                        <Badge variant="secondary" className="font-mono text-[10px]">v{skill.version}</Badge>
                        {isScenario ? (
                          <Badge className="text-[10px] bg-orange-500/15 text-orange-400 border-orange-500/20 hover:bg-orange-500/25">场景</Badge>
                        ) : (
                          <Badge className="text-[10px] bg-blue-500/15 text-blue-400 border-blue-500/20 hover:bg-blue-500/25">通用</Badge>
                        )}
                        <StatusBadge variant="healthy" label="就绪" />
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
                      {isScenario && skill.domain && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Badge variant="outline" className="text-[10px] font-mono">{skill.domain}</Badge>
                          {skill.tags?.slice(0, 3).map((tag) => (
                            <span key={tag} className="text-[10px] text-muted-foreground/60">#{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                      <Bot className="h-3 w-3" />
                      {refs.length} Agents
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail preview — right */}
          <div className="lg:col-span-1">
            {selectedSkill ? (() => {
              const skill = skills.find((s) => s.name === selectedSkill);
              const refs = skillAgentRefs[selectedSkill] ?? [];
              if (!skill) return null;
              const isScenario = skill.skill_type === 'scenario';
              return (
                <Card className="sticky top-4">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{skillIcons[skill.name] ?? '⚡'}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-display font-bold">{skillDisplayNames[skill.name] ?? skill.name}</p>
                          {isScenario ? (
                            <Badge className="text-[9px] bg-orange-500/15 text-orange-400 border-orange-500/20">场景</Badge>
                          ) : (
                            <Badge className="text-[9px] bg-blue-500/15 text-blue-400 border-blue-500/20">通用</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground font-mono">{skill.name}</p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">{skill.description}</p>

                    {isScenario && skill.domain && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">场景信息</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px] font-mono">{skill.domain}</Badge>
                          {skill.tags?.map((tag) => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground">#{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">引用此技能的 Agent</p>
                      <div className="space-y-1">
                        {refs.length === 0 ? (
                          <p className="text-xs text-muted-foreground/50">暂无引用</p>
                        ) : refs.map((r) => (
                          <div key={r} className="flex items-center gap-2 rounded-md bg-muted/20 px-3 py-1.5">
                            <Bot className="h-3 w-3 text-primary" />
                            <span className="text-xs font-mono">{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Link
                      to={`/skills/${skill.name}`}
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                    >
                      查看详情 →
                    </Link>
                  </CardContent>
                </Card>
              );
            })() : (
              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground/50 text-center py-8">选择一个技能查看详情</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
