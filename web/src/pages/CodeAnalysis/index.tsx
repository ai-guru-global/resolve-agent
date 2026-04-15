import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/PageHeader';
import CallGraphList from './CallGraphList';
import TrafficAnalysis from './TrafficAnalysis';
import K8sCorpusAnalysis from './K8sCorpusAnalysis';

export default function CodeAnalysisPage() {
  const [activeTab, setActiveTab] = useState('call-graphs');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Code Analysis Corpus"
        description="Static call graph analysis and dynamic traffic capture analysis for solution generation"
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="call-graphs">Call Graphs</TabsTrigger>
          <TabsTrigger value="traffic">Traffic Analysis</TabsTrigger>
          <TabsTrigger value="k8s-corpus">K8s 源码语料</TabsTrigger>
        </TabsList>

        <TabsContent value="call-graphs" className="mt-4">
          <CallGraphList />
        </TabsContent>

        <TabsContent value="traffic" className="mt-4">
          <TrafficAnalysis />
        </TabsContent>

        <TabsContent value="k8s-corpus" className="mt-4">
          <K8sCorpusAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}
