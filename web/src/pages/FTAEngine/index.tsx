import { Link } from 'react-router-dom';
import { GitBranch, ArrowLeft, Zap, Cpu, BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const eventTypes = [
  { type: 'Top', icon: '🔴', desc: '顶级事件，分析的最终目标' },
  { type: 'Intermediate', icon: '🟡', desc: '中间事件，由门逻辑组合' },
  { type: 'Basic', icon: '🟢', desc: '基本事件（叶节点），需要评估' },
  { type: 'Undeveloped', icon: '💎', desc: '未展开事件，待后续分析' },
  { type: 'Conditioning', icon: '⚪', desc: '条件事件，用于 INHIBIT 门' },
];

const gateTypes = [
  { gate: 'AND', logic: '全部为真', desc: '所有输入都必须为真', color: 'bg-blue-500/10 border-blue-500/20' },
  { gate: 'OR', logic: '任一为真', desc: '任一输入为真即可', color: 'bg-emerald-500/10 border-emerald-500/20' },
  { gate: 'VOTING', logic: 'K-of-N', desc: 'N 个输入中至少 K 个为真', color: 'bg-amber-500/10 border-amber-500/20' },
  { gate: 'INHIBIT', logic: '条件与', desc: 'AND 门带条件约束', color: 'bg-purple-500/10 border-purple-500/20' },
  { gate: 'PRIORITY-AND', logic: '顺序与', desc: 'AND 门，输入有顺序依赖', color: 'bg-rose-500/10 border-rose-500/20' },
];

const evaluatorTypes = [
  { type: 'skill', desc: '调用注册技能执行检测', example: 'log-analyzer 检查错误日志' },
  { type: 'rag', desc: '通过 RAG 管道检索知识', example: '查询运维手册获取解决方案' },
  { type: 'llm', desc: '使用 LLM 进行智能判断', example: '分析异常模式并做出推断' },
  { type: 'condition', desc: '简单条件评估', example: 'CPU > 80% 阈值检查' },
];

const components = [
  { name: 'FaultTree', file: 'fta/tree.py', desc: '故障树数据结构，包含 FTAEvent 和 FTAGate' },
  { name: 'FTAGate', file: 'fta/tree.py', desc: '5 种门类型实现' },
  { name: 'FTAEngine', file: 'fta/engine.py', desc: 'analyze() · cut_sets()（最小割集）· monte_carlo()' },
  { name: 'FTAEvaluator', file: 'fta/evaluator.py', desc: '概率评估器，Fussell-Vesely 重要度计算' },
  { name: 'FTASerializer', file: 'fta/serializer.py', desc: '序列化/反序列化，支持 JSON 和 Mermaid 格式' },
];

const scenarios = [
  { scene: '故障诊断', desc: '生产环境问题根因分析', example: 'API 响应延迟诊断' },
  { scene: '决策支持', desc: '多条件复杂决策', example: '订单风控审核' },
  { scene: '流程自动化', desc: '条件驱动的自动化流程', example: '发布前检查清单' },
  { scene: '知识推理', desc: '基于规则的推理系统', example: '技术问答路由' },
];

export default function FTAEnginePage() {
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/architecture">
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回架构总览
          </Link>
        </Button>
      </div>

      <PageHeader
        title="FTA 工作流引擎"
        description="故障树分析引擎 — 自顶向下演绎分析，支持 Skills/RAG/LLM 作为叶节点评估器"
      />

      {/* Scenarios */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            应用场景
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {scenarios.map((s) => (
              <div key={s.scene} className="rounded-md border border-border/50 p-3">
                <p className="text-xs font-semibold text-foreground mb-1">{s.scene}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
                <p className="text-[10px] text-primary mt-1">例：{s.example}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gate Types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            门类型
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {gateTypes.map((g) => (
              <div key={g.gate} className={cn('rounded-lg border p-3', g.color)}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="font-mono text-xs">{g.gate}</Badge>
                </div>
                <p className="text-xs font-medium mb-0.5">{g.logic}</p>
                <p className="text-[10px] text-muted-foreground">{g.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Event Types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            事件类型
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">类型</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">符号</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">说明</th>
                </tr>
              </thead>
              <tbody>
                {eventTypes.map((e) => (
                  <tr key={e.type} className="border-b border-border/30">
                    <td className="py-2 px-3 font-mono text-primary">{e.type}</td>
                    <td className="py-2 px-3">{e.icon}</td>
                    <td className="py-2 px-3 text-muted-foreground">{e.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Evaluator Types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            评估器类型
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            基本事件（叶节点）通过评估器执行实际检测，支持四种类型：
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {evaluatorTypes.map((ev) => (
              <div key={ev.type} className="rounded-md border border-border/50 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="font-mono text-xs">{ev.type}</Badge>
                  <span className="text-xs text-muted-foreground">{ev.desc}</span>
                </div>
                <p className="text-[10px] text-primary">例：{ev.example}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Core Components */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            核心组件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">组件</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">位置</th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">说明</th>
                </tr>
              </thead>
              <tbody>
                {components.map((c) => (
                  <tr key={c.name} className="border-b border-border/30">
                    <td className="py-2 px-3 font-mono text-primary">{c.name}</td>
                    <td className="py-2 px-3 font-mono text-muted-foreground">{c.file}</td>
                    <td className="py-2 px-3 text-muted-foreground">{c.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Fault Tree Diagram */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            故障树结构示例
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 font-mono text-xs overflow-x-auto">
            <pre className="text-muted-foreground whitespace-pre">{`                    ┌─────────────────────┐
                    │     顶级事件        │  Top Event
                    │  (Root Cause Found) │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    │       OR 门         │  Gate
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
    ┌───────────┐       ┌───────────┐       ┌───────────┐
    │ 日志分析  │       │ 指标异常  │       │ 知识检索  │
    │ (Skill)   │       │ (Skill)   │       │  (RAG)    │
    └───────────┘       └───────────┘       └───────────┘`}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
