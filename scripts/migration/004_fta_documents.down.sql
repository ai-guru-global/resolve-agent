-- =============================================================================
-- ResolveAgent - Migration 004 Down: Drop FTA Document Store
-- =============================================================================

SET search_path TO resolveagent, public;

DROP TABLE IF EXISTS fta_analysis_results CASCADE;
DROP TABLE IF EXISTS fta_documents CASCADE;
