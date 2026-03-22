package workflow

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newValidateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "validate [file]",
		Short: "Validate a workflow definition",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			file := args[0]
			fmt.Printf("Validating workflow from '%s'...\n", file)
			// TODO: Validate workflow definition
			fmt.Println("Workflow is valid.")
			return nil
		},
	}
	return cmd
}
