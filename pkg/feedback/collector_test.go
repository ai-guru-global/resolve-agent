package feedback

import (
	"context"
	"sync"
	"testing"
	"time"
)

func TestRingBuffer_PushAndSnapshot(t *testing.T) {
	rb := NewRingBuffer(3)

	for i := 0; i < 5; i++ {
		rb.Push(FeedbackSignal{
			Source: "test",
			Event:  "event",
			ID:     generateID(),
		})
	}

	snap := rb.Snapshot()
	if len(snap) != 3 {
		t.Fatalf("expected 3 signals, got %d", len(snap))
	}
	if rb.Len() != 3 {
		t.Errorf("expected Len()=3, got %d", rb.Len())
	}
}

func TestRingBuffer_Empty(t *testing.T) {
	rb := NewRingBuffer(5)
	if snap := rb.Snapshot(); snap != nil {
		t.Errorf("expected nil snapshot, got %v", snap)
	}
	if rb.Len() != 0 {
		t.Errorf("expected Len()=0, got %d", rb.Len())
	}
}

func TestRingBuffer_Clear(t *testing.T) {
	rb := NewRingBuffer(5)
	rb.Push(FeedbackSignal{Source: "x"})
	rb.Clear()
	if rb.Len() != 0 {
		t.Errorf("expected Len()=0 after clear, got %d", rb.Len())
	}
}

func TestCollector_EmitAndSubscribe(t *testing.T) {
	cfg := DefaultConfig()
	c := NewCollector(cfg)
	defer c.Close()

	var received []FeedbackSignal
	var mu sync.Mutex
	c.Subscribe(SourceRetry, func(_ context.Context, sig FeedbackSignal) {
		mu.Lock()
		received = append(received, sig)
		mu.Unlock()
	})

	ctx := context.Background()
	_ = c.Emit(ctx, FeedbackSignal{
		Source:   SourceRetry,
		Event:    EventRetryExhausted,
		Severity: SeverityError,
		Message:  "all retries failed",
	})
	_ = c.Emit(ctx, FeedbackSignal{
		Source:   SourceHealth,
		Event:    EventHealthDown,
		Severity: SeverityCritical,
		Message:  "database unreachable",
	})

	mu.Lock()
	defer mu.Unlock()
	if len(received) != 1 {
		t.Fatalf("expected 1 retry signal, got %d", len(received))
	}
	if received[0].Event != EventRetryExhausted {
		t.Errorf("expected event %q, got %q", EventRetryExhausted, received[0].Event)
	}
}

func TestCollector_WildcardSubscriber(t *testing.T) {
	c := NewCollector(DefaultConfig())
	defer c.Close()

	var count int
	var mu sync.Mutex
	c.Subscribe("*", func(_ context.Context, _ FeedbackSignal) {
		mu.Lock()
		count++
		mu.Unlock()
	})

	ctx := context.Background()
	_ = c.Emit(ctx, FeedbackSignal{Source: "a", Event: "e1"})
	_ = c.Emit(ctx, FeedbackSignal{Source: "b", Event: "e2"})

	mu.Lock()
	defer mu.Unlock()
	if count != 2 {
		t.Errorf("expected wildcard to receive 2, got %d", count)
	}
}

func TestCollector_EmitAssignsIDAndTimestamp(t *testing.T) {
	c := NewCollector(DefaultConfig())
	defer c.Close()

	var captured FeedbackSignal
	c.Subscribe("*", func(_ context.Context, sig FeedbackSignal) {
		captured = sig
	})

	_ = c.Emit(context.Background(), FeedbackSignal{Source: "test", Event: "e"})

	if captured.ID == "" {
		t.Error("expected ID to be assigned")
	}
	if captured.Timestamp.IsZero() {
		t.Error("expected timestamp to be assigned")
	}
}

func TestCollector_ClosedRejectsEmit(t *testing.T) {
	c := NewCollector(DefaultConfig())
	c.Close()

	err := c.Emit(context.Background(), FeedbackSignal{Source: "x"})
	if err == nil {
		t.Error("expected error from closed collector")
	}
}

func TestAggregator_RecordAndStats(t *testing.T) {
	agg := NewAggregator(5 * time.Minute)
	now := time.Now().UTC()

	for i := 0; i < 10; i++ {
		agg.Record(FeedbackSignal{
			Source:    SourceRetry,
			Event:     EventRetryExhausted,
			Severity:  SeverityError,
			Timestamp: now,
		})
	}
	for i := 0; i < 3; i++ {
		agg.Record(FeedbackSignal{
			Source:    SourceHealth,
			Event:     EventHealthDown,
			Severity:  SeverityCritical,
			Timestamp: now,
		})
	}

	stats := agg.Stats()
	if len(stats) != 2 {
		t.Fatalf("expected 2 stat entries, got %d", len(stats))
	}

	// Find the retry stats.
	var retryStats *AggregatedStats
	for i := range stats {
		if stats[i].Source == SourceRetry {
			retryStats = &stats[i]
			break
		}
	}
	if retryStats == nil {
		t.Fatal("retry stats not found")
	}
	if retryStats.Count != 10 {
		t.Errorf("expected count=10, got %d", retryStats.Count)
	}
	if retryStats.SeverityMax != SeverityError {
		t.Errorf("expected severity ERROR, got %s", retryStats.SeverityMax)
	}
}

func TestAggregator_Reset(t *testing.T) {
	agg := NewAggregator(time.Minute)
	agg.Record(FeedbackSignal{
		Source:    "test",
		Event:     "e",
		Timestamp: time.Now(),
	})
	agg.Reset()
	if stats := agg.Stats(); len(stats) != 0 {
		t.Errorf("expected empty stats after reset, got %d", len(stats))
	}
}

func TestSeverityString(t *testing.T) {
	tests := []struct {
		s    Severity
		want string
	}{
		{SeverityInfo, "INFO"},
		{SeverityWarn, "WARN"},
		{SeverityError, "ERROR"},
		{SeverityCritical, "CRITICAL"},
		{Severity(99), "UNKNOWN"},
	}
	for _, tt := range tests {
		if got := tt.s.String(); got != tt.want {
			t.Errorf("Severity(%d).String() = %q, want %q", tt.s, got, tt.want)
		}
	}
}

func TestSplitKey(t *testing.T) {
	parts := splitKey("health:degraded")
	if parts[0] != "health" || parts[1] != "degraded" {
		t.Errorf("splitKey = %v, want [health degraded]", parts)
	}
}
