package event

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/nats-io/nats.go"
)

// NATSBus implements the event bus using NATS JetStream.
type NATSBus struct {
	url    string
	logger *slog.Logger
	conn   *nats.Conn
	js     nats.JetStreamContext
}

// NewNATSBus creates a new NATS event bus.
func NewNATSBus(url string, logger *slog.Logger) (*NATSBus, error) {
	b := &NATSBus{
		url:    url,
		logger: logger,
	}

	if err := b.connect(); err != nil {
		return nil, fmt.Errorf("failed to connect to nats: %w", err)
	}

	b.logger.Info("NATS event bus initialized", "url", url)
	return b, nil
}

// connect establishes connection to NATS and initializes JetStream.
func (b *NATSBus) connect() error {
	// Connect to NATS
	opts := []nats.Option{
		nats.Name("ResolveAgent Event Bus"),
		nats.ReconnectWait(time.Second),
		nats.MaxReconnects(10),
	}

	conn, err := nats.Connect(b.url, opts...)
	if err != nil {
		return fmt.Errorf("failed to connect to nats: %w", err)
	}

	b.conn = conn

	// Initialize JetStream
	js, err := conn.JetStream()
	if err != nil {
		conn.Close()
		return fmt.Errorf("failed to initialize jetstream: %w", err)
	}

	b.js = js

	// Create streams if they don't exist
	if err := b.createStreams(); err != nil {
		return fmt.Errorf("failed to create streams: %w", err)
	}

	return nil
}

// createStreams creates JetStream streams.
func (b *NATSBus) createStreams() error {
	streams := []string{
		"AGENTS",
		"SKILLS",
		"WORKFLOWS",
		"EXECUTIONS",
	}

	for _, stream := range streams {
		_, err := b.js.AddStream(&nats.StreamConfig{
			Name:     stream,
			Subjects: []string{fmt.Sprintf("%s.*", stream)},
			MaxAge:   24 * time.Hour,
			Storage:  nats.FileStorage,
		})
		if err != nil && err != nats.ErrStreamNameAlreadyInUse {
			return fmt.Errorf("failed to create stream %s: %w", stream, err)
		}
		if err == nats.ErrStreamNameAlreadyInUse {
			b.logger.Debug("Stream already exists", "stream", stream)
		} else {
			b.logger.Info("Created stream", "stream", stream)
		}
	}

	return nil
}

// Publish sends an event to NATS.
func (b *NATSBus) Publish(ctx context.Context, event Event) error {
	subject := fmt.Sprintf("%s.%s", event.Type, event.Subject)

	// Serialize event data
	data, err := json.Marshal(event.Data)
	if err != nil {
		return fmt.Errorf("failed to marshal event data: %w", err)
	}

	// Publish with JetStream
	_, err = b.js.Publish(subject, data)
	if err != nil {
		return fmt.Errorf("failed to publish event: %w", err)
	}

	b.logger.Debug("Published event", "type", event.Type, "subject", subject)
	return nil
}

// PublishData sends event data directly.
func (b *NATSBus) PublishData(eventType string, subject string, data interface{}) error {
	fullSubject := fmt.Sprintf("%s.%s", eventType, subject)

	payload, err := json.Marshal(data)
	if err != nil {
		return fmt.Errorf("failed to marshal data: %w", err)
	}

	_, err = b.js.Publish(fullSubject, payload)
	if err != nil {
		return fmt.Errorf("failed to publish: %w", err)
	}

	return nil
}

// Subscribe registers an event handler.
func (b *NATSBus) Subscribe(ctx context.Context, eventType string, handler func(Event)) error {
	subject := fmt.Sprintf("%s.*", eventType)
	consumerName := fmt.Sprintf("%s-consumer", eventType)

	sub, err := b.js.Subscribe(subject, func(msg *nats.Msg) {
		var data map[string]interface{}
		if err := json.Unmarshal(msg.Data, &data); err != nil {
			b.logger.Error("Failed to unmarshal event data", "error", err)
			msg.Nak()
			return
		}

		// Extract event type and subject from message subject
		// Subject format: TYPE.ID
		event := Event{
			Type:    eventType,
			Subject: msg.Subject[len(eventType)+1:], // Remove "TYPE." prefix
			Data:    data,
		}

		// Call handler
		handler(event)

		// Acknowledge message
		if err := msg.Ack(); err != nil {
			b.logger.Error("Failed to ack message", "error", err)
		}
	}, nats.Durable(consumerName), nats.ManualAck())

	if err != nil {
		return fmt.Errorf("failed to subscribe: %w", err)
	}

	b.logger.Info("Subscribed to events", "type", eventType, "subject", subject)

	// Keep subscription alive until context is cancelled
	go func() {
		<-ctx.Done()
		sub.Unsubscribe()
	}()

	return nil
}

// SubscribeSync creates a synchronous subscription.
func (b *NATSBus) SubscribeSync(eventType string) (*nats.Subscription, error) {
	subject := fmt.Sprintf("%s.*", eventType)
	return b.js.SubscribeSync(subject)
}

// Close disconnects from NATS.
func (b *NATSBus) Close() error {
	if b.conn != nil {
		b.conn.Close()
		b.logger.Info("NATS connection closed")
	}
	return nil
}

// Health checks the NATS connection.
func (b *NATSBus) Health() error {
	if b.conn == nil || !b.conn.IsConnected() {
		return fmt.Errorf("not connected to nats")
	}
	return nil
}
