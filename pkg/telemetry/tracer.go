package telemetry

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
	"go.opentelemetry.io/otel/trace"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

var (
	// Tracer is the global tracer instance
	Tracer trace.Tracer

	// tracerProvider is the global tracer provider
	tracerProvider *sdktrace.TracerProvider
)

// TracerConfig contains configuration for the tracer
type TracerConfig struct {
	ServiceName    string
	ServiceVersion string
	OTLPEndpoint   string
	Environment    string
	SampleRate     float64
}

// InitTracer initializes the OpenTelemetry tracer provider.
func InitTracer(ctx context.Context, cfg TracerConfig, logger *slog.Logger) (func(), error) {
	if cfg.ServiceName == "" {
		cfg.ServiceName = "resolve-agent"
	}
	if cfg.ServiceVersion == "" {
		cfg.ServiceVersion = "0.1.0"
	}
	if cfg.OTLPEndpoint == "" {
		cfg.OTLPEndpoint = os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	}
	if cfg.OTLPEndpoint == "" {
		cfg.OTLPEndpoint = "localhost:4317"
	}
	if cfg.Environment == "" {
		cfg.Environment = os.Getenv("OTEL_ENVIRONMENT")
	}
	if cfg.Environment == "" {
		cfg.Environment = "development"
	}
	if cfg.SampleRate <= 0 {
		cfg.SampleRate = 1.0
	}

	logger.Info("Initializing OpenTelemetry tracer",
		"service", cfg.ServiceName,
		"version", cfg.ServiceVersion,
		"endpoint", cfg.OTLPEndpoint,
		"environment", cfg.Environment,
		"sample_rate", cfg.SampleRate,
	)

	// Create OTLP exporter
	exporter, err := createExporter(ctx, cfg.OTLPEndpoint, logger)
	if err != nil {
		logger.Warn("Failed to create OTLP exporter, continuing without exporter",
			"error", err,
		)
	}

	// Create resource
	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceName(cfg.ServiceName),
			semconv.ServiceVersion(cfg.ServiceVersion),
			semconv.DeploymentEnvironment(cfg.Environment),
			attribute.String("host.name", getHostname()),
		),
		resource.WithProcessRuntimeDescription(),
		resource.WithOSType(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}

	// Create tracer provider
	opts := []sdktrace.TracerProviderOption{
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.TraceIDRatioBased(cfg.SampleRate)),
	}

	if exporter != nil {
		opts = append(opts, sdktrace.WithBatcher(exporter))
	}

	tracerProvider = sdktrace.NewTracerProvider(opts...)

	// Set as global provider
	otel.SetTracerProvider(tracerProvider)

	// Set global propagator
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	// Create global tracer
	Tracer = tracerProvider.Tracer(cfg.ServiceName)

	shutdown := func() {
		logger.Info("Shutting down tracer provider")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := tracerProvider.Shutdown(ctx); err != nil {
			logger.Error("Failed to shutdown tracer provider", "error", err)
		}
	}

	logger.Info("OpenTelemetry tracer initialized successfully")
	return shutdown, nil
}

// createExporter creates an OTLP trace exporter
func createExporter(ctx context.Context, endpoint string, logger *slog.Logger) (sdktrace.SpanExporter, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	conn, err := grpc.DialContext(ctx, endpoint,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithBlock(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to OTLP endpoint: %w", err)
	}

	exporter, err := otlptracegrpc.New(ctx, otlptracegrpc.WithGRPCConn(conn))
	if err != nil {
		return nil, fmt.Errorf("failed to create OTLP exporter: %w", err)
	}

	return exporter, nil
}

// StartSpan starts a new span with the given name and options
func StartSpan(ctx context.Context, name string, opts ...trace.SpanStartOption) (context.Context, trace.Span) {
	if Tracer == nil {
		// Return a no-op span if tracer is not initialized
		return ctx, trace.SpanFromContext(ctx)
	}
	return Tracer.Start(ctx, name, opts...)
}

// SpanFromContext returns the current span from context
func SpanFromContext(ctx context.Context) trace.Span {
	return trace.SpanFromContext(ctx)
}

// AddEvent adds an event to the current span
func AddEvent(ctx context.Context, name string, attrs ...attribute.KeyValue) {
	span := SpanFromContext(ctx)
	if span != nil {
		span.AddEvent(name, trace.WithAttributes(attrs...))
	}
}

// SetAttributes sets attributes on the current span
func SetAttributes(ctx context.Context, attrs ...attribute.KeyValue) {
	span := SpanFromContext(ctx)
	if span != nil {
		span.SetAttributes(attrs...)
	}
}

// RecordError records an error on the current span
func RecordError(ctx context.Context, err error, opts ...trace.EventOption) {
	span := SpanFromContext(ctx)
	if span != nil && err != nil {
		span.RecordError(err, opts...)
	}
}

// MarkSpanError marks the current span as having an error
func MarkSpanError(ctx context.Context) {
	span := SpanFromContext(ctx)
	if span != nil {
		span.SetStatus(codes.Error, "")
	}
}

// getHostname returns the hostname
func getHostname() string {
	hostname, _ := os.Hostname()
	if hostname == "" {
		hostname = "unknown"
	}
	return hostname
}

// HTTPMiddleware returns middleware that adds tracing to HTTP handlers
func HTTPMiddleware(next http.Handler) http.Handler {
	return otelhttp.NewHandler(next, "http.request")
}
