package registry

import (
	"context"
	"sync"

	"github.com/ai-guru-global/resolve-agent/pkg/errors"
)

// WorkflowDefinition represents a stored FTA workflow.
type WorkflowDefinition struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Type        string         `json:"type"`
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

// Create stores a new workflow definition and rejects duplicate IDs.
func (r *InMemoryWorkflowRegistry) Create(_ context.Context, workflow *WorkflowDefinition) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.workflows[workflow.ID]; exists {
		return errors.AlreadyExists("workflow", workflow.ID)
	}

	r.workflows[workflow.ID] = workflow
	return nil
}

// Get returns the workflow definition with the given ID, or an error if
// absent.
func (r *InMemoryWorkflowRegistry) Get(_ context.Context, id string) (*WorkflowDefinition, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	wf, ok := r.workflows[id]
	if !ok {
		return nil, errors.NotFound("workflow", id)
	}
	return wf, nil
}

// List returns workflow definitions, paginated, with the total count.
func (r *InMemoryWorkflowRegistry) List(_ context.Context, opts ListOptions) ([]*WorkflowDefinition, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	workflows := make([]*WorkflowDefinition, 0, len(r.workflows))
	for _, w := range r.workflows {
		workflows = append(workflows, w)
	}

	total := len(workflows)
	if offset >= total {
		return []*WorkflowDefinition{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return workflows[offset:end], total, nil
}

// Update replaces an existing workflow definition and reports an error if
// absent.
func (r *InMemoryWorkflowRegistry) Update(_ context.Context, workflow *WorkflowDefinition) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.workflows[workflow.ID]; !exists {
		return errors.NotFound("workflow", workflow.ID)
	}

	r.workflows[workflow.ID] = workflow
	return nil
}

// Delete removes the workflow definition with the given ID.
func (r *InMemoryWorkflowRegistry) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.workflows, id)
	return nil
}
