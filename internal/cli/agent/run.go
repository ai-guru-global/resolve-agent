package agent

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
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

			if interactive, _ := cmd.Flags().GetBool("interactive"); interactive {
				return runInteractiveSession(agentID)
			}

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

			// Streaming and non-streaming requests both return the final
			// response body here; print it once for either mode.
			fmt.Println(resp.Content)

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
	cmd.Flags().BoolP("interactive", "i", false, "Run an interactive chat session")

	return cmd
}

// runInteractiveSession runs an interactive chat session with the agent.
func runInteractiveSession(agentID string) error {
	fmt.Println("Interactive mode. Type 'exit' or 'quit' to end.")
	fmt.Println()

	c := client.New()
	ctx := context.Background()
	reader := bufio.NewReader(os.Stdin)

	for {
		fmt.Print("> ")
		line, err := reader.ReadString('\n')
		eof := errors.Is(err, io.EOF)
		if err != nil && !eof {
			return fmt.Errorf("failed to read input: %w", err)
		}

		message := strings.TrimSpace(line)
		if message == "exit" || message == "quit" {
			break
		}

		if message != "" {
			req := &client.ExecuteRequest{
				Message: message,
				Wait:    true,
			}

			resp, execErr := c.ExecuteAgent(ctx, agentID, req)
			if execErr != nil {
				fmt.Fprintf(os.Stderr, "Error: %v\n", execErr)
			} else {
				fmt.Println(resp.Content)
				fmt.Println()
			}
		}

		if eof {
			break // Input stream ended: exit the interactive loop.
		}
	}

	return nil
}
