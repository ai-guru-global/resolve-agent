package server

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
	"github.com/google/uuid"
)
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

	// Map "definition" field to Tree when Tree is empty (API contract compatibility)
	if workflow.Tree == nil {
		var raw struct {
			Definition map[string]any `json:"definition"`
		}
		if err := json.Unmarshal(body, &raw); err == nil && raw.Definition != nil {
			workflow.Tree = raw.Definition
		}
	}

	// Generate ID server-side when omitted (REST convention)
	if workflow.ID == "" {
		workflow.ID = uuid.NewString()
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

