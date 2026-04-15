package registry

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// TrafficGraph represents a service dependency graph built from traffic data.
type TrafficGraph struct {
	ID             string         `json:"id"`
	CaptureID      string         `json:"capture_id,omitempty"`
	Name           string         `json:"name"`
	GraphData      map[string]any `json:"graph_data"`
	Nodes          []any          `json:"nodes"`
	Edges          []any          `json:"edges"`
	AnalysisReport string         `json:"analysis_report"`
	Suggestions    []any          `json:"suggestions"`
	Status         string         `json:"status"` // "pending", "building", "completed", "analyzed"
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
}

// TrafficGraphRegistry manages traffic graphs and their analysis reports.
type TrafficGraphRegistry interface {
	Create(ctx context.Context, graph *TrafficGraph) error
	Get(ctx context.Context, id string) (*TrafficGraph, error)
	List(ctx context.Context, opts ListOptions) ([]*TrafficGraph, int, error)
	Update(ctx context.Context, graph *TrafficGraph) error
	Delete(ctx context.Context, id string) error
	GetByCaptureID(ctx context.Context, captureID string) ([]*TrafficGraph, error)
	UpdateReport(ctx context.Context, id string, report string, suggestions []any) error
}

// InMemoryTrafficGraphRegistry is an in-memory implementation for development.
type InMemoryTrafficGraphRegistry struct {
	mu     sync.RWMutex
	graphs map[string]*TrafficGraph
}

// NewInMemoryTrafficGraphRegistry creates a new in-memory traffic graph registry.
func NewInMemoryTrafficGraphRegistry() *InMemoryTrafficGraphRegistry {
	return &InMemoryTrafficGraphRegistry{
		graphs: make(map[string]*TrafficGraph),
	}
}

func (r *InMemoryTrafficGraphRegistry) Create(_ context.Context, graph *TrafficGraph) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.graphs[graph.ID]; exists {
		return fmt.Errorf("traffic graph %s already exists", graph.ID)
	}

	now := time.Now()
	graph.CreatedAt = now
	graph.UpdatedAt = now
	if graph.Status == "" {
		graph.Status = "pending"
	}
	r.graphs[graph.ID] = graph
	return nil
}

func (r *InMemoryTrafficGraphRegistry) Get(_ context.Context, id string) (*TrafficGraph, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	graph, ok := r.graphs[id]
	if !ok {
		return nil, fmt.Errorf("traffic graph %s not found", id)
	}
	return graph, nil
}

func (r *InMemoryTrafficGraphRegistry) List(_ context.Context, opts ListOptions) ([]*TrafficGraph, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	var graphs []*TrafficGraph
	for _, g := range r.graphs {
		if len(opts.Filter) > 0 {
			match := true
			for key, value := range opts.Filter {
				switch key {
				case "status":
					if g.Status != value {
						match = false
					}
				case "capture_id":
					if g.CaptureID != value {
						match = false
					}
				}
			}
			if !match {
				continue
			}
		}
		graphs = append(graphs, g)
	}

	total := len(graphs)
	if offset >= total {
		return []*TrafficGraph{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return graphs[offset:end], total, nil
}

func (r *InMemoryTrafficGraphRegistry) Update(_ context.Context, graph *TrafficGraph) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.graphs[graph.ID]; !exists {
		return fmt.Errorf("traffic graph %s not found", graph.ID)
	}
	graph.UpdatedAt = time.Now()
	r.graphs[graph.ID] = graph
	return nil
}

func (r *InMemoryTrafficGraphRegistry) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.graphs, id)
	return nil
}

func (r *InMemoryTrafficGraphRegistry) GetByCaptureID(_ context.Context, captureID string) ([]*TrafficGraph, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var graphs []*TrafficGraph
	for _, g := range r.graphs {
		if g.CaptureID == captureID {
			graphs = append(graphs, g)
		}
	}
	return graphs, nil
}

func (r *InMemoryTrafficGraphRegistry) UpdateReport(_ context.Context, id string, report string, suggestions []any) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	graph, ok := r.graphs[id]
	if !ok {
		return fmt.Errorf("traffic graph %s not found", id)
	}
	graph.AnalysisReport = report
	graph.Suggestions = suggestions
	graph.Status = "analyzed"
	graph.UpdatedAt = time.Now()
	return nil
}
