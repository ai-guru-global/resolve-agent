// Package retry provides configurable retry strategies with exponential
// backoff, jitter, and context-aware cancellation for the ResolveAgent platform.
// It integrates with the feedback loop to emit retry outcome signals.
package retry

import (
	"context"
	"math"
	"math/rand/v2"
	"time"
)

// RetryObserver receives lifecycle events from the retry loop,
// enabling the feedback subsystem to track retry outcomes.
type RetryObserver interface {
	// OnRetrySuccess is called when the operation succeeds after retries.
	OnRetrySuccess(ctx context.Context, attempts int, totalDuration time.Duration)
	// OnRetryExhausted is called when all retry attempts are exhausted.
	OnRetryExhausted(ctx context.Context, attempts int, totalDuration time.Duration, lastErr error)
}

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
	// Observer receives retry lifecycle events for feedback loop integration.
	Observer RetryObserver
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
// When an Observer is set on the policy, it emits success/exhausted signals
// to close the retry feedback loop.
func Do(ctx context.Context, p Policy, fn func(ctx context.Context) error) error {
	if p.MaxAttempts <= 0 {
		p.MaxAttempts = 1
	}
	if p.Multiplier == 0 {
		p.Multiplier = 2.0
	}

	start := time.Now()
	var lastErr error
	delay := p.InitialDelay

	for attempt := 0; attempt < p.MaxAttempts; attempt++ {
		lastErr = fn(ctx)
		if lastErr == nil {
			// Success — emit feedback signal.
			if p.Observer != nil {
				p.Observer.OnRetrySuccess(ctx, attempt+1, time.Since(start))
			}
			return nil
		}

		// Check if we should retry this specific error.
		if p.RetryIf != nil && !p.RetryIf(lastErr) {
			if p.Observer != nil {
				p.Observer.OnRetryExhausted(ctx, attempt+1, time.Since(start), lastErr)
			}
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

	// All attempts exhausted — emit feedback signal.
	if p.Observer != nil {
		p.Observer.OnRetryExhausted(ctx, p.MaxAttempts, time.Since(start), lastErr)
	}
	return lastErr
}
