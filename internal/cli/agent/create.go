package agent

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newCreateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create [name]",
		Short: "Create a new agent",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			name := args[0]
			agentType, _ := cmd.Flags().GetString("type")
			model, _ := cmd.Flags().GetString("model")

			fmt.Printf("Creating agent '%s' (type: %s, model: %s)...\n", name, agentType, model)
			// TODO: Call API to create agent
			return nil
		},
	}

	cmd.Flags().StringP("type", "t", "mega", "Agent type (mega, skill, fta, rag, custom)")
	cmd.Flags().StringP("model", "m", "qwen-plus", "LLM model to use")
	cmd.Flags().StringP("prompt", "p", "", "System prompt")
	cmd.Flags().StringP("file", "f", "", "Create from YAML config file")

	return cmd
}

// NewCmd returns the agent command group.
func NewCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "agent",
		Short: "Manage agents",
		Long:  "Create, list, run, and manage ResolveNet agents.",
	}

	cmd.AddCommand(newCreateCmd())
	cmd.AddCommand(newListCmd())
	cmd.AddCommand(newRunCmd())
	cmd.AddCommand(newDeleteCmd())
	cmd.AddCommand(newLogsCmd())

	return cmd
}
