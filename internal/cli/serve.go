package cli

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newServeCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "serve",
		Short: "Start platform services locally",
		Long:  "Starts the ResolveAgent platform services for local development.",
		RunE: func(cmd *cobra.Command, args []string) error {
			fmt.Println("Starting ResolveAgent platform services...")
			fmt.Println("Use 'resolveagent-server' binary for production deployments.")
			// TODO: Start embedded server
			return nil
		},
	}
}
