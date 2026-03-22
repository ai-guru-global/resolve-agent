package skill

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newListCmd() *cobra.Command {
	return &cobra.Command{
		Use:     "list",
		Short:   "List installed skills",
		Aliases: []string{"ls"},
		RunE: func(cmd *cobra.Command, args []string) error {
			fmt.Println("NAME\tVERSION\tSTATUS")
			fmt.Println("----\t-------\t------")
			// TODO: Fetch skills from API
			fmt.Println("(no skills installed)")
			return nil
		},
	}
}
