package circuitbreaker

import (
	"context"
	"errors"
	"testing"
	"time"
)

var errBoom = errors.New("boom")

type stateTransition struct {
	from, to State
}

type mockObserver struct {
	transitions []stateTransition
}

func (m *mockObserver) OnStateChange(_ string, from, to State) {
	m.transitions = append(m.transitions, stateTransition{from, to})
}

func TestBreaker_StaysClosedOnSuccess(t *testing.T) {
	b := New(DefaultConfig("test"))
	for i := 0; i < 10; i++ {
		if err := b.Execute(context.Background(), func(_ context.Context) error {
			return nil
		}); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	}
	if b.State() != StateClosed {
		t.Errorf("expected CLOSED, got %s", b.State())
	}
}

func TestBreaker_OpensAfterThreshold(t *testing.T) {
	cfg := DefaultConfig("test")
	cfg.FailureThreshold = 3
	b := New(cfg)

	for i := 0; i < 3; i++ {
		_ = b.Execute(context.Background(), func(_ context.Context) error {
			return errBoom
		})
	}

	if b.State() != StateOpen {
		t.Errorf("expected OPEN after 3 failures, got %s", b.State())
	}

	// Next call should be rejected immediately.
	err := b.Execute(context.Background(), func(_ context.Context) error {
		return nil
	})
	if !errors.Is(err, ErrCircuitOpen) {
		t.Errorf("expected ErrCircuitOpen, got %v", err)
	}
}

func TestBreaker_HalfOpenAfterRecovery(t *testing.T) {
	cfg := DefaultConfig("test")
	cfg.FailureThreshold = 2
	cfg.RecoveryTimeout = 10 * time.Millisecond
	b := New(cfg)

	// Trip the breaker.
	_ = b.Execute(context.Background(), func(_ context.Context) error { return errBoom })
	_ = b.Execute(context.Background(), func(_ context.Context) error { return errBoom })
	if b.State() != StateOpen {
		t.Fatalf("expected OPEN, got %s", b.State())
	}

	// Wait for recovery timeout.
	time.Sleep(20 * time.Millisecond)

	// Probe should succeed and close the circuit.
	err := b.Execute(context.Background(), func(_ context.Context) error { return nil })
	if err != nil {
		t.Fatalf("expected probe success, got %v", err)
	}
	if b.State() != StateClosed {
		t.Errorf("expected CLOSED after successful probe, got %s", b.State())
	}
}

func TestBreaker_HalfOpenFailsReopens(t *testing.T) {
	cfg := DefaultConfig("test")
	cfg.FailureThreshold = 1
	cfg.RecoveryTimeout = 10 * time.Millisecond
	cfg.HalfOpenMaxCalls = 1
	b := New(cfg)

	// Trip the breaker.
	_ = b.Execute(context.Background(), func(_ context.Context) error { return errBoom })

	// Wait for recovery.
	time.Sleep(20 * time.Millisecond)

	// Probe fails -> reopens.
	_ = b.Execute(context.Background(), func(_ context.Context) error { return errBoom })
	if b.State() != StateOpen {
		t.Errorf("expected OPEN after failed probe, got %s", b.State())
	}
}

func TestBreaker_ObserverNotified(t *testing.T) {
	obs := &mockObserver{}
	cfg := DefaultConfig("test")
	cfg.FailureThreshold = 1
	cfg.Observer = obs
	b := New(cfg)

	_ = b.Execute(context.Background(), func(_ context.Context) error { return errBoom })

	if len(obs.transitions) != 1 {
		t.Fatalf("expected 1 transition, got %d", len(obs.transitions))
	}
	if obs.transitions[0].from != StateClosed || obs.transitions[0].to != StateOpen {
		t.Errorf("expected CLOSED->OPEN, got %s->%s", obs.transitions[0].from, obs.transitions[0].to)
	}
}

func TestBreaker_Reset(t *testing.T) {
	cfg := DefaultConfig("test")
	cfg.FailureThreshold = 1
	b := New(cfg)

	_ = b.Execute(context.Background(), func(_ context.Context) error { return errBoom })
	if b.State() != StateOpen {
		t.Fatalf("expected OPEN, got %s", b.State())
	}

	b.Reset()
	if b.State() != StateClosed {
		t.Errorf("expected CLOSED after reset, got %s", b.State())
	}
	if b.Failures() != 0 {
		t.Errorf("expected 0 failures after reset, got %d", b.Failures())
	}
}

func TestState_String(t *testing.T) {
	tests := []struct {
		s    State
		want string
	}{
		{StateClosed, "CLOSED"},
		{StateOpen, "OPEN"},
		{StateHalfOpen, "HALF_OPEN"},
		{State(99), "UNKNOWN"},
	}
	for _, tt := range tests {
		if got := tt.s.String(); got != tt.want {
			t.Errorf("State(%d).String() = %q, want %q", tt.s, got, tt.want)
		}
	}
}
