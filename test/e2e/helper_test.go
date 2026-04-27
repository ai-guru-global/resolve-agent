package e2e

import (
	"net/http"
	"os"
	"testing"
	"time"
)

func skipIfNoServer(t *testing.T) {
	if os.Getenv("SKIP_E2E") != "" {
		t.Skip("SKIP_E2E is set")
	}
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get("http://localhost:8080/healthz")
	if err != nil {
		t.Skipf("Server not available: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Skipf("Server not healthy: status %d", resp.StatusCode)
	}
}
