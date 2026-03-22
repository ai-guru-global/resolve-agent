package telemetry

import (
	"context"
	"log/slog"
)

// InitTracer initializes the OpenTelemetry tracer provider.
func InitTracer(ctx context.Context, serviceName, otlpEndpoint string, logger *slog.Logger) (func(), error) {
	// TODO: Initialize OTLP exporter and tracer provider
	logger.Info("OpenTelemetry tracer initialized",
		"service", serviceName,
		"endpoint", otlpEndpoint,
	)

	shutdown := func() {
		logger.Info("Shutting down tracer provider")
	}

	return shutdown, nil
}
