package server

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

// handleCorpusImport handles POST /api/v1/corpus/import
// It proxies the request to the Python runtime and streams SSE events back.
func (s *Server) handleCorpusImport(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeError(w, http.StatusBadRequest, "failed to read request body")
		return
	}

	var req struct {
		Source          string   `json:"source"`
		ImportTypes     []string `json:"import_types,omitempty"`
		RAGCollectionID string   `json:"rag_collection_id,omitempty"`
		Profile         string   `json:"profile,omitempty"`
		ForceClone      bool     `json:"force_clone,omitempty"`
		DryRun          bool     `json:"dry_run,omitempty"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	if req.Source == "" {
		writeError(w, http.StatusBadRequest, "source is required")
		return
	}

	// Forward to Python runtime
	importReq := &CorpusImportRequest{
		Source:          req.Source,
		ImportTypes:     req.ImportTypes,
		RAGCollectionID: req.RAGCollectionID,
		Profile:         req.Profile,
		ForceClone:      req.ForceClone,
		DryRun:          req.DryRun,
	}

	ctx := r.Context()
	resultCh, errCh := s.runtimeClient.ImportCorpus(ctx, importReq)

	// Check for immediate errors
	select {
	case err := <-errCh:
		if err != nil {
			s.logger.Error("Corpus import failed", "error", err, "source", req.Source)
			writeError(w, http.StatusInternalServerError, "import failed: "+err.Error())
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

	for {
		select {
		case event, ok := <-resultCh:
			if !ok {
				resultCh = nil
				break
			}

			data, _ := json.Marshal(event)
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()

		case err := <-errCh:
			if err != nil {
				s.logger.Error("Corpus import stream error", "error", err)
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

	s.logger.Info("Corpus import completed", "source", req.Source)
}
