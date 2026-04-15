-- =============================================================================
-- ResolveAgent - Migration 007: Performance Indexes
-- =============================================================================
-- Creates indexes for all tables added in migrations 002-006.
-- =============================================================================

SET search_path TO resolveagent, public;

-- Hooks
CREATE INDEX IF NOT EXISTS idx_hooks_trigger ON hooks(trigger_point);
CREATE INDEX IF NOT EXISTS idx_hooks_enabled ON hooks(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_hooks_target ON hooks(target_id) WHERE target_id IS NOT NULL;

-- Hook Executions
CREATE INDEX IF NOT EXISTS idx_hook_exec_hook ON hook_executions(hook_id);
CREATE INDEX IF NOT EXISTS idx_hook_exec_status ON hook_executions(status);

-- RAG Documents
CREATE INDEX IF NOT EXISTS idx_rag_docs_collection ON rag_documents(collection_id);
CREATE INDEX IF NOT EXISTS idx_rag_docs_hash ON rag_documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_rag_docs_status ON rag_documents(status);

-- RAG Ingestion History
CREATE INDEX IF NOT EXISTS idx_rag_ingest_collection ON rag_ingestion_history(collection_id);

-- FTA Documents
CREATE INDEX IF NOT EXISTS idx_fta_docs_workflow ON fta_documents(workflow_id) WHERE workflow_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fta_docs_status ON fta_documents(status);

-- FTA Analysis Results
CREATE INDEX IF NOT EXISTS idx_fta_results_doc ON fta_analysis_results(document_id);

-- Code Analyses
CREATE INDEX IF NOT EXISTS idx_code_analyses_status ON code_analyses(status);
CREATE INDEX IF NOT EXISTS idx_code_analyses_repo ON code_analyses(repository_url) WHERE repository_url IS NOT NULL;

-- Code Analysis Findings
CREATE INDEX IF NOT EXISTS idx_code_findings_analysis ON code_analysis_findings(analysis_id);
CREATE INDEX IF NOT EXISTS idx_code_findings_severity ON code_analysis_findings(severity);

-- Memory Short-Term
CREATE INDEX IF NOT EXISTS idx_mem_short_conv ON memory_short_term(conversation_id, sequence_num);
CREATE INDEX IF NOT EXISTS idx_mem_short_agent ON memory_short_term(agent_id);

-- Memory Long-Term
CREATE INDEX IF NOT EXISTS idx_mem_long_agent ON memory_long_term(agent_id);
CREATE INDEX IF NOT EXISTS idx_mem_long_user ON memory_long_term(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mem_long_type ON memory_long_term(memory_type);
CREATE INDEX IF NOT EXISTS idx_mem_long_importance ON memory_long_term(importance DESC);
