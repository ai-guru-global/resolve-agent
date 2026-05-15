package server

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strconv"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
)
func (s *Server) handleListCallGraphs(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	opts := registry.ListOptions{Limit: 100}
	if analysisID := r.URL.Query().Get("analysis_id"); analysisID != "" {
		opts.Filter = map[string]string{"analysis_id": analysisID}
	}
	graphs, total, err := s.callGraphRegistry.List(ctx, opts)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"call_graphs": graphs, "total": total})
}

func (s *Server) handleCreateCallGraph(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	var graph registry.CallGraph
	if err := json.NewDecoder(r.Body).Decode(&graph); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if graph.ID == "" {
		graph.ID = fmt.Sprintf("cg-%d", rand.Intn(999999))
	}
	if err := s.callGraphRegistry.Create(ctx, &graph); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, graph)
}

func (s *Server) handleGetCallGraph(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")
	graph, err := s.callGraphRegistry.Get(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, graph)
}

func (s *Server) handleDeleteCallGraph(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")
	if err := s.callGraphRegistry.Delete(ctx, id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"deleted": id})
}

func (s *Server) handleListCallGraphNodes(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")
	nodes, total, err := s.callGraphRegistry.ListNodes(ctx, id, registry.ListOptions{Limit: 500})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"nodes": nodes, "total": total})
}

func (s *Server) handleListCallGraphEdges(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")
	edges, total, err := s.callGraphRegistry.ListEdges(ctx, id, registry.ListOptions{Limit: 500})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"edges": edges, "total": total})
}

func (s *Server) handleGetCallGraphSubgraph(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")
	entryNodeID := r.URL.Query().Get("entry")
	depthStr := r.URL.Query().Get("depth")
	depth := 5
	if depthStr != "" {
		if d, err := strconv.Atoi(depthStr); err == nil {
			depth = d
		}
	}
	nodes, edges, err := s.callGraphRegistry.GetSubgraph(ctx, id, entryNodeID, depth)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"nodes": nodes, "edges": edges})
}

// Traffic Capture handlers

