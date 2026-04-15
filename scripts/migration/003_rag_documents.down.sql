-- =============================================================================
-- ResolveAgent - Migration 003 Down: Drop RAG Document Store
-- =============================================================================

SET search_path TO resolveagent, public;

DROP TABLE IF EXISTS rag_ingestion_history CASCADE;
DROP TABLE IF EXISTS rag_documents CASCADE;
