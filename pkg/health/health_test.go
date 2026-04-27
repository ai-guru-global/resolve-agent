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
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
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

	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
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

	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
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
