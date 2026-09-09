package server

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
)

func (s *Server) handleListTrafficCaptures(w http.ResponseWriter, _ *http.Request) {
	ctx := context.Background()
	captures, total, err := s.trafficCaptureRegistry.List(ctx, registry.ListOptions{Limit: 100})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"captures": captures, "total": total})
}

func (s *Server) handleCreateTrafficCapture(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	var capture registry.TrafficCapture
	if err := json.NewDecoder(r.Body).Decode(&capture); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if capture.ID == "" {
		capture.ID = generateID()
	}
	if err := s.trafficCaptureRegistry.Create(ctx, &capture); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, capture)
}

func (s *Server) handleGetTrafficCapture(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")
	capture, err := s.trafficCaptureRegistry.Get(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, capture)
}

func (s *Server) handleUpdateTrafficCapture(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	capture, err := s.trafficCaptureRegistry.Get(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	var patch struct {
		Status  string         `json:"status"`
		EndTime *time.Time     `json:"end_time"`
		Summary map[string]any `json:"summary"`
	}
	if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if patch.Status != "" {
		capture.Status = patch.Status
	}
	if patch.EndTime != nil {
		capture.EndTime = *patch.EndTime
	}
	if patch.Summary != nil {
		capture.Summary = patch.Summary
	}

	if err := s.trafficCaptureRegistry.Update(ctx, capture); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, capture)
}

func (s *Server) handleDeleteTrafficCapture(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")
	if err := s.trafficCaptureRegistry.Delete(ctx, id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"deleted": id})
}

func (s *Server) handleAddTrafficRecords(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	captureID := r.PathValue("id")

	var body struct {
		Records []*registry.TrafficRecord `json:"records"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	for _, rec := range body.Records {
		rec.CaptureID = captureID
		if rec.ID == "" {
			rec.ID = generateID()
		}
	}
	if err := s.trafficCaptureRegistry.AddRecords(ctx, body.Records); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"added": len(body.Records)})
}

func (s *Server) handleListTrafficRecords(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	captureID := r.PathValue("id")
	records, total, err := s.trafficCaptureRegistry.ListRecords(ctx, captureID, registry.ListOptions{Limit: 500})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"records": records, "total": total})
}

// Traffic Graph handlers

func (s *Server) handleListTrafficGraphs(w http.ResponseWriter, _ *http.Request) {
	ctx := context.Background()
	graphs, total, err := s.trafficGraphRegistry.List(ctx, registry.ListOptions{Limit: 100})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"graphs": graphs, "total": total})
}

func (s *Server) handleCreateTrafficGraph(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	var graph registry.TrafficGraph
	if err := json.NewDecoder(r.Body).Decode(&graph); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if graph.ID == "" {
		graph.ID = generateID()
	}
	if err := s.trafficGraphRegistry.Create(ctx, &graph); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, graph)
}

func (s *Server) handleGetTrafficGraph(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")
	graph, err := s.trafficGraphRegistry.Get(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, graph)
}

func (s *Server) handleDeleteTrafficGraph(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")
	if err := s.trafficGraphRegistry.Delete(ctx, id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"deleted": id})
}

func (s *Server) handleAnalyzeTrafficGraph(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	graph, err := s.trafficGraphRegistry.Get(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	// Forward to Python runtime for LLM-based analysis
	reqBody := map[string]any{
		"graph_id":   graph.ID,
		"graph_data": graph.GraphData,
		"nodes":      graph.Nodes,
		"edges":      graph.Edges,
	}
	bodyBytes, _ := json.Marshal(reqBody)

	runtimeURL := fmt.Sprintf("%s/traffic/report", s.runtimeClient.baseURL)
	httpReq, err := http.NewRequestWithContext(ctx, "POST", runtimeURL, bytes.NewReader(bodyBytes))
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := s.runtimeClient.httpClient.Do(httpReq)
	if err != nil {
		writeError(w, http.StatusBadGateway, fmt.Sprintf("runtime unavailable: %v", err))
		return
	}
	defer func() { _ = resp.Body.Close() }()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}

func (s *Server) handleUpdateTrafficGraph(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")
	var graph registry.TrafficGraph
	if err := json.NewDecoder(r.Body).Decode(&graph); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	graph.ID = id
	if err := s.trafficGraphRegistry.Update(ctx, &graph); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, graph)
}
