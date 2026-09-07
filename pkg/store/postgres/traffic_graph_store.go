package postgres

import (
	"context"
	"fmt"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
	"github.com/jackc/pgx/v5"
)

// TrafficGraphRegistry implements registry.TrafficGraphRegistry using PostgreSQL.
type TrafficGraphRegistry struct {
	store *Store
}

// NewTrafficGraphRegistry creates a new PostgreSQL-backed traffic graph registry.
func NewTrafficGraphRegistry(store *Store) *TrafficGraphRegistry {
	return &TrafficGraphRegistry{store: store}
}

// Create inserts a new traffic graph row.
func (r *TrafficGraphRegistry) Create(ctx context.Context, graph *registry.TrafficGraph) error {
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO traffic_graphs (id, capture_id, name, graph_data, nodes, edges,
			analysis_report, suggestions, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`,
		graph.ID, nullIfEmpty(graph.CaptureID), graph.Name, graph.GraphData,
		graph.Nodes, graph.Edges, graph.AnalysisReport, graph.Suggestions, graph.Status,
	)
	return err
}

// Get scans the traffic graph row with the given ID, reporting not-found as
// an error.
func (r *TrafficGraphRegistry) Get(ctx context.Context, id string) (*registry.TrafficGraph, error) {
	var g registry.TrafficGraph
	var captureID *string
	err := r.store.pool.QueryRow(ctx, `
		SELECT id, capture_id, name, graph_data, nodes, edges, analysis_report,
			suggestions, status, created_at, updated_at
		FROM traffic_graphs WHERE id = $1
	`, id).Scan(
		&g.ID, &captureID, &g.Name, &g.GraphData, &g.Nodes, &g.Edges,
		&g.AnalysisReport, &g.Suggestions, &g.Status, &g.CreatedAt, &g.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("traffic graph %s not found", id)
		}
		return nil, err
	}
	if captureID != nil {
		g.CaptureID = *captureID
	}
	return &g, nil
}

// List returns traffic graphs, newest first, paginated with the total count.
func (r *TrafficGraphRegistry) List(ctx context.Context, opts registry.ListOptions) ([]*registry.TrafficGraph, int, error) {
	var total int
	if err := r.store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM traffic_graphs").Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, capture_id, name, graph_data, nodes, edges, analysis_report,
			suggestions, status, created_at, updated_at
		FROM traffic_graphs ORDER BY created_at DESC LIMIT $1 OFFSET $2
	`, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var graphs []*registry.TrafficGraph
	for rows.Next() {
		var g registry.TrafficGraph
		var captureID *string
		if err := rows.Scan(
			&g.ID, &captureID, &g.Name, &g.GraphData, &g.Nodes, &g.Edges,
			&g.AnalysisReport, &g.Suggestions, &g.Status, &g.CreatedAt, &g.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		if captureID != nil {
			g.CaptureID = *captureID
		}
		graphs = append(graphs, &g)
	}
	return graphs, total, nil
}

// Update overwrites the traffic graph row, reporting an error when the ID is
// absent.
func (r *TrafficGraphRegistry) Update(ctx context.Context, graph *registry.TrafficGraph) error {
	tag, err := r.store.pool.Exec(ctx, `
		UPDATE traffic_graphs SET capture_id=$2, name=$3, graph_data=$4,
			nodes=$5, edges=$6, analysis_report=$7, suggestions=$8, status=$9
		WHERE id = $1
	`,
		graph.ID, nullIfEmpty(graph.CaptureID), graph.Name, graph.GraphData,
		graph.Nodes, graph.Edges, graph.AnalysisReport, graph.Suggestions, graph.Status,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("traffic graph %s not found", graph.ID)
	}
	return nil
}

// Delete removes the traffic graph row with the given ID.
func (r *TrafficGraphRegistry) Delete(ctx context.Context, id string) error {
	_, err := r.store.pool.Exec(ctx, "DELETE FROM traffic_graphs WHERE id = $1", id)
	return err
}

// GetByCaptureID returns the traffic graphs derived from a capture, newest
// first.
func (r *TrafficGraphRegistry) GetByCaptureID(ctx context.Context, captureID string) ([]*registry.TrafficGraph, error) {
	rows, err := r.store.pool.Query(ctx, `
		SELECT id, capture_id, name, graph_data, nodes, edges, analysis_report,
			suggestions, status, created_at, updated_at
		FROM traffic_graphs WHERE capture_id = $1 ORDER BY created_at DESC
	`, captureID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var graphs []*registry.TrafficGraph
	for rows.Next() {
		var g registry.TrafficGraph
		var cid *string
		if err := rows.Scan(
			&g.ID, &cid, &g.Name, &g.GraphData, &g.Nodes, &g.Edges,
			&g.AnalysisReport, &g.Suggestions, &g.Status, &g.CreatedAt, &g.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if cid != nil {
			g.CaptureID = *cid
		}
		graphs = append(graphs, &g)
	}
	return graphs, nil
}

// UpdateReport stores an analysis report and suggestions on a graph and
// marks it analyzed, reporting an error when the ID is absent.
func (r *TrafficGraphRegistry) UpdateReport(ctx context.Context, id string, report string, suggestions []any) error {
	tag, err := r.store.pool.Exec(ctx, `
		UPDATE traffic_graphs SET analysis_report=$2, suggestions=$3, status='analyzed'
		WHERE id = $1
	`, id, report, suggestions)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("traffic graph %s not found", id)
	}
	return nil
}
