package feedback

import (
	"sync"
	"sync/atomic"
)

// =============================================================================
// Loop Engineering: Metrics Exporter
// =============================================================================
// Converts feedback signals into counter/gauge metrics that can be scraped
// by Prometheus or other monitoring systems. This closes the
// "collect -> aggregate -> export -> alert" observability loop.
// =============================================================================

// MetricsCollector tracks feedback signal counts and rates.
// It is safe for concurrent use and designed for high-throughput signal ingestion.
type MetricsCollector struct {
	mu       sync.RWMutex
	counters map[string]*atomic.Int64 // "source:event:severity" -> count
	gauges   map[string]*atomic.Int64 // "source:open_circuits" -> current value
}

// NewMetricsCollector creates a new metrics tracker.
func NewMetricsCollector() *MetricsCollector {
	return &MetricsCollector{
		counters: make(map[string]*atomic.Int64),
		gauges:   make(map[string]*atomic.Int64),
	}
}

// Record increments the counter for a given signal.
func (m *MetricsCollector) Record(sig FeedbackSignal) {
	key := sig.Source + ":" + sig.Event + ":" + sig.Severity.String()
	m.mu.Lock()
	counter, ok := m.counters[key]
	if !ok {
		counter = &atomic.Int64{}
		m.counters[key] = counter
	}
	m.mu.Unlock()
	counter.Add(1)
}

// SetGauge sets a gauge value (e.g., open circuit breakers count).
func (m *MetricsCollector) SetGauge(name string, value int64) {
	m.mu.Lock()
	gauge, ok := m.gauges[name]
	if !ok {
		gauge = &atomic.Int64{}
		m.gauges[name] = gauge
	}
	m.mu.Unlock()
	gauge.Store(value)
}

// Counter returns the current count for a signal key.
func (m *MetricsCollector) Counter(source, event, severity string) int64 {
	key := source + ":" + event + ":" + severity
	m.mu.RLock()
	counter, ok := m.counters[key]
	m.mu.RUnlock()
	if !ok {
		return 0
	}
	return counter.Load()
}

// Gauge returns the current gauge value.
func (m *MetricsCollector) Gauge(name string) int64 {
	m.mu.RLock()
	gauge, ok := m.gauges[name]
	m.mu.RUnlock()
	if !ok {
		return 0
	}
	return gauge.Load()
}

// Snapshot returns all counter keys and their current values.
func (m *MetricsCollector) Snapshot() map[string]int64 {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make(map[string]int64, len(m.counters))
	for k, v := range m.counters {
		result[k] = v.Load()
	}
	return result
}

// GaugeSnapshot returns all gauge keys and their current values.
func (m *MetricsCollector) GaugeSnapshot() map[string]int64 {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make(map[string]int64, len(m.gauges))
	for k, v := range m.gauges {
		result[k] = v.Load()
	}
	return result
}
