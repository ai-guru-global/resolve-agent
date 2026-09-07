package postgres

import (
	"context"
	"errors"

	pkgerrors "github.com/ai-guru-global/resolve-agent/pkg/errors"
	"github.com/ai-guru-global/resolve-agent/pkg/registry"
	"github.com/jackc/pgx/v5"
)

// TrafficCaptureRegistry implements registry.TrafficCaptureRegistry using PostgreSQL.
type TrafficCaptureRegistry struct {
	store *Store
}

// NewTrafficCaptureRegistry creates a new PostgreSQL-backed traffic capture registry.
func NewTrafficCaptureRegistry(store *Store) *TrafficCaptureRegistry {
	return &TrafficCaptureRegistry{store: store}
}

// Create inserts a new traffic capture row.
func (r *TrafficCaptureRegistry) Create(ctx context.Context, capture *registry.TrafficCapture) error {
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

// Get scans the traffic capture row with the given ID, reporting not-found
// as an error.
func (r *TrafficCaptureRegistry) Get(ctx context.Context, id string) (*registry.TrafficCapture, error) {
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
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pkgerrors.NotFound("traffic capture", id)
		}
		return nil, err
	}
	return &c, nil
}

// List returns traffic captures, newest first, paginated with the total
// count.
func (r *TrafficCaptureRegistry) List(ctx context.Context, opts registry.ListOptions) ([]*registry.TrafficCapture, int, error) {
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

// Update overwrites the traffic capture row, reporting an error when the ID
// is absent.
func (r *TrafficCaptureRegistry) Update(ctx context.Context, capture *registry.TrafficCapture) error {
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
		return pkgerrors.NotFound("traffic capture", capture.ID)
	}
	return nil
}

// Delete removes the traffic capture row with the given ID.
func (r *TrafficCaptureRegistry) Delete(ctx context.Context, id string) error {
	_, err := r.store.pool.Exec(ctx, "DELETE FROM traffic_captures WHERE id = $1", id)
	return err
}

// AddRecords inserts traffic records in a single transaction.
func (r *TrafficCaptureRegistry) AddRecords(ctx context.Context, records []*registry.TrafficRecord) error {
	tx, err := r.store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

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

// ListRecords returns the records of a capture, newest first, paginated with
// the total count.
func (r *TrafficCaptureRegistry) ListRecords(ctx context.Context, captureID string, opts registry.ListOptions) ([]*registry.TrafficRecord, int, error) {
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

// GetRecordsByService returns the records of a capture where the service is
// the source or destination, newest first.
func (r *TrafficCaptureRegistry) GetRecordsByService(ctx context.Context, captureID, serviceName string) ([]*registry.TrafficRecord, error) {
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
