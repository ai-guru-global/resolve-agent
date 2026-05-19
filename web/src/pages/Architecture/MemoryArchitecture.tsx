import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Database,
  Server,
  Cloud,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function MemoryArchitecturePage() {
  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6" />
          💾 Hierarchical Memory
        </h1>
        <p className="text-muted-foreground">三层记忆架构 - Working / Episodic / Long-term</p>
      </div>

      {/* Three Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Server className="w-4 h-4 text-white" />
              </div>
              Working Memory
            </CardTitle>
            <p className="text-xs text-muted-foreground">In-Process Rolling Window</p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              最近 20 条记忆，实时访问，毫秒级延迟
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Capacity</span>
                <span className="font-medium">20 entries</span>
              </div>
              <Progress value={65} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              Episodic Memory
            </CardTitle>
            <p className="text-xs text-muted-foreground">Redis Session Storage</p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Session 级别压缩存储，支持跨进程访问
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Sessions</span>
                <span className="font-medium">128 active</span>
              </div>
              <Progress value={42} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <Cloud className="w-4 h-4 text-white" />
              </div>
              Long-term Memory
            </CardTitle>
            <p className="text-xs text-muted-foreground">RAG Vector DB</p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              跨 Session 知识沉淀，importance &gt; 0.7 触发
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Knowledge</span>
                <span className="font-medium">2,847 entries</span>
              </div>
              <Progress value={78} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Memory Flow */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Memory Flow | 记忆流动</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-6 bg-muted/30 rounded-lg">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl mb-2 mx-auto">
                📥
              </div>
              <div className="text-sm font-medium">User Message</div>
            </div>
            <ArrowRight className="h-8 w-8 text-muted-foreground mx-4" />
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-lg flex items-center justify-center mb-2 mx-auto">
                <Server className="w-8 h-8 text-blue-500" />
              </div>
              <div className="text-sm font-medium">Working</div>
              <div className="text-xs text-muted-foreground">实时</div>
            </div>
            <ArrowRight className="h-8 w-8 text-muted-foreground mx-4" />
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-lg flex items-center justify-center mb-2 mx-auto">
                <Clock className="w-8 h-8 text-purple-500" />
              </div>
              <div className="text-sm font-medium">Episodic</div>
              <div className="text-xs text-muted-foreground">压缩</div>
            </div>
            <ArrowRight className="h-8 w-8 text-muted-foreground mx-4" />
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-lg flex items-center justify-center mb-2 mx-auto">
                <Cloud className="w-8 h-8 text-green-500" />
              </div>
              <div className="text-sm font-medium">Long-term</div>
              <div className="text-xs text-muted-foreground">沉淀</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Working Memory Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Working Memory - Rolling Window</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground mb-3">最近记忆 (max_size=20)</div>
            <div className="space-y-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center p-2 bg-muted/30 rounded">
                  <span className="text-xs text-muted-foreground mr-3">
                    {new Date().toLocaleTimeString()}
                  </span>
                  <Badge variant={i % 2 === 0 ? "default" : "secondary"}>
                    {i % 2 === 0 ? 'user' : 'assistant'}
                  </Badge>
                  <span className="ml-3 text-sm">
                    Memory entry {5 - i}...
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Memory Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto">
{`# HierarchicalMemory Configuration

working_memory:
  max_size: 20          # Rolling window size
  ttl_seconds: 3600     # Entry TTL

episodic_memory:
  redis_url: "redis://localhost:6379"
  session_prefix: "session:"
  max_session_entries: 100
  compression_enabled: true

long_term_memory:
  vector_store_url: "http://localhost:19530"
  collection_name: "long_term_memory"
  importance_threshold: 0.7  # Only promote entries > 0.7
  embedding_model: "bge-large-zh"`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}