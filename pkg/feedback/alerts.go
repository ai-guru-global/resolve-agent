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
	stopOnce sync.Once
	fired    map[string]bool // rules currently fired; reset once the condition clears
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
		fired:    make(map[string]bool),
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

// SetInterval sets the evaluation interval. It only takes effect when called
// before Start; the running ticker is not reset.
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

// Stop halts the alert engine. It is safe to call multiple times.
func (e *AlertEngine) Stop() {
	e.stopOnce.Do(func() {
		close(e.stopCh)
	})
}

// Evaluate checks all rules against current metrics. A rule whose condition
// keeps holding fires only once until the condition clears (cooldown).
func (e *AlertEngine) Evaluate(ctx context.Context) {
	e.mu.RLock()
	rules := make([]AlertRule, len(e.rules))
	copy(rules, e.rules)
	handler := e.handler
	e.mu.RUnlock()

	values := e.evalContext()

	for _, rule := range rules {
		value, triggered := e.resolveCondition(rule.Condition, values)

		e.mu.Lock()
		alreadyFired := e.fired[rule.Name]
		if triggered {
			e.fired[rule.Name] = true
		} else {
			delete(e.fired, rule.Name)
		}
		e.mu.Unlock()

		if !triggered || alreadyFired {
			continue
		}
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

// evalContext flattens counters, gauges, and aggregated stats into a single
// metric namespace for condition evaluation. Aggregated stats are addressable
// as "<event>_total", "<event>_rate_per_minute", and "<event>_severity_max",
// with dots in the event name replaced by underscores (e.g. the
// "retry.exhausted" event count is "retry_exhausted_total").
func (e *AlertEngine) evalContext() map[string]float64 {
	values := make(map[string]float64)
	for k, v := range e.metrics.Snapshot() {
		values[k] = float64(v)
	}
	for k, v := range e.metrics.GaugeSnapshot() {
		values[k] = float64(v)
	}
	if e.agg != nil {
		for _, s := range e.agg.Stats() {
			name := strings.ReplaceAll(s.Event, ".", "_")
			values[name+"_total"] = float64(s.Count)
			values[name+"_rate_per_minute"] = s.RatePerMinute
			values[name+"_severity_max"] = float64(s.SeverityMax)
		}
	}
	return values
}

// resolveCondition is a simplified condition evaluator.
// It returns the current metric value and whether the condition is met.
// A metric missing from the evaluation context never triggers the condition.
// Supports: "metric_name > threshold", "metric_name < threshold", ">=",
// "<=", "==".
func (e *AlertEngine) resolveCondition(condition string, values map[string]float64) (float64, bool) {
	parts := strings.Fields(condition)
	if len(parts) != 3 {
		return 0, false
	}

	metricName := parts[0]
	operator := parts[1]

	var threshold float64
	if _, err := fmt.Sscanf(parts[2], "%f", &threshold); err != nil {
		return 0, false
	}

	// Resolve metric value. A missing metric is distinct from a zero value:
	// it does not trigger the condition.
	value, ok := values[metricName]
	if !ok {
		e.logger.Debug("alert metric missing, condition not triggered",
			"metric", metricName,
			"condition", condition,
		)
		return 0, false
	}

	switch operator {
	case ">":
		return value, value > threshold
	case "<":
		return value, value < threshold
	case ">=":
		return value, value >= threshold
	case "<=":
		return value, value <= threshold
	case "==":
		return value, value == threshold
	}
	return value, false
}
