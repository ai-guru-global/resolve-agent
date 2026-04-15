import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Database,
  Layers,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Table,
  Link2,
  Zap,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const tableGroups = [
  {
    name: 'Core Registry',
    migration: '001',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    tables: ['agents', 'skills', 'workflows', 'workflow_executions', 'models', 'audit_log'],
  },
  {
    name: 'Hook Lifecycle',
    migration: '002',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    tables: ['hooks', 'hook_executions'],
  },
  {
    name: 'RAG Knowledge',
    migration: '003',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    tables: ['rag_documents', 'rag_ingestion_history'],
  },
  {
    name: 'FTA Fault Tree',
    migration: '004',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    tables: ['fta_documents', 'fta_analysis_results'],
  },
  {
    name: 'Code Analysis',
    migration: '005',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10 border-cyan-500/20',
    tables: ['code_analyses', 'code_analysis_findings'],
  },
  {
    name: 'Memory System',
    migration: '006',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10 border-rose-500/20',
    tables: ['memory_short_term', 'memory_long_term'],
  },
];

const foreignKeys = [
  { from: 'workflow_executions.workflow_id', to: 'workflows.id', onDelete: 'CASCADE' },
  { from: 'hook_executions.hook_id', to: 'hooks.id', onDelete: 'CASCADE' },
  { from: 'rag_ingestion_history.document_id', to: 'rag_documents.id', onDelete: 'SET NULL' },
  { from: 'fta_analysis_results.document_id', to: 'fta_documents.id', onDelete: 'CASCADE' },
  { from: 'code_analysis_findings.analysis_id', to: 'code_analyses.id', onDelete: 'CASCADE' },
];

const designPrinciples = [
  { label: 'UUID 主键', desc: '除 audit_log（BIGSERIAL）外，所有表使用 uuid_generate_v4()' },
  { label: 'JSONB 灵活存储', desc: '配置、元数据、分析结果等半结构化数据统一使用 JSONB 列' },
  { label: '自动 updated_at', desc: 'update_updated_at_column() 触发器自动维护时间戳' },
  { label: '级联删除策略', desc: 'CASCADE（执行记录随主实体删除）；SET NULL（摄取历史保留）' },
  { label: 'Schema 隔离', desc: '所有表置于 resolveagent Schema 下，与其他应用隔离' },
  { label: '幂等迁移', desc: 'CREATE TABLE IF NOT EXISTS + CREATE INDEX IF NOT EXISTS' },
];

const migrations = [
  { id: '001', name: 'Core Registry', tables: 6 },
  { id: '002', name: 'Hook Lifecycle', tables: 2 },
  { id: '003', name: 'RAG Documents', tables: 2 },
  { id: '004', name: 'FTA Documents', tables: 2 },
  { id: '005', name: 'Code Analysis', tables: 2 },
  { id: '006', name: 'Memory System', tables: 2 },
  { id: '007', name: 'Performance Indexes', tables: 0 },
];

function ExpandableSection({ title, children, defaultExpanded = true }: { title: string; children: React.ReactNode; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <span className="text-sm font-medium">{title}</span>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && <div className="p-4">{children}</div>}
    </div>
  );
}

export default function DatabaseSchemaPage() {
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
        title="数据库架构"
        description="PostgreSQL 持久化存储层 — 16 张表，6 个功能分组，覆盖 Agent、Skill、Workflow、RAG、FTA、代码分析和记忆系统"
      />

      {/* Design Principles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            设计原则
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {designPrinciples.map((p) => (
              <div key={p.label} className="rounded-md border border-border/50 p-3">
                <p className="text-xs font-medium text-primary mb-1">{p.label}</p>
                <p className="text-xs text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Migrations Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            迁移文件
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {migrations.map((m) => (
              <div key={m.id} className="flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2">
                <Badge variant="outline" className="font-mono text-xs">v{m.id}</Badge>
                <span className="text-xs">{m.name}</span>
                {m.tables > 0 && (
                  <Badge variant="secondary" className="text-[10px]">{m.tables} 表</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table Groups */}
      <ExpandableSection title="表分组概览">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tableGroups.map((group) => (
            <div key={group.name} className={cn('rounded-lg border p-4', group.bgColor)}>
              <div className="flex items-center gap-2 mb-3">
                <Database className={cn('h-4 w-4', group.color)} />
                <span className="text-sm font-medium">{group.name}</span>
                <Badge variant="outline" className="text-[10px] ml-auto">v{group.migration}</Badge>
              </div>
              <div className="space-y-1">
                {group.tables.map((table) => (
                  <div key={table} className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <Table className="h-3 w-3" />
                    {table}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ExpandableSection>

      {/* Foreign Keys */}
      <ExpandableSection title="外键关系">
        <div className="space-y-2">
          {foreignKeys.map((fk) => (
            <div key={fk.from} className="flex items-center gap-3 rounded-md bg-muted/30 p-3 text-xs">
              <span className="font-mono text-primary">{fk.from}</span>
              <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="font-mono text-primary">{fk.to}</span>
              <Badge
                variant={fk.onDelete === 'CASCADE' ? 'destructive' : 'secondary'}
                className="text-[10px] shrink-0"
              >
                {fk.onDelete}
              </Badge>
            </div>
          ))}
        </div>
      </ExpandableSection>

      {/* Architecture Diagram */}
      <ExpandableSection title="存储架构">
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 font-mono text-xs overflow-x-auto">
          <pre className="text-muted-foreground whitespace-pre">{`
┌──────────────────────────────────────────────────────────────────────────┐
│                          Go Platform Layer                              │
│                    (Single Source of Truth)                              │
│                                                                         │
│  ┌─────────────┐    ┌─────────────────┐    ┌──────────────────────┐    │
│  │  Registry    │    │ PostgreSQL Store │    │  Inline Migration    │    │
│  │  Interfaces  │───►│ Implementations │    │  System (v1-v13)     │    │
│  └─────────────┘    └────────┬────────┘    └──────────────────────┘    │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │ HTTP
┌──────────────────────────────┼──────────────────────────────────────────┐
│                          Python Runtime                                 │
│  ┌─────────────────┐    ┌──────────────┐    ┌──────────────────────┐   │
│  │  Store Clients   │    │ Hook Runner  │    │ Memory Manager       │   │
│  └─────────────────┘    └──────────────┘    └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
          `}</pre>
        </div>
      </ExpandableSection>

      {/* Entity Relationship */}
      <ExpandableSection title="实体关系图">
        <div className="rounded-lg border border-border/50 bg-muted/30 p-4 font-mono text-xs overflow-x-auto">
          <pre className="text-muted-foreground whitespace-pre">{`
                     ┌──────────┐
                     │ agents   │
                     └──────────┘

 ┌──────────┐        ┌──────────┐        ┌──────────┐
 │ skills   │        │workflows │        │ models   │
 └──────────┘        └────┬─────┘        └──────────┘
                          │ 1:N
                          ▼
                 ┌──────────────────┐
                 │workflow_executions│
                 └──────────────────┘

 ┌──────────┐            ┌──────────────┐
 │  hooks   ├─── 1:N ──►│hook_executions│
 └──────────┘            └──────────────┘

 ┌──────────────┐            ┌────────────────────┐
 │rag_documents ├─── 1:N ──►│rag_ingestion_history│  (SET NULL)
 └──────────────┘            └────────────────────┘

 ┌──────────────┐            ┌────────────────────┐
 │fta_documents ├─── :N ──►│fta_analysis_results │  (CASCADE)
 └──────────────┘            └────────────────────┘

 ┌──────────────┐            ┌────────────────────────┐
 │code_analyses ├─── 1:N ──►│code_analysis_findings   │  (CASCADE)
 └──────────────┘            └────────────────────────┘

 ┌──────────────────┐        ┌─────────────────┐
 │memory_short_term │        │memory_long_term  │
 └──────────────────┘        └─────────────────┘

                 ┌──────────┐
                 │audit_log │  (独立表，无外键)
                 └──────────┘
          `}</pre>
        </div>
      </ExpandableSection>
    </div>
  );
}
