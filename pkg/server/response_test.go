package server

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/ai-guru-global/resolve-agent/pkg/errors"
)

func TestWriteRegistryError(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	secretInternal := errors.New(errors.CodeInternal, "secret database DSN leaked")
	secretPlain := fmt.Errorf("boom: secret stack detail")

	tests := []struct {
		name       string
		err        error
		wantStatus int
		wantBody   string
	}{
		{
			name:       "structured not found maps to 404 with clean message",
			err:        errors.NotFound("agent", "x"),
			wantStatus: http.StatusNotFound,
			wantBody:   `agent "x" not found`,
		},
		{
			name:       "structured already exists maps to 409 with clean message",
			err:        errors.AlreadyExists("workflow", "wf-1"),
			wantStatus: http.StatusConflict,
			wantBody:   `workflow "wf-1" already exists`,
		},
		{
			name:       "structured invalid argument maps to 400 with clean message",
			err:        errors.InvalidArgument("name", "required"),
			wantStatus: http.StatusBadRequest,
			wantBody:   "invalid name: required",
		},
		{
			name:       "structured internal error hides message",
			err:        secretInternal,
			wantStatus: http.StatusInternalServerError,
			wantBody:   "internal error",
		},
		{
			name:       "plain error maps to 500 and hides message",
			err:        secretPlain,
			wantStatus: http.StatusInternalServerError,
			wantBody:   "internal error",
		},
		{
			name:       "structured error with unrecognized code hides message",
			err:        errors.New(errors.Code("FUTURE_CODE"), "secret unrecognized detail"),
			wantStatus: http.StatusInternalServerError,
			wantBody:   "internal error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			writeRegistryError(rec, tt.err, logger, "test scope")

			res := rec.Result()
			defer func() { _ = res.Body.Close() }()

			if res.StatusCode != tt.wantStatus {
				t.Fatalf("status = %d, want %d", res.StatusCode, tt.wantStatus)
			}

			var body map[string]string
			if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
				t.Fatalf("decode body: %v", err)
			}
			if body["error"] != tt.wantBody {
				t.Errorf("body error = %q, want %q", body["error"], tt.wantBody)
			}
		})
	}

	// Internals must never leak: the raw messages of the 500 cases above are
	// absent from any response body.
	rec := httptest.NewRecorder()
	writeRegistryError(rec, secretInternal, logger, "test scope")
	if got := rec.Body.String(); strings.Contains(got, "secret database DSN leaked") {
		t.Errorf("internal error message leaked into body: %q", got)
	}
	rec = httptest.NewRecorder()
	writeRegistryError(rec, secretPlain, logger, "test scope")
	if got := rec.Body.String(); strings.Contains(got, "secret stack detail") {
		t.Errorf("plain error message leaked into body: %q", got)
	}
}
