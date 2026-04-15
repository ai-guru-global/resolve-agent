-- =============================================================================
-- ResolveAgent - Migration 006 Down: Drop Memory Store
-- =============================================================================

SET search_path TO resolveagent, public;

DROP TABLE IF EXISTS memory_long_term CASCADE;
DROP TABLE IF EXISTS memory_short_term CASCADE;
