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
