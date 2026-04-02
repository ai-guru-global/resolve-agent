package telemetry

import (
	"testing"
)

func TestNewLogger(t *testing.T) {
	tests := []struct {
		name   string
		level  string
		format string
	}{
		{
			name:   "debug level text format",
			level:  "debug",
			format: "text",
		},
		{
			name:   "info level json format",
			level:  "info",
			format: "json",
		},
		{
			name:   "warn level",
			level:  "warn",
			format: "text",
		},
		{
			name:   "error level",
			level:  "error",
			format: "json",
		},
		{
			name:   "default level",
			level:  "",
			format: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			logger := NewLogger(tt.level, tt.format)
			if logger == nil {
				t.Error("NewLogger() returned nil")
			}
		})
	}
}
