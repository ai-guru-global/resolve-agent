package agent

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newRunCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "run [id]",
		Short: "Run an agent interactively",
		Long:  "Start an interactive chat session with the specified agent.",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			agentID := args[0]
			fmt.Printf("Starting interactive session with agent '%s'...\n", agentID)
			fmt.Println("Type 'exit' or Ctrl+C to end the session.")
			fmt.Println()
			// TODO: Implement interactive chat via gRPC streaming
			return nil
		},
	}

	cmd.Flags().String("conversation", "", "Continue an existing conversation")

	return cmd
}
