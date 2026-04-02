package agent

import (
	"context"
	"fmt"
	"os"

	"github.com/ai-guru-global/resolve-agent/internal/cli/client"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v3"
)

func newCreateCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "create [name]",
		Short: "Create a new agent",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			name := args[0]
			agentType, _ := cmd.Flags().GetString("type")
			model, _ := cmd.Flags().GetString("model")
			prompt, _ := cmd.Flags().GetString("prompt")
			file, _ := cmd.Flags().GetString("file")

			var agent *client.Agent
			var err error

			if file != "" {
				// Create from config file
				agent, err = createFromFile(file)
				if err != nil {
					return err
				}
			} else {
				// Create from flags
				agent = &client.Agent{
					ID:          name,
					Name:        name,
					Type:        agentType,
					Description: "",
					Config: map[string]interface{}{
						"model":       model,
						"system_prompt": prompt,
					},
					Status: "active",
				}
			}

			// Create API client
			c := client.New()
			ctx := context.Background()

			// Call API to create agent
			created, err := c.CreateAgent(ctx, agent)
			if err != nil {
				return fmt.Errorf("failed to create agent: %w", err)
			}

			fmt.Printf("✓ Agent '%s' created successfully\n", created.Name)
			fmt.Printf("  ID: %s\n", created.ID)
			fmt.Printf("  Type: %s\n", created.Type)
			fmt.Printf("  Status: %s\n", created.Status)

			return nil
		},
	}

	cmd.Flags().StringP("type", "t", "mega", "Agent type (mega, skill, fta, rag, custom)")
	cmd.Flags().StringP("model", "m", "qwen-plus", "LLM model to use")
	cmd.Flags().StringP("prompt", "p", "", "System prompt")
	cmd.Flags().StringP("file", "f", "", "Create from YAML config file")

	return cmd
}

func createFromFile(path string) (*client.Agent, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var agent client.Agent
	if err := yaml.Unmarshal(data, &agent); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	return &agent, nil
}
