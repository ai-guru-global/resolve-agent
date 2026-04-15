-- =============================================================================
-- ResolveAgent - Migration 005: Code Static Analysis Store
-- =============================================================================
-- Creates code_analyses and code_analysis_findings tables for storing
-- static analysis results and individual findings.
-- =============================================================================

SET search_path TO resolveagent, public;

-- =============================================================================
-- Code Analyses
-- =============================================================================
CREATE TABLE IF NOT EXISTS code_analyses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    repository_url  VARCHAR(1024),
    branch          VARCHAR(255),
    commit_sha      VARCHAR(64),
    language        VARCHAR(50),
    analyzer_type   VARCHAR(100) NOT NULL,
    config          JSONB NOT NULL DEFAULT '{}',
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
    summary         JSONB DEFAULT '{}',
    duration_ms     INTEGER,
    labels          JSONB DEFAULT '{}',
    triggered_by    VARCHAR(255),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Code Analysis Findings
-- =============================================================================
CREATE TABLE IF NOT EXISTS code_analysis_findings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    analysis_id     UUID NOT NULL REFERENCES code_analyses(id) ON DELETE CASCADE,
    rule_id         VARCHAR(255) NOT NULL,
    severity        VARCHAR(50) NOT NULL,
    category        VARCHAR(100),
    message         TEXT NOT NULL,
    file_path       VARCHAR(1024),
    line_start      INTEGER,
    line_end        INTEGER,
    column_start    INTEGER,
    column_end      INTEGER,
    snippet         TEXT,
    suggestion      TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS trigger_update_code_analyses_updated_at ON code_analyses;
CREATE TRIGGER trigger_update_code_analyses_updated_at
    BEFORE UPDATE ON code_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
