package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/ai-guru-global/resolve-net/pkg/config"
	"github.com/ai-guru-global/resolve-net/pkg/server"
	"github.com/ai-guru-global/resolve-net/pkg/version"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	slog.Info("Starting ResolveNet Platform Services", "version", version.Version)

	cfg, err := config.Load("")
	if err != nil {
		slog.Error("Failed to load configuration", "error", err)
		os.Exit(1)
	}

	srv, err := server.New(cfg, logger)
	if err != nil {
		slog.Error("Failed to create server", "error", err)
		os.Exit(1)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle shutdown signals
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		sig := <-sigCh
		slog.Info("Received shutdown signal", "signal", sig)
		cancel()
	}()

	if err := srv.Run(ctx); err != nil {
		slog.Error("Server exited with error", "error", err)
		os.Exit(1)
	}

	fmt.Println("ResolveNet Platform Services stopped.")
}
