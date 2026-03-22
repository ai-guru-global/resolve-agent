package skill

import (
	"fmt"

	"github.com/spf13/cobra"
)

// NewCmd returns the skill command group.
func NewCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "skill",
		Short: "Manage skills",
		Long:  "Install, list, test, and manage agent skills.",
	}

	cmd.AddCommand(newInstallCmd())
	cmd.AddCommand(newListCmd())
	cmd.AddCommand(newInfoCmd())
	cmd.AddCommand(newTestCmd())
	cmd.AddCommand(newRemoveCmd())

	return cmd
}

func newInstallCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "install [source]",
		Short: "Install a skill",
		Long:  "Install a skill from a local path, git repository, or registry.",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			source := args[0]
			fmt.Printf("Installing skill from '%s'...\n", source)
			// TODO: Install skill
			return nil
		},
	}
	return cmd
}
