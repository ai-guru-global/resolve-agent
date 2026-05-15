package server

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
)
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

	// Determine if client wants SSE streaming
	wantStream := req.Stream || r.Header.Get("Accept") == "text/event-stream"

	// Forward to Python runtime via HTTP
	executeReq := &ExecuteAgentRequest{
		Input:          req.Message,
		ConversationID: req.ConversationID,
		Context:        req.Context,
	}

	ctx := r.Context()
	resultCh, errCh := s.runtimeClient.ExecuteAgent(ctx, id, executeReq)

	// Non-streaming mode: collect all chunks and return JSON
	if !wantStream {
		var fullContent strings.Builder
		var lastMetadata map[string]interface{}

		for {
			select {
			case resp, ok := <-resultCh:
				if !ok {
					resultCh = nil
				} else {
					switch resp.Type {
					case "content", "content_chunk":
						fullContent.WriteString(resp.Content)
						if resp.Metadata != nil {
							lastMetadata = resp.Metadata
						}
					case "error":
						if resp.Error != nil {
							writeError(w, http.StatusInternalServerError, resp.Error.Message)
							return
						}
					}
				}
			case err := <-errCh:
				if err != nil {
					s.logger.Error("Agent execution failed", "error", err, "agent_id", id)
					writeError(w, http.StatusInternalServerError, "execution failed: "+err.Error())
					return
				}
				errCh = nil
			case <-ctx.Done():
				writeError(w, http.StatusRequestTimeout, "request timeout")
				return
			}
			if resultCh == nil && errCh == nil {
				break
			}
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"agent_id": id,
			"content":  fullContent.String(),
			"metadata": lastMetadata,
		})
		return
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

