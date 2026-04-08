import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import Dashboard from './pages/Dashboard';
import AgentList from './pages/Agents/AgentList';
import AgentDetail from './pages/Agents/AgentDetail';
import AgentCreate from './pages/Agents/AgentCreate';
import SkillList from './pages/Skills/SkillList';
import SkillDetail from './pages/Skills/SkillDetail';
import WorkflowList from './pages/Workflows/WorkflowList';
import WorkflowDesigner from './pages/Workflows/WorkflowDesigner';
import WorkflowExecution from './pages/Workflows/WorkflowExecution';
import Documents from './pages/RAG/Documents';
import Collections from './pages/RAG/Collections';
import Playground from './pages/Playground';
import Settings from './pages/Settings';

export default function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/agents" element={<AgentList />} />
        <Route path="/agents/new" element={<AgentCreate />} />
        <Route path="/agents/:id" element={<AgentDetail />} />
        <Route path="/skills" element={<SkillList />} />
        <Route path="/skills/:name" element={<SkillDetail />} />
        <Route path="/workflows" element={<WorkflowList />} />
        <Route path="/workflows/designer" element={<WorkflowDesigner />} />
        <Route path="/workflows/:id/execution" element={<WorkflowExecution />} />
        <Route path="/rag/documents" element={<Documents />} />
        <Route path="/rag/collections" element={<Collections />} />
        <Route path="/playground" element={<Playground />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </MainLayout>
  );
}
