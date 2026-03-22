package workflow

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newListCmd() *cobra.Command {
	return &cobra.Command{
		Use:     "list",
		Short:   "List workflows",
		Aliases: []string{"ls"},
		RunE: func(cmd *cobra.Command, args []string) error {
			fmt.Println("ID\tNAME\tSTATUS")
			fmt.Println("--\t----\t------")
			// TODO: Fetch workflows from API
			fmt.Println("(no workflows found)")
			return nil
		},
	}
}
