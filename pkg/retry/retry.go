// Package retry provides configurable retry strategies with exponential
// backoff, jitter, and context-aware cancellation for the ResolveAgent platform.
package retry

import (
	"context"
	"math"
	"math/rand/v2"
	"time"
)

// Policy defines retry behavior.
type Policy struct {
	// MaxAttempts is the total number of attempts (including the first call).
	MaxAttempts int
	// InitialDelay is the delay before the first retry.
	InitialDelay time.Duration
	// MaxDelay caps the backoff delay.
	MaxDelay time.Duration
	// Multiplier is the backoff multiplier (default 2.0).
	Multiplier float64
	// Jitter adds random jitter up to this fraction of the delay (0.0–1.0).
	Jitter float64
	// RetryIf is an optional predicate; if set, only retry when it returns true.
	RetryIf func(err error) bool
}

// DefaultPolicy returns a sensible default retry policy.
func DefaultPolicy() Policy {
	return Policy{
		MaxAttempts:  3,
		InitialDelay: 200 * time.Millisecond,
		MaxDelay:     10 * time.Second,
		Multiplier:   2.0,
		Jitter:       0.1,
	}
}

// Do executes fn with the retry policy. It returns the first nil error or
// the last error after all attempts are exhausted.
func Do(ctx context.Context, p Policy, fn func(ctx context.Context) error) error {
	if p.MaxAttempts <= 0 {
		p.MaxAttempts = 1
	}
	if p.Multiplier == 0 {
		p.Multiplier = 2.0
	}

	var lastErr error
	delay := p.InitialDelay

	for attempt := 0; attempt < p.MaxAttempts; attempt++ {
		lastErr = fn(ctx)
		if lastErr == nil {
			return nil
		}

		// Check if we should retry this specific error.
		if p.RetryIf != nil && !p.RetryIf(lastErr) {
			return lastErr
		}

		// Don't sleep after the last attempt.
		if attempt == p.MaxAttempts-1 {
			break
		}

		// Apply jitter.
		jitteredDelay := delay
		if p.Jitter > 0 {
			jitter := time.Duration(float64(delay) * p.Jitter * rand.Float64())
			jitteredDelay = delay + jitter
		}

		// Cap the delay.
		if p.MaxDelay > 0 && jitteredDelay > p.MaxDelay {
			jitteredDelay = p.MaxDelay
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(jitteredDelay):
		}

		// Exponential backoff.
		delay = time.Duration(math.Min(
			float64(delay)*p.Multiplier,
			float64(p.MaxDelay),
		))
	}

	return lastErr
}
