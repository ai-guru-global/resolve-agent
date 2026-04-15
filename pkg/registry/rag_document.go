package registry

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// RAGDocument represents metadata for a document in a RAG collection.
type RAGDocument struct {
	ID           string         `json:"id"`
	CollectionID string         `json:"collection_id"`
	Title        string         `json:"title"`
	SourceURI    string         `json:"source_uri"`
	ContentHash  string         `json:"content_hash"`
	ContentType  string         `json:"content_type"`
	ChunkCount   int            `json:"chunk_count"`
	VectorIDs    []string       `json:"vector_ids"`
	Metadata     map[string]any `json:"metadata"`
	Status       string         `json:"status"` // "pending", "processing", "indexed", "failed", "deleted"
	SizeBytes    int64          `json:"size_bytes"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
}

// RAGIngestionRecord represents a document ingestion event.
type RAGIngestionRecord struct {
	ID              string         `json:"id"`
	CollectionID    string         `json:"collection_id"`
	DocumentID      string         `json:"document_id"`
	Action          string         `json:"action"` // "ingest", "reindex", "delete", "update"
	Status          string         `json:"status"` // "pending", "running", "completed", "failed"
	ChunksProcessed int            `json:"chunks_processed"`
	VectorsCreated  int            `json:"vectors_created"`
	Error           string         `json:"error"`
	DurationMs      int            `json:"duration_ms"`
	Metadata        map[string]any `json:"metadata"`
	CreatedAt       time.Time      `json:"created_at"`
}

// RAGDocumentRegistry manages RAG document metadata and ingestion history.
type RAGDocumentRegistry interface {
	CreateDocument(ctx context.Context, doc *RAGDocument) error
	GetDocument(ctx context.Context, id string) (*RAGDocument, error)
	ListDocuments(ctx context.Context, collectionID string, opts ListOptions) ([]*RAGDocument, int, error)
	UpdateDocument(ctx context.Context, doc *RAGDocument) error
	DeleteDocument(ctx context.Context, id string) error
	GetDocumentByHash(ctx context.Context, collectionID string, contentHash string) (*RAGDocument, error)
	RecordIngestion(ctx context.Context, record *RAGIngestionRecord) error
	ListIngestionHistory(ctx context.Context, collectionID string, opts ListOptions) ([]*RAGIngestionRecord, int, error)
}

// InMemoryRAGDocumentRegistry is an in-memory implementation for development.
type InMemoryRAGDocumentRegistry struct {
	mu         sync.RWMutex
	documents  map[string]*RAGDocument
	ingestions map[string]*RAGIngestionRecord
}

// NewInMemoryRAGDocumentRegistry creates a new in-memory RAG document registry.
func NewInMemoryRAGDocumentRegistry() *InMemoryRAGDocumentRegistry {
	return &InMemoryRAGDocumentRegistry{
		documents:  make(map[string]*RAGDocument),
		ingestions: make(map[string]*RAGIngestionRecord),
	}
}

func (r *InMemoryRAGDocumentRegistry) CreateDocument(_ context.Context, doc *RAGDocument) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.documents[doc.ID]; exists {
		return fmt.Errorf("document %s already exists", doc.ID)
	}

	now := time.Now()
	doc.CreatedAt = now
	doc.UpdatedAt = now
	if doc.Status == "" {
		doc.Status = "pending"
	}

	r.documents[doc.ID] = doc
	return nil
}

func (r *InMemoryRAGDocumentRegistry) GetDocument(_ context.Context, id string) (*RAGDocument, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	doc, ok := r.documents[id]
	if !ok {
		return nil, fmt.Errorf("document %s not found", id)
	}
	return doc, nil
}

func (r *InMemoryRAGDocumentRegistry) ListDocuments(_ context.Context, collectionID string, opts ListOptions) ([]*RAGDocument, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	var docs []*RAGDocument
	for _, d := range r.documents {
		if d.CollectionID != collectionID {
			continue
		}
		if len(opts.Filter) > 0 {
			if status, ok := opts.Filter["status"]; ok && d.Status != status {
				continue
			}
		}
		docs = append(docs, d)
	}

	total := len(docs)
	if offset >= total {
		return []*RAGDocument{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return docs[offset:end], total, nil
}

func (r *InMemoryRAGDocumentRegistry) UpdateDocument(_ context.Context, doc *RAGDocument) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.documents[doc.ID]; !exists {
		return fmt.Errorf("document %s not found", doc.ID)
	}

	doc.UpdatedAt = time.Now()
	r.documents[doc.ID] = doc
	return nil
}

func (r *InMemoryRAGDocumentRegistry) DeleteDocument(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.documents, id)
	return nil
}

func (r *InMemoryRAGDocumentRegistry) GetDocumentByHash(_ context.Context, collectionID string, contentHash string) (*RAGDocument, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, d := range r.documents {
		if d.CollectionID == collectionID && d.ContentHash == contentHash {
			return d, nil
		}
	}
	return nil, fmt.Errorf("document with hash %s not found in collection %s", contentHash, collectionID)
}

func (r *InMemoryRAGDocumentRegistry) RecordIngestion(_ context.Context, record *RAGIngestionRecord) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	record.CreatedAt = time.Now()
	r.ingestions[record.ID] = record
	return nil
}

func (r *InMemoryRAGDocumentRegistry) ListIngestionHistory(_ context.Context, collectionID string, opts ListOptions) ([]*RAGIngestionRecord, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	var records []*RAGIngestionRecord
	for _, rec := range r.ingestions {
		if rec.CollectionID == collectionID {
			records = append(records, rec)
		}
	}

	total := len(records)
	if offset >= total {
		return []*RAGIngestionRecord{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return records[offset:end], total, nil
}
