package server

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
)
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

