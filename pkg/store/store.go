package store

import (
	"context"
)

// Store defines the data persistence interface.
type Store interface {
	// Health checks the store connection.
	Health(ctx context.Context) error
	// Close releases store resources.
	Close() error
}
