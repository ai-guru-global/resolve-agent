package postgres

import (
	"context"
	"fmt"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
	"github.com/jackc/pgx/v5"
)

// PostgresCallGraphRegistry implements registry.CallGraphRegistry using PostgreSQL.
type PostgresCallGraphRegistry struct {
	store *Store
}

// NewPostgresCallGraphRegistry creates a new PostgreSQL-backed call graph registry.
func NewPostgresCallGraphRegistry(store *Store) *PostgresCallGraphRegistry {
	return &PostgresCallGraphRegistry{store: store}
}

func (r *PostgresCallGraphRegistry) Create(ctx context.Context, graph *registry.CallGraph) error {
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO call_graphs (id, analysis_id, repository_url, branch, language,
			entry_point, node_count, edge_count, max_depth, status, graph_data)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`,
		graph.ID, nullIfEmpty(graph.AnalysisID), graph.RepositoryURL, graph.Branch,
		graph.Language, graph.EntryPoint, graph.NodeCount, graph.EdgeCount,
		graph.MaxDepth, graph.Status, graph.GraphData,
	)
	return err
}

func (r *PostgresCallGraphRegistry) Get(ctx context.Context, id string) (*registry.CallGraph, error) {
	var g registry.CallGraph
	var analysisID *string
	err := r.store.pool.QueryRow(ctx, `
		SELECT id, analysis_id, repository_url, branch, language, entry_point,
			node_count, edge_count, max_depth, status, graph_data, created_at, updated_at
		FROM call_graphs WHERE id = $1
	`, id).Scan(
		&g.ID, &analysisID, &g.RepositoryURL, &g.Branch, &g.Language,
		&g.EntryPoint, &g.NodeCount, &g.EdgeCount, &g.MaxDepth,
		&g.Status, &g.GraphData, &g.CreatedAt, &g.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("call graph %s not found", id)
		}
		return nil, err
	}
	if analysisID != nil {
		g.AnalysisID = *analysisID
	}
	return &g, nil
}

func (r *PostgresCallGraphRegistry) List(ctx context.Context, opts registry.ListOptions) ([]*registry.CallGraph, int, error) {
	var total int
	if err := r.store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM call_graphs").Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, analysis_id, repository_url, branch, language, entry_point,
			node_count, edge_count, max_depth, status, graph_data, created_at, updated_at
		FROM call_graphs ORDER BY created_at DESC LIMIT $1 OFFSET $2
	`, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var graphs []*registry.CallGraph
	for rows.Next() {
		var g registry.CallGraph
		var analysisID *string
		if err := rows.Scan(
			&g.ID, &analysisID, &g.RepositoryURL, &g.Branch, &g.Language,
			&g.EntryPoint, &g.NodeCount, &g.EdgeCount, &g.MaxDepth,
			&g.Status, &g.GraphData, &g.CreatedAt, &g.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		if analysisID != nil {
			g.AnalysisID = *analysisID
		}
		graphs = append(graphs, &g)
	}
	return graphs, total, nil
}

func (r *PostgresCallGraphRegistry) Update(ctx context.Context, graph *registry.CallGraph) error {
	tag, err := r.store.pool.Exec(ctx, `
		UPDATE call_graphs SET analysis_id=$2, repository_url=$3, branch=$4,
			language=$5, entry_point=$6, node_count=$7, edge_count=$8,
			max_depth=$9, status=$10, graph_data=$11
		WHERE id = $1
	`,
		graph.ID, nullIfEmpty(graph.AnalysisID), graph.RepositoryURL, graph.Branch,
		graph.Language, graph.EntryPoint, graph.NodeCount, graph.EdgeCount,
		graph.MaxDepth, graph.Status, graph.GraphData,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("call graph %s not found", graph.ID)
	}
	return nil
}

func (r *PostgresCallGraphRegistry) Delete(ctx context.Context, id string) error {
	_, err := r.store.pool.Exec(ctx, "DELETE FROM call_graphs WHERE id = $1", id)
	return err
}

func (r *PostgresCallGraphRegistry) AddNodes(ctx context.Context, nodes []*registry.CallGraphNode) error {
	tx, err := r.store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, n := range nodes {
		_, err := tx.Exec(ctx, `
			INSERT INTO call_graph_nodes (id, call_graph_id, function_name, file_path,
				line_start, line_end, package, node_type, metadata)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		`,
			n.ID, n.CallGraphID, n.FunctionName, n.FilePath,
			n.LineStart, n.LineEnd, n.Package, n.NodeType, n.Metadata,
		)
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *PostgresCallGraphRegistry) AddEdges(ctx context.Context, edges []*registry.CallGraphEdge) error {
	tx, err := r.store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, e := range edges {
		_, err := tx.Exec(ctx, `
			INSERT INTO call_graph_edges (id, call_graph_id, caller_node_id, callee_node_id,
				call_type, weight, metadata)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`,
			e.ID, e.CallGraphID, e.CallerNodeID, e.CalleeNodeID,
			e.CallType, e.Weight, e.Metadata,
		)
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *PostgresCallGraphRegistry) ListNodes(ctx context.Context, callGraphID string, opts registry.ListOptions) ([]*registry.CallGraphNode, int, error) {
	var total int
	if err := r.store.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM call_graph_nodes WHERE call_graph_id = $1", callGraphID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, call_graph_id, function_name, file_path, line_start, line_end,
			package, node_type, metadata
		FROM call_graph_nodes WHERE call_graph_id = $1
		ORDER BY node_type, function_name LIMIT $2 OFFSET $3
	`, callGraphID, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var nodes []*registry.CallGraphNode
	for rows.Next() {
		var n registry.CallGraphNode
		if err := rows.Scan(
			&n.ID, &n.CallGraphID, &n.FunctionName, &n.FilePath,
			&n.LineStart, &n.LineEnd, &n.Package, &n.NodeType, &n.Metadata,
		); err != nil {
			return nil, 0, err
		}
		nodes = append(nodes, &n)
	}
	return nodes, total, nil
}

func (r *PostgresCallGraphRegistry) ListEdges(ctx context.Context, callGraphID string, opts registry.ListOptions) ([]*registry.CallGraphEdge, int, error) {
	var total int
	if err := r.store.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM call_graph_edges WHERE call_graph_id = $1", callGraphID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, call_graph_id, caller_node_id, callee_node_id, call_type, weight, metadata
		FROM call_graph_edges WHERE call_graph_id = $1
		LIMIT $2 OFFSET $3
	`, callGraphID, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var edges []*registry.CallGraphEdge
	for rows.Next() {
		var e registry.CallGraphEdge
		if err := rows.Scan(
			&e.ID, &e.CallGraphID, &e.CallerNodeID, &e.CalleeNodeID,
			&e.CallType, &e.Weight, &e.Metadata,
		); err != nil {
			return nil, 0, err
		}
		edges = append(edges, &e)
	}
	return edges, total, nil
}

func (r *PostgresCallGraphRegistry) GetSubgraph(ctx context.Context, callGraphID string, entryNodeID string, depth int) ([]*registry.CallGraphNode, []*registry.CallGraphEdge, error) {
	if depth <= 0 {
		depth = 5
	}

	// Use recursive CTE to traverse the call graph from the entry node
	rows, err := r.store.pool.Query(ctx, `
		WITH RECURSIVE traversal AS (
			SELECT callee_node_id AS node_id, caller_node_id, callee_node_id, id AS edge_id, 1 AS depth
			FROM call_graph_edges
			WHERE call_graph_id = $1 AND caller_node_id = $2
			UNION
			SELECT e.callee_node_id, e.caller_node_id, e.callee_node_id, e.id, t.depth + 1
			FROM call_graph_edges e
			JOIN traversal t ON e.caller_node_id = t.node_id
			WHERE e.call_graph_id = $1 AND t.depth < $3
		)
		SELECT DISTINCT n.id, n.call_graph_id, n.function_name, n.file_path,
			n.line_start, n.line_end, n.package, n.node_type, n.metadata
		FROM call_graph_nodes n
		WHERE n.id = $2 OR n.id IN (SELECT DISTINCT node_id FROM traversal)
	`, callGraphID, entryNodeID, depth)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var nodes []*registry.CallGraphNode
	for rows.Next() {
		var n registry.CallGraphNode
		if err := rows.Scan(
			&n.ID, &n.CallGraphID, &n.FunctionName, &n.FilePath,
			&n.LineStart, &n.LineEnd, &n.Package, &n.NodeType, &n.Metadata,
		); err != nil {
			return nil, nil, err
		}
		nodes = append(nodes, &n)
	}

	// Get edges within the traversed subgraph
	edgeRows, err := r.store.pool.Query(ctx, `
		WITH RECURSIVE traversal AS (
			SELECT callee_node_id AS node_id, id AS edge_id, 1 AS depth
			FROM call_graph_edges
			WHERE call_graph_id = $1 AND caller_node_id = $2
			UNION
			SELECT e.callee_node_id, e.id, t.depth + 1
			FROM call_graph_edges e
			JOIN traversal t ON e.caller_node_id = t.node_id
			WHERE e.call_graph_id = $1 AND t.depth < $3
		)
		SELECT e.id, e.call_graph_id, e.caller_node_id, e.callee_node_id,
			e.call_type, e.weight, e.metadata
		FROM call_graph_edges e
		WHERE e.id IN (SELECT edge_id FROM traversal)
	`, callGraphID, entryNodeID, depth)
	if err != nil {
		return nil, nil, err
	}
	defer edgeRows.Close()

	var edges []*registry.CallGraphEdge
	for edgeRows.Next() {
		var e registry.CallGraphEdge
		if err := edgeRows.Scan(
			&e.ID, &e.CallGraphID, &e.CallerNodeID, &e.CalleeNodeID,
			&e.CallType, &e.Weight, &e.Metadata,
		); err != nil {
			return nil, nil, err
		}
		edges = append(edges, &e)
	}

	return nodes, edges, nil
}

// nullIfEmpty returns nil for empty strings to store NULL in PostgreSQL.
func nullIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
