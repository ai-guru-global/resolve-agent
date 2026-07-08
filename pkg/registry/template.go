package registry

import (
	"context"
	"fmt"
	"sync"
)

// =============================================================================
// Loop Engineering: Registry Pattern Template
// =============================================================================
// This file extracts the common Registry pattern used across all entity types
// (Agent, Workflow, RAG, Hook, Skill) into a reusable generic implementation.
// New registries should use this template to ensure consistency and reduce
// boilerplate in the CRUD + list + version lifecycle.
// =============================================================================

// ListResult wraps a paginated list response.
type ListResult[T any] struct {
	Items []*T `json:"items"`
	Total int  `json:"total"`
}

// Registry is the generic CRUD interface for all entity registries.
// It follows the Template Method pattern: concrete registries embed this
// and provide entity-specific behavior via the Validator and Keyer interfaces.
type Registry[T any] interface {
	Create(ctx context.Context, entity *T) error
	Get(ctx context.Context, id string) (*T, error)
	List(ctx context.Context, opts ListOptions) ([]*T, int, error)
	Update(ctx context.Context, entity *T) error
	Delete(ctx context.Context, id string) error
}

// Keyer extracts the unique identifier from an entity.
type Keyer[T any] func(entity *T) string

// Validator performs entity-level validation before persistence.
type Validator[T any] func(entity *T) error

// GenericInMemoryRegistry is a reusable in-memory implementation of Registry[T].
// It serves as the canonical pattern for all in-memory registries and as a
// development/testing stub.
type GenericInMemoryRegistry[T any] struct {
	mu       sync.RWMutex
	entities map[string]*T
	keyer    Keyer[T]
	validate Validator[T]
}

// NewGenericInMemoryRegistry creates a registry with the given key and validator functions.
func NewGenericInMemoryRegistry[T any](keyer Keyer[T], validate Validator[T]) *GenericInMemoryRegistry[T] {
	return &GenericInMemoryRegistry[T]{
		entities: make(map[string]*T),
		keyer:    keyer,
		validate: validate,
	}
}

func (r *GenericInMemoryRegistry[T]) Create(_ context.Context, entity *T) error {
	if r.validate != nil {
		if err := r.validate(entity); err != nil {
			return fmt.Errorf("validation: %w", err)
		}
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	key := r.keyer(entity)
	if _, exists := r.entities[key]; exists {
		return fmt.Errorf("entity %s already exists", key)
	}

	r.entities[key] = entity
	return nil
}

func (r *GenericInMemoryRegistry[T]) Get(_ context.Context, id string) (*T, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	entity, ok := r.entities[id]
	if !ok {
		return nil, fmt.Errorf("entity %s not found", id)
	}
	return entity, nil
}

func (r *GenericInMemoryRegistry[T]) List(_ context.Context, opts ListOptions) ([]*T, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	all := make([]*T, 0, len(r.entities))
	for _, e := range r.entities {
		all = append(all, e)
	}
	total := len(all)

	// Apply pagination.
	if opts.Offset > 0 && opts.Offset < total {
		all = all[opts.Offset:]
	}
	if opts.Limit > 0 && opts.Limit < len(all) {
		all = all[:opts.Limit]
	}

	return all, total, nil
}

func (r *GenericInMemoryRegistry[T]) Update(_ context.Context, entity *T) error {
	if r.validate != nil {
		if err := r.validate(entity); err != nil {
			return fmt.Errorf("validation: %w", err)
		}
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	key := r.keyer(entity)
	if _, exists := r.entities[key]; !exists {
		return fmt.Errorf("entity %s not found", key)
	}

	r.entities[key] = entity
	return nil
}

func (r *GenericInMemoryRegistry[T]) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.entities[id]; !exists {
		return fmt.Errorf("entity %s not found", id)
	}
	delete(r.entities, id)
	return nil
}
