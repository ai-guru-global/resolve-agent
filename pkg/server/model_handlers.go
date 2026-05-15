package server

import "net/http"
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

