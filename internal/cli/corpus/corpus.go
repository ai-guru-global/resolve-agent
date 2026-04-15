package corpus

import (
	"github.com/spf13/cobra"
)

// NewCmd creates the corpus command group.
func NewCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "corpus",
		Short: "Manage external corpus imports",
		Long: `Import and manage external knowledge corpora for RAG, FTA, and Skills.

Supports importing from git repositories containing structured knowledge bases,
fault tree analysis documents, and skill definitions.`,
	}

	cmd.AddCommand(newImportCmd())

	return cmd
}
