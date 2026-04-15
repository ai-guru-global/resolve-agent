package postgres

import (
	"context"
	"fmt"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
	"github.com/jackc/pgx/v5"
)

// PostgresHookRegistry implements registry.HookRegistry using PostgreSQL.
type PostgresHookRegistry struct {
	store *Store
}

// NewPostgresHookRegistry creates a new PostgreSQL-backed hook registry.
func NewPostgresHookRegistry(store *Store) *PostgresHookRegistry {
	return &PostgresHookRegistry{store: store}
}

func (r *PostgresHookRegistry) Create(ctx context.Context, hook *registry.HookDefinition) error {
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO hooks (id, name, description, hook_type, trigger_point, target_id,
			execution_order, handler_type, config, enabled, labels)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`,
		hook.ID, hook.Name, hook.Description, hook.HookType, hook.TriggerPoint,
		nilIfEmpty(hook.TargetID), hook.ExecutionOrder, hook.HandlerType,
		hook.Config, hook.Enabled, hook.Labels,
	)
	return err
}

func (r *PostgresHookRegistry) Get(ctx context.Context, id string) (*registry.HookDefinition, error) {
	var hook registry.HookDefinition
	var targetID *string
	err := r.store.pool.QueryRow(ctx, `
		SELECT id, name, description, hook_type, trigger_point, target_id,
			execution_order, handler_type, config, enabled, labels, created_at, updated_at
		FROM hooks WHERE id = $1
	`, id).Scan(
		&hook.ID, &hook.Name, &hook.Description, &hook.HookType, &hook.TriggerPoint,
		&targetID, &hook.ExecutionOrder, &hook.HandlerType,
		&hook.Config, &hook.Enabled, &hook.Labels, &hook.CreatedAt, &hook.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("hook %s not found", id)
		}
		return nil, err
	}
	if targetID != nil {
		hook.TargetID = *targetID
	}
	return &hook, nil
}

func (r *PostgresHookRegistry) List(ctx context.Context, opts registry.ListOptions) ([]*registry.HookDefinition, int, error) {
	var total int
	if err := r.store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM hooks").Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, name, description, hook_type, trigger_point, target_id,
			execution_order, handler_type, config, enabled, labels, created_at, updated_at
		FROM hooks ORDER BY execution_order, name LIMIT $1 OFFSET $2
	`, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var hooks []*registry.HookDefinition
	for rows.Next() {
		var h registry.HookDefinition
		var targetID *string
		if err := rows.Scan(
			&h.ID, &h.Name, &h.Description, &h.HookType, &h.TriggerPoint,
			&targetID, &h.ExecutionOrder, &h.HandlerType,
			&h.Config, &h.Enabled, &h.Labels, &h.CreatedAt, &h.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		if targetID != nil {
			h.TargetID = *targetID
		}
		hooks = append(hooks, &h)
	}
	return hooks, total, nil
}

func (r *PostgresHookRegistry) Update(ctx context.Context, hook *registry.HookDefinition) error {
	tag, err := r.store.pool.Exec(ctx, `
		UPDATE hooks SET name=$2, description=$3, hook_type=$4, trigger_point=$5,
			target_id=$6, execution_order=$7, handler_type=$8, config=$9, enabled=$10, labels=$11
		WHERE id = $1
	`,
		hook.ID, hook.Name, hook.Description, hook.HookType, hook.TriggerPoint,
		nilIfEmpty(hook.TargetID), hook.ExecutionOrder, hook.HandlerType,
		hook.Config, hook.Enabled, hook.Labels,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("hook %s not found", hook.ID)
	}
	return nil
}

func (r *PostgresHookRegistry) Delete(ctx context.Context, id string) error {
	_, err := r.store.pool.Exec(ctx, "DELETE FROM hooks WHERE id = $1", id)
	return err
}

func (r *PostgresHookRegistry) ListByTriggerPoint(ctx context.Context, triggerPoint string, targetID string) ([]*registry.HookDefinition, error) {
	rows, err := r.store.pool.Query(ctx, `
		SELECT id, name, description, hook_type, trigger_point, target_id,
			execution_order, handler_type, config, enabled, labels, created_at, updated_at
		FROM hooks
		WHERE enabled = true AND trigger_point = $1
			AND (target_id IS NULL OR target_id = '' OR target_id = $2)
		ORDER BY execution_order
	`, triggerPoint, targetID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var hooks []*registry.HookDefinition
	for rows.Next() {
		var h registry.HookDefinition
		var tid *string
		if err := rows.Scan(
			&h.ID, &h.Name, &h.Description, &h.HookType, &h.TriggerPoint,
			&tid, &h.ExecutionOrder, &h.HandlerType,
			&h.Config, &h.Enabled, &h.Labels, &h.CreatedAt, &h.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if tid != nil {
			h.TargetID = *tid
		}
		hooks = append(hooks, &h)
	}
	return hooks, nil
}

func (r *PostgresHookRegistry) RecordExecution(ctx context.Context, exec *registry.HookExecution) error {
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO hook_executions (id, hook_id, trigger_event, target_entity_id,
			status, input_data, output_data, error, duration_ms, started_at, completed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`,
		exec.ID, exec.HookID, exec.TriggerEvent, nilIfEmpty(exec.TargetEntityID),
		exec.Status, exec.InputData, exec.OutputData, nilIfEmpty(exec.Error),
		exec.DurationMs, exec.StartedAt, exec.CompletedAt,
	)
	return err
}

func (r *PostgresHookRegistry) ListExecutions(ctx context.Context, hookID string, opts registry.ListOptions) ([]*registry.HookExecution, int, error) {
	var total int
	if err := r.store.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM hook_executions WHERE hook_id = $1", hookID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, hook_id, trigger_event, target_entity_id, status,
			input_data, output_data, error, duration_ms, started_at, completed_at, created_at
		FROM hook_executions WHERE hook_id = $1
		ORDER BY created_at DESC LIMIT $2 OFFSET $3
	`, hookID, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var execs []*registry.HookExecution
	for rows.Next() {
		var e registry.HookExecution
		var targetEntityID, errStr *string
		if err := rows.Scan(
			&e.ID, &e.HookID, &e.TriggerEvent, &targetEntityID, &e.Status,
			&e.InputData, &e.OutputData, &errStr, &e.DurationMs,
			&e.StartedAt, &e.CompletedAt, &e.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		if targetEntityID != nil {
			e.TargetEntityID = *targetEntityID
		}
		if errStr != nil {
			e.Error = *errStr
		}
		execs = append(execs, &e)
	}
	return execs, total, nil
}

// nilIfEmpty returns nil for empty strings, used for nullable VARCHAR columns.
func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
