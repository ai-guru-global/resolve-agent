package agent

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newListCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List all agents",
		Aliases: []string{"ls"},
		RunE: func(cmd *cobra.Command, args []string) error {
			fmt.Println("ID\tNAME\tTYPE\tSTATUS")
			fmt.Println("--\t----\t----\t------")
			// TODO: Fetch agents from API and display
			fmt.Println("(no agents found)")
			return nil
		},
	}

	cmd.Flags().StringP("type", "t", "", "Filter by agent type")
	cmd.Flags().StringP("status", "s", "", "Filter by status")
	cmd.Flags().StringP("output", "o", "table", "Output format (table, json, yaml)")

	return cmd
}
