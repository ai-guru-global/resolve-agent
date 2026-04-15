package registry

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"
)

// HookDefinition represents a lifecycle hook configuration.
type HookDefinition struct {
	ID             string            `json:"id"`
	Name           string            `json:"name"`
	Description    string            `json:"description"`
	HookType       string            `json:"hook_type"`       // "pre" or "post"
	TriggerPoint   string            `json:"trigger_point"`   // "agent.execute", "skill.invoke", "workflow.run"
	TargetID       string            `json:"target_id"`       // optional: specific entity ID; empty means global
	ExecutionOrder int               `json:"execution_order"` // priority ordering
	HandlerType    string            `json:"handler_type"`    // "script", "transform", "validate", "log"
	Config         map[string]any    `json:"config"`
	Enabled        bool              `json:"enabled"`
	Labels         map[string]string `json:"labels,omitempty"`
	CreatedAt      time.Time         `json:"created_at"`
	UpdatedAt      time.Time         `json:"updated_at"`
}

// HookExecution represents a single hook execution record.
type HookExecution struct {
	ID             string         `json:"id"`
	HookID         string         `json:"hook_id"`
	TriggerEvent   string         `json:"trigger_event"`
	TargetEntityID string         `json:"target_entity_id"`
	Status         string         `json:"status"` // "pending", "running", "success", "failed", "skipped"
	InputData      map[string]any `json:"input_data"`
	OutputData     map[string]any `json:"output_data"`
	Error          string         `json:"error"`
	DurationMs     int            `json:"duration_ms"`
	StartedAt      time.Time      `json:"started_at"`
	CompletedAt    time.Time      `json:"completed_at"`
	CreatedAt      time.Time      `json:"created_at"`
}

// HookRegistry manages hook definitions and execution records.
type HookRegistry interface {
	Create(ctx context.Context, hook *HookDefinition) error
	Get(ctx context.Context, id string) (*HookDefinition, error)
	List(ctx context.Context, opts ListOptions) ([]*HookDefinition, int, error)
	Update(ctx context.Context, hook *HookDefinition) error
	Delete(ctx context.Context, id string) error
	ListByTriggerPoint(ctx context.Context, triggerPoint string, targetID string) ([]*HookDefinition, error)
	RecordExecution(ctx context.Context, exec *HookExecution) error
	ListExecutions(ctx context.Context, hookID string, opts ListOptions) ([]*HookExecution, int, error)
}

// InMemoryHookRegistry is an in-memory implementation for development.
type InMemoryHookRegistry struct {
	mu         sync.RWMutex
	hooks      map[string]*HookDefinition
	executions map[string]*HookExecution
}

// NewInMemoryHookRegistry creates a new in-memory hook registry.
func NewInMemoryHookRegistry() *InMemoryHookRegistry {
	return &InMemoryHookRegistry{
		hooks:      make(map[string]*HookDefinition),
		executions: make(map[string]*HookExecution),
	}
}

func (r *InMemoryHookRegistry) Create(_ context.Context, hook *HookDefinition) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.hooks[hook.ID]; exists {
		return fmt.Errorf("hook %s already exists", hook.ID)
	}

	now := time.Now()
	hook.CreatedAt = now
	hook.UpdatedAt = now

	r.hooks[hook.ID] = hook
	return nil
}

func (r *InMemoryHookRegistry) Get(_ context.Context, id string) (*HookDefinition, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	hook, ok := r.hooks[id]
	if !ok {
		return nil, fmt.Errorf("hook %s not found", id)
	}
	return hook, nil
}

func (r *InMemoryHookRegistry) List(_ context.Context, opts ListOptions) ([]*HookDefinition, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	hooks := make([]*HookDefinition, 0, len(r.hooks))
	for _, h := range r.hooks {
		if len(opts.Filter) > 0 {
			match := true
			for key, value := range opts.Filter {
				switch key {
				case "hook_type":
					if h.HookType != value {
						match = false
					}
				case "trigger_point":
					if h.TriggerPoint != value {
						match = false
					}
				case "handler_type":
					if h.HandlerType != value {
						match = false
					}
				}
			}
			if !match {
				continue
			}
		}
		hooks = append(hooks, h)
	}

	total := len(hooks)
	if offset >= total {
		return []*HookDefinition{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return hooks[offset:end], total, nil
}

func (r *InMemoryHookRegistry) Update(_ context.Context, hook *HookDefinition) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.hooks[hook.ID]; !exists {
		return fmt.Errorf("hook %s not found", hook.ID)
	}

	hook.UpdatedAt = time.Now()
	r.hooks[hook.ID] = hook
	return nil
}

func (r *InMemoryHookRegistry) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.hooks, id)
	return nil
}

func (r *InMemoryHookRegistry) ListByTriggerPoint(_ context.Context, triggerPoint string, targetID string) ([]*HookDefinition, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []*HookDefinition
	for _, h := range r.hooks {
		if !h.Enabled {
			continue
		}
		if h.TriggerPoint != triggerPoint {
			continue
		}
		// Match global hooks (empty TargetID) or hooks targeting the specific entity
		if h.TargetID != "" && h.TargetID != targetID {
			continue
		}
		result = append(result, h)
	}

	// Sort by execution order
	sort.Slice(result, func(i, j int) bool {
		return result[i].ExecutionOrder < result[j].ExecutionOrder
	})

	return result, nil
}

func (r *InMemoryHookRegistry) RecordExecution(_ context.Context, exec *HookExecution) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	exec.CreatedAt = time.Now()
	r.executions[exec.ID] = exec
	return nil
}

func (r *InMemoryHookRegistry) ListExecutions(_ context.Context, hookID string, opts ListOptions) ([]*HookExecution, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	var execs []*HookExecution
	for _, e := range r.executions {
		if e.HookID == hookID {
			execs = append(execs, e)
		}
	}

	total := len(execs)
	if offset >= total {
		return []*HookExecution{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return execs[offset:end], total, nil
}
