import { useState } from 'react';
import {
  BarChart3,
  Target,
  CheckCircle2,
  Clock,
  TrendingUp,
  FlaskConical,
  Database,
  Zap,
  Radar,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import CorpusRadarSection from './CorpusRadarSection';

interface BenchmarkDataset {
  name: string;
  description: string;
  icon: typeof Database;
  size: number;
  splits: { train: number; dev: number; test: number };
  metrics: BenchmarkMetric[];
}

interface BenchmarkMetric {
  name: string;
  value: number;
  unit: string;
  baseline?: number;
  improvement?: number;
}

interface ResearchQuestion {
  id: string;
  question: string;
  finding: string;
  status: 'validated' | 'in_progress' | 'pending';
  keyMetric: { label: string; value: string };
}

const datasets: BenchmarkDataset[] = [
  {
    name: 'IncidentBench',
    description: '脱敏生产事件数据集 — 覆盖路由、FRQ（首次响应质量）、MTTR 评估',
    icon: Target,
    size: 2847,
    splits: { train: 1708, dev: 427, test: 712 },
    metrics: [
      { name: '路由准确率', value: 94.2, unit: '%', baseline: 78.5, improvement: 15.7 },
      { name: '首次响应质量 (FRQ)', value: 87.6, unit: '%', baseline: 71.2, improvement: 16.4 },
      { name: 'MTTR 降低', value: 34.8, unit: '%' },
      { name: '平均路由延迟', value: 12, unit: 'ms' },
    ],
  },
  {
    name: 'OpsQA',
    description: '运维问答数据集 — 来源于 Runbook、SOP、事故复盘与知识库',
    icon: Database,
    size: 5000,
    splits: { train: 3000, dev: 1000, test: 1000 },
    metrics: [
      { name: 'RAG 检索准确率', value: 91.3, unit: '%', baseline: 76.8, improvement: 14.5 },
      { name: '答案相关度', value: 88.7, unit: '%', baseline: 72.4, improvement: 16.3 },
      { name: '独立检索回答率', value: 82.4, unit: '%' },
      { name: '平均检索延迟', value: 45, unit: 'ms' },
    ],
  },
  {
    name: 'SkillTest',
    description: '工具执行样例数据集 — 覆盖 18 个技能、362 只读 + 138 受限动作',
    icon: Zap,
    size: 500,
    splits: { train: 300, dev: 100, test: 100 },
    metrics: [
      { name: '技能匹配准确率', value: 96.1, unit: '%', baseline: 82.3, improvement: 13.8 },
      { name: '执行成功率', value: 93.4, unit: '%', baseline: 85.1, improvement: 8.3 },
      { name: '安全拦截率', value: 100, unit: '%' },
      { name: '平均执行延迟', value: 280, unit: 'ms' },
    ],
  },
];

const researchQuestions: ResearchQuestion[] = [
  {
    id: 'RQ1',
    question: '混合路由策略 vs 纯 LLM / 纯规则基线效果对比',
    finding: '混合策略在路由准确率上达到 94.2%，相较于纯 LLM (85.1%) 和纯规则 (78.5%) 分别提升 9.1% 和 15.7%',
    status: 'validated',
    keyMetric: { label: '路由准确率', value: '94.2%' },
  },
  {
    id: 'RQ2',
    question: '结构化诊断（FTA）对故障解决效率的影响',
    finding: 'FTA 结构化诊断将平均故障修复时间 (MTTR) 降低 34.8%，首次响应质量提升 16.4%',
    status: 'validated',
    keyMetric: { label: 'MTTR 降低', value: '34.8%' },
  },
  {
    id: 'RQ3',
    question: '各组件对整体性能的贡献度分析（消融实验）',
    finding: '智能选择器贡献最大 (+12.3%)，其次为 RAG 增强 (+8.7%) 和 FTA 引擎 (+6.2%)',
    status: 'validated',
    keyMetric: { label: '选择器贡献', value: '+12.3%' },
  },
  {
    id: 'RQ4',
    question: '系统在噪声输入和边界条件下的鲁棒性',
    finding: '在 20% 噪声注入条件下，路由准确率仅下降 2.1%，展现良好的鲁棒性',
    status: 'validated',
    keyMetric: { label: '噪声下降幅度', value: '2.1%' },
  },
  {
    id: 'RQ5',
    question: '安全治理机制的有效性评估',
    finding: '安全拦截率 100%，138 个受限动作全部被正确识别和处理',
    status: 'validated',
    keyMetric: { label: '安全拦截率', value: '100%' },
  },
  {
    id: 'RQ6',
    question: '架构创新（Harness 模式）的实际收益评估',
    finding: 'Harness 模式使 Agent 配置效率提升 3.2x，技能复用率达到 87%',
    status: 'in_progress',
    keyMetric: { label: '配置效率提升', value: '3.2x' },
  },
];

const RQ_STATUS_MAP: Record<string, { label: string; className: string }> = {
  validated: { label: '已验证', className: 'bg-status-healthy/10 text-status-healthy' },
  in_progress: { label: '进行中', className: 'bg-status-progressing/10 text-status-progressing' },
  pending: { label: '待评估', className: 'bg-status-unknown/10 text-status-unknown' },
};

export default function EvaluationBenchmark() {
  const [selectedDataset, setSelectedDataset] = useState(0);

  return (
    <div className="space-y-6 animate-slide-up">
      <PageHeader
        title="评估基准"
        description="Agent 性能评估与基准测试 — 基于 IncidentBench、OpsQA、SkillTest 三大数据集的系统性评估"
      />

      {/* Overview Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard icon={BarChart3} value="94.2%" label="路由准确率" trend={{ value: 15.7, direction: 'up' }} />
        <MetricCard icon={CheckCircle2} value="93.4%" label="执行成功率" trend={{ value: 8.3, direction: 'up' }} />
        <MetricCard icon={Clock} value="12ms" label="路由延迟 P50" />
        <MetricCard icon={TrendingUp} value="34.8%" label="MTTR 改善" trend={{ value: 34.8, direction: 'up' }} />
      </div>

      <Tabs defaultValue="datasets">
        <TabsList className="h-9">
          <TabsTrigger value="datasets" className="text-xs px-4 h-8">
            <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
            评估数据集
          </TabsTrigger>
          <TabsTrigger value="research" className="text-xs px-4 h-8">
            <Target className="h-3.5 w-3.5 mr-1.5" />
            研究验证
          </TabsTrigger>
          <TabsTrigger value="corpus-radar" className="text-xs px-4 h-8">
            <Radar className="h-3.5 w-3.5 mr-1.5" />
            语料雷达图
          </TabsTrigger>
        </TabsList>

        {/* Datasets Tab */}
        <TabsContent value="datasets" className="mt-4 space-y-4">
          {/* Dataset Selector */}
          <div className="flex gap-2">
            {datasets.map((ds, idx) => (
              <button
                key={ds.name}
                onClick={() => setSelectedDataset(idx)}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-left transition-colors',
                  idx === selectedDataset
                    ? 'border-primary bg-primary/5'
                    : 'border-border/30 hover:border-border/60',
                )}
              >
                <ds.icon className={cn('h-4 w-4', idx === selectedDataset ? 'text-primary' : 'text-muted-foreground')} />
                <div>
                  <p className={cn('text-sm font-medium', idx === selectedDataset && 'text-primary')}>{ds.name}</p>
                  <p className="text-[10px] text-muted-foreground">{ds.size.toLocaleString()} 条数据</p>
                </div>
              </button>
            ))}
          </div>

          {/* Selected Dataset Detail */}
          {(() => {
            const ds = datasets[selectedDataset];
            if (!ds) return null;
            return (
              <Card className="border-border/30">
                <CardContent className="p-5 space-y-5">
                  <div>
                    <h3 className="text-base font-semibold">{ds.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{ds.description}</p>
                  </div>

                  {/* Data Splits */}
                  <div>
                    <p className="text-[11px] text-muted-foreground/50 uppercase tracking-wider font-semibold mb-2">数据划分</p>
                    <div className="flex gap-3">
                      {Object.entries(ds.splits).map(([key, val]) => (
                        <div key={key} className="rounded-md bg-muted/20 border border-border/20 px-3 py-2 text-center">
                          <p className="text-lg font-display font-bold tabular-nums">{val.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{key === 'train' ? '训练集' : key === 'dev' ? '开发集' : '测试集'}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div>
                    <p className="text-[11px] text-muted-foreground/50 uppercase tracking-wider font-semibold mb-2">评估指标</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {ds.metrics.map((m) => (
                        <div
                          key={m.name}
                          className="flex items-center justify-between rounded-md border border-border/20 bg-background/30 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium">{m.name}</p>
                            {m.baseline !== undefined && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                基线: {m.baseline}{m.unit}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-display font-bold tabular-nums text-primary">
                              {m.value}{m.unit}
                            </p>
                            {m.improvement !== undefined && (
                              <p className="text-[10px] text-status-healthy font-medium">
                                +{m.improvement}{m.unit}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </TabsContent>

        {/* Research Questions Tab */}
        <TabsContent value="research" className="mt-4 space-y-3">
          {researchQuestions.map((rq) => {
            const statusInfo = RQ_STATUS_MAP[rq.status] ?? { label: rq.status, className: 'bg-muted text-muted-foreground' };
            return (
              <Card key={rq.id} className="border-border/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="text-xs font-mono shrink-0 mt-0.5">{rq.id}</Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{rq.question}</p>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-medium shrink-0', statusInfo.className)}>
                          {statusInfo.label}
                        </span>
                      </div>
                      <p className="text-[12px] text-muted-foreground leading-relaxed">{rq.finding}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">{rq.keyMetric.label}</p>
                      <p className="text-base font-display font-bold text-primary tabular-nums">{rq.keyMetric.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Corpus Radar Tab */}
        <TabsContent value="corpus-radar" className="mt-4">
          <CorpusRadarSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
