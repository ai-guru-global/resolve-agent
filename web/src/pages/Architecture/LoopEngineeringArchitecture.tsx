import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Repeat, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { LoopEngineeringDiagram } from './index';

const stages = [
  {
    name: 'Observe（观察）',
    desc: '采集健康检查、重试、工作流、遥测四类信号，产出 FeedbackSignal 反馈信号原子单元',
  },
  {
    name: 'Orient（研判）',
    desc: '信号先进入环形缓冲 RingBuffer（容量 1000），再由聚合器 Aggregator 按 5 分钟滑动窗口归并',
  },
  {
    name: 'Decide（决策）',
    desc: '告警引擎 Alert Engine 对聚合结果做规则评估，输出 notify 通知或 circuit_break 熔断指令',
  },
  {
    name: 'Act（处置）',
    desc: '执行熔断器 Circuit Breaker 状态切换、自适应权重调整与 Hook Chain 钩子链回调',
  },
];

export default function LoopEngineeringArchitecturePage() {
  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <RefreshCw className="h-6 w-6" />
          Loop Engineering 循环工程
        </h1>
        <p className="text-muted-foreground">
          Observe（观察）→ Orient（研判）→ Decide（决策）→ Act（处置）持续反馈闭环
        </p>
      </div>

      {/* Overview + Diagram */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">闭环全景</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            ResolveAgent 集成 <span className="font-semibold text-foreground">Loop Engineering（循环工程）</span> 方法论，
            实现 <span className="font-mono text-xs text-primary">Observe → Orient → Decide → Act</span> 持续闭环改进。
            反馈信号从各子系统采集，经过环形缓冲和滑动窗口聚合，由告警引擎决策，最终驱动熔断器和自适应权重调整。
          </p>
          <LoopEngineeringDiagram />
        </CardContent>
      </Card>

      {/* Four Stages */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stages.map((stage) => (
          <Card key={stage.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{stage.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">{stage.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Three Mechanisms */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-t-4 border-t-rose-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Repeat className="h-4 w-4 text-rose-500" />
              反馈循环
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              反馈信号（FeedbackSignal）原子单元先写入环形缓冲（RingBuffer，容量 1000），再由聚合器（Aggregator）按 5 分钟滑动窗口归并，最后经日志（Log）、网钩（Webhook）、消息总线（NATS）三种分发器送出。
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-orange-500" />
              熔断器
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              三态状态机：闭合（Closed）→ 熔断（Open）→ 半开（Half-Open）→ 闭合。连续失败达到 5 次（failure_threshold=5）触发熔断，30 秒（recovery_timeout=30s）后进入半开探测，探测通过即恢复。
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-purple-500" />
              自适应选择器
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              自适应权重调整器（AdaptiveWeightAdjuster）依据调用成功率动态调整各线路权重；历史数据按时间衰减因子 0.95 逐步向中性值回归，避免旧数据长期主导决策。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
