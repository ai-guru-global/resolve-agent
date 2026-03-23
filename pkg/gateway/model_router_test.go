package gateway

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

// createMockServer creates a mock HTTP server that accepts all requests.
func createMockServer(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
}

func TestNewModelRouter(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	client := NewClient("http://localhost:8888", logger)
	router := NewModelRouter(client, logger)

	if router == nil {
		t.Fatal("expected non-nil router")
	}
	if router.basePath != "/llm" {
		t.Errorf("expected basePath '/llm', got '%s'", router.basePath)
	}
	if router.defaultModel != "qwen-plus" {
		t.Errorf("expected defaultModel 'qwen-plus', got '%s'", router.defaultModel)
	}
}

func TestModelRouterSetBasePath(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	client := NewClient("http://localhost:8888", logger)
	router := NewModelRouter(client, logger)

	router.SetBasePath("/v1/llm")
	if router.basePath != "/v1/llm" {
		t.Errorf("expected basePath '/v1/llm', got '%s'", router.basePath)
	}
}

func TestModelRouterSetDefaultModel(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	client := NewClient("http://localhost:8888", logger)
	router := NewModelRouter(client, logger)

	router.SetDefaultModel("gpt-4")
	if router.defaultModel != "gpt-4" {
		t.Errorf("expected defaultModel 'gpt-4', got '%s'", router.defaultModel)
	}
}

func TestModelRouterRegisterAndGetModel(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))

	// Use a mock server that accepts any request
	server := createMockServer(t)
	defer server.Close()

	client := NewClient(server.URL, logger)
	router := NewModelRouter(client, logger)

	route := &ModelRoute{
		ModelID:     "test-model",
		Provider:    "qwen",
		UpstreamURL: "https://api.example.com",
		Enabled:     true,
		Priority:    1,
	}

	err := router.RegisterModel(context.Background(), route)
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}

	// Verify model is registered
	retrieved, ok := router.GetModel("test-model")
	if !ok {
		t.Fatal("expected to find registered model")
	}
	if retrieved.ModelID != "test-model" {
		t.Errorf("expected modelID 'test-model', got '%s'", retrieved.ModelID)
	}
	if retrieved.Provider != "qwen" {
		t.Errorf("expected provider 'qwen', got '%s'", retrieved.Provider)
	}
}

func TestModelRouterListModels(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))

	server := createMockServer(t)
	defer server.Close()

	client := NewClient(server.URL, logger)
	router := NewModelRouter(client, logger)

	// Register multiple models
	models := []*ModelRoute{
		{ModelID: "model-1", Provider: "qwen", Enabled: true},
		{ModelID: "model-2", Provider: "wenxin", Enabled: true},
		{ModelID: "model-3", Provider: "zhipu", Enabled: false},
	}

	for _, m := range models {
		router.RegisterModel(context.Background(), m)
	}

	list := router.ListModels()
	if len(list) != 3 {
		t.Errorf("expected 3 models, got %d", len(list))
	}
}

func TestModelRouterUnregisterModel(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))

	server := createMockServer(t)
	defer server.Close()

	client := NewClient(server.URL, logger)
	router := NewModelRouter(client, logger)

	route := &ModelRoute{
		ModelID:  "to-delete",
		Provider: "qwen",
		Enabled:  true,
	}

	router.RegisterModel(context.Background(), route)

	// Verify it exists
	_, ok := router.GetModel("to-delete")
	if !ok {
		t.Fatal("expected model to be registered")
	}

	// Unregister
	err := router.UnregisterModel(context.Background(), "to-delete")
	if err != nil {
		t.Errorf("expected no error, got %v", err)
	}

	// Verify it's gone
	_, ok = router.GetModel("to-delete")
	if ok {
		t.Error("expected model to be unregistered")
	}
}

func TestModelRouterGetGatewayEndpoint(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	client := NewClient("http://localhost:8888", logger)
	router := NewModelRouter(client, logger)

	tests := []struct {
		modelID  string
		expected string
	}{
		{"qwen-plus", "/llm/models/qwen-plus"},
		{"gpt-4", "/llm/models/gpt-4"},
		{"", "/llm/models/qwen-plus"}, // Should use default
	}

	for _, tc := range tests {
		result := router.GetGatewayEndpoint(tc.modelID)
		if result != tc.expected {
			t.Errorf("GetGatewayEndpoint(%q): expected '%s', got '%s'", tc.modelID, tc.expected, result)
		}
	}
}

func TestModelRouterGetDefaultModel(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	client := NewClient("http://localhost:8888", logger)
	router := NewModelRouter(client, logger)

	if router.GetDefaultModel() != "qwen-plus" {
		t.Errorf("expected default model 'qwen-plus', got '%s'", router.GetDefaultModel())
	}

	router.SetDefaultModel("gpt-4")
	if router.GetDefaultModel() != "gpt-4" {
		t.Errorf("expected default model 'gpt-4', got '%s'", router.GetDefaultModel())
	}
}

func TestModelRouteWithRateLimit(t *testing.T) {
	route := &ModelRoute{
		ModelID:  "rate-limited",
		Provider: "qwen",
		Enabled:  true,
		RateLimit: &ModelRateLimit{
			TokensPerMinute:   100000,
			RequestsPerMinute: 60,
			Burst:             10,
		},
	}

	if route.RateLimit == nil {
		t.Fatal("expected rate limit to be set")
	}
	if route.RateLimit.TokensPerMinute != 100000 {
		t.Errorf("expected 100000 tokens/min, got %d", route.RateLimit.TokensPerMinute)
	}
}

func TestModelRouteWithFallback(t *testing.T) {
	route := &ModelRoute{
		ModelID:  "with-fallback",
		Provider: "qwen",
		Enabled:  true,
		Fallback: &ModelFallback{
			Enabled:       true,
			Models:        []string{"wenxin", "zhipu"},
			RetryAttempts: 3,
			Conditions:    []string{"timeout", "rate_limit"},
		},
	}

	if route.Fallback == nil {
		t.Fatal("expected fallback to be set")
	}
	if !route.Fallback.Enabled {
		t.Error("expected fallback to be enabled")
	}
	if len(route.Fallback.Models) != 2 {
		t.Errorf("expected 2 fallback models, got %d", len(route.Fallback.Models))
	}
}
