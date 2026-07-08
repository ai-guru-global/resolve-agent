package feedback

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

// --- Log Dispatcher ---

// LogDispatcher writes feedback signals to the structured logger.
type LogDispatcher struct {
	logger *slog.Logger
	level  slog.Level
}

// NewLogDispatcher creates a dispatcher that writes to the given logger.
func NewLogDispatcher(logger *slog.Logger, level string) *LogDispatcher {
	lvl := slog.LevelInfo
	switch level {
	case "debug":
		lvl = slog.LevelDebug
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	}
	return &LogDispatcher{logger: logger, level: lvl}
}

// Dispatch logs the signal at the configured level.
func (d *LogDispatcher) Dispatch(_ context.Context, sig FeedbackSignal) error {
	d.logger.Log(context.Background(), d.level, "feedback signal",
		"id", sig.ID,
		"source", sig.Source,
		"event", sig.Event,
		"severity", sig.Severity.String(),
		"message", sig.Message,
	)
	return nil
}

// Name implements Dispatcher.
func (d *LogDispatcher) Name() string { return "log" }

// --- Webhook Dispatcher ---

// WebhookDispatcher sends signals as JSON POST requests to an HTTP endpoint.
type WebhookDispatcher struct {
	url    string
	client *http.Client
}

// NewWebhookDispatcher creates a dispatcher targeting the given URL.
func NewWebhookDispatcher(url string) *WebhookDispatcher {
	return &WebhookDispatcher{
		url: url,
		client: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

// Dispatch POSTs the signal as JSON.
func (d *WebhookDispatcher) Dispatch(ctx context.Context, sig FeedbackSignal) error {
	body, err := json.Marshal(sig)
	if err != nil {
		return fmt.Errorf("marshal signal: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, d.url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := d.client.Do(req)
	if err != nil {
		return fmt.Errorf("webhook dispatch: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("webhook returned status %d", resp.StatusCode)
	}
	return nil
}

// Name implements Dispatcher.
func (d *WebhookDispatcher) Name() string { return "webhook" }

// --- NATS Dispatcher (interface stub, requires NATS connection at runtime) ---

// NATSPublisher is the interface for publishing messages to NATS.
// This decouples the feedback package from the concrete NATS client.
type NATSPublisher interface {
	Publish(subject string, data []byte) error
}

// NATSDispatcher publishes signals to a NATS subject.
type NATSDispatcher struct {
	conn    NATSPublisher
	subject string
}

// NewNATSDispatcher creates a NATS dispatcher with the given connection and subject.
func NewNATSDispatcher(conn NATSPublisher, subject string) *NATSDispatcher {
	return &NATSDispatcher{conn: conn, subject: subject}
}

// Dispatch publishes the signal as JSON to the configured NATS subject.
func (d *NATSDispatcher) Dispatch(_ context.Context, sig FeedbackSignal) error {
	data, err := json.Marshal(sig)
	if err != nil {
		return fmt.Errorf("marshal signal: %w", err)
	}
	if err := d.conn.Publish(d.subject, data); err != nil {
		return fmt.Errorf("nats publish: %w", err)
	}
	return nil
}

// Name implements Dispatcher.
func (d *NATSDispatcher) Name() string { return "nats" }
