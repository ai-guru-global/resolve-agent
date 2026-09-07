// Package postgres provides PostgreSQL-backed implementations of the registry
// interfaces from pkg/registry, built on a shared pgx connection pool.
package postgres

import (
	"context"
	"fmt"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
	"github.com/jackc/pgx/v5"
)

// AgentRegistry implements registry.AgentRegistry using PostgreSQL.
type AgentRegistry struct {
	store *Store
}

// NewAgentRegistry creates a new PostgreSQL-backed agent registry.
func NewAgentRegistry(store *Store) *AgentRegistry {
	return &AgentRegistry{store: store}
}

// Create inserts a new agent definition row.
func (r *AgentRegistry) Create(ctx context.Context, agent *registry.AgentDefinition) error {
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO agents (id, name, description, type, config, status, labels, version)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`,
		agent.ID, agent.Name, agent.Description, agent.Type,
		agent.Config, agent.Status, agent.Labels, agent.Version,
	)
	if err != nil {
		return fmt.Errorf("creating agent: %w", err)
	}
	return nil
}

// Get scans the agent definition row with the given ID, reporting not-found
// as an error.
func (r *AgentRegistry) Get(ctx context.Context, id string) (*registry.AgentDefinition, error) {
	var agent registry.AgentDefinition
	err := r.store.pool.QueryRow(ctx, `
		SELECT id, name, description, type, config, status, labels, version
		FROM agents WHERE id = $1
	`, id).Scan(
		&agent.ID, &agent.Name, &agent.Description, &agent.Type,
		&agent.Config, &agent.Status, &agent.Labels, &agent.Version,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("agent %s not found", id)
		}
		return nil, err
	}
	return &agent, nil
}

// List returns agents ordered by name with limit/offset pagination and the
// total count.
func (r *AgentRegistry) List(ctx context.Context, opts registry.ListOptions) ([]*registry.AgentDefinition, int, error) {
	var total int
	if err := r.store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM agents").Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, name, description, type, config, status, labels, version
		FROM agents ORDER BY name LIMIT $1 OFFSET $2
	`, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var agents []*registry.AgentDefinition
	for rows.Next() {
		var a registry.AgentDefinition
		if err := rows.Scan(
			&a.ID, &a.Name, &a.Description, &a.Type,
			&a.Config, &a.Status, &a.Labels, &a.Version,
		); err != nil {
			return nil, 0, err
		}
		agents = append(agents, &a)
	}
	return agents, total, nil
}

// Update overwrites the agent definition row, reporting an error when the ID
// is absent.
func (r *AgentRegistry) Update(ctx context.Context, agent *registry.AgentDefinition) error {
	tag, err := r.store.pool.Exec(ctx, `
		UPDATE agents SET name=$2, description=$3, type=$4, config=$5, status=$6, labels=$7, version=$8
		WHERE id = $1
	`,
		agent.ID, agent.Name, agent.Description, agent.Type,
		agent.Config, agent.Status, agent.Labels, agent.Version,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("agent %s not found", agent.ID)
	}
	return nil
}

// Delete removes the agent definition row with the given ID.
func (r *AgentRegistry) Delete(ctx context.Context, id string) error {
	_, err := r.store.pool.Exec(ctx, "DELETE FROM agents WHERE id = $1", id)
	return err
}
