package skill

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/ai-guru-global/resolve-agent/internal/cli/client"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v3"
)

func newInfoCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "info [name]",
		Short: "Show skill details",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			name := args[0]
			output, _ := cmd.Flags().GetString("output")

			// Create API client
			c := client.New()
			ctx := context.Background()

			// Fetch skill info from API
			skill, err := c.GetSkill(ctx, name)
			if err != nil {
				return fmt.Errorf("failed to get skill info: %w", err)
			}

			// Output based on format
			switch output {
			case "json":
				data, err := json.MarshalIndent(skill, "", "  ")
				if err != nil {
					return err
				}
				fmt.Println(string(data))
			case "yaml":
				data, err := yaml.Marshal(skill)
				if err != nil {
					return err
				}
				fmt.Print(string(data))
			default:
				fmt.Printf("Name:        %s\n", skill.Name)
				fmt.Printf("ID:          %s\n", skill.ID)
				fmt.Printf("Description: %s\n", skill.Description)
				fmt.Printf("Version:     %s\n", skill.Version)
				fmt.Printf("Type:        %s\n", skill.Type)
				fmt.Printf("Status:      %s\n", skill.Status)
				fmt.Printf("Source:      %s\n", skill.Source)
				if len(skill.Config) > 0 {
					fmt.Printf("Config:\n")
					for k, v := range skill.Config {
						fmt.Printf("  %s: %v\n", k, v)
					}
				}
			}

			return nil
		},
	}

	cmd.Flags().StringP("output", "o", "text", "Output format (text, json, yaml)")

	return cmd
}
