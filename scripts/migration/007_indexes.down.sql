-- =============================================================================
-- ResolveAgent - Migration 007 Down: Drop Performance Indexes
-- =============================================================================

SET search_path TO resolveagent, public;

-- Memory Long-Term
DROP INDEX IF EXISTS idx_mem_long_importance;
DROP INDEX IF EXISTS idx_mem_long_type;
DROP INDEX IF EXISTS idx_mem_long_user;
DROP INDEX IF EXISTS idx_mem_long_agent;

-- Memory Short-Term
DROP INDEX IF EXISTS idx_mem_short_agent;
DROP INDEX IF EXISTS idx_mem_short_conv;

-- Code Analysis Findings
DROP INDEX IF EXISTS idx_code_findings_severity;
DROP INDEX IF EXISTS idx_code_findings_analysis;

-- Code Analyses
DROP INDEX IF EXISTS idx_code_analyses_repo;
DROP INDEX IF EXISTS idx_code_analyses_status;

-- FTA Analysis Results
DROP INDEX IF EXISTS idx_fta_results_doc;

-- FTA Documents
DROP INDEX IF EXISTS idx_fta_docs_status;
DROP INDEX IF EXISTS idx_fta_docs_workflow;

-- RAG Ingestion History
DROP INDEX IF EXISTS idx_rag_ingest_collection;

-- RAG Documents
DROP INDEX IF EXISTS idx_rag_docs_status;
DROP INDEX IF EXISTS idx_rag_docs_hash;
DROP INDEX IF EXISTS idx_rag_docs_collection;

-- Hook Executions
DROP INDEX IF EXISTS idx_hook_exec_status;
DROP INDEX IF EXISTS idx_hook_exec_hook;

-- Hooks
DROP INDEX IF EXISTS idx_hooks_target;
DROP INDEX IF EXISTS idx_hooks_enabled;
DROP INDEX IF EXISTS idx_hooks_trigger;
