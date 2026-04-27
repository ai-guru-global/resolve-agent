package server

import (
	"log/slog"
	"os"
	"testing"

	"github.com/ai-guru-global/resolve-agent/pkg/config"
)

func TestNew(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	cfg := &config.Config{
		Server: config.ServerConfig{
			HTTPAddr: ":18080",
			GRPCAddr: ":19090",
		},
	}

	srv, err := New(cfg, logger)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	if srv == nil {
		t.Fatal("New() returned nil")
	}
	if srv.cfg != cfg {
		t.Error("server config not set correctly")
	}
	if srv.httpServer == nil {
		t.Error("HTTP server not initialized")
	}
	if srv.grpcServer == nil {
		t.Error("gRPC server not initialized")
	}
}

func TestNew_DefaultConfig(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	cfg, err := config.Load("")
	if err != nil {
		t.Fatalf("Load() error = %v", err)
	}

	srv, err := New(cfg, logger)
	if err != nil {
		t.Fatalf("New() error = %v", err)
	}
	if srv == nil {
		t.Fatal("New() returned nil")
	}
}
