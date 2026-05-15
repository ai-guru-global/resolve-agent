package server

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
)
func (s *Server) handleListSkills(w http.ResponseWriter, _ *http.Request) {
	ctx := context.Background()
	skills, total, err := s.skillRegistry.List(ctx, registry.ListOptions{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"skills": skills,
		"total":  total,
	})
}

func (s *Server) handleRegisterSkill(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var skill registry.SkillDefinition
	if err := json.Unmarshal(body, &skill); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	if skill.Name == "" {
		writeError(w, http.StatusBadRequest, "skill name is required")
		return
	}
	if skill.Status == "" {
		skill.Status = "active"
	}

	if err := s.skillRegistry.Register(ctx, &skill); err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, skill)
}

func (s *Server) handleGetSkill(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	name := r.PathValue("name")

	skill, err := s.skillRegistry.Get(ctx, name)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, skill)
}

func (s *Server) handleUnregisterSkill(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	name := r.PathValue("name")

	if err := s.skillRegistry.Unregister(ctx, name); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "skill unregistered", "name": name})
}

// Workflow handlers

