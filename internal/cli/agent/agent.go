package agent

import (
	"github.com/spf13/cobra"
)

// NewCmd creates the agent command group.
func NewCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "agent",
		Short: "Manage agents",
		Long:  `Create, list, delete, and run agents in the ResolveAgent platform.`,
	}

	cmd.AddCommand(newCreateCmd())
	cmd.AddCommand(newListCmd())
	cmd.AddCommand(newDeleteCmd())
	cmd.AddCommand(newRunCmd())
	cmd.AddCommand(newLogsCmd())

	return cmd
}
