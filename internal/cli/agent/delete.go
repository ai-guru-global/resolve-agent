package agent

import (
	"context"
	"fmt"

	"github.com/ai-guru-global/resolve-agent/internal/cli/client"
	"github.com/spf13/cobra"
)

func newDeleteCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:     "delete [agent-id]",
		Short:   "Delete an agent",
		Aliases: []string{"rm", "remove"},
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			agentID := args[0]
			force, _ := cmd.Flags().GetBool("force")

			// Create API client
			c := client.New()
			ctx := context.Background()

			if !force {
				// Get agent details first
				agent, err := c.GetAgent(ctx, agentID)
				if err != nil {
					return fmt.Errorf("failed to get agent: %w", err)
				}

				fmt.Printf("Are you sure you want to delete agent '%s' (%s)? [y/N]: ", agent.Name, agent.ID)
				var response string
				fmt.Scanln(&response)
				if response != "y" && response != "Y" {
					fmt.Println("Cancelled")
					return nil
				}
			}

			// Delete agent
			if err := c.DeleteAgent(ctx, agentID); err != nil {
				return fmt.Errorf("failed to delete agent: %w", err)
			}

			fmt.Printf("✓ Agent '%s' deleted successfully\n", agentID)
			return nil
		},
	}

	cmd.Flags().BoolP("force", "f", false, "Delete without confirmation")

	return cmd
}
