package skill

import (
	"context"
	"fmt"

	"github.com/ai-guru-global/resolve-agent/internal/cli/client"
	"github.com/spf13/cobra"
)

func newRemoveCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:     "remove [name]",
		Short:   "Uninstall a skill",
		Aliases: []string{"rm", "uninstall"},
		Args:    cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			name := args[0]
			force, _ := cmd.Flags().GetBool("force")

			// Create API client
			c := client.New()
			ctx := context.Background()

			// Get skill info first to confirm
			_, err := c.GetSkill(ctx, name)
			if err != nil {
				return fmt.Errorf("skill not found: %s", name)
			}

			if !force {
				fmt.Printf("Are you sure you want to remove skill '%s'? [y/N]: ", name)
				var response string
				fmt.Scanln(&response)
				if response != "y" && response != "Y" {
					fmt.Println("Cancelled")
					return nil
				}
			}

			// Delete skill via API
			if err := c.DeleteSkill(ctx, name); err != nil {
				return fmt.Errorf("failed to remove skill: %w", err)
			}

			fmt.Printf("✓ Skill '%s' removed successfully\n", name)
			return nil
		},
	}

	cmd.Flags().BoolP("force", "f", false, "Remove without confirmation")

	return cmd
}
