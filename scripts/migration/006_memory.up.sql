-- =============================================================================
-- ResolveAgent - Migration 006: Memory Store
-- =============================================================================
-- Creates memory_short_term and memory_long_term tables for agent memory
-- persistence. Short-term stores conversation history per session;
-- long-term stores cross-session knowledge, summaries, and preferences.
-- =============================================================================

SET search_path TO resolveagent, public;

-- =============================================================================
-- Short-Term Memory (Conversation History)
-- =============================================================================
CREATE TABLE IF NOT EXISTS memory_short_term (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id        VARCHAR(255) NOT NULL,
    conversation_id VARCHAR(255) NOT NULL,
    role            VARCHAR(50) NOT NULL,
    content         TEXT NOT NULL,
    token_count     INTEGER DEFAULT 0,
    metadata        JSONB DEFAULT '{}',
    sequence_num    INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (conversation_id, sequence_num)
);

-- =============================================================================
-- Long-Term Memory (Cross-Session Knowledge)
-- =============================================================================
CREATE TABLE IF NOT EXISTS memory_long_term (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id        VARCHAR(255) NOT NULL,
    user_id         VARCHAR(255),
    memory_type     VARCHAR(50) NOT NULL,
    content         TEXT NOT NULL,
    importance      REAL DEFAULT 0.5,
    access_count    INTEGER DEFAULT 0,
    source_conversations TEXT[],
    embedding_id    VARCHAR(255),
    metadata        JSONB DEFAULT '{}',
    expires_at      TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS trigger_update_memory_long_term_updated_at ON memory_long_term;
CREATE TRIGGER trigger_update_memory_long_term_updated_at
    BEFORE UPDATE ON memory_long_term
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
