package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
	"github.com/jackc/pgx/v5"
)

// PostgresRAGRegistry implements registry.RAGRegistry using PostgreSQL.
type PostgresRAGRegistry struct {
	store *Store
}

// NewPostgresRAGRegistry creates a new PostgreSQL-backed RAG registry.
func NewPostgresRAGRegistry(store *Store) *PostgresRAGRegistry {
	return &PostgresRAGRegistry{store: store}
}

func (r *PostgresRAGRegistry) Create(ctx context.Context, collection *registry.RAGCollection) error {
	now := time.Now()
	if collection.Status == "" {
		collection.Status = "active"
	}
	collection.CreatedAt = now
	collection.UpdatedAt = now

	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO rag_collections (id, name, description, config, status, labels, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`,
		collection.ID, collection.Name, collection.Description,
		collection.Config, collection.Status, collection.Labels,
		collection.CreatedAt, collection.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("creating collection: %w", err)
	}
	return nil
}

func (r *PostgresRAGRegistry) Get(ctx context.Context, id string) (*registry.RAGCollection, error) {
	var collection registry.RAGCollection
	err := r.store.pool.QueryRow(ctx, `
		SELECT id, name, description, config, status, labels, created_at, updated_at
		FROM rag_collections WHERE id = $1
	`, id).Scan(
		&collection.ID, &collection.Name, &collection.Description,
		&collection.Config, &collection.Status, &collection.Labels,
		&collection.CreatedAt, &collection.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("collection %s not found", id)
		}
		return nil, err
	}
	return &collection, nil
}

func (r *PostgresRAGRegistry) List(ctx context.Context, opts registry.ListOptions) ([]*registry.RAGCollection, int, error) {
	var total int
	if err := r.store.pool.QueryRow(ctx, "SELECT COUNT(*) FROM rag_collections").Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, name, description, config, status, labels, created_at, updated_at
		FROM rag_collections ORDER BY name LIMIT $1 OFFSET $2
	`, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var collections []*registry.RAGCollection
	for rows.Next() {
		var c registry.RAGCollection
		if err := rows.Scan(
			&c.ID, &c.Name, &c.Description,
			&c.Config, &c.Status, &c.Labels,
			&c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		collections = append(collections, &c)
	}
	return collections, total, nil
}

func (r *PostgresRAGRegistry) Update(ctx context.Context, collection *registry.RAGCollection) error {
	collection.UpdatedAt = time.Now()
	tag, err := r.store.pool.Exec(ctx, `
		UPDATE rag_collections SET name=$2, description=$3, config=$4, status=$5, labels=$6, updated_at=$7
		WHERE id = $1
	`,
		collection.ID, collection.Name, collection.Description,
		collection.Config, collection.Status, collection.Labels,
		collection.UpdatedAt,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("collection %s not found", collection.ID)
	}
	return nil
}

func (r *PostgresRAGRegistry) Delete(ctx context.Context, id string) error {
	_, err := r.store.pool.Exec(ctx, "DELETE FROM rag_collections WHERE id = $1", id)
	return err
}
