package feedback

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"
)

// =============================================================================
// Loop Engineering: Automated Alert Engine
// =============================================================================
// Evaluates alert rules against aggregated feedback statistics.
// When a rule fires, it triggers configured actions (notify, circuit_break),
// closing the "observe -> detect -> act" observability loop.
// =============================================================================

// AlertAction defines what happens when an alert fires.
type AlertAction string

const (
	// ActionNotify logs the alert and optionally dispatches to webhooks.
	ActionNotify AlertAction = "notify"
	// ActionCircuitBreak triggers circuit breaker activation.
	ActionCircuitBreak AlertAction = "circuit_break"
)

// AlertRule defines a condition that triggers an alert.
type AlertRule struct {
	// Name is the unique identifier for this alert rule.
	Name string `json:"name"`
	// Condition is a simple expression (e.g., "retry_exhausted_total > 50").
	Condition string `json:"condition"`
	// Window is the evaluation window duration.
	Window time.Duration `json:"window"`
	// Action is what to do when the alert fires.
	Action AlertAction `json:"action"`
}

// AlertHandler is called when an alert fires.
type AlertHandler func(ctx context.Context, rule AlertRule, value float64)

// AlertEngine evaluates rules against feedback metrics periodically.
type AlertEngine struct {
	mu       sync.RWMutex
	rules    []AlertRule
	metrics  *MetricsCollector
	agg      *Aggregator
	handler  AlertHandler
	logger   *slog.Logger
	interval time.Duration
	stopCh   chan struct{}
}

// NewAlertEngine creates an alert engine with the given configuration.
func NewAlertEngine(
	metrics *MetricsCollector,
	agg *Aggregator,
	logger *slog.Logger,
) *AlertEngine {
	return &AlertEngine{
		metrics:  metrics,
		agg:      agg,
		logger:   logger,
		interval: 30 * time.Second,
		stopCh:   make(chan struct{}),
	}
}

// AddRule registers an alert rule.
func (e *AlertEngine) AddRule(rule AlertRule) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.rules = append(e.rules, rule)
}

// SetHandler sets the callback for when alerts fire.
func (e *AlertEngine) SetHandler(h AlertHandler) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.handler = h
}

// SetInterval sets the evaluation interval.
func (e *AlertEngine) SetInterval(d time.Duration) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.interval = d
}

// Start begins periodic alert evaluation.
func (e *AlertEngine) Start(ctx context.Context) {
	go func() {
		e.mu.RLock()
		interval := e.interval
		e.mu.RUnlock()

		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				e.Evaluate(ctx)
			case <-e.stopCh:
				return
			case <-ctx.Done():
				return
			}
		}
	}()
}

// Stop halts the alert engine.
func (e *AlertEngine) Stop() {
	close(e.stopCh)
}

// Evaluate checks all rules against current metrics.
func (e *AlertEngine) Evaluate(ctx context.Context) {
	e.mu.RLock()
	rules := make([]AlertRule, len(e.rules))
	copy(rules, e.rules)
	handler := e.handler
	e.mu.RUnlock()

	stats := e.agg.Stats()
	snapshot := e.metrics.Snapshot()

	for _, rule := range rules {
		value := e.resolveCondition(rule.Condition, stats, snapshot)
		if value < 0 {
			// Condition is satisfied (resolveCondition returns -1 for triggered).
			e.logger.Warn("alert fired",
				"rule", rule.Name,
				"condition", rule.Condition,
				"action", string(rule.Action),
			)
			if handler != nil {
				handler(ctx, rule, value)
			}
		}
	}
}

// resolveCondition is a simplified condition evaluator.
// Returns -1 if the condition is met, or the current value otherwise.
// Supports: "metric_name > threshold", "metric_name < threshold"
func (e *AlertEngine) resolveCondition(condition string, stats []AggregatedStats, snapshot map[string]int64) float64 {
	parts := strings.Fields(condition)
	if len(parts) != 3 {
		return 0
	}

	metricName := parts[0]
	operator := parts[1]

	var threshold float64
	if _, err := fmt.Sscanf(parts[2], "%f", &threshold); err != nil {
		return 0
	}

	// Resolve metric value.
	var value float64
	if v, ok := snapshot[metricName]; ok {
		value = float64(v)
	}

	switch operator {
	case ">":
		if value > threshold {
			return -1
		}
	case "<":
		if value < threshold {
			return -1
		}
	case ">=":
		if value >= threshold {
			return -1
		}
	case "<=":
		if value <= threshold {
			return -1
		}
	case "==":
		if value == threshold {
			return -1
		}
	}
	return value
}
