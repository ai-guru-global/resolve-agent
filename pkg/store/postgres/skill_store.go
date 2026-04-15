package postgres

import (
	"context"
	"fmt"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
	"github.com/jackc/pgx/v5"
)

// PostgresSkillRegistry implements registry.SkillRegistry using PostgreSQL.
type PostgresSkillRegistry struct {
	store *Store
}

// NewPostgresSkillRegistry creates a new PostgreSQL-backed skill registry.
func NewPostgresSkillRegistry(store *Store) *PostgresSkillRegistry {
	return &PostgresSkillRegistry{store: store}
}

func (r *PostgresSkillRegistry) Register(ctx context.Context, skill *registry.SkillDefinition) error {
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO skills (name, version, description, author, manifest, source_type, source_uri, status, labels)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		ON CONFLICT (name) DO UPDATE SET
			version = EXCLUDED.version,
			description = EXCLUDED.description,
			author = EXCLUDED.author,
			manifest = EXCLUDED.manifest,
			source_type = EXCLUDED.source_type,
			source_uri = EXCLUDED.source_uri,
			status = EXCLUDED.status,
			labels = EXCLUDED.labels,
			updated_at = CURRENT_TIMESTAMP
	`,
		skill.Name, skill.Version, skill.Description, skill.Author,
		skill.Manifest, skill.SourceType, skill.SourceURI, skill.Status, skill.Labels,
	)
	return err
}

func (r *PostgresSkillRegistry) Get(ctx context.Context, name string) (*registry.SkillDefinition, error) {
	var skill registry.SkillDefinition
	err := r.store.pool.QueryRow(ctx, `
		SELECT name, version, description, author, manifest, source_type, source_uri, status, labels
		FROM skills WHERE name = $1
	`, name).Scan(
		&skill.Name, &skill.Version, &skill.Description, &skill.Author,
		&skill.Manifest, &skill.SourceType, &skill.SourceURI, &skill.Status, &skill.Labels,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("skill %s not found", name)
		}
		return nil, err
	}
	return &skill, nil
}

func (r *PostgresSkillRegistry) List(ctx context.Context, opts registry.ListOptions) ([]*registry.SkillDefinition, int, error) {
	// Count total
	var total int
	countSQL := "SELECT COUNT(*) FROM skills"
	if err := r.store.pool.QueryRow(ctx, countSQL).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	rows, err := r.store.pool.Query(ctx, `
		SELECT name, version, description, author, manifest, source_type, source_uri, status, labels
		FROM skills ORDER BY name LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var skills []*registry.SkillDefinition
	for rows.Next() {
		var s registry.SkillDefinition
		if err := rows.Scan(
			&s.Name, &s.Version, &s.Description, &s.Author,
			&s.Manifest, &s.SourceType, &s.SourceURI, &s.Status, &s.Labels,
		); err != nil {
			return nil, 0, err
		}
		skills = append(skills, &s)
	}

	return skills, total, nil
}

func (r *PostgresSkillRegistry) Unregister(ctx context.Context, name string) error {
	_, err := r.store.pool.Exec(ctx, "DELETE FROM skills WHERE name = $1", name)
	return err
}
