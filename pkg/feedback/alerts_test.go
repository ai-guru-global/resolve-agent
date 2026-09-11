package feedback

import (
	"context"
	"io"
	"log/slog"
	"sync"
	"testing"
	"time"
)

func newTestAlertEngine() (*AlertEngine, *MetricsCollector, *Aggregator) {
	metrics := NewMetricsCollector()
	agg := NewAggregator(5 * time.Minute)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return NewAlertEngine(metrics, agg, logger), metrics, agg
}

func recordSignals(agg *Aggregator, n int) {
	for i := 0; i < n; i++ {
		agg.Record(&Signal{
			ID:        generateID(),
			Source:    SourceRetry,
			Event:     EventRetryExhausted,
			Severity:  SeverityError,
			Timestamp: time.Now(),
		})
	}
}

func TestAlertEngine_AggregatedStatsCondition(t *testing.T) {
	engine, _, agg := newTestAlertEngine()

	var fired []string
	var mu sync.Mutex
	engine.SetHandler(func(_ context.Context, rule AlertRule, _ float64) {
		mu.Lock()
		fired = append(fired, rule.Name)
		mu.Unlock()
	})

	engine.AddRule(AlertRule{
		Name:      "retry_storm",
		Condition: "retry_exhausted_total > 50",
		Action:    ActionCircuitBreak,
	})

	// Below threshold: no fire.
	recordSignals(agg, 50)
	engine.Evaluate(context.Background())
	mu.Lock()
	if len(fired) != 0 {
		t.Errorf("expected no alerts below threshold, got %v", fired)
	}
	mu.Unlock()

	// Above threshold: the aggregated metric retry_exhausted_total fires.
	recordSignals(agg, 1)
	engine.Evaluate(context.Background())
	mu.Lock()
	if len(fired) != 1 || fired[0] != "retry_storm" {
		t.Errorf("expected retry_storm to fire, got %v", fired)
	}
	mu.Unlock()
}

func TestAlertEngine_GaugeInCondition(t *testing.T) {
	engine, metrics, _ := newTestAlertEngine()

	fired := 0
	engine.SetHandler(func(_ context.Context, _ AlertRule, _ float64) {
		fired++
	})
	engine.AddRule(AlertRule{
		Name:      "open_circuits",
		Condition: "open_circuits >= 3",
		Action:    ActionNotify,
	})

	metrics.SetGauge("open_circuits", 3)
	engine.Evaluate(context.Background())
	if fired != 1 {
		t.Errorf("expected gauge-based alert to fire once, got %d", fired)
	}
}

func TestAlertEngine_MissingMetricVsZero(t *testing.T) {
	engine, metrics, _ := newTestAlertEngine()

	var fired []string
	engine.SetHandler(func(_ context.Context, rule AlertRule, _ float64) {
		fired = append(fired, rule.Name)
	})
	engine.AddRule(AlertRule{
		Name:      "missing_metric",
		Condition: "nonexistent_metric < 5",
		Action:    ActionNotify,
	})
	engine.AddRule(AlertRule{
		Name:      "zero_gauge",
		Condition: "zero_gauge < 5",
		Action:    ActionNotify,
	})

	metrics.SetGauge("zero_gauge", 0)
	engine.Evaluate(context.Background())

	// A missing metric must not trigger; a metric present with value 0 must.
	if len(fired) != 1 || fired[0] != "zero_gauge" {
		t.Errorf("expected only zero_gauge to fire, got %v", fired)
	}
}

func TestAlertEngine_Cooldown(t *testing.T) {
	engine, _, agg := newTestAlertEngine()

	fired := 0
	engine.SetHandler(func(_ context.Context, _ AlertRule, _ float64) {
		fired++
	})
	engine.AddRule(AlertRule{
		Name:      "retry_storm",
		Condition: "retry_exhausted_total > 1",
		Action:    ActionNotify,
	})

	recordSignals(agg, 2)

	// Condition holds across two evaluations: fires only once.
	engine.Evaluate(context.Background())
	engine.Evaluate(context.Background())
	if fired != 1 {
		t.Errorf("expected alert to fire once while condition holds, got %d", fired)
	}

	// Condition clears: cooldown state resets.
	agg.Reset()
	engine.Evaluate(context.Background())
	if fired != 1 {
		t.Errorf("expected no fire after condition cleared, got %d", fired)
	}

	// Condition holds again: fires again.
	recordSignals(agg, 2)
	engine.Evaluate(context.Background())
	if fired != 2 {
		t.Errorf("expected alert to fire again after reset, got %d", fired)
	}
}

func TestAlertEngine_StopIdempotent(t *testing.T) {
	engine, _, _ := newTestAlertEngine()
	engine.Stop()
	engine.Stop() // must not panic
}

func TestAlertEngine_StartStop(t *testing.T) {
	engine, _, _ := newTestAlertEngine()
	engine.SetInterval(10 * time.Millisecond)

	fired := make(chan struct{})
	engine.SetHandler(func(_ context.Context, _ AlertRule, _ float64) {
		select {
		case fired <- struct{}{}:
		default:
		}
	})

	engine.Start(context.Background())
	engine.Stop()
	engine.Stop()
}
