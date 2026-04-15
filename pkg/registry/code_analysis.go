package registry

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// CodeAnalysis represents a code static analysis run.
type CodeAnalysis struct {
	ID            string            `json:"id"`
	Name          string            `json:"name"`
	RepositoryURL string            `json:"repository_url"`
	Branch        string            `json:"branch"`
	CommitSHA     string            `json:"commit_sha"`
	Language      string            `json:"language"`
	AnalyzerType  string            `json:"analyzer_type"` // "lint", "security", "complexity", "dependency", "custom"
	Config        map[string]any    `json:"config"`
	Status        string            `json:"status"` // "pending", "running", "completed", "failed"
	Summary       map[string]any    `json:"summary"`
	DurationMs    int               `json:"duration_ms"`
	Labels        map[string]string `json:"labels,omitempty"`
	TriggeredBy   string            `json:"triggered_by"`
	StartedAt     time.Time         `json:"started_at"`
	CompletedAt   time.Time         `json:"completed_at"`
	CreatedAt     time.Time         `json:"created_at"`
	UpdatedAt     time.Time         `json:"updated_at"`
}

// CodeAnalysisFinding represents a single finding from a code analysis.
type CodeAnalysisFinding struct {
	ID          string         `json:"id"`
	AnalysisID  string         `json:"analysis_id"`
	RuleID      string         `json:"rule_id"`
	Severity    string         `json:"severity"` // "critical", "high", "medium", "low", "info"
	Category    string         `json:"category"` // "security", "performance", "style", "bug"
	Message     string         `json:"message"`
	FilePath    string         `json:"file_path"`
	LineStart   int            `json:"line_start"`
	LineEnd     int            `json:"line_end"`
	ColumnStart int            `json:"column_start"`
	ColumnEnd   int            `json:"column_end"`
	Snippet     string         `json:"snippet"`
	Suggestion  string         `json:"suggestion"`
	Metadata    map[string]any `json:"metadata"`
	CreatedAt   time.Time      `json:"created_at"`
}

// CodeAnalysisRegistry manages code analysis runs and findings.
type CodeAnalysisRegistry interface {
	Create(ctx context.Context, analysis *CodeAnalysis) error
	Get(ctx context.Context, id string) (*CodeAnalysis, error)
	List(ctx context.Context, opts ListOptions) ([]*CodeAnalysis, int, error)
	Update(ctx context.Context, analysis *CodeAnalysis) error
	Delete(ctx context.Context, id string) error
	AddFinding(ctx context.Context, finding *CodeAnalysisFinding) error
	AddFindings(ctx context.Context, findings []*CodeAnalysisFinding) error
	ListFindings(ctx context.Context, analysisID string, opts ListOptions) ([]*CodeAnalysisFinding, int, error)
	GetFindingsBySeverity(ctx context.Context, analysisID string, severity string) ([]*CodeAnalysisFinding, error)
}

// InMemoryCodeAnalysisRegistry is an in-memory implementation for development.
type InMemoryCodeAnalysisRegistry struct {
	mu       sync.RWMutex
	analyses map[string]*CodeAnalysis
	findings map[string]*CodeAnalysisFinding
}

// NewInMemoryCodeAnalysisRegistry creates a new in-memory code analysis registry.
func NewInMemoryCodeAnalysisRegistry() *InMemoryCodeAnalysisRegistry {
	return &InMemoryCodeAnalysisRegistry{
		analyses: make(map[string]*CodeAnalysis),
		findings: make(map[string]*CodeAnalysisFinding),
	}
}

func (r *InMemoryCodeAnalysisRegistry) Create(_ context.Context, analysis *CodeAnalysis) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.analyses[analysis.ID]; exists {
		return fmt.Errorf("analysis %s already exists", analysis.ID)
	}

	now := time.Now()
	analysis.CreatedAt = now
	analysis.UpdatedAt = now
	if analysis.Status == "" {
		analysis.Status = "pending"
	}

	r.analyses[analysis.ID] = analysis
	return nil
}

func (r *InMemoryCodeAnalysisRegistry) Get(_ context.Context, id string) (*CodeAnalysis, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	analysis, ok := r.analyses[id]
	if !ok {
		return nil, fmt.Errorf("analysis %s not found", id)
	}
	return analysis, nil
}

func (r *InMemoryCodeAnalysisRegistry) List(_ context.Context, opts ListOptions) ([]*CodeAnalysis, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	analyses := make([]*CodeAnalysis, 0, len(r.analyses))
	for _, a := range r.analyses {
		if len(opts.Filter) > 0 {
			match := true
			for key, value := range opts.Filter {
				switch key {
				case "status":
					if a.Status != value {
						match = false
					}
				case "analyzer_type":
					if a.AnalyzerType != value {
						match = false
					}
				case "language":
					if a.Language != value {
						match = false
					}
				}
			}
			if !match {
				continue
			}
		}
		analyses = append(analyses, a)
	}

	total := len(analyses)
	if offset >= total {
		return []*CodeAnalysis{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return analyses[offset:end], total, nil
}

func (r *InMemoryCodeAnalysisRegistry) Update(_ context.Context, analysis *CodeAnalysis) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.analyses[analysis.ID]; !exists {
		return fmt.Errorf("analysis %s not found", analysis.ID)
	}

	analysis.UpdatedAt = time.Now()
	r.analyses[analysis.ID] = analysis
	return nil
}

func (r *InMemoryCodeAnalysisRegistry) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Cascade delete findings
	for fid, f := range r.findings {
		if f.AnalysisID == id {
			delete(r.findings, fid)
		}
	}
	delete(r.analyses, id)
	return nil
}

func (r *InMemoryCodeAnalysisRegistry) AddFinding(_ context.Context, finding *CodeAnalysisFinding) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	finding.CreatedAt = time.Now()
	r.findings[finding.ID] = finding
	return nil
}

func (r *InMemoryCodeAnalysisRegistry) AddFindings(_ context.Context, findings []*CodeAnalysisFinding) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	for _, f := range findings {
		f.CreatedAt = now
		r.findings[f.ID] = f
	}
	return nil
}

func (r *InMemoryCodeAnalysisRegistry) ListFindings(_ context.Context, analysisID string, opts ListOptions) ([]*CodeAnalysisFinding, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	var findings []*CodeAnalysisFinding
	for _, f := range r.findings {
		if f.AnalysisID == analysisID {
			findings = append(findings, f)
		}
	}

	total := len(findings)
	if offset >= total {
		return []*CodeAnalysisFinding{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return findings[offset:end], total, nil
}

func (r *InMemoryCodeAnalysisRegistry) GetFindingsBySeverity(_ context.Context, analysisID string, severity string) ([]*CodeAnalysisFinding, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var findings []*CodeAnalysisFinding
	for _, f := range r.findings {
		if f.AnalysisID == analysisID && f.Severity == severity {
			findings = append(findings, f)
		}
	}
	return findings, nil
}
