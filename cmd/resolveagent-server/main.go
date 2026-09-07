// Command resolveagent-server starts the ResolveAgent platform server: it
// loads configuration, initializes registries and services, and serves the
// HTTP API until interrupted.
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/ai-guru-global/resolve-agent/pkg/config"
	"github.com/ai-guru-global/resolve-agent/pkg/server"
	"github.com/ai-guru-global/resolve-agent/pkg/version"
)

func main() {
	if err := run(); err != nil {
		os.Exit(1)
	}
}

func run() error {
	configPath := flag.String("config", "", "path to config file")
	flag.Parse()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	slog.Info("Starting ResolveAgent Platform Services", "version", version.Version)

	cfg, err := config.Load(*configPath)
	if err != nil {
		slog.Error("Failed to load configuration", "error", err)
		return err
	}

	srv, err := server.New(cfg, logger)
	if err != nil {
		slog.Error("Failed to create server", "error", err)
		return err
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
		return err
	}

	fmt.Println("ResolveAgent Platform Services stopped.")
	return nil
}
