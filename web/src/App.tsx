import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import MainLayout from './components/Layout/MainLayout';
import Home from './pages/Home';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const AgentList = lazy(() => import('./pages/Agents/AgentList'));
const AgentDetail = lazy(() => import('./pages/Agents/AgentDetail'));
const AgentCreate = lazy(() => import('./pages/Agents/AgentCreate'));
const AgentEdit = lazy(() => import('./pages/Agents/AgentEdit'));
const AgentMemory = lazy(() => import('./pages/Agents/AgentMemory'));
const ExecutionDetail = lazy(() => import('./pages/Agents/ExecutionDetail'));
const AgentAnalytics = lazy(() => import('./pages/Agents/AgentAnalytics'));
const AgentTemplates = lazy(() => import('./pages/Agents/AgentTemplates'));
const AgentCompare = lazy(() => import('./pages/Agents/AgentCompare'));
const AgentDiagnostics = lazy(() => import('./pages/Agents/AgentDiagnostics'));
const AgentDeployment = lazy(() => import('./pages/Agents/AgentDeployment'));
const AgentCollaboration = lazy(() => import('./pages/Agents/AgentCollaboration'));
const AccessControl = lazy(() => import('./pages/Agents/AccessControl'));
const SkillList = lazy(() => import('./pages/Skills/SkillList'));
const SkillDetail = lazy(() => import('./pages/Skills/SkillDetail'));
const WorkflowList = lazy(() => import('./pages/Workflows/WorkflowList'));
const WorkflowDesigner = lazy(() => import('./pages/Workflows/WorkflowDesigner'));
const WorkflowExecution = lazy(() => import('./pages/Workflows/WorkflowExecution'));
const Documents = lazy(() => import('./pages/RAG/Documents'));
const Collections = lazy(() => import('./pages/RAG/Collections'));
const SolutionList = lazy(() => import('./pages/Solutions/SolutionList'));
const SolutionDetail = lazy(() => import('./pages/Solutions/SolutionDetail'));
const CodeAnalysisPage = lazy(() => import('./pages/CodeAnalysis'));
const Playground = lazy(() => import('./pages/Playground'));
const TraceAnalysis = lazy(() => import('./pages/Traces'));
const EvaluationBenchmark = lazy(() => import('./pages/Evaluation'));
const MonitorAlerts = lazy(() => import('./pages/Monitoring'));
const Settings = lazy(() => import('./pages/Settings'));
const DatabaseOverview = lazy(() => import('./pages/Database'));
const ArchitecturePage = lazy(() => import('./pages/Architecture'));
const DatabaseSchemaPage = lazy(() => import('./pages/DatabaseSchema'));
const SelectorPage = lazy(() => import('./pages/Selector'));
const SelectorAdaptersPage = lazy(() => import('./pages/SelectorAdapters'));
const FTAEnginePage = lazy(() => import('./pages/FTAEngine'));
const AgentScopeHigressPage = lazy(() => import('./pages/AgentScopeHigress'));
const TicketSummaryPage = lazy(() => import('./pages/TicketSummary'));
const MemoryArchitecture = lazy(() => import('./pages/Architecture/MemoryArchitecture'));
const PlannerArchitecture = lazy(() => import('./pages/Architecture/PlannerArchitecture'));
const ToolHubArchitecture = lazy(() => import('./pages/Architecture/ToolHubArchitecture'));
const LoopEngineeringArchitecture = lazy(() => import('./pages/Architecture/LoopEngineeringArchitecture'));
const Demo = lazy(() => import('./pages/Demo'));
const Mobile = lazy(() => import('./pages/Mobile'));

function LoadingFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <MainLayout>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/agents" element={<AgentList />} />
          <Route path="/agents/new" element={<AgentCreate />} />
          <Route path="/agents/templates" element={<AgentTemplates />} />
          <Route path="/agents/compare" element={<AgentCompare />} />
          <Route path="/agents/collaboration" element={<AgentCollaboration />} />
          <Route path="/agents/:id" element={<AgentDetail />} />
          <Route path="/agents/:id/edit" element={<AgentEdit />} />
          <Route path="/agents/:id/memory" element={<AgentMemory />} />
          <Route path="/agents/:id/analytics" element={<AgentAnalytics />} />
          <Route path="/agents/:id/diagnostics" element={<AgentDiagnostics />} />
          <Route path="/agents/:id/deployment" element={<AgentDeployment />} />
          <Route path="/agents/:id/access" element={<AccessControl />} />
          <Route path="/agents/:id/executions/:execId" element={<ExecutionDetail />} />
          <Route path="/skills" element={<SkillList />} />
          <Route path="/skills/:name" element={<SkillDetail />} />
          <Route path="/workflows" element={<WorkflowList />} />
          <Route path="/workflows/designer" element={<WorkflowDesigner />} />
          <Route path="/workflows/:id/execution" element={<WorkflowExecution />} />
          <Route path="/rag/documents" element={<Documents />} />
          <Route path="/rag/collections" element={<Collections />} />
          <Route path="/solutions" element={<SolutionList />} />
          <Route path="/solutions/:id" element={<SolutionDetail />} />
          <Route path="/code-analysis" element={<CodeAnalysisPage />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/traces" element={<TraceAnalysis />} />
          <Route path="/evaluation" element={<EvaluationBenchmark />} />
          <Route path="/monitoring" element={<MonitorAlerts />} />
          <Route path="/database" element={<DatabaseOverview />} />
          <Route path="/architecture" element={<ArchitecturePage />} />
          <Route path="/architecture/database-schema" element={<DatabaseSchemaPage />} />
          <Route path="/architecture/selector" element={<SelectorPage />} />
          <Route path="/architecture/selector-adapters" element={<SelectorAdaptersPage />} />
          <Route path="/architecture/fta-engine" element={<FTAEnginePage />} />
          <Route path="/architecture/agentscope-higress" element={<AgentScopeHigressPage />} />
          <Route path="/architecture/ticket-summary" element={<TicketSummaryPage />} />
          <Route path="/architecture/memory" element={<MemoryArchitecture />} />
          <Route path="/architecture/planner" element={<PlannerArchitecture />} />
          <Route path="/architecture/toolhub" element={<ToolHubArchitecture />} />
          <Route path="/architecture/loop-engineering" element={<LoopEngineeringArchitecture />} />
          <Route path="/mobile" element={<Mobile />} />
          <Route path="/architecture/:doc" element={<ArchitecturePage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/demo" element={<Demo />} />
        </Routes>
      </Suspense>
    </MainLayout>
  );
}
