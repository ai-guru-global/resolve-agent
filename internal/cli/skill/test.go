package skill

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/ai-guru-global/resolve-agent/internal/cli/client"
	"github.com/spf13/cobra"
)

func newTestCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "test [name]",
		Short: "Test a skill in isolation",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			name := args[0]
			inputFile, _ := cmd.Flags().GetString("input")
			inputStr, _ := cmd.Flags().GetString("data")

			// Parse input
			var input map[string]interface{}
			if inputFile != "" {
				data, err := os.ReadFile(inputFile)
				if err != nil {
					return fmt.Errorf("failed to read input file: %w", err)
				}
				if err := json.Unmarshal(data, &input); err != nil {
					return fmt.Errorf("failed to parse input file: %w", err)
				}
			} else if inputStr != "" {
				if err := json.Unmarshal([]byte(inputStr), &input); err != nil {
					return fmt.Errorf("failed to parse input data: %w", err)
				}
			} else {
				input = map[string]interface{}{}
			}

			fmt.Printf("Testing skill '%s'...\n", name)

			// Create API client
			c := client.New()
			ctx := context.Background()

			// Test skill via API
			req := &client.TestSkillRequest{
				Input: input,
			}

			resp, err := c.TestSkill(ctx, name, req)
			if err != nil {
				return fmt.Errorf("failed to test skill: %w", err)
			}

			fmt.Println()
			if resp.Error != "" {
				fmt.Printf("✗ Test failed\n")
				fmt.Printf("  Error: %s\n", resp.Error)
			} else {
				fmt.Printf("✓ Test passed\n")
				fmt.Printf("  Duration: %.3fs\n", resp.Duration)
				if len(resp.Output) > 0 {
					fmt.Println("  Output:")
					outputJSON, _ := json.MarshalIndent(resp.Output, "    ", "  ")
					fmt.Println(string(outputJSON))
				}
			}

			return nil
		},
	}

	cmd.Flags().StringP("input", "i", "", "Input JSON file")
	cmd.Flags().StringP("data", "d", "", "Input JSON data (inline)")

	return cmd
}
