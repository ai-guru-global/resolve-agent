package health

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestChecker_AllUp(t *testing.T) {
	c := NewChecker()
	c.Register("db", func(_ context.Context) ComponentHealth {
		return ComponentHealth{Status: StatusUp}
	})
	c.Register("cache", func(_ context.Context) ComponentHealth {
		return ComponentHealth{Status: StatusUp}
	})

	resp := c.Run(context.Background())
	if resp.Status != StatusUp {
		t.Errorf("status = %s, want UP", resp.Status)
	}
	if len(resp.Components) != 2 {
		t.Errorf("components = %d, want 2", len(resp.Components))
	}
}

func TestChecker_OneDown(t *testing.T) {
	c := NewChecker()
	c.Register("db", func(_ context.Context) ComponentHealth {
		return ComponentHealth{Status: StatusDown}
	})
	c.Register("cache", func(_ context.Context) ComponentHealth {
		return ComponentHealth{Status: StatusUp}
	})

	resp := c.Run(context.Background())
	if resp.Status != StatusDown {
		t.Errorf("status = %s, want DOWN", resp.Status)
	}
}

func TestChecker_Degraded(t *testing.T) {
	c := NewChecker()
	c.Register("db", func(_ context.Context) ComponentHealth {
		return ComponentHealth{Status: StatusDegraded}
	})

	resp := c.Run(context.Background())
	if resp.Status != StatusDegraded {
		t.Errorf("status = %s, want DEGRADED", resp.Status)
	}
}

func TestLivenessHandler(t *testing.T) {
	handler := LivenessHandler()
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	handler(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status code = %d, want 200", rec.Code)
	}

	var body map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body["status"] != "UP" {
		t.Errorf("body status = %s, want UP", body["status"])
	}
}

func TestReadinessHandler_Up(t *testing.T) {
	c := NewChecker()
	c.Register("db", func(_ context.Context) ComponentHealth {
		return ComponentHealth{Status: StatusUp}
	})

	handler := ReadinessHandler(c)
	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	rec := httptest.NewRecorder()

	handler(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status code = %d, want 200", rec.Code)
	}
}

func TestReadinessHandler_Down(t *testing.T) {
	c := NewChecker()
	c.Register("db", func(_ context.Context) ComponentHealth {
		return ComponentHealth{Status: StatusDown}
	})

	handler := ReadinessHandler(c)
	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	rec := httptest.NewRecorder()

	handler(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Errorf("status code = %d, want 503", rec.Code)
	}
}
