package workflow

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newRunCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "run [id]",
		Short: "Execute a workflow",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			id := args[0]
			fmt.Printf("Executing workflow '%s'...\n", id)
			// TODO: Execute workflow via streaming gRPC
			return nil
		},
	}
}
