package logger

import (
	"bytes"
	"context"
	"log/slog"
	"strings"
	"testing"
)

func TestNew_DefaultLevel(t *testing.T) {
	var buf bytes.Buffer
	l := New(WithOutput(&buf))

	l.Info("hello")
	l.Debug("should not appear")

	out := buf.String()
	if !strings.Contains(out, "hello") {
		t.Error("expected info message in output")
	}
	if strings.Contains(out, "should not appear") {
		t.Error("debug message should not appear at info level")
	}
}

func TestNew_JSONFormat(t *testing.T) {
	var buf bytes.Buffer
	l := New(WithFormat("json"), WithOutput(&buf))
	l.Info("test")

	if !strings.Contains(buf.String(), `"msg"`) {
		t.Error("expected JSON format output")
	}
}

func TestNew_DebugLevel(t *testing.T) {
	var buf bytes.Buffer
	l := New(WithLevel("debug"), WithOutput(&buf))
	l.Debug("debug msg")

	if !strings.Contains(buf.String(), "debug msg") {
		t.Error("expected debug message at debug level")
	}
}

func TestComponent(t *testing.T) {
	var buf bytes.Buffer
	base := New(WithOutput(&buf))
	l := Component(base, "agent-runtime")
	l.Info("started")

	if !strings.Contains(buf.String(), "agent-runtime") {
		t.Error("expected component name in output")
	}
}

func TestContext(t *testing.T) {
	l := Nop()
	ctx := WithContext(context.Background(), l)
	got := FromContext(ctx)

	if got != l {
		t.Error("expected same logger from context")
	}
}

func TestFromContext_Default(t *testing.T) {
	got := FromContext(context.Background())
	if got == nil {
		t.Error("expected non-nil default logger")
	}
}

func TestNop(t *testing.T) {
	l := Nop()
	// Should not panic
	l.Info("discarded")
	l.Error("discarded")
}

func TestWithAttrs(t *testing.T) {
	var buf bytes.Buffer
	l := New(
		WithOutput(&buf),
		WithAttrs(slog.String("service", "resolveagent")),
	)
	l.Info("test")

	if !strings.Contains(buf.String(), "resolveagent") {
		t.Error("expected default attr in output")
	}
}
