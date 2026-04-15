package registry

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// CallGraph represents a code call graph rooted at an entry point.
type CallGraph struct {
	ID            string         `json:"id"`
	AnalysisID    string         `json:"analysis_id,omitempty"`
	RepositoryURL string         `json:"repository_url"`
	Branch        string         `json:"branch"`
	Language      string         `json:"language"`
	EntryPoint    string         `json:"entry_point"`
	NodeCount     int            `json:"node_count"`
	EdgeCount     int            `json:"edge_count"`
	MaxDepth      int            `json:"max_depth"`
	Status        string         `json:"status"`
	GraphData     map[string]any `json:"graph_data"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
}

// CallGraphNode represents a function node in a call graph.
type CallGraphNode struct {
	ID           string         `json:"id"`
	CallGraphID  string         `json:"call_graph_id"`
	FunctionName string         `json:"function_name"`
	FilePath     string         `json:"file_path"`
	LineStart    int            `json:"line_start"`
	LineEnd      int            `json:"line_end"`
	Package      string         `json:"package"`
	NodeType     string         `json:"node_type"` // "entry_point", "internal", "external", "stdlib"
	Metadata     map[string]any `json:"metadata"`
}

// CallGraphEdge represents a call relationship between two nodes.
type CallGraphEdge struct {
	ID           string         `json:"id"`
	CallGraphID  string         `json:"call_graph_id"`
	CallerNodeID string         `json:"caller_node_id"`
	CalleeNodeID string         `json:"callee_node_id"`
	CallType     string         `json:"call_type"` // "direct", "dynamic", "async"
	Weight       int            `json:"weight"`
	Metadata     map[string]any `json:"metadata"`
}

// CallGraphRegistry manages call graphs and their nodes/edges.
type CallGraphRegistry interface {
	Create(ctx context.Context, graph *CallGraph) error
	Get(ctx context.Context, id string) (*CallGraph, error)
	List(ctx context.Context, opts ListOptions) ([]*CallGraph, int, error)
	Update(ctx context.Context, graph *CallGraph) error
	Delete(ctx context.Context, id string) error
	AddNodes(ctx context.Context, nodes []*CallGraphNode) error
	AddEdges(ctx context.Context, edges []*CallGraphEdge) error
	ListNodes(ctx context.Context, callGraphID string, opts ListOptions) ([]*CallGraphNode, int, error)
	ListEdges(ctx context.Context, callGraphID string, opts ListOptions) ([]*CallGraphEdge, int, error)
	GetSubgraph(ctx context.Context, callGraphID string, entryNodeID string, depth int) ([]*CallGraphNode, []*CallGraphEdge, error)
}

// InMemoryCallGraphRegistry is an in-memory implementation for development.
type InMemoryCallGraphRegistry struct {
	mu     sync.RWMutex
	graphs map[string]*CallGraph
	nodes  map[string]*CallGraphNode
	edges  map[string]*CallGraphEdge
}

// NewInMemoryCallGraphRegistry creates a new in-memory call graph registry.
func NewInMemoryCallGraphRegistry() *InMemoryCallGraphRegistry {
	return &InMemoryCallGraphRegistry{
		graphs: make(map[string]*CallGraph),
		nodes:  make(map[string]*CallGraphNode),
		edges:  make(map[string]*CallGraphEdge),
	}
}

func (r *InMemoryCallGraphRegistry) Create(_ context.Context, graph *CallGraph) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.graphs[graph.ID]; exists {
		return fmt.Errorf("call graph %s already exists", graph.ID)
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

func (r *InMemoryCallGraphRegistry) Get(_ context.Context, id string) (*CallGraph, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	graph, ok := r.graphs[id]
	if !ok {
		return nil, fmt.Errorf("call graph %s not found", id)
	}
	return graph, nil
}

func (r *InMemoryCallGraphRegistry) List(_ context.Context, opts ListOptions) ([]*CallGraph, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	var graphs []*CallGraph
	for _, g := range r.graphs {
		if len(opts.Filter) > 0 {
			match := true
			for key, value := range opts.Filter {
				switch key {
				case "status":
					if g.Status != value {
						match = false
					}
				case "language":
					if g.Language != value {
						match = false
					}
				case "analysis_id":
					if g.AnalysisID != value {
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
		return []*CallGraph{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return graphs[offset:end], total, nil
}

func (r *InMemoryCallGraphRegistry) Update(_ context.Context, graph *CallGraph) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, exists := r.graphs[graph.ID]; !exists {
		return fmt.Errorf("call graph %s not found", graph.ID)
	}
	graph.UpdatedAt = time.Now()
	r.graphs[graph.ID] = graph
	return nil
}

func (r *InMemoryCallGraphRegistry) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Cascade delete edges and nodes
	for eid, e := range r.edges {
		if e.CallGraphID == id {
			delete(r.edges, eid)
		}
	}
	for nid, n := range r.nodes {
		if n.CallGraphID == id {
			delete(r.nodes, nid)
		}
	}
	delete(r.graphs, id)
	return nil
}

func (r *InMemoryCallGraphRegistry) AddNodes(_ context.Context, nodes []*CallGraphNode) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, n := range nodes {
		r.nodes[n.ID] = n
	}
	return nil
}

func (r *InMemoryCallGraphRegistry) AddEdges(_ context.Context, edges []*CallGraphEdge) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for _, e := range edges {
		r.edges[e.ID] = e
	}
	return nil
}

func (r *InMemoryCallGraphRegistry) ListNodes(_ context.Context, callGraphID string, opts ListOptions) ([]*CallGraphNode, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	var nodes []*CallGraphNode
	for _, n := range r.nodes {
		if n.CallGraphID == callGraphID {
			nodes = append(nodes, n)
		}
	}

	total := len(nodes)
	if offset >= total {
		return []*CallGraphNode{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return nodes[offset:end], total, nil
}

func (r *InMemoryCallGraphRegistry) ListEdges(_ context.Context, callGraphID string, opts ListOptions) ([]*CallGraphEdge, int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	limit := opts.Limit
	if limit <= 0 {
		limit = 100
	}
	offset := opts.Offset

	var edges []*CallGraphEdge
	for _, e := range r.edges {
		if e.CallGraphID == callGraphID {
			edges = append(edges, e)
		}
	}

	total := len(edges)
	if offset >= total {
		return []*CallGraphEdge{}, total, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return edges[offset:end], total, nil
}

func (r *InMemoryCallGraphRegistry) GetSubgraph(_ context.Context, callGraphID string, entryNodeID string, depth int) ([]*CallGraphNode, []*CallGraphEdge, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if depth <= 0 {
		depth = 5
	}

	// Build adjacency list from edges
	adjacency := make(map[string][]string)
	edgeMap := make(map[string]*CallGraphEdge)
	for _, e := range r.edges {
		if e.CallGraphID == callGraphID {
			adjacency[e.CallerNodeID] = append(adjacency[e.CallerNodeID], e.CalleeNodeID)
			edgeMap[e.CallerNodeID+":"+e.CalleeNodeID] = e
		}
	}

	// BFS traversal from entry node
	visited := make(map[string]bool)
	queue := []struct {
		nodeID string
		depth  int
	}{{entryNodeID, 0}}
	visited[entryNodeID] = true

	var resultNodes []*CallGraphNode
	var resultEdges []*CallGraphEdge

	for len(queue) > 0 {
		item := queue[0]
		queue = queue[1:]

		if node, ok := r.nodes[item.nodeID]; ok {
			resultNodes = append(resultNodes, node)
		}

		if item.depth >= depth {
			continue
		}

		for _, calleeID := range adjacency[item.nodeID] {
			key := item.nodeID + ":" + calleeID
			if edge, ok := edgeMap[key]; ok {
				resultEdges = append(resultEdges, edge)
			}
			if !visited[calleeID] {
				visited[calleeID] = true
				queue = append(queue, struct {
					nodeID string
					depth  int
				}{calleeID, item.depth + 1})
			}
		}
	}

	return resultNodes, resultEdges, nil
}
