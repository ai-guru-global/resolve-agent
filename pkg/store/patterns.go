// Package store provides persistence abstractions for the ResolveAgent platform.
//
// Loop Engineering: Store Pattern
// ================================
// This file defines the canonical CRUD + pagination + filtering pattern
// that all store implementations (Postgres, Redis, in-memory) must follow.
// It ensures consistency across the data access layer and reduces boilerplate.
package store

import (
	"context"
	"time"
)

// CRUDStore is the generic persistence interface for all entity types.
// Concrete stores (PostgresStore, RedisStore, MemoryStore) implement this
// for their respective backends.
type CRUDStore[T any] interface {
	// Create persists a new entity. Returns error if the ID already exists.
	Create(ctx context.Context, entity *T) error
	// GetByID retrieves a single entity by its unique identifier.
	GetByID(ctx context.Context, id string) (*T, error)
	// List returns a paginated, filtered slice of entities.
	List(ctx context.Context, opts QueryOptions) ([]*T, int, error)
	// Update replaces an existing entity. Returns error if not found.
	Update(ctx context.Context, entity *T) error
	// Delete removes an entity by ID. Returns error if not found.
	Delete(ctx context.Context, id string) error
}

// QueryOptions defines pagination and filtering for store queries.
type QueryOptions struct {
	// Offset is the number of records to skip (for pagination).
	Offset int
	// Limit is the maximum number of records to return.
	Limit int
	// OrderBy is the field to sort by (prefix with "-" for descending).
	OrderBy string
	// Filters holds key-value pairs for equality filtering.
	Filters map[string]string
	// Search is a free-text search term (backend-dependent).
	Search string
}

// DefaultQueryOptions returns sensible defaults.
func DefaultQueryOptions() QueryOptions {
	return QueryOptions{
		Limit:   20,
		OrderBy: "-created_at",
	}
}

// Timestamped is a mixin for entities that track creation and update times.
// Stores should automatically set these fields.
type Timestamped struct {
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// Versioned is a mixin for entities with optimistic concurrency control.
// Stores should increment Version on each update and reject stale writes.
type Versioned struct {
	Version int64 `json:"version"`
}

// SoftDeletable is a mixin for entities that support soft deletion.
// Stores should filter out soft-deleted records from List and Get queries.
type SoftDeletable struct {
	DeletedAt *time.Time `json:"deleted_at,omitempty"`
}
