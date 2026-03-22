package registry

import (
	"context"
	"fmt"
	"sync"
)

// AgentDefinition represents a stored agent definition.
type AgentDefinition struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Type        string            `json:"type"`
	Config      map[string]any    `json:"config"`
	Status      string            `json:"status"`
	Labels      map[string]string `json:"labels,omitempty"`
	Version     int64             `json:"version"`
}

// AgentRegistry manages agent definitions.
type AgentRegistry interface {
	Create(ctx context.Context, agent *AgentDefinition) error
	Get(ctx context.Context, id string) (*AgentDefinition, error)
	List(ctx context.Context, opts ListOptions) ([]*AgentDefinition, int, error)
	Update(ctx context.Context, agent *AgentDefinition) error
	Delete(ctx context.Context, id string) error
}

// InMemoryAgentRegistry is an in-memory implementation for development.
type InMemoryAgentRegistry struct {
	mu     sync.RWMutex
	agents map[string]*AgentDefinition
}

// NewInMemoryAgentRegistry creates a new in-memory agent registry.
func NewInMemoryAgentRegistry() *InMemoryAgentRegistry {
	return &InMemoryAgentRegistry{
		agents: make(map[string]*AgentDefinition),
	}
}

func (r *InMemoryAgentRegistry) Create(_ context.Context, agent *AgentDefinition) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.agents[agent.ID]; exists {
		return fmt.Errorf("agent %s already exists", agent.ID)
	}

	r.agents[agent.ID] = agent
	return nil
}

func (r *InMemoryAgentRegistry) Get(_ context.Context, id string) (*AgentDefinition, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	agent, ok := r.agents[id]
	if !ok {
		return nil, fmt.Errorf("agent %s not found", id)
	}
	return agent, nil
}

func (r *InMemoryAgentRegistry) List(_ context.Context, _ ListOptions) ([]*AgentDefinition, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	agents := make([]*AgentDefinition, 0, len(r.agents))
	for _, a := range r.agents {
		agents = append(agents, a)
	}
	return agents, len(agents), nil
}

func (r *InMemoryAgentRegistry) Update(_ context.Context, agent *AgentDefinition) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.agents[agent.ID]; !exists {
		return fmt.Errorf("agent %s not found", agent.ID)
	}

	r.agents[agent.ID] = agent
	return nil
}

func (r *InMemoryAgentRegistry) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.agents, id)
	return nil
}

// ListOptions contains pagination and filter parameters.
type ListOptions struct {
	PageSize  int
	PageToken string
	Filter    map[string]string
}
