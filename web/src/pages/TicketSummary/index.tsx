import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Shield, AlertTriangle, Search, Zap, Target, RefreshCw, Eye, Lightbulb } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const principles = [
  {
    num: '一',
    title: '目标不是省力，而是发现未知',
    icon: Search,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    desc: '自动化不是为了生成漂亮的总结，而是系统性地识别现有文档未覆盖的问题，从个案中结构化提取新认知。',
  },
  {
    num: '二',
    title: '知识必须组织公开化',
    icon: Eye,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    desc: 'Agent 不能是唯一变聪明的实体。总结必须先送达相关人员，再沉淀为永久存储，形成团队共享记忆。',
  },
  {
    num: '三',
    title: '结论必须证据化',
    icon: Shield,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/20',
    desc: '工单知识不是口口相传的民间传说 — 它必须是可回放的证据链。每个结论关联：根因、行动、成功条件、适用范围。',
  },
  {
    num: '四',
    title: '沉淀必须增量化',
    icon: Target,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    desc: '目标不是"所有处理过的工单"，而是"为组织贡献了新认知价值的工单"。防止重复条目和噪声污染。',
  },
  {
    num: '五',
    title: '知识必须能力化闭环',
    icon: RefreshCw,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    desc: '文档不是终点。知识只有进入下一个处理管道成为可调用、可训练、可检查、可复用的能力时才算真正沉淀。',
  },
  {
    num: '六',
    title: '经验不只帮解题，也要帮避坑',
    icon: AlertTriangle,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10 border-orange-500/20',
    desc: '总结不仅回答"怎么修"，还要回答"怎么避免"。提取 Gotchas：危险操作、误导性诊断、顺序依赖。',
  },
  {
    num: '七',
    title: '系统要具备自省能力',
    icon: Lightbulb,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10 border-rose-500/20',
    desc: 'Agent 不仅消费知识 — 它必须持续发现知识体系本身的薄弱环节。缺口识别应该是后台守护进程。',
  },
];

const knowledgeTypes = [
  {
    type: '处置型知识',
    question: '当问题来了，如何更快更可靠地处理',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    fields: ['现象 — 可观测的现象和错误消息', '环境 — 版本、配置、基础设施上下文', '排查路径 — 逐步的故障排查序列', '根因 — 已验证的根本原因', '解决方案 — 采取的修复行动', '成功条件 — 如何验证修复是否有效', '适用范围 — 方案的边界和限制'],
    impact: '提升未来工单处理效率和一致性',
  },
  {
    type: '预防型知识 (Gotchas)',
    question: '在问题来之前，如何避免踩坑',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    fields: ['容易误触发问题的操作', '已知兼容性陷阱的版本组合', '"看起来合理"但实际会误导的诊断', '不可逆转顺序的依赖性流程', '需要强制前置检查的场景', '最常见的误判模式'],
    impact: '降低踩坑率、误操作率、返工率',
  },
  {
    type: '维护型知识 (体系缺口)',
    question: '为什么这类工单仍然需要人工回退',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10 border-rose-500/20',
    fields: ['该场景缺少文档', '现有 Runbook 不完整', '现有技能无法覆盖该案例', '不同来源的文档冲突', '过时文档指向旧版本/路径/参数', '关键经验仅存在于个别工程师脑中'],
    impact: '持续修补知识体系，提高 Agent 覆盖率',
  },
];

const gapTypes = [
  { type: '缺失', signal: '工单无法映射到任何现有文档/技能；关键步骤没有标准描述', color: 'text-red-400' },
  { type: '冲突', signal: '两份文档给出不同的解决路径；技能输出与人工最佳实践矛盾', color: 'text-amber-400' },
  { type: '过时', signal: '文档引用旧版本/路径/参数；解决方案已变但文档未更新', color: 'text-orange-400' },
  { type: '隐性经验', signal: '解决方案依赖某人的口头补充；同类问题总需要人工"再加一句提示"', color: 'text-purple-400' },
];

export default function TicketSummaryPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link to="/architecture">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回架构总览
          </Button>
        </Link>
      </div>

      <PageHeader
        title="工单总结 Agent — 设计哲学"
        description="从「解决一张工单」升级为「为组织新增一项能力」— 一个知识生产引擎，将每个个案转化为可复用的组织能力"
      />

      {/* 核心论点 */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Zap className="h-5 w-5 text-yellow-400" />
            核心论点
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-300 leading-relaxed text-lg">
            工单总结的终极目标，不是写出一篇总结，而是让组织<strong className="text-yellow-300">更会处理问题</strong>、
            <strong className="text-yellow-300">更会避免踩坑</strong>、也<strong className="text-yellow-300">更会修补自己的知识体系</strong>。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {[
              { label: '解法增量', desc: '结构化的解决方案知识，让未来处理更快', color: 'border-blue-500/30' },
              { label: '避坑增量', desc: 'Gotchas 和反模式，避免重复犯错', color: 'border-amber-500/30' },
              { label: '体系修补增量', desc: '文档和技能缺口识别，持续改进', color: 'border-rose-500/30' },
            ].map((v) => (
              <div key={v.label} className={cn('rounded-lg border bg-slate-900/40 p-4 text-center', v.color)}>
                <div className="text-sm font-semibold text-slate-200">{v.label}</div>
                <div className="text-xs text-slate-400 mt-1">{v.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 七大设计原则 */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            七大设计原则
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {principles.map((p) => (
              <div key={p.num} className={cn('rounded-lg border p-4', p.bgColor)}>
                <div className="flex items-center gap-2 mb-2">
                  <p.icon className={cn('h-4 w-4', p.color)} />
                  <Badge variant="outline" className={p.color}>原则{p.num}</Badge>
                  <span className="text-sm font-semibold text-slate-200">{p.title}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 三类总结产物 */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Target className="h-5 w-5 text-green-400" />
            三类总结产物
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {knowledgeTypes.map((k) => (
            <div key={k.type} className={cn('rounded-lg border p-4', k.bgColor)}>
              <div className="flex items-center justify-between mb-2">
                <span className={cn('text-sm font-semibold', k.color)}>{k.type}</span>
                <Badge variant="outline" className="text-xs text-slate-500">{k.impact}</Badge>
              </div>
              <p className="text-xs text-slate-300 mb-2 italic">「{k.question}」</p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {k.fields.map((f) => (
                  <li key={f} className="text-xs text-slate-400 flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-slate-500 mt-1.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 知识生产闭环 */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <RefreshCw className="h-5 w-5 text-purple-400" />
            知识生产闭环
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {[
              { label: '工单进入', color: 'bg-blue-500/20 text-blue-300' },
              { label: 'Skills 自动抽取', color: 'bg-purple-500/20 text-purple-300' },
              { label: '生成三类候选总结', color: 'bg-cyan-500/20 text-cyan-300' },
              { label: '证据链校验', color: 'bg-amber-500/20 text-amber-300' },
              { label: '增量沉淀包', color: 'bg-green-500/20 text-green-300' },
              { label: '一写多读广播', color: 'bg-orange-500/20 text-orange-300' },
              { label: '多人审核', color: 'bg-rose-500/20 text-rose-300' },
              { label: '正式持久化', color: 'bg-indigo-500/20 text-indigo-300' },
              { label: '后续工单复用', color: 'bg-emerald-500/20 text-emerald-300' },
            ].map((s, i) => (
              <span key={s.label} className="flex items-center gap-2">
                <Badge className={cn('text-xs', s.color)}>{s.label}</Badge>
                {i < 8 && <span className="text-slate-600">→</span>}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            文档/技能未完全覆盖时，自动识别体系缺口并进入维护待办队列；常规案例仅归档，不产生噪声。
          </p>
        </CardContent>
      </Card>

      {/* 后台缺口识别 */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Search className="h-5 w-5 text-rose-400" />
            后台缺口识别引擎
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-300 mb-4">
            缺口识别<strong className="text-rose-300">不是附加在总结上的一次性操作</strong> — 它是持续运行的后台能力。
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-3 text-slate-400">缺口类别</th>
                  <th className="text-left py-2 px-3 text-slate-400">检测信号</th>
                </tr>
              </thead>
              <tbody>
                {gapTypes.map((g) => (
                  <tr key={g.type} className="border-b border-slate-700/50">
                    <td className={cn('py-2 px-3 font-semibold', g.color)}>{g.type}</td>
                    <td className="py-2 px-3 text-slate-300 text-xs">{g.signal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 集成方式 */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Zap className="h-5 w-5 text-emerald-400" />
            零入侵集成
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: '触发机制', detail: 'MegaAgent 的执行后钩子（post-execution hook），不修改 Selector 路由逻辑' },
              { label: 'Agent 类型', detail: '使用现有 AGENT_TYPE_CUSTOM 注册，Go 平台无需修改' },
              { label: '知识存储', detail: '通过现有 RAG Pipeline 的 query() 和 ingest() 接口' },
              { label: '事件广播', detail: '通过 NATS Event Bus 发布 summary.* 和 gap.* 事件' },
              { label: '技能注册', detail: 'Gotchas 知识自动注册为可调用技能' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                <div className="text-sm font-semibold text-emerald-300 mb-1">{item.label}</div>
                <div className="text-xs text-slate-400">{item.detail}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
