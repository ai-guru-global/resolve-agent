package agent

import (
	"context"
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/ai-guru-global/resolve-agent/internal/cli/client"
	"github.com/spf13/cobra"
)

func newLogsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "logs [agent-id]",
		Short: "View agent execution logs",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			agentID := args[0]
			limit, _ := cmd.Flags().GetInt("limit")
			follow, _ := cmd.Flags().GetBool("follow")
			executionID, _ := cmd.Flags().GetString("execution")

			// Create API client
			c := client.New()
			ctx := context.Background()

			// Fetch logs from API
			logs, err := c.GetAgentLogs(ctx, agentID, executionID, limit)
			if err != nil {
				return fmt.Errorf("failed to get logs: %w", err)
			}

			if follow {
				// Stream logs
				return streamLogs(ctx, c, agentID)
			}

			// Display logs
			return displayLogs(logs)
		},
	}

	cmd.Flags().IntP("limit", "n", 50, "Number of log entries to show")
	cmd.Flags().BoolP("follow", "f", false, "Follow log output")
	cmd.Flags().StringP("execution", "e", "", "Filter by execution ID")

	return cmd
}

func displayLogs(logs []*client.ExecutionLog) error {
	if len(logs) == 0 {
		fmt.Println("No logs found.")
		return nil
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "TIME\tLEVEL\tMESSAGE")
	fmt.Fprintln(w, "----\t-----\t-------")

	for _, log := range logs {
		fmt.Fprintf(w, "%s\t%s\t%s\n",
			log.Timestamp.Format("15:04:05"),
			log.Level,
			log.Message,
		)
	}

	return w.Flush()
}

func streamLogs(ctx context.Context, c *client.Client, agentID string) error {
	fmt.Println("Streaming logs... (Press Ctrl+C to stop)")
	fmt.Println()

	// This would implement WebSocket or SSE connection
	// For now, just poll periodically
	return fmt.Errorf("streaming not yet implemented")
}
