import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Wrench,
  Shield,
  Search,
  Box,
  Activity,
} from 'lucide-react';

export default function ToolHubArchitecturePage() {
  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="h-6 w-6" />
          ToolHub
        </h1>
        <p className="text-muted-foreground">工具发现、Schema 注册、Capability 映射与安全策略</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="registry">Registry</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="text-center">
              <CardContent className="pt-4">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-2 text-white">
                  <Box className="w-6 h-6" />
                </div>
                <div className="text-2xl font-bold">24</div>
                <div className="text-sm text-muted-foreground">Registered Tools</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-4">
                <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-2 text-white">
                  <Search className="w-6 h-6" />
                </div>
                <div className="text-2xl font-bold">11</div>
                <div className="text-sm text-muted-foreground">Capabilities</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-4">
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-2 text-white">
                  <Shield className="w-6 h-6" />
                </div>
                <div className="text-2xl font-bold">3</div>
                <div className="text-sm text-muted-foreground">Security Events</div>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-4">
                <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mx-auto mb-2 text-white">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="text-2xl font-bold">1,247</div>
                <div className="text-sm text-muted-foreground">Executions Today</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ToolHub Components */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ToolHub Components</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Box className="w-8 h-8 text-blue-500" />
                    <div>
                      <div className="font-semibold">Schema Registry</div>
                      <div className="text-sm text-muted-foreground">工具版本管理 + Schema 验证</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <Search className="w-8 h-8 text-purple-500" />
                    <div>
                      <div className="font-semibold">Capability Map</div>
                      <div className="text-sm text-muted-foreground">能力矩阵 + 语义搜索</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <Shield className="w-8 h-8 text-green-500" />
                    <div>
                      <div className="font-semibold">Security Policy</div>
                      <div className="text-sm text-muted-foreground">权限控制 + 使用审计</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <Wrench className="w-8 h-8 text-orange-500" />
                    <div>
                      <div className="font-semibold">Discovery Service</div>
                      <div className="text-sm text-muted-foreground">MCP 自动发现 + 本地工具注册</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tool Capabilities */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tool Capabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'WEB_SEARCH', count: 5, color: 'bg-blue-500' },
                    { name: 'CODE_EXECUTION', count: 4, color: 'bg-green-500' },
                    { name: 'CODE_ANALYSIS', count: 3, color: 'bg-purple-500' },
                    { name: 'FILE_OPERATIONS', count: 4, color: 'bg-orange-500' },
                    { name: 'SECURITY_SCAN', count: 2, color: 'bg-red-500' },
                    { name: 'API_CALL', count: 6, color: 'bg-cyan-500' },
                  ].map((cap) => (
                    <div key={cap.name} className="flex items-center gap-3">
                      <Badge variant="outline" className={`${cap.color} text-white`}>
                        {cap.name}
                      </Badge>
                      <Progress
                        value={cap.count * 20}
                        className="flex-1 h-2"
                      />
                      <span className="text-sm text-muted-foreground w-16 text-right">
                        {cap.count} tools
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Security Policies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Public Tools</span>
                  <Badge variant="default">18 tools</Badge>
                </div>
                <p className="text-sm text-muted-foreground">无需确认，可自由使用</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Sensitive Tools</span>
                  <Badge variant="secondary">5 tools</Badge>
                </div>
                <p className="text-sm text-muted-foreground">需要 operator 或 admin 角色确认</p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Restricted Tools</span>
                  <Badge variant="destructive">1 tool</Badge>
                </div>
                <p className="text-sm text-muted-foreground">仅限 admin 角色使用</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-64">
{`timestamp                     tool              user      action    success
2026-05-18 10:23:45          security-scan     user-1    execute   true
2026-05-18 10:22:12          web-search        user-2    execute   true
2026-05-18 10:20:01          code-exec         user-1    execute   false
2026-05-18 10:15:33          file-ops          user-3    execute   true`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="registry" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Schema Registry</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
{`# SchemaRegistry Configuration

registered_tools:
  - name: web-search
    version: 1.0.0
    capabilities:
      - WEB_SEARCH
    security_level: public
    parameters:
      query: string
      limit: integer

  - name: code-exec
    version: 1.2.0
    capabilities:
      - CODE_EXECUTION
    security_level: sensitive
    parameters:
      code: string
      language: string
      timeout: integer

  - name: security-scan
    version: 2.1.0
    capabilities:
      - SECURITY_SCAN
    security_level: restricted
    parameters:
      target: string
      scan_type: string

# CapabilityMap
web_search:
  keywords: [search, web, google, find]
  tools: [web-search, bing-search]

code_execution:
  keywords: [code, execute, run, script]
  tools: [python-exec, bash-exec]`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}