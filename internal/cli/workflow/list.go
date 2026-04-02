package workflow

import (
	"context"
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/ai-guru-global/resolve-agent/internal/cli/client"
	"github.com/spf13/cobra"
)

func newListCmd() *cobra.Command {
	return &cobra.Command{
		Use:     "list",
		Short:   "List workflows",
		Aliases: []string{"ls"},
		RunE: func(cmd *cobra.Command, args []string) error {
			// Create API client
			c := client.New()
			ctx := context.Background()

			// Fetch workflows from API
			resp, err := c.ListWorkflows(ctx)
			if err != nil {
				return fmt.Errorf("failed to list workflows: %w", err)
			}

			if len(resp.Workflows) == 0 {
				fmt.Println("No workflows found.")
				return nil
			}

			// Display in table format
			w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
			fmt.Fprintln(w, "ID\tNAME\tVERSION\tSTATUS")
			fmt.Fprintln(w, "--\t----\t-------\t------")

			for _, wf := range resp.Workflows {
				fmt.Fprintf(w, "%s\t%s\t%s\t%s\n",
					wf.ID,
					wf.Name,
					wf.Version,
					wf.Status,
				)
			}

			return w.Flush()
		},
	}
}
