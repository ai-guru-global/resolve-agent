-- =============================================================================
-- ResolveAgent - Migration 002 Down: Drop Hooks Store
-- =============================================================================

SET search_path TO resolveagent, public;

DROP TABLE IF EXISTS hook_executions CASCADE;
DROP TABLE IF EXISTS hooks CASCADE;
