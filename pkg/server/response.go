package server

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/ai-guru-global/resolve-agent/pkg/errors"
)

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// writeRegistryError writes an HTTP error response for a registry error.
// Structured *errors.Error values map to their HTTP status and clean message;
// anything else is logged and answered with a generic internal error so
// internals never leak to clients.
func writeRegistryError(w http.ResponseWriter, err error, logger *slog.Logger, scope string) {
	status := errors.HTTPStatus(err)
	var e *errors.Error
	if errors.As(err, &e) && status != http.StatusInternalServerError {
		writeError(w, status, e.Message)
		return
	}
	logger.Error(scope, "error", err)
	writeError(w, http.StatusInternalServerError, "internal error")
}
