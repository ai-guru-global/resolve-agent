package server

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
)
func (s *Server) handleListHooks(w http.ResponseWriter, _ *http.Request) {
	ctx := context.Background()
	hooks, total, err := s.hookRegistry.List(ctx, registry.ListOptions{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"hooks": hooks, "total": total})
}

func (s *Server) handleCreateHook(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var hook registry.HookDefinition
	if err := json.Unmarshal(body, &hook); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	if hook.ID == "" {
		hook.ID = generateID()
	}
	if hook.Name == "" {
		writeError(w, http.StatusBadRequest, "hook name is required")
		return
	}
	if hook.TriggerPoint == "" {
		writeError(w, http.StatusBadRequest, "trigger_point is required")
		return
	}

	if err := s.hookRegistry.Create(ctx, &hook); err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, hook)
}

func (s *Server) handleGetHook(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	hook, err := s.hookRegistry.Get(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, hook)
}

func (s *Server) handleUpdateHook(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var hook registry.HookDefinition
	if err := json.Unmarshal(body, &hook); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}
	hook.ID = id

	if err := s.hookRegistry.Update(ctx, &hook); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, hook)
}

func (s *Server) handleDeleteHook(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	if err := s.hookRegistry.Delete(ctx, id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "hook deleted", "id": id})
}

func (s *Server) handleListHookExecutions(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	execs, total, err := s.hookRegistry.ListExecutions(ctx, id, registry.ListOptions{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"executions": execs, "total": total})
}

// RAG Document handlers

