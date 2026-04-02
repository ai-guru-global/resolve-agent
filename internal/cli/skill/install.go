package skill

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/ai-guru-global/resolve-agent/internal/cli/client"
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
			sourceType, _ := cmd.Flags().GetString("type")
			name, _ := cmd.Flags().GetString("name")

			// Auto-detect source type if not specified
			if sourceType == "" {
				switch {
				case isGitURL(source):
					sourceType = "git"
				case isLocalPath(source):
					sourceType = "local"
				default:
					sourceType = "registry"
				}
			}

			fmt.Printf("Installing skill from '%s' (%s)...\n", source, sourceType)

			// Create API client
			c := client.New()
			ctx := context.Background()

			// Build install request
			req := &client.InstallSkillRequest{
				Source: source,
				Type:   sourceType,
				Config: map[string]interface{}{},
			}
			if name != "" {
				req.Config["name"] = name
			}

			// Install skill via API
			skill, err := c.InstallSkill(ctx, req)
			if err != nil {
				return fmt.Errorf("failed to install skill: %w", err)
			}

			fmt.Printf("✓ Skill '%s' installed successfully\n", skill.Name)
			fmt.Printf("  ID:      %s\n", skill.ID)
			fmt.Printf("  Version: %s\n", skill.Version)
			fmt.Printf("  Type:    %s\n", skill.Type)

			return nil
		},
	}

	cmd.Flags().StringP("type", "t", "", "Source type (local, git, registry)")
	cmd.Flags().StringP("name", "n", "", "Skill name (optional)")

	return cmd
}

// isGitURL checks if the source is a git URL.
func isGitURL(source string) bool {
	return len(source) > 4 && (source[:4] == "http" || source[:4] == "git@")
}

// isLocalPath checks if the source is a local path.
func isLocalPath(source string) bool {
	info, err := os.Stat(source)
	if err != nil {
		return false
	}
	return info.IsDir() || filepath.Ext(source) == ".py" || filepath.Ext(source) == ".yaml"
}
