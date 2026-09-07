package postgres

import (
	"context"
	"errors"

	pkgerrors "github.com/ai-guru-global/resolve-agent/pkg/errors"
	"github.com/ai-guru-global/resolve-agent/pkg/registry"
	"github.com/jackc/pgx/v5"
)

// CodeAnalysisRegistry implements registry.CodeAnalysisRegistry using PostgreSQL.
type CodeAnalysisRegistry struct {
	store *Store
}

// NewCodeAnalysisRegistry creates a new PostgreSQL-backed code analysis registry.
func NewCodeAnalysisRegistry(store *Store) *CodeAnalysisRegistry {
	return &CodeAnalysisRegistry{store: store}
}

// Create inserts a new code analysis run row.
func (r *CodeAnalysisRegistry) Create(ctx context.Context, analysis *registry.CodeAnalysis) error {
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO code_analyses (id, name, repository_url, branch, commit_sha, language,
			analyzer_type, config, status, summary, duration_ms, labels, triggered_by,
			started_at, completed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
	`,
		analysis.ID, analysis.Name, analysis.RepositoryURL, analysis.Branch,
		analysis.CommitSHA, analysis.Language, analysis.AnalyzerType,
		analysis.Config, analysis.Status, analysis.Summary, analysis.DurationMs,
		analysis.Labels, analysis.TriggeredBy, analysis.StartedAt, analysis.CompletedAt,
	)
	return err
}

// Get scans the code analysis row with the given ID, reporting not-found as
// an error.
func (r *CodeAnalysisRegistry) Get(ctx context.Context, id string) (*registry.CodeAnalysis, error) {
	var a registry.CodeAnalysis
	err := r.store.pool.QueryRow(ctx, `
		SELECT id, name, repository_url, branch, commit_sha, language, analyzer_type,
			config, status, summary, duration_ms, labels, triggered_by,
			started_at, completed_at, created_at, updated_at
		FROM code_analyses WHERE id = $1
	`, id).Scan(
		&a.ID, &a.Name, &a.RepositoryURL, &a.Branch, &a.CommitSHA,
		&a.Language, &a.AnalyzerType, &a.Config, &a.Status, &a.Summary,
		&a.DurationMs, &a.Labels, &a.TriggeredBy,
		&a.StartedAt, &a.CompletedAt, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pkgerrors.NotFound("analysis", id)
		}
		return nil, err
	}
	return &a, nil
}

// List returns code analysis runs, newest first, paginated with the total
// count.
func (r *CodeAnalysisRegistry) List(ctx context.Context, opts registry.ListOptions) ([]*registry.CodeAnalysis, int, error) {
	var total int
	if err := r.store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM code_analyses").Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, name, repository_url, branch, commit_sha, language, analyzer_type,
			config, status, summary, duration_ms, labels, triggered_by,
			started_at, completed_at, created_at, updated_at
		FROM code_analyses ORDER BY created_at DESC LIMIT $1 OFFSET $2
	`, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var analyses []*registry.CodeAnalysis
	for rows.Next() {
		var a registry.CodeAnalysis
		if err := rows.Scan(
			&a.ID, &a.Name, &a.RepositoryURL, &a.Branch, &a.CommitSHA,
			&a.Language, &a.AnalyzerType, &a.Config, &a.Status, &a.Summary,
			&a.DurationMs, &a.Labels, &a.TriggeredBy,
			&a.StartedAt, &a.CompletedAt, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		analyses = append(analyses, &a)
	}
	return analyses, total, nil
}

// Update overwrites the code analysis row, reporting an error when the ID is
// absent.
func (r *CodeAnalysisRegistry) Update(ctx context.Context, analysis *registry.CodeAnalysis) error {
	tag, err := r.store.pool.Exec(ctx, `
		UPDATE code_analyses SET name=$2, repository_url=$3, branch=$4, commit_sha=$5,
			language=$6, analyzer_type=$7, config=$8, status=$9, summary=$10,
			duration_ms=$11, labels=$12, triggered_by=$13, started_at=$14, completed_at=$15
		WHERE id = $1
	`,
		analysis.ID, analysis.Name, analysis.RepositoryURL, analysis.Branch,
		analysis.CommitSHA, analysis.Language, analysis.AnalyzerType,
		analysis.Config, analysis.Status, analysis.Summary, analysis.DurationMs,
		analysis.Labels, analysis.TriggeredBy, analysis.StartedAt, analysis.CompletedAt,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pkgerrors.NotFound("analysis", analysis.ID)
	}
	return nil
}

// Delete removes the code analysis row with the given ID.
func (r *CodeAnalysisRegistry) Delete(ctx context.Context, id string) error {
	_, err := r.store.pool.Exec(ctx, "DELETE FROM code_analyses WHERE id = $1", id)
	return err
}

// AddFinding inserts a single analysis finding row.
func (r *CodeAnalysisRegistry) AddFinding(ctx context.Context, finding *registry.CodeAnalysisFinding) error {
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO code_analysis_findings (id, analysis_id, rule_id, severity, category,
			message, file_path, line_start, line_end, column_start, column_end,
			snippet, suggestion, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`,
		finding.ID, finding.AnalysisID, finding.RuleID, finding.Severity, finding.Category,
		finding.Message, finding.FilePath, finding.LineStart, finding.LineEnd,
		finding.ColumnStart, finding.ColumnEnd, finding.Snippet, finding.Suggestion,
		finding.Metadata,
	)
	return err
}

// AddFindings inserts analysis finding rows in a single transaction.
func (r *CodeAnalysisRegistry) AddFindings(ctx context.Context, findings []*registry.CodeAnalysisFinding) error {
	tx, err := r.store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	for _, f := range findings {
		_, err := tx.Exec(ctx, `
			INSERT INTO code_analysis_findings (id, analysis_id, rule_id, severity, category,
				message, file_path, line_start, line_end, column_start, column_end,
				snippet, suggestion, metadata)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		`,
			f.ID, f.AnalysisID, f.RuleID, f.Severity, f.Category,
			f.Message, f.FilePath, f.LineStart, f.LineEnd,
			f.ColumnStart, f.ColumnEnd, f.Snippet, f.Suggestion, f.Metadata,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

// ListFindings returns the findings of an analysis ordered by severity and
// creation time, paginated with the total count.
func (r *CodeAnalysisRegistry) ListFindings(ctx context.Context, analysisID string, opts registry.ListOptions) ([]*registry.CodeAnalysisFinding, int, error) {
	var total int
	if err := r.store.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM code_analysis_findings WHERE analysis_id = $1", analysisID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, analysis_id, rule_id, severity, category, message, file_path,
			line_start, line_end, column_start, column_end, snippet, suggestion,
			metadata, created_at
		FROM code_analysis_findings WHERE analysis_id = $1
		ORDER BY severity, created_at LIMIT $2 OFFSET $3
	`, analysisID, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var findings []*registry.CodeAnalysisFinding
	for rows.Next() {
		var f registry.CodeAnalysisFinding
		if err := rows.Scan(
			&f.ID, &f.AnalysisID, &f.RuleID, &f.Severity, &f.Category,
			&f.Message, &f.FilePath, &f.LineStart, &f.LineEnd,
			&f.ColumnStart, &f.ColumnEnd, &f.Snippet, &f.Suggestion,
			&f.Metadata, &f.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		findings = append(findings, &f)
	}
	return findings, total, nil
}

// GetFindingsBySeverity returns the findings of an analysis with the given
// severity, ordered by creation time.
func (r *CodeAnalysisRegistry) GetFindingsBySeverity(ctx context.Context, analysisID, severity string) ([]*registry.CodeAnalysisFinding, error) {
	rows, err := r.store.pool.Query(ctx, `
		SELECT id, analysis_id, rule_id, severity, category, message, file_path,
			line_start, line_end, column_start, column_end, snippet, suggestion,
			metadata, created_at
		FROM code_analysis_findings WHERE analysis_id = $1 AND severity = $2
		ORDER BY created_at
	`, analysisID, severity)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var findings []*registry.CodeAnalysisFinding
	for rows.Next() {
		var f registry.CodeAnalysisFinding
		if err := rows.Scan(
			&f.ID, &f.AnalysisID, &f.RuleID, &f.Severity, &f.Category,
			&f.Message, &f.FilePath, &f.LineStart, &f.LineEnd,
			&f.ColumnStart, &f.ColumnEnd, &f.Snippet, &f.Suggestion,
			&f.Metadata, &f.CreatedAt,
		); err != nil {
			return nil, err
		}
		findings = append(findings, &f)
	}
	return findings, nil
}
