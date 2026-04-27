package store

import (
	"context"
	"errors"
	"testing"
)

// mockStore is a minimal implementation of Store for testing.
type mockStore struct {
	healthy bool
	closed  bool
}

func (m *mockStore) Health(ctx context.Context) error {
	if !m.healthy {
		return errors.New("unhealthy")
	}
	return nil
}

func (m *mockStore) Close() error {
	m.closed = true
	return nil
}

func TestStoreInterface(t *testing.T) {
	var _ Store = (*mockStore)(nil)
}

func TestMockStore_Health(t *testing.T) {
	ctx := context.Background()

	s := &mockStore{healthy: true}
	if err := s.Health(ctx); err != nil {
		t.Errorf("expected healthy store, got error: %v", err)
	}

	s.healthy = false
	if err := s.Health(ctx); err == nil {
		t.Error("expected error for unhealthy store")
	}
}

func TestMockStore_Close(t *testing.T) {
	s := &mockStore{healthy: true}
	if err := s.Close(); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if !s.closed {
		t.Error("expected store to be closed")
	}
}
