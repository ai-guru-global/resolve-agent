package event

import (
	"context"
	"testing"
)

func TestEvent(t *testing.T) {
	e := Event{
		Type:    "agent.created",
		Subject: "agent-123",
		Data:    map[string]any{"name": "test-agent"},
	}

	if e.Type != "agent.created" {
		t.Errorf("expected type 'agent.created', got %q", e.Type)
	}
	if e.Subject != "agent-123" {
		t.Errorf("expected subject 'agent-123', got %q", e.Subject)
	}
	if len(e.Data) != 1 {
		t.Errorf("expected 1 data field, got %d", len(e.Data))
	}
}

func TestBusInterface(t *testing.T) {
	// Verify that a mock implementation satisfies the interface
	var _ Bus = (*mockBus)(nil)
}

type mockBus struct{}

func (m *mockBus) Publish(ctx context.Context, event Event) error { return nil }
func (m *mockBus) Subscribe(ctx context.Context, eventType string, handler func(Event)) error {
	return nil
}
func (m *mockBus) Close() error { return nil }
