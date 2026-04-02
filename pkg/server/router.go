package server

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"strings"
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
		Message         string         `json:"message"`
		Context         map[string]any `json:"context,omitempty"`
		ConversationID  string         `json:"conversation_id,omitempty"`
		Stream          bool           `json:"stream,omitempty"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	// Forward to Python runtime via HTTP
	executeReq := &ExecuteAgentRequest{
		Input:          req.Message,
		ConversationID: req.ConversationID,
		Context:        req.Context,
	}

	ctx := r.Context()
	resultCh, errCh := s.runtimeClient.ExecuteAgent(ctx, id, executeReq)

	// Check for immediate errors
	select {
	case err := <-errCh:
		if err != nil {
			s.logger.Error("Agent execution failed", "error", err, "agent_id", id)
			writeError(w, http.StatusInternalServerError, "execution failed: "+err.Error())
			return
		}
	case <-ctx.Done():
		writeError(w, http.StatusRequestTimeout, "request timeout")
		return
	default:
		// Continue to streaming
	}

	// Stream response
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "streaming not supported")
		return
	}

	var fullContent strings.Builder
	executionComplete := false

	for {
		select {
		case resp, ok := <-resultCh:
			if !ok {
				resultCh = nil
				break
			}

			// Handle different response types
			switch resp.Type {
			case "content", "content_chunk":
				fullContent.WriteString(resp.Content)
				data, _ := json.Marshal(resp)
				fmt.Fprintf(w, "data: %s\n\n", data)
				flusher.Flush()

			case "event":
				// Check for completion
				if resp.Event != nil && resp.Event.Type == "execution.completed" {
					executionComplete = true
				}
				data, _ := json.Marshal(resp)
				fmt.Fprintf(w, "data: %s\n\n", data)
				flusher.Flush()

			case "error":
				s.logger.Error("Execution error", "error", resp.Error)
				data, _ := json.Marshal(resp)
				fmt.Fprintf(w, "data: %s\n\n", data)
				flusher.Flush()
			}

		case err := <-errCh:
			if err != nil {
				s.logger.Error("Stream error", "error", err)
				data, _ := json.Marshal(map[string]any{"type": "error", "message": err.Error()})
				fmt.Fprintf(w, "data: %s\n\n", data)
				flusher.Flush()
			}
			errCh = nil

		case <-ctx.Done():
			fmt.Fprintf(w, "data: {\"type\": \"error\", \"message\": \"request timeout\"}\n\n")
			flusher.Flush()
			return
		}

		if resultCh == nil && errCh == nil {
			break
		}
	}

	// Send final completion marker
	fmt.Fprintf(w, "data: [DONE]\n\n")
	flusher.Flush()

	s.logger.Info("Agent execution completed",
		"agent_id", id,
		"execution_complete", executionComplete,
		"content_length", fullContent.Len(),
	)
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
	ctx := context.Background()
	id := r.PathValue("id")

	// Get workflow from registry
	workflow, err := s.workflowRegistry.Get(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, "workflow not found: "+err.Error())
		return
	}

	// Validate workflow structure
	validationErrors := []string{}

	// Check required fields
	if workflow.Name == "" {
		validationErrors = append(validationErrors, "workflow name is required")
	}

	// Parse workflow definition from Tree
	definition, ok := workflow.Tree["definition"].(map[string]interface{})
	if !ok {
		definition = workflow.Tree  // Use Tree directly if no nested definition
	}
	if definition == nil || len(definition) == 0 {
		validationErrors = append(validationErrors, "workflow definition is required")
		writeJSON(w, http.StatusOK, map[string]any{
			"workflow_id": id,
			"valid":       false,
			"errors":      validationErrors,
		})
		return
	}

	// Validate nodes
	nodes, ok := definition["nodes"].([]interface{})
	if !ok || len(nodes) == 0 {
		validationErrors = append(validationErrors, "workflow must have at least one node")
	} else {
		// Check for start and end nodes
		hasStart := false
		hasEnd := false
		nodeIDs := make(map[string]bool)

		for _, n := range nodes {
			node, ok := n.(map[string]interface{})
			if !ok {
				continue
			}

			nodeID, _ := node["id"].(string)
			nodeType, _ := node["type"].(string)

			if nodeID == "" {
				validationErrors = append(validationErrors, "all nodes must have an id")
				continue
			}

			if nodeIDs[nodeID] {
				validationErrors = append(validationErrors, "duplicate node id: "+nodeID)
			}
			nodeIDs[nodeID] = true

			// Check node type
			validTypes := map[string]bool{
				"start": true, "end": true, "agent": true, "skill": true,
				"condition": true, "action": true, "wait": true,
			}
			if !validTypes[nodeType] {
				validationErrors = append(validationErrors, "invalid node type '"+nodeType+"' for node "+nodeID)
			}

			if nodeType == "start" {
				hasStart = true
			}
			if nodeType == "end" {
				hasEnd = true
			}
		}

		if !hasStart {
			validationErrors = append(validationErrors, "workflow must have a start node")
		}
		if !hasEnd {
			validationErrors = append(validationErrors, "workflow must have an end node")
		}

		// Validate edges
		edges, ok := definition["edges"].([]interface{})
		if ok {
			for _, e := range edges {
				edge, ok := e.(map[string]interface{})
				if !ok {
					continue
				}

				fromNode, _ := edge["from"].(string)
				toNode, _ := edge["to"].(string)

				if fromNode != "" && !nodeIDs[fromNode] {
					validationErrors = append(validationErrors, "edge references unknown node: "+fromNode)
				}
				if toNode != "" && !nodeIDs[toNode] {
					validationErrors = append(validationErrors, "edge references unknown node: "+toNode)
				}
			}
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"workflow_id": id,
		"valid":       len(validationErrors) == 0,
		"errors":      validationErrors,
	})
}

func (s *Server) handleExecuteWorkflow(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var req struct {
		Input   map[string]any `json:"input"`
		Context map[string]any `json:"context,omitempty"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	// Forward to Python runtime via HTTP
	executeReq := &ExecuteWorkflowRequest{
		Input:   req.Input,
		Context: req.Context,
	}

	ctx := r.Context()
	resultCh, errCh := s.runtimeClient.ExecuteWorkflow(ctx, id, executeReq)

	// Check for immediate errors
	select {
	case err := <-errCh:
		if err != nil {
			s.logger.Error("Workflow execution failed", "error", err, "workflow_id", id)
			writeError(w, http.StatusInternalServerError, "execution failed: "+err.Error())
			return
		}
	case <-ctx.Done():
		writeError(w, http.StatusRequestTimeout, "request timeout")
		return
	default:
		// Continue to streaming
	}

	// Stream response
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		writeError(w, http.StatusInternalServerError, "streaming not supported")
		return
	}

	var fullContent strings.Builder
	executionComplete := false

	for {
		select {
		case resp, ok := <-resultCh:
			if !ok {
				resultCh = nil
				break
			}

			// Handle different response types
			switch resp.Type {
			case "content", "content_chunk":
				fullContent.WriteString(resp.Content)
				data, _ := json.Marshal(resp)
				fmt.Fprintf(w, "data: %s\n\n", data)
				flusher.Flush()

			case "event":
				// Check for completion
				if resp.Event != nil && resp.Event.Type == "workflow.completed" {
					executionComplete = true
				}
				data, _ := json.Marshal(resp)
				fmt.Fprintf(w, "data: %s\n\n", data)
				flusher.Flush()

			case "error":
				s.logger.Error("Workflow execution error", "error", resp.Error)
				data, _ := json.Marshal(resp)
				fmt.Fprintf(w, "data: %s\n\n", data)
				flusher.Flush()
			}

		case err := <-errCh:
			if err != nil {
				s.logger.Error("Workflow stream error", "error", err)
				data, _ := json.Marshal(map[string]any{"type": "error", "message": err.Error()})
				fmt.Fprintf(w, "data: %s\n\n", data)
				flusher.Flush()
			}
			errCh = nil

		case <-ctx.Done():
			fmt.Fprintf(w, "data: {\"type\": \"error\", \"message\": \"request timeout\"}\n\n")
			flusher.Flush()
			return
		}

		if resultCh == nil && errCh == nil {
			break
		}
	}

	// Send final completion marker
	fmt.Fprintf(w, "data: [DONE]\n\n")
	flusher.Flush()

	s.logger.Info("Workflow execution completed",
		"workflow_id", id,
		"execution_complete", executionComplete,
		"content_length", fullContent.Len(),
	)
}

// RAG handlers

func (s *Server) handleListCollections(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	// Get pagination parameters
	limit := 100
	offset := 0

	// Forward to Python runtime via gRPC (placeholder)
	// For now, return sample collections from registry if available
	collections := []map[string]any{}

	// Try to get from RAG registry if available
	if s.ragRegistry != nil {
		cols, total, err := s.ragRegistry.List(ctx, registry.ListOptions{Limit: limit, Offset: offset})
		if err == nil {
			for _, col := range cols {
				collections = append(collections, map[string]any{
					"id":              col.ID,
					"name":            col.Name,
					"description":     col.Description,
					"embedding_model": col.Config["embedding_model"],
					"chunk_strategy":  col.Config["chunk_strategy"],
					"document_count":  col.Config["document_count"],
					"vector_count":    col.Config["vector_count"],
					"status":          col.Status,
					"created_at":      col.CreatedAt,
					"updated_at":      col.UpdatedAt,
				})
			}
			writeJSON(w, http.StatusOK, map[string]any{
				"collections": collections,
				"total":       total,
			})
			return
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"collections": collections,
		"total":       len(collections),
	})
}

func (s *Server) handleCreateCollection(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var req struct {
		Name           string            `json:"name"`
		Description    string            `json:"description"`
		EmbeddingModel string            `json:"embedding_model"`
		ChunkStrategy  string            `json:"chunk_strategy"`
		Labels         map[string]string `json:"labels"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "collection name is required")
		return
	}

	// Set defaults
	if req.EmbeddingModel == "" {
		req.EmbeddingModel = "bge-large-zh"
	}
	if req.ChunkStrategy == "" {
		req.ChunkStrategy = "sentence"
	}

	// Create collection in registry
	if s.ragRegistry != nil {
		collection := &registry.RAGCollection{
			ID:          generateID(),
			Name:        req.Name,
			Description: req.Description,
			Status:      "active",
			Config: map[string]any{
				"embedding_model": req.EmbeddingModel,
				"chunk_strategy":  req.ChunkStrategy,
				"document_count":  0,
				"vector_count":    0,
			},
			Labels: req.Labels,
		}

		if err := s.ragRegistry.Create(ctx, collection); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		// Forward to Python runtime for vector store creation
		// TODO: Call Python RAG service via gRPC

		writeJSON(w, http.StatusCreated, map[string]any{
			"id":              collection.ID,
			"name":            collection.Name,
			"description":     collection.Description,
			"embedding_model": req.EmbeddingModel,
			"chunk_strategy":  req.ChunkStrategy,
			"document_count":  0,
			"vector_count":    0,
			"status":          collection.Status,
			"created_at":      collection.CreatedAt,
		})
		return
	}

	writeError(w, http.StatusServiceUnavailable, "RAG service not available")
}

func (s *Server) handleDeleteCollection(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	if id == "" {
		writeError(w, http.StatusBadRequest, "collection ID is required")
		return
	}

	if s.ragRegistry != nil {
		// Get collection info before deletion
		collection, err := s.ragRegistry.Get(ctx, id)
		if err != nil {
			writeError(w, http.StatusNotFound, "collection not found")
			return
		}

		// Delete from registry
		if err := s.ragRegistry.Delete(ctx, id); err != nil {
			writeError(w, http.StatusInternalServerError, err.Error())
			return
		}

		// Forward to Python runtime for vector store deletion
		// TODO: Call Python RAG service via gRPC

		writeJSON(w, http.StatusOK, map[string]string{
			"message":    "collection deleted",
			"id":         id,
			"name":       collection.Name,
		})
		return
	}

	writeError(w, http.StatusServiceUnavailable, "RAG service not available")
}

func (s *Server) handleIngestDocuments(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	collectionID := r.PathValue("id")

	if collectionID == "" {
		writeError(w, http.StatusBadRequest, "collection ID is required")
		return
	}

	// Verify collection exists
	if s.ragRegistry != nil {
		_, err := s.ragRegistry.Get(ctx, collectionID)
		if err != nil {
			writeError(w, http.StatusNotFound, "collection not found")
			return
		}
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var req struct {
		Documents []struct {
			Content  string                 `json:"content"`
			Metadata map[string]interface{} `json:"metadata"`
		} `json:"documents"`
		FilePath string `json:"file_path"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	// Forward to Python runtime for document ingestion
	docs := make([]map[string]interface{}, len(req.Documents))
	for i, doc := range req.Documents {
		docs[i] = map[string]interface{}{
			"content":  doc.Content,
			"metadata": doc.Metadata,
		}
	}

	ingestReq := &RAGIngestRequest{
		CollectionID: collectionID,
		Documents:    docs,
	}

	result, err := s.runtimeClient.IngestRAG(ctx, ingestReq)
	if err != nil {
		s.logger.Error("RAG ingest failed", "error", err, "collection_id", collectionID)
		writeError(w, http.StatusInternalServerError, "ingestion failed: "+err.Error())
		return
	}

	writeJSON(w, http.StatusAccepted, map[string]any{
		"collection_id":    result.CollectionID,
		"status":           "completed",
		"documents_added":  result.IngestedCount,
		"success":          result.Success,
		"message":          "Document ingestion completed",
	})
}

func (s *Server) handleQueryCollection(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	collectionID := r.PathValue("id")

	if collectionID == "" {
		writeError(w, http.StatusBadRequest, "collection ID is required")
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var req struct {
		Query   string                 `json:"query"`
		TopK    int                    `json:"top_k"`
		Filters map[string]interface{} `json:"filters"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	if req.Query == "" {
		writeError(w, http.StatusBadRequest, "query is required")
		return
	}

	if req.TopK <= 0 {
		req.TopK = 5
	}
	if req.TopK > 100 {
		req.TopK = 100
	}

	// Forward to Python runtime for query execution
	queryReq := &RAGQueryRequest{
		CollectionID: collectionID,
		Query:        req.Query,
		TopK:         req.TopK,
		Filters:      req.Filters,
	}

	start := time.Now()
	result, err := s.runtimeClient.QueryRAG(ctx, queryReq)
	duration := time.Since(start)

	if err != nil {
		s.logger.Error("RAG query failed", "error", err, "collection_id", collectionID)
		writeError(w, http.StatusInternalServerError, "query failed: "+err.Error())
		return
	}

	// Format results
	results := make([]map[string]any, len(result.Results))
	for i, r := range result.Results {
		results[i] = map[string]any{
			"content":     r.Content,
			"score":       r.Score,
			"document_id": r.Source,
			"metadata":    r.Metadata,
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"query":       req.Query,
		"results":     results,
		"total":       len(results),
		"duration_ms": duration.Milliseconds(),
		"collection":  collectionID,
	})
}

// Helper function to generate unique IDs
func generateID() string {
	// Use nanosecond timestamp + random suffix for uniqueness
	return fmt.Sprintf("%d-%04d", time.Now().UnixNano(), rand.Intn(10000))
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
