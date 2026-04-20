-- =============================================================================
-- ResolveAgent - Seed Data (Unified Entry Point)
-- =============================================================================
-- Insert default + demo data for development / demo environments.
-- Run after migration: psql "$DATABASE_URL" -f scripts/seed/seed.sql
--
-- This file includes:
--   1. Default models & agent (resolveagent schema)
--   2. seed-agents.sql      — 7 agents (Go runtime schema)
--   3. seed-skills.sql      — 26 skills
--   4. seed-workflows.sql   — 39 workflows
--   5. seed-fta.sql         — 11 FTA fault tree documents
--   6. seed-rag.sql         — 87 RAG documents across 45 collections
--   7. seed-solutions.sql   — 8 troubleshooting solutions (resolveagent schema)
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 0: Default models & agent (resolveagent schema)
-- ═══════════════════════════════════════════════════════════════════════════════
SET search_path TO resolveagent, public;

-- Default models
INSERT INTO models (model_id, provider, model_name, max_tokens, default_temp, enabled, config)
VALUES
    ('qwen-plus', 'qwen', 'qwen-plus', 32768, 0.7, true, '{"description": "Qwen Plus - balanced performance"}'),
    ('qwen-turbo', 'qwen', 'qwen-turbo', 8192, 0.7, true, '{"description": "Qwen Turbo - fast responses"}'),
    ('qwen-max', 'qwen', 'qwen-max', 32768, 0.3, true, '{"description": "Qwen Max - highest quality"}'),
    ('moonshot-v1-8k', 'kimi', 'moonshot-v1-8k', 8192, 0.7, true, '{"description": "Moonshot v1 8K - Kimi fast", "base_url": "https://api.moonshot.cn/v1"}'),
    ('moonshot-v1-32k', 'kimi', 'moonshot-v1-32k', 32768, 0.7, true, '{"description": "Moonshot v1 32K - Kimi balanced", "base_url": "https://api.moonshot.cn/v1"}'),
    ('moonshot-v1-128k', 'kimi', 'moonshot-v1-128k', 131072, 0.7, true, '{"description": "Moonshot v1 128K - Kimi long context", "base_url": "https://api.moonshot.cn/v1"}')
ON CONFLICT (model_id) DO NOTHING;

-- Default agent (resolveagent schema)
INSERT INTO agents (name, display_name, description, version, status, config)
VALUES
    ('default-agent', 'Default Agent', 'A general-purpose mega agent', '0.3.0', 'active',
     '{"model_id": "moonshot-v1-8k", "system_prompt": "You are a helpful assistant powered by ResolveAgent.", "selector_config": {"strategy": "hybrid", "confidence_threshold": 0.7}}')
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 1-6: Go runtime schema seed data
-- ═══════════════════════════════════════════════════════════════════════════════
-- Reset search_path for Go runtime tables (public schema)
SET search_path TO public;

\i scripts/seed/seed-agents.sql
\i scripts/seed/seed-skills.sql
\i scripts/seed/seed-workflows.sql
\i scripts/seed/seed-fta.sql
\i scripts/seed/seed-rag.sql

-- ═══════════════════════════════════════════════════════════════════════════════
-- Part 7: Troubleshooting solutions (resolveagent schema)
-- ═══════════════════════════════════════════════════════════════════════════════
\i scripts/seed/seed-solutions.sql
