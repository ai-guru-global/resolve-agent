package workflow

import (
	"context"
	"fmt"
	"os"

	"github.com/ai-guru-global/resolve-agent/internal/cli/client"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v3"
)

// NewCmd returns the workflow command group.
func NewCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "workflow",
		Short: "Manage FTA workflows",
		Long:  "Create, list, run, and manage Fault Tree Analysis workflows.",
	}

	cmd.AddCommand(newCreateCmd())
	cmd.AddCommand(newListCmd())
	cmd.AddCommand(newRunCmd())
	cmd.AddCommand(newValidateCmd())
	cmd.AddCommand(newVisualizeCmd())

	return cmd
}

func newCreateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create [name]",
		Short: "Create an FTA workflow",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			name := args[0]
			file, _ := cmd.Flags().GetString("file")

			if file == "" {
				return fmt.Errorf("workflow definition file is required (--file)")
			}

			// Read workflow definition
			data, err := os.ReadFile(file)
			if err != nil {
				return fmt.Errorf("failed to read workflow file: %w", err)
			}

			// Parse YAML definition
			var definition map[string]interface{}
			if err := yaml.Unmarshal(data, &definition); err != nil {
				return fmt.Errorf("failed to parse workflow file: %w", err)
			}

			// Create workflow object
			workflow := &client.Workflow{
				Name:       name,
				Definition: definition,
				Status:     "draft",
			}

			// Get optional flags
			if desc, _ := cmd.Flags().GetString("description"); desc != "" {
				workflow.Description = desc
			}
			if version, _ := cmd.Flags().GetString("version"); version != "" {
				workflow.Version = version
			} else {
				workflow.Version = "1.0.0"
			}

			fmt.Printf("Creating workflow '%s' from '%s'...\n", name, file)

			// Create API client
			c := client.New()
			ctx := context.Background()

			// Create workflow via API
			created, err := c.CreateWorkflow(ctx, workflow)
			if err != nil {
				return fmt.Errorf("failed to create workflow: %w", err)
			}

			fmt.Printf("✓ Workflow '%s' created successfully\n", created.Name)
			fmt.Printf("  ID:      %s\n", created.ID)
			fmt.Printf("  Version: %s\n", created.Version)
			fmt.Printf("  Status:  %s\n", created.Status)

			return nil
		},
	}

	cmd.Flags().StringP("file", "f", "", "YAML workflow definition file")
	cmd.Flags().StringP("description", "d", "", "Workflow description")
	cmd.Flags().StringP("version", "v", "1.0.0", "Workflow version")

	return cmd
}
