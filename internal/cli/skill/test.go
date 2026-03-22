package skill

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newTestCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "test [name]",
		Short: "Test a skill in isolation",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			name := args[0]
			fmt.Printf("Testing skill '%s'...\n", name)
			// TODO: Execute skill test via API
			return nil
		},
	}
}
