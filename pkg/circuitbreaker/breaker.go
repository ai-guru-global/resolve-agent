// Package circuitbreaker implements the Circuit Breaker pattern for the
// Loop Engineering self-healing cycle. It protects downstream services
// from cascading failures by tracking error rates and transitioning
// through three states: Closed -> Open -> HalfOpen -> Closed.
//
// State machine:
//
//	CLOSED  --[failures >= threshold]--> OPEN
//	OPEN    --[recovery timeout elapsed]--> HALF_OPEN
//	HALF_OPEN --[probe success]--> CLOSED
//	HALF_OPEN --[probe failure]--> OPEN
package circuitbreaker

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"
)

// State represents the circuit breaker's current state.
type State int

const (
	// StateClosed is the normal operating state; requests pass through.
	StateClosed State = iota
	// StateOpen rejects all requests immediately to protect the downstream.
	StateOpen
	// StateHalfOpen allows a limited number of probe requests to test recovery.
	StateHalfOpen
)

// String returns the human-readable state name.
func (s State) String() string {
	switch s {
	case StateClosed:
		return "CLOSED"
	case StateOpen:
		return "OPEN"
	case StateHalfOpen:
		return "HALF_OPEN"
	default:
		return "UNKNOWN"
	}
}

// ErrCircuitOpen is returned when the circuit breaker is in the open state.
var ErrCircuitOpen = errors.New("circuit breaker is open")

// StateObserver receives state transition events, enabling the feedback
// subsystem to track circuit breaker lifecycle for the self-healing loop.
type StateObserver interface {
	OnStateChange(name string, from, to State)
}

// Config configures the circuit breaker.
type Config struct {
	// Name identifies this circuit breaker instance.
	Name string
	// FailureThreshold is the number of consecutive failures before opening.
	FailureThreshold int
	// RecoveryTimeout is how long to wait in the open state before probing.
	RecoveryTimeout time.Duration
	// HalfOpenMaxCalls is the max probe calls allowed in half-open state.
	HalfOpenMaxCalls int
	// Observer receives state transition notifications.
	Observer StateObserver
}

// DefaultConfig returns sensible defaults.
func DefaultConfig(name string) Config {
	return Config{
		Name:             name,
		FailureThreshold: 5,
		RecoveryTimeout:  30 * time.Second,
		HalfOpenMaxCalls: 3,
	}
}

// Breaker is a thread-safe circuit breaker.
type Breaker struct {
	mu              sync.Mutex
	cfg             Config
	state           State
	failures        int
	halfOpenCalls   int
	lastFailureTime time.Time
	lastStateChange time.Time
}

// New creates a Breaker with the given config, starting in the closed state.
func New(cfg Config) *Breaker {
	if cfg.FailureThreshold <= 0 {
		cfg.FailureThreshold = 5
	}
	if cfg.RecoveryTimeout <= 0 {
		cfg.RecoveryTimeout = 30 * time.Second
	}
	if cfg.HalfOpenMaxCalls <= 0 {
		cfg.HalfOpenMaxCalls = 3
	}
	return &Breaker{
		cfg:             cfg,
		state:           StateClosed,
		lastStateChange: time.Now(),
	}
}

// Execute runs the given function through the circuit breaker.
// If the circuit is open, it returns ErrCircuitOpen immediately.
// If half-open, it allows limited probe calls.
func (b *Breaker) Execute(ctx context.Context, fn func(ctx context.Context) error) error {
	if err := b.beforeRequest(); err != nil {
		return err
	}

	err := fn(ctx)

	b.afterRequest(err)
	return err
}

// beforeRequest checks whether the request is allowed under the current state.
func (b *Breaker) beforeRequest() error {
	b.mu.Lock()
	defer b.mu.Unlock()

	switch b.state {
	case StateClosed:
		return nil
	case StateOpen:
		// Check if recovery timeout has elapsed.
		if time.Since(b.lastFailureTime) >= b.cfg.RecoveryTimeout {
			b.transitionTo(StateHalfOpen)
			b.halfOpenCalls = 0
			return nil
		}
		return ErrCircuitOpen
	case StateHalfOpen:
		if b.halfOpenCalls >= b.cfg.HalfOpenMaxCalls {
			return ErrCircuitOpen
		}
		b.halfOpenCalls++
		return nil
	}
	return nil
}

// afterRequest records the outcome of a request.
func (b *Breaker) afterRequest(err error) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if err == nil {
		// Success: reset failures, close circuit if half-open.
		b.failures = 0
		if b.state == StateHalfOpen {
			b.transitionTo(StateClosed)
		}
		return
	}

	// Failure: increment counter and possibly open the circuit.
	b.failures++
	b.lastFailureTime = time.Now()

	switch b.state {
	case StateClosed:
		if b.failures >= b.cfg.FailureThreshold {
			b.transitionTo(StateOpen)
		}
	case StateHalfOpen:
		// Any failure in half-open immediately reopens.
		b.transitionTo(StateOpen)
	}
}

// transitionTo changes the circuit breaker state and notifies the observer.
func (b *Breaker) transitionTo(to State) {
	from := b.state
	b.state = to
	b.lastStateChange = time.Now()
	if b.cfg.Observer != nil {
		b.cfg.Observer.OnStateChange(b.cfg.Name, from, to)
	}
}

// State returns the current circuit breaker state.
func (b *Breaker) State() State {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.state
}

// Failures returns the current consecutive failure count.
func (b *Breaker) Failures() int {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.failures
}

// Reset forces the breaker back to closed state with zero failures.
func (b *Breaker) Reset() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.failures = 0
	b.halfOpenCalls = 0
	if b.state != StateClosed {
		b.transitionTo(StateClosed)
	}
}

// String returns a human-readable summary of the breaker.
func (b *Breaker) String() string {
	b.mu.Lock()
	defer b.mu.Unlock()
	return fmt.Sprintf("Breaker(%s): state=%s failures=%d", b.cfg.Name, b.state, b.failures)
}
