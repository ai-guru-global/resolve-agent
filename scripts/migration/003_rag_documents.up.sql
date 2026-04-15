-- =============================================================================
-- ResolveAgent - Migration 003: RAG Document Store
-- =============================================================================
-- Creates rag_documents and rag_ingestion_history tables for document
-- metadata tracking. Vector storage is handled by Milvus/Qdrant.
-- =============================================================================

SET search_path TO resolveagent, public;

-- =============================================================================
-- RAG Documents
-- =============================================================================
CREATE TABLE IF NOT EXISTS rag_documents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id   VARCHAR(255) NOT NULL,
    title           VARCHAR(512),
    source_uri      VARCHAR(1024),
    content_hash    VARCHAR(128),
    content_type    VARCHAR(100),
    chunk_count     INTEGER DEFAULT 0,
    vector_ids      TEXT[],
    metadata        JSONB NOT NULL DEFAULT '{}',
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
    size_bytes      BIGINT DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- RAG Ingestion History
-- =============================================================================
CREATE TABLE IF NOT EXISTS rag_ingestion_history (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_id   VARCHAR(255) NOT NULL,
    document_id     UUID REFERENCES rag_documents(id) ON DELETE SET NULL,
    action          VARCHAR(50) NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
    chunks_processed INTEGER DEFAULT 0,
    vectors_created INTEGER DEFAULT 0,
    error           TEXT,
    duration_ms     INTEGER,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS trigger_update_rag_documents_updated_at ON rag_documents;
CREATE TRIGGER trigger_update_rag_documents_updated_at
    BEFORE UPDATE ON rag_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
