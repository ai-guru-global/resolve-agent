package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/ai-guru-global/resolve-agent/internal/cli/client"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v3"
)

func newListCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:     "list",
		Short:   "List all agents",
		Aliases: []string{"ls"},
		RunE: func(cmd *cobra.Command, args []string) error {
			output, _ := cmd.Flags().GetString("output")

			// Create API client
			c := client.New()
			ctx := context.Background()

			// Fetch agents from API
			resp, err := c.ListAgents(ctx)
			if err != nil {
				return fmt.Errorf("failed to list agents: %w", err)
			}

			// Output based on format
			switch output {
			case "json":
				return outputJSON(resp)
			case "yaml":
				return outputYAML(resp)
			default:
				return outputTable(resp.Agents)
			}
		},
	}

	cmd.Flags().StringP("type", "t", "", "Filter by agent type")
	cmd.Flags().StringP("status", "s", "", "Filter by status")
	cmd.Flags().StringP("output", "o", "table", "Output format (table, json, yaml)")

	return cmd
}

func outputTable(agents []*client.Agent) error {
	if len(agents) == 0 {
		fmt.Println("No agents found.")
		return nil
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "ID\tNAME\tTYPE\tSTATUS")
	fmt.Fprintln(w, "--\t----\t----\t------")

	for _, agent := range agents {
		fmt.Fprintf(w, "%s\t%s\t%s\t%s\n",
			agent.ID,
			agent.Name,
			agent.Type,
			agent.Status,
		)
	}

	return w.Flush()
}

func outputJSON(resp *client.ListAgentsResponse) error {
	data, err := json.MarshalIndent(resp, "", "  ")
	if err != nil {
		return err
	}
	fmt.Println(string(data))
	return nil
}

func outputYAML(resp *client.ListAgentsResponse) error {
	data, err := yaml.Marshal(resp)
	if err != nil {
		return err
	}
	fmt.Print(string(data))
	return nil
}
