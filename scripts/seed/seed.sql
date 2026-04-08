-- =============================================================================
-- ResolveAgent - Seed Data
-- =============================================================================
-- Optional: Insert default data for development / demo environments.
-- Run after migration: psql "$DATABASE_URL" -f scripts/seed/seed.sql
-- =============================================================================

SET search_path TO resolveagent, public;

-- Default models
INSERT INTO models (model_id, provider, model_name, max_tokens, default_temp, enabled, config)
VALUES
    ('qwen-plus', 'qwen', 'qwen-plus', 32768, 0.7, true, '{"description": "Qwen Plus - balanced performance"}'),
    ('qwen-turbo', 'qwen', 'qwen-turbo', 8192, 0.7, true, '{"description": "Qwen Turbo - fast responses"}'),
    ('qwen-max', 'qwen', 'qwen-max', 32768, 0.3, true, '{"description": "Qwen Max - highest quality"}')
ON CONFLICT (model_id) DO NOTHING;

-- Default agent
INSERT INTO agents (name, display_name, description, version, status, config)
VALUES
    ('default-agent', 'Default Agent', 'A general-purpose mega agent', '0.3.0', 'active',
     '{"model_id": "qwen-plus", "system_prompt": "You are a helpful assistant powered by ResolveAgent.", "selector_config": {"strategy": "hybrid", "confidence_threshold": 0.7}}')
ON CONFLICT (name) DO NOTHING;
