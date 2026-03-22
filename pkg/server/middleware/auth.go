package middleware

import (
	"log/slog"
	"net/http"
)

// Auth returns an HTTP middleware that validates authentication tokens.
func Auth(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// TODO: Implement JWT/API key validation
			// For now, pass through all requests
			next.ServeHTTP(w, r)
		})
	}
}
