package gateway

import (
	"context"
	"log/slog"
)

// ModelRoute defines routing to an LLM provider through Higress.
type ModelRoute struct {
	Name        string `json:"name"`
	ModelID     string `json:"model_id"`
	Provider    string `json:"provider"` // "qwen", "wenxin", "zhipu", "openai-compat"
	UpstreamURL string `json:"upstream_url"`
	APIKey      string `json:"api_key"`
	Priority    int    `json:"priority"`
	Enabled     bool   `json:"enabled"`
}

// ModelRouter manages LLM model routing through Higress.
type ModelRouter struct {
	client *Client
	logger *slog.Logger
}

// NewModelRouter creates a new model router.
func NewModelRouter(client *Client, logger *slog.Logger) *ModelRouter {
	return &ModelRouter{
		client: client,
		logger: logger,
	}
}

// SyncRoutes synchronizes model routes with the Higress gateway.
func (m *ModelRouter) SyncRoutes(ctx context.Context, routes []ModelRoute) error {
	// TODO: Implement Higress route synchronization
	m.logger.Info("Syncing model routes", "count", len(routes))
	return nil
}
