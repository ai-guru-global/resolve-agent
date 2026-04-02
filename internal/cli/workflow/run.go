package workflow

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/ai-guru-global/resolve-agent/internal/cli/client"
	"github.com/spf13/cobra"
)

func newRunCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "run [id]",
		Short: "Execute a workflow",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			id := args[0]
			inputFile, _ := cmd.Flags().GetString("input")
			inputStr, _ := cmd.Flags().GetString("data")
			async, _ := cmd.Flags().GetBool("async")

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
			}

			fmt.Printf("Executing workflow '%s'...\n", id)

			// Create API client
			c := client.New()
			ctx := context.Background()

			// Execute workflow via API
			req := &client.ExecuteWorkflowRequest{
				Input: input,
				Async: async,
				Wait:  !async,
			}

			resp, err := c.ExecuteWorkflow(ctx, id, req)
			if err != nil {
				return fmt.Errorf("failed to execute workflow: %w", err)
			}

			fmt.Println()
			if async {
				fmt.Printf("✓ Workflow execution started\n")
				fmt.Printf("  Execution ID: %s\n", resp.ExecutionID)
				fmt.Printf("  Status:       %s\n", resp.Status)
				fmt.Println("\nUse 'resolveagent workflow logs' to check execution status.")
			} else {
				if resp.Status == "completed" {
					fmt.Printf("✓ Workflow execution completed\n")
				} else if resp.Status == "failed" {
					fmt.Printf("✗ Workflow execution failed\n")
				} else {
					fmt.Printf("Workflow execution: %s\n", resp.Status)
				}

				fmt.Printf("  Execution ID: %s\n", resp.ExecutionID)
				fmt.Printf("  Duration:     %.3fs\n", resp.Duration)

				if resp.Error != "" {
					fmt.Printf("  Error:        %s\n", resp.Error)
				}

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
	cmd.Flags().BoolP("async", "a", false, "Execute asynchronously")

	return cmd
}
