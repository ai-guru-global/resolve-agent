package server

import (
	"net/http"
)
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

