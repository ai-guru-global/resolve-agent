-- =============================================================================
-- ResolveAgent - Migration 002: Hooks Store
-- =============================================================================
-- Creates hooks and hook_executions tables for lifecycle hook management.
-- =============================================================================

SET search_path TO resolveagent, public;

-- =============================================================================
-- Hooks Registry
-- =============================================================================
CREATE TABLE IF NOT EXISTS hooks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL UNIQUE,
    description     TEXT,
    hook_type       VARCHAR(50) NOT NULL,
    trigger_point   VARCHAR(100) NOT NULL,
    target_id       VARCHAR(255),
    execution_order INTEGER NOT NULL DEFAULT 0,
    handler_type    VARCHAR(50) NOT NULL,
    config          JSONB NOT NULL DEFAULT '{}',
    enabled         BOOLEAN NOT NULL DEFAULT true,
    labels          JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Hook Executions
-- =============================================================================
CREATE TABLE IF NOT EXISTS hook_executions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hook_id         UUID NOT NULL REFERENCES hooks(id) ON DELETE CASCADE,
    trigger_event   VARCHAR(100) NOT NULL,
    target_entity_id VARCHAR(255),
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
    input_data      JSONB DEFAULT '{}',
    output_data     JSONB DEFAULT '{}',
    error           TEXT,
    duration_ms     INTEGER,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS trigger_update_hooks_updated_at ON hooks;
CREATE TRIGGER trigger_update_hooks_updated_at
    BEFORE UPDATE ON hooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
