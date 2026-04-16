import { Link } from 'react-router-dom';
import { Layers, ArrowLeft, Zap, GitBranch, Shield } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const adapters = [
  {
    name: 'IntelligentSelector',
    mode: '"selector"（默认）',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    desc: '默认 LLM 驱动的元路由器，完整三阶段流程（意图分析 → 上下文增强 → 路由决策）。',
    features: ['三种策略支持（规则/LLM/混合）', '缓存加速（SHA-256 + TTL-LRU）', '多意图检测'],
  },
  {
    name: 'HookSelectorAdapter',
    mode: '"hooks"',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    desc: '通过 HookRunner 包装 IntelligentSelector，在路由决策前后插入 pre/post hook 拦截点。',
    features: ['pre-hook 可短路返回', 'post-hook 可修改决策', '内置 intent_analysis_handler', '支持自定义 hook'],
  },
  {
    name: 'SkillSelectorAdapter',
    mode: '"skills"',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    desc: '直接通过技能调用执行路由，跳过 LLM 决策阶段，适用于已知明确目标的调用场景。',
    features: ['直接调用 run()', '无 LLM 开销', '适用于固定技能调度'],
  },
];

const hookPipeline = [
  { step: '1', name: '_ensure_default_hooks()', desc: '惰性加载，仅首次调用时安装默认 hooks' },
  { step: '2', name: 'PRE-HOOKS 执行', desc: '触发点 "selector.route"，类型 "pre"；可短路返回 RouteDecision' },
  { step: '3', name: 'IntelligentSelector.route()', desc: '核心路由逻辑执行（若未被 pre-hook 短路）' },
  { step: '4', name: 'POST-HOOKS 执行', desc: '触发点 "selector.route"，类型 "post"；可修改最终 RouteDecision' },
];

export default function SelectorAdaptersPage() {
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
        title="选择器适配器"
        description="SelectorProtocol 统一接口 — Hook/Skill 适配器架构，支持多运行模式下的路由实现"
      />

      {/* Protocol */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            SelectorProtocol
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            定义在 <code className="text-xs font-mono text-primary bg-primary/10 px-1 py-0.5 rounded">selector/protocol.py</code> 中，
            作为 <code className="text-xs font-mono">runtime_checkable</code> 的 Protocol，支持结构子类型化：
          </p>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 font-mono text-xs overflow-x-auto">
            <pre className="text-muted-foreground whitespace-pre">{`@runtime_checkable
class SelectorProtocol(Protocol):
    async def route(
        self,
        input_text: str,
        agent_id: str = "",
        context: dict[str, Any] | None = None,
        enrich_context: bool = True,
    ) -> RouteDecision: ...

    def get_strategy_info(self) -> dict[str, Any]: ...`}</pre>
          </div>
          <p className="text-xs text-muted-foreground">
            三种适配器均满足此协议，可在运行时通过 <code className="font-mono">isinstance()</code> 检查，下游代码无需更改。
          </p>
        </CardContent>
      </Card>

      {/* Three Adapters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            三种适配器实现
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {adapters.map((a) => (
              <div key={a.name} className={cn('rounded-lg border p-4', a.bgColor)}>
                <div className="mb-2">
                  <span className="text-sm font-semibold">{a.name}</span>
                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">mode: {a.mode}</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{a.desc}</p>
                <div className="space-y-1">
                  {a.features.map((f) => (
                    <div key={f} className="flex items-start gap-1.5 text-xs">
                      <span className={a.color}>•</span>
                      <span className="text-muted-foreground">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hook Pipeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            HookSelectorAdapter 执行流程
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            通过 Hooks 基础设施包装核心选择器，在路由前后提供拦截点：
          </p>
          {hookPipeline.map((h, i) => (
            <div key={h.step} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                  {h.step}
                </div>
                {i < hookPipeline.length - 1 && <div className="w-px h-4 bg-border" />}
              </div>
              <div className="pt-0.5">
                <p className="text-xs font-semibold">{h.name}</p>
                <p className="text-xs text-muted-foreground">{h.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* MegaAgent Integration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            MegaAgent 集成
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            MegaAgent 通过 <code className="text-xs font-mono text-primary bg-primary/10 px-1 py-0.5 rounded">selector_mode</code> 参数选择适配器：
          </p>
          <div className="rounded-lg border border-border/50 bg-muted/30 p-4 font-mono text-xs overflow-x-auto">
            <pre className="text-muted-foreground whitespace-pre">{`class MegaAgent(BaseAgent):
    def _get_selector(self) -> SelectorProtocol:
        if self.selector_mode == "hooks":
            return HookSelectorAdapter(strategy=self.selector_strategy)
        elif self.selector_mode == "skills":
            return SkillSelectorAdapter()
        else:  # "selector"
            return IntelligentSelector(strategy=self.selector_strategy)`}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
