package health

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestNewChecker(t *testing.T) {
	c := NewChecker()
	if c == nil {
		t.Fatal("NewChecker() returned nil")
	}
	if c.checks == nil {
		t.Error("checker checks map is nil")
	}
}

func TestChecker_Register(t *testing.T) {
	c := NewChecker()
	c.Register("test", func(ctx context.Context) ComponentHealth {
		return ComponentHealth{Status: StatusUp}
	})

	resp := c.Run(context.Background())
	if len(resp.Components) != 1 {
		t.Errorf("expected 1 component, got %d", len(resp.Components))
	}
}

func TestChecker_Run(t *testing.T) {
	c := NewChecker()
	c.Register("up", func(ctx context.Context) ComponentHealth {
		return ComponentHealth{Status: StatusUp}
	})
	c.Register("down", func(ctx context.Context) ComponentHealth {
		return ComponentHealth{Status: StatusDown}
	})

	resp := c.Run(context.Background())

	if resp.Status != StatusDown {
		t.Errorf("expected overall status DOWN, got %s", resp.Status)
	}
	if len(resp.Components) != 2 {
		t.Errorf("expected 2 components, got %d", len(resp.Components))
	}
	if resp.Timestamp.IsZero() {
		t.Error("expected non-zero timestamp")
	}
}

func TestChecker_Run_Degraded(t *testing.T) {
	c := NewChecker()
	c.Register("up", func(ctx context.Context) ComponentHealth {
		return ComponentHealth{Status: StatusUp}
	})
	c.Register("degraded", func(ctx context.Context) ComponentHealth {
		return ComponentHealth{Status: StatusDegraded}
	})

	resp := c.Run(context.Background())

	if resp.Status != StatusDegraded {
		t.Errorf("expected overall status DEGRADED, got %s", resp.Status)
	}
}

func TestLivenessHandler(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/healthz", http.NoBody)
	rr := httptest.NewRecorder()

	LivenessHandler()(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rr.Code)
	}
	if body := rr.Body.String(); body == "" {
		t.Error("expected non-empty body")
	}
}

func TestReadinessHandler(t *testing.T) {
	c := NewChecker()
	c.Register("db", func(ctx context.Context) ComponentHealth {
		return ComponentHealth{Status: StatusUp}
	})

	req := httptest.NewRequest(http.MethodGet, "/readyz", http.NoBody)
	rr := httptest.NewRecorder()

	ReadinessHandler(c)(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, rr.Code)
	}
}

func TestReadinessHandler_Down(t *testing.T) {
	c := NewChecker()
	c.Register("db", func(ctx context.Context) ComponentHealth {
		return ComponentHealth{Status: StatusDown}
	})

	req := httptest.NewRequest(http.MethodGet, "/readyz", http.NoBody)
	rr := httptest.NewRecorder()

	ReadinessHandler(c)(rr, req)

	if rr.Code != http.StatusServiceUnavailable {
		t.Errorf("expected status %d, got %d", http.StatusServiceUnavailable, rr.Code)
	}
}

func TestStatus_String(t *testing.T) {
	if StatusUp != "UP" {
		t.Errorf("expected UP, got %s", StatusUp)
	}
	if StatusDown != "DOWN" {
		t.Errorf("expected DOWN, got %s", StatusDown)
	}
	if StatusDegraded != "DEGRADED" {
		t.Errorf("expected DEGRADED, got %s", StatusDegraded)
	}
}

func TestComponentHealth(t *testing.T) {
	ch := ComponentHealth{
		Status:  StatusUp,
		Details: map[string]any{"version": "1.0.0"},
	}
	if ch.Status != StatusUp {
		t.Errorf("expected UP, got %s", ch.Status)
	}
	if len(ch.Details) != 1 {
		t.Errorf("expected 1 detail, got %d", len(ch.Details))
	}
}

func TestResponse(t *testing.T) {
	resp := Response{
		Status:    StatusUp,
		Timestamp: time.Now().UTC(),
		Components: map[string]ComponentHealth{
			"db": {Status: StatusUp},
		},
	}
	if resp.Status != StatusUp {
		t.Errorf("expected UP, got %s", resp.Status)
	}
	if len(resp.Components) != 1 {
		t.Errorf("expected 1 component, got %d", len(resp.Components))
	}
}

func TestRunCheck_Timeout(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	start := time.Now()
	ch := runCheck(ctx, func(_ context.Context) ComponentHealth {
		select {} // hung check that ignores its context
	})

	if ch.Status != StatusDown {
		t.Errorf("expected DOWN for timed-out check, got %s", ch.Status)
	}
	if elapsed := time.Since(start); elapsed > time.Second {
		t.Errorf("expected timeout near 50ms, took %s", elapsed)
	}
}

func TestChecker_Run_Parallel(t *testing.T) {
	c := NewChecker()
	for _, name := range []string{"a", "b", "c"} {
		c.Register(name, func(ctx context.Context) ComponentHealth {
			time.Sleep(100 * time.Millisecond)
			return ComponentHealth{Status: StatusUp}
		})
	}

	start := time.Now()
	resp := c.Run(context.Background())

	// Three sequential 100ms checks would take >=300ms; parallel runs in ~100ms.
	if elapsed := time.Since(start); elapsed >= 250*time.Millisecond {
		t.Errorf("expected checks to run in parallel, took %s", elapsed)
	}
	if resp.Status != StatusUp || len(resp.Components) != 3 {
		t.Errorf("unexpected response: status=%s components=%d", resp.Status, len(resp.Components))
	}
}

func TestChecker_Run_HungCheckDoesNotBlock(t *testing.T) {
	c := NewChecker()
	c.Register("hung", func(ctx context.Context) ComponentHealth {
		select {} // hung check that ignores its context
	})
	c.Register("fast", func(ctx context.Context) ComponentHealth {
		return ComponentHealth{Status: StatusUp}
	})

	done := make(chan Response, 1)
	go func() {
		done <- c.Run(context.Background())
	}()

	select {
	case resp := <-done:
		if resp.Components["hung"].Status != StatusDown {
			t.Errorf("expected hung component DOWN, got %s", resp.Components["hung"].Status)
		}
		if resp.Components["fast"].Status != StatusUp {
			t.Errorf("expected fast component UP, got %s", resp.Components["fast"].Status)
		}
		if resp.Status != StatusDown {
			t.Errorf("expected overall status DOWN, got %s", resp.Status)
		}
	case <-time.After(checkTimeout + 5*time.Second):
		t.Fatal("Run blocked by hung check")
	}
}

func TestChecker_Run_CheckCallsBackIntoChecker(t *testing.T) {
	c := NewChecker()
	c.Register("self", func(ctx context.Context) ComponentHealth {
		// Registering from inside a check must not deadlock.
		c.Register("late", func(ctx context.Context) ComponentHealth {
			return ComponentHealth{Status: StatusUp}
		})
		return ComponentHealth{Status: StatusUp}
	})

	done := make(chan Response, 1)
	go func() {
		done <- c.Run(context.Background())
	}()

	select {
	case resp := <-done:
		if resp.Status != StatusUp {
			t.Errorf("expected UP, got %s", resp.Status)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("Run deadlocked when check called back into Checker")
	}
}
