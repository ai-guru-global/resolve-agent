import { Link } from 'react-router-dom';
import {
  Database,
  BookOpen,
  ArrowRight,
  Layers,
  Search,
  Zap,
  BrainCircuit,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollections } from '@/hooks/useRAG';

export default function Collections() {
  const { data, isLoading } = useCollections();

  const collections = data?.collections ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="知识库集合 RAG Collections"
        description={isLoading ? undefined : `共 ${collections.length} 个集合`}
      />

      {/* ── RAG Pipeline Introduction ── */}
      <div className="rounded-xl border border-border/40 bg-gradient-to-br from-card/60 via-card/30 to-transparent p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Database className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-display font-bold mb-1">RAG 检索增强生成 Retrieval-Augmented Generation</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              RAG（检索增强生成）是 ResolveAgent 的<strong className="text-foreground/80">知识中枢</strong>，
              通过将外部文档转化为可语义检索的向量知识，让 LLM 在生成回答时能够引用<strong className="text-foreground/80">精确、最新的领域知识</strong>，
              而非仅依赖模型内部参数。每个知识库集合（Collection）是一个独立的向量空间，
              支持多格式文档导入、智能分块、语义嵌入和三级重排序检索。
            </p>
          </div>
        </div>

        {/* Three-column concept cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {/* Pipeline Architecture */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/15 p-3">
            <Layers className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-foreground/80">六阶段管道 6-Stage Pipeline</span>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                <strong className="text-foreground/70">解析</strong>（6 格式: MD/HTML/PDF/DOCX/JSON/TXT）→
                <strong className="text-foreground/70"> 分块</strong>（5 策略: 固定/句子/H2/H3/章节）→
                <strong className="text-foreground/70"> 嵌入</strong>（BGE 模型 via Dashscope）→
                <strong className="text-foreground/70"> 索引</strong>（Milvus IVF_FLAT）→
                <strong className="text-foreground/70"> 检索</strong>（向量相似度搜索）→
                <strong className="text-foreground/70"> 重排序</strong>（三级回退）。
              </p>
            </div>
          </div>
          {/* Retrieval & Reranking */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/15 p-3">
            <Search className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-foreground/80">语义检索与重排序 Retrieval & Reranking</span>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                查询文本经嵌入后在向量空间中进行余弦相似度搜索，候选结果通过三级重排序策略精炼：
                1) <strong className="text-foreground/70">Cross-Encoder</strong> 模型（最优精度）；
                2) <strong className="text-foreground/70">LLM 重排序</strong>（次优）；
                3) <strong className="text-foreground/70">Jaccard + MMR</strong>（无模型回退），确保任何环境下都有可靠结果。
              </p>
            </div>
          </div>
          {/* Knowledge Sources */}
          <div className="flex items-start gap-2 rounded-lg bg-muted/15 p-3">
            <FileText className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-foreground/80">多源知识汇聚 Knowledge Sources</span>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                知识库接收三类数据源：
                <strong className="text-foreground/70">语料库导入</strong>（kudig-database Git 仓库批量导入）、
                <strong className="text-foreground/70">代码分析沉淀</strong>（静态方案 + 动态报告通过 RAG 双写管道自动入库）、
                <strong className="text-foreground/70">API 直接写入</strong>（通过 REST/gRPC 接口按需添加文档）。
              </p>
            </div>
          </div>
        </div>

        {/* System synergy highlight */}
        <div className="rounded-lg bg-muted/10 border border-border/20 p-3 mb-3">
          <div className="flex items-start gap-2">
            <Zap className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <div>
              <span className="text-[11px] font-semibold text-foreground/80">与系统组件的协同 System Synergy</span>
              <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">
                <strong className="text-foreground/70">智能选择器</strong>将知识检索类请求路由到 rag 路由类型，自动匹配最相关的集合；
                <strong className="text-foreground/70">FTA 工作流</strong>的叶节点可调用 RAG 评估器，从知识库中检索证据辅助故障判定；
                <strong className="text-foreground/70">技能系统</strong>在执行过程中查询 RAG 获取上下文信息；
                <strong className="text-foreground/70">代码分析引擎</strong>通过双写管道将分析结果沉淀为可检索的向量知识，
                形成「知识导入 → 语义索引 → 智能检索 → 增强生成 → 知识沉淀」的持续增长飞轮。
              </p>
            </div>
          </div>
        </div>

        {/* Footer: pipeline flow + doc link */}
        <div className="flex items-center justify-between pt-3 border-t border-border/20">
          <div className="flex items-center gap-1.5">
            <BrainCircuit className="h-3 w-3 text-muted-foreground/60" />
            <p className="text-[10px] text-muted-foreground/60">
              流程: 文档解析 → 智能分块 → BGE 嵌入 → Milvus 索引 → 向量检索 → 三级重排序 → LLM 增强生成
            </p>
          </div>
          <Link
            to="/architecture"
            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline shrink-0"
          >
            <BookOpen className="h-3 w-3" />
            查看 RAG 管道文档
            <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : collections.length === 0 ? (
        <Card>
          <EmptyState
            icon={Database}
            title="暂无知识库集合"
            description="请通过 CLI 或 API 创建向量知识库集合，用于 RAG 检索增强生成"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <Link key={col.id} to={`/rag/documents?collection=${col.id}`}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{col.name}</CardTitle>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {col.document_count} 文档
                    </Badge>
                  </div>
                  {'description' in col && (
                    <CardDescription>{(col as { description: string }).description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    {col.vector_count.toLocaleString()} 向量
                  </span>
                  {'embedding_model' in col && (
                    <span className="font-mono text-xs">{(col as { embedding_model: string }).embedding_model}</span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
