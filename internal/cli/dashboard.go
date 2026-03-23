package cli

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newDashboardCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "dashboard",
		Short: "Launch the TUI dashboard",
		Long:  "Opens an interactive terminal dashboard for managing ResolveAgent.",
		RunE: func(cmd *cobra.Command, args []string) error {
			fmt.Println("Launching TUI dashboard...")
			// TODO: Launch bubbletea TUI
			// return tui.Run()
			return nil
		},
	}
}
