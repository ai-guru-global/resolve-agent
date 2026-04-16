import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import AgentList from './pages/Agents/AgentList';
import AgentDetail from './pages/Agents/AgentDetail';
import AgentCreate from './pages/Agents/AgentCreate';
import AgentEdit from './pages/Agents/AgentEdit';
import AgentMemory from './pages/Agents/AgentMemory';
import ExecutionDetail from './pages/Agents/ExecutionDetail';
import AgentAnalytics from './pages/Agents/AgentAnalytics';
import AgentTemplates from './pages/Agents/AgentTemplates';
import AgentCompare from './pages/Agents/AgentCompare';
import AgentDiagnostics from './pages/Agents/AgentDiagnostics';
import AgentDeployment from './pages/Agents/AgentDeployment';
import AgentCollaboration from './pages/Agents/AgentCollaboration';
import AccessControl from './pages/Agents/AccessControl';
import SkillList from './pages/Skills/SkillList';
import SkillDetail from './pages/Skills/SkillDetail';
import WorkflowList from './pages/Workflows/WorkflowList';
import WorkflowDesigner from './pages/Workflows/WorkflowDesigner';
import WorkflowExecution from './pages/Workflows/WorkflowExecution';
import Documents from './pages/RAG/Documents';
import Collections from './pages/RAG/Collections';
import SolutionList from './pages/Solutions/SolutionList';
import SolutionDetail from './pages/Solutions/SolutionDetail';
import CodeAnalysisPage from './pages/CodeAnalysis';
import Playground from './pages/Playground';
import TraceAnalysis from './pages/Traces';
import EvaluationBenchmark from './pages/Evaluation';
import MonitorAlerts from './pages/Monitoring';
import Settings from './pages/Settings';
import DatabaseOverview from './pages/Database';
import ArchitecturePage from './pages/Architecture';
import DatabaseSchemaPage from './pages/DatabaseSchema';
import SelectorPage from './pages/Selector';
import SelectorAdaptersPage from './pages/SelectorAdapters';
import FTAEnginePage from './pages/FTAEngine';
import AgentScopeHigressPage from './pages/AgentScopeHigress';
import TicketSummaryPage from './pages/TicketSummary';
import Demo from './pages/Demo';
import Mobile from './pages/Mobile';

export default function App() {
  return (
    <MainLayout>
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
        <Route path="/mobile" element={<Mobile />} />
        <Route path="/architecture/:doc" element={<ArchitecturePage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/demo" element={<Demo />} />
      </Routes>
    </MainLayout>
  );
}
