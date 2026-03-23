package service

import (
	"context"
	"log/slog"

	"github.com/ai-guru-global/resolve-agent/pkg/gateway"
	"github.com/ai-guru-global/resolve-agent/pkg/registry"
)

// RegistryService provides gRPC access to the Go Registry.
// This service implements the RegistryService proto definition,
// allowing Python runtime to query agents, skills, workflows, and model routes.
//
// Architecture:
//
//	┌─────────────────────────────────────────────────────────────────┐
//	│                    Go Platform Service                          │
//	│  ┌─────────────────────────────────────────────────────────┐   │
//	│  │                   RegistryService                         │   │
//	│  │  - GetAgent, ListAgents                                   │   │
//	│  │  - GetSkill, ListSkills                                   │   │
//	│  │  - GetModelRoute, ListModelRoutes                         │   │
//	│  │  - GetWorkflow, ListWorkflows                             │   │
//	│  │  - WatchRegistry (streaming)                              │   │
//	│  └─────────────────────────────────────────────────────────┘   │
//	│                          │                                       │
//	│    Uses internal registries as data source                       │
//	│                          │                                       │
//	│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
//	│  │   Agent     │  │    Skill    │  │    Model Router         │  │
//	│  │  Registry   │  │  Registry   │  │  (Higress Integration)  │  │
//	│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
//	└─────────────────────────────────────────────────────────────────┘
type RegistryService struct {
	agentRegistry    registry.AgentRegistry
	skillRegistry    registry.SkillRegistry
	workflowRegistry registry.WorkflowRegistry
	modelRouter      *gateway.ModelRouter
	logger           *slog.Logger
}

// NewRegistryService creates a new RegistryService.
func NewRegistryService(
	agentRegistry registry.AgentRegistry,
	skillRegistry registry.SkillRegistry,
	workflowRegistry registry.WorkflowRegistry,
	modelRouter *gateway.ModelRouter,
	logger *slog.Logger,
) *RegistryService {
	return &RegistryService{
		agentRegistry:    agentRegistry,
		skillRegistry:    skillRegistry,
		workflowRegistry: workflowRegistry,
		modelRouter:      modelRouter,
		logger:           logger,
	}
}

// RegistryAgentResponse represents an agent response for gRPC.
type RegistryAgentResponse struct {
	ID          string
	Name        string
	Description string
	Type        string
	Status      string
	Config      map[string]any
	Labels      map[string]string
}

// RegistrySkillResponse represents a skill response for gRPC.
type RegistrySkillResponse struct {
	Name        string
	Version     string
	Description string
	Author      string
	Status      string
	SourceType  string
	SourceURI   string
	Labels      map[string]string
}

// ModelRouteResponse represents a model route response for gRPC.
type ModelRouteResponse struct {
	ModelID         string
	Provider        string
	GatewayEndpoint string
	Enabled         bool
	Priority        int
}

// WorkflowResponse represents a workflow response for gRPC.
type WorkflowResponse struct {
	ID          string
	Name        string
	Description string
	Status      string
}

// GetAgent retrieves an agent by ID.
func (s *RegistryService) GetAgent(ctx context.Context, id string) (*RegistryAgentResponse, error) {
	agent, err := s.agentRegistry.Get(ctx, id)
	if err != nil {
		return nil, err
	}

	return &RegistryAgentResponse{
		ID:          agent.ID,
		Name:        agent.Name,
		Description: agent.Description,
		Type:        agent.Type,
		Status:      agent.Status,
		Config:      agent.Config,
		Labels:      agent.Labels,
	}, nil
}

// ListAgents lists all registered agents.
func (s *RegistryService) ListAgents(ctx context.Context, typeFilter, statusFilter string) ([]*RegistryAgentResponse, error) {
	agents, _, err := s.agentRegistry.List(ctx, registry.ListOptions{
		Filter: map[string]string{
			"type":   typeFilter,
			"status": statusFilter,
		},
	})
	if err != nil {
		return nil, err
	}

	result := make([]*RegistryAgentResponse, 0, len(agents))
	for _, agent := range agents {
		result = append(result, &RegistryAgentResponse{
			ID:          agent.ID,
			Name:        agent.Name,
			Description: agent.Description,
			Type:        agent.Type,
			Status:      agent.Status,
			Config:      agent.Config,
			Labels:      agent.Labels,
		})
	}

	return result, nil
}

// GetSkill retrieves a skill by name.
func (s *RegistryService) GetSkill(ctx context.Context, name string) (*RegistrySkillResponse, error) {
	skill, err := s.skillRegistry.Get(ctx, name)
	if err != nil {
		return nil, err
	}

	return &RegistrySkillResponse{
		Name:        skill.Name,
		Version:     skill.Version,
		Description: skill.Description,
		Author:      skill.Author,
		Status:      skill.Status,
		SourceType:  skill.SourceType,
		SourceURI:   skill.SourceURI,
		Labels:      skill.Labels,
	}, nil
}

// ListSkills lists all registered skills.
func (s *RegistryService) ListSkills(ctx context.Context, statusFilter string) ([]*RegistrySkillResponse, error) {
	skills, _, err := s.skillRegistry.List(ctx, registry.ListOptions{
		Filter: map[string]string{
			"status": statusFilter,
		},
	})
	if err != nil {
		return nil, err
	}

	result := make([]*RegistrySkillResponse, 0, len(skills))
	for _, skill := range skills {
		result = append(result, &RegistrySkillResponse{
			Name:        skill.Name,
			Version:     skill.Version,
			Description: skill.Description,
			Author:      skill.Author,
			Status:      skill.Status,
			SourceType:  skill.SourceType,
			SourceURI:   skill.SourceURI,
			Labels:      skill.Labels,
		})
	}

	return result, nil
}

// GetModelRoute retrieves model routing information.
func (s *RegistryService) GetModelRoute(_ context.Context, modelID string) (*ModelRouteResponse, error) {
	if s.modelRouter == nil {
		return nil, nil
	}

	route, ok := s.modelRouter.GetModel(modelID)
	if !ok {
		// Return default route structure
		return &ModelRouteResponse{
			ModelID:         modelID,
			Provider:        "qwen",
			GatewayEndpoint: s.modelRouter.GetGatewayEndpoint(modelID),
			Enabled:         true,
		}, nil
	}

	return &ModelRouteResponse{
		ModelID:         route.ModelID,
		Provider:        route.Provider,
		GatewayEndpoint: s.modelRouter.GetGatewayEndpoint(route.ModelID),
		Enabled:         route.Enabled,
		Priority:        route.Priority,
	}, nil
}

// ListModelRoutes lists all available model routes.
func (s *RegistryService) ListModelRoutes(_ context.Context, providerFilter string, enabledOnly bool) ([]*ModelRouteResponse, error) {
	if s.modelRouter == nil {
		return nil, nil
	}

	routes := s.modelRouter.ListModels()
	result := make([]*ModelRouteResponse, 0, len(routes))

	for _, route := range routes {
		// Apply filters
		if providerFilter != "" && route.Provider != providerFilter {
			continue
		}
		if enabledOnly && !route.Enabled {
			continue
		}

		result = append(result, &ModelRouteResponse{
			ModelID:         route.ModelID,
			Provider:        route.Provider,
			GatewayEndpoint: s.modelRouter.GetGatewayEndpoint(route.ModelID),
			Enabled:         route.Enabled,
			Priority:        route.Priority,
		})
	}

	return result, nil
}

// GetWorkflow retrieves a workflow by ID.
func (s *RegistryService) GetWorkflow(ctx context.Context, id string) (*WorkflowResponse, error) {
	workflow, err := s.workflowRegistry.Get(ctx, id)
	if err != nil {
		return nil, err
	}

	return &WorkflowResponse{
		ID:          workflow.ID,
		Name:        workflow.Name,
		Description: workflow.Description,
		Status:      workflow.Status,
	}, nil
}

// ListWorkflows lists all registered workflows.
func (s *RegistryService) ListWorkflows(ctx context.Context, typeFilter string) ([]*WorkflowResponse, error) {
	workflows, _, err := s.workflowRegistry.List(ctx, registry.ListOptions{
		Filter: map[string]string{
			"type": typeFilter,
		},
	})
	if err != nil {
		return nil, err
	}

	result := make([]*WorkflowResponse, 0, len(workflows))
	for _, wf := range workflows {
		result = append(result, &WorkflowResponse{
			ID:          wf.ID,
			Name:        wf.Name,
			Description: wf.Description,
			Status:      wf.Status,
		})
	}

	return result, nil
}

// GetDefaultModel returns the default model ID from the model router.
func (s *RegistryService) GetDefaultModel() string {
	if s.modelRouter == nil {
		return "qwen-plus"
	}
	return s.modelRouter.GetDefaultModel()
}

// GetGatewayBasePath returns the base path for LLM routes.
func (s *RegistryService) GetGatewayBasePath() string {
	return "/llm"
}
