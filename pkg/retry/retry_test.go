package retry

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"
)

func TestDo_Success(t *testing.T) {
	var calls int
	err := Do(context.Background(), DefaultPolicy(), func(_ context.Context) error {
		calls++
		return nil
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if calls != 1 {
		t.Errorf("calls = %d, want 1", calls)
	}
}

func TestDo_EventualSuccess(t *testing.T) {
	var calls int
	p := Policy{MaxAttempts: 3, InitialDelay: time.Millisecond, MaxDelay: 10 * time.Millisecond, Multiplier: 2}
	err := Do(context.Background(), p, func(_ context.Context) error {
		calls++
		if calls < 3 {
			return errors.New("transient")
		}
		return nil
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if calls != 3 {
		t.Errorf("calls = %d, want 3", calls)
	}
}

func TestDo_AllFail(t *testing.T) {
	p := Policy{MaxAttempts: 2, InitialDelay: time.Millisecond, MaxDelay: 10 * time.Millisecond, Multiplier: 2}
	sentinel := errors.New("permanent")
	err := Do(context.Background(), p, func(_ context.Context) error {
		return sentinel
	})
	if !errors.Is(err, sentinel) {
		t.Errorf("err = %v, want %v", err, sentinel)
	}
}

func TestDo_RetryIf(t *testing.T) {
	permanent := errors.New("permanent")
	transient := errors.New("transient")

	var calls atomic.Int32
	p := Policy{
		MaxAttempts:  5,
		InitialDelay: time.Millisecond,
		MaxDelay:     10 * time.Millisecond,
		Multiplier:   2,
		RetryIf: func(err error) bool {
			return errors.Is(err, transient)
		},
	}

	err := Do(context.Background(), p, func(_ context.Context) error {
		calls.Add(1)
		return permanent // not retryable
	})

	if calls.Load() != 1 {
		t.Errorf("calls = %d, want 1 (should stop on non-retryable)", calls.Load())
	}
	if !errors.Is(err, permanent) {
		t.Errorf("err = %v, want %v", err, permanent)
	}
}

func TestDo_ContextCancel(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	p := Policy{MaxAttempts: 100, InitialDelay: time.Second, MaxDelay: time.Second, Multiplier: 1}

	var calls int
	go func() {
		time.Sleep(5 * time.Millisecond)
		cancel()
	}()

	err := Do(ctx, p, func(_ context.Context) error {
		calls++
		return errors.New("fail")
	})

	if !errors.Is(err, context.Canceled) {
		t.Errorf("err = %v, want context.Canceled", err)
	}
}
