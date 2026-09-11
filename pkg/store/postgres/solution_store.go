package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	pkgerrors "github.com/ai-guru-global/resolve-agent/pkg/errors"
	"github.com/ai-guru-global/resolve-agent/pkg/registry"
	"github.com/jackc/pgx/v5"
)

// 编译期接口断言。
var _ registry.TroubleshootingSolutionRegistry = (*SolutionRegistry)(nil)

// SolutionRegistry implements registry.TroubleshootingSolutionRegistry using PostgreSQL.
type SolutionRegistry struct {
	store *Store
}

// NewSolutionRegistry creates a new PostgreSQL-backed solution registry.
func NewSolutionRegistry(store *Store) *SolutionRegistry {
	return &SolutionRegistry{store: store}
}

const solutionColumns = `id, title, problem_symptoms, key_information, troubleshooting_steps,
	resolution_steps, domain, component, severity, tags, search_keywords, version, status,
	source_uri, rag_collection_id, rag_document_id, related_skill_names, related_workflow_ids,
	metadata, created_by, created_at, updated_at`

func scanSolution(row pgx.Row) (*registry.TroubleshootingSolution, error) {
	var s registry.TroubleshootingSolution
	var tags, skills, workflows, metadata []byte
	var createdAt, updatedAt time.Time
	if err := row.Scan(
		&s.ID, &s.Title, &s.ProblemSymptoms, &s.KeyInformation,
		&s.TroubleshootingSteps, &s.ResolutionSteps, &s.Domain, &s.Component,
		&s.Severity, &tags, &s.SearchKeywords, &s.Version, &s.Status,
		&s.SourceURI, &s.RAGCollectionID, &s.RAGDocumentID,
		&skills, &workflows, &metadata, &s.CreatedBy, &createdAt, &updatedAt,
	); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(tags, &s.Tags); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(skills, &s.RelatedSkillNames); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(workflows, &s.RelatedWorkflowIDs); err != nil {
		return nil, err
	}
	if len(metadata) > 0 {
		if err := json.Unmarshal(metadata, &s.Metadata); err != nil {
			return nil, err
		}
	}
	s.CreatedAt = createdAt
	s.UpdatedAt = updatedAt
	return &s, nil
}

// Create inserts a solution row, stamping timestamps and defaulting version.
// Duplicate IDs surface as sentinel AlreadyExists.
func (r *SolutionRegistry) Create(ctx context.Context, solution *registry.TroubleshootingSolution) error {
	now := time.Now()
	solution.CreatedAt = now
	solution.UpdatedAt = now
	if solution.Version == 0 {
		solution.Version = 1
	}
	tags, _ := json.Marshal(orEmptySlice(solution.Tags))
	skills, _ := json.Marshal(orEmptySlice(solution.RelatedSkillNames))
	workflows, _ := json.Marshal(orEmptySlice(solution.RelatedWorkflowIDs))
	metadata, _ := json.Marshal(solution.Metadata)

	tag, err := r.store.pool.Exec(ctx, `
		INSERT INTO solutions (`+solutionColumns+`)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
		ON CONFLICT (id) DO NOTHING
	`,
		solution.ID, solution.Title, solution.ProblemSymptoms, solution.KeyInformation,
		solution.TroubleshootingSteps, solution.ResolutionSteps, solution.Domain, solution.Component,
		solution.Severity, tags, solution.SearchKeywords, solution.Version, solution.Status,
		solution.SourceURI, solution.RAGCollectionID, solution.RAGDocumentID,
		skills, workflows, metadata, solution.CreatedBy, solution.CreatedAt, solution.UpdatedAt,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pkgerrors.AlreadyExists("solution", solution.ID)
	}
	return nil
}

// Get returns the solution with the given ID or sentinel NotFound.
func (r *SolutionRegistry) Get(ctx context.Context, id string) (*registry.TroubleshootingSolution, error) {
	row := r.store.pool.QueryRow(ctx,
		`SELECT `+solutionColumns+` FROM solutions WHERE id = $1`, id)
	s, err := scanSolution(row)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pkgerrors.NotFound("solution", id)
		}
		return nil, err
	}
	return s, nil
}

// List returns solutions with optional status/domain/severity filter from
// ListOptions.Filter, paginated, with total count.
func (r *SolutionRegistry) List(ctx context.Context, opts registry.ListOptions) ([]*registry.TroubleshootingSolution, int, error) {
	status := opts.Filter["status"]
	domain := opts.Filter["domain"]
	severity := opts.Filter["severity"]
	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	where := ` WHERE ($1 = '' OR status = $1) AND ($2 = '' OR domain = $2) AND ($3 = '' OR severity = $3)`
	var total int
	if err := r.store.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM solutions"+where, status, domain, severity).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT `+solutionColumns+` FROM solutions`+where+`
		ORDER BY created_at DESC, id LIMIT $4 OFFSET $5`,
		status, domain, severity, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	out := []*registry.TroubleshootingSolution{}
	for rows.Next() {
		s, err := scanSolution(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, s)
	}
	return out, total, rows.Err()
}

// Update overwrites the solution row and refreshes updated_at.
func (r *SolutionRegistry) Update(ctx context.Context, solution *registry.TroubleshootingSolution) error {
	solution.UpdatedAt = time.Now()
	tags, _ := json.Marshal(orEmptySlice(solution.Tags))
	skills, _ := json.Marshal(orEmptySlice(solution.RelatedSkillNames))
	workflows, _ := json.Marshal(orEmptySlice(solution.RelatedWorkflowIDs))
	metadata, _ := json.Marshal(solution.Metadata)

	tag, err := r.store.pool.Exec(ctx, `
		UPDATE solutions SET title=$2, problem_symptoms=$3, key_information=$4,
			troubleshooting_steps=$5, resolution_steps=$6, domain=$7, component=$8,
			severity=$9, tags=$10, search_keywords=$11, version=$12, status=$13,
			source_uri=$14, rag_collection_id=$15, rag_document_id=$16,
			related_skill_names=$17, related_workflow_ids=$18, metadata=$19,
			created_by=$20, updated_at=$21
		WHERE id = $1
	`,
		solution.ID, solution.Title, solution.ProblemSymptoms, solution.KeyInformation,
		solution.TroubleshootingSteps, solution.ResolutionSteps, solution.Domain, solution.Component,
		solution.Severity, tags, solution.SearchKeywords, solution.Version, solution.Status,
		solution.SourceURI, solution.RAGCollectionID, solution.RAGDocumentID,
		skills, workflows, metadata, solution.CreatedBy, solution.UpdatedAt,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return pkgerrors.NotFound("solution", solution.ID)
	}
	return nil
}

// Delete removes the solution row and cascades its execution records.
func (r *SolutionRegistry) Delete(ctx context.Context, id string) error {
	_, err := r.store.pool.Exec(ctx, "DELETE FROM solution_executions WHERE solution_id = $1", id)
	if err != nil {
		return err
	}
	_, err = r.store.pool.Exec(ctx, "DELETE FROM solutions WHERE id = $1", id)
	return err
}

// Search filters by domain/component/severity/status, tag containment, and
// case-insensitive keyword over title+symptoms+keywords, paginated, with total.
func (r *SolutionRegistry) Search(ctx context.Context, opts *registry.SolutionSearchOptions) ([]*registry.TroubleshootingSolution, int, error) {
	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	tagsJSON, _ := json.Marshal(orEmptySlice(opts.Tags))

	where := ` WHERE ($1 = '' OR domain = $1)
		AND ($2 = '' OR component = $2)
		AND ($3 = '' OR severity = $3)
		AND ($4 = '' OR status = $4)
		AND ($5::jsonb = '[]'::jsonb OR tags @> $5::jsonb)
		AND ($6 = '' OR LOWER(title || ' ' || problem_symptoms || ' ' || search_keywords) LIKE '%' || LOWER($6) || '%')`
	args := []any{opts.Domain, opts.Component, opts.Severity, opts.Status, string(tagsJSON), opts.Keyword}

	var total int
	if err := r.store.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM solutions"+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT `+solutionColumns+` FROM solutions`+where+`
		ORDER BY created_at DESC, id LIMIT $7 OFFSET $8`,
		append(args, limit, opts.Offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	out := []*registry.TroubleshootingSolution{}
	for rows.Next() {
		s, err := scanSolution(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, s)
	}
	return out, total, rows.Err()
}

// BulkCreate inserts solutions whose IDs are absent, stamping timestamps, and
// returns how many rows were created.
func (r *SolutionRegistry) BulkCreate(ctx context.Context, solutions []*registry.TroubleshootingSolution) (int, error) {
	created := 0
	now := time.Now()
	for _, s := range solutions {
		s.CreatedAt = now
		s.UpdatedAt = now
		if s.Version == 0 {
			s.Version = 1
		}
		tags, _ := json.Marshal(orEmptySlice(s.Tags))
		skills, _ := json.Marshal(orEmptySlice(s.RelatedSkillNames))
		workflows, _ := json.Marshal(orEmptySlice(s.RelatedWorkflowIDs))
		metadata, _ := json.Marshal(s.Metadata)

		tag, err := r.store.pool.Exec(ctx, `
			INSERT INTO solutions (`+solutionColumns+`)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
			ON CONFLICT (id) DO NOTHING
		`,
			s.ID, s.Title, s.ProblemSymptoms, s.KeyInformation,
			s.TroubleshootingSteps, s.ResolutionSteps, s.Domain, s.Component,
			s.Severity, tags, s.SearchKeywords, s.Version, s.Status,
			s.SourceURI, s.RAGCollectionID, s.RAGDocumentID,
			skills, workflows, metadata, s.CreatedBy, s.CreatedAt, s.UpdatedAt,
		)
		if err != nil {
			return created, err
		}
		created += int(tag.RowsAffected())
	}
	return created, nil
}

// RecordExecution inserts a solution execution row, stamping created_at.
func (r *SolutionRegistry) RecordExecution(ctx context.Context, exec *registry.SolutionExecution) error {
	exec.CreatedAt = time.Now()
	triggerCtx, _ := json.Marshal(exec.TriggerContext)
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO solution_executions (id, solution_id, executor, trigger_context, status,
			outcome_notes, effectiveness_score, duration_ms, started_at, completed_at, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
	`,
		exec.ID, exec.SolutionID, exec.Executor, triggerCtx, exec.Status,
		exec.OutcomeNotes, exec.EffectivenessScore, exec.DurationMs,
		exec.StartedAt, exec.CompletedAt, exec.CreatedAt,
	)
	return err
}

// ListExecutions returns the execution rows of a solution, paginated, with total.
func (r *SolutionRegistry) ListExecutions(ctx context.Context, solutionID string, opts registry.ListOptions) ([]*registry.SolutionExecution, int, error) {
	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	var total int
	if err := r.store.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM solution_executions WHERE solution_id = $1", solutionID).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, solution_id, executor, trigger_context, status, outcome_notes,
			effectiveness_score, duration_ms, started_at, completed_at, created_at
		FROM solution_executions WHERE solution_id = $1
		ORDER BY created_at DESC, id LIMIT $2 OFFSET $3`,
		solutionID, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	out := []*registry.SolutionExecution{}
	for rows.Next() {
		var e registry.SolutionExecution
		var triggerCtx []byte
		if err := rows.Scan(
			&e.ID, &e.SolutionID, &e.Executor, &triggerCtx, &e.Status,
			&e.OutcomeNotes, &e.EffectivenessScore, &e.DurationMs,
			&e.StartedAt, &e.CompletedAt, &e.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		if len(triggerCtx) > 0 {
			if err := json.Unmarshal(triggerCtx, &e.TriggerContext); err != nil {
				return nil, 0, err
			}
		}
		out = append(out, &e)
	}
	return out, total, rows.Err()
}

// orEmptySlice normalizes nil slices to JSON-empty arrays so round-trips
// never yield null.
func orEmptySlice(s []string) []string {
	if s == nil {
		return []string{}
	}
	return s
}
