package server

import (
	"testing"

	"github.com/ai-guru-global/resolve-agent/pkg/errors"
)

func TestMapPythonErrorCode(t *testing.T) {
	tests := []struct {
		name       string
		pythonCode string
		want       errors.Code
	}{
		{"INVALID_ARGUMENT maps correctly", "INVALID_ARGUMENT", errors.CodeInvalidArgument},
		{"NOT_FOUND maps correctly", "NOT_FOUND", errors.CodeNotFound},
		{"FORBIDDEN maps correctly", "FORBIDDEN", errors.CodeForbidden},
		{"TIMEOUT maps correctly", "TIMEOUT", errors.CodeTimeout},
		{"UNAVAILABLE maps correctly", "UNAVAILABLE", errors.CodeUnavailable},
		{"RATE_LIMITED maps correctly", "RATE_LIMITED", errors.CodeRateLimited},
		{"ALREADY_EXISTS maps correctly", "ALREADY_EXISTS", errors.CodeAlreadyExists},
		{"UNAUTHORIZED maps correctly", "UNAUTHORIZED", errors.CodeUnauthorized},
		{"CONFLICT maps correctly", "CONFLICT", errors.CodeConflict},
		{"unknown code defaults to INTERNAL", "SOME_UNKNOWN", errors.CodeInternal},
		{"empty string defaults to INTERNAL", "", errors.CodeInternal},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := mapPythonErrorCode(tt.pythonCode)
			if got != tt.want {
				t.Errorf("mapPythonErrorCode(%q) = %v, want %v", tt.pythonCode, got, tt.want)
			}
		})
	}
}
