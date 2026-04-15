-- =============================================================================
-- ResolveAgent - Migration 005 Down: Drop Code Static Analysis Store
-- =============================================================================

SET search_path TO resolveagent, public;

DROP TABLE IF EXISTS code_analysis_findings CASCADE;
DROP TABLE IF EXISTS code_analyses CASCADE;
