import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Brain,
  GitBranch,
  RefreshCw,
  Play,
  CheckCircle,
  Clock,
} from 'lucide-react';

export default function PlannerArchitecturePage() {
  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitBranch className="h-6 w-6" />
          🌳 Hybrid Planner
        </h1>
        <p className="text-muted-foreground">Plan-and-Execute 双模式 - REACTIVE / DELIBERATIVE</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="execution">Execution</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* REACTIVE Mode */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  REACTIVE Mode | 快速响应
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  直接 ReAct 循环，无需预先规划
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <div className="text-sm font-mono">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                      <span>Thought: 分析问题</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span>Action: search → 执行搜索</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                      <span>Observation: 获得结果</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* DELIBERATIVE Mode */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  DELIBERATIVE Mode | 深思熟虑
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  LLM 分解目标，多步骤执行
                </p>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-purple-200 text-purple-700">Step 1</Badge>
                      <span className="text-sm">收集问题信息</span>
                      <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-purple-200 text-purple-700">Step 2</Badge>
                      <span className="text-sm">执行诊断</span>
                      <Play className="w-4 h-4 text-blue-500 ml-auto" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-purple-200 text-purple-700">Step 3</Badge>
                      <span className="text-sm">验证结果</span>
                      <Clock className="w-4 h-4 text-muted-foreground ml-auto" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Replan Flow */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Replan Flow | 重规划流程</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-6 bg-muted/30 rounded-lg overflow-x-auto">
                <div className="text-center min-w-[80px]">
                  <div className="w-14 h-14 bg-blue-500 rounded-lg flex items-center justify-center text-white text-xl mb-2 mx-auto">
                    📋
                  </div>
                  <div className="text-sm">Create Plan</div>
                </div>
                <div className="text-2xl text-muted-foreground mx-2">→</div>
                <div className="text-center min-w-[80px]">
                  <div className="w-14 h-14 bg-green-500 rounded-lg flex items-center justify-center text-white text-xl mb-2 mx-auto">
                    ▶
                  </div>
                  <div className="text-sm">Execute Steps</div>
                </div>
                <div className="text-2xl text-muted-foreground mx-2">→</div>
                <div className="text-center min-w-[80px]">
                  <div className="w-14 h-14 bg-red-500 rounded-lg flex items-center justify-center text-white text-xl mb-2 mx-auto">
                    ⚠
                  </div>
                  <div className="text-sm">Step Failed</div>
                </div>
                <div className="text-2xl text-muted-foreground mx-2">→</div>
                <div className="text-center min-w-[80px]">
                  <div className="w-14 h-14 bg-purple-500 rounded-lg flex items-center justify-center text-white mb-2 mx-auto">
                    <RefreshCw className="w-6 h-6" />
                  </div>
                  <div className="text-sm">Replan</div>
                </div>
                <div className="text-2xl text-muted-foreground mx-2">→</div>
                <div className="text-center min-w-[80px]">
                  <div className="w-14 h-14 bg-green-500 rounded-lg flex items-center justify-center text-white text-xl mb-2 mx-auto">
                    ✓
                  </div>
                  <div className="text-sm">Complete</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="execution" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plan Execution Demo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm font-semibold mb-2">Goal: 诊断 API 500 错误</div>
                <div className="flex gap-2">
                  <Badge variant="outline">Mode: DELIBERATIVE</Badge>
                  <Badge variant="outline">Max Replans: 3</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <div className="flex-1">
                    <div className="font-medium">Step 1: Gather Info</div>
                    <div className="text-sm text-muted-foreground">收集 API 日志和错误信息</div>
                  </div>
                  <Badge variant="default">Completed</Badge>
                </div>

                <div className="flex items-center p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                  <Play className="w-5 h-5 text-blue-500 mr-3" />
                  <div className="flex-1">
                    <div className="font-medium">Step 2: Diagnose Root Cause</div>
                    <div className="text-sm text-muted-foreground">分析错误堆栈和依赖服务</div>
                  </div>
                  <Badge variant="default" className="bg-blue-500">Running</Badge>
                </div>

                <div className="flex items-center p-3 bg-muted/30 border border-muted rounded opacity-50">
                  <div className="w-5 mr-3" />
                  <div className="flex-1">
                    <div className="font-medium">Step 3: Execute Fix</div>
                    <div className="text-sm text-muted-foreground">应用修复方案</div>
                  </div>
                  <Badge variant="secondary">Pending</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Planner Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
{`# planning.py Configuration

HybridPlanner:
  llm_provider: null           # LLM for decomposition
  max_replan_attempts: 3       # Max replan retries
  step_timeout: 30.0           # Step timeout (seconds)

ReActExecutor:
  max_iterations: 5             # Max ReAct iterations

# Planning Modes
PlanningMode:
  REACTIVE:
    - Direct ReAct loop
    - Fast response
    - No pre-planning

  DELIBERATIVE:
    - LLM goal decomposition
    - Multi-step execution
    - Replan on failure`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}