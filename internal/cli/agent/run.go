package agent

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/ai-guru-global/resolve-agent/internal/cli/client"
	"github.com/spf13/cobra"
)

func newRunCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "run [agent-id] [message]",
		Short: "Run an agent with a message",
		Args:  cobra.MinimumNArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			agentID := args[0]

			var message string
			if len(args) > 1 {
				message = args[1]
			} else {
				message, _ = cmd.Flags().GetString("message")
			}

			if message == "" {
				return fmt.Errorf("message is required")
			}

			stream, _ := cmd.Flags().GetBool("stream")
			wait, _ := cmd.Flags().GetBool("wait")

			// Create API client
			c := client.New()
			ctx := context.Background()

			// Get agent first to verify it exists
			agent, err := c.GetAgent(ctx, agentID)
			if err != nil {
				return fmt.Errorf("failed to get agent: %w", err)
			}

			fmt.Printf("Running agent '%s' (%s)...\n", agent.Name, agent.ID)
			fmt.Println()

			req := &client.ExecuteRequest{
				Message: message,
				Stream:  stream,
				Wait:    wait,
			}

			// Execute agent
			resp, err := c.ExecuteAgent(ctx, agentID, req)
			if err != nil {
				return fmt.Errorf("execution failed: %w", err)
			}

			if stream {
				// Handle streaming response
				fmt.Println(resp.Content)
			} else {
				fmt.Println(resp.Content)
			}

			fmt.Println()
			fmt.Printf("Execution completed in %s\n", time.Duration(resp.Duration*float64(time.Second)))
			if resp.Usage != nil {
				fmt.Printf("Tokens: %d prompt, %d completion\n", resp.Usage.PromptTokens, resp.Usage.CompletionTokens)
			}

			return nil
		},
	}

	cmd.Flags().StringP("message", "m", "", "Message to send to the agent")
	cmd.Flags().BoolP("stream", "s", false, "Stream response")
	cmd.Flags().BoolP("wait", "w", true, "Wait for completion")

	return cmd
}

// createInteractiveSession creates an interactive session with the agent
func createInteractiveSession(agentID string) {
	fmt.Println("Interactive mode. Type 'exit' or 'quit' to end.")
	fmt.Println()

	c := client.New()
	ctx := context.Background()

	for {
		fmt.Print("> ")
		var message string
		fmt.Scanln(&message)

		if message == "exit" || message == "quit" {
			break
		}

		req := &client.ExecuteRequest{
			Message: message,
			Wait:    true,
		}

		resp, err := c.ExecuteAgent(ctx, agentID, req)
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error: %v\n", err)
			continue
		}

		fmt.Println(resp.Content)
		fmt.Println()
	}
}
