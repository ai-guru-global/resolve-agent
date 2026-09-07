package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
	"github.com/jackc/pgx/v5"
)

// WorkflowRegistry implements registry.WorkflowRegistry using PostgreSQL.
type WorkflowRegistry struct {
	store *Store
}

// NewWorkflowRegistry creates a new PostgreSQL-backed workflow registry.
func NewWorkflowRegistry(store *Store) *WorkflowRegistry {
	return &WorkflowRegistry{store: store}
}

// Create inserts a new workflow definition row, defaulting its type to
// "fta".
func (r *WorkflowRegistry) Create(ctx context.Context, workflow *registry.WorkflowDefinition) error {
	if workflow.Type == "" {
		workflow.Type = "fta"
	}
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO workflows (id, name, description, type, definition, status, version)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`,
		workflow.ID, workflow.Name, workflow.Description, workflow.Type,
		workflow.Tree, workflow.Status, workflow.Version,
	)
	if err != nil {
		return fmt.Errorf("creating workflow: %w", err)
	}
	return nil
}

// Get scans the workflow definition row with the given ID, reporting
// not-found as an error.
func (r *WorkflowRegistry) Get(ctx context.Context, id string) (*registry.WorkflowDefinition, error) {
	var workflow registry.WorkflowDefinition
	err := r.store.pool.QueryRow(ctx, `
		SELECT id, name, description, definition, status, version
		FROM workflows WHERE id = $1
	`, id).Scan(
		&workflow.ID, &workflow.Name, &workflow.Description,
		&workflow.Tree, &workflow.Status, &workflow.Version,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("workflow %s not found", id)
		}
		return nil, err
	}
	return &workflow, nil
}

// List returns workflows ordered by name with limit/offset pagination and
// the total count.
func (r *WorkflowRegistry) List(ctx context.Context, opts registry.ListOptions) ([]*registry.WorkflowDefinition, int, error) {
	var total int
	if err := r.store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM workflows").Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, name, description, definition, status, version
		FROM workflows ORDER BY name LIMIT $1 OFFSET $2
	`, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var workflows []*registry.WorkflowDefinition
	for rows.Next() {
		var w registry.WorkflowDefinition
		if err := rows.Scan(
			&w.ID, &w.Name, &w.Description,
			&w.Tree, &w.Status, &w.Version,
		); err != nil {
			return nil, 0, err
		}
		workflows = append(workflows, &w)
	}
	return workflows, total, nil
}

// Update overwrites the workflow definition row, reporting an error when the
// ID is absent.
func (r *WorkflowRegistry) Update(ctx context.Context, workflow *registry.WorkflowDefinition) error {
	tag, err := r.store.pool.Exec(ctx, `
		UPDATE workflows SET name=$2, description=$3, definition=$4, status=$5, version=$6
		WHERE id = $1
	`,
		workflow.ID, workflow.Name, workflow.Description,
		workflow.Tree, workflow.Status, workflow.Version,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("workflow %s not found", workflow.ID)
	}
	return nil
}

// Delete removes the workflow definition row with the given ID.
func (r *WorkflowRegistry) Delete(ctx context.Context, id string) error {
	_, err := r.store.pool.Exec(ctx, "DELETE FROM workflows WHERE id = $1", id)
	return err
}
