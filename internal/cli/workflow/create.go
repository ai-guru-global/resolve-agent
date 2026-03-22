package workflow

import (
	"fmt"

	"github.com/spf13/cobra"
)

// NewCmd returns the workflow command group.
func NewCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "workflow",
		Short: "Manage FTA workflows",
		Long:  "Create, list, run, and manage Fault Tree Analysis workflows.",
	}

	cmd.AddCommand(newCreateCmd())
	cmd.AddCommand(newListCmd())
	cmd.AddCommand(newRunCmd())
	cmd.AddCommand(newValidateCmd())
	cmd.AddCommand(newVisualizeCmd())

	return cmd
}

func newCreateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create [name]",
		Short: "Create an FTA workflow",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			name := args[0]
			file, _ := cmd.Flags().GetString("file")
			fmt.Printf("Creating workflow '%s' from '%s'...\n", name, file)
			// TODO: Create workflow via API
			return nil
		},
	}

	cmd.Flags().StringP("file", "f", "", "YAML workflow definition file")
	_ = cmd.MarkFlagRequired("file")

	return cmd
}
