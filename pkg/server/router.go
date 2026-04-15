package server

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"strconv"
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

	// Hook endpoints
	mux.HandleFunc("GET /api/v1/hooks", s.handleListHooks)
	mux.HandleFunc("POST /api/v1/hooks", s.handleCreateHook)
	mux.HandleFunc("GET /api/v1/hooks/{id}", s.handleGetHook)
	mux.HandleFunc("PUT /api/v1/hooks/{id}", s.handleUpdateHook)
	mux.HandleFunc("DELETE /api/v1/hooks/{id}", s.handleDeleteHook)
	mux.HandleFunc("GET /api/v1/hooks/{id}/executions", s.handleListHookExecutions)

	// RAG Document endpoints
	mux.HandleFunc("GET /api/v1/rag/collections/{id}/documents", s.handleListRAGDocuments)
	mux.HandleFunc("POST /api/v1/rag/collections/{id}/documents", s.handleCreateRAGDocument)
	mux.HandleFunc("GET /api/v1/rag/documents/{id}", s.handleGetRAGDocument)
	mux.HandleFunc("PUT /api/v1/rag/documents/{id}", s.handleUpdateRAGDocument)
	mux.HandleFunc("DELETE /api/v1/rag/documents/{id}", s.handleDeleteRAGDocument)
	mux.HandleFunc("GET /api/v1/rag/collections/{id}/ingestions", s.handleListRAGIngestions)

	// FTA Document endpoints
	mux.HandleFunc("GET /api/v1/fta/documents", s.handleListFTADocuments)
	mux.HandleFunc("POST /api/v1/fta/documents", s.handleCreateFTADocument)
	mux.HandleFunc("GET /api/v1/fta/documents/{id}", s.handleGetFTADocument)
	mux.HandleFunc("PUT /api/v1/fta/documents/{id}", s.handleUpdateFTADocument)
	mux.HandleFunc("DELETE /api/v1/fta/documents/{id}", s.handleDeleteFTADocument)
	mux.HandleFunc("GET /api/v1/fta/documents/{id}/results", s.handleListFTAResults)
	mux.HandleFunc("POST /api/v1/fta/documents/{id}/results", s.handleCreateFTAResult)

	// Code Analysis endpoints
	mux.HandleFunc("GET /api/v1/analyses", s.handleListAnalyses)
	mux.HandleFunc("POST /api/v1/analyses", s.handleCreateAnalysis)
	mux.HandleFunc("GET /api/v1/analyses/{id}", s.handleGetAnalysis)
	mux.HandleFunc("PUT /api/v1/analyses/{id}", s.handleUpdateAnalysis)
	mux.HandleFunc("DELETE /api/v1/analyses/{id}", s.handleDeleteAnalysis)
	mux.HandleFunc("GET /api/v1/analyses/{id}/findings", s.handleListFindings)
	mux.HandleFunc("POST /api/v1/analyses/{id}/findings", s.handleAddFindings)

	// Corpus import endpoints
	mux.HandleFunc("POST /api/v1/corpus/import", s.handleCorpusImport)

	// Memory endpoints
	mux.HandleFunc("GET /api/v1/memory/{agent_id}/conversations", s.handleListConversations)
	mux.HandleFunc("GET /api/v1/memory/conversations/{id}", s.handleGetConversation)
	mux.HandleFunc("POST /api/v1/memory/conversations/{id}/messages", s.handleAddMessage)
	mux.HandleFunc("DELETE /api/v1/memory/conversations/{id}", s.handleDeleteConversation)
	mux.HandleFunc("GET /api/v1/memory/{agent_id}/long-term", s.handleSearchLongTermMemory)
	mux.HandleFunc("POST /api/v1/memory/long-term", s.handleStoreLongTermMemory)
	mux.HandleFunc("GET /api/v1/memory/long-term/{id}", s.handleGetLongTermMemory)
	mux.HandleFunc("PUT /api/v1/memory/long-term/{id}", s.handleUpdateLongTermMemory)
	mux.HandleFunc("DELETE /api/v1/memory/long-term/{id}", s.handleDeleteLongTermMemory)
	mux.HandleFunc("POST /api/v1/memory/prune", s.handlePruneMemories)

	// Troubleshooting solution endpoints
	mux.HandleFunc("GET /api/v1/solutions", s.handleListSolutions)
	mux.HandleFunc("POST /api/v1/solutions", s.handleCreateSolution)
	mux.HandleFunc("GET /api/v1/solutions/{id}", s.handleGetSolution)
	mux.HandleFunc("PUT /api/v1/solutions/{id}", s.handleUpdateSolution)
	mux.HandleFunc("DELETE /api/v1/solutions/{id}", s.handleDeleteSolution)
	mux.HandleFunc("POST /api/v1/solutions/search", s.handleSearchSolutions)
	mux.HandleFunc("POST /api/v1/solutions/bulk", s.handleBulkCreateSolutions)
	mux.HandleFunc("GET /api/v1/solutions/{id}/executions", s.handleListSolutionExecutions)
	mux.HandleFunc("POST /api/v1/solutions/{id}/executions", s.handleRecordSolutionExecution)

	// Call Graph endpoints
	mux.HandleFunc("GET /api/v1/call-graphs", s.handleListCallGraphs)
	mux.HandleFunc("POST /api/v1/call-graphs", s.handleCreateCallGraph)
	mux.HandleFunc("GET /api/v1/call-graphs/{id}", s.handleGetCallGraph)
	mux.HandleFunc("DELETE /api/v1/call-graphs/{id}", s.handleDeleteCallGraph)
	mux.HandleFunc("GET /api/v1/call-graphs/{id}/nodes", s.handleListCallGraphNodes)
	mux.HandleFunc("GET /api/v1/call-graphs/{id}/edges", s.handleListCallGraphEdges)
	mux.HandleFunc("GET /api/v1/call-graphs/{id}/subgraph", s.handleGetCallGraphSubgraph)

	// Traffic Capture endpoints
	mux.HandleFunc("GET /api/v1/traffic/captures", s.handleListTrafficCaptures)
	mux.HandleFunc("POST /api/v1/traffic/captures", s.handleCreateTrafficCapture)
	mux.HandleFunc("GET /api/v1/traffic/captures/{id}", s.handleGetTrafficCapture)
	mux.HandleFunc("DELETE /api/v1/traffic/captures/{id}", s.handleDeleteTrafficCapture)
	mux.HandleFunc("POST /api/v1/traffic/captures/{id}/records", s.handleAddTrafficRecords)
	mux.HandleFunc("GET /api/v1/traffic/captures/{id}/records", s.handleListTrafficRecords)

	// Traffic Graph endpoints
	mux.HandleFunc("GET /api/v1/traffic/graphs", s.handleListTrafficGraphs)
	mux.HandleFunc("POST /api/v1/traffic/graphs", s.handleCreateTrafficGraph)
	mux.HandleFunc("GET /api/v1/traffic/graphs/{id}", s.handleGetTrafficGraph)
	mux.HandleFunc("PUT /api/v1/traffic/graphs/{id}", s.handleUpdateTrafficGraph)
	mux.HandleFunc("DELETE /api/v1/traffic/graphs/{id}", s.handleDeleteTrafficGraph)
	mux.HandleFunc("POST /api/v1/traffic/graphs/{id}/analyze", s.handleAnalyzeTrafficGraph)
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":    "healthy",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}

func (s *Server) handleSystemInfo(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"version":     version.Version,
		"commit":      version.Commit,
		"build_date":  version.BuildDate,
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
		Message        string         `json:"message"`
		Context        map[string]any `json:"context,omitempty"`
		ConversationID string         `json:"conversation_id,omitempty"`
		Stream         bool           `json:"stream,omitempty"`
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
		definition = workflow.Tree // Use Tree directly if no nested definition
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
			"message": "collection deleted",
			"id":      id,
			"name":    collection.Name,
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
		"collection_id":   result.CollectionID,
		"status":          "completed",
		"documents_added": result.IngestedCount,
		"success":         result.Success,
		"message":         "Document ingestion completed",
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

// Hook handlers

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

func (s *Server) handleListRAGDocuments(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	collectionID := r.PathValue("id")

	docs, total, err := s.ragDocumentRegistry.ListDocuments(ctx, collectionID, registry.ListOptions{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"documents": docs, "total": total})
}

func (s *Server) handleCreateRAGDocument(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	collectionID := r.PathValue("id")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var doc registry.RAGDocument
	if err := json.Unmarshal(body, &doc); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	if doc.ID == "" {
		doc.ID = generateID()
	}
	doc.CollectionID = collectionID
	if doc.Title == "" {
		writeError(w, http.StatusBadRequest, "document title is required")
		return
	}

	if err := s.ragDocumentRegistry.CreateDocument(ctx, &doc); err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, doc)
}

func (s *Server) handleGetRAGDocument(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	doc, err := s.ragDocumentRegistry.GetDocument(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, doc)
}

func (s *Server) handleUpdateRAGDocument(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var doc registry.RAGDocument
	if err := json.Unmarshal(body, &doc); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}
	doc.ID = id

	if err := s.ragDocumentRegistry.UpdateDocument(ctx, &doc); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, doc)
}

func (s *Server) handleDeleteRAGDocument(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	if err := s.ragDocumentRegistry.DeleteDocument(ctx, id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "document deleted", "id": id})
}

func (s *Server) handleListRAGIngestions(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	collectionID := r.PathValue("id")

	records, total, err := s.ragDocumentRegistry.ListIngestionHistory(ctx, collectionID, registry.ListOptions{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ingestions": records, "total": total})
}

// FTA Document handlers

func (s *Server) handleListFTADocuments(w http.ResponseWriter, _ *http.Request) {
	ctx := context.Background()
	docs, total, err := s.ftaDocumentRegistry.ListDocuments(ctx, registry.ListOptions{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"documents": docs, "total": total})
}

func (s *Server) handleCreateFTADocument(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var doc registry.FTADocument
	if err := json.Unmarshal(body, &doc); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	if doc.ID == "" {
		doc.ID = generateID()
	}
	if doc.Name == "" {
		writeError(w, http.StatusBadRequest, "document name is required")
		return
	}

	if err := s.ftaDocumentRegistry.CreateDocument(ctx, &doc); err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, doc)
}

func (s *Server) handleGetFTADocument(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	doc, err := s.ftaDocumentRegistry.GetDocument(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, doc)
}

func (s *Server) handleUpdateFTADocument(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var doc registry.FTADocument
	if err := json.Unmarshal(body, &doc); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}
	doc.ID = id

	if err := s.ftaDocumentRegistry.UpdateDocument(ctx, &doc); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, doc)
}

func (s *Server) handleDeleteFTADocument(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	if err := s.ftaDocumentRegistry.DeleteDocument(ctx, id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "FTA document deleted", "id": id})
}

func (s *Server) handleListFTAResults(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	docID := r.PathValue("id")

	results, total, err := s.ftaDocumentRegistry.ListAnalysisResults(ctx, docID, registry.ListOptions{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"results": results, "total": total})
}

func (s *Server) handleCreateFTAResult(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	docID := r.PathValue("id")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var result registry.FTAAnalysisResult
	if err := json.Unmarshal(body, &result); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	if result.ID == "" {
		result.ID = generateID()
	}
	result.DocumentID = docID

	if err := s.ftaDocumentRegistry.CreateAnalysisResult(ctx, &result); err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, result)
}

// Code Analysis handlers

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

func (s *Server) handleListConversations(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	agentID := r.PathValue("agent_id")

	convIDs, total, err := s.memoryRegistry.ListConversations(ctx, agentID, registry.ListOptions{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"conversations": convIDs, "total": total})
}

func (s *Server) handleGetConversation(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	convID := r.PathValue("id")

	limit := 100
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	msgs, err := s.memoryRegistry.GetConversation(ctx, convID, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"messages": msgs, "total": len(msgs)})
}

func (s *Server) handleAddMessage(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	convID := r.PathValue("id")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var msg registry.ShortTermMemory
	if err := json.Unmarshal(body, &msg); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	if msg.ID == "" {
		msg.ID = generateID()
	}
	msg.ConversationID = convID
	if msg.Role == "" {
		writeError(w, http.StatusBadRequest, "message role is required")
		return
	}

	if err := s.memoryRegistry.AddMessage(ctx, &msg); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, msg)
}

func (s *Server) handleDeleteConversation(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	convID := r.PathValue("id")

	if err := s.memoryRegistry.DeleteConversation(ctx, convID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "conversation deleted", "id": convID})
}

func (s *Server) handleSearchLongTermMemory(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	agentID := r.PathValue("agent_id")
	userID := r.URL.Query().Get("user_id")
	memoryType := r.URL.Query().Get("type")

	memories, total, err := s.memoryRegistry.SearchLongTermMemory(ctx, agentID, userID, memoryType, registry.ListOptions{})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"memories": memories, "total": total})
}

func (s *Server) handleStoreLongTermMemory(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var mem registry.LongTermMemory
	if err := json.Unmarshal(body, &mem); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	if mem.ID == "" {
		mem.ID = generateID()
	}
	if mem.AgentID == "" {
		writeError(w, http.StatusBadRequest, "agent_id is required")
		return
	}

	if err := s.memoryRegistry.StoreLongTermMemory(ctx, &mem); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, mem)
}

func (s *Server) handleGetLongTermMemory(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	mem, err := s.memoryRegistry.GetLongTermMemory(ctx, id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}

	// Increment access count on read
	_ = s.memoryRegistry.IncrementAccessCount(ctx, id)

	writeJSON(w, http.StatusOK, mem)
}

func (s *Server) handleUpdateLongTermMemory(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var mem registry.LongTermMemory
	if err := json.Unmarshal(body, &mem); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}
	mem.ID = id

	if err := s.memoryRegistry.UpdateLongTermMemory(ctx, &mem); err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, mem)
}

func (s *Server) handleDeleteLongTermMemory(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	id := r.PathValue("id")

	if err := s.memoryRegistry.DeleteLongTermMemory(ctx, id); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"message": "memory deleted", "id": id})
}

func (s *Server) handlePruneMemories(w http.ResponseWriter, _ *http.Request) {
	ctx := context.Background()

	pruned, err := s.memoryRegistry.PruneExpiredMemories(ctx)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"pruned": pruned})
}

// Call Graph handlers

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
		capture.ID = fmt.Sprintf("tc-%d", rand.Intn(999999))
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
			rec.ID = fmt.Sprintf("tr-%d", rand.Intn(999999))
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
		graph.ID = fmt.Sprintf("tg-%d", rand.Intn(999999))
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
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
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
