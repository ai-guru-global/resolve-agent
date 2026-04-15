package registry

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"
)

// TroubleshootingSolution represents a structured troubleshooting solution record.
type TroubleshootingSolution struct {
	ID                   string         `json:"id"`
	Title                string         `json:"title"`
	ProblemSymptoms      string         `json:"problem_symptoms"`
	KeyInformation       string         `json:"key_information"`
	TroubleshootingSteps string         `json:"troubleshooting_steps"`
	ResolutionSteps      string         `json:"resolution_steps"`
	Domain               string         `json:"domain,omitempty"`
	Component            string         `json:"component,omitempty"`
	Severity             string         `json:"severity"`
	Tags                 []string       `json:"tags,omitempty"`
	SearchKeywords       string         `json:"search_keywords,omitempty"`
	Version              int            `json:"version"`
	Status               string         `json:"status"`
	SourceURI            string         `json:"source_uri,omitempty"`
	RAGCollectionID      string         `json:"rag_collection_id,omitempty"`
	RAGDocumentID        string         `json:"rag_document_id,omitempty"`
	RelatedSkillNames    []string       `json:"related_skill_names,omitempty"`
	RelatedWorkflowIDs   []string       `json:"related_workflow_ids,omitempty"`
	Metadata             map[string]any `json:"metadata,omitempty"`
	CreatedBy            string         `json:"created_by,omitempty"`
	CreatedAt            time.Time      `json:"created_at"`
	UpdatedAt            time.Time      `json:"updated_at"`
}

// SolutionExecution represents a record of applying a troubleshooting solution.
type SolutionExecution struct {
	ID                 string         `json:"id"`
	SolutionID         string         `json:"solution_id"`
	Executor           string         `json:"executor,omitempty"`
	TriggerContext     map[string]any `json:"trigger_context,omitempty"`
	Status             string         `json:"status"`
	OutcomeNotes       string         `json:"outcome_notes,omitempty"`
	EffectivenessScore float64        `json:"effectiveness_score,omitempty"`
	DurationMs         int            `json:"duration_ms,omitempty"`
	StartedAt          time.Time      `json:"started_at"`
	CompletedAt        time.Time      `json:"completed_at"`
	CreatedAt          time.Time      `json:"created_at"`
}

// SolutionSearchOptions extends ListOptions with domain-specific filters.
type SolutionSearchOptions struct {
	Domain    string   `json:"domain,omitempty"`
	Component string   `json:"component,omitempty"`
	Severity  string   `json:"severity,omitempty"`
	Tags      []string `json:"tags,omitempty"`
	Keyword   string   `json:"keyword,omitempty"`
	Status    string   `json:"status,omitempty"`
	ListOptions
}

// TroubleshootingSolutionRegistry manages troubleshooting solution records.
type TroubleshootingSolutionRegistry interface {
	Create(ctx context.Context, solution *TroubleshootingSolution) error
	Get(ctx context.Context, id string) (*TroubleshootingSolution, error)
	List(ctx context.Context, opts ListOptions) ([]*TroubleshootingSolution, int, error)
	Update(ctx context.Context, solution *TroubleshootingSolution) error
	Delete(ctx context.Context, id string) error
	Search(ctx context.Context, opts SolutionSearchOptions) ([]*TroubleshootingSolution, int, error)
	BulkCreate(ctx context.Context, solutions []*TroubleshootingSolution) (int, error)
	RecordExecution(ctx context.Context, exec *SolutionExecution) error
	ListExecutions(ctx context.Context, solutionID string, opts ListOptions) ([]*SolutionExecution, int, error)
}

// InMemoryTroubleshootingSolutionRegistry is an in-memory implementation for development.
type InMemoryTroubleshootingSolutionRegistry struct {
	mu         sync.RWMutex
	solutions  map[string]*TroubleshootingSolution
	executions map[string]*SolutionExecution
}

// NewInMemoryTroubleshootingSolutionRegistry creates a new in-memory registry.
func NewInMemoryTroubleshootingSolutionRegistry() *InMemoryTroubleshootingSolutionRegistry {
	return &InMemoryTroubleshootingSolutionRegistry{
		solutions:  make(map[string]*TroubleshootingSolution),
		executions: make(map[string]*SolutionExecution),
	}
}

func (r *InMemoryTroubleshootingSolutionRegistry) Create(_ context.Context, solution *TroubleshootingSolution) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.solutions[solution.ID]; exists {
		return fmt.Errorf("solution %s already exists", solution.ID)
	}

	now := time.Now()
	solution.CreatedAt = now
	solution.UpdatedAt = now
	if solution.Version == 0 {
		solution.Version = 1
	}

	r.solutions[solution.ID] = solution
	return nil
}

func (r *InMemoryTroubleshootingSolutionRegistry) Get(_ context.Context, id string) (*TroubleshootingSolution, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	solution, ok := r.solutions[id]
	if !ok {
		return nil, fmt.Errorf("solution %s not found", id)
	}
	return solution, nil
}

func (r *InMemoryTroubleshootingSolutionRegistry) List(_ context.Context, opts ListOptions) ([]*TroubleshootingSolution, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	solutions := make([]*TroubleshootingSolution, 0, len(r.solutions))
	for _, s := range r.solutions {
		if len(opts.Filter) > 0 {
			match := true
			for key, value := range opts.Filter {
				switch key {
				case "status":
					if s.Status != value {
						match = false
					}
				case "domain":
					if s.Domain != value {
						match = false
					}
				case "severity":
					if s.Severity != value {
						match = false
					}
				}
			}
			if !match {
				continue
			}
		}
		solutions = append(solutions, s)
	}

	total := len(solutions)
	if offset >= total {
		return []*TroubleshootingSolution{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return solutions[offset:end], total, nil
}

func (r *InMemoryTroubleshootingSolutionRegistry) Update(_ context.Context, solution *TroubleshootingSolution) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.solutions[solution.ID]; !exists {
		return fmt.Errorf("solution %s not found", solution.ID)
	}

	solution.UpdatedAt = time.Now()
	r.solutions[solution.ID] = solution
	return nil
}

func (r *InMemoryTroubleshootingSolutionRegistry) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.solutions, id)
	return nil
}

func (r *InMemoryTroubleshootingSolutionRegistry) Search(_ context.Context, opts SolutionSearchOptions) ([]*TroubleshootingSolution, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	var results []*TroubleshootingSolution
	keyword := strings.ToLower(opts.Keyword)

	for _, s := range r.solutions {
		if opts.Domain != "" && s.Domain != opts.Domain {
			continue
		}
		if opts.Component != "" && s.Component != opts.Component {
			continue
		}
		if opts.Severity != "" && s.Severity != opts.Severity {
			continue
		}
		if opts.Status != "" && s.Status != opts.Status {
			continue
		}
		if len(opts.Tags) > 0 {
			tagSet := make(map[string]bool)
			for _, t := range s.Tags {
				tagSet[t] = true
			}
			match := false
			for _, t := range opts.Tags {
				if tagSet[t] {
					match = true
					break
				}
			}
			if !match {
				continue
			}
		}
		if keyword != "" {
			searchable := strings.ToLower(s.Title + " " + s.ProblemSymptoms + " " + s.SearchKeywords)
			if !strings.Contains(searchable, keyword) {
				continue
			}
		}
		results = append(results, s)
	}

	total := len(results)
	if offset >= total {
		return []*TroubleshootingSolution{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return results[offset:end], total, nil
}

func (r *InMemoryTroubleshootingSolutionRegistry) BulkCreate(_ context.Context, solutions []*TroubleshootingSolution) (int, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	created := 0
	now := time.Now()
	for _, s := range solutions {
		if _, exists := r.solutions[s.ID]; exists {
			continue
		}
		s.CreatedAt = now
		s.UpdatedAt = now
		if s.Version == 0 {
			s.Version = 1
		}
		r.solutions[s.ID] = s
		created++
	}
	return created, nil
}

func (r *InMemoryTroubleshootingSolutionRegistry) RecordExecution(_ context.Context, exec *SolutionExecution) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	exec.CreatedAt = time.Now()
	r.executions[exec.ID] = exec
	return nil
}

func (r *InMemoryTroubleshootingSolutionRegistry) ListExecutions(_ context.Context, solutionID string, opts ListOptions) ([]*SolutionExecution, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	var execs []*SolutionExecution
	for _, e := range r.executions {
		if e.SolutionID == solutionID {
			execs = append(execs, e)
		}
	}

	total := len(execs)
	if offset >= total {
		return []*SolutionExecution{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return execs[offset:end], total, nil
}
