-- =============================================================================
-- ResolveAgent - Migration 008: Rollback Troubleshooting Solutions
-- =============================================================================

SET search_path TO resolveagent, public;

DROP TABLE IF EXISTS solution_executions;
DROP TABLE IF EXISTS troubleshooting_solutions;
