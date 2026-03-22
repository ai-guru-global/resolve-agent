package middleware

import (
	"net/http"
)

// Tracing returns an HTTP middleware that creates OpenTelemetry spans.
func Tracing() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// TODO: Implement OpenTelemetry span creation
			// ctx, span := otel.Tracer("resolvenet").Start(r.Context(), r.URL.Path)
			// defer span.End()
			// r = r.WithContext(ctx)
			next.ServeHTTP(w, r)
		})
	}
}
