package cli

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/ai-guru-global/resolve-agent/pkg/config"
	"github.com/ai-guru-global/resolve-agent/pkg/server"
	"github.com/ai-guru-global/resolve-agent/pkg/version"
	"github.com/spf13/cobra"
)

func newServeCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "serve",
		Short: "Start platform services locally",
		Long:  "Starts the ResolveAgent platform services for local development.",
		RunE: func(cmd *cobra.Command, args []string) error {
			logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
				Level: slog.LevelInfo,
			}))
			slog.SetDefault(logger)

			slog.Info("Starting ResolveAgent Platform Services", "version", version.Version)

			cfg, err := config.Load("")
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

			sigCh := make(chan os.Signal, 1)
			signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

			go func() {
				sig := <-sigCh
				slog.Info("Received shutdown signal", "signal", sig)
				cancel()
			}()

			fmt.Println("Starting ResolveAgent platform services...")
			fmt.Println("Use 'resolveagent-server' binary for production deployments.")

			if err := srv.Run(ctx); err != nil {
				slog.Error("Server exited with error", "error", err)
				return err
			}

			return nil
		},
	}
}
