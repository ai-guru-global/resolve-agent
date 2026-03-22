package workflow

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newVisualizeCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "visualize [id]",
		Short: "Render workflow tree in terminal",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			id := args[0]
			fmt.Printf("Visualizing workflow '%s'...\n\n", id)
			// TODO: Fetch workflow and render ASCII tree
			fmt.Println("  [TOP] Root Cause Identified")
			fmt.Println("    |")
			fmt.Println("  [OR Gate]")
			fmt.Println("   / \\")
			fmt.Println("  A   B")
			return nil
		},
	}
}
