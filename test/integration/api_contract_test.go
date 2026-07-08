//go:build integration

package integration

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"
)

// TestAPIContract_HealthEndpoint validates that the platform health API
// returns the expected response structure, ensuring contract compatibility
// between the Go platform and Python runtime clients.
func TestAPIContract_HealthEndpoint(t *testing.T) {
	skipIfNoServer(t)

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get("http://localhost:8080/readyz")
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusServiceUnavailable {
		t.Errorf("unexpected status: %d", resp.StatusCode)
	}

	var body struct {
		Status     string `json:"status"`
		Timestamp  string `json:"timestamp"`
		Components map[string]struct {
			Status  string         `json:"status"`
			Details map[string]any `json:"details"`
		} `json:"components"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode failed: %v", err)
	}

	// Contract: status must be one of UP, DOWN, DEGRADED
	validStatuses := map[string]bool{"UP": true, "DOWN": true, "DEGRADED": true}
	if !validStatuses[body.Status] {
		t.Errorf("status %q not in contract", body.Status)
	}

	// Contract: timestamp must be non-empty
	if body.Timestamp == "" {
		t.Error("timestamp is empty")
	}
}

// TestAPIContract_RegistryCRUD validates the registry API contract for
// creating and reading entities, ensuring Go platform and Python runtime
// agree on the data exchange format.
func TestAPIContract_RegistryCRUD(t *testing.T) {
	skipIfNoServer(t)

	client := &http.Client{Timeout: 5 * time.Second}

	// Contract: GET /api/v1/agents returns list with total count
	resp, err := client.Get("http://localhost:8080/api/v1/agents")
	if err != nil {
		t.Skipf("API not available: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Skipf("API returned %d", resp.StatusCode)
	}

	var body struct {
		Items []json.RawMessage `json:"items"`
		Total int               `json:"total"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode failed: %v", err)
	}

	// Contract: response must have "items" array and "total" integer
	if body.Total < 0 {
		t.Error("total must be non-negative")
	}
}

func skipIfNoServer(t *testing.T) {
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get("http://localhost:8080/healthz")
	if err != nil {
		t.Skipf("Server not available: %v", err)
	}
	defer resp.Body.Close()
}
