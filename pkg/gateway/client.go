package gateway

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"
)

// Client communicates with the Higress admin API.
// It serves as the single point of integration between ResolveAgent
// and Higress gateway for route management, service discovery, and model routing.
type Client struct {
	adminURL   string
	httpClient *http.Client
	logger     *slog.Logger
}

// NewClient creates a new Higress gateway client.
func NewClient(adminURL string, logger *slog.Logger) *Client {
	return &Client{
		adminURL: adminURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		logger: logger,
	}
}

// Health checks if the Higress gateway is reachable.
func (c *Client) Health(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.adminURL+"/health", nil)
	if err != nil {
		return fmt.Errorf("creating health request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		c.logger.Warn("Higress gateway health check failed", "url", c.adminURL, "error", err)
		return fmt.Errorf("health check failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("gateway unhealthy: status %d", resp.StatusCode)
	}

	c.logger.Debug("Higress gateway health check passed", "url", c.adminURL)
	return nil
}

// HigressRoute represents a route configuration in Higress.
type HigressRoute struct {
	Name        string            `json:"name"`
	Path        string            `json:"path"`
	PathType    string            `json:"path_type"` // "prefix", "exact", "regex"
	Methods     []string          `json:"methods,omitempty"`
	Upstream    RouteUpstream     `json:"upstream"`
	Headers     map[string]string `json:"headers,omitempty"`
	Rewrite     *RouteRewrite     `json:"rewrite,omitempty"`
	RateLimiter *RateLimiter      `json:"rate_limiter,omitempty"`
	Retry       *RetryPolicy      `json:"retry,omitempty"`
	Timeout     string            `json:"timeout,omitempty"`
	Enabled     bool              `json:"enabled"`
	Labels      map[string]string `json:"labels,omitempty"`
}

// RouteUpstream defines the backend service for a route.
type RouteUpstream struct {
	ServiceName  string `json:"service_name"`
	ServicePort  int    `json:"service_port"`
	ServiceHost  string `json:"service_host,omitempty"`
	LoadBalancer string `json:"load_balancer,omitempty"` // "round_robin", "least_conn", "random"
}

// RouteRewrite defines URL rewrite rules.
type RouteRewrite struct {
	Path    string            `json:"path,omitempty"`
	Host    string            `json:"host,omitempty"`
	Headers map[string]string `json:"headers,omitempty"`
}

// RateLimiter defines rate limiting configuration.
type RateLimiter struct {
	RequestsPerSecond int    `json:"requests_per_second"`
	Burst             int    `json:"burst"`
	Key               string `json:"key"` // "ip", "header:X-API-Key", "jwt:sub"
}

// RetryPolicy defines retry behavior.
type RetryPolicy struct {
	Attempts      int    `json:"attempts"`
	PerTryTimeout string `json:"per_try_timeout"`
	RetryOn       string `json:"retry_on"` // "5xx", "reset", "connect-failure"
}

// CreateRoute creates a new route in Higress.
func (c *Client) CreateRoute(ctx context.Context, route *HigressRoute) error {
	return c.doRouteRequest(ctx, http.MethodPost, "/routes", route)
}

// UpdateRoute updates an existing route in Higress.
func (c *Client) UpdateRoute(ctx context.Context, route *HigressRoute) error {
	return c.doRouteRequest(ctx, http.MethodPut, "/routes/"+route.Name, route)
}

// DeleteRoute deletes a route from Higress.
func (c *Client) DeleteRoute(ctx context.Context, routeName string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, c.adminURL+"/routes/"+routeName, nil)
	if err != nil {
		return fmt.Errorf("creating delete request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("deleting route: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		return c.parseError(resp)
	}

	c.logger.Info("Route deleted from Higress", "route", routeName)
	return nil
}

// GetRoute retrieves a route from Higress.
func (c *Client) GetRoute(ctx context.Context, routeName string) (*HigressRoute, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.adminURL+"/routes/"+routeName, nil)
	if err != nil {
		return nil, fmt.Errorf("creating get request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("getting route: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}

	if resp.StatusCode != http.StatusOK {
		return nil, c.parseError(resp)
	}

	var route HigressRoute
	if err := json.NewDecoder(resp.Body).Decode(&route); err != nil {
		return nil, fmt.Errorf("decoding route: %w", err)
	}

	return &route, nil
}

// ListRoutes lists all routes from Higress.
func (c *Client) ListRoutes(ctx context.Context) ([]*HigressRoute, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.adminURL+"/routes", nil)
	if err != nil {
		return nil, fmt.Errorf("creating list request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("listing routes: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, c.parseError(resp)
	}

	var routes []*HigressRoute
	if err := json.NewDecoder(resp.Body).Decode(&routes); err != nil {
		return nil, fmt.Errorf("decoding routes: %w", err)
	}

	return routes, nil
}

// HigressService represents a service registration in Higress.
type HigressService struct {
	Name      string            `json:"name"`
	Namespace string            `json:"namespace,omitempty"`
	Host      string            `json:"host"`
	Port      int               `json:"port"`
	Protocol  string            `json:"protocol"` // "http", "grpc", "http2"
	Labels    map[string]string `json:"labels,omitempty"`
}

// RegisterService registers a service with Higress.
func (c *Client) RegisterService(ctx context.Context, service *HigressService) error {
	body, err := json.Marshal(service)
	if err != nil {
		return fmt.Errorf("marshaling service: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.adminURL+"/services", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("registering service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return c.parseError(resp)
	}

	c.logger.Info("Service registered with Higress", "service", service.Name, "host", service.Host)
	return nil
}

// DeregisterService removes a service from Higress.
func (c *Client) DeregisterService(ctx context.Context, serviceName string) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, c.adminURL+"/services/"+serviceName, nil)
	if err != nil {
		return fmt.Errorf("creating deregister request: %w", err)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("deregistering service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		return c.parseError(resp)
	}

	c.logger.Info("Service deregistered from Higress", "service", serviceName)
	return nil
}

func (c *Client) doRouteRequest(ctx context.Context, method, path string, route *HigressRoute) error {
	body, err := json.Marshal(route)
	if err != nil {
		return fmt.Errorf("marshaling route: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.adminURL+path, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("sending request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return c.parseError(resp)
	}

	c.logger.Info("Route operation successful", "method", method, "route", route.Name)
	return nil
}

func (c *Client) parseError(resp *http.Response) error {
	body, _ := io.ReadAll(resp.Body)
	return fmt.Errorf("gateway error (status %d): %s", resp.StatusCode, string(body))
}
