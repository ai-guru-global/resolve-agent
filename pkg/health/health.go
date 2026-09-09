// Package health provides HTTP and gRPC health check utilities
// for liveness and readiness probes in Kubernetes deployments.
package health

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
	"time"
)

// Status represents the health state of a component.
type Status string

// Well-known health statuses reported by components.
const (
	StatusUp       Status = "UP"
	StatusDown     Status = "DOWN"
	StatusDegraded Status = "DEGRADED"
)

// Check is a function that returns the health of a component.
type Check func(ctx context.Context) ComponentHealth

// ComponentHealth holds the health of a single component.
type ComponentHealth struct {
	Status  Status         `json:"status"`
	Details map[string]any `json:"details,omitempty"`
}

// Response is the full health response payload.
type Response struct {
	Status     Status                     `json:"status"`
	Timestamp  time.Time                  `json:"timestamp"`
	Components map[string]ComponentHealth `json:"components,omitempty"`
}

// Checker aggregates component checks into a unified health endpoint.
// It optionally emits feedback signals when health state transitions occur,
// closing the observe loop in the Loop Engineering cycle.
type Checker struct {
	mu       sync.RWMutex
	checks   map[string]Check
	emitter  FeedbackEmitter
	prevStat map[string]Status // track previous status for transition detection
}

// FeedbackEmitter decouples health from the feedback package.
// Typically backed by *feedback.Collector.
type FeedbackEmitter interface {
	EmitHealthSignal(ctx context.Context, component string, status Status, message string)
}

// NewChecker creates a new Checker.
func NewChecker() *Checker {
	return &Checker{
		checks:   make(map[string]Check),
		prevStat: make(map[string]Status),
	}
}

// SetFeedbackEmitter attaches a feedback signal emitter to the checker.
// Once set, health state transitions (e.g., UP->DOWN) automatically emit
// feedback signals that close the health observe loop.
func (c *Checker) SetFeedbackEmitter(e FeedbackEmitter) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.emitter = e
}

// Register adds a named health check.
func (c *Checker) Register(name string, check Check) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.checks[name] = check
}

// checkTimeout bounds a single component check so a hung check cannot block
// the aggregated health response.
const checkTimeout = 5 * time.Second

// Run executes all registered checks concurrently and returns the aggregated
// response. Checks are run outside the checker lock, so a hung check cannot
// block other Run calls and checks may safely call back into the Checker.
// When a FeedbackEmitter is attached, it also emits signals on status
// transitions.
func (c *Checker) Run(ctx context.Context) Response {
	c.mu.RLock()
	checks := make(map[string]Check, len(c.checks))
	for name, check := range c.checks {
		checks[name] = check
	}
	emitter := c.emitter
	c.mu.RUnlock()

	type checkResult struct {
		name   string
		health ComponentHealth
	}
	results := make(chan checkResult, len(checks))
	for name, check := range checks {
		go func(name string, check Check) {
			checkCtx, cancel := context.WithTimeout(ctx, checkTimeout)
			defer cancel()
			results <- checkResult{name, runCheck(checkCtx, check)}
		}(name, check)
	}

	resp := Response{
		Status:     StatusUp,
		Timestamp:  time.Now().UTC(),
		Components: make(map[string]ComponentHealth, len(checks)),
	}

	type transition struct {
		name   string
		status Status
		msg    string
	}
	var transitions []transition

	for range checks {
		r := <-results
		resp.Components[r.name] = r.health
		if r.health.Status == StatusDown {
			resp.Status = StatusDown
		} else if r.health.Status == StatusDegraded && resp.Status != StatusDown {
			resp.Status = StatusDegraded
		}

		// Record feedback signal on status transition.
		if emitter != nil {
			c.mu.Lock()
			prev, hadPrev := c.prevStat[r.name]
			if !hadPrev || prev != r.health.Status {
				msg := "health status: " + string(r.health.Status)
				if hadPrev {
					msg = string(prev) + " -> " + string(r.health.Status)
				}
				transitions = append(transitions, transition{r.name, r.health.Status, msg})
			}
			c.prevStat[r.name] = r.health.Status
			c.mu.Unlock()
		}
	}

	// Emit signals after releasing the lock so emitters may call back into
	// the Checker without deadlocking.
	for _, tr := range transitions {
		emitter.EmitHealthSignal(ctx, tr.name, tr.status, tr.msg)
	}

	return resp
}

// runCheck executes a single check, returning DOWN if the check does not
// finish before the context deadline.
func runCheck(ctx context.Context, check Check) ComponentHealth {
	done := make(chan ComponentHealth, 1)
	go func() {
		done <- check(ctx)
	}()
	select {
	case ch := <-done:
		return ch
	case <-ctx.Done():
		return ComponentHealth{
			Status:  StatusDown,
			Details: map[string]any{"error": "health check timed out"},
		}
	}
}

// LivenessHandler returns an HTTP handler for /healthz (liveness).
// Liveness always returns 200 OK if the process is running.
func LivenessHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "UP"})
	}
}

// ReadinessHandler returns an HTTP handler for /readyz (readiness).
func ReadinessHandler(c *Checker) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		resp := c.Run(r.Context())

		w.Header().Set("Content-Type", "application/json")
		if resp.Status == StatusUp {
			w.WriteHeader(http.StatusOK)
		} else {
			w.WriteHeader(http.StatusServiceUnavailable)
		}
		_ = json.NewEncoder(w).Encode(resp)
	}
}
