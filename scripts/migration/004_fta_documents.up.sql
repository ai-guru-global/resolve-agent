-- =============================================================================
-- ResolveAgent - Migration 004: FTA Document Store
-- =============================================================================
-- Creates fta_documents and fta_analysis_results tables for Fault Tree
-- Analysis document management and analysis result persistence.
-- =============================================================================

SET search_path TO resolveagent, public;

-- =============================================================================
-- FTA Documents
-- =============================================================================
CREATE TABLE IF NOT EXISTS fta_documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id     VARCHAR(64),
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    fault_tree      JSONB NOT NULL DEFAULT '{}',
    version         INTEGER NOT NULL DEFAULT 1,
    status          VARCHAR(50) NOT NULL DEFAULT 'draft',
    metadata        JSONB DEFAULT '{}',
    labels          JSONB DEFAULT '{}',
    created_by      VARCHAR(255),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- FTA Analysis Results
-- =============================================================================
CREATE TABLE IF NOT EXISTS fta_analysis_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id     UUID NOT NULL REFERENCES fta_documents(id) ON DELETE CASCADE,
    execution_id    UUID,
    top_event_result BOOLEAN,
    minimal_cut_sets JSONB DEFAULT '[]',
    basic_event_probabilities JSONB DEFAULT '{}',
    gate_results    JSONB DEFAULT '{}',
    importance_measures JSONB DEFAULT '{}',
    status          VARCHAR(50) NOT NULL DEFAULT 'completed',
    duration_ms     INTEGER,
    context         JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS trigger_update_fta_documents_updated_at ON fta_documents;
CREATE TRIGGER trigger_update_fta_documents_updated_at
    BEFORE UPDATE ON fta_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
