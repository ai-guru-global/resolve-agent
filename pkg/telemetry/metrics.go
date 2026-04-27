package telemetry

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"runtime"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

var (
	// prometheusRegistry is the global prometheus registry
	prometheusRegistry *prometheus.Registry

	// Common metrics
	requestCounter  prometheus.Counter
	requestDuration prometheus.Histogram
	activeRequests  prometheus.Gauge
	agentExecutions *prometheus.CounterVec
	agentLatency    *prometheus.HistogramVec
)

// MetricsConfig contains configuration for metrics
type MetricsConfig struct {
	ServiceName    string
	ServiceVersion string
	Environment    string
	PrometheusPort string
	PrometheusPath string
}

// InitMetrics initializes the OpenTelemetry metrics provider with Prometheus exporter.
func InitMetrics(cfg MetricsConfig, logger *slog.Logger) (func(), error) {
	if cfg.ServiceName == "" {
		cfg.ServiceName = "resolve-agent"
	}
	if cfg.ServiceVersion == "" {
		cfg.ServiceVersion = "0.1.0"
	}
	if cfg.Environment == "" {
		cfg.Environment = os.Getenv("OTEL_ENVIRONMENT")
	}
	if cfg.Environment == "" {
		cfg.Environment = "development"
	}
	if cfg.PrometheusPort == "" {
		cfg.PrometheusPort = "9090"
	}
	if cfg.PrometheusPath == "" {
		cfg.PrometheusPath = "/metrics"
	}

	logger.Info("Initializing OpenTelemetry metrics",
		"service", cfg.ServiceName,
		"version", cfg.ServiceVersion,
		"environment", cfg.Environment,
		"prometheus_port", cfg.PrometheusPort,
		"prometheus_path", cfg.PrometheusPath,
	)

	// Create Prometheus registry
	prometheusRegistry = prometheus.NewRegistry()

	// Create resource
	res, err := resource.New(context.Background(),
		resource.WithAttributes(
			semconv.ServiceName(cfg.ServiceName),
			semconv.ServiceVersion(cfg.ServiceVersion),
			semconv.DeploymentEnvironment(cfg.Environment),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}

	// Create Prometheus exporter
	exporter := sdkmetric.NewManualReader()

	// Create meter provider
	meterProvider := sdkmetric.NewMeterProvider(
		sdkmetric.WithResource(res),
		sdkmetric.WithReader(exporter),
	)

	_ = meterProvider

	// Initialize common metrics
	initCommonMetrics(cfg.ServiceName)

	// Start Prometheus HTTP server
	mux := http.NewServeMux()
	mux.Handle(cfg.PrometheusPath, promhttp.HandlerFor(prometheusRegistry, promhttp.HandlerOpts{}))

	server := &http.Server{
		Addr:    ":" + cfg.PrometheusPort,
		Handler: mux,
	}

	go func() {
		logger.Info("Starting Prometheus metrics server", "addr", server.Addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("Prometheus server error", "error", err)
		}
	}()

	// Start runtime metrics collection
	go collectRuntimeMetrics(logger)

	shutdown := func() {
		logger.Info("Shutting down metrics provider")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := server.Shutdown(ctx); err != nil {
			logger.Error("Failed to shutdown metrics server", "error", err)
		}
	}

	logger.Info("OpenTelemetry metrics initialized successfully")
	return shutdown, nil
}

// initCommonMetrics initializes common application metrics
func initCommonMetrics(serviceName string) {
	// Request counter
	requestCounter = promauto.With(prometheusRegistry).NewCounter(
		prometheus.CounterOpts{
			Name: fmt.Sprintf("%s_requests_total", serviceName),
			Help: "Total number of requests",
			ConstLabels: prometheus.Labels{
				"service": serviceName,
			},
		},
	)

	// Request duration histogram
	requestDuration = promauto.With(prometheusRegistry).NewHistogram(
		prometheus.HistogramOpts{
			Name:    fmt.Sprintf("%s_request_duration_seconds", serviceName),
			Help:    "Request duration in seconds",
			Buckets: []float64{0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10},
		},
	)

	// Active requests gauge
	activeRequests = promauto.With(prometheusRegistry).NewGauge(
		prometheus.GaugeOpts{
			Name: fmt.Sprintf("%s_active_requests", serviceName),
			Help: "Number of active requests",
		},
	)

	// Agent executions counter (by agent_id and status)
	agentExecutions = promauto.With(prometheusRegistry).NewCounterVec(
		prometheus.CounterOpts{
			Name: fmt.Sprintf("%s_agent_executions_total", serviceName),
			Help: "Total number of agent executions",
		},
		[]string{"agent_id", "status"},
	)

	// Agent latency histogram (by agent_id)
	agentLatency = promauto.With(prometheusRegistry).NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    fmt.Sprintf("%s_agent_latency_seconds", serviceName),
			Help:    "Agent execution latency in seconds",
			Buckets: []float64{0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30},
		},
		[]string{"agent_id"},
	)

	// System metrics
	promauto.With(prometheusRegistry).NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: fmt.Sprintf("%s_go_goroutines", serviceName),
			Help: "Number of goroutines",
		},
		func() float64 {
			return float64(runtime.NumGoroutine())
		},
	)

	promauto.With(prometheusRegistry).NewGaugeFunc(
		prometheus.GaugeOpts{
			Name: fmt.Sprintf("%s_go_memory_alloc_bytes", serviceName),
			Help: "Bytes allocated in heap",
		},
		func() float64 {
			var m runtime.MemStats
			runtime.ReadMemStats(&m)
			return float64(m.Alloc)
		},
	)
}

// collectRuntimeMetrics periodically collects runtime metrics
func collectRuntimeMetrics(logger *slog.Logger) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			var m runtime.MemStats
			runtime.ReadMemStats(&m)

			logger.Debug("Runtime metrics",
				"goroutines", runtime.NumGoroutine(),
				"heap_alloc_mb", m.Alloc/1024/1024,
				"heap_sys_mb", m.HeapSys/1024/1024,
				"gc_cycles", m.NumGC,
			)
		}
	}
}

// RecordRequest records an HTTP request metric
func RecordRequest(method, path, status string, duration time.Duration) {
	if requestCounter != nil {
		requestCounter.Inc()
	}
	if requestDuration != nil {
		requestDuration.Observe(duration.Seconds())
	}
}

// RecordAgentExecution records an agent execution metric
func RecordAgentExecution(agentID, status string, duration time.Duration) {
	if agentExecutions != nil {
		agentExecutions.WithLabelValues(agentID, status).Inc()
	}
	if agentLatency != nil {
		agentLatency.WithLabelValues(agentID).Observe(duration.Seconds())
	}
}

// IncActiveRequests increments the active requests counter
func IncActiveRequests() {
	if activeRequests != nil {
		activeRequests.Inc()
	}
}

// DecActiveRequests decrements the active requests counter
func DecActiveRequests() {
	if activeRequests != nil {
		activeRequests.Dec()
	}
}

// MetricsMiddleware returns middleware that adds metrics collection to HTTP handlers
func MetricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		IncActiveRequests()
		defer DecActiveRequests()

		// Wrap response writer to capture status code
		wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start)
		status := http.StatusText(wrapped.statusCode)
		if wrapped.statusCode < 400 {
			status = "success"
		} else {
			status = "error"
		}
		RecordRequest(r.Method, r.URL.Path, status, duration)
	})
}

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
