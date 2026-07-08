// Package feedback implements the Loop Engineering feedback cycle —
// a continuous signal collection, aggregation, and dispatch subsystem
// that closes the observe-orient-decide-act loop across all
// ResolveAgent components (health, retry, workflow, telemetry).
package feedback

import (
	"time"
)

// Severity represents the urgency level of a feedback signal.
type Severity int

const (
	// SeverityInfo indicates a normal operational event.
	SeverityInfo Severity = iota
	// SeverityWarn indicates a degraded but non-critical condition.
	SeverityWarn
	// SeverityError indicates a failure that requires attention.
	SeverityError
	// SeverityCritical indicates a severe failure requiring immediate action.
	SeverityCritical
)

// String returns the human-readable name of the severity.
func (s Severity) String() string {
	switch s {
	case SeverityInfo:
		return "INFO"
	case SeverityWarn:
		return "WARN"
	case SeverityError:
		return "ERROR"
	case SeverityCritical:
		return "CRITICAL"
	default:
		return "UNKNOWN"
	}
}

// Well-known signal sources.
const (
	SourceHealth     = "health"
	SourceRetry      = "retry"
	SourceWorkflow   = "workflow"
	SourceTelemetry  = "telemetry"
	SourceSelector   = "selector"
	SourceSkill      = "skill"
	SourceCircuitBrk = "circuit_breaker"
)

// Well-known signal event types.
const (
	EventRetryExhausted    = "retry.exhausted"
	EventRetrySuccess      = "retry.success"
	EventHealthDegraded    = "health.degraded"
	EventHealthDown        = "health.down"
	EventHealthRecovered   = "health.recovered"
	EventWorkflowComplete  = "workflow.complete"
	EventWorkflowFailed    = "workflow.failed"
	EventSelectorFallback  = "selector.fallback"
	EventCircuitBreakOpen  = "circuit_breaker.open"
	EventCircuitBreakHalf  = "circuit_breaker.half_open"
	EventCircuitBreakClose = "circuit_breaker.close"
)

// FeedbackSignal is the atomic unit of the feedback loop.
// Every subsystem emits signals; the aggregator consumes and dispatches them.
type FeedbackSignal struct {
	// ID is a unique identifier for deduplication.
	ID string `json:"id"`
	// Source identifies the emitting subsystem.
	Source string `json:"source"`
	// Event is the specific event type within the source.
	Event string `json:"event"`
	// Severity indicates the urgency level.
	Severity Severity `json:"severity"`
	// Timestamp is when the signal was generated.
	Timestamp time.Time `json:"timestamp"`
	// Metrics holds numeric measurements associated with the signal.
	Metrics map[string]float64 `json:"metrics,omitempty"`
	// Labels holds string metadata for filtering and grouping.
	Labels map[string]string `json:"labels,omitempty"`
	// Message is a human-readable description of the event.
	Message string `json:"message"`
	// CorrelationID links related signals across subsystems (e.g., same request).
	CorrelationID string `json:"correlation_id,omitempty"`
}

// AggregatedStats holds windowed statistics for a signal source+event pair.
type AggregatedStats struct {
	Source    string    `json:"source"`
	Event     string    `json:"event"`
	Count     int64     `json:"count"`
	FirstSeen time.Time `json:"first_seen"`
	LastSeen  time.Time `json:"last_seen"`
	// RatePerMinute is the event rate computed over the aggregation window.
	RatePerMinute float64 `json:"rate_per_minute"`
	// SeverityMax is the highest severity observed in the window.
	SeverityMax Severity `json:"severity_max"`
}

// Config configures the feedback subsystem.
type Config struct {
	// Enabled turns the feedback loop on or off.
	Enabled bool `json:"enabled" yaml:"enabled"`
	// RingBufferSize is the maximum number of signals kept in memory.
	RingBufferSize int `json:"ring_buffer_size" yaml:"ring_buffer_size"`
	// AggregationWindow is the sliding window duration for stats computation.
	AggregationWindow time.Duration `json:"aggregation_window" yaml:"aggregation_window"`
	// Dispatch configures signal output destinations.
	Dispatch DispatchConfig `json:"dispatch" yaml:"dispatch"`
}

// DispatchConfig configures where aggregated signals are sent.
type DispatchConfig struct {
	Webhook WebhookDispatch `json:"webhook" yaml:"webhook"`
	NATS    NATSDispatch    `json:"nats" yaml:"nats"`
	Log     LogDispatch     `json:"log" yaml:"log"`
}

// WebhookDispatch sends signals to an HTTP endpoint.
type WebhookDispatch struct {
	Enabled bool   `json:"enabled" yaml:"enabled"`
	URL     string `json:"url" yaml:"url"`
}

// NATSDispatch publishes signals to a NATS subject.
type NATSDispatch struct {
	Enabled bool   `json:"enabled" yaml:"enabled"`
	Subject string `json:"subject" yaml:"subject"`
}

// LogDispatch writes signals to the structured logger.
type LogDispatch struct {
	Enabled bool   `json:"enabled" yaml:"enabled"`
	Level   string `json:"level" yaml:"level"`
}

// DefaultConfig returns a sensible default configuration.
func DefaultConfig() Config {
	return Config{
		Enabled:           true,
		RingBufferSize:    1000,
		AggregationWindow: 5 * time.Minute,
		Dispatch: DispatchConfig{
			Log: LogDispatch{Enabled: true, Level: "info"},
		},
	}
}
