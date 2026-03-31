-- =============================================================================
-- ResolveAgent - Database Initialization Script
-- =============================================================================
-- Executed automatically on first PostgreSQL container startup.
-- Creates required extensions, schemas, and base tables.
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================================
-- Schema
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS resolveagent;
SET search_path TO resolveagent, public;

-- =============================================================================
-- Agents Registry
-- =============================================================================
CREATE TABLE IF NOT EXISTS agents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL UNIQUE,
    display_name    VARCHAR(255),
    description     TEXT,
    version         VARCHAR(50) NOT NULL DEFAULT '0.1.0',
    status          VARCHAR(50) NOT NULL DEFAULT 'inactive',
    config          JSONB NOT NULL DEFAULT '{}',
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_name ON agents(name);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- =============================================================================
-- Skills Registry
-- =============================================================================
CREATE TABLE IF NOT EXISTS skills (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL UNIQUE,
    display_name    VARCHAR(255),
    description     TEXT,
    version         VARCHAR(50) NOT NULL DEFAULT '0.1.0',
    category        VARCHAR(100),
    manifest        JSONB NOT NULL DEFAULT '{}',
    status          VARCHAR(50) NOT NULL DEFAULT 'inactive',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);

-- =============================================================================
-- Workflows
-- =============================================================================
CREATE TABLE IF NOT EXISTS workflows (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL UNIQUE,
    display_name    VARCHAR(255),
    description     TEXT,
    version         VARCHAR(50) NOT NULL DEFAULT '0.1.0',
    workflow_type   VARCHAR(50) NOT NULL DEFAULT 'fta',
    definition      JSONB NOT NULL DEFAULT '{}',
    status          VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflows_name ON workflows(name);
CREATE INDEX IF NOT EXISTS idx_workflows_type ON workflows(workflow_type);

-- =============================================================================
-- Workflow Executions
-- =============================================================================
CREATE TABLE IF NOT EXISTS workflow_executions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id     UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
    input           JSONB NOT NULL DEFAULT '{}',
    output          JSONB DEFAULT '{}',
    error           TEXT,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);

-- =============================================================================
-- Model Registry
-- =============================================================================
CREATE TABLE IF NOT EXISTS models (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id        VARCHAR(255) NOT NULL UNIQUE,
    provider        VARCHAR(100) NOT NULL,
    model_name      VARCHAR(255) NOT NULL,
    max_tokens      INTEGER NOT NULL DEFAULT 8192,
    default_temp    REAL DEFAULT 0.7,
    enabled         BOOLEAN NOT NULL DEFAULT true,
    config          JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider);

-- =============================================================================
-- Audit Log
-- =============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id              BIGSERIAL PRIMARY KEY,
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    action          VARCHAR(50) NOT NULL,
    actor           VARCHAR(255),
    details         JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);

-- =============================================================================
-- Updated_at trigger function
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['agents', 'skills', 'workflows', 'models'])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trigger_update_%I_updated_at ON %I;
            CREATE TRIGGER trigger_update_%I_updated_at
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END;
$$;

-- =============================================================================
-- Grant permissions
-- =============================================================================
GRANT USAGE ON SCHEMA resolveagent TO resolveagent;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA resolveagent TO resolveagent;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA resolveagent TO resolveagent;
ALTER DEFAULT PRIVILEGES IN SCHEMA resolveagent GRANT ALL ON TABLES TO resolveagent;
ALTER DEFAULT PRIVILEGES IN SCHEMA resolveagent GRANT ALL ON SEQUENCES TO resolveagent;
