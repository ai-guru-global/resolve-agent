package postgres

import (
	"context"
	"fmt"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
	"github.com/jackc/pgx/v5"
)

// PostgresRAGDocumentRegistry implements registry.RAGDocumentRegistry using PostgreSQL.
type PostgresRAGDocumentRegistry struct {
	store *Store
}

// NewPostgresRAGDocumentRegistry creates a new PostgreSQL-backed RAG document registry.
func NewPostgresRAGDocumentRegistry(store *Store) *PostgresRAGDocumentRegistry {
	return &PostgresRAGDocumentRegistry{store: store}
}

func (r *PostgresRAGDocumentRegistry) CreateDocument(ctx context.Context, doc *registry.RAGDocument) error {
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO rag_documents (id, collection_id, title, source_uri, content_hash,
			content_type, chunk_count, vector_ids, metadata, status, size_bytes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`,
		doc.ID, doc.CollectionID, doc.Title, doc.SourceURI, doc.ContentHash,
		doc.ContentType, doc.ChunkCount, doc.VectorIDs, doc.Metadata,
		doc.Status, doc.SizeBytes,
	)
	return err
}

func (r *PostgresRAGDocumentRegistry) GetDocument(ctx context.Context, id string) (*registry.RAGDocument, error) {
	var doc registry.RAGDocument
	err := r.store.pool.QueryRow(ctx, `
		SELECT id, collection_id, title, source_uri, content_hash, content_type,
			chunk_count, vector_ids, metadata, status, size_bytes, created_at, updated_at
		FROM rag_documents WHERE id = $1
	`, id).Scan(
		&doc.ID, &doc.CollectionID, &doc.Title, &doc.SourceURI, &doc.ContentHash,
		&doc.ContentType, &doc.ChunkCount, &doc.VectorIDs, &doc.Metadata,
		&doc.Status, &doc.SizeBytes, &doc.CreatedAt, &doc.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("document %s not found", id)
		}
		return nil, err
	}
	return &doc, nil
}

func (r *PostgresRAGDocumentRegistry) ListDocuments(ctx context.Context, collectionID string, opts registry.ListOptions) ([]*registry.RAGDocument, int, error) {
	var total int
	if err := r.store.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM rag_documents WHERE collection_id = $1", collectionID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, collection_id, title, source_uri, content_hash, content_type,
			chunk_count, vector_ids, metadata, status, size_bytes, created_at, updated_at
		FROM rag_documents WHERE collection_id = $1
		ORDER BY created_at DESC LIMIT $2 OFFSET $3
	`, collectionID, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var docs []*registry.RAGDocument
	for rows.Next() {
		var d registry.RAGDocument
		if err := rows.Scan(
			&d.ID, &d.CollectionID, &d.Title, &d.SourceURI, &d.ContentHash,
			&d.ContentType, &d.ChunkCount, &d.VectorIDs, &d.Metadata,
			&d.Status, &d.SizeBytes, &d.CreatedAt, &d.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		docs = append(docs, &d)
	}
	return docs, total, nil
}

func (r *PostgresRAGDocumentRegistry) UpdateDocument(ctx context.Context, doc *registry.RAGDocument) error {
	tag, err := r.store.pool.Exec(ctx, `
		UPDATE rag_documents SET collection_id=$2, title=$3, source_uri=$4, content_hash=$5,
			content_type=$6, chunk_count=$7, vector_ids=$8, metadata=$9, status=$10, size_bytes=$11
		WHERE id = $1
	`,
		doc.ID, doc.CollectionID, doc.Title, doc.SourceURI, doc.ContentHash,
		doc.ContentType, doc.ChunkCount, doc.VectorIDs, doc.Metadata,
		doc.Status, doc.SizeBytes,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return fmt.Errorf("document %s not found", doc.ID)
	}
	return nil
}

func (r *PostgresRAGDocumentRegistry) DeleteDocument(ctx context.Context, id string) error {
	_, err := r.store.pool.Exec(ctx, "DELETE FROM rag_documents WHERE id = $1", id)
	return err
}

func (r *PostgresRAGDocumentRegistry) GetDocumentByHash(ctx context.Context, collectionID string, contentHash string) (*registry.RAGDocument, error) {
	var doc registry.RAGDocument
	err := r.store.pool.QueryRow(ctx, `
		SELECT id, collection_id, title, source_uri, content_hash, content_type,
			chunk_count, vector_ids, metadata, status, size_bytes, created_at, updated_at
		FROM rag_documents WHERE collection_id = $1 AND content_hash = $2
	`, collectionID, contentHash).Scan(
		&doc.ID, &doc.CollectionID, &doc.Title, &doc.SourceURI, &doc.ContentHash,
		&doc.ContentType, &doc.ChunkCount, &doc.VectorIDs, &doc.Metadata,
		&doc.Status, &doc.SizeBytes, &doc.CreatedAt, &doc.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("document with hash %s not found in collection %s", contentHash, collectionID)
		}
		return nil, err
	}
	return &doc, nil
}

func (r *PostgresRAGDocumentRegistry) RecordIngestion(ctx context.Context, record *registry.RAGIngestionRecord) error {
	_, err := r.store.pool.Exec(ctx, `
		INSERT INTO rag_ingestion_history (id, collection_id, document_id, action, status,
			chunks_processed, vectors_created, error, duration_ms, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`,
		record.ID, record.CollectionID, nilIfEmpty(record.DocumentID), record.Action,
		record.Status, record.ChunksProcessed, record.VectorsCreated,
		nilIfEmpty(record.Error), record.DurationMs, record.Metadata,
	)
	return err
}

func (r *PostgresRAGDocumentRegistry) ListIngestionHistory(ctx context.Context, collectionID string, opts registry.ListOptions) ([]*registry.RAGIngestionRecord, int, error) {
	var total int
	if err := r.store.pool.QueryRow(ctx,
		"SELECT COUNT(*) FROM rag_ingestion_history WHERE collection_id = $1", collectionID,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}

	rows, err := r.store.pool.Query(ctx, `
		SELECT id, collection_id, document_id, action, status,
			chunks_processed, vectors_created, error, duration_ms, metadata, created_at
		FROM rag_ingestion_history WHERE collection_id = $1
		ORDER BY created_at DESC LIMIT $2 OFFSET $3
	`, collectionID, limit, opts.Offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var records []*registry.RAGIngestionRecord
	for rows.Next() {
		var rec registry.RAGIngestionRecord
		var docID, errStr *string
		if err := rows.Scan(
			&rec.ID, &rec.CollectionID, &docID, &rec.Action, &rec.Status,
			&rec.ChunksProcessed, &rec.VectorsCreated, &errStr,
			&rec.DurationMs, &rec.Metadata, &rec.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		if docID != nil {
			rec.DocumentID = *docID
		}
		if errStr != nil {
			rec.Error = *errStr
		}
		records = append(records, &rec)
	}
	return records, total, nil
}
