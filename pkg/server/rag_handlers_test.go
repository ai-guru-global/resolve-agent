package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
)

// fakeRuntimeServer records DELETE requests hitting the Python runtime API.
type fakeRuntimeServer struct {
	mu      sync.Mutex
	deleted []string
}

func (f *fakeRuntimeServer) handler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete || !strings.HasPrefix(r.URL.Path, "/v1/rag/collections/") {
		w.WriteHeader(http.StatusNotFound)
		return
	}
	f.mu.Lock()
	f.deleted = append(f.deleted, strings.TrimPrefix(r.URL.Path, "/v1/rag/collections/"))
	f.mu.Unlock()
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]any{"success": true})
}

// TestDeleteCollectionForwardsVectorCleanup verifies that deleting a
// collection via the platform API also triggers vector store deletion on the
// Python runtime, and that the registry delete succeeds even when the runtime
// is unreachable (best-effort cleanup).
func TestDeleteCollectionForwardsVectorCleanup(t *testing.T) {
	fake := &fakeRuntimeServer{}
	runtimeSrv := httptest.NewServer(http.HandlerFunc(fake.handler))
	defer runtimeSrv.Close()

	srv := newTestServer(t)
	srv.runtimeClient = &RuntimeClient{baseURL: runtimeSrv.URL + "/v1", httpClient: runtimeSrv.Client()}

	// Create a collection to delete.
	body := `{"name":"cleanup-test","description":"vector cleanup forwarding"}`
	createReq := httptest.NewRequest("POST", "/api/v1/rag/collections", strings.NewReader(body))
	createReq.Header.Set("Content-Type", "application/json")
	createW := httptest.NewRecorder()
	srv.httpServer.Handler.ServeHTTP(createW, createReq)

	if createW.Code != http.StatusCreated {
		t.Fatalf("create collection: expected 201, got %d (body: %s)", createW.Code, createW.Body.String())
	}
	var created struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(createW.Body).Decode(&created); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	if created.ID == "" {
		t.Fatal("create response missing id")
	}

	// Delete it via the API.
	delReq := httptest.NewRequest("DELETE", "/api/v1/rag/collections/"+created.ID, http.NoBody)
	delW := httptest.NewRecorder()
	srv.httpServer.Handler.ServeHTTP(delW, delReq)

	if delW.Code != http.StatusOK {
		t.Fatalf("delete collection: expected 200, got %d (body: %s)", delW.Code, delW.Body.String())
	}

	// The vector cleanup must have been forwarded to the runtime.
	fake.mu.Lock()
	defer fake.mu.Unlock()
	if len(fake.deleted) != 1 || fake.deleted[0] != created.ID {
		t.Errorf("expected runtime DELETE for %q, got %v", created.ID, fake.deleted)
	}
}

// TestDeleteCollectionToleratesUnreachableRuntime verifies the registry delete
// still completes when the Python runtime is down (cleanup is best-effort).
func TestDeleteCollectionToleratesUnreachableRuntime(t *testing.T) {
	srv := newTestServer(t)
	// Point at a port with nothing listening on localhost: connection is
	// refused immediately, exercising the warning-and-continue path.
	dead := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	deadURL := dead.URL
	dead.Close()
	srv.runtimeClient = &RuntimeClient{baseURL: deadURL + "/v1", httpClient: http.DefaultClient}

	body := `{"name":"unreachable-runtime-test"}`
	createReq := httptest.NewRequest("POST", "/api/v1/rag/collections", strings.NewReader(body))
	createReq.Header.Set("Content-Type", "application/json")
	createW := httptest.NewRecorder()
	srv.httpServer.Handler.ServeHTTP(createW, createReq)
	if createW.Code != http.StatusCreated {
		t.Fatalf("create collection: expected 201, got %d", createW.Code)
	}
	var created struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(createW.Body).Decode(&created); err != nil {
		t.Fatalf("decode create response: %v", err)
	}

	delReq := httptest.NewRequest("DELETE", "/api/v1/rag/collections/"+created.ID, http.NoBody)
	delW := httptest.NewRecorder()
	srv.httpServer.Handler.ServeHTTP(delW, delReq)

	if delW.Code != http.StatusOK {
		t.Fatalf("delete collection with dead runtime: expected 200, got %d (body: %s)", delW.Code, delW.Body.String())
	}
}
