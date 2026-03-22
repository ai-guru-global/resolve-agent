package cli

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newServeCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "serve",
		Short: "Start platform services locally",
		Long:  "Starts the ResolveNet platform services for local development.",
		RunE: func(cmd *cobra.Command, args []string) error {
			fmt.Println("Starting ResolveNet platform services...")
			fmt.Println("Use 'resolvenet-server' binary for production deployments.")
			// TODO: Start embedded server
			return nil
		},
	}
}
