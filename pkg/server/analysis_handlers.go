package server

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
)
func (s *Server) handleListAnalyses(w http.ResponseWriter, _ *http.Request) {
	ctx := context.Background()
	analyses, total, err := s.codeAnalysisRegistry.List(ctx, registry.ListOptions{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"analyses": analyses, "total": total})
}

func (s *Server) handleCreateAnalysis(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var analysis registry.CodeAnalysis
	if err := json.Unmarshal(body, &analysis); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	if analysis.ID == "" {
		analysis.ID = generateID()
	}
	if analysis.Name == "" {
		writeError(w, http.StatusBadRequest, "analysis name is required")
		return
	}

	if err := s.codeAnalysisRegistry.Create(ctx, &analysis); err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, analysis)
}

func (s *Server) handleGetAnalysis(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	analysis, err := s.codeAnalysisRegistry.Get(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, analysis)
}

func (s *Server) handleUpdateAnalysis(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var analysis registry.CodeAnalysis
	if err := json.Unmarshal(body, &analysis); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}
	analysis.ID = id

	if err := s.codeAnalysisRegistry.Update(ctx, &analysis); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, analysis)
}

func (s *Server) handleDeleteAnalysis(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	if err := s.codeAnalysisRegistry.Delete(ctx, id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "analysis deleted", "id": id})
}

func (s *Server) handleListFindings(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	analysisID := r.PathValue("id")

	// Check for severity filter
	severity := r.URL.Query().Get("severity")
	if severity != "" {
		findings, err := s.codeAnalysisRegistry.GetFindingsBySeverity(ctx, analysisID, severity)
		if err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"findings": findings, "total": len(findings)})
		return
	}

	findings, total, err := s.codeAnalysisRegistry.ListFindings(ctx, analysisID, registry.ListOptions{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"findings": findings, "total": total})
}

func (s *Server) handleAddFindings(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	analysisID := r.PathValue("id")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var req struct {
		Findings []*registry.CodeAnalysisFinding `json:"findings"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	for _, f := range req.Findings {
		if f.ID == "" {
			f.ID = generateID()
		}
		f.AnalysisID = analysisID
	}

	if err := s.codeAnalysisRegistry.AddFindings(ctx, req.Findings); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"added": len(req.Findings)})
}

// Memory handlers

