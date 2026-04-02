package skill

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
		Short:   "List installed skills",
		Aliases: []string{"ls"},
		RunE: func(cmd *cobra.Command, args []string) error {
			// Create API client
			c := client.New()
			ctx := context.Background()

			// Fetch skills from API
			resp, err := c.ListSkills(ctx)
			if err != nil {
				return fmt.Errorf("failed to list skills: %w", err)
			}

			if len(resp.Skills) == 0 {
				fmt.Println("No skills installed.")
				return nil
			}

			// Display in table format
			w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
			fmt.Fprintln(w, "NAME\tVERSION\tTYPE\tSTATUS")
			fmt.Fprintln(w, "----\t-------\t----\t------")

			for _, skill := range resp.Skills {
				fmt.Fprintf(w, "%s\t%s\t%s\t%s\n",
					skill.Name,
					skill.Version,
					skill.Type,
					skill.Status,
				)
			}

			return w.Flush()
		},
	}
}
