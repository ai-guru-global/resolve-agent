package postgres

import (
	"context"
	"fmt"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
	"github.com/jackc/pgx/v5"
)

// PostgresTrafficCaptureRegistry implements registry.TrafficCaptureRegistry using PostgreSQL.
type PostgresTrafficCaptureRegistry struct {
	store *Store
}

// NewPostgresTrafficCaptureRegistry creates a new PostgreSQL-backed traffic capture registry.
func NewPostgresTrafficCaptureRegistry(store *Store) *PostgresTrafficCaptureRegistry {
	return &PostgresTrafficCaptureRegistry{store: store}
}

func (r *PostgresTrafficCaptureRegistry) Create(ctx context.Context, capture *registry.TrafficCapture) error {
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO traffic_captures (id, name, source_type, target_service,
			start_time, end_time, status, config, summary, labels)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`,
		capture.ID, capture.Name, capture.SourceType, capture.TargetService,
		capture.StartTime, capture.EndTime, capture.Status,
		capture.Config, capture.Summary, capture.Labels,
	)
	return err
}

func (r *PostgresTrafficCaptureRegistry) Get(ctx context.Context, id string) (*registry.TrafficCapture, error) {
	var c registry.TrafficCapture
	err := r.store.pool.QueryRow(ctx, `
		SELECT id, name, source_type, target_service, start_time, end_time,
			status, config, summary, labels, created_at, updated_at
		FROM traffic_captures WHERE id = $1
	`, id).Scan(
		&c.ID, &c.Name, &c.SourceType, &c.TargetService,
		&c.StartTime, &c.EndTime, &c.Status, &c.Config, &c.Summary,
		&c.Labels, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("traffic capture %s not found", id)
		}
		return nil, err
	}
	return &c, nil
}

func (r *PostgresTrafficCaptureRegistry) List(ctx context.Context, opts registry.ListOptions) ([]*registry.TrafficCapture, int, error) {
	var total int
	if err := r.store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM traffic_captures").Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, name, source_type, target_service, start_time, end_time,
			status, config, summary, labels, created_at, updated_at
		FROM traffic_captures ORDER BY created_at DESC LIMIT $1 OFFSET $2
	`, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var captures []*registry.TrafficCapture
	for rows.Next() {
		var c registry.TrafficCapture
		if err := rows.Scan(
			&c.ID, &c.Name, &c.SourceType, &c.TargetService,
			&c.StartTime, &c.EndTime, &c.Status, &c.Config, &c.Summary,
			&c.Labels, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		captures = append(captures, &c)
	}
	return captures, total, nil
}

func (r *PostgresTrafficCaptureRegistry) Update(ctx context.Context, capture *registry.TrafficCapture) error {
	tag, err := r.store.pool.Exec(ctx, `
		UPDATE traffic_captures SET name=$2, source_type=$3, target_service=$4,
			start_time=$5, end_time=$6, status=$7, config=$8, summary=$9, labels=$10
		WHERE id = $1
	`,
		capture.ID, capture.Name, capture.SourceType, capture.TargetService,
		capture.StartTime, capture.EndTime, capture.Status,
		capture.Config, capture.Summary, capture.Labels,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("traffic capture %s not found", capture.ID)
	}
	return nil
}

func (r *PostgresTrafficCaptureRegistry) Delete(ctx context.Context, id string) error {
	_, err := r.store.pool.Exec(ctx, "DELETE FROM traffic_captures WHERE id = $1", id)
	return err
}

func (r *PostgresTrafficCaptureRegistry) AddRecords(ctx context.Context, records []*registry.TrafficRecord) error {
	tx, err := r.store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, rec := range records {
		_, err := tx.Exec(ctx, `
			INSERT INTO traffic_records (id, capture_id, source_service, dest_service,
				protocol, method, path, status_code, latency_ms, request_size,
				response_size, trace_id, span_id, timestamp, metadata)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		`,
			rec.ID, rec.CaptureID, rec.SourceService, rec.DestService,
			rec.Protocol, rec.Method, rec.Path, rec.StatusCode,
			rec.LatencyMs, rec.RequestSize, rec.ResponseSize,
			rec.TraceID, rec.SpanID, rec.Timestamp, rec.Metadata,
		)
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *PostgresTrafficCaptureRegistry) ListRecords(ctx context.Context, captureID string, opts registry.ListOptions) ([]*registry.TrafficRecord, int, error) {
	var total int
	if err := r.store.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM traffic_records WHERE capture_id = $1", captureID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, capture_id, source_service, dest_service, protocol, method, path,
			status_code, latency_ms, request_size, response_size, trace_id, span_id,
			timestamp, metadata
		FROM traffic_records WHERE capture_id = $1
		ORDER BY timestamp DESC LIMIT $2 OFFSET $3
	`, captureID, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var records []*registry.TrafficRecord
	for rows.Next() {
		var rec registry.TrafficRecord
		if err := rows.Scan(
			&rec.ID, &rec.CaptureID, &rec.SourceService, &rec.DestService,
			&rec.Protocol, &rec.Method, &rec.Path, &rec.StatusCode,
			&rec.LatencyMs, &rec.RequestSize, &rec.ResponseSize,
			&rec.TraceID, &rec.SpanID, &rec.Timestamp, &rec.Metadata,
		); err != nil {
			return nil, 0, err
		}
		records = append(records, &rec)
	}
	return records, total, nil
}

func (r *PostgresTrafficCaptureRegistry) GetRecordsByService(ctx context.Context, captureID string, serviceName string) ([]*registry.TrafficRecord, error) {
	rows, err := r.store.pool.Query(ctx, `
		SELECT id, capture_id, source_service, dest_service, protocol, method, path,
			status_code, latency_ms, request_size, response_size, trace_id, span_id,
			timestamp, metadata
		FROM traffic_records
		WHERE capture_id = $1 AND (source_service = $2 OR dest_service = $2)
		ORDER BY timestamp DESC
	`, captureID, serviceName)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []*registry.TrafficRecord
	for rows.Next() {
		var rec registry.TrafficRecord
		if err := rows.Scan(
			&rec.ID, &rec.CaptureID, &rec.SourceService, &rec.DestService,
			&rec.Protocol, &rec.Method, &rec.Path, &rec.StatusCode,
			&rec.LatencyMs, &rec.RequestSize, &rec.ResponseSize,
			&rec.TraceID, &rec.SpanID, &rec.Timestamp, &rec.Metadata,
		); err != nil {
			return nil, err
		}
		records = append(records, &rec)
	}
	return records, nil
}
