package agent

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newLogsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "logs [id]",
		Short: "Stream agent execution logs",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			agentID := args[0]
			follow, _ := cmd.Flags().GetBool("follow")
			fmt.Printf("Streaming logs for agent '%s' (follow=%v)...\n", agentID, follow)
			// TODO: Stream logs from API
			return nil
		},
	}

	cmd.Flags().BoolP("follow", "f", false, "Follow log output")
	cmd.Flags().Int("tail", 100, "Number of lines to show from the end")

	return cmd
}
