package server

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
	"github.com/ai-guru-global/resolve-agent/pkg/version"
)

// registerHTTPRoutes sets up REST API routes.
func (s *Server) registerHTTPRoutes(mux *http.ServeMux) {
	// Health check
	mux.HandleFunc("GET /api/v1/health", s.handleHealth)

	// System info
	mux.HandleFunc("GET /api/v1/system/info", s.handleSystemInfo)

	// Agent endpoints
	mux.HandleFunc("GET /api/v1/agents", s.handleListAgents)
	mux.HandleFunc("POST /api/v1/agents", s.handleCreateAgent)
	mux.HandleFunc("GET /api/v1/agents/{id}", s.handleGetAgent)
	mux.HandleFunc("PUT /api/v1/agents/{id}", s.handleUpdateAgent)
	mux.HandleFunc("DELETE /api/v1/agents/{id}", s.handleDeleteAgent)
	mux.HandleFunc("POST /api/v1/agents/{id}/execute", s.handleExecuteAgent)

	// Skill endpoints
	mux.HandleFunc("GET /api/v1/skills", s.handleListSkills)
	mux.HandleFunc("POST /api/v1/skills", s.handleRegisterSkill)
	mux.HandleFunc("GET /api/v1/skills/{name}", s.handleGetSkill)
	mux.HandleFunc("DELETE /api/v1/skills/{name}", s.handleUnregisterSkill)

	// Workflow endpoints
	mux.HandleFunc("GET /api/v1/workflows", s.handleListWorkflows)
	mux.HandleFunc("POST /api/v1/workflows", s.handleCreateWorkflow)
	mux.HandleFunc("GET /api/v1/workflows/{id}", s.handleGetWorkflow)
	mux.HandleFunc("PUT /api/v1/workflows/{id}", s.handleUpdateWorkflow)
	mux.HandleFunc("DELETE /api/v1/workflows/{id}", s.handleDeleteWorkflow)
	mux.HandleFunc("POST /api/v1/workflows/{id}/validate", s.handleValidateWorkflow)
	mux.HandleFunc("POST /api/v1/workflows/{id}/execute", s.handleExecuteWorkflow)

	// RAG endpoints
	mux.HandleFunc("GET /api/v1/rag/collections", s.handleListCollections)
	mux.HandleFunc("POST /api/v1/rag/collections", s.handleCreateCollection)
	mux.HandleFunc("DELETE /api/v1/rag/collections/{id}", s.handleDeleteCollection)
	mux.HandleFunc("POST /api/v1/rag/collections/{id}/ingest", s.handleIngestDocuments)
	mux.HandleFunc("POST /api/v1/rag/collections/{id}/query", s.handleQueryCollection)

	// Model endpoints
	mux.HandleFunc("GET /api/v1/models", s.handleListModels)
	mux.HandleFunc("POST /api/v1/models", s.handleAddModel)

	// Config endpoints
	mux.HandleFunc("GET /api/v1/config", s.handleGetConfig)
	mux.HandleFunc("PUT /api/v1/config", s.handleUpdateConfig)
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":    "healthy",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

func (s *Server) handleSystemInfo(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"version":    version.Version,
		"commit":     version.Commit,
		"build_date": version.BuildDate,
		"server_time": time.Now().UTC().Format(time.RFC3339),
	})
}

// Agent handlers

func (s *Server) handleListAgents(w http.ResponseWriter, _ *http.Request) {
	ctx := context.Background()
	agents, total, err := s.agentRegistry.List(ctx, registry.ListOptions{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"agents": agents,
		"total":  total,
	})
}

func (s *Server) handleCreateAgent(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var agent registry.AgentDefinition
	if err := json.Unmarshal(body, &agent); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	// Validate required fields
	if agent.ID == "" {
		writeError(w, http.StatusBadRequest, "agent ID is required")
		return
	}
	if agent.Name == "" {
		writeError(w, http.StatusBadRequest, "agent name is required")
		return
	}
	if agent.Type == "" {
		agent.Type = "mega" // default type
	}
	if agent.Status == "" {
		agent.Status = "active"
	}

	if err := s.agentRegistry.Create(ctx, &agent); err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, agent)
}

func (s *Server) handleGetAgent(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	agent, err := s.agentRegistry.Get(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, agent)
}

func (s *Server) handleUpdateAgent(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var agent registry.AgentDefinition
	if err := json.Unmarshal(body, &agent); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	agent.ID = id // ensure ID matches path

	if err := s.agentRegistry.Update(ctx, &agent); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, agent)
}

func (s *Server) handleDeleteAgent(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	if err := s.agentRegistry.Delete(ctx, id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "agent deleted", "id": id})
}

func (s *Server) handleExecuteAgent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var req struct {
		Message string            `json:"message"`
		Context map[string]any    `json:"context,omitempty"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	// TODO: Forward to Python runtime via gRPC
	// For now, return a placeholder response
	writeJSON(w, http.StatusOK, map[string]any{
		"agent_id": id,
		"response": "Agent execution not yet fully implemented",
		"message":  req.Message,
	})
}

// Skill handlers

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

func (s *Server) handleListWorkflows(w http.ResponseWriter, _ *http.Request) {
	ctx := context.Background()
	workflows, total, err := s.workflowRegistry.List(ctx, registry.ListOptions{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"workflows": workflows,
		"total":     total,
	})
}

func (s *Server) handleCreateWorkflow(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var workflow registry.WorkflowDefinition
	if err := json.Unmarshal(body, &workflow); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	if workflow.ID == "" {
		writeError(w, http.StatusBadRequest, "workflow ID is required")
		return
	}
	if workflow.Name == "" {
		writeError(w, http.StatusBadRequest, "workflow name is required")
		return
	}
	if workflow.Status == "" {
		workflow.Status = "draft"
	}

	if err := s.workflowRegistry.Create(ctx, &workflow); err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, workflow)
}

func (s *Server) handleGetWorkflow(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	workflow, err := s.workflowRegistry.Get(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, workflow)
}

func (s *Server) handleUpdateWorkflow(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var workflow registry.WorkflowDefinition
	if err := json.Unmarshal(body, &workflow); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	workflow.ID = id

	if err := s.workflowRegistry.Update(ctx, &workflow); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, workflow)
}

func (s *Server) handleDeleteWorkflow(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	if err := s.workflowRegistry.Delete(ctx, id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"message": "workflow deleted", "id": id})
}

func (s *Server) handleValidateWorkflow(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	// TODO: Implement workflow validation logic
	writeJSON(w, http.StatusOK, map[string]any{
		"workflow_id": id,
		"valid":       true,
		"errors":      []string{},
	})
}

func (s *Server) handleExecuteWorkflow(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	// TODO: Forward to Python runtime for execution
	writeJSON(w, http.StatusOK, map[string]any{
		"workflow_id": id,
		"status":      "executed",
		"result":      "Workflow execution not yet fully implemented",
	})
}

// RAG handlers (placeholders)

func (s *Server) handleListCollections(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"collections": []any{},
		"total":       0,
	})
}

func (s *Server) handleCreateCollection(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "RAG collections not yet implemented")
}

func (s *Server) handleDeleteCollection(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "RAG collections not yet implemented")
}

func (s *Server) handleIngestDocuments(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "Document ingestion not yet implemented")
}

func (s *Server) handleQueryCollection(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "Collection query not yet implemented")
}

// Model handlers

func (s *Server) handleListModels(w http.ResponseWriter, _ *http.Request) {
	// Return hardcoded model list for now
	models := []map[string]any{
		{
			"id":               "qwen-plus",
			"provider":         "qwen",
			"gateway_endpoint": "/llm/models/qwen-plus",
			"enabled":          true,
		},
		{
			"id":               "qwen-turbo",
			"provider":         "qwen",
			"gateway_endpoint": "/llm/models/qwen-turbo",
			"enabled":          true,
		},
		{
			"id":               "qwen-max",
			"provider":         "qwen",
			"gateway_endpoint": "/llm/models/qwen-max",
			"enabled":          true,
		},
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"models": models,
		"total":  len(models),
	})
}

func (s *Server) handleAddModel(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "Model registration not yet implemented")
}

// Config handlers

func (s *Server) handleGetConfig(w http.ResponseWriter, _ *http.Request) {
	// Return sanitized config (no secrets)
	writeJSON(w, http.StatusOK, map[string]any{
		"server": map[string]string{
			"http_addr": s.cfg.Server.HTTPAddr,
			"grpc_addr": s.cfg.Server.GRPCAddr,
		},
		"gateway": map[string]any{
			"enabled": s.cfg.Gateway.Enabled,
		},
	})
}

func (s *Server) handleUpdateConfig(w http.ResponseWriter, r *http.Request) {
	writeError(w, http.StatusNotImplemented, "Config update not yet implemented")
}

// Helper functions

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
