-- =============================================================================
-- ResolveAgent - Migration 001: Rollback Initial Schema
-- =============================================================================

SET search_path TO resolveagent, public;

DROP TABLE IF EXISTS workflow_executions CASCADE;
DROP TABLE IF EXISTS workflows CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS agents CASCADE;
DROP TABLE IF EXISTS models CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;

DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP SCHEMA IF EXISTS resolveagent CASCADE;
