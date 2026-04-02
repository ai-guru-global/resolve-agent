package registry

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// RAGCollection represents a stored RAG collection.
type RAGCollection struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Config      map[string]any    `json:"config"`
	Status      string            `json:"status"`
	Labels      map[string]string `json:"labels,omitempty"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
}

// RAGRegistry manages RAG collections.
type RAGRegistry interface {
	Create(ctx context.Context, collection *RAGCollection) error
	Get(ctx context.Context, id string) (*RAGCollection, error)
	List(ctx context.Context, opts ListOptions) ([]*RAGCollection, int, error)
	Update(ctx context.Context, collection *RAGCollection) error
	Delete(ctx context.Context, id string) error
}

// InMemoryRAGRegistry is an in-memory implementation for development.
type InMemoryRAGRegistry struct {
	mu          sync.RWMutex
	collections map[string]*RAGCollection
}

// NewInMemoryRAGRegistry creates a new in-memory RAG registry.
func NewInMemoryRAGRegistry() *InMemoryRAGRegistry {
	return &InMemoryRAGRegistry{
		collections: make(map[string]*RAGCollection),
	}
}

func (r *InMemoryRAGRegistry) Create(_ context.Context, collection *RAGCollection) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.collections[collection.ID]; exists {
		return fmt.Errorf("collection %s already exists", collection.ID)
	}

	now := time.Now()
	collection.CreatedAt = now
	collection.UpdatedAt = now

	if collection.Status == "" {
		collection.Status = "active"
	}

	r.collections[collection.ID] = collection
	return nil
}

func (r *InMemoryRAGRegistry) Get(_ context.Context, id string) (*RAGCollection, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	collection, ok := r.collections[id]
	if !ok {
		return nil, fmt.Errorf("collection %s not found", id)
	}
	return collection, nil
}

func (r *InMemoryRAGRegistry) List(_ context.Context, opts ListOptions) ([]*RAGCollection, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	collections := make([]*RAGCollection, 0, len(r.collections))
	for _, c := range r.collections {
		// Apply filter if specified
		if len(opts.Filter) > 0 {
			match := true
			for key, value := range opts.Filter {
				switch key {
				case "status":
					if c.Status != value {
						match = false
						break
					}
				case "name":
					if c.Name != value {
						match = false
						break
					}
				}
			}
			if !match {
				continue
			}
		}
		collections = append(collections, c)
	}

	total := len(collections)

	// Apply pagination
	if offset >= total {
		return []*RAGCollection{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}

	return collections[offset:end], total, nil
}

func (r *InMemoryRAGRegistry) Update(_ context.Context, collection *RAGCollection) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.collections[collection.ID]; !exists {
		return fmt.Errorf("collection %s not found", collection.ID)
	}

	collection.UpdatedAt = time.Now()
	r.collections[collection.ID] = collection
	return nil
}

func (r *InMemoryRAGRegistry) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.collections, id)
	return nil
}
