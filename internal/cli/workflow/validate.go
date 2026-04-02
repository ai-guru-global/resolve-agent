package workflow

import (
	"context"
	"fmt"
	"os"

	"github.com/ai-guru-global/resolve-agent/internal/cli/client"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v3"
)

func newValidateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "validate [file]",
		Short: "Validate a workflow definition",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			file := args[0]

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

			fmt.Printf("Validating workflow from '%s'...\n", file)

			// Create API client
			c := client.New()
			ctx := context.Background()

			// Validate workflow via API
			req := &client.ValidateWorkflowRequest{
				Definition: definition,
			}

			resp, err := c.ValidateWorkflow(ctx, req)
			if err != nil {
				return fmt.Errorf("validation request failed: %w", err)
			}

			fmt.Println()
			if resp.Valid {
				fmt.Println("✓ Workflow is valid")
			} else {
				fmt.Println("✗ Workflow is invalid")
				if len(resp.Errors) > 0 {
					fmt.Println("\nErrors:")
					for _, err := range resp.Errors {
						fmt.Printf("  - %s\n", err)
					}
				}
			}

			if len(resp.Warnings) > 0 {
				fmt.Println("\nWarnings:")
				for _, warn := range resp.Warnings {
					fmt.Printf("  - %s\n", warn)
				}
			}

			return nil
		},
	}
	return cmd
}
