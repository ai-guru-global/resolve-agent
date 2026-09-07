package registry

import (
	"context"
	"sync"

	"github.com/ai-guru-global/resolve-agent/pkg/errors"
)

// SkillDefinition represents a registered skill.
type SkillDefinition struct {
	Name        string            `json:"name"`
	Version     string            `json:"version"`
	Description string            `json:"description"`
	Author      string            `json:"author"`
	SkillType   string            `json:"skill_type"`
	Domain      string            `json:"domain,omitempty"`
	Tags        []string          `json:"tags,omitempty"`
	Manifest    map[string]any    `json:"manifest"`
	SourceType  string            `json:"source_type"`
	SourceURI   string            `json:"source_uri"`
	Status      string            `json:"status"`
	Labels      map[string]string `json:"labels,omitempty"`
}

// SkillRegistry manages skill definitions.
type SkillRegistry interface {
	Register(ctx context.Context, skill *SkillDefinition) error
	Get(ctx context.Context, name string) (*SkillDefinition, error)
	List(ctx context.Context, opts ListOptions) ([]*SkillDefinition, int, error)
	Unregister(ctx context.Context, name string) error
	ListByType(ctx context.Context, skillType string, opts ListOptions) ([]*SkillDefinition, int, error)
}

// InMemorySkillRegistry is an in-memory implementation for development.
type InMemorySkillRegistry struct {
	mu     sync.RWMutex
	skills map[string]*SkillDefinition
}

// NewInMemorySkillRegistry creates a new in-memory skill registry.
func NewInMemorySkillRegistry() *InMemorySkillRegistry {
	return &InMemorySkillRegistry{
		skills: make(map[string]*SkillDefinition),
	}
}

// Register adds a skill definition keyed by its name, overwriting any
// existing entry.
func (r *InMemorySkillRegistry) Register(_ context.Context, skill *SkillDefinition) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	r.skills[skill.Name] = skill
	return nil
}

// Get returns the skill definition with the given name, or an error if
// absent.
func (r *InMemorySkillRegistry) Get(_ context.Context, name string) (*SkillDefinition, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	skill, ok := r.skills[name]
	if !ok {
		return nil, errors.NotFound("skill", name)
	}
	return skill, nil
}

// List returns all registered skills; the list options are ignored.
func (r *InMemorySkillRegistry) List(_ context.Context, _ ListOptions) ([]*SkillDefinition, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	skills := make([]*SkillDefinition, 0, len(r.skills))
	for _, s := range r.skills {
		skills = append(skills, s)
	}
	return skills, len(skills), nil
}

// Unregister removes the skill definition with the given name.
func (r *InMemorySkillRegistry) Unregister(_ context.Context, name string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.skills, name)
	return nil
}

// ListByType returns all registered skills of the given type; the list
// options are ignored.
func (r *InMemorySkillRegistry) ListByType(_ context.Context, skillType string, _ ListOptions) ([]*SkillDefinition, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	skills := make([]*SkillDefinition, 0)
	for _, s := range r.skills {
		if s.SkillType == skillType {
			skills = append(skills, s)
		}
	}
	return skills, len(skills), nil
}
