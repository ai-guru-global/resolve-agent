package gateway

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func newTestLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
}

func TestNewClient(t *testing.T) {
	logger := newTestLogger()
	client := NewClient("http://localhost:8888", logger)

	if client == nil {
		t.Fatal("expected non-nil client")
	}
	if client.adminURL != "http://localhost:8888" {
		t.Errorf("expected adminURL 'http://localhost:8888', got '%s'", client.adminURL)
	}
}

func TestClientHealth(t *testing.T) {
	// Create test server
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/health" {
			t.Errorf("expected path '/health', got '%s'", r.URL.Path)
		}
		if r.Method != http.MethodGet {
			t.Errorf("expected GET method, got '%s'", r.Method)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	logger := newTestLogger()
	client := NewClient(server.URL, logger)

	err := client.Health(context.Background())
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
}

func TestClientHealthUnhealthy(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer server.Close()

	logger := newTestLogger()
	client := NewClient(server.URL, logger)

	err := client.Health(context.Background())
	if err == nil {
		t.Error("expected error for unhealthy gateway")
	}
}

func TestClientCreateRoute(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/routes" {
			t.Errorf("expected path '/routes', got '%s'", r.URL.Path)
		}
		if r.Method != http.MethodPost {
			t.Errorf("expected POST method, got '%s'", r.Method)
		}

		var route HigressRoute
		if err := json.NewDecoder(r.Body).Decode(&route); err != nil {
			t.Errorf("failed to decode request body: %v", err)
		}

		if route.Name != "test-route" {
			t.Errorf("expected route name 'test-route', got '%s'", route.Name)
		}

		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	logger := newTestLogger()
	client := NewClient(server.URL, logger)

	route := &HigressRoute{
		Name:     "test-route",
		Path:     "/api/test",
		PathType: "prefix",
		Upstream: RouteUpstream{
			ServiceName: "test-service",
			ServicePort: 8080,
		},
		Enabled: true,
	}

	err := client.CreateRoute(context.Background(), route)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
}

func TestClientUpdateRoute(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/routes/test-route" {
			t.Errorf("expected path '/routes/test-route', got '%s'", r.URL.Path)
		}
		if r.Method != http.MethodPut {
			t.Errorf("expected PUT method, got '%s'", r.Method)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	logger := newTestLogger()
	client := NewClient(server.URL, logger)

	route := &HigressRoute{
		Name:    "test-route",
		Path:    "/api/test",
		Enabled: true,
	}

	err := client.UpdateRoute(context.Background(), route)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
}

func TestClientDeleteRoute(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/routes/test-route" {
			t.Errorf("expected path '/routes/test-route', got '%s'", r.URL.Path)
		}
		if r.Method != http.MethodDelete {
			t.Errorf("expected DELETE method, got '%s'", r.Method)
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	logger := newTestLogger()
	client := NewClient(server.URL, logger)

	err := client.DeleteRoute(context.Background(), "test-route")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
}

func TestClientGetRoute(t *testing.T) {
	expectedRoute := &HigressRoute{
		Name:     "test-route",
		Path:     "/api/test",
		PathType: "prefix",
		Enabled:  true,
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/routes/test-route" {
			t.Errorf("expected path '/routes/test-route', got '%s'", r.URL.Path)
		}
		if r.Method != http.MethodGet {
			t.Errorf("expected GET method, got '%s'", r.Method)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(expectedRoute)
	}))
	defer server.Close()

	logger := newTestLogger()
	client := NewClient(server.URL, logger)

	route, err := client.GetRoute(context.Background(), "test-route")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if route == nil {
		t.Fatal("expected non-nil route")
	}
	if route.Name != "test-route" {
		t.Errorf("expected route name 'test-route', got '%s'", route.Name)
	}
}

func TestClientGetRouteNotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer server.Close()

	logger := newTestLogger()
	client := NewClient(server.URL, logger)

	route, err := client.GetRoute(context.Background(), "nonexistent")
	if err != nil {
		t.Errorf("expected no error for not found, got %v", err)
	}
	if route != nil {
		t.Error("expected nil route for not found")
	}
}

func TestClientListRoutes(t *testing.T) {
	routes := []*HigressRoute{
		{Name: "route-1", Path: "/api/1"},
		{Name: "route-2", Path: "/api/2"},
	}

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/routes" {
			t.Errorf("expected path '/routes', got '%s'", r.URL.Path)
		}
		if r.Method != http.MethodGet {
			t.Errorf("expected GET method, got '%s'", r.Method)
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(routes)
	}))
	defer server.Close()

	logger := newTestLogger()
	client := NewClient(server.URL, logger)

	result, err := client.ListRoutes(context.Background())
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
	if len(result) != 2 {
		t.Errorf("expected 2 routes, got %d", len(result))
	}
}

func TestClientRegisterService(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/services" {
			t.Errorf("expected path '/services', got '%s'", r.URL.Path)
		}
		if r.Method != http.MethodPost {
			t.Errorf("expected POST method, got '%s'", r.Method)
		}

		var service HigressService
		if err := json.NewDecoder(r.Body).Decode(&service); err != nil {
			t.Errorf("failed to decode request body: %v", err)
		}

		if service.Name != "test-service" {
			t.Errorf("expected service name 'test-service', got '%s'", service.Name)
		}

		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	logger := newTestLogger()
	client := NewClient(server.URL, logger)

	service := &HigressService{
		Name:     "test-service",
		Host:     "localhost",
		Port:     8080,
		Protocol: "http",
	}

	err := client.RegisterService(context.Background(), service)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
}

func TestClientDeregisterService(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/services/test-service" {
			t.Errorf("expected path '/services/test-service', got '%s'", r.URL.Path)
		}
		if r.Method != http.MethodDelete {
			t.Errorf("expected DELETE method, got '%s'", r.Method)
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	logger := newTestLogger()
	client := NewClient(server.URL, logger)

	err := client.DeregisterService(context.Background(), "test-service")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}
}
