import { useState, useMemo } from 'react';
import {
  DatabaseZap,
  Table2,
  Columns3,
  Link2,
  Layers,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { allTables } from '@/data/dbSchema';
import SchemaTab from './SchemaTab';
import MockDataTab from './MockDataTab';
import RelationshipTab from './RelationshipTab';

export default function DatabaseOverview() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const stats = useMemo(() => {
    const totalColumns = allTables.reduce((sum, t) => sum + t.columns.length, 0);
    const totalFKs = allTables.reduce((sum, t) => sum + t.foreignKeys.length, 0);
    return {
      tables: allTables.length,
      columns: totalColumns,
      foreignKeys: totalFKs,
      migrations: 7,
    };
  }, []);

  return (
    <div className="space-y-6 animate-slide-up">
      <PageHeader
        title="记忆 & 数据库"
        description="Resolve Agent PostgreSQL 持久化层 — 数据库结构、关系图与示例数据"
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard icon={Table2} value={String(stats.tables)} label="数据表" />
        <MetricCard icon={Columns3} value={String(stats.columns)} label="字段总数" />
        <MetricCard icon={Link2} value={String(stats.foreignKeys)} label="外键关系" />
        <MetricCard icon={Layers} value={String(stats.migrations)} label="迁移版本" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="schema">
        <TabsList className="h-9">
          <TabsTrigger value="schema" className="text-xs px-4 h-8">
            <DatabaseZap className="h-3.5 w-3.5 mr-1.5" />
            数据结构
          </TabsTrigger>
          <TabsTrigger value="relationships" className="text-xs px-4 h-8">
            <Link2 className="h-3.5 w-3.5 mr-1.5" />
            关系图
          </TabsTrigger>
          <TabsTrigger value="mockdata" className="text-xs px-4 h-8">
            <Table2 className="h-3.5 w-3.5 mr-1.5" />
            示例数据
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schema" className="mt-4">
          <SchemaTab
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedGroup={selectedGroup}
            onGroupChange={setSelectedGroup}
          />
        </TabsContent>

        <TabsContent value="relationships" className="mt-4">
          <RelationshipTab />
        </TabsContent>

        <TabsContent value="mockdata" className="mt-4">
          <MockDataTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
