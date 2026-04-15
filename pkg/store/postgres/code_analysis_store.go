package postgres

import (
	"context"
	"fmt"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
	"github.com/jackc/pgx/v5"
)

// PostgresCodeAnalysisRegistry implements registry.CodeAnalysisRegistry using PostgreSQL.
type PostgresCodeAnalysisRegistry struct {
	store *Store
}

// NewPostgresCodeAnalysisRegistry creates a new PostgreSQL-backed code analysis registry.
func NewPostgresCodeAnalysisRegistry(store *Store) *PostgresCodeAnalysisRegistry {
	return &PostgresCodeAnalysisRegistry{store: store}
}

func (r *PostgresCodeAnalysisRegistry) Create(ctx context.Context, analysis *registry.CodeAnalysis) error {
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

func (r *PostgresCodeAnalysisRegistry) Get(ctx context.Context, id string) (*registry.CodeAnalysis, error) {
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
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("analysis %s not found", id)
		}
		return nil, err
	}
	return &a, nil
}

func (r *PostgresCodeAnalysisRegistry) List(ctx context.Context, opts registry.ListOptions) ([]*registry.CodeAnalysis, int, error) {
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

func (r *PostgresCodeAnalysisRegistry) Update(ctx context.Context, analysis *registry.CodeAnalysis) error {
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
		return fmt.Errorf("analysis %s not found", analysis.ID)
	}
	return nil
}

func (r *PostgresCodeAnalysisRegistry) Delete(ctx context.Context, id string) error {
	_, err := r.store.pool.Exec(ctx, "DELETE FROM code_analyses WHERE id = $1", id)
	return err
}

func (r *PostgresCodeAnalysisRegistry) AddFinding(ctx context.Context, finding *registry.CodeAnalysisFinding) error {
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

func (r *PostgresCodeAnalysisRegistry) AddFindings(ctx context.Context, findings []*registry.CodeAnalysisFinding) error {
	tx, err := r.store.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

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

func (r *PostgresCodeAnalysisRegistry) ListFindings(ctx context.Context, analysisID string, opts registry.ListOptions) ([]*registry.CodeAnalysisFinding, int, error) {
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

func (r *PostgresCodeAnalysisRegistry) GetFindingsBySeverity(ctx context.Context, analysisID string, severity string) ([]*registry.CodeAnalysisFinding, error) {
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
