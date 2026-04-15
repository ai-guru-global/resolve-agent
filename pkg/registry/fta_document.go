package registry

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// FTADocument represents an FTA analysis document.
type FTADocument struct {
	ID          string            `json:"id"`
	WorkflowID  string            `json:"workflow_id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	FaultTree   map[string]any    `json:"fault_tree"`
	Version     int64             `json:"version"`
	Status      string            `json:"status"` // "draft", "active", "archived"
	Metadata    map[string]any    `json:"metadata"`
	Labels      map[string]string `json:"labels,omitempty"`
	CreatedBy   string            `json:"created_by"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

// FTAAnalysisResult represents the result of an FTA analysis execution.
type FTAAnalysisResult struct {
	ID                      string         `json:"id"`
	DocumentID              string         `json:"document_id"`
	ExecutionID             string         `json:"execution_id"`
	TopEventResult          bool           `json:"top_event_result"`
	MinimalCutSets          []any          `json:"minimal_cut_sets"`
	BasicEventProbabilities map[string]any `json:"basic_event_probabilities"`
	GateResults             map[string]any `json:"gate_results"`
	ImportanceMeasures      map[string]any `json:"importance_measures"`
	Status                  string         `json:"status"` // "completed", "failed"
	DurationMs              int            `json:"duration_ms"`
	Context                 map[string]any `json:"context"`
	CreatedAt               time.Time      `json:"created_at"`
}

// FTADocumentRegistry manages FTA documents and analysis results.
type FTADocumentRegistry interface {
	CreateDocument(ctx context.Context, doc *FTADocument) error
	GetDocument(ctx context.Context, id string) (*FTADocument, error)
	ListDocuments(ctx context.Context, opts ListOptions) ([]*FTADocument, int, error)
	UpdateDocument(ctx context.Context, doc *FTADocument) error
	DeleteDocument(ctx context.Context, id string) error
	ListByWorkflow(ctx context.Context, workflowID string) ([]*FTADocument, error)
	CreateAnalysisResult(ctx context.Context, result *FTAAnalysisResult) error
	GetAnalysisResult(ctx context.Context, id string) (*FTAAnalysisResult, error)
	ListAnalysisResults(ctx context.Context, documentID string, opts ListOptions) ([]*FTAAnalysisResult, int, error)
}

// InMemoryFTADocumentRegistry is an in-memory implementation for development.
type InMemoryFTADocumentRegistry struct {
	mu        sync.RWMutex
	documents map[string]*FTADocument
	results   map[string]*FTAAnalysisResult
}

// NewInMemoryFTADocumentRegistry creates a new in-memory FTA document registry.
func NewInMemoryFTADocumentRegistry() *InMemoryFTADocumentRegistry {
	return &InMemoryFTADocumentRegistry{
		documents: make(map[string]*FTADocument),
		results:   make(map[string]*FTAAnalysisResult),
	}
}

func (r *InMemoryFTADocumentRegistry) CreateDocument(_ context.Context, doc *FTADocument) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.documents[doc.ID]; exists {
		return fmt.Errorf("FTA document %s already exists", doc.ID)
	}

	now := time.Now()
	doc.CreatedAt = now
	doc.UpdatedAt = now
	if doc.Status == "" {
		doc.Status = "draft"
	}
	if doc.Version == 0 {
		doc.Version = 1
	}

	r.documents[doc.ID] = doc
	return nil
}

func (r *InMemoryFTADocumentRegistry) GetDocument(_ context.Context, id string) (*FTADocument, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	doc, ok := r.documents[id]
	if !ok {
		return nil, fmt.Errorf("FTA document %s not found", id)
	}
	return doc, nil
}

func (r *InMemoryFTADocumentRegistry) ListDocuments(_ context.Context, opts ListOptions) ([]*FTADocument, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	docs := make([]*FTADocument, 0, len(r.documents))
	for _, d := range r.documents {
		if len(opts.Filter) > 0 {
			match := true
			for key, value := range opts.Filter {
				switch key {
				case "status":
					if d.Status != value {
						match = false
					}
				case "workflow_id":
					if d.WorkflowID != value {
						match = false
					}
				}
			}
			if !match {
				continue
			}
		}
		docs = append(docs, d)
	}

	total := len(docs)
	if offset >= total {
		return []*FTADocument{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return docs[offset:end], total, nil
}

func (r *InMemoryFTADocumentRegistry) UpdateDocument(_ context.Context, doc *FTADocument) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.documents[doc.ID]; !exists {
		return fmt.Errorf("FTA document %s not found", doc.ID)
	}

	doc.UpdatedAt = time.Now()
	r.documents[doc.ID] = doc
	return nil
}

func (r *InMemoryFTADocumentRegistry) DeleteDocument(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Cascade delete analysis results
	for rid, result := range r.results {
		if result.DocumentID == id {
			delete(r.results, rid)
		}
	}
	delete(r.documents, id)
	return nil
}

func (r *InMemoryFTADocumentRegistry) ListByWorkflow(_ context.Context, workflowID string) ([]*FTADocument, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var docs []*FTADocument
	for _, d := range r.documents {
		if d.WorkflowID == workflowID {
			docs = append(docs, d)
		}
	}
	return docs, nil
}

func (r *InMemoryFTADocumentRegistry) CreateAnalysisResult(_ context.Context, result *FTAAnalysisResult) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.results[result.ID]; exists {
		return fmt.Errorf("FTA analysis result %s already exists", result.ID)
	}

	result.CreatedAt = time.Now()
	r.results[result.ID] = result
	return nil
}

func (r *InMemoryFTADocumentRegistry) GetAnalysisResult(_ context.Context, id string) (*FTAAnalysisResult, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result, ok := r.results[id]
	if !ok {
		return nil, fmt.Errorf("FTA analysis result %s not found", id)
	}
	return result, nil
}

func (r *InMemoryFTADocumentRegistry) ListAnalysisResults(_ context.Context, documentID string, opts ListOptions) ([]*FTAAnalysisResult, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	var results []*FTAAnalysisResult
	for _, res := range r.results {
		if res.DocumentID == documentID {
			results = append(results, res)
		}
	}

	total := len(results)
	if offset >= total {
		return []*FTAAnalysisResult{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return results[offset:end], total, nil
}
