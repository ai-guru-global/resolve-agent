package postgres

import (
	"context"
	"fmt"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
	"github.com/jackc/pgx/v5"
)

// PostgresFTADocumentRegistry implements registry.FTADocumentRegistry using PostgreSQL.
type PostgresFTADocumentRegistry struct {
	store *Store
}

// NewPostgresFTADocumentRegistry creates a new PostgreSQL-backed FTA document registry.
func NewPostgresFTADocumentRegistry(store *Store) *PostgresFTADocumentRegistry {
	return &PostgresFTADocumentRegistry{store: store}
}

func (r *PostgresFTADocumentRegistry) CreateDocument(ctx context.Context, doc *registry.FTADocument) error {
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO fta_documents (id, workflow_id, name, description, fault_tree,
			version, status, metadata, labels, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`,
		doc.ID, nilIfEmpty(doc.WorkflowID), doc.Name, doc.Description,
		doc.FaultTree, doc.Version, doc.Status, doc.Metadata, doc.Labels, doc.CreatedBy,
	)
	return err
}

func (r *PostgresFTADocumentRegistry) GetDocument(ctx context.Context, id string) (*registry.FTADocument, error) {
	var doc registry.FTADocument
	var workflowID, createdBy *string
	err := r.store.pool.QueryRow(ctx, `
		SELECT id, workflow_id, name, description, fault_tree, version, status,
			metadata, labels, created_by, created_at, updated_at
		FROM fta_documents WHERE id = $1
	`, id).Scan(
		&doc.ID, &workflowID, &doc.Name, &doc.Description, &doc.FaultTree,
		&doc.Version, &doc.Status, &doc.Metadata, &doc.Labels,
		&createdBy, &doc.CreatedAt, &doc.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("FTA document %s not found", id)
		}
		return nil, err
	}
	if workflowID != nil {
		doc.WorkflowID = *workflowID
	}
	if createdBy != nil {
		doc.CreatedBy = *createdBy
	}
	return &doc, nil
}

func (r *PostgresFTADocumentRegistry) ListDocuments(ctx context.Context, opts registry.ListOptions) ([]*registry.FTADocument, int, error) {
	var total int
	if err := r.store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM fta_documents").Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, workflow_id, name, description, fault_tree, version, status,
			metadata, labels, created_by, created_at, updated_at
		FROM fta_documents ORDER BY created_at DESC LIMIT $1 OFFSET $2
	`, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var docs []*registry.FTADocument
	for rows.Next() {
		var d registry.FTADocument
		var workflowID, createdBy *string
		if err := rows.Scan(
			&d.ID, &workflowID, &d.Name, &d.Description, &d.FaultTree,
			&d.Version, &d.Status, &d.Metadata, &d.Labels,
			&createdBy, &d.CreatedAt, &d.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		if workflowID != nil {
			d.WorkflowID = *workflowID
		}
		if createdBy != nil {
			d.CreatedBy = *createdBy
		}
		docs = append(docs, &d)
	}
	return docs, total, nil
}

func (r *PostgresFTADocumentRegistry) UpdateDocument(ctx context.Context, doc *registry.FTADocument) error {
	tag, err := r.store.pool.Exec(ctx, `
		UPDATE fta_documents SET workflow_id=$2, name=$3, description=$4, fault_tree=$5,
			version=$6, status=$7, metadata=$8, labels=$9, created_by=$10
		WHERE id = $1
	`,
		doc.ID, nilIfEmpty(doc.WorkflowID), doc.Name, doc.Description,
		doc.FaultTree, doc.Version, doc.Status, doc.Metadata, doc.Labels, doc.CreatedBy,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("FTA document %s not found", doc.ID)
	}
	return nil
}

func (r *PostgresFTADocumentRegistry) DeleteDocument(ctx context.Context, id string) error {
	_, err := r.store.pool.Exec(ctx, "DELETE FROM fta_documents WHERE id = $1", id)
	return err
}

func (r *PostgresFTADocumentRegistry) ListByWorkflow(ctx context.Context, workflowID string) ([]*registry.FTADocument, error) {
	rows, err := r.store.pool.Query(ctx, `
		SELECT id, workflow_id, name, description, fault_tree, version, status,
			metadata, labels, created_by, created_at, updated_at
		FROM fta_documents WHERE workflow_id = $1 ORDER BY created_at DESC
	`, workflowID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []*registry.FTADocument
	for rows.Next() {
		var d registry.FTADocument
		var wfID, createdBy *string
		if err := rows.Scan(
			&d.ID, &wfID, &d.Name, &d.Description, &d.FaultTree,
			&d.Version, &d.Status, &d.Metadata, &d.Labels,
			&createdBy, &d.CreatedAt, &d.UpdatedAt,
		); err != nil {
			return nil, err
		}
		if wfID != nil {
			d.WorkflowID = *wfID
		}
		if createdBy != nil {
			d.CreatedBy = *createdBy
		}
		docs = append(docs, &d)
	}
	return docs, nil
}

func (r *PostgresFTADocumentRegistry) CreateAnalysisResult(ctx context.Context, result *registry.FTAAnalysisResult) error {
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO fta_analysis_results (id, document_id, execution_id, top_event_result,
			minimal_cut_sets, basic_event_probabilities, gate_results, importance_measures,
			status, duration_ms, context)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`,
		result.ID, result.DocumentID, nilIfEmpty(result.ExecutionID),
		result.TopEventResult, result.MinimalCutSets, result.BasicEventProbabilities,
		result.GateResults, result.ImportanceMeasures, result.Status,
		result.DurationMs, result.Context,
	)
	return err
}

func (r *PostgresFTADocumentRegistry) GetAnalysisResult(ctx context.Context, id string) (*registry.FTAAnalysisResult, error) {
	var result registry.FTAAnalysisResult
	var execID *string
	err := r.store.pool.QueryRow(ctx, `
		SELECT id, document_id, execution_id, top_event_result, minimal_cut_sets,
			basic_event_probabilities, gate_results, importance_measures,
			status, duration_ms, context, created_at
		FROM fta_analysis_results WHERE id = $1
	`, id).Scan(
		&result.ID, &result.DocumentID, &execID, &result.TopEventResult,
		&result.MinimalCutSets, &result.BasicEventProbabilities,
		&result.GateResults, &result.ImportanceMeasures,
		&result.Status, &result.DurationMs, &result.Context, &result.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("FTA analysis result %s not found", id)
		}
		return nil, err
	}
	if execID != nil {
		result.ExecutionID = *execID
	}
	return &result, nil
}

func (r *PostgresFTADocumentRegistry) ListAnalysisResults(ctx context.Context, documentID string, opts registry.ListOptions) ([]*registry.FTAAnalysisResult, int, error) {
	var total int
	if err := r.store.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM fta_analysis_results WHERE document_id = $1", documentID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, document_id, execution_id, top_event_result, minimal_cut_sets,
			basic_event_probabilities, gate_results, importance_measures,
			status, duration_ms, context, created_at
		FROM fta_analysis_results WHERE document_id = $1
		ORDER BY created_at DESC LIMIT $2 OFFSET $3
	`, documentID, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var results []*registry.FTAAnalysisResult
	for rows.Next() {
		var res registry.FTAAnalysisResult
		var execID *string
		if err := rows.Scan(
			&res.ID, &res.DocumentID, &execID, &res.TopEventResult,
			&res.MinimalCutSets, &res.BasicEventProbabilities,
			&res.GateResults, &res.ImportanceMeasures,
			&res.Status, &res.DurationMs, &res.Context, &res.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		if execID != nil {
			res.ExecutionID = *execID
		}
		results = append(results, &res)
	}
	return results, total, nil
}
