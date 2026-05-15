package server

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"time"

	"github.com/ai-guru-global/resolve-agent/pkg/registry"
)
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

