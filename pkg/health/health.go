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
type Checker struct {
	mu     sync.RWMutex
	checks map[string]Check
}

// NewChecker creates a new Checker.
func NewChecker() *Checker {
	return &Checker{checks: make(map[string]Check)}
}

// Register adds a named health check.
func (c *Checker) Register(name string, check Check) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.checks[name] = check
}

// Run executes all registered checks and returns the aggregated response.
func (c *Checker) Run(ctx context.Context) Response {
	c.mu.RLock()
	defer c.mu.RUnlock()

	resp := Response{
		Status:     StatusUp,
		Timestamp:  time.Now().UTC(),
		Components: make(map[string]ComponentHealth, len(c.checks)),
	}

	for name, check := range c.checks {
		ch := check(ctx)
		resp.Components[name] = ch
		if ch.Status == StatusDown {
			resp.Status = StatusDown
		} else if ch.Status == StatusDegraded && resp.Status != StatusDown {
			resp.Status = StatusDegraded
		}
	}

	return resp
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
