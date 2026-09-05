//go:build e2e

package e2e

import (
	"net/http"
	"os"
	"strings"
	"testing"
	"time"
)

// serverBaseURL returns the platform server base URL. It defaults to
// http://localhost:8080 and can be overridden with E2E_BASE_URL for
// runs against a server bound to a non-default address.
func serverBaseURL() string {
	if u := os.Getenv("E2E_BASE_URL"); u != "" {
		return strings.TrimRight(u, "/")
	}
	return "http://localhost:8080"
}

func skipIfNoServer(t *testing.T) {
	if os.Getenv("SKIP_E2E") != "" {
		t.Skip("SKIP_E2E is set")
	}
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(serverBaseURL() + "/healthz")
	if err != nil {
		t.Skipf("Server not available: %v", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Skipf("Server not healthy: status %d", resp.StatusCode)
	}
}
