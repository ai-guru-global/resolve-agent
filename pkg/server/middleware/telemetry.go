package middleware

import (
	"net/http"
	"time"

	"github.com/ai-guru-global/resolve-agent/pkg/telemetry"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

// TelemetryMiddleware combines tracing and metrics collection
func TelemetryMiddleware(next http.Handler) http.Handler {
	return otelhttp.NewHandler(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			metricsHandler(next).ServeHTTP(w, r)
		}),
		"http.request",
	)
}

// metricsHandler wraps the handler with metrics collection
func metricsHandler(next http.Handler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		telemetry.IncActiveRequests()
		defer telemetry.DecActiveRequests()

		wrapped := &metricsResponseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start)
		status := http.StatusText(wrapped.statusCode)
		if wrapped.statusCode < 400 {
			status = "success"
		} else {
			status = "error"
		}
		telemetry.RecordRequest(r.Method, r.URL.Path, status, duration)
	}
}

// metricsResponseWriter wraps http.ResponseWriter to capture status code
type metricsResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *metricsResponseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
