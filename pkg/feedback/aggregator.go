package feedback

import (
	"sync"
	"time"
)

// Aggregator computes sliding-window statistics over feedback signals.
// It groups signals by (source, event) and maintains counts, rates,
// and max-severity within the configured window.
type Aggregator struct {
	mu     sync.RWMutex
	window time.Duration
	// stats keyed by "source:event"
	stats map[string]*bucket
}

// bucket holds accumulation state for one (source, event) pair.
type bucket struct {
	count       int64
	firstSeen   time.Time
	lastSeen    time.Time
	severityMax Severity
	entries     []timedEntry // for sliding window expiry
}

// timedEntry records a single signal's timestamp and severity within a bucket.
type timedEntry struct {
	ts       time.Time
	severity Severity
}

// NewAggregator creates an Aggregator with the given window duration.
func NewAggregator(window time.Duration) *Aggregator {
	if window <= 0 {
		window = 5 * time.Minute
	}
	return &Aggregator{
		window: window,
		stats:  make(map[string]*bucket),
	}
}

// Record adds a signal to the aggregation window.
func (a *Aggregator) Record(sig FeedbackSignal) {
	key := sig.Source + ":" + sig.Event

	a.mu.Lock()
	defer a.mu.Unlock()

	b, ok := a.stats[key]
	if !ok {
		b = &bucket{firstSeen: sig.Timestamp}
		a.stats[key] = b
	}

	b.count++
	b.lastSeen = sig.Timestamp
	if sig.Severity > b.severityMax {
		b.severityMax = sig.Severity
	}
	b.entries = append(b.entries, timedEntry{ts: sig.Timestamp, severity: sig.Severity})
}

// Stats returns a snapshot of all aggregated statistics,
// pruning entries that have fallen outside the sliding window.
func (a *Aggregator) Stats() []AggregatedStats {
	now := time.Now().UTC()
	cutoff := now.Add(-a.window)

	a.mu.Lock()
	defer a.mu.Unlock()

	result := make([]AggregatedStats, 0, len(a.stats))
	for key, b := range a.stats {
		// Prune expired entries.
		a.pruneBucket(b, cutoff)
		if len(b.entries) == 0 {
			delete(a.stats, key)
			continue
		}

		windowMinutes := a.window.Minutes()
		if windowMinutes <= 0 {
			windowMinutes = 1
		}

		parts := splitKey(key)
		result = append(result, AggregatedStats{
			Source:        parts[0],
			Event:         parts[1],
			Count:         int64(len(b.entries)),
			FirstSeen:     b.entries[0].ts,
			LastSeen:      b.entries[len(b.entries)-1].ts,
			RatePerMinute: float64(len(b.entries)) / windowMinutes,
			SeverityMax:   b.severityMax,
		})
	}
	return result
}

// pruneBucket removes entries older than cutoff and recomputes max severity.
func (a *Aggregator) pruneBucket(b *bucket, cutoff time.Time) {
	idx := 0
	for idx < len(b.entries) && b.entries[idx].ts.Before(cutoff) {
		idx++
	}
	if idx == 0 {
		return
	}
	b.entries = b.entries[idx:]
	// Recompute max severity from remaining entries.
	b.severityMax = SeverityInfo
	for _, e := range b.entries {
		if e.severity > b.severityMax {
			b.severityMax = e.severity
		}
	}
}

// Reset clears all aggregated state.
func (a *Aggregator) Reset() {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.stats = make(map[string]*bucket)
}

// splitKey splits "source:event" into [source, event].
func splitKey(key string) [2]string {
	for i := 0; i < len(key); i++ {
		if key[i] == ':' {
			return [2]string{key[:i], key[i+1:]}
		}
	}
	return [2]string{key, ""}
}
