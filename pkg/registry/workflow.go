package registry

import (
	"context"
	"fmt"
	"sync"
)

// WorkflowDefinition represents a stored FTA workflow.
type WorkflowDefinition struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Tree        map[string]any `json:"tree"`
	Status      string         `json:"status"`
	Version     int64          `json:"version"`
}

// WorkflowRegistry manages FTA workflow definitions.
type WorkflowRegistry interface {
	Create(ctx context.Context, workflow *WorkflowDefinition) error
	Get(ctx context.Context, id string) (*WorkflowDefinition, error)
	List(ctx context.Context, opts ListOptions) ([]*WorkflowDefinition, int, error)
	Update(ctx context.Context, workflow *WorkflowDefinition) error
	Delete(ctx context.Context, id string) error
}

// InMemoryWorkflowRegistry is an in-memory implementation for development.
type InMemoryWorkflowRegistry struct {
	mu        sync.RWMutex
	workflows map[string]*WorkflowDefinition
}

// NewInMemoryWorkflowRegistry creates a new in-memory workflow registry.
func NewInMemoryWorkflowRegistry() *InMemoryWorkflowRegistry {
	return &InMemoryWorkflowRegistry{
		workflows: make(map[string]*WorkflowDefinition),
	}
}

func (r *InMemoryWorkflowRegistry) Create(_ context.Context, workflow *WorkflowDefinition) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.workflows[workflow.ID]; exists {
		return fmt.Errorf("workflow %s already exists", workflow.ID)
	}

	r.workflows[workflow.ID] = workflow
	return nil
}

func (r *InMemoryWorkflowRegistry) Get(_ context.Context, id string) (*WorkflowDefinition, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	wf, ok := r.workflows[id]
	if !ok {
		return nil, fmt.Errorf("workflow %s not found", id)
	}
	return wf, nil
}

func (r *InMemoryWorkflowRegistry) List(_ context.Context, _ ListOptions) ([]*WorkflowDefinition, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	workflows := make([]*WorkflowDefinition, 0, len(r.workflows))
	for _, w := range r.workflows {
		workflows = append(workflows, w)
	}
	return workflows, len(workflows), nil
}

func (r *InMemoryWorkflowRegistry) Update(_ context.Context, workflow *WorkflowDefinition) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.workflows[workflow.ID]; !exists {
		return fmt.Errorf("workflow %s not found", workflow.ID)
	}

	r.workflows[workflow.ID] = workflow
	return nil
}

func (r *InMemoryWorkflowRegistry) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.workflows, id)
	return nil
}
