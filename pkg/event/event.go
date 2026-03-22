package event

import (
	"context"
)

// Event represents a system event.
type Event struct {
	Type    string         `json:"type"`
	Subject string         `json:"subject"`
	Data    map[string]any `json:"data"`
}

// Bus defines the event publishing and subscription interface.
type Bus interface {
	// Publish sends an event to the bus.
	Publish(ctx context.Context, event Event) error
	// Subscribe registers a handler for events of a given type.
	Subscribe(ctx context.Context, eventType string, handler func(Event)) error
	// Close releases bus resources.
	Close() error
}
