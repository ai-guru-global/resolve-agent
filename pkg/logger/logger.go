// Package logger provides a unified structured logging abstraction for the
// ResolveAgent platform. It wraps Go's log/slog with opinionated defaults,
// context propagation, and component-scoped loggers.
//
// Usage:
//
//	log := logger.New(logger.WithLevel("debug"), logger.WithFormat("json"))
//	log = log.With("component", "agent-runtime")
//	log.Info("agent started", "agent_id", "my-agent")
package logger

import (
	"context"
	"io"
	"log/slog"
	"os"
)

// Option configures a Logger.
type Option func(*options)

type options struct {
	level  string
	format string
	output io.Writer
	attrs  []slog.Attr
}

// WithLevel sets the log level (debug, info, warn, error).
func WithLevel(level string) Option {
	return func(o *options) { o.level = level }
}

// WithFormat sets the log format ("json" or "text").
func WithFormat(format string) Option {
	return func(o *options) { o.format = format }
}

// WithOutput sets the output writer (defaults to os.Stdout).
func WithOutput(w io.Writer) Option {
	return func(o *options) { o.output = w }
}

// WithAttrs adds default attributes to every log entry.
func WithAttrs(attrs ...slog.Attr) Option {
	return func(o *options) { o.attrs = append(o.attrs, attrs...) }
}

// New creates a new *slog.Logger with the given options.
func New(opts ...Option) *slog.Logger {
	o := &options{
		level:  "info",
		format: "text",
		output: os.Stdout,
	}
	for _, opt := range opts {
		opt(o)
	}

	lvl := parseLevel(o.level)
	handlerOpts := &slog.HandlerOptions{Level: lvl}

	var handler slog.Handler
	switch o.format {
	case "json":
		handler = slog.NewJSONHandler(o.output, handlerOpts)
	default:
		handler = slog.NewTextHandler(o.output, handlerOpts)
	}

	if len(o.attrs) > 0 {
		handler = handler.WithAttrs(o.attrs)
	}

	return slog.New(handler)
}

// Component returns a logger scoped to a specific component.
func Component(base *slog.Logger, component string) *slog.Logger {
	return base.With("component", component)
}

// --- Context propagation ---

type ctxKey struct{}

// WithContext stores the logger in the context.
func WithContext(ctx context.Context, l *slog.Logger) context.Context {
	return context.WithValue(ctx, ctxKey{}, l)
}

// FromContext retrieves the logger from the context, or returns the default logger.
func FromContext(ctx context.Context) *slog.Logger {
	if l, ok := ctx.Value(ctxKey{}).(*slog.Logger); ok {
		return l
	}
	return slog.Default()
}

// Nop returns a logger that discards all output.
func Nop() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func parseLevel(s string) slog.Level {
	switch s {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
