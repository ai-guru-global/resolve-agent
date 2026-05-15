package server

import (
	"net/http"
	"time"

	"github.com/ai-guru-global/resolve-agent/pkg/version"
)
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

