import { Link } from 'react-router-dom';
import { ArrowLeft, Globe, Shield, Server, GitBranch, Database, Cpu, Layers, Route as RouteIcon } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const goComponents = [
  { name: 'GatewayConfig', path: 'pkg/config/types.go', desc: 'Higress 配置结构定义' },
  { name: 'Client', path: 'pkg/gateway/client.go', desc: 'Higress Admin API 客户端' },
  { name: 'RouteSync', path: 'pkg/gateway/route_sync.go', desc: 'Registry → Higress 路由同步' },
  { name: 'ModelRouter', path: 'pkg/gateway/model_router.go', desc: 'LLM 模型路由管理' },
  { name: 'RegistryService', path: 'pkg/service/registry_service.go', desc: 'Python 查询 Registry 的服务' },
  { name: 'AuthMiddleware', path: 'pkg/server/middleware/auth.go', desc: '统一认证中间件' },
];

const pythonComponents = [
  { name: 'RegistryClient', path: 'runtime/registry_client.py', desc: '查询 Go Registry 的 gRPC 客户端' },
  { name: 'HigressLLMProvider', path: 'llm/higress_provider.py', desc: '通过 Higress 调用 LLM' },
  { name: 'IntelligentSelector', path: 'selector/selector.py', desc: 'Agent 内部路由决策' },
  { name: 'StaticAnalysisEngine', path: 'analysis/static_engine.py', desc: '静态代码分析 (AST/CFG)' },
  { name: 'DynamicAnalysisEngine', path: 'analysis/dynamic_engine.py', desc: '动态流量分析引擎' },
  { name: 'DualWriteRAGPipeline', path: 'analysis/rag_pipeline.py', desc: 'RAG 双写管道' },
];

const registryTables = [
  { name: 'AgentRegistry', path: 'pkg/registry/agent.go', desc: 'Agent 定义和状态管理' },
  { name: 'SkillRegistry', path: 'pkg/registry/skill.go', desc: 'Skill 清单和版本管理' },
  { name: 'WorkflowRegistry', path: 'pkg/registry/workflow.go', desc: 'FTA 工作流定义' },
  { name: 'ModelRouter', path: 'pkg/gateway/model_router.go', desc: 'LLM 模型路由配置' },
  { name: 'CallGraphRegistry', path: 'pkg/registry/callgraph.go', desc: '调用图存储和查询' },
  { name: 'TrafficCaptureRegistry', path: 'pkg/registry/traffic_capture.go', desc: '流量采集配置管理' },
  { name: 'TrafficGraphRegistry', path: 'pkg/registry/traffic_graph.go', desc: '流量拓扑图管理' },
];

const routingLayers = [
  {
    layer: '外部路由',
    component: 'Higress Gateway',
    duties: ['服务发现', 'LLM 模型路由', '认证 (JWT/OAuth2)', '限流降级', '负载均衡'],
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
  },
  {
    layer: '内部路由',
    component: 'Intelligent Selector',
    duties: ['FTA 工作流路由', 'Skill 选择', 'RAG 检索', 'Code Analysis 分派'],
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
  },
];

const higressFeatures = [
  { name: '认证授权', detail: 'JWT/OAuth2 统一认证', icon: Shield },
  { name: '限流降级', detail: 'Token/请求级别限流', icon: Layers },
  { name: '模型路由', detail: 'qwen/wenxin 等多模型路由', icon: RouteIcon },
  { name: '负载均衡', detail: 'Round-robin + 健康检查', icon: Server },
];

export default function AgentScopeHigressPage() {
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
        title="AgentScope 与 Higress 深度集成"
        description="单一真相源架构模式：Go Registry 作为所有服务注册的中心，Higress 网关统一外部路由与 LLM 调用"
      />

      {/* 核心架构 */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Globe className="h-5 w-5 text-blue-400" />
            单一真相源架构
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-300 leading-relaxed">
            ResolveAgent 采用 <strong className="text-blue-400">Single Source of Truth</strong> 架构模式：
            Go Registry 作为所有服务注册的唯一中心，Python Runtime 通过 gRPC 查询 Registry，
            Higress Gateway 从 Registry 同步路由规则（每 30s）。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-4 text-center">
              <Database className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-cyan-300">Go Registry</div>
              <div className="text-xs text-slate-400 mt-1">唯一注册中心</div>
            </div>
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-4 text-center">
              <Cpu className="h-6 w-6 text-purple-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-purple-300">Python Runtime</div>
              <div className="text-xs text-slate-400 mt-1">gRPC 查询 Registry</div>
            </div>
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 text-center">
              <Globe className="h-6 w-6 text-blue-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-blue-300">Higress Gateway</div>
              <div className="text-xs text-slate-400 mt-1">同步路由规则</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registry 注册表 */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Database className="h-5 w-5 text-cyan-400" />
            Go Registry — 注册表一览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-3 text-slate-400">组件</th>
                  <th className="text-left py-2 px-3 text-slate-400">路径</th>
                  <th className="text-left py-2 px-3 text-slate-400">职责</th>
                </tr>
              </thead>
              <tbody>
                {registryTables.map((r) => (
                  <tr key={r.name} className="border-b border-slate-700/50">
                    <td className="py-2 px-3 font-mono text-cyan-300 text-xs">{r.name}</td>
                    <td className="py-2 px-3 font-mono text-slate-400 text-xs">{r.path}</td>
                    <td className="py-2 px-3 text-slate-300">{r.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 路由职责分离 */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <GitBranch className="h-5 w-5 text-amber-400" />
            路由职责分离
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routingLayers.map((layer) => (
              <div key={layer.layer} className={cn('rounded-lg border p-4', layer.bgColor)}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className={layer.color}>{layer.layer}</Badge>
                  <span className="text-sm font-semibold text-slate-200">{layer.component}</span>
                </div>
                <ul className="space-y-1">
                  {layer.duties.map((d) => (
                    <li key={d} className="text-sm text-slate-300 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Higress 网关能力 */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Globe className="h-5 w-5 text-blue-400" />
            Higress AI/API 网关
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {higressFeatures.map((f) => (
              <div key={f.name} className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 text-center">
                <f.icon className="h-5 w-5 text-blue-400 mx-auto mb-2" />
                <div className="text-sm font-semibold text-slate-200">{f.name}</div>
                <div className="text-xs text-slate-400 mt-1">{f.detail}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-slate-900/60 p-4">
            <p className="text-sm text-slate-300">
              <strong className="text-blue-300">统一 LLM 调用路径</strong>：所有 LLM 调用通过 Higress 网关，
              实现集中的速率限制和配额管理、自动故障转移到备用模型、统一的流量监控、跨租户的负载均衡。
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Go 侧组件 */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Server className="h-5 w-5 text-cyan-400" />
            Go 侧关键组件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {goComponents.map((c) => (
              <div key={c.name} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm text-cyan-300">{c.name}</span>
                  <Badge variant="outline" className="text-xs text-slate-500">{c.path}</Badge>
                </div>
                <p className="text-xs text-slate-400">{c.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Python 侧组件 */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Cpu className="h-5 w-5 text-purple-400" />
            Python 侧关键组件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pythonComponents.map((c) => (
              <div key={c.name} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm text-purple-300">{c.name}</span>
                  <Badge variant="outline" className="text-xs text-slate-500">{c.path}</Badge>
                </div>
                <p className="text-xs text-slate-400">{c.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 数据流：Agent 执行请求 */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <RouteIcon className="h-5 w-5 text-green-400" />
            数据流：Agent 执行请求
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { step: '1', label: '客户端', detail: 'POST /api/v1/agents/{id}/execute', color: 'border-slate-500' },
              { step: '2', label: 'Higress', detail: '验证 JWT → 限流检查 → 路由到 Platform', color: 'border-blue-500' },
              { step: '3', label: 'Platform Service', detail: '验证 AuthContext → 调用 Runtime (gRPC)', color: 'border-cyan-500' },
              { step: '4', label: 'Agent Runtime', detail: 'RegistryClient 查询配置 → IntelligentSelector 路由决策', color: 'border-purple-500' },
              { step: '5', label: '路由分支', detail: 'FTA Workflow / Skill 执行 / RAG 查询 / Code Analysis', color: 'border-amber-500' },
              { step: '6', label: 'LLM 调用', detail: 'HigressLLMProvider → Higress → 通义千问 API', color: 'border-green-500' },
            ].map((s) => (
              <div key={s.step} className={cn('flex items-start gap-4 rounded-lg border-l-2 bg-slate-900/40 p-3', s.color)}>
                <Badge variant="outline" className="shrink-0">{s.step}</Badge>
                <div>
                  <div className="text-sm font-semibold text-slate-200">{s.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 监控指标 */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Layers className="h-5 w-5 text-orange-400" />
            监控指标
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-2 px-3 text-slate-400">指标</th>
                  <th className="text-left py-2 px-3 text-slate-400">描述</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { metric: 'resolveagent_gateway_route_sync_total', desc: '路由同步次数' },
                  { metric: 'resolveagent_gateway_route_sync_errors', desc: '路由同步错误' },
                  { metric: 'resolveagent_llm_requests_total', desc: 'LLM 请求总数' },
                  { metric: 'resolveagent_llm_request_duration_seconds', desc: 'LLM 请求延迟' },
                  { metric: 'resolveagent_registry_queries_total', desc: 'Registry 查询次数' },
                ].map((m) => (
                  <tr key={m.metric} className="border-b border-slate-700/50">
                    <td className="py-2 px-3 font-mono text-orange-300 text-xs">{m.metric}</td>
                    <td className="py-2 px-3 text-slate-300">{m.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
