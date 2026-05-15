package server

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
)
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

