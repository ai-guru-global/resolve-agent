package telemetry

import (
	"log/slog"
)

// InitMetrics initializes the OpenTelemetry metrics provider.
func InitMetrics(serviceName string, logger *slog.Logger) error {
	// TODO: Initialize OTLP metrics exporter and meter provider
	logger.Info("OpenTelemetry metrics initialized", "service", serviceName)
	return nil
}
