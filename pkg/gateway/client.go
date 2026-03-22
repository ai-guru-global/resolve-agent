package gateway

import (
	"context"
	"log/slog"
	"net/http"
)

// Client communicates with the Higress admin API.
type Client struct {
	adminURL   string
	httpClient *http.Client
	logger     *slog.Logger
}

// NewClient creates a new Higress gateway client.
func NewClient(adminURL string, logger *slog.Logger) *Client {
	return &Client{
		adminURL:   adminURL,
		httpClient: &http.Client{},
		logger:     logger,
	}
}

// Health checks if the Higress gateway is reachable.
func (c *Client) Health(ctx context.Context) error {
	// TODO: Implement health check against Higress admin API
	c.logger.Debug("Checking Higress gateway health", "url", c.adminURL)
	return nil
}
