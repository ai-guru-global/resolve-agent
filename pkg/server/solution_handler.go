package server

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
)

// Solution CRUD handlers

func (s *Server) handleListSolutions(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	opts := registry.ListOptions{}
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			opts.Limit = parsed
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if parsed, err := strconv.Atoi(o); err == nil && parsed >= 0 {
			opts.Offset = parsed
		}
	}

	// Apply filters from query params
	opts.Filter = make(map[string]string)
	if domain := r.URL.Query().Get("domain"); domain != "" {
		opts.Filter["domain"] = domain
	}
	if severity := r.URL.Query().Get("severity"); severity != "" {
		opts.Filter["severity"] = severity
	}
	if status := r.URL.Query().Get("status"); status != "" {
		opts.Filter["status"] = status
	}

	solutions, total, err := s.solutionRegistry.List(ctx, opts)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"solutions": solutions, "total": total})
}

func (s *Server) handleCreateSolution(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var solution registry.TroubleshootingSolution
	if err := json.Unmarshal(body, &solution); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	if solution.ID == "" {
		solution.ID = generateID()
	}
	if solution.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	if solution.ProblemSymptoms == "" {
		writeError(w, http.StatusBadRequest, "problem_symptoms is required")
		return
	}
	if solution.Status == "" {
		solution.Status = "active"
	}
	if solution.Severity == "" {
		solution.Severity = "medium"
	}

	if err := s.solutionRegistry.Create(ctx, &solution); err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, solution)
}

func (s *Server) handleGetSolution(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	solution, err := s.solutionRegistry.Get(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, solution)
}

func (s *Server) handleUpdateSolution(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var solution registry.TroubleshootingSolution
	if err := json.Unmarshal(body, &solution); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}
	solution.ID = id

	if err := s.solutionRegistry.Update(ctx, &solution); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, solution)
}

func (s *Server) handleDeleteSolution(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	if err := s.solutionRegistry.Delete(ctx, id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "solution deleted", "id": id})
}

// Solution search handler

func (s *Server) handleSearchSolutions(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var opts registry.SolutionSearchOptions
	if err := json.Unmarshal(body, &opts); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	solutions, total, err := s.solutionRegistry.Search(ctx, opts)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"solutions": solutions, "total": total})
}

// Bulk import handler

func (s *Server) handleBulkCreateSolutions(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var req struct {
		Solutions []*registry.TroubleshootingSolution `json:"solutions"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	if len(req.Solutions) == 0 {
		writeError(w, http.StatusBadRequest, "at least one solution is required")
		return
	}

	for _, sol := range req.Solutions {
		if sol.ID == "" {
			sol.ID = generateID()
		}
		if sol.Status == "" {
			sol.Status = "active"
		}
		if sol.Severity == "" {
			sol.Severity = "medium"
		}
	}

	created, err := s.solutionRegistry.BulkCreate(ctx, req.Solutions)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"created": created})
}

// Solution execution handlers

func (s *Server) handleRecordSolutionExecution(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	solutionID := r.PathValue("id")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var exec registry.SolutionExecution
	if err := json.Unmarshal(body, &exec); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	if exec.ID == "" {
		exec.ID = generateID()
	}
	exec.SolutionID = solutionID

	if err := s.solutionRegistry.RecordExecution(ctx, &exec); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, exec)
}

func (s *Server) handleListSolutionExecutions(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	solutionID := r.PathValue("id")

	execs, total, err := s.solutionRegistry.ListExecutions(ctx, solutionID, registry.ListOptions{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"executions": execs, "total": total})
}
