-- =============================================================================
-- ResolveAgent - Migration 008: Troubleshooting Solutions
-- =============================================================================
-- Structured troubleshooting solution knowledge base with four core elements:
-- problem_symptoms, key_information, troubleshooting_steps, resolution_steps.
-- =============================================================================

SET search_path TO resolveagent, public;

-- =============================================================================
-- Troubleshooting Solutions
-- =============================================================================
CREATE TABLE IF NOT EXISTS troubleshooting_solutions (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title                VARCHAR(512) NOT NULL,
    problem_symptoms     TEXT NOT NULL,
    key_information      TEXT NOT NULL,
    troubleshooting_steps TEXT NOT NULL,
    resolution_steps     TEXT NOT NULL,
    domain               VARCHAR(100),
    component            VARCHAR(255),
    severity             VARCHAR(50) NOT NULL DEFAULT 'medium',
    tags                 TEXT[],
    search_keywords      TEXT,
    version              INTEGER NOT NULL DEFAULT 1,
    status               VARCHAR(50) NOT NULL DEFAULT 'draft',
    source_uri           VARCHAR(1024),
    rag_collection_id    VARCHAR(255),
    rag_document_id      UUID,
    related_skill_names  TEXT[],
    related_workflow_ids TEXT[],
    metadata             JSONB NOT NULL DEFAULT '{}',
    created_by           VARCHAR(255),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Solution Executions
-- =============================================================================
CREATE TABLE IF NOT EXISTS solution_executions (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    solution_id          UUID NOT NULL REFERENCES troubleshooting_solutions(id) ON DELETE CASCADE,
    executor             VARCHAR(255),
    trigger_context      JSONB DEFAULT '{}',
    status               VARCHAR(50) NOT NULL DEFAULT 'pending',
    outcome_notes        TEXT,
    effectiveness_score  REAL,
    duration_ms          INTEGER,
    started_at           TIMESTAMPTZ,
    completed_at         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_ts_solutions_domain ON troubleshooting_solutions(domain);
CREATE INDEX IF NOT EXISTS idx_ts_solutions_component ON troubleshooting_solutions(component);
CREATE INDEX IF NOT EXISTS idx_ts_solutions_severity ON troubleshooting_solutions(severity);
CREATE INDEX IF NOT EXISTS idx_ts_solutions_status ON troubleshooting_solutions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_ts_solutions_tags ON troubleshooting_solutions USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_ts_solutions_search ON troubleshooting_solutions USING GIN (search_keywords gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ts_solutions_rag_doc ON troubleshooting_solutions(rag_document_id) WHERE rag_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ts_exec_solution ON solution_executions(solution_id);
CREATE INDEX IF NOT EXISTS idx_ts_exec_status ON solution_executions(status);

-- =============================================================================
-- Apply updated_at trigger
-- =============================================================================
DROP TRIGGER IF EXISTS trigger_update_troubleshooting_solutions_updated_at ON troubleshooting_solutions;
CREATE TRIGGER trigger_update_troubleshooting_solutions_updated_at
    BEFORE UPDATE ON troubleshooting_solutions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
