package errors

import (
	"fmt"
	"net/http"
	"testing"
)

func TestError_Error(t *testing.T) {
	tests := []struct {
		name string
		err  *Error
		want string
	}{
		{
			name: "without cause",
			err:  New(CodeNotFound, "agent not found"),
			want: "[NOT_FOUND] agent not found",
		},
		{
			name: "with cause",
			err:  Wrap(CodeInternal, "database error", fmt.Errorf("connection refused")),
			want: "[INTERNAL] database error: connection refused",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.err.Error(); got != tt.want {
				t.Errorf("Error() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestError_Unwrap(t *testing.T) {
	cause := fmt.Errorf("root cause")
	err := Wrap(CodeInternal, "wrapped", cause)

	if !Is(err, cause) {
		t.Error("expected errors.Is to find the cause")
	}
}

func TestNotFound(t *testing.T) {
	err := NotFound("agent", "my-agent")
	if err.Code != CodeNotFound {
		t.Errorf("code = %s, want %s", err.Code, CodeNotFound)
	}
}

func TestHTTPStatus(t *testing.T) {
	tests := []struct {
		err  error
		want int
	}{
		{New(CodeNotFound, ""), http.StatusNotFound},
		{New(CodeInvalidArgument, ""), http.StatusBadRequest},
		{New(CodeUnauthorized, ""), http.StatusUnauthorized},
		{New(CodeRateLimited, ""), http.StatusTooManyRequests},
		{fmt.Errorf("plain error"), http.StatusInternalServerError},
	}

	for _, tt := range tests {
		if got := HTTPStatus(tt.err); got != tt.want {
			t.Errorf("HTTPStatus(%v) = %d, want %d", tt.err, got, tt.want)
		}
	}
}
