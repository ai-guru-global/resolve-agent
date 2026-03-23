package gateway

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
)

// RouteSync synchronizes API routes with the Higress gateway.
// It acts as the bridge between Go Registry (single source of truth)
// and Higress gateway, ensuring all registered services are exposed
// through the gateway with proper routing rules.
type RouteSync struct {
	client        *Client
	agentRegistry registry.AgentRegistry
	skillRegistry registry.SkillRegistry
	logger        *slog.Logger

	syncInterval time.Duration
	mu           sync.RWMutex
	syncedRoutes map[string]string // routeName -> version/hash
	stopCh       chan struct{}
}

// RouteSyncConfig configures the route synchronizer.
type RouteSyncConfig struct {
	SyncInterval  time.Duration
	AgentBasePath string
	SkillBasePath string
	RAGBasePath   string
}

// DefaultRouteSyncConfig returns default configuration.
func DefaultRouteSyncConfig() RouteSyncConfig {
	return RouteSyncConfig{
		SyncInterval:  30 * time.Second,
		AgentBasePath: "/api/v1/agents",
		SkillBasePath: "/api/v1/skills",
		RAGBasePath:   "/api/v1/rag",
	}
}

// NewRouteSync creates a new route synchronizer.
func NewRouteSync(
	client *Client,
	agentRegistry registry.AgentRegistry,
	skillRegistry registry.SkillRegistry,
	logger *slog.Logger,
) *RouteSync {
	return &RouteSync{
		client:        client,
		agentRegistry: agentRegistry,
		skillRegistry: skillRegistry,
		logger:        logger,
		syncInterval:  30 * time.Second,
		syncedRoutes:  make(map[string]string),
		stopCh:        make(chan struct{}),
	}
}

// SetSyncInterval sets the synchronization interval.
func (rs *RouteSync) SetSyncInterval(interval time.Duration) {
	rs.syncInterval = interval
}

// Start begins the periodic route synchronization.
func (rs *RouteSync) Start(ctx context.Context) error {
	rs.logger.Info("Starting route synchronization", "interval", rs.syncInterval)

	// Initial sync
	if err := rs.Sync(ctx); err != nil {
		rs.logger.Warn("Initial route sync failed", "error", err)
	}

	go rs.runSyncLoop(ctx)
	return nil
}

// Stop stops the periodic synchronization.
func (rs *RouteSync) Stop() {
	close(rs.stopCh)
}

func (rs *RouteSync) runSyncLoop(ctx context.Context) {
	ticker := time.NewTicker(rs.syncInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			rs.logger.Info("Route sync stopped: context cancelled")
			return
		case <-rs.stopCh:
			rs.logger.Info("Route sync stopped")
			return
		case <-ticker.C:
			if err := rs.Sync(ctx); err != nil {
				rs.logger.Error("Route sync failed", "error", err)
			}
		}
	}
}

// Sync ensures all platform routes are registered in Higress.
// This is the core method that synchronizes Go Registry with Higress.
func (rs *RouteSync) Sync(ctx context.Context) error {
	rs.logger.Info("Syncing routes with Higress gateway")

	// 1. Sync platform service routes (static routes for API server)
	if err := rs.syncPlatformRoutes(ctx); err != nil {
		return fmt.Errorf("syncing platform routes: %w", err)
	}

	// 2. Sync agent routes from registry
	if err := rs.syncAgentRoutes(ctx); err != nil {
		return fmt.Errorf("syncing agent routes: %w", err)
	}

	// 3. Sync skill routes from registry
	if err := rs.syncSkillRoutes(ctx); err != nil {
		return fmt.Errorf("syncing skill routes: %w", err)
	}

	rs.logger.Info("Route sync completed")
	return nil
}

func (rs *RouteSync) syncPlatformRoutes(ctx context.Context) error {
	// Platform API routes - static routes to the platform service
	platformRoutes := []*HigressRoute{
		{
			Name:     "resolveagent-api-agents",
			Path:     "/api/v1/agents",
			PathType: "prefix",
			Methods:  []string{"GET", "POST", "PUT", "DELETE"},
			Upstream: RouteUpstream{
				ServiceName: "resolveagent-platform",
				ServicePort: 8080,
			},
			Enabled: true,
			Labels:  map[string]string{"component": "platform", "type": "api"},
		},
		{
			Name:     "resolveagent-api-skills",
			Path:     "/api/v1/skills",
			PathType: "prefix",
			Methods:  []string{"GET", "POST", "PUT", "DELETE"},
			Upstream: RouteUpstream{
				ServiceName: "resolveagent-platform",
				ServicePort: 8080,
			},
			Enabled: true,
			Labels:  map[string]string{"component": "platform", "type": "api"},
		},
		{
			Name:     "resolveagent-api-workflows",
			Path:     "/api/v1/workflows",
			PathType: "prefix",
			Methods:  []string{"GET", "POST", "PUT", "DELETE"},
			Upstream: RouteUpstream{
				ServiceName: "resolveagent-platform",
				ServicePort: 8080,
			},
			Enabled: true,
			Labels:  map[string]string{"component": "platform", "type": "api"},
		},
		{
			Name:     "resolveagent-api-rag",
			Path:     "/api/v1/rag",
			PathType: "prefix",
			Methods:  []string{"GET", "POST"},
			Upstream: RouteUpstream{
				ServiceName: "resolveagent-platform",
				ServicePort: 8080,
			},
			Enabled: true,
			Labels:  map[string]string{"component": "platform", "type": "api"},
		},
		{
			Name:     "resolveagent-health",
			Path:     "/health",
			PathType: "exact",
			Methods:  []string{"GET"},
			Upstream: RouteUpstream{
				ServiceName: "resolveagent-platform",
				ServicePort: 8080,
			},
			Enabled: true,
			Labels:  map[string]string{"component": "platform", "type": "health"},
		},
	}

	for _, route := range platformRoutes {
		if err := rs.upsertRoute(ctx, route); err != nil {
			rs.logger.Error("Failed to sync platform route", "route", route.Name, "error", err)
		}
	}

	return nil
}

func (rs *RouteSync) syncAgentRoutes(ctx context.Context) error {
	if rs.agentRegistry == nil {
		return nil
	}

	agents, _, err := rs.agentRegistry.List(ctx, registry.ListOptions{})
	if err != nil {
		return fmt.Errorf("listing agents: %w", err)
	}

	for _, agent := range agents {
		route := &HigressRoute{
			Name:     fmt.Sprintf("agent-%s", agent.ID),
			Path:     fmt.Sprintf("/api/v1/agents/%s/execute", agent.ID),
			PathType: "exact",
			Methods:  []string{"POST"},
			Upstream: RouteUpstream{
				ServiceName:  "resolveagent-runtime",
				ServicePort:  9091,
				LoadBalancer: "round_robin",
			},
			Enabled: agent.Status == "active",
			Labels: map[string]string{
				"component":  "agent",
				"agent_id":   agent.ID,
				"agent_type": agent.Type,
			},
		}

		if err := rs.upsertRoute(ctx, route); err != nil {
			rs.logger.Error("Failed to sync agent route", "agent", agent.ID, "error", err)
		}
	}

	return nil
}

func (rs *RouteSync) syncSkillRoutes(ctx context.Context) error {
	if rs.skillRegistry == nil {
		return nil
	}

	skills, _, err := rs.skillRegistry.List(ctx, registry.ListOptions{})
	if err != nil {
		return fmt.Errorf("listing skills: %w", err)
	}

	for _, skill := range skills {
		route := &HigressRoute{
			Name:     fmt.Sprintf("skill-%s", skill.Name),
			Path:     fmt.Sprintf("/api/v1/skills/%s/execute", skill.Name),
			PathType: "exact",
			Methods:  []string{"POST"},
			Upstream: RouteUpstream{
				ServiceName:  "resolveagent-runtime",
				ServicePort:  9091,
				LoadBalancer: "round_robin",
			},
			Enabled: skill.Status == "ready",
			Labels: map[string]string{
				"component":     "skill",
				"skill_name":    skill.Name,
				"skill_version": skill.Version,
			},
		}

		if err := rs.upsertRoute(ctx, route); err != nil {
			rs.logger.Error("Failed to sync skill route", "skill", skill.Name, "error", err)
		}
	}

	return nil
}

func (rs *RouteSync) upsertRoute(ctx context.Context, route *HigressRoute) error {
	existing, err := rs.client.GetRoute(ctx, route.Name)
	if err != nil {
		return fmt.Errorf("checking existing route: %w", err)
	}

	if existing == nil {
		return rs.client.CreateRoute(ctx, route)
	}

	return rs.client.UpdateRoute(ctx, route)
}

// SyncService registers or updates a service in Higress.
func (rs *RouteSync) SyncService(ctx context.Context, name, host string, port int, protocol string) error {
	service := &HigressService{
		Name:     name,
		Host:     host,
		Port:     port,
		Protocol: protocol,
		Labels:   map[string]string{"managed-by": "resolveagent"},
	}

	return rs.client.RegisterService(ctx, service)
}

// RemoveRoute removes a route from Higress.
func (rs *RouteSync) RemoveRoute(ctx context.Context, routeName string) error {
	return rs.client.DeleteRoute(ctx, routeName)
}
