package gateway

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
)

// ModelRoute defines routing to an LLM provider through Higress.
// This enables centralized LLM traffic management including:
// - Load balancing across multiple model instances
// - Rate limiting per model/tenant
// - Failover to backup providers
// - Token usage tracking
type ModelRoute struct {
	Name        string            `json:"name"`
	ModelID     string            `json:"model_id"`
	Provider    string            `json:"provider"` // "qwen", "wenxin", "zhipu", "openai-compat"
	UpstreamURL string            `json:"upstream_url"`
	APIKey      string            `json:"api_key"`
	Priority    int               `json:"priority"`
	Enabled     bool              `json:"enabled"`
	RateLimit   *ModelRateLimit   `json:"rate_limit,omitempty"`
	Fallback    *ModelFallback    `json:"fallback,omitempty"`
	Transform   *RequestTransform `json:"transform,omitempty"`
	Labels      map[string]string `json:"labels,omitempty"`
}

// ModelRateLimit defines rate limiting for a model route.
type ModelRateLimit struct {
	TokensPerMinute   int `json:"tokens_per_minute"`
	RequestsPerMinute int `json:"requests_per_minute"`
	Burst             int `json:"burst"`
}

// ModelFallback defines fallback behavior when primary model fails.
type ModelFallback struct {
	Enabled       bool     `json:"enabled"`
	Models        []string `json:"models"` // Ordered list of fallback models
	RetryAttempts int      `json:"retry_attempts"`
	Conditions    []string `json:"conditions"` // "timeout", "rate_limit", "error"
}

// RequestTransform defines how to transform requests before forwarding.
type RequestTransform struct {
	AddHeaders    map[string]string `json:"add_headers,omitempty"`
	RemoveHeaders []string          `json:"remove_headers,omitempty"`
	PathRewrite   string            `json:"path_rewrite,omitempty"`
}

// ModelRouter manages LLM model routing through Higress.
// It serves as the central control plane for all LLM API traffic,
// ensuring consistent routing, rate limiting, and failover across
// the ResolveAgent platform.
type ModelRouter struct {
	client       *Client
	logger       *slog.Logger
	basePath     string
	defaultModel string

	mu     sync.RWMutex
	routes map[string]*ModelRoute
}

// NewModelRouter creates a new model router.
func NewModelRouter(client *Client, logger *slog.Logger) *ModelRouter {
	return &ModelRouter{
		client:       client,
		logger:       logger,
		basePath:     "/llm",
		defaultModel: "qwen-plus",
		routes:       make(map[string]*ModelRoute),
	}
}

// SetBasePath sets the base path for LLM routes.
func (m *ModelRouter) SetBasePath(path string) {
	m.basePath = path
}

// SetDefaultModel sets the default model for routing.
func (m *ModelRouter) SetDefaultModel(model string) {
	m.defaultModel = model
}

// RegisterModel registers a new model route.
func (m *ModelRouter) RegisterModel(ctx context.Context, route *ModelRoute) error {
	m.mu.Lock()
	m.routes[route.ModelID] = route
	m.mu.Unlock()

	// Create Higress route for this model
	higressRoute := m.modelToHigressRoute(route)
	if err := m.client.CreateRoute(ctx, higressRoute); err != nil {
		// If route exists, try update
		if updateErr := m.client.UpdateRoute(ctx, higressRoute); updateErr != nil {
			return fmt.Errorf("registering model route: %w", err)
		}
	}

	m.logger.Info("Model route registered",
		"model", route.ModelID,
		"provider", route.Provider,
		"upstream", route.UpstreamURL,
	)
	return nil
}

// UnregisterModel removes a model route.
func (m *ModelRouter) UnregisterModel(ctx context.Context, modelID string) error {
	m.mu.Lock()
	delete(m.routes, modelID)
	m.mu.Unlock()

	routeName := fmt.Sprintf("llm-%s", modelID)
	if err := m.client.DeleteRoute(ctx, routeName); err != nil {
		return fmt.Errorf("unregistering model route: %w", err)
	}

	m.logger.Info("Model route unregistered", "model", modelID)
	return nil
}

// GetModel returns a registered model route.
func (m *ModelRouter) GetModel(modelID string) (*ModelRoute, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	route, ok := m.routes[modelID]
	return route, ok
}

// ListModels returns all registered model routes.
func (m *ModelRouter) ListModels() []*ModelRoute {
	m.mu.RLock()
	defer m.mu.RUnlock()

	routes := make([]*ModelRoute, 0, len(m.routes))
	for _, route := range m.routes {
		routes = append(routes, route)
	}
	return routes
}

// SyncRoutes synchronizes all model routes with the Higress gateway.
func (m *ModelRouter) SyncRoutes(ctx context.Context, routes []ModelRoute) error {
	m.logger.Info("Syncing model routes", "count", len(routes))

	for _, route := range routes {
		routeCopy := route
		if err := m.RegisterModel(ctx, &routeCopy); err != nil {
			m.logger.Error("Failed to sync model route", "model", route.ModelID, "error", err)
			continue
		}
	}

	// Register default provider routes for known providers
	if err := m.syncProviderRoutes(ctx); err != nil {
		m.logger.Warn("Failed to sync provider routes", "error", err)
	}

	return nil
}

func (m *ModelRouter) syncProviderRoutes(ctx context.Context) error {
	// Provider base routes for API compatibility
	providers := []struct {
		name     string
		path     string
		upstream string
	}{
		{"qwen", "/v1/chat/completions", "https://dashscope.aliyuncs.com"},
		{"wenxin", "/rpc/2.0/ai_custom/v1/wenxinworkshop/chat", "https://aip.baidubce.com"},
		{"zhipu", "/api/paas/v4/chat/completions", "https://open.bigmodel.cn"},
	}

	for _, p := range providers {
		route := &HigressRoute{
			Name:     fmt.Sprintf("llm-provider-%s", p.name),
			Path:     fmt.Sprintf("%s/%s", m.basePath, p.name),
			PathType: "prefix",
			Methods:  []string{"POST"},
			Upstream: RouteUpstream{
				ServiceHost: p.upstream,
				ServicePort: 443,
			},
			Rewrite: &RouteRewrite{
				Path: p.path,
			},
			Enabled: true,
			Labels: map[string]string{
				"component": "llm",
				"provider":  p.name,
			},
		}

		if err := m.client.CreateRoute(ctx, route); err != nil {
			m.client.UpdateRoute(ctx, route)
		}
	}

	return nil
}

func (m *ModelRouter) modelToHigressRoute(route *ModelRoute) *HigressRoute {
	higressRoute := &HigressRoute{
		Name:     fmt.Sprintf("llm-%s", route.ModelID),
		Path:     fmt.Sprintf("%s/models/%s", m.basePath, route.ModelID),
		PathType: "prefix",
		Methods:  []string{"POST"},
		Upstream: RouteUpstream{
			ServiceHost: route.UpstreamURL,
			ServicePort: 443,
		},
		Enabled: route.Enabled,
		Labels: map[string]string{
			"component": "llm",
			"model":     route.ModelID,
			"provider":  route.Provider,
		},
	}

	// Add rate limiting if configured
	if route.RateLimit != nil {
		higressRoute.RateLimiter = &RateLimiter{
			RequestsPerSecond: route.RateLimit.RequestsPerMinute / 60,
			Burst:             route.RateLimit.Burst,
			Key:               "header:Authorization",
		}
	}

	// Add retry policy for failover
	if route.Fallback != nil && route.Fallback.Enabled {
		higressRoute.Retry = &RetryPolicy{
			Attempts:      route.Fallback.RetryAttempts,
			PerTryTimeout: "30s",
			RetryOn:       "5xx,reset,connect-failure",
		}
	}

	// Apply request transforms
	if route.Transform != nil {
		higressRoute.Rewrite = &RouteRewrite{
			Path:    route.Transform.PathRewrite,
			Headers: route.Transform.AddHeaders,
		}
	}

	return higressRoute
}

// GetDefaultModel returns the default model ID.
func (m *ModelRouter) GetDefaultModel() string {
	return m.defaultModel
}

// GetGatewayEndpoint returns the Higress gateway endpoint for LLM calls.
func (m *ModelRouter) GetGatewayEndpoint(modelID string) string {
	if modelID == "" {
		modelID = m.defaultModel
	}
	return fmt.Sprintf("%s/models/%s", m.basePath, modelID)
}
