package feedback

import (
	"sync"
)

// RingBuffer is a thread-safe circular buffer for FeedbackSignal storage.
// It provides a fixed-size sliding window over the most recent signals,
// which is the core data structure for the feedback loop's observe phase.
type RingBuffer struct {
	mu   sync.RWMutex
	buf  []FeedbackSignal
	cap  int
	head int // next write position
	size int // current number of elements
}

// NewRingBuffer creates a ring buffer with the given capacity.
func NewRingBuffer(capacity int) *RingBuffer {
	if capacity <= 0 {
		capacity = 64
	}
	return &RingBuffer{
		buf: make([]FeedbackSignal, capacity),
		cap: capacity,
	}
}

// Push adds a signal to the buffer, overwriting the oldest if full.
func (rb *RingBuffer) Push(sig FeedbackSignal) {
	rb.mu.Lock()
	defer rb.mu.Unlock()

	rb.buf[rb.head] = sig
	rb.head = (rb.head + 1) % rb.cap
	if rb.size < rb.cap {
		rb.size++
	}
}

// Snapshot returns a copy of all signals currently in the buffer,
// ordered from oldest to newest.
func (rb *RingBuffer) Snapshot() []FeedbackSignal {
	rb.mu.RLock()
	defer rb.mu.RUnlock()

	if rb.size == 0 {
		return nil
	}

	out := make([]FeedbackSignal, rb.size)
	start := (rb.head - rb.size + rb.cap) % rb.cap
	for i := 0; i < rb.size; i++ {
		out[i] = rb.buf[(start+i)%rb.cap]
	}
	return out
}

// Len returns the current number of elements in the buffer.
func (rb *RingBuffer) Len() int {
	rb.mu.RLock()
	defer rb.mu.RUnlock()
	return rb.size
}

// Cap returns the buffer capacity.
func (rb *RingBuffer) Cap() int {
	return rb.cap
}

// Clear removes all elements from the buffer.
func (rb *RingBuffer) Clear() {
	rb.mu.Lock()
	defer rb.mu.Unlock()
	rb.head = 0
	rb.size = 0
}
