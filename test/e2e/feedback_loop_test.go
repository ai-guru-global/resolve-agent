//go:build e2e

package e2e

import (
	"context"
	"testing"
	"time"

	"github.com/ai-guru-global/resolve-agent/pkg/feedback"
)

// TestFeedbackLoop_EmitAndReceive validates the end-to-end feedback cycle:
// a signal emitted by one subsystem is received by subscribers and stored
// in the ring buffer, closing the observe-orient loop.
func TestFeedbackLoop_EmitAndReceive(t *testing.T) {
	skipIfNoServer(t)

	cfg := feedback.DefaultConfig()
	collector := feedback.NewCollector(cfg)
	defer collector.Close()

	// Track received signals.
	var received []feedback.FeedbackSignal
	collector.Subscribe("*", func(_ context.Context, sig feedback.FeedbackSignal) {
		received = append(received, sig)
	})

	ctx := context.Background()

	// Simulate a workflow completion signal.
	err := collector.Emit(ctx, feedback.FeedbackSignal{
		Source:   feedback.SourceWorkflow,
		Event:    feedback.EventWorkflowComplete,
		Severity: feedback.SeverityInfo,
		Message:  "workflow executed successfully",
		Metrics:  map[string]float64{"duration_ms": 1234, "steps": 5},
		Labels:   map[string]string{"workflow_id": "wf-001"},
	})
	if err != nil {
		t.Fatalf("emit failed: %v", err)
	}

	// Simulate a retry exhausted signal.
	err = collector.Emit(ctx, feedback.FeedbackSignal{
		Source:   feedback.SourceRetry,
		Event:    feedback.EventRetryExhausted,
		Severity: feedback.SeverityError,
		Message:  "all retries failed for LLM call",
		Labels:   map[string]string{"service": "llm-provider"},
	})
	if err != nil {
		t.Fatalf("emit failed: %v", err)
	}

	// Verify signals were received.
	if len(received) != 2 {
		t.Fatalf("expected 2 signals, got %d", len(received))
	}

	// Verify ring buffer storage.
	snapshot := collector.Snapshot()
	if len(snapshot) != 2 {
		t.Fatalf("expected 2 in snapshot, got %d", len(snapshot))
	}

	// Verify aggregator stats.
	agg := feedback.NewAggregator(5 * time.Minute)
	for _, sig := range snapshot {
		agg.Record(sig)
	}
	stats := agg.Stats()
	if len(stats) != 2 {
		t.Errorf("expected 2 aggregated stat entries, got %d", len(stats))
	}
}

// TestFeedbackLoop_SubscriberFiltering validates that source-specific
// subscribers only receive matching signals.
func TestFeedbackLoop_SubscriberFiltering(t *testing.T) {
	skipIfNoServer(t)

	collector := feedback.NewCollector(feedback.DefaultConfig())
	defer collector.Close()

	var retryOnly []feedback.FeedbackSignal
	collector.Subscribe(feedback.SourceRetry, func(_ context.Context, sig feedback.FeedbackSignal) {
		retryOnly = append(retryOnly, sig)
	})

	ctx := context.Background()
	_ = collector.Emit(ctx, feedback.FeedbackSignal{Source: feedback.SourceHealth, Event: "check"})
	_ = collector.Emit(ctx, feedback.FeedbackSignal{Source: feedback.SourceRetry, Event: feedback.EventRetrySuccess})
	_ = collector.Emit(ctx, feedback.FeedbackSignal{Source: feedback.SourceWorkflow, Event: "done"})

	if len(retryOnly) != 1 {
		t.Errorf("expected 1 retry signal, got %d", len(retryOnly))
	}
}
