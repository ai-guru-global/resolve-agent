package feedback

import (
	"context"
	"fmt"
	"sync"
	"time"

	"crypto/rand"
	"encoding/hex"
)

// Collector is the central feedback signal hub.
// It accepts signals from any subsystem, stores them in a ring buffer,
// and fans them out to registered subscribers and dispatchers.
type Collector struct {
	mu          sync.RWMutex
	buffer      *RingBuffer
	subscribers map[string][]SignalHandler // keyed by source filter ("*" = all)
	dispatchers []Dispatcher
	cfg         Config
	closed      bool
}

// SignalHandler is a callback invoked when a matching signal arrives.
type SignalHandler func(ctx context.Context, sig FeedbackSignal)

// Dispatcher is an output destination for feedback signals.
type Dispatcher interface {
	// Dispatch sends a signal to the external destination.
	Dispatch(ctx context.Context, sig FeedbackSignal) error
	// Name returns a human-readable dispatcher identifier.
	Name() string
}

// NewCollector creates a Collector with the given configuration.
func NewCollector(cfg Config) *Collector {
	size := cfg.RingBufferSize
	if size <= 0 {
		size = 1000
	}
	return &Collector{
		buffer:      NewRingBuffer(size),
		subscribers: make(map[string][]SignalHandler),
		cfg:         cfg,
	}
}

// Emit ingests a signal into the feedback loop.
// It assigns an ID and timestamp if missing, stores the signal,
// notifies subscribers, and dispatches to configured outputs.
func (c *Collector) Emit(ctx context.Context, sig FeedbackSignal) error {
	c.mu.RLock()
	if c.closed {
		c.mu.RUnlock()
		return fmt.Errorf("feedback collector is closed")
	}
	c.mu.RUnlock()

	// Assign ID if missing.
	if sig.ID == "" {
		sig.ID = generateID()
	}
	// Assign timestamp if zero.
	if sig.Timestamp.IsZero() {
		sig.Timestamp = time.Now().UTC()
	}

	// Store in ring buffer.
	c.buffer.Push(sig)

	// Notify subscribers.
	c.mu.RLock()
	handlers := c.subscribers[sig.Source]
	allHandlers := c.subscribers["*"]
	c.mu.RUnlock()

	for _, h := range handlers {
		h(ctx, sig)
	}
	for _, h := range allHandlers {
		h(ctx, sig)
	}

	// Dispatch to external sinks.
	c.mu.RLock()
	dispatchers := make([]Dispatcher, len(c.dispatchers))
	copy(dispatchers, c.dispatchers)
	c.mu.RUnlock()

	var firstErr error
	for _, d := range dispatchers {
		if err := d.Dispatch(ctx, sig); err != nil && firstErr == nil {
			firstErr = fmt.Errorf("dispatcher %s: %w", d.Name(), err)
		}
	}
	return firstErr
}

// Subscribe registers a handler for signals from a specific source.
// Use source="*" to receive signals from all sources.
func (c *Collector) Subscribe(source string, handler SignalHandler) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.subscribers[source] = append(c.subscribers[source], handler)
}

// AddDispatcher registers an external dispatch sink.
func (c *Collector) AddDispatcher(d Dispatcher) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.dispatchers = append(c.dispatchers, d)
}

// Snapshot returns the current ring buffer contents.
func (c *Collector) Snapshot() []FeedbackSignal {
	return c.buffer.Snapshot()
}

// Close shuts down the collector and prevents further emissions.
func (c *Collector) Close() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.closed = true
}

// generateID produces a short random hex identifier.
func generateID() string {
	b := make([]byte, 8)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
