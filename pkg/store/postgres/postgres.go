package postgres

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Store implements the data store using PostgreSQL.
type Store struct {
	dsn    string
	logger *slog.Logger
	pool   *pgxpool.Pool
}

// New creates a new PostgreSQL store.
func New(dsn string, logger *slog.Logger) (*Store, error) {
	s := &Store{
		dsn:    dsn,
		logger: logger,
	}

	if err := s.connect(); err != nil {
		return nil, fmt.Errorf("failed to connect to postgres: %w", err)
	}

	s.logger.Info("PostgreSQL store initialized")
	return s, nil
}

// connect establishes connection to PostgreSQL.
func (s *Store) connect() error {
	ctx := context.Background()

	config, err := pgxpool.ParseConfig(s.dsn)
	if err != nil {
		return fmt.Errorf("failed to parse dsn: %w", err)
	}

	// Configure connection pool
	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = 0
	config.MaxConnIdleTime = 0

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return fmt.Errorf("failed to create connection pool: %w", err)
	}

	// Test connection
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return fmt.Errorf("failed to ping postgres: %w", err)
	}

	s.pool = pool
	return nil
}

// Health checks the PostgreSQL connection.
func (s *Store) Health(ctx context.Context) error {
	if s.pool == nil {
		return fmt.Errorf("not connected")
	}

	if err := s.pool.Ping(ctx); err != nil {
		return fmt.Errorf("postgres ping failed: %w", err)
	}

	return nil
}

// Close releases the connection pool.
func (s *Store) Close() error {
	if s.pool != nil {
		s.pool.Close()
		s.logger.Info("PostgreSQL connection closed")
	}
	return nil
}

// Exec executes a query without returning rows.
func (s *Store) Exec(ctx context.Context, sql string, args ...interface{}) error {
	_, err := s.pool.Exec(ctx, sql, args...)
	return err
}

// QueryRow executes a query returning a single row.
func (s *Store) QueryRow(ctx context.Context, sql string, args ...interface{}) pgx.Row {
	return s.pool.QueryRow(ctx, sql, args...)
}

// Query executes a query returning multiple rows.
func (s *Store) Query(ctx context.Context, sql string, args ...interface{}) (pgx.Rows, error) {
	return s.pool.Query(ctx, sql, args...)
}

// Begin starts a new transaction.
func (s *Store) Begin(ctx context.Context) (pgx.Tx, error) {
	return s.pool.Begin(ctx)
}

// Migrate runs database migrations.
func (s *Store) Migrate(ctx context.Context) error {
	s.logger.Info("Running database migrations")

	// Create migrations table if not exists
	createMigrationsTable := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`
	if _, err := s.pool.Exec(ctx, createMigrationsTable); err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// Run migrations
	migrations := []struct {
		version int
		sql     string
	}{
		{
			version: 1,
			sql: `
				CREATE TABLE IF NOT EXISTS agents (
					id VARCHAR(64) PRIMARY KEY,
					name VARCHAR(255) NOT NULL,
					description TEXT,
					type VARCHAR(50) NOT NULL,
					config JSONB,
					status VARCHAR(50) DEFAULT 'active',
					labels JSONB,
					version INTEGER DEFAULT 1,
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				)
			`,
		},
		{
			version: 2,
			sql: `
				CREATE TABLE IF NOT EXISTS skills (
					name VARCHAR(255) PRIMARY KEY,
					version VARCHAR(50) NOT NULL,
					description TEXT,
					author VARCHAR(255),
					manifest JSONB,
					source_type VARCHAR(50),
					source_uri VARCHAR(1024),
					status VARCHAR(50) DEFAULT 'active',
					labels JSONB,
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				)
			`,
		},
		{
			version: 3,
			sql: `
				CREATE TABLE IF NOT EXISTS workflows (
					id VARCHAR(64) PRIMARY KEY,
					name VARCHAR(255) NOT NULL,
					description TEXT,
					type VARCHAR(50) NOT NULL,
					definition JSONB,
					status VARCHAR(50) DEFAULT 'draft',
					version INTEGER DEFAULT 1,
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				)
			`,
		},
		{
			version: 4,
			sql: `
				CREATE TABLE IF NOT EXISTS model_routes (
					model_id VARCHAR(255) PRIMARY KEY,
					provider VARCHAR(50) NOT NULL,
					gateway_endpoint VARCHAR(512) NOT NULL,
					enabled BOOLEAN DEFAULT true,
					priority INTEGER DEFAULT 0,
					rate_limit JSONB,
					fallback_models TEXT[],
					labels JSONB,
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				)
			`,
		},
		{
			version: 5,
			sql: `
				CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
				CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(type);
				CREATE INDEX IF NOT EXISTS idx_skills_status ON skills(status);
				CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
			`,
		},
		// =====================================================================
		// Hooks Store
		// =====================================================================
		{
			version: 6,
			sql: `
				CREATE TABLE IF NOT EXISTS hooks (
					id VARCHAR(64) PRIMARY KEY,
					name VARCHAR(255) NOT NULL UNIQUE,
					description TEXT,
					hook_type VARCHAR(50) NOT NULL,
					trigger_point VARCHAR(100) NOT NULL,
					target_id VARCHAR(255),
					execution_order INTEGER NOT NULL DEFAULT 0,
					handler_type VARCHAR(50) NOT NULL,
					config JSONB NOT NULL DEFAULT '{}',
					enabled BOOLEAN NOT NULL DEFAULT true,
					labels JSONB DEFAULT '{}',
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				)
			`,
		},
		{
			version: 7,
			sql: `
				CREATE TABLE IF NOT EXISTS hook_executions (
					id VARCHAR(64) PRIMARY KEY,
					hook_id VARCHAR(64) NOT NULL REFERENCES hooks(id) ON DELETE CASCADE,
					trigger_event VARCHAR(100) NOT NULL,
					target_entity_id VARCHAR(255),
					status VARCHAR(50) NOT NULL DEFAULT 'pending',
					input_data JSONB DEFAULT '{}',
					output_data JSONB DEFAULT '{}',
					error TEXT,
					duration_ms INTEGER,
					started_at TIMESTAMP,
					completed_at TIMESTAMP,
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				)
			`,
		},
		// =====================================================================
		// RAG Document Store
		// =====================================================================
		{
			version: 8,
			sql: `
				CREATE TABLE IF NOT EXISTS rag_documents (
					id VARCHAR(64) PRIMARY KEY,
					collection_id VARCHAR(255) NOT NULL,
					title VARCHAR(512),
					source_uri VARCHAR(1024),
					content_hash VARCHAR(128),
					content_type VARCHAR(100),
					chunk_count INTEGER DEFAULT 0,
					vector_ids TEXT[],
					metadata JSONB NOT NULL DEFAULT '{}',
					status VARCHAR(50) NOT NULL DEFAULT 'pending',
					size_bytes BIGINT DEFAULT 0,
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				);
				CREATE TABLE IF NOT EXISTS rag_ingestion_history (
					id VARCHAR(64) PRIMARY KEY,
					collection_id VARCHAR(255) NOT NULL,
					document_id VARCHAR(64) REFERENCES rag_documents(id) ON DELETE SET NULL,
					action VARCHAR(50) NOT NULL,
					status VARCHAR(50) NOT NULL DEFAULT 'pending',
					chunks_processed INTEGER DEFAULT 0,
					vectors_created INTEGER DEFAULT 0,
					error TEXT,
					duration_ms INTEGER,
					metadata JSONB DEFAULT '{}',
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				)
			`,
		},
		// =====================================================================
		// FTA Document Store
		// =====================================================================
		{
			version: 9,
			sql: `
				CREATE TABLE IF NOT EXISTS fta_documents (
					id VARCHAR(64) PRIMARY KEY,
					workflow_id VARCHAR(64),
					name VARCHAR(255) NOT NULL,
					description TEXT,
					fault_tree JSONB NOT NULL DEFAULT '{}',
					version INTEGER NOT NULL DEFAULT 1,
					status VARCHAR(50) NOT NULL DEFAULT 'draft',
					metadata JSONB DEFAULT '{}',
					labels JSONB DEFAULT '{}',
					created_by VARCHAR(255),
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				);
				CREATE TABLE IF NOT EXISTS fta_analysis_results (
					id VARCHAR(64) PRIMARY KEY,
					document_id VARCHAR(64) NOT NULL REFERENCES fta_documents(id) ON DELETE CASCADE,
					execution_id VARCHAR(64),
					top_event_result BOOLEAN,
					minimal_cut_sets JSONB DEFAULT '[]',
					basic_event_probabilities JSONB DEFAULT '{}',
					gate_results JSONB DEFAULT '{}',
					importance_measures JSONB DEFAULT '{}',
					status VARCHAR(50) NOT NULL DEFAULT 'completed',
					duration_ms INTEGER,
					context JSONB DEFAULT '{}',
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				)
			`,
		},
		// =====================================================================
		// Code Static Analysis Store
		// =====================================================================
		{
			version: 10,
			sql: `
				CREATE TABLE IF NOT EXISTS code_analyses (
					id VARCHAR(64) PRIMARY KEY,
					name VARCHAR(255) NOT NULL,
					repository_url VARCHAR(1024),
					branch VARCHAR(255),
					commit_sha VARCHAR(64),
					language VARCHAR(50),
					analyzer_type VARCHAR(100) NOT NULL,
					config JSONB NOT NULL DEFAULT '{}',
					status VARCHAR(50) NOT NULL DEFAULT 'pending',
					summary JSONB DEFAULT '{}',
					duration_ms INTEGER,
					labels JSONB DEFAULT '{}',
					triggered_by VARCHAR(255),
					started_at TIMESTAMP,
					completed_at TIMESTAMP,
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				);
				CREATE TABLE IF NOT EXISTS code_analysis_findings (
					id VARCHAR(64) PRIMARY KEY,
					analysis_id VARCHAR(64) NOT NULL REFERENCES code_analyses(id) ON DELETE CASCADE,
					rule_id VARCHAR(255) NOT NULL,
					severity VARCHAR(50) NOT NULL,
					category VARCHAR(100),
					message TEXT NOT NULL,
					file_path VARCHAR(1024),
					line_start INTEGER,
					line_end INTEGER,
					column_start INTEGER,
					column_end INTEGER,
					snippet TEXT,
					suggestion TEXT,
					metadata JSONB DEFAULT '{}',
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				)
			`,
		},
		// =====================================================================
		// Memory Store - Short Term
		// =====================================================================
		{
			version: 11,
			sql: `
				CREATE TABLE IF NOT EXISTS memory_short_term (
					id VARCHAR(64) PRIMARY KEY,
					agent_id VARCHAR(255) NOT NULL,
					conversation_id VARCHAR(255) NOT NULL,
					role VARCHAR(50) NOT NULL,
					content TEXT NOT NULL,
					token_count INTEGER DEFAULT 0,
					metadata JSONB DEFAULT '{}',
					sequence_num INTEGER NOT NULL,
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
					UNIQUE (conversation_id, sequence_num)
				)
			`,
		},
		// =====================================================================
		// Memory Store - Long Term
		// =====================================================================
		{
			version: 12,
			sql: `
				CREATE TABLE IF NOT EXISTS memory_long_term (
					id VARCHAR(64) PRIMARY KEY,
					agent_id VARCHAR(255) NOT NULL,
					user_id VARCHAR(255),
					memory_type VARCHAR(50) NOT NULL,
					content TEXT NOT NULL,
					importance REAL DEFAULT 0.5,
					access_count INTEGER DEFAULT 0,
					source_conversations TEXT[],
					embedding_id VARCHAR(255),
					metadata JSONB DEFAULT '{}',
					expires_at TIMESTAMP,
					last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
					created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
					updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
				)
			`,
		},
		// =====================================================================
		// Performance Indexes for all new tables
		// =====================================================================
		{
			version: 13,
			sql: `
				CREATE INDEX IF NOT EXISTS idx_hooks_trigger ON hooks(trigger_point);
				CREATE INDEX IF NOT EXISTS idx_hooks_enabled ON hooks(enabled) WHERE enabled = true;
				CREATE INDEX IF NOT EXISTS idx_hook_exec_hook ON hook_executions(hook_id);
				CREATE INDEX IF NOT EXISTS idx_hook_exec_status ON hook_executions(status);
				CREATE INDEX IF NOT EXISTS idx_rag_docs_collection ON rag_documents(collection_id);
				CREATE INDEX IF NOT EXISTS idx_rag_docs_hash ON rag_documents(content_hash);
				CREATE INDEX IF NOT EXISTS idx_rag_docs_status ON rag_documents(status);
				CREATE INDEX IF NOT EXISTS idx_rag_ingest_collection ON rag_ingestion_history(collection_id);
				CREATE INDEX IF NOT EXISTS idx_fta_docs_workflow ON fta_documents(workflow_id);
				CREATE INDEX IF NOT EXISTS idx_fta_docs_status ON fta_documents(status);
				CREATE INDEX IF NOT EXISTS idx_fta_results_doc ON fta_analysis_results(document_id);
				CREATE INDEX IF NOT EXISTS idx_code_analyses_status ON code_analyses(status);
				CREATE INDEX IF NOT EXISTS idx_code_analyses_repo ON code_analyses(repository_url);
				CREATE INDEX IF NOT EXISTS idx_code_findings_analysis ON code_analysis_findings(analysis_id);
				CREATE INDEX IF NOT EXISTS idx_code_findings_severity ON code_analysis_findings(severity);
				CREATE INDEX IF NOT EXISTS idx_mem_short_conv ON memory_short_term(conversation_id, sequence_num);
				CREATE INDEX IF NOT EXISTS idx_mem_short_agent ON memory_short_term(agent_id);
				CREATE INDEX IF NOT EXISTS idx_mem_long_agent ON memory_long_term(agent_id);
				CREATE INDEX IF NOT EXISTS idx_mem_long_type ON memory_long_term(memory_type);
				CREATE INDEX IF NOT EXISTS idx_mem_long_importance ON memory_long_term(importance DESC)
			`,
		},
	}

	for _, migration := range migrations {
		// Check if migration already applied
		var exists bool
		err := s.pool.QueryRow(ctx,
			"SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)",
			migration.version,
		).Scan(&exists)
		if err != nil {
			return fmt.Errorf("failed to check migration %d: %w", migration.version, err)
		}

		if exists {
			s.logger.Debug("Migration already applied", "version", migration.version)
			continue
		}

		// Apply migration
		if _, err := s.pool.Exec(ctx, migration.sql); err != nil {
			return fmt.Errorf("failed to apply migration %d: %w", migration.version, err)
		}

		// Record migration
		if _, err := s.pool.Exec(ctx,
			"INSERT INTO schema_migrations (version) VALUES ($1)",
			migration.version,
		); err != nil {
			return fmt.Errorf("failed to record migration %d: %w", migration.version, err)
		}

		s.logger.Info("Applied migration", "version", migration.version)
	}

	s.logger.Info("Database migrations completed")
	return nil
}

// GetAgent retrieves an agent by ID.
func (s *Store) GetAgent(ctx context.Context, id string) (*AgentRecord, error) {
	var agent AgentRecord
	err := s.pool.QueryRow(ctx, `
		SELECT id, name, description, type, config, status, labels, version, created_at, updated_at
		FROM agents WHERE id = $1
	`, id).Scan(
		&agent.ID, &agent.Name, &agent.Description, &agent.Type,
		&agent.Config, &agent.Status, &agent.Labels, &agent.Version,
		&agent.CreatedAt, &agent.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("agent not found: %s", id)
		}
		return nil, err
	}
	return &agent, nil
}

// AgentRecord represents an agent in the database.
type AgentRecord struct {
	ID          string
	Name        string
	Description string
	Type        string
	Config      map[string]interface{}
	Status      string
	Labels      map[string]string
	Version     int
	CreatedAt   string
	UpdatedAt   string
}
